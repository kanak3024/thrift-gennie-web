"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import ShippingAddressModal, { ShippingAddress } from "../../components/ShippingAddressModal";

/* ─────────────────────────────
   CONSTANTS
───────────────────────────── */
const DELIVERY_DAYS = { min: 4, max: 7 };

function getEstimatedDelivery() {
  const now  = new Date();
  const from = new Date(now); from.setDate(now.getDate() + DELIVERY_DAYS.min);
  const to   = new Date(now); to.setDate(now.getDate() + DELIVERY_DAYS.max);
  const fmt  = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return `${fmt(from)} – ${fmt(to)}`;
}

const UPI_METHODS = [
  { name: "GPay",     color: "#4285F4" },
  { name: "PhonePe",  color: "#5F259F" },
  { name: "Paytm",    color: "#00BAF2" },
  { name: "UPI",      color: "#6B7E60" },
];

/* ─────────────────────────────
   SKELETON
───────────────────────────── */
function CheckoutSkeleton() {
  return (
    <main className="min-h-screen bg-[#EFE9E1] px-4 sm:px-6 pt-20 sm:pt-28 pb-24">
      <div className="max-w-4xl mx-auto animate-pulse space-y-6">
        <div className="h-4 w-32 bg-[#EAE3DB] rounded-full" />
        <div className="h-10 w-2/3 bg-[#EAE3DB] rounded-full" />
        <div className="grid md:grid-cols-[1fr_380px] gap-6 mt-8">
          <div className="space-y-4">
            <div className="h-28 bg-[#EAE3DB] rounded-2xl" />
            <div className="h-48 bg-[#EAE3DB] rounded-2xl" />
          </div>
          <div className="h-64 bg-[#EAE3DB] rounded-2xl" />
        </div>
      </div>
    </main>
  );
}

/* ─────────────────────────────
   TRUST BADGE ROW
───────────────────────────── */
function TrustRow() {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 mt-5">
      {[
        { icon: "🔒", text: "Secure via Razorpay" },
        { icon: "✦",  text: "Direct seller payout" },
        { icon: "↩",  text: "Message before buying" },
      ].map((t) => (
        <div key={t.text} className="flex items-center gap-2 text-[9px] uppercase tracking-[0.15em] opacity-35">
          <span>{t.icon}</span>
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────
   MAIN PAGE
───────────────────────────── */
export default function CheckoutPage() {
  const { id } = useParams();
  const router  = useRouter();

  const [user, setUser]         = useState<any>(null);
  const [product, setProduct]   = useState<any>(null);
  const [seller, setSeller]     = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [paying, setPaying]     = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressModalOpen, setAddressModalOpen]   = useState(false);
  const [savedAddress, setSavedAddress]           = useState<ShippingAddress | null>(null);
  const [useSaved, setUseSaved]                   = useState(true);

  /* ── AUTH + DATA ── */
  useEffect(() => {
    const init = async () => {
       try {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error("Authentication failed. Please log in again.");
  if (!user) { router.push("/login"); return; }
  setUser(user);

  const { data: p, error: productError } = await supabase
    .from("products").select("*").eq("id", id).single();
  if (productError) throw new Error("Could not load this product. It may have been removed.");
  if (!p || p.status === "sold") { router.push("/buy"); return; }
  setProduct(p);

  if (p.seller_id) {
    const { data: s, error: sellerError } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, bio")
      .eq("id", p.seller_id).single();
    if (!sellerError && s) setSeller(s);
  }

  const { data: lastOrder } = await supabase
    .from("orders")
    .select("shipping_address")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastOrder?.shipping_address) {
    setSavedAddress(lastOrder.shipping_address as ShippingAddress);
    setUseSaved(true);
  }
} catch (err: any) {
  setError(err.message);
} finally {
  setLoading(false);
}
    };
    init();
  }, [id, router]);

  /* ── RAZORPAY ── */
  const handlePay = async (address: ShippingAddress) => {
    setPaying(true);
    try {
      const shippingFee = product.shipping_price || 0;

const res = await fetch("/api/create-order", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    amount:     product.price + shippingFee,
    productId:  product.id,
    buyerId:    user.id,
    buyerEmail: user.email,
  }),
});
      const order = await res.json();
      if (!order.id) throw new Error("Order creation failed");

      const script = document.createElement("script");
      script.src   = "https://checkout.razorpay.com/v1/checkout.js";
      document.body.appendChild(script);

      script.onload = () => {
        const rzp = new (window as any).Razorpay({
          key:         process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount:      order.amount,
          currency:    "INR",
          name:        "Thrift Gennie",
          description: product.title,
          order_id:    order.id,
          image:       product.image_url || "/final.png",
          prefill:     { email: user.email, contact: address.phone, name: address.fullName },
          theme:       { color: "#2B0A0F" },
          handler: async (response: any) => {
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
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
            else { setError("Payment verification failed. Please contact support."); setPaying(false); }
          },
          modal: { ondismiss: () => setPaying(false) },
        });
        rzp.open();
        setPaying(false);
      };
    } catch (err: any) {
      setError("Something went wrong: " + err.message);
      setPaying(false);
    }
  };

  const handleProceed = () => {
    if (savedAddress && useSaved) {
      handlePay(savedAddress);
    } else {
      setAddressModalOpen(true);
    }
  };

  if (loading) return <CheckoutSkeleton />;
  if (!product) return null;
  if (error) return (
  <main className="min-h-screen bg-[#EFE9E1] flex items-center justify-center px-4">
    <div className="text-center max-w-sm">
      <div className="text-4xl mb-4">⚠️</div>
      <p className="text-[#2B0A0F] text-sm mb-6 opacity-70">{error}</p>
      <Link href="/buy" className="text-[10px] uppercase tracking-[0.25em] border border-[#2B0A0F]/30 px-6 py-3 rounded-full hover:bg-[#2B0A0F] hover:text-white transition-all">
        Back to Archive
      </Link>
    </div>
  </main>
);

