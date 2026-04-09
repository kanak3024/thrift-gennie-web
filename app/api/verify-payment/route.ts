import { NextResponse } from "next/server";
import crypto from "crypto";
import Razorpay from "razorpay";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// ─── helpers ────────────────────────────────────────────────────────────────

async function logPaymentEvent(
  event: string,
  payload: Record<string, unknown>
) {
  // Best-effort — never throw from here
  try {
    await supabase.from("payment_logs").insert({ event, payload, created_at: new Date().toISOString() });
  } catch (err) {
    console.error("[payment_logs] Failed to write log:", err);
  }
}

// ─── route ──────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    productId,
    buyerId,
    buyerEmail,
    // ❌ amount and sellerId are NOT trusted from the client — fetched server-side below
  } = await req.json();

  // ── 1. Basic presence check ──────────────────────────────────────────────
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !productId || !buyerId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // ── 2. Verify Razorpay signature ─────────────────────────────────────────
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    await logPaymentEvent("signature_mismatch", {
      razorpay_order_id,
      razorpay_payment_id,
      buyerId,
      productId,
    });
    return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
  }

  // ── 3. Idempotency — reject duplicate payment_id submissions ─────────────
  const { data: existingOrder } = await supabase
    .from("orders")
    .select("id")
    .eq("payment_id", razorpay_payment_id)
    .maybeSingle();

  if (existingOrder) {
    // Already processed — return the existing order id (safe for retries)
    return NextResponse.json({ success: true, orderId: existingOrder.id, duplicate: true });
  }

  // ── 4. Fetch authoritative amount from Razorpay — never trust the client ─
  let rzpOrder: Awaited<ReturnType<typeof razorpay.orders.fetch>>;
  try {
    rzpOrder = await razorpay.orders.fetch(razorpay_order_id);
  } catch (err: any) {
    await logPaymentEvent("razorpay_order_fetch_failed", {
      razorpay_order_id,
      razorpay_payment_id,
      error: err?.message,
    });
    return NextResponse.json({ error: "Could not verify order with Razorpay" }, { status: 502 });
  }

  // Razorpay returns amount in paise — convert to ₹
  const authorativeAmount = (rzpOrder.amount as number) / 100;

  // ── 5. Fetch product + seller from DB — never trust the client ────────────
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, title, seller_id, status")
    .eq("id", productId)
    .single();

  if (productError || !product) {
    await logPaymentEvent("product_not_found", { productId, razorpay_payment_id });
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // ── 6. Race condition guard — product must still be available ─────────────
  if (product.status === "sold") {
    await logPaymentEvent("product_already_sold", {
      productId,
      razorpay_payment_id,
      buyerId,
      authorativeAmount,
    });
    // At this point payment was captured but product is gone — flag for manual review
    return NextResponse.json(
      { error: "This item has already been sold. Our team will process a refund." },
      { status: 409 }
    );
  }

  // ── 7. Insert order ───────────────────────────────────────────────────────
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      product_id: productId,
      buyer_id: buyerId,
      seller_id: product.seller_id,       // ✅ from DB, not client
      amount: authorativeAmount,           // ✅ from Razorpay, not client
      status: "paid",
      payment_id: razorpay_payment_id,
      buyer_email: buyerEmail ?? null,
    })
    .select()
    .single();

  if (orderError) {
    await logPaymentEvent("order_insert_failed", {
      razorpay_payment_id,
      productId,
      buyerId,
      error: orderError.message,
      // ⚠️ Payment was captured — needs manual reconciliation
      needs_reconciliation: true,
    });
    return NextResponse.json(
      { error: "Order recording failed. Support has been notified." },
      { status: 500 }
    );
  }

  // ── 8. Mark product as sold ───────────────────────────────────────────────
  const { error: updateError } = await supabase
    .from("products")
    .update({ status: "sold" })
    .eq("id", productId)
    .eq("status", "available"); // extra guard: only update if still available

  if (updateError) {
    // Order exists but product status update failed — log but don't fail the response
    await logPaymentEvent("product_status_update_failed", {
      productId,
      orderId: order.id,
      error: updateError.message,
    });
  }

  // ── 9. Send confirmation email ────────────────────────────────────────────
  if (buyerEmail) {
    try {
      const emailRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "order_confirmed",
          to: buyerEmail,
          data: {
            productTitle: product.title,
            amount: authorativeAmount,
            orderId: order.id,
          },
        }),
      });

      if (!emailRes.ok) {
        throw new Error(`Email API responded with ${emailRes.status}`);
      }
    } catch (emailErr: any) {
      // Non-fatal — order is already created, just log for retry
      await logPaymentEvent("confirmation_email_failed", {
        orderId: order.id,
        buyerEmail,
        error: emailErr?.message,
      });
    }
  }

  return NextResponse.json({ success: true, orderId: order.id });
}