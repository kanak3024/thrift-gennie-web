import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Rate limit: 5 order creation attempts per user per minute
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  prefix: "rl:create-order",
});

const BUYER_PROTECTION_FEE = 10;
const MAX_AMOUNT = 1_000_000; // ₹10,00,000

export async function POST(req: Request) {
  try {
    // ── Rate limit by IP ──────────────────────────────────────────────────
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

    const body = await req.json();
    const { amount: rawAmount, productId, buyerId, buyerEmail, shippingAddress } = body;

    if (typeof rawAmount !== "number") {
      return NextResponse.json({ error: "Invalid amount: must be a number" }, { status: 400 });
    }

    if (!Number.isInteger(rawAmount) || rawAmount <= 0) {
      return NextResponse.json({ error: "Invalid amount: must be a positive integer (₹ whole number)" }, { status: 400 });
    }

    if (rawAmount > MAX_AMOUNT) {
      return NextResponse.json({ error: `Amount exceeds maximum allowed value of ₹${MAX_AMOUNT}` }, { status: 400 });
    }

    if (!productId || !buyerId) {
      return NextResponse.json({ error: "Missing productId or buyerId" }, { status: 400 });
    }

    const totalAmount = rawAmount + BUYER_PROTECTION_FEE;

    const order = await razorpay.orders.create({
      amount: totalAmount * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        product_price:        rawAmount.toString(),
        buyer_protection_fee: BUYER_PROTECTION_FEE.toString(),
        product_id:           productId,
        buyer_id:             buyerId,
        buyer_email:          buyerEmail ?? "",
        shipping_address:     shippingAddress ? JSON.stringify(shippingAddress) : "",
      },
    });

    return NextResponse.json({
      ...order,
      product_price: rawAmount,
      buyer_fee: BUYER_PROTECTION_FEE,
      total: totalAmount,
    });

  } catch (error: any) {
    const detail = error?.error?.description ?? error?.message ?? "Unknown error";
    console.error("[create-order] Razorpay error:", detail);
    return NextResponse.json({ error: "Failed to create order", details: detail }, { status: 500 });
  }
}