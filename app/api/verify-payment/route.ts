import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      productId,
      buyerId,
      sellerId,
      amount,
      buyerEmail,
    } = await req.json();

    // 1. Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    // 2. Fetch product title
    const { data: product } = await supabase
      .from("products")
      .select("title")
      .eq("id", productId)
      .single();

    // 3. Insert order with buyer email
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        product_id: productId,
        buyer_id: buyerId,
        seller_id: sellerId,
        amount: amount,
        status: "paid",
        payment_id: razorpay_payment_id,
        buyer_email: buyerEmail,
      })
      .select()
      .single();

    if (error) throw error;

    // 4. Mark product as sold
    await supabase
      .from("products")
      .update({ status: "sold" })
      .eq("id", productId);

    // 5. Send order confirmation email to buyer
    if (buyerEmail) {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "order_confirmed",
          to: buyerEmail,
          data: {
            productTitle: product?.title || "Your item",
            amount,
            orderId: order.id,
          }
        })
      });
    }

    return NextResponse.json({ success: true, orderId: order.id });

  } catch (error: any) {
    console.error("Verify error:", error);
    return NextResponse.json(
      { error: "Verification failed", details: error.message },
      { status: 500 }
    );
  }
}