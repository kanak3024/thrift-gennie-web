import { NextResponse } from "next/server";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const BUYER_PROTECTION_FEE = 10; // ₹10 flat fee charged to buyer

export async function POST(req: Request) {
  try {
    const { amount } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    const totalAmount = amount + BUYER_PROTECTION_FEE;

    const order = await razorpay.orders.create({
      amount: totalAmount * 100, // paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        product_price: amount,
        buyer_protection_fee: BUYER_PROTECTION_FEE,
      },
    });

    // Return order + fee breakdown so frontend can display it
    return NextResponse.json({
      ...order,
      product_price: amount,
      buyer_fee: BUYER_PROTECTION_FEE,
      total: totalAmount,
    });

  } catch (error: any) {
    console.error("Razorpay Order Error:", error);
    return NextResponse.json(
      { error: "Failed to create Razorpay order", details: error.message },
      { status: 500 }
    );
  }
}