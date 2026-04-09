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

async function logPaymentEvent(event: string, payload: Record<string, unknown>) {
  try {
    await supabase.from("payment_logs").insert({
      event,
      payload,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[payment_logs] Failed to write log:", err);
  }
}

async function sendEmail(type: string, to: string, data: Record<string, unknown>) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, to, data }),
  });
  if (!res.ok) throw new Error(`send-email responded with ${res.status}`);
}

// ─── event handlers ─────────────────────────────────────────────────────────

/**
 * payment.captured
 * Safety net for the browser-crash scenario: payment was deducted but
 * verify-payment never ran. Fully idempotent — skips silently if the
 * order already exists for this payment_id.
 */
async function handlePaymentCaptured(payment: any) {
  const razorpay_payment_id = payment.id;
  const razorpay_order_id   = payment.order_id;

  // 1. Idempotency — if verify-payment already ran, nothing to do
  const { data: existing } = await supabase
    .from("orders")
    .select("id")
    .eq("payment_id", razorpay_payment_id)
    .maybeSingle();

  if (existing) {
    await logPaymentEvent("webhook_captured_skipped_duplicate", { razorpay_payment_id });
    return;
  }

  // 2. Fetch Razorpay order to get notes (product_id etc stored when order was created)
  const rzpOrder = await razorpay.orders.fetch(razorpay_order_id);
  const notes    = rzpOrder.notes as Record<string, string>;

  const productId = notes?.product_id;
  const buyerId   = notes?.buyer_id;
  const buyerEmail = notes?.buyer_email ?? null;

  if (!productId || !buyerId) {
    await logPaymentEvent("webhook_captured_missing_notes", {
      razorpay_payment_id,
      razorpay_order_id,
      notes,
      needs_reconciliation: true,
    });
    return;
  }

  // 3. Fetch product + seller from DB
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, title, seller_id, status")
    .eq("id", productId)
    .single();

  if (productError || !product) {
    await logPaymentEvent("webhook_captured_product_not_found", {
      productId,
      razorpay_payment_id,
      needs_reconciliation: true,
    });
    return;
  }

  // 4. Race condition guard
  if (product.status === "sold") {
    await logPaymentEvent("webhook_captured_product_already_sold", {
      productId,
      razorpay_payment_id,
      needs_reconciliation: true,
    });
    await sendEmail("admin_alert", process.env.ADMIN_EMAIL!, {
      subject: "Payment captured but product already sold — refund needed",
      razorpay_payment_id,
      productId,
      buyerId,
    }).catch(() => {});
    return;
  }

  // 5. Amount from Razorpay (paise → ₹)
  const amount = (payment.amount as number) / 100;

  // 6. Insert order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      product_id:   productId,
      buyer_id:     buyerId,
      seller_id:    product.seller_id,
      amount,
      status:       "paid",
      payment_id:   razorpay_payment_id,
      buyer_email:  buyerEmail,
    })
    .select()
    .single();

  if (orderError) {
    await logPaymentEvent("webhook_captured_order_insert_failed", {
      razorpay_payment_id,
      productId,
      buyerId,
      error: orderError.message,
      needs_reconciliation: true,
    });
    return;
  }

  // 7. Mark product sold
  await supabase
    .from("products")
    .update({ status: "sold" })
    .eq("id", productId)
    .eq("status", "available");

  await logPaymentEvent("webhook_captured_order_created", {
    orderId: order.id,
    razorpay_payment_id,
    productId,
    source: "webhook_safety_net", // marks this was the fallback path
  });

  // 8. Confirmation email to buyer
  if (buyerEmail) {
    await sendEmail("order_confirmed", buyerEmail, {
      productTitle: product.title,
      amount,
      orderId: order.id,
    }).catch(async (err) => {
      await logPaymentEvent("webhook_captured_email_failed", {
        orderId: order.id,
        buyerEmail,
        error: err?.message,
      });
    });
  }
}

