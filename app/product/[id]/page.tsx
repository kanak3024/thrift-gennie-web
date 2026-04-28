"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useWishlist } from "../../hooks/useWishlist";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../../lib/supabase";
import Link from "next/link";
import ShippingAddressModal, { ShippingAddress } from "../../components/ShippingAddressModal";

/* ─────────────────────────────
   CONDITION STYLING
───────────────────────────── */
const CONDITION_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  "Like New":   { bg: "#6B7E60/10", text: "#6B7E60", dot: "#6B7E60" },
  "Good":       { bg: "#B48A5A/10", text: "#B48A5A", dot: "#B48A5A" },
  "Fair":       { bg: "#A1123F/10", text: "#A1123F", dot: "#A1123F" },
  "Well Loved": { bg: "#888/10",    text: "#888",    dot: "#888"    },
};

const REPORT_REASONS = [
  { value: "fake_item",         label: "Fake or counterfeit item" },
  { value: "wrong_description", label: "Wrong or misleading description" },
  { value: "inappropriate",     label: "Inappropriate content" },
  { value: "scam",              label: "Suspected scam" },
  { value: "other",             label: "Other" },
];

/* ─────────────────────────────
   SKELETON LOADER
───────────────────────────── */
function ProductSkeleton() {
  return (
    <main className="min-h-screen bg-[#EFE9E1] px-4 sm:px-6 py-24 sm:py-28">
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8 md:gap-16 animate-pulse">
        <div className="aspect-[4/5] bg-[#EAE3DB] rounded-2xl" />
        <div className="flex flex-col gap-5 pt-4">
          <div className="h-3 w-24 bg-[#EAE3DB] rounded-full" />
          <div className="h-10 w-3/4 bg-[#EAE3DB] rounded-full" />
          <div className="h-8 w-1/4 bg-[#EAE3DB] rounded-full" />
          <div className="space-y-2 mt-4">
            <div className="h-3 bg-[#EAE3DB] rounded-full" />
            <div className="h-3 bg-[#EAE3DB] rounded-full w-5/6" />
            <div className="h-3 bg-[#EAE3DB] rounded-full w-4/6" />
          </div>
        </div>
      </div>
    </main>
  );
}

