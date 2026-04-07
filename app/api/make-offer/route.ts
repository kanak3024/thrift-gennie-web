import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { productId, buyerId, sellerId, amount, message } = await req.json();

    // Check for existing pending offer
    const { data: existing } = await supabase
      .from("offers")
      .select("id")
      .eq("product_id", productId)
      .eq("buyer_id", buyerId)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "You already have a pending offer on this item" }, { status: 400 });
    }

    const { data: offer, error } = await supabase
      .from("offers")
      .insert({
        product_id: productId,
        buyer_id: buyerId,
        seller_id: sellerId,
        amount,
        message,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Notify seller via message
    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("product_id", productId)
      .eq("buyer_id", buyerId)
      .maybeSingle();

    if (conv) {
      await supabase.from("messages").insert({
        conversation_id: conv.id,
        sender_id: buyerId,
        text: `💰 New Offer: ₹${amount.toLocaleString("en-IN")}${message ? `\n"${message}"` : ""}`,
      });
    }

    return NextResponse.json({ success: true, offerId: offer.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}