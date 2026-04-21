import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { offerId, action, counterAmount } = await req.json();

    // action must be: "accept" | "decline" | "counter"
    if (!["accept", "decline", "counter"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    if (action === "counter" && (!counterAmount || counterAmount <= 0)) {
      return NextResponse.json({ error: "Invalid counter amount" }, { status: 400 });
    }

    // Verify seller from auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch offer
    const { data: offer } = await supabase
      .from("offers")
      .select("*")
      .eq("id", offerId)
      .single();

    if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    if (offer.seller_id !== user.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    if (offer.status !== "pending") return NextResponse.json({ error: "Offer is no longer active" }, { status: 400 });

    // Check expiry
    if (new Date(offer.expires_at) < new Date()) {
      await supabase.from("offers").update({ status: "expired" }).eq("id", offerId);
      return NextResponse.json({ error: "This offer has expired" }, { status: 400 });
    }

    // Find conversation
    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("product_id", offer.product_id)
      .eq("buyer_id", offer.buyer_id)
      .maybeSingle();

    if (action === "accept") {
      await supabase.from("offers").update({ status: "accepted" }).eq("id", offerId);

      // Notify buyer
      await supabase.from("notifications").insert({
        user_id: offer.buyer_id,
        text: `Your offer of ₹${offer.amount.toLocaleString("en-IN")} was accepted! Complete your purchase.`,
        link: `/messages/${conv?.id}`,
      });

      if (conv) {
        await supabase.from("messages").insert({
          conversation_id: conv.id,
          sender_id: user.id,
          receiver_id: offer.buyer_id,
          text: `✅ Offer accepted! Please proceed to payment.`,
        });
      }
    }

    if (action === "decline") {
      await supabase.from("offers").update({ status: "declined" }).eq("id", offerId);

      await supabase.from("notifications").insert({
        user_id: offer.buyer_id,
        text: `Your offer of ₹${offer.amount.toLocaleString("en-IN")} was declined.`,
        link: `/messages/${conv?.id}`,
      });

      if (conv) {
        await supabase.from("messages").insert({
          conversation_id: conv.id,
          sender_id: user.id,
          receiver_id: offer.buyer_id,
          text: `❌ Offer declined.`,
        });
      }
    }

    if (action === "counter") {
      await supabase.from("offers").update({
        status: "countered",
        counter_amount: counterAmount,
      }).eq("id", offerId);

      await supabase.from("notifications").insert({
        user_id: offer.buyer_id,
        text: `The seller countered your offer with ₹${counterAmount.toLocaleString("en-IN")}.`,
        
      });

      if (conv) {
        await supabase.from("messages").insert({
          conversation_id: conv.id,
          sender_id: user.id,
          receiver_id: offer.buyer_id,
          text: `💬 Counter offer: ₹${counterAmount.toLocaleString("en-IN")}`,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}