/* ─────────────────────────────
   MAIN PAGE
───────────────────────────── */
export default function ProductPage() {
  const { id } = useParams();
  const router = useRouter();
  const { toggleWishlist, isWishlisted } = useWishlist();

  const [user, setUser]                         = useState<any>(null);
  const [product, setProduct]                   = useState<any>(null);
  const [seller, setSeller]                     = useState<any>(null);
  const [similarItems, setSimilarItems]         = useState<any[]>([]);
  const [paymentLoading, setPaymentLoading]     = useState(false);
  const [activeImage, setActiveImage]           = useState<string>("");
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [pendingAddress, setPendingAddress]     = useState<ShippingAddress | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [wishlistCount, setWishlistCount] = useState(0);

  // Chat
  const [chatOpen, setChatOpen]             = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages]             = useState<any[]>([]);
  const [newMessage, setNewMessage]         = useState("");
  const [loadingChat, setLoadingChat]       = useState(false);
  const [sending, setSending]               = useState(false);

  // Make an Offer
  const [offerOpen, setOfferOpen]         = useState(false);
  const [offerAmount, setOfferAmount]     = useState("");
  const [offerMessage, setOfferMessage]   = useState("");
  const [offerLoading, setOfferLoading]   = useState(false);
  const [offerSuccess, setOfferSuccess]   = useState(false);
  const [existingOffer, setExistingOffer] = useState<any>(null);

  // Share
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied]       = useState(false);

  // Report
  const [reportOpen, setReportOpen]       = useState(false);
  const [reportReason, setReportReason]   = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  /* ── AUTH ── */
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUser(user);
    });
  }, []);

  /* ── FETCH PRODUCT + SELLER + SIMILAR + OFFER ── */
  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      const { data: productData } = await supabase
        .from("products").select("*").eq("id", id).single();
      if (!productData) return;
      setProduct(productData);
      setActiveImage(productData.image_url || "/final.png");

      const { data: sellerData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, bio, role")
        .eq("id", productData.seller_id).single();
      if (sellerData) setSeller(sellerData);

      const { data: similar } = await supabase
        .from("products")
        .select("id, title, price, image_url, condition, size, location")
        .neq("id", id).eq("status", "available")
        .or(`mood.eq.${productData.mood},category.eq.${productData.category}`)
        .limit(4);
      if (similar) setSimilarItems(similar);

      // Increment view count
await supabase.rpc("increment_views", { product_id: id });

// Fetch wishlist count
const { count } = await supabase
  .from("wishlists")
  .select("*", { count: "exact", head: true })
  .eq("product_id", id);
setWishlistCount(count || 0);
    };
    fetchAll();
  }, [id]);

  /* ── CHECK EXISTING OFFER ── */
  useEffect(() => {
    if (!user || !id) return;
    supabase.from("offers").select("*")
  .eq("product_id", id).eq("buyer_id", user.id)
  .in("status", ["pending", "countered", "accepted"])
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle()
      .then(({ data }) => { if (data) setExistingOffer(data); });
  }, [user, id]);

  /* ── SCROLL CHAT ── */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── FOCUS INPUT ── */
  useEffect(() => {
    if (chatOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [chatOpen]);

  /* ── REAL-TIME MESSAGES ── */
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`chat_${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        setMessages((prev) => {
          if (prev.find((m) => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  /* ── INIT CONVERSATION ── */
  const initConversation = async () => {
    if (!id || !product || !user || loadingChat) return null;
    if (user.id === product.seller_id) return null;
    setLoadingChat(true);
    try {
      const { data: existing } = await supabase
        .from("conversations").select("id")
        .eq("product_id", id).eq("buyer_id", user.id).maybeSingle();
      let activeId = existing?.id;
      if (!activeId) {
        const { data: created, error } = await supabase
          .from("conversations")
          .insert({ product_id: id, buyer_id: user.id, seller_id: product.seller_id })
          .select().single();
        if (error) { setLoadingChat(false); return null; }
        activeId = created.id;
      }
      setConversationId(activeId);
      const { data } = await supabase.from("messages").select("*")
        .eq("conversation_id", activeId).order("created_at", { ascending: true });
      setMessages(data || []);
      setLoadingChat(false);
      return activeId;
    } catch {
      setLoadingChat(false);
      return null;
    }
  };

  /* ── SEND MESSAGE ── */
  const sendMessage = async () => {
    if (!user?.id || !newMessage.trim() || sending) return;
    let currentId = conversationId;
    if (!currentId) currentId = await initConversation();
    if (!currentId) return;
    const text = newMessage.trim();
    setNewMessage("");
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      conversation_id: currentId, sender_id: user.id, text,
    });
    if (error) setNewMessage(text);
    setSending(false);
    inputRef.current?.focus();
  };

  /* ── MAKE OFFER ── */
  const handleMakeOffer = async () => {
    if (!user) { router.push("/login"); return; }
    if (!offerAmount || parseFloat(offerAmount) <= 0) return;
    if (parseFloat(offerAmount) >= product.price) {
      alert("Your offer should be less than the listed price. Just buy it! 🛍️");
      return;
    }
    setOfferLoading(true);
    try {
      let convId = conversationId;
      if (!convId) convId = await initConversation();
       const { data: { session } } = await supabase.auth.getSession();
const res = await fetch("/api/offers/create", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${session?.access_token}`,
  },
  body: JSON.stringify({
    productId: product.id,
    sellerId: product.seller_id,
    amount: parseFloat(offerAmount),
    message: offerMessage,
  }),
});
      const result = await res.json();
      if (result.error) {
        alert(result.error);
      } else {
        setOfferSuccess(true);
        setExistingOffer({ amount: parseFloat(offerAmount), status: "pending" });
        setTimeout(() => { setOfferOpen(false); setOfferSuccess(false); }, 2000);
      }
    } catch (err: any) {
      alert("Failed to send offer: " + err.message);
    }
    setOfferLoading(false);
  };

  /* ── SHARE ── */
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const handleWhatsAppShare = () => {
    const text = `Check out this listing on Thrift Gennie: ${product.title} — ₹${product.price}\n${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };
  const handleTwitterShare = () => {
    const text = `Found this on @ThriftGennie: ${product.title} — ₹${product.price}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`, "_blank");
  };

  /* ── REPORT ── */
  const handleReport = async () => {
    if (!user) { router.push("/login"); return; }
    if (!reportReason) { alert("Please select a reason"); return; }
    setReportLoading(true);
    const { error } = await supabase.from("reports").insert({
      product_id: product.id,
      reporter_id: user.id,
      reason: reportReason,
      details: reportDetails,
    });
    if (!error) {
      setReportSuccess(true);
      setTimeout(() => { setReportOpen(false); setReportSuccess(false); setReportReason(""); setReportDetails(""); }, 2000);
    }
    setReportLoading(false);
  };
  /* ── RAZORPAY ── */
const handleBuyNow = async () => {
  if (!user) { router.push("/login"); return; }
  if (user.id === product.seller_id || product.status === "sold") return;
  setAddressModalOpen(true);
};

const handleAddressConfirmed = async (address: ShippingAddress) => {
  setPendingAddress(address);
  setAddressModalOpen(false);
  setPaymentLoading(true);
  try {
    const shippingFee = Number(product.shipping_price ?? 0);
    const res = await fetch("/api/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount:          Math.round(product.price + shippingFee),
        productId:       product.id,
        buyerId:         user.id,
        buyerEmail:      user.email,
        shippingAddress: address,
      }),
    });
    const order = await res.json();
    if (!order.id) throw new Error("Failed to create order");

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    document.body.appendChild(script);
    script.onload = () => {
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim(),
        amount: order.amount,
        currency: "INR",
        name: "Thrift Gennie",
        description: product.title,
        order_id: order.id,
        image: product.image_url || "/final.png",
        prefill: { email: user.email, contact: address.phone, name: address.fullName },
        theme: { color: "#2B0A0F" },
         handler: async (response: any) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const verifyRes = await fetch("/api/verify-payment", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
            body: JSON.stringify({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              productId:           product.id,
              buyerId:             user.id,
              buyerEmail:          user.email,
              shippingAddress:     address,
            }),
          });
          const result = await verifyRes.json();
          if (result.success) router.push(`/orders/${result.orderId}`);
          else router.push("/orders");
        },
        modal: { ondismiss: () => setPaymentLoading(false) },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
      setPaymentLoading(false);
    };
  } catch {
    setPaymentLoading(false);
  }
};
  
  if (!product) return <ProductSkeleton />;

  const isSold    = product.status === "sold";
  const isMine    = user?.id === product.seller_id;
  const allImages = [product.image_url, ...(product.extra_images || [])].filter(Boolean);
  const condStyle = CONDITION_STYLE[product.condition] || { bg: "#88810", text: "#888", dot: "#888" };

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-[#EFE9E1] text-[#2B0A0F]"
    >

      {/* ══════════════════════════════
          MAKE AN OFFER MODAL
      ══════════════════════════════ */}
      <AnimatePresence>
        {offerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => setOfferOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              /* full-width on mobile, fixed 380px on sm+ */
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                         bg-[#F6F3EF] rounded-2xl p-6 sm:p-8
                         w-[calc(100vw-2rem)] sm:w-[380px] shadow-2xl"
            >
              {offerSuccess ? (
                <div className="text-center py-4">
                  <p className="text-3xl mb-3">✦</p>
                  <p className="text-lg mb-1" style={{ fontFamily: "var(--font-playfair)" }}>Offer Sent!</p>
                  <p className="text-[10px] uppercase tracking-widest opacity-40">The seller will respond within 24 hours</p>
                </div>
              ) : (
                <>
                  <h3 className="text-xl mb-1" style={{ fontFamily: "var(--font-playfair)" }}>Make an Offer</h3>
                  <p className="text-[10px] uppercase tracking-widest opacity-40 mb-6">
                    Listed at ₹{product.price?.toLocaleString("en-IN")}
                  </p>

                  {existingOffer ? (
  <div className="space-y-4">
    {/* Counter offer state */}
    {existingOffer.status === "countered" && (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-[9px] uppercase tracking-widest text-blue-500 mb-1">Seller Countered</p>
        <p className="text-2xl text-blue-700" style={{ fontFamily: "var(--font-playfair)" }}>
          ₹{existingOffer.counter_amount?.toLocaleString("en-IN")}
        </p>
        <p className="text-[10px] text-blue-500 mt-1">Your original offer: ₹{existingOffer.amount?.toLocaleString("en-IN")}</p>
        <div className="flex gap-2 mt-4">
          <button
            onClick={async () => {
              const { data: { session } } = await supabase.auth.getSession();
              await fetch("/api/offers/respond", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
                body: JSON.stringify({ offerId: existingOffer.id, action: "accept" }),
              });
              setExistingOffer({ ...existingOffer, status: "accepted" });
              setTimeout(() => setOfferOpen(false), 1500);
            }}
            className="flex-1 py-2.5 rounded-full bg-blue-600 text-white text-[9px] uppercase tracking-widest hover:opacity-80 transition-opacity"
          >
            Accept ₹{existingOffer.counter_amount?.toLocaleString("en-IN")}
          </button>
          <button
            onClick={async () => {
              const { data: { session } } = await supabase.auth.getSession();
              await fetch("/api/offers/respond", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
                body: JSON.stringify({ offerId: existingOffer.id, action: "decline" }),
              });
              setExistingOffer(null);
              setOfferOpen(false);
            }}
            className="flex-1 py-2.5 rounded-full border border-blue-200 text-blue-600 text-[9px] uppercase tracking-widest hover:opacity-80 transition-opacity"
          >
            Decline
          </button>
        </div>
      </div>
    )}

    {/* Pending offer state */}
    {existingOffer.status === "pending" && (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-[9px] uppercase tracking-widest text-amber-600 mb-1">Offer Pending</p>
        <p className="text-2xl text-amber-700" style={{ fontFamily: "var(--font-playfair)" }}>
          ₹{existingOffer.amount?.toLocaleString("en-IN")}
        </p>
        <p className="text-[10px] text-amber-500 mt-1">Waiting for seller to respond</p>
      </div>
    )}

    {/* Accepted state */}
    {existingOffer.status === "accepted" && (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
        <p className="text-2xl mb-2">✅</p>
        <p className="text-sm text-green-700">Offer accepted! Proceed to payment.</p>
      </div>
    )}

    {/* Cancel button — only for pending */}
    {existingOffer.status === "pending" && (
      <button
        onClick={async () => {
          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch("/api/offers/cancel", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
            body: JSON.stringify({ offerId: existingOffer.id }),
          });
          if (res.ok) {
            setExistingOffer(null);
            setOfferOpen(false);
          }
        }}
        className="w-full py-3 rounded-full border border-red-200 text-red-400 text-[9px] uppercase tracking-widest hover:bg-red-50 transition-all"
      >
        Cancel Offer
      </button>
    )}
  </div>
) : (
                    <div className="space-y-4">
                      <div className="border-b border-[#2B0A0F]/10 pb-2">
                        <label className="text-[9px] uppercase tracking-widest opacity-50 block mb-2">Your Offer (₹)</label>
                        <input
                          type="number"
                          value={offerAmount}
                          onChange={(e) => setOfferAmount(e.target.value)}
                          placeholder={`e.g. ${Math.round(product.price * 0.8).toLocaleString("en-IN")}`}
                          className="w-full bg-transparent text-2xl outline-none placeholder:opacity-20"
                          style={{ fontFamily: "var(--font-playfair)" }}
                          autoFocus
                        />
                      </div>

                      <div className="border-b border-[#2B0A0F]/10 pb-2">
                        <label className="text-[9px] uppercase tracking-widest opacity-50 block mb-2">Message (optional)</label>
                        <input
                          type="text"
                          value={offerMessage}
                          onChange={(e) => setOfferMessage(e.target.value)}
                          placeholder="e.g. Can you do a little lower?"
                          className="w-full bg-transparent text-sm outline-none placeholder:opacity-20"
                        />
                      </div>

                      <div className="flex gap-2">
                        {[0.9, 0.8, 0.7].map((pct) => (
                          <button
                            key={pct}
                            onClick={() => setOfferAmount(Math.round(product.price * pct).toString())}
                            className="flex-1 py-2 rounded-full border border-[#2B0A0F]/15 text-[9px] uppercase tracking-widest hover:bg-[#2B0A0F] hover:text-[#F6F3EF] transition-all"
                          >
                            {Math.round(pct * 100)}%
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => setOfferOpen(false)}
                          className="flex-1 py-3 rounded-full border border-[#2B0A0F]/15 text-[10px] uppercase tracking-widest hover:opacity-60 transition-opacity"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleMakeOffer}
                          disabled={offerLoading || !offerAmount}
                          className="flex-1 py-3 rounded-full bg-[#2B0A0F] text-[#F6F3EF] text-[10px] uppercase tracking-widest hover:opacity-80 transition-opacity disabled:opacity-40"
                        >
                          {offerLoading ? "Sending..." : "Send Offer"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════
          SHARE MODAL
      ══════════════════════════════ */}
      <AnimatePresence>
        {shareOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => setShareOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                         bg-[#F6F3EF] rounded-2xl p-6 sm:p-8
                         w-[calc(100vw-2rem)] sm:w-[360px] shadow-2xl"
            >
              <h3 className="text-xl mb-1" style={{ fontFamily: "var(--font-playfair)" }}>Share this Piece</h3>
              <p className="text-[10px] uppercase tracking-widest opacity-40 mb-6">{product.title}</p>

              <div className="space-y-3">
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-[#2B0A0F]/10 hover:bg-[#2B0A0F] hover:text-[#F6F3EF] hover:border-[#2B0A0F] transition-all group"
                >
                  <span className="text-xl">🔗</span>
                  <span className="text-[10px] uppercase tracking-widest">
                    {copied ? "Link Copied! ✓" : "Copy Link"}
                  </span>
                </button>
                <button
                  onClick={handleWhatsAppShare}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-[#2B0A0F]/10 hover:bg-[#25D366] hover:text-white hover:border-[#25D366] transition-all"
                >
                  <span className="text-xl">💬</span>
                  <span className="text-[10px] uppercase tracking-widest">Share on WhatsApp</span>
                </button>
                <button
                  onClick={handleTwitterShare}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-[#2B0A0F]/10 hover:bg-black hover:text-white hover:border-black transition-all"
                >
                  <span className="text-xl">𝕏</span>
                  <span className="text-[10px] uppercase tracking-widest">Share on X</span>
                </button>
              </div>

              <button
                onClick={() => setShareOpen(false)}
                className="w-full mt-4 py-3 text-[10px] uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
              >
                Close
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════
          REPORT MODAL
      ══════════════════════════════ */}
      <AnimatePresence>
        {reportOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => setReportOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                         bg-[#F6F3EF] rounded-2xl p-6 sm:p-8
                         w-[calc(100vw-2rem)] sm:w-[380px] shadow-2xl"
            >
              {reportSuccess ? (
                <div className="text-center py-4">
                  <p className="text-3xl mb-3">🚩</p>
                  <p className="text-lg mb-1" style={{ fontFamily: "var(--font-playfair)" }}>Report Submitted</p>
                  <p className="text-[10px] uppercase tracking-widest opacity-40">We'll review this listing shortly</p>
                </div>
              ) : (
                <>
                  <h3 className="text-xl mb-1" style={{ fontFamily: "var(--font-playfair)" }}>Report Listing</h3>
                  <p className="text-[10px] uppercase tracking-widest opacity-40 mb-6">Help us keep the archive safe</p>

                  <div className="space-y-2 mb-5">
                    {REPORT_REASONS.map((reason) => (
                      <button
                        key={reason.value}
                        onClick={() => setReportReason(reason.value)}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all ${
                          reportReason === reason.value
                            ? "bg-[#A1123F] text-white"
                            : "border border-[#2B0A0F]/10 hover:border-[#2B0A0F]/30"
                        }`}
                      >
                        {reason.label}
                      </button>
                    ))}
                  </div>

                  <div className="border-b border-[#2B0A0F]/10 pb-2 mb-5">
                    <label className="text-[9px] uppercase tracking-widest opacity-50 block mb-2">Additional Details (optional)</label>
                    <textarea
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      placeholder="Tell us more..."
                      rows={3}
                      className="w-full bg-transparent text-sm outline-none placeholder:opacity-20 resize-none"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setReportOpen(false)}
                      className="flex-1 py-3 rounded-full border border-[#2B0A0F]/15 text-[10px] uppercase tracking-widest hover:opacity-60 transition-opacity"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReport}
                      disabled={reportLoading || !reportReason}
                      className="flex-1 py-3 rounded-full bg-[#A1123F] text-white text-[10px] uppercase tracking-widest hover:opacity-80 transition-opacity disabled:opacity-40"
                    >
                      {reportLoading ? "Submitting..." : "Submit Report"}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════
          BREADCRUMB
      ══════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 sm:pt-28 pb-0">
        <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.25em] opacity-40 mb-6 sm:mb-10 flex-wrap">
          <Link href="/" className="hover:opacity-100 transition-opacity">Home</Link>
          <span>/</span>
          <Link href="/buy" className="hover:opacity-100 transition-opacity">Archive</Link>
          {product.category && (
            <>
              <span>/</span>
              <Link href={`/buy?category=${product.category}`} className="hover:opacity-100 transition-opacity">
                {product.category}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="opacity-70 truncate max-w-[120px] sm:max-w-[160px]">{product.title}</span>
        </div>
      </div>

      {/* ══════════════════════════════
          MAIN GRID
          — stacks to single column on mobile
      ══════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
        <div className="grid md:grid-cols-[1fr_1fr] gap-8 lg:gap-20">

          {/* ── LEFT: IMAGE GALLERY ── */}
           <div className="flex flex-col gap-3">
  <div
    className={`relative aspect-[4/5] bg-[#EAE3DB] overflow-hidden rounded-2xl ${isSold ? "opacity-70" : ""}`}
    onMouseDown={(e) => setDragStartX(e.clientX)}
    onMouseUp={(e) => {
      if (dragStartX === null) return;
      const diff = dragStartX - e.clientX;
      if (diff > 50) setCurrentImageIndex((i) => Math.min(i + 1, allImages.length - 1));
      else if (diff < -50) setCurrentImageIndex((i) => Math.max(i - 1, 0));
      setDragStartX(null);
    }}
    onTouchStart={(e) => setDragStartX(e.touches[0].clientX)}
    onTouchEnd={(e) => {
      if (dragStartX === null) return;
      const diff = dragStartX - e.changedTouches[0].clientX;
      if (diff > 50) setCurrentImageIndex((i) => Math.min(i + 1, allImages.length - 1));
      else if (diff < -50) setCurrentImageIndex((i) => Math.max(i - 1, 0));
      setDragStartX(null);
    }}
  >
    <AnimatePresence mode="wait">
      <motion.div
        key={currentImageIndex}
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 0, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        transition={{ duration: 0.25 }}
        className="absolute inset-0"
      >
        <Image
          src={allImages[currentImageIndex]}
          alt={product.title}
          fill
          className={`object-cover select-none ${isSold ? "grayscale" : ""}`}
          priority
          draggable={false}
        />
      </motion.div>
    </AnimatePresence>

    {/* Dot indicators */}
    {allImages.length > 1 && (
      <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {allImages.map((_: string, i: number) => (
          <button
            key={i}
            onClick={() => setCurrentImageIndex(i)}
            className="transition-all"
            style={{
              width: i === currentImageIndex ? "16px" : "6px",
              height: "6px",
              borderRadius: "9999px",
              background: i === currentImageIndex ? "white" : "rgba(255,255,255,0.45)",
            }}
          />
        ))}
      </div>
    )}

    {/* Left / Right arrows — desktop only */}
    {allImages.length > 1 && currentImageIndex > 0 && (
      <button
        onClick={() => setCurrentImageIndex((i) => i - 1)}
        className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/70 backdrop-blur-sm items-center justify-center hover:bg-white transition-all z-10"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
    )}
    {allImages.length > 1 && currentImageIndex < allImages.length - 1 && (
      <button
        onClick={() => setCurrentImageIndex((i) => i + 1)}
        className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/70 backdrop-blur-sm items-center justify-center hover:bg-white transition-all z-10"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>
    )}

    {isSold && (
      <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-2xl">
        <span className="bg-[#2B0A0F]/90 text-[#F6F3EF] text-[9px] uppercase tracking-[0.5em] px-8 py-3 rounded-full">
          Sold
        </span>
      </div>
    )}

    {!isMine && (
      <button
        onClick={() => toggleWishlist(product.id)}
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center hover:scale-110 transition-transform z-10"
      >
        <svg
          width="22" height="22" viewBox="0 0 24 24"
          fill={isWishlisted(product.id) ? "#A1123F" : "none"}
          stroke={isWishlisted(product.id) ? "#A1123F" : "white"}
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.4))" }}
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
    )}

    <div className="absolute bottom-4 left-4 flex gap-2 z-10">
      <button
        onClick={() => setShareOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/80 backdrop-blur-sm text-[9px] uppercase tracking-widest hover:bg-white transition-all shadow-sm"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
        Share
      </button>
      {!isMine && user && (
        <button
          onClick={() => setReportOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/80 backdrop-blur-sm text-[9px] uppercase tracking-widest hover:bg-white transition-all shadow-sm text-[#A1123F]"
        >
          🚩 Report
        </button>
      )}
    </div>
  </div>

  {/* Thumbnail strip — synced to current index */}
  {allImages.length > 1 && (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {allImages.map((img: string, i: number) => (
        <button
          key={i}
          onClick={() => setCurrentImageIndex(i)}
          className={`relative w-14 sm:w-16 h-[72px] sm:h-20 flex-shrink-0 overflow-hidden rounded-lg transition-all ${
            currentImageIndex === i
              ? "ring-2 ring-[#2B0A0F] opacity-100"
              : "opacity-40 hover:opacity-80"
          }`}
        >
          <Image src={img} alt={`View ${i + 1}`} fill className="object-cover" />
        </button>
      ))}
    </div>
  )}
</div>

          {/* ── RIGHT: PRODUCT DETAILS ── */}
          <div className="flex flex-col">
            <p className="text-[9px] uppercase tracking-[0.35em] opacity-40 mb-3 sm:mb-4">
              Pre-loved Archive{product.mood && ` · ${product.mood}`}
            </p>

            <h1
              className="leading-[0.95] mb-4 sm:mb-5"
              style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(1.8rem,5vw,3rem)" }}
            >
              {product.title}
            </h1>

             <p className="text-2xl sm:text-3xl mb-2 text-[#A1123F]" style={{ fontFamily: "var(--font-playfair)" }}>
  ₹{product.price?.toLocaleString("en-IN")}
</p>

{/* Shipping line */}
<p className="text-[10px] uppercase tracking-[0.2em] opacity-50 mb-5 sm:mb-6">
  {Number(product.shipping_price) > 0
    ? `+ ₹${Number(product.shipping_price)} shipping · Total ₹${(product.price + Number(product.shipping_price)).toLocaleString("en-IN")}`
    : "Free shipping"
  }
</p>

            {/* Meta chips — scrollable on very small screens */}
            <div className="flex flex-wrap gap-2 mb-6 sm:mb-7">
              {product.condition && (
                <span
                  className="text-[9px] uppercase tracking-[0.18em] px-3 py-1.5 rounded-full border flex items-center gap-1.5"
                  style={{ borderColor: `${condStyle.text}30`, color: condStyle.text, background: `${condStyle.text}10` }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: condStyle.dot }} />
                  {product.condition}
                </span>
              )}
              {product.size && (
                <span className="text-[9px] uppercase tracking-[0.18em] px-3 py-1.5 rounded-full border border-[#2B0A0F]/12 text-[#2B0A0F]/60">
                  Size {product.size}
                </span>
              )}
              {product.category && (
                <span className="text-[9px] uppercase tracking-[0.18em] px-3 py-1.5 rounded-full border border-[#2B0A0F]/12 text-[#2B0A0F]/60">
                  {product.category}
                </span>
              )}
              {product.location && (
                <span className="text-[9px] uppercase tracking-[0.18em] px-3 py-1.5 rounded-full border border-[#2B0A0F]/12 text-[#2B0A0F]/50 flex items-center gap-1">
                  <svg width="8" height="10" viewBox="0 0 8 10" fill="none">
                    <path d="M4 0C2.07 0 0.5 1.57 0.5 3.5c0 2.63 3.5 6.5 3.5 6.5s3.5-3.87 3.5-6.5C7.5 1.57 5.93 0 4 0zm0 4.75a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" fill="currentColor"/>
                  </svg>
                  {product.location}
                </span>
              )}
            </div>

            {product.description && (
              <p className="text-sm leading-relaxed text-[#2B0A0F]/65 mb-7 sm:mb-8 max-w-md border-l-2 border-[#2B0A0F]/10 pl-4">
                {product.description}
              </p>
            )}

            <div className="w-full h-px bg-[#2B0A0F]/08 mb-6 sm:mb-8" />

            {/* Seller card */}
            {seller && (
              <Link
                href={`/account/${seller.id}`}
                className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8 p-3 sm:p-4 rounded-2xl border border-[#2B0A0F]/08 bg-white/50 hover:bg-white transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-[#2B0A0F] flex items-center justify-center text-[#F6F3EF] text-sm overflow-hidden flex-shrink-0">
                  {seller.avatar_url ? (
                    <Image src={seller.avatar_url} alt={seller.full_name} width={40} height={40} className="object-cover w-full h-full rounded-full" />
                  ) : (
                    seller.full_name?.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[8px] uppercase tracking-[0.25em] opacity-40 mb-0.5">Curated by</p>
                  <p className="text-sm font-medium truncate">{seller.full_name}</p>
                  {seller.bio && <p className="text-[10px] opacity-40 truncate mt-0.5">{seller.bio}</p>}
                </div>
                <span className="opacity-0 group-hover:opacity-40 transition-opacity text-sm flex-shrink-0">→</span>
              </Link>
            )}

            {/* ── CTAs ── */}
            {isSold ? (
              <div className="w-full py-4 rounded-full bg-[#2B0A0F]/08 text-center text-[9px] uppercase tracking-[0.35em] opacity-40">
                This piece has found its home
              </div>
            ) : isMine ? (
              <div className="w-full py-4 rounded-full border border-[#2B0A0F]/15 text-center text-[9px] uppercase tracking-[0.25em] opacity-50">
                This is your listing
              </div>
            ) : !user ? (
              <div className="flex flex-col gap-3">
                <Link href="/login" className="w-full">
                  <button className="w-full py-4 bg-[#2B0A0F] text-[#F6F3EF] rounded-full text-[10px] uppercase tracking-[0.25em] hover:opacity-80 transition-opacity">
                    Log in to Buy
                  </button>
                </Link>
                <Link href="/login" className="w-full">
                  <button className="w-full py-4 border border-[#2B0A0F]/20 rounded-full text-[10px] uppercase tracking-[0.25em] hover:bg-[#2B0A0F] hover:text-[#F6F3EF] transition-all">
                    Log in to Inquire
                  </button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {/* Buy Now */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleBuyNow}
                  disabled={paymentLoading}
                  className="w-full py-4 bg-[#2B0A0F] text-[#F6F3EF] rounded-full text-[10px] uppercase tracking-[0.25em] hover:opacity-80 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {paymentLoading ? (
                    <>
                      <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
                      </svg>
                      Opening Payment...
                    </>
                  ) : (
                     `Buy Now — ₹${(product.price + Number(product.shipping_price ?? 0)).toLocaleString("en-IN")}`
                  )}
                </motion.button>

                {/* Make an Offer */}
                 {/* Make an Offer — only show if seller marked it negotiable */}
 
<motion.button
  whileTap={{ scale: 0.98 }}
  onClick={() => setOfferOpen(true)}
  className={`w-full py-4 rounded-full text-[10px] uppercase tracking-[0.25em] transition-all border ${
    existingOffer
      ? "border-amber-300 text-amber-600 bg-amber-50"
      : "border-[#2B0A0F]/20 hover:bg-[#2B0A0F]/05"
  }`}
>
  {existingOffer
    ? `Offer Pending — ₹${existingOffer.amount?.toLocaleString("en-IN")}`
    : "Make an Offer"}
</motion.button>


                {/* Inquire + Wishlist — side by side */}
                <div className="flex gap-3">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setChatOpen(true);
                      if (!conversationId) initConversation();
                    }}
                    disabled={loadingChat}
                    className="flex-1 py-4 border border-[#2B0A0F]/20 rounded-full text-[10px] uppercase tracking-[0.25em] hover:bg-[#2B0A0F] hover:text-[#F6F3EF] hover:border-[#2B0A0F] transition-all disabled:opacity-40"
                  >
                    {loadingChat ? "Opening..." : "Inquire →"}
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => toggleWishlist(product.id)}
                    className={`w-14 h-14 rounded-full border flex items-center justify-center transition-all flex-shrink-0 ${
                      isWishlisted(product.id)
                        ? "bg-[#A1123F] border-[#A1123F] text-white"
                        : "border-[#2B0A0F]/20 hover:border-[#A1123F]/50"
                    }`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24"
                      fill={isWishlisted(product.id) ? "white" : "none"}
                      stroke={isWishlisted(product.id) ? "white" : "#A1123F"}
                      strokeWidth="2"
                    >
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                  </motion.button>
                </div>
              </div>
            )}

            {/* Trust signals */}
            <div className="mt-6 sm:mt-8 flex flex-col gap-2">
              {[
                { icon: "🔒", text: "Secure payment via Razorpay" },
                { icon: "✦",  text: "Direct UPI payout to seller" },
                { icon: "↩",  text: "Message seller before buying" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3 text-[10px] opacity-40">
                  <span>{item.icon}</span>
                  <span className="uppercase tracking-[0.15em]">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════
            SIMILAR ITEMS
        ══════════════════════════════ */}
        {similarItems.length > 0 && (
          <div className="mt-16 sm:mt-24 pt-12 sm:pt-16 border-t border-[#2B0A0F]/08">
            <div className="flex items-end justify-between mb-7 sm:mb-10">
              <div>
                <p className="text-[9px] uppercase tracking-[0.4em] opacity-40 mb-2">You May Also Like</p>
                <h2 className="text-2xl sm:text-3xl" style={{ fontFamily: "var(--font-playfair)" }}>
                  More from the Archive
                </h2>
              </div>
              <Link href="/buy" className="text-[9px] uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity whitespace-nowrap">
                View All →
              </Link>
            </div>

            {/* 2 cols on mobile, 4 on md+ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {similarItems.map((item) => (
                <Link key={item.id} href={`/product/${item.id}`} className="group">
                  <div className="relative aspect-[3/4] bg-[#EAE3DB] overflow-hidden rounded-xl mb-2 sm:mb-3">
                    <Image src={item.image_url || "/final.png"} alt={item.title} fill className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    {item.condition && (
                      <span className="absolute top-3 left-3 text-[8px] uppercase tracking-[0.15em] px-2 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white">
                        {item.condition}
                      </span>
                    )}
                  </div>
                  <p className="text-xs truncate font-medium group-hover:opacity-70 transition-opacity">{item.title}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm opacity-70" style={{ fontFamily: "var(--font-playfair)" }}>
                      ₹{item.price?.toLocaleString("en-IN")}
                    </p>
                    {item.size && <span className="text-[9px] uppercase opacity-35 tracking-wide">{item.size}</span>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════
          CHAT PANEL
          — full width on mobile
      ══════════════════════════════ */}
      <AnimatePresence>
        {chatOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
              onClick={() => setChatOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full sm:max-w-[420px] bg-[#1A060B] flex flex-col shadow-2xl"
            >
              {/* Chat header */}
              <div className="px-4 sm:px-6 py-5 border-b border-white/08 flex items-center gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-[#2B0A0F] border border-white/10 flex items-center justify-center text-[#F6F3EF] text-xs overflow-hidden flex-shrink-0">
                    {seller?.avatar_url ? (
                      <Image src={seller.avatar_url} alt={seller.full_name} width={36} height={36} className="object-cover w-full h-full rounded-full" />
                    ) : (
                      seller?.full_name?.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] uppercase tracking-[0.25em] text-[#F6F3EF]/40 mb-0.5">Inquiring about</p>
                    <p className="text-sm text-[#F6F3EF] truncate" style={{ fontFamily: "var(--font-playfair)" }}>
                      {product.title}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setChatOpen(false)}
                  className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-[#F6F3EF]/40 hover:text-[#F6F3EF] hover:border-white/30 transition-all flex-shrink-0"
                >
                  ✕
                </button>
              </div>

              {/* Product preview strip */}
              <div className="px-4 sm:px-6 py-4 border-b border-white/05 flex items-center gap-3 bg-[#2B0A0F]/40">
                <div className="relative w-10 h-12 rounded-md overflow-hidden flex-shrink-0 bg-[#2B0A0F]">
                  <Image src={product.image_url || "/final.png"} alt={product.title} fill className="object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="text-[#F6F3EF]/60 text-xs truncate">{product.title}</p>
                  <p className="text-[#B48A5A] text-sm" style={{ fontFamily: "var(--font-playfair)" }}>
                    ₹{product.price?.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-3">
                {messages.length === 0 && !loadingChat && (
                  <div className="flex flex-col items-center justify-center h-full gap-3 opacity-25">
                    <p className="text-[#F6F3EF] text-sm italic" style={{ fontFamily: "var(--font-playfair)" }}>
                      Start the conversation.
                    </p>
                    <p className="text-[#F6F3EF] text-[9px] uppercase tracking-[0.25em] text-center">
                      Ask about size, condition, or make an offer.
                    </p>
                  </div>
                )}

                {messages.map((msg, idx) => {
                  const isMe      = msg.sender_id === user?.id;
                  const prev      = messages[idx - 1];
                  const sameAsPrev = prev?.sender_id === msg.sender_id;

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isMe ? "justify-end" : "justify-start"} ${sameAsPrev ? "mt-1" : "mt-4"}`}
                    >
                      <div className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed ${
                        isMe
                          ? "bg-[#F6F3EF] text-[#2B0A0F] rounded-[16px] rounded-br-[4px]"
                          : "bg-[#2B0A0F] text-[#F6F3EF] border border-white/08 rounded-[16px] rounded-bl-[4px]"
                      }`}>
                        {msg.text}
                        {(idx === messages.length - 1 || messages[idx + 1]?.sender_id !== msg.sender_id) && (
                          <div className={`text-[8px] mt-1.5 opacity-30 ${isMe ? "text-right" : "text-left"}`}>
                            {(() => {
  const raw = msg.created_at.includes("T") ? msg.created_at : msg.created_at.replace(" ", "T");
  return new Date(raw.endsWith("Z") ? raw : raw + "Z").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
})()}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="px-4 sm:px-5 py-4 border-t border-white/08 bg-[#1A060B]">
                <div className="flex items-center gap-3">
                  <input
                    ref={inputRef}
                    suppressHydrationWarning
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Ask about size, condition, price..."
                    className="flex-1 bg-[#2B0A0F]/60 border border-white/10 rounded-full px-4 sm:px-5 py-3 text-sm text-[#F6F3EF] placeholder:text-[#F6F3EF]/25 outline-none focus:border-[#B48A5A]/50 transition-colors"
                  />
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="w-11 h-11 rounded-full bg-[#B48A5A] flex items-center justify-center flex-shrink-0 disabled:opacity-25 hover:bg-[#C9A070] transition-colors"
                  >
                    {sending ? (
                      <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </motion.button>
                </div>

                {conversationId && (
                  <Link href={`/messages/${conversationId}`}>
                    <p className="text-center text-[9px] uppercase tracking-[0.2em] text-[#F6F3EF]/25 hover:text-[#F6F3EF]/50 transition-colors mt-3">
                      View full thread →
                    </p>
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ShippingAddressModal
        open={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        onConfirm={handleAddressConfirmed}
        loading={paymentLoading}
      />
    </motion.main>
  );
}