/**
 * payment.failed
 * Notifies the buyer their payment didn't go through so they can retry.
 */
async function handlePaymentFailed(payment: any) {
  const razorpay_payment_id = payment.id;
  const razorpay_order_id   = payment.order_id;
  const errorDescription    = payment.error_description ?? "Unknown error";

  // Fetch notes to get buyer email
  const rzpOrder = await razorpay.orders.fetch(razorpay_order_id);
  const notes    = rzpOrder.notes as Record<string, string>;
  const buyerEmail = notes?.buyer_email ?? null;

  await logPaymentEvent("payment_failed", {
    razorpay_payment_id,
    razorpay_order_id,
    errorDescription,
    buyerEmail,
  });

  if (buyerEmail) {
    await sendEmail("payment_failed", buyerEmail, {
      errorDescription,
      razorpay_order_id,
    }).catch(async (err) => {
      await logPaymentEvent("payment_failed_email_failed", {
        razorpay_payment_id,
        buyerEmail,
        error: err?.message,
      });
    });
  }
}

/**
 * refund.processed
 * Marks the order as refunded in DB, emails buyer, emails admin.
 */
async function handleRefundProcessed(refund: any) {
  const razorpay_payment_id = refund.payment_id;
  const refundAmount        = (refund.amount as number) / 100; // paise → ₹

  // 1. Find the order
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, buyer_email, product_id, amount")
    .eq("payment_id", razorpay_payment_id)
    .maybeSingle();

  if (error || !order) {
    await logPaymentEvent("refund_order_not_found", {
      razorpay_payment_id,
      refundAmount,
      needs_reconciliation: true,
    });
    return;
  }

  // 2. Update order status
  await supabase
    .from("orders")
    .update({ status: "refunded" })
    .eq("id", order.id);

  // 3. Re-list product as available
  await supabase
    .from("products")
    .update({ status: "available" })
    .eq("id", order.product_id);

  await logPaymentEvent("refund_processed", {
    orderId: order.id,
    razorpay_payment_id,
    refundAmount,
  });

  // 4. Email buyer
  if (order.buyer_email) {
    await sendEmail("refund_confirmed", order.buyer_email, {
      refundAmount,
      orderId: order.id,
    }).catch(async (err) => {
      await logPaymentEvent("refund_buyer_email_failed", {
        orderId: order.id,
        error: err?.message,
      });
    });
  }

  // 5. Email admin
  await sendEmail("admin_alert", process.env.ADMIN_EMAIL!, {
    subject: "Refund processed",
    orderId: order.id,
    razorpay_payment_id,
    refundAmount,
  }).catch(async (err) => {
    await logPaymentEvent("refund_admin_email_failed", {
      orderId: order.id,
      error: err?.message,
    });
  });
}

// ─── route ──────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const rawBody  = await req.text(); // must read as raw text for signature verification
  const signature = req.headers.get("x-razorpay-signature");

  // 1. Verify webhook signature — completely separate secret from payment secret
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest("hex");

  if (expectedSignature !== signature) {
    await logPaymentEvent("webhook_signature_invalid", { signature });
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody);
  const eventType = event?.event;
  const payload   = event?.payload;

  try {
    switch (eventType) {
      case "payment.captured":
        await handlePaymentCaptured(payload.payment.entity);
        break;

      case "payment.failed":
        await handlePaymentFailed(payload.payment.entity);
        break;

      case "refund.processed":
        await handleRefundProcessed(payload.refund.entity);
        break;

      default:
        // Unhandled event — log and acknowledge so Razorpay doesn't retry
        await logPaymentEvent("webhook_unhandled_event", { eventType });
    }
  } catch (err: any) {
    // Always return 200 to Razorpay — if we return 4xx/5xx it will keep retrying
    await logPaymentEvent("webhook_handler_exception", {
      eventType,
      error: err?.message,
      needs_reconciliation: true,
    });
  }

  // Always acknowledge — Razorpay retries on anything other than 2xx
  return NextResponse.json({ received: true });
}