const shippingFee = product.shipping_price || 0;
const total = product.price + shippingFee;

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-[#EFE9E1] text-[#2B0A0F]"
    >
      {/* Shipping address modal */}
      <ShippingAddressModal
        open={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        onConfirm={(addr) => { setAddressModalOpen(false); handlePay(addr); }}
        loading={paying}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 sm:pt-28 pb-32 md:pb-24">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.25em] opacity-40 mb-8 flex-wrap">
          <Link href="/buy" className="hover:opacity-100 transition-opacity">Archive</Link>
          <span>/</span>
          <Link href={`/product/${product.id}`} className="hover:opacity-100 transition-opacity truncate max-w-[140px]">
            {product.title}
          </Link>
          <span>/</span>
          <span className="opacity-70">Checkout</span>
        </div>

        {/* Heading */}
        <div className="mb-8 sm:mb-10">
          <p className="text-[9px] uppercase tracking-[0.4em] opacity-40 mb-2">Almost there</p>
          <h1
            className="leading-none"
            style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(1.8rem,4vw,2.8rem)" }}
          >
            Review & Pay
          </h1>
        </div>

        {/*
          Layout:
          Mobile  → stacked (product card → address → summary sticky footer)
          Desktop → side-by-side (left: product + address | right: sticky order summary)
        */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-6 lg:gap-10 items-start">

          {/* ── LEFT COLUMN ── */}
          <div className="space-y-5">

            {/* ── PRODUCT CARD ── */}
            <div className="bg-white/70 rounded-2xl p-4 sm:p-5 flex gap-4 border border-[#2B0A0F]/06">
              <Link href={`/product/${product.id}`} className="flex-shrink-0">
                <div className="relative w-20 h-24 sm:w-24 sm:h-28 rounded-xl overflow-hidden bg-[#EAE3DB]">
                  <Image
                    src={product.image_url || "/final.png"}
                    alt={product.title}
                    fill
                    className="object-cover"
                  />
                </div>
              </Link>

              <div className="flex flex-col justify-between flex-1 min-w-0 py-0.5">
                <div>
                  <p className="text-[8px] uppercase tracking-[0.2em] opacity-40 mb-1">
                    {product.category || "Archive"}{product.mood ? ` · ${product.mood}` : ""}
                  </p>
                  <h2
                    className="leading-snug truncate"
                    style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(1rem,2.5vw,1.2rem)" }}
                  >
                    {product.title}
                  </h2>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {product.condition && (
                      <span className="text-[8px] uppercase tracking-[0.15em] px-2 py-1 rounded-full bg-[#2B0A0F]/06 text-[#2B0A0F]/60">
                        {product.condition}
                      </span>
                    )}
                    {product.size && (
                      <span className="text-[8px] uppercase tracking-[0.15em] px-2 py-1 rounded-full bg-[#2B0A0F]/06 text-[#2B0A0F]/60">
                        Size {product.size}
                      </span>
                    )}
                  </div>
                </div>

                <p
                  className="text-xl text-[#A1123F] mt-2"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  ₹{product.price?.toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            {/* ── SELLER CARD ── */}
            {seller && (
              <div className="bg-white/50 rounded-2xl p-4 flex items-center gap-3 border border-[#2B0A0F]/06">
                <div className="w-9 h-9 rounded-full bg-[#2B0A0F] flex items-center justify-center text-[#F6F3EF] text-xs overflow-hidden flex-shrink-0">
                  {seller.avatar_url ? (
                    <Image src={seller.avatar_url} alt={seller.full_name} width={36} height={36} className="object-cover w-full h-full rounded-full" />
                  ) : (
                    seller.full_name?.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] uppercase tracking-[0.2em] opacity-40 mb-0.5">Sold by</p>
                  <p className="text-sm truncate">{seller.full_name}</p>
                </div>
                <div className="ml-auto flex-shrink-0">
                  <span className="text-[8px] uppercase tracking-[0.15em] px-2.5 py-1 rounded-full bg-[#6B7E60]/10 text-[#6B7E60]">
                    ✓ Verified
                  </span>
                </div>
              </div>
            )}

            {/* ── DELIVERY ESTIMATE ── */}
            <div className="bg-white/50 rounded-2xl p-4 flex items-center gap-4 border border-[#2B0A0F]/06">
              <div className="w-9 h-9 rounded-full bg-[#B48A5A]/10 flex items-center justify-center flex-shrink-0 text-base">
                📦
              </div>
              <div>
                <p className="text-[8px] uppercase tracking-[0.2em] opacity-40 mb-0.5">Estimated Delivery</p>
                <p className="text-sm font-medium">{getEstimatedDelivery()}</p>
                <p className="text-[9px] opacity-40 mt-0.5">After payment confirmation</p>
              </div>
            </div>

            {/* ── SHIPPING ADDRESS ── */}
            <div className="bg-white/70 rounded-2xl p-4 sm:p-5 border border-[#2B0A0F]/06">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[9px] uppercase tracking-[0.3em] opacity-40">Shipping Address</p>
                {savedAddress && (
                  <button
                    onClick={() => setAddressModalOpen(true)}
                    className="text-[9px] uppercase tracking-[0.15em] opacity-50 hover:opacity-100 transition-opacity"
                  >
                    Change →
                  </button>
                )}
              </div>

              {savedAddress && useSaved ? (
                /* Saved address display */
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-1"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{savedAddress.fullName}</p>
                      <p className="text-xs opacity-60">{savedAddress.phone}</p>
                      <p className="text-xs opacity-60 leading-relaxed">
                        {savedAddress.addressLine}
                      </p>
                      <p className="text-xs opacity-60">
                        {savedAddress.city}, {savedAddress.state} – {savedAddress.pincode}
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-[8px] uppercase tracking-[0.15em] px-2.5 py-1 rounded-full bg-[#2B0A0F]/06 text-[#2B0A0F]/60 mt-0.5">
                      Saved
                    </span>
                  </div>
                  <button
                    onClick={() => { setUseSaved(false); setAddressModalOpen(true); }}
                    className="mt-3 text-[9px] uppercase tracking-[0.15em] opacity-40 hover:opacity-80 transition-opacity"
                  >
                    + Use a different address
                  </button>
                </motion.div>
              ) : (
                /* No saved address — prompt */
                <button
                  onClick={() => setAddressModalOpen(true)}
                  className="w-full flex items-center gap-3 py-3 px-4 border border-dashed border-[#2B0A0F]/15 rounded-xl text-left hover:border-[#2B0A0F]/30 transition-all group"
                >
                  <div className="w-8 h-8 rounded-full bg-[#2B0A0F]/05 flex items-center justify-center flex-shrink-0 group-hover:bg-[#2B0A0F]/10 transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium opacity-70">Add shipping address</p>
                    <p className="text-[9px] opacity-35 mt-0.5 uppercase tracking-[0.1em]">Required before payment</p>
                  </div>
                </button>
              )}
            </div>

            {/* ── UPI METHODS (mobile only — desktop shown in summary) ── */}
            <div className="md:hidden bg-white/50 rounded-2xl p-4 border border-[#2B0A0F]/06">
              <p className="text-[9px] uppercase tracking-[0.3em] opacity-40 mb-3">Accepted Payments</p>
              <div className="flex gap-2 flex-wrap">
                {UPI_METHODS.map((m) => (
                  <span
                    key={m.name}
                    className="text-[9px] uppercase tracking-[0.1em] px-3 py-1.5 rounded-full border border-[#2B0A0F]/10 font-medium"
                    style={{ color: m.color }}
                  >
                    {m.name}
                  </span>
                ))}
              </div>
            </div>

          </div>

          {/* ── RIGHT COLUMN: ORDER SUMMARY ── */}
          {/* Desktop: sticky sidebar | Mobile: hidden (shown as sticky footer below) */}
          <div className="hidden md:block">
            <div className="sticky top-28 bg-[#F6F3EF] rounded-2xl p-6 border border-[#2B0A0F]/08 shadow-sm">
              <h3
                className="text-xl mb-6"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                Order Summary
              </h3>

              {/* Line items */}
              <div className="space-y-3 mb-5">
                <div className="flex justify-between items-center">
                  <span className="text-xs opacity-60 truncate mr-4">{product.title}</span>
                  <span className="text-sm flex-shrink-0">₹{product.price?.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs opacity-60">Platform fee</span>
                  <span className="text-sm text-[#6B7E60]">Free</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs opacity-60">Shipping</span>
                  <span className="text-sm">
  {shippingFee > 0 ? `₹${shippingFee}` : "Free"}
</span>
                 </div>
              </div>

              <div className="w-full h-px bg-[#2B0A0F]/08 mb-5" />

              <div className="flex justify-between items-center mb-6">
                <span className="text-[10px] uppercase tracking-[0.2em] opacity-60">Total</span>
                <span
                  className="text-2xl text-[#A1123F]"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  ₹{total.toLocaleString("en-IN")}
                </span>
              </div>

              {/* CTA */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleProceed}
                disabled={paying}
                className="w-full py-4 bg-[#2B0A0F] text-[#F6F3EF] rounded-full text-[10px] uppercase tracking-[0.25em] hover:opacity-80 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {paying ? (
                  <>
                    <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
                    </svg>
                    Opening Payment...
                  </>
                ) : (
                  `Pay ₹${total.toLocaleString("en-IN")} →`
                )}
              </motion.button>

              {/* UPI methods */}
              <div className="mt-5">
                <p className="text-[8px] uppercase tracking-[0.25em] opacity-30 mb-2 text-center">Accepted via</p>
                <div className="flex justify-center gap-2 flex-wrap">
                  {UPI_METHODS.map((m) => (
                    <span
                      key={m.name}
                      className="text-[9px] uppercase tracking-[0.1em] px-2.5 py-1 rounded-full border border-[#2B0A0F]/08 font-medium"
                      style={{ color: m.color }}
                    >
                      {m.name}
                    </span>
                  ))}
                </div>
              </div>

              <TrustRow />
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════
          MOBILE STICKY FOOTER
          Summary + Pay button pinned to bottom on mobile
      ══════════════════════════════ */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-[#F6F3EF]/95 backdrop-blur-md border-t border-[#2B0A0F]/08 px-4 py-4 z-30 shadow-[0_-8px_30px_rgba(43,10,15,0.08)]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[8px] uppercase tracking-[0.2em] opacity-40 mb-0.5">Total</p>
            <p
              className="text-xl text-[#A1123F]"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              ₹{total.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[8px] uppercase tracking-[0.15em] opacity-35">No platform fee</p>
            <p className="text-[8px] uppercase tracking-[0.15em] opacity-35">Secure · Razorpay</p>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleProceed}
          disabled={paying}
          className="w-full py-4 bg-[#2B0A0F] text-[#F6F3EF] rounded-full text-[10px] uppercase tracking-[0.25em] hover:opacity-80 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {paying ? (
            <>
              <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
              </svg>
              Opening Payment...
            </>
          ) : (
            `Pay ₹${total.toLocaleString("en-IN")} →`
          )}
        </motion.button>
      </div>

    </motion.main>
  );
}