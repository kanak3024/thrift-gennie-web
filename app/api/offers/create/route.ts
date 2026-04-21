import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { productId, sellerId, amount, message } = await req.json();

    // Validate input
    if (!productId || !sellerId || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Invalid offer amount" }, { status: 400 });
    }
    if (message && message.length > 300) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 });
    }

    // Get buyer from auth token — never trust body
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const buyerId = user.id;

    // Can't offer on your own item
    if (buyerId === sellerId) {
      return NextResponse.json({ error: "You can't make an offer on your own item" }, { status: 400 });
    }

    // Check product exists and is available
    const { data: product } = await supabase
      .from("products")
      .select("status, price")
      .eq("id", productId)
      .single();

    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    if (product.status !== "available") {
      return NextResponse.json({ error: "This item is no longer available" }, { status: 400 });
    }
    if (amount > product.price) {
      return NextResponse.json({ error: "Offer cannot exceed listing price" }, { status: 400 });
    }

    // Check for existing pending offer from this buyer
    const { data: existing } = await supabase
      .from("offers")
      .select("id")
      .eq("product_id", productId)
      .eq("buyer_id", buyerId)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "You already have a pending offer on this item" },
        { status: 400 }
      );
    }

    // Create offer
    const { data: offer, error: offerError } = await supabase
      .from("offers")
      .insert({
        product_id: productId,
        buyer_id: buyerId,
        seller_id: sellerId,
        amount,
        message: message || null,
        status: "pending",
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (offerError) throw offerError;

    // Find or create conversation
    let convId: string;
    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("product_id", productId)
      .eq("buyer_id", buyerId)
      .maybeSingle();

    if (conv) {
      convId = conv.id;
    } else {
      const { data: newConv, error: convError } = await supabase
        .from("conversations")
        .insert({ product_id: productId, buyer_id: buyerId, seller_id: sellerId })
        .select("id")
        .single();
      if (convError) throw convError;
      convId = newConv.id;
    }

    // Insert offer message into conversation
    await supabase.from("messages").insert({
      conversation_id: convId,
      sender_id: buyerId,
      receiver_id: sellerId,
      text: `💰 Offer: ₹${amount.toLocaleString("en-IN")}${message ? `\n"${message}"` : ""}`,
    });

    // Notify seller with link to conversation
    await supabase.from("notifications").insert({
      user_id: sellerId,
      text: `You received an offer of ₹${amount.toLocaleString("en-IN")} on your listing.`,
      link: `/messages/${convId}`,
    });

    return NextResponse.json({ success: true, offerId: offer.id, conversationId: convId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}