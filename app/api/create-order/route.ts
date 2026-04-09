import { NextResponse } from "next/server";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const BUYER_PROTECTION_FEE = 10; // ₹10 flat fee
const MAX_AMOUNT = 500_000;      // ₹5,00,000 ceiling — adjust to your business limit

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount: rawAmount, productId, buyerId, buyerEmail } = body;

    // 1. Type check — must be a number, not a string or object
    if (typeof rawAmount !== "number") {
      return NextResponse.json(
        { error: "Invalid amount: must be a number" },
        { status: 400 }
      );
    }

    // 2. Must be a positive integer (paise arithmetic breaks on floats)
    if (!Number.isInteger(rawAmount) || rawAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount: must be a positive integer (₹ whole number)" },
        { status: 400 }
      );
    }

    // 3. Ceiling check — prevents absurd order values
    if (rawAmount > MAX_AMOUNT) {
      return NextResponse.json(
        { error: `Amount exceeds maximum allowed value of ₹${MAX_AMOUNT}` },
        { status: 400 }
      );
    }

    // 4. productId and buyerId are required — webhook needs them from notes
    if (!productId || !buyerId) {
      return NextResponse.json(
        { error: "Missing productId or buyerId" },
        { status: 400 }
      );
    }

    const totalAmount = rawAmount + BUYER_PROTECTION_FEE;

    const order = await razorpay.orders.create({
      amount: totalAmount * 100, // convert to paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        product_price:        rawAmount.toString(),
        buyer_protection_fee: BUYER_PROTECTION_FEE.toString(),
        product_id:           productId,           // ← webhook uses this to look up product/seller
        buyer_id:             buyerId,             // ← webhook uses this to create the order
        buyer_email:          buyerEmail ?? "",    // ← webhook uses this to send confirmation email
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

    return NextResponse.json(
      { error: "Failed to create order", details: detail },
      { status: 500 }
    );
  }
}