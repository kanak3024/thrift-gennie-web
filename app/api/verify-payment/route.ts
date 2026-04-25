import { NextResponse } from "next/server";
import crypto from "crypto";
import Razorpay from "razorpay";
import { createClient } from "@supabase/supabase-js";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Rate limit: 10 verify attempts per user per minute
// Higher than create-order since retries are more common here
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  prefix: "rl:verify-payment",
});

async function logPaymentEvent(event: string, payload: Record<string, unknown>) {
  try {
    await supabase.from("payment_logs").insert({ event, payload, created_at: new Date().toISOString() });
  } catch (err) {
    console.error("[payment_logs] Failed to write log:", err);
  }
}

export async function POST(req: Request) {
  // ── Rate limit by IP ────────────────────────────────────────────────────
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const { success, limit, remaining } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment before trying again." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit":     limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
        },
      }
    );
  }

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    productId,
    buyerId,
    buyerEmail,
    shippingAddress,
  } = await req.json();

  // ── 1. Presence check ──────────────────────────────────────────────────
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !productId || !buyerId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!shippingAddress?.fullName || !shippingAddress?.phone || !shippingAddress?.addressLine ||
      !shippingAddress?.city || !shippingAddress?.state || !shippingAddress?.pincode) {
    return NextResponse.json({ error: "Incomplete shipping address" }, { status: 400 });
  }

  // ── 2. Verify Razorpay signature ───────────────────────────────────────
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    await logPaymentEvent("signature_mismatch", { razorpay_order_id, razorpay_payment_id, buyerId, productId });
    return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
  }

  // ── 3. Idempotency check ───────────────────────────────────────────────
  const { data: existingOrder } = await supabase
    .from("orders")
    .select("id")
    .eq("payment_id", razorpay_payment_id)
    .maybeSingle();

  if (existingOrder) {
    return NextResponse.json({ success: true, orderId: existingOrder.id, duplicate: true });
  }

  // ── 4. Fetch authoritative amount from Razorpay ────────────────────────
  let rzpOrder: any;
  try {
    rzpOrder = await razorpay.orders.fetch(razorpay_order_id);
  } catch (err: any) {
    await logPaymentEvent("razorpay_order_fetch_failed", { razorpay_order_id, error: err?.message });
    return NextResponse.json({ error: "Could not verify order with Razorpay" }, { status: 502 });
  }

  const authorativeAmount = (rzpOrder.amount as number) / 100;

  // ── 5. Fetch product + seller from DB ──────────────────────────────────
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, title, seller_id, status")
    .eq("id", productId)
    .single();

  if (productError || !product) {
    await logPaymentEvent("product_not_found", { productId, razorpay_payment_id });
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  // ── 6a. Prevent self-purchase ──────────────────────────────────────────
if (product.seller_id === buyerId) {
  await logPaymentEvent("self_purchase_attempt", { productId, buyerId });
  return NextResponse.json(
    { error: "You cannot purchase your own listing." },
    { status: 400 }
  );
}

  // ── 6. Race condition guard ────────────────────────────────────────────
   // ── 6. Race condition guard ────────────────────────────────────────────
if (product.status === "sold") {
  await logPaymentEvent("product_already_sold", {
    productId, razorpay_payment_id, buyerId, needs_reconciliation: true,
  });
  return NextResponse.json(
    { error: "This item has already been sold. Our team will process a refund." },
    { status: 409 }
  );
}

if (product.status !== "available") {
  await logPaymentEvent("product_unavailable", {
    productId, razorpay_payment_id, buyerId, 
    status: product.status, needs_reconciliation: true,
  });
  return NextResponse.json(
    { error: "This item is no longer available. Our team will process a refund." },
    { status: 409 }
  );
}

  // ── 7. Fetch seller email ──────────────────────────────────────────────
  const { data: sellerProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", product.seller_id)
    .single();

  const { data: sellerAuth } = await supabase.auth.admin.getUserById(product.seller_id);
  const sellerEmail = sellerAuth?.user?.email;

  // ── 8. Insert order ────────────────────────────────────────────────────
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
       product_id:       productId,
      buyer_id:         buyerId,
      seller_id:        product.seller_id,
      amount:           authorativeAmount,
      status:           "payment_held",
      payment_id:       razorpay_payment_id,
      buyer_email:      buyerEmail ?? null,
      shipping_address: shippingAddress,
      hold_release_at:  new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (orderError) {
    await logPaymentEvent("order_insert_failed", {
      razorpay_payment_id, productId, buyerId,
      error: orderError.message, needs_reconciliation: true,
    });
    return NextResponse.json({ error: "Order recording failed. Support has been notified." }, { status: 500 });
  }

  // ── 9. Mark product as sold ────────────────────────────────────────────
  const { error: updateError } = await supabase
    .from("products")
    .update({ status: "sold" })
    .eq("id", productId)
    .eq("status", "available");

  if (updateError) {
    await logPaymentEvent("product_status_update_failed", {
      productId, orderId: order.id, error: updateError.message,
    });
  }

  // ── 10. Email buyer ────────────────────────────────────────────────────
  if (buyerEmail) {
    try {
      const emailRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "order_confirmed",
          to: buyerEmail,
          data: {
            productTitle:    product.title,
            amount:          authorativeAmount,
            orderId:         order.id,
            shippingAddress: shippingAddress,
          },
        }),
      });
      if (!emailRes.ok) throw new Error(`Email API responded with ${emailRes.status}`);
    } catch (emailErr: any) {
      await logPaymentEvent("confirmation_email_failed", {
        orderId: order.id, buyerEmail, error: emailErr?.message,
      });
    }
  }

  // ── 11. Email seller ───────────────────────────────────────────────────
  if (sellerEmail) {
    try {
      const sellerEmailRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "order_sold",
          to: sellerEmail,
          data: {
            sellerName:      sellerProfile?.full_name,
            productTitle:    product.title,
            amount:          authorativeAmount,
            orderId:         order.id,
            shippingAddress: shippingAddress,
          },
        }),
      });
      if (!sellerEmailRes.ok) throw new Error(`Email API responded with ${sellerEmailRes.status}`);
    } catch (emailErr: any) {
      await logPaymentEvent("seller_email_failed", {
        orderId: order.id, sellerEmail, error: emailErr?.message,
      });
    }
  }

  return NextResponse.json({ success: true, orderId: order.id });
}