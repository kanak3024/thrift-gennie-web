"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import SellerSheet from "./SellerSheet";
import Link from "next/link";

type Product = {
  id: string;
  title: string;
  price: number;
  image_url: string;
  mood?: string;
  size?: string;
  condition?: string;
  category?: string;
  location?: string;
  seller_id: string;
  profiles?: {
    full_name: string;
    username?: string;
    avatar_url?: string;
  };
};

const AVATAR_COLORS = ["#3d1a2e", "#1a2e3d", "#1a3d2e", "#2e1a3d", "#3d2e1a"];
const getAvatarColor = (id: string) => AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length];
const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

// ── Heart burst ────────────────────────────────────────────────
function HeartBurst({ x, y }: { x: number; y: number }) {
  return (
    <motion.div
      initial={{ opacity: 1, scale: 0.5, x, y }}
      animate={{ opacity: 0, scale: 2, y: y - 60 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed pointer-events-none z-[80] text-3xl"
      style={{ left: 0, top: 0 }}
    >
      ❤️
    </motion.div>
  );
}

// ── Offer Sheet ────────────────────────────────────────────────
function OfferSheet({
  product,
  onClose,
  currentUserId,
}: {
  product: Product;
  onClose: () => void;
  currentUserId: string | null;
}) {
  const [offerAmount, setOfferAmount] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [existingOffer, setExistingOffer] = useState<any>(null);
  const [checkingOffer, setCheckingOffer] = useState(true);

  // check existing offer
  useEffect(() => {
    if (!currentUserId) { setCheckingOffer(false); return; }
    supabase
      .from("offers")
      .select("*")
      .eq("product_id", product.id)
      .eq("buyer_id", currentUserId)
      .in("status", ["pending", "countered", "accepted"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setExistingOffer(data);
        setCheckingOffer(false);
      });
  }, [product.id, currentUserId]);

  const handleSend = async () => {
    if (!offerAmount || parseFloat(offerAmount) <= 0) return;
    if (parseFloat(offerAmount) >= product.price) {
      alert("Offer should be less than the listed price. Just buy it! 🛍️");
      return;
    }
    setLoading(true);
    try {
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
        setSuccess(true);
        setExistingOffer({ amount: parseFloat(offerAmount), status: "pending" });
        setTimeout(() => onClose(), 1800);
      }
    } catch {
      alert("Failed to send offer. Try again.");
    }
    setLoading(false);
  };

  return (
    <>
      {/* backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] bg-black/60"
        onClick={onClose}
      />
      {/* sheet */}
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[71] bg-[#F6F3EF] rounded-t-3xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-[#2B0A0F]/15" />
        </div>
        <button onClick={onClose} className="absolute top-4 right-5 text-[#2B0A0F]/40 hover:text-[#2B0A0F] text-xl leading-none">✕</button>

        <div className="px-6 pt-2 pb-6">
          {success ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-3">✦</p>
              <p className="text-lg mb-1" style={{ fontFamily: "var(--font-cormorant)" }}>Offer Sent!</p>
              <p className="text-[10px] uppercase tracking-widest opacity-40" style={{ fontFamily: "var(--font-dm)" }}>
                The seller will respond within 24 hours
              </p>
            </div>
          ) : checkingOffer ? (
            <div className="py-10 flex justify-center">
              <div className="w-5 h-5 border-2 border-[#2B0A0F]/20 border-t-[#2B0A0F] rounded-full animate-spin" />
            </div>
          ) : existingOffer ? (
            <div className="py-4">
              <h3 className="text-xl mb-1" style={{ fontFamily: "var(--font-cormorant)" }}>Your Offer</h3>
              <p className="text-[10px] uppercase tracking-widest opacity-40 mb-5" style={{ fontFamily: "var(--font-dm)" }}>
                Listed at ₹{product.price?.toLocaleString("en-IN")}
              </p>
              <div className={`rounded-2xl p-4 mb-4 ${
                existingOffer.status === "countered"
                  ? "bg-blue-50 border border-blue-200"
                  : existingOffer.status === "accepted"
                  ? "bg-green-50 border border-green-200"
                  : "bg-amber-50 border border-amber-200"
              }`}>
                {existingOffer.status === "pending" && (
                  <>
                    <p className="text-[9px] uppercase tracking-widest text-amber-600 mb-1" style={{ fontFamily: "var(--font-dm)" }}>Offer Pending</p>
                    <p className="text-2xl text-amber-700" style={{ fontFamily: "var(--font-cormorant)" }}>₹{existingOffer.amount?.toLocaleString("en-IN")}</p>
                    <p className="text-[10px] text-amber-500 mt-1" style={{ fontFamily: "var(--font-dm)" }}>Waiting for seller to respond</p>
                  </>
                )}
                {existingOffer.status === "countered" && (
                  <>
                    <p className="text-[9px] uppercase tracking-widest text-blue-500 mb-1" style={{ fontFamily: "var(--font-dm)" }}>Seller Countered</p>
                    <p className="text-2xl text-blue-700" style={{ fontFamily: "var(--font-cormorant)" }}>₹{existingOffer.counter_amount?.toLocaleString("en-IN")}</p>
                    <p className="text-[10px] text-blue-500 mt-1" style={{ fontFamily: "var(--font-dm)" }}>Your offer: ₹{existingOffer.amount?.toLocaleString("en-IN")}</p>
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
                          setTimeout(onClose, 1500);
                        }}
                        className="flex-1 py-2.5 rounded-full bg-blue-600 text-white text-[9px] uppercase tracking-widest hover:opacity-80 transition-opacity"
                        style={{ fontFamily: "var(--font-dm)" }}
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
                          onClose();
                        }}
                        className="flex-1 py-2.5 rounded-full border border-blue-200 text-blue-600 text-[9px] uppercase tracking-widest hover:opacity-80"
                        style={{ fontFamily: "var(--font-dm)" }}
                      >
                        Decline
                      </button>
                    </div>
                  </>
                )}
                {existingOffer.status === "accepted" && (
                  <div className="text-center">
                    <p className="text-2xl mb-2">✅</p>
                    <p className="text-sm text-green-700" style={{ fontFamily: "var(--font-dm)" }}>Offer accepted!</p>
                    <Link href={`/product/${product.id}`}>
                      <button className="mt-3 px-5 py-2 rounded-full bg-green-600 text-white text-[10px] uppercase tracking-widest" style={{ fontFamily: "var(--font-dm)" }}>
                        Go to Listing →
                      </button>
                    </Link>
                  </div>
                )}
              </div>
              {existingOffer.status === "pending" && (
                <button
                  onClick={async () => {
                    const { data: { session } } = await supabase.auth.getSession();
                    const res = await fetch("/api/offers/cancel", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
                      body: JSON.stringify({ offerId: existingOffer.id }),
                    });
                    if (res.ok) { setExistingOffer(null); }
                  }}
                  className="w-full py-3 rounded-full border border-red-200 text-red-400 text-[9px] uppercase tracking-widest hover:bg-red-50 transition-all"
                  style={{ fontFamily: "var(--font-dm)" }}
                >
                  Cancel Offer
                </button>
              )}
            </div>
          ) : (
            <>
              <h3 className="text-xl mb-1" style={{ fontFamily: "var(--font-cormorant)" }}>Make an Offer</h3>
              <p className="text-[10px] uppercase tracking-widest opacity-40 mb-5" style={{ fontFamily: "var(--font-dm)" }}>
                Listed at ₹{product.price?.toLocaleString("en-IN")}
              </p>
              <div className="space-y-4">
                <div className="border-b border-[#2B0A0F]/10 pb-2">
                  <label className="text-[9px] uppercase tracking-widest opacity-50 block mb-2" style={{ fontFamily: "var(--font-dm)" }}>Your Offer (₹)</label>
                  <input
                    type="number"
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                    placeholder={`e.g. ${Math.round(product.price * 0.8).toLocaleString("en-IN")}`}
                    className="w-full bg-transparent text-2xl outline-none placeholder:opacity-20 text-[#2B0A0F]"
                    style={{ fontFamily: "var(--font-cormorant)" }}
                    autoFocus
                  />
                </div>
                <div className="border-b border-[#2B0A0F]/10 pb-2">
                  <label className="text-[9px] uppercase tracking-widest opacity-50 block mb-2" style={{ fontFamily: "var(--font-dm)" }}>Message (optional)</label>
                  <input
                    type="text"
                    value={offerMessage}
                    onChange={(e) => setOfferMessage(e.target.value)}
                    placeholder="e.g. Can you do a little lower?"
                    className="w-full bg-transparent text-sm outline-none placeholder:opacity-20 text-[#2B0A0F]"
                    style={{ fontFamily: "var(--font-dm)" }}
                  />
                </div>
                {/* quick % buttons */}
                <div className="flex gap-2">
                  {[0.9, 0.8, 0.7].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setOfferAmount(Math.round(product.price * pct).toString())}
                      className="flex-1 py-2 rounded-full border border-[#2B0A0F]/15 text-[9px] uppercase tracking-widest hover:bg-[#2B0A0F] hover:text-[#F6F3EF] transition-all text-[#2B0A0F]"
                      style={{ fontFamily: "var(--font-dm)" }}
                    >
                      {Math.round(pct * 100)}%
                    </button>
                  ))}
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3.5 rounded-full border border-[#2B0A0F]/15 text-[10px] uppercase tracking-widest hover:opacity-60 transition-opacity text-[#2B0A0F]"
                    style={{ fontFamily: "var(--font-dm)" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={loading || !offerAmount}
                    className="flex-1 py-3.5 rounded-full bg-[#2B0A0F] text-[#F6F3EF] text-[10px] uppercase tracking-widest hover:opacity-80 transition-opacity disabled:opacity-40"
                    style={{ fontFamily: "var(--font-dm)" }}
                  >
                    {loading ? "Sending..." : "Send Offer"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </>
  );
}

// ── Action button ──────────────────────────────────────────────
function ActionBtn({
  onClick, active, activeStyle, children, label,
}: {
  onClick: (e: React.MouseEvent) => void;
  active?: boolean;
  activeStyle?: string;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1" aria-label={label}>
      <motion.div
        whileTap={{ scale: 0.82 }}
        className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all ${
          active ? activeStyle ?? "bg-white/20 border-white/30" : "bg-black/25 border-white/15 backdrop-blur-sm"
        }`}
      >
        {children}
      </motion.div>
      <span className="text-[10px] text-white/60 uppercase tracking-[0.12em]" style={{ fontFamily: "var(--font-dm)" }}>
        {label}
      </span>
    </button>
  );
}

// ── Single slide ───────────────────────────────────────────────
function RackSlide({
  product, isActive, liked, saved, hasOffer,
  onLike, onSave, onOffer, onSellerTap,
}: {
  product: Product;
  isActive: boolean;
  liked: boolean;
  saved: boolean;
  hasOffer: boolean;
  onLike: (e: React.MouseEvent) => void;
  onSave: (e: React.MouseEvent) => void;
  onOffer: (e: React.MouseEvent) => void;
  onSellerTap: () => void;
}) {
  const seller = product.profiles;
  const sellerName = seller?.full_name ?? "Seller";

  return (
    <div className="relative w-full h-full flex-shrink-0 overflow-hidden bg-[#0e0c0b]">

      {product.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.image_url}
          alt={product.title}
          className="absolute inset-0 w-full h-full object-cover"
          loading={isActive ? "eager" : "lazy"}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />

      {/* seller bar */}
      <button
        onClick={onSellerTap}
        className="absolute top-14 left-4 flex items-center gap-2.5 z-10"
        aria-label={`View ${sellerName}'s profile`}
      >
        <div
          className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden border-2 border-white/60 flex items-center justify-center"
          style={{ background: getAvatarColor(product.seller_id) }}
        >
          {seller?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={seller.avatar_url} alt={sellerName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[12px] font-medium text-white" style={{ fontFamily: "var(--font-dm)" }}>
              {getInitials(sellerName)}
            </span>
          )}
        </div>
        <div className="text-left">
          <p className="text-white text-[13px] font-medium leading-tight drop-shadow" style={{ fontFamily: "var(--font-dm)" }}>
            {sellerName}
          </p>
          {seller?.username && (
            <p className="text-white/50 text-[11px]" style={{ fontFamily: "var(--font-dm)" }}>@{seller.username}</p>
          )}
        </div>
      </button>

      {/* right actions */}
      <div className="absolute right-4 bottom-36 flex flex-col items-center gap-5 z-10">

        <ActionBtn onClick={onLike} active={liked} activeStyle="bg-[#A1123F]/40 border-[#A1123F]/60" label="Like">
          <svg width="22" height="22" viewBox="0 0 24 24" fill={liked ? "#ff6b8a" : "none"} stroke={liked ? "#ff6b8a" : "white"} strokeWidth="1.8">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </ActionBtn>

        <ActionBtn onClick={onSave} active={saved} activeStyle="bg-[#B48A5A]/30 border-[#B48A5A]/50" label="Save">
          <svg width="20" height="20" viewBox="0 0 24 24" fill={saved ? "#B48A5A" : "none"} stroke={saved ? "#B48A5A" : "white"} strokeWidth="1.8">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </ActionBtn>

        {/* OFFER — replaces Bag */}
        <ActionBtn
          onClick={onOffer}
          active={hasOffer}
          activeStyle="bg-amber-500/30 border-amber-400/50"
          label={hasOffer ? "Offered" : "Offer"}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={hasOffer ? "#f59e0b" : "white"} strokeWidth="1.8">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
            <path d="M12 6v6l4 2" strokeLinecap="round"/>
          </svg>
        </ActionBtn>

        <ActionBtn
          onClick={() => {
            if (typeof navigator !== "undefined" && navigator.share) {
              navigator.share({
                title: product.title,
                text: `Check out ${product.title} on Thrift Gennie — ₹${product.price}`,
                url: `${window.location.origin}/product/${product.id}`,
              });
            }
          }}
          label="Share"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </ActionBtn>

      </div>

      {/* bottom info */}
      <div className="absolute bottom-0 left-0 right-16 px-4 pb-6 z-10">
        {product.mood && (
          <span className="inline-block mb-2 text-[9px] uppercase tracking-[0.2em] px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white/70" style={{ fontFamily: "var(--font-dm)" }}>
            {product.mood}
          </span>
        )}
        <h2 className="text-white text-xl leading-tight mb-1" style={{ fontFamily: "var(--font-cormorant)", fontWeight: 500 }}>
          {product.title}
        </h2>
        <div className="flex items-center gap-2 text-white/50 text-[11px] mb-3" style={{ fontFamily: "var(--font-dm)" }}>
          {product.size && <span>Size {product.size}</span>}
          {product.size && product.condition && <span className="w-1 h-1 rounded-full bg-white/25 inline-block" />}
          {product.condition && <span>{product.condition}</span>}
          {product.location && (
            <><span className="w-1 h-1 rounded-full bg-white/25 inline-block" /><span>{product.location}</span></>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[#B48A5A] text-2xl" style={{ fontFamily: "var(--font-cormorant)", fontWeight: 500 }}>
            ₹{product.price}
          </span>
          <Link href={`/product/${product.id}`}>
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="px-5 py-2 rounded-full bg-[#F6F3EF] text-[#1A060B] text-[10px] uppercase tracking-[0.18em] font-medium hover:bg-white transition-colors"
              style={{ fontFamily: "var(--font-dm)" }}
            >
              View Listing →
            </motion.button>
          </Link>
        </div>
      </div>

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-25 pointer-events-none">
        <motion.div animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        </motion.div>
      </div>
    </div>
  );
}

// ── MAIN FEED ──────────────────────────────────────────────────
export default function RackFeed() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [activeSellerId, setActiveSellerId] = useState<string | null>(null);
  const [activePrefetchedProfile, setActivePrefetchedProfile] = useState<{full_name: string; username?: string; avatar_url?: string} | null>(null);
  const [offerProduct, setOfferProduct] = useState<Product | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [hasOffer, setHasOffer] = useState<Record<string, boolean>>({});
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const heartIdRef = useRef(0);

  const trackRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchDeltaY = useRef(0);
  const isTouching = useRef(false);
  const wheelLock = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    // Fetch all available products, shuffle client-side so every session is different
    supabase
      .from("products")
      .select(`
        id, title, price, image_url, mood, size,
        condition, category, location, seller_id,
        profiles(full_name, username, avatar_url)
      `)
      .eq("status", "available")
      .not("image_url", "is", null)
      .limit(70)
      .then(({ data }) => {
        if (data) {
          // Fisher-Yates shuffle — different order every session
          const shuffled = [...data] as unknown as Product[];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          setProducts(shuffled);
        }
        setLoading(false);
      });
  }, []);

  // pre-populate saved + offers
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      const uid = data.user.id;

      supabase.from("wishlists").select("product_id").eq("user_id", uid).then(({ data: wl }) => {
        if (wl) {
          const map: Record<string, boolean> = {};
          wl.forEach((w) => { map[w.product_id] = true; });
          setSaved(map);
        }
      });

      supabase.from("offers").select("product_id").eq("buyer_id", uid).in("status", ["pending", "countered", "accepted"]).then(({ data: offers }) => {
        if (offers) {
          const map: Record<string, boolean> = {};
          offers.forEach((o) => { map[o.product_id] = true; });
          setHasOffer(map);
        }
      });
    });
  }, []);

  const scrollTo = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(idx, products.length - 1));
    setCurrentIdx(clamped);
    if (trackRef.current) {
      trackRef.current.style.transform = `translateY(-${clamped * 100}%)`;
    }
  }, [products.length]);

  const handleTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; isTouching.current = true; touchDeltaY.current = 0; };
  const handleTouchMove = (e: React.TouchEvent) => { if (!isTouching.current) return; touchDeltaY.current = e.touches[0].clientY - touchStartY.current; };
  const handleTouchEnd = () => {
    if (!isTouching.current) return;
    isTouching.current = false;
    if (touchDeltaY.current < -50) scrollTo(currentIdx + 1);
    else if (touchDeltaY.current > 50) scrollTo(currentIdx - 1);
    touchDeltaY.current = 0;
  };

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (wheelLock.current) return;
    if (e.deltaY > 30) scrollTo(currentIdx + 1);
    else if (e.deltaY < -30) scrollTo(currentIdx - 1);
    wheelLock.current = setTimeout(() => { wheelLock.current = null; }, 600);
  }, [currentIdx, scrollTo]);

  useEffect(() => {
    const el = trackRef.current?.parentElement;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const handleLike = async (productId: string, e: React.MouseEvent) => {
    const newVal = !liked[productId];
    setLiked((prev) => ({ ...prev, [productId]: newVal }));
    if (newVal) {
      const id = ++heartIdRef.current;
      setHearts((prev) => [...prev, { id, x: e.clientX - 20, y: e.clientY - 20 }]);
      setTimeout(() => setHearts((prev) => prev.filter((h) => h.id !== id)), 700);
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (newVal) {
      await supabase.from("rack_likes").upsert({ user_id: user.id, product_id: productId }).then(() => {});
    } else {
      await supabase.from("rack_likes").delete().eq("user_id", user.id).eq("product_id", productId).then(() => {});
    }
  };

  const handleSave = async (productId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const newVal = !saved[productId];
    setSaved((prev) => ({ ...prev, [productId]: newVal }));
    if (newVal) {
      await supabase.from("wishlists").upsert({ user_id: user.id, product_id: productId });
    } else {
      await supabase.from("wishlists").delete().eq("user_id", user.id).eq("product_id", productId);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0e0c0b]">
        <p className="text-[#B48A5A] text-xs uppercase tracking-[0.35em] animate-pulse" style={{ fontFamily: "var(--font-dm)" }}>
          Loading the rack...
        </p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0e0c0b]">
        <div className="text-center">
          <p className="text-[#F6F3EF]/40 text-2xl mb-2" style={{ fontFamily: "var(--font-cormorant)" }}>The rack is empty.</p>
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/20" style={{ fontFamily: "var(--font-dm)" }}>Check back soon</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full flex-1 overflow-hidden bg-[#0e0c0b]"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        ref={trackRef}
        className="flex flex-col"
        style={{
          height: `${products.length * 100}%`,
          transform: `translateY(-${currentIdx * (100 / products.length)}%)`,
          transition: "transform 0.38s cubic-bezier(0.42,0,0.18,1)",
          willChange: "transform",
        }}
      >
        {products.map((product, i) => (
          <div key={product.id} style={{ height: `${100 / products.length}%` }} className="w-full flex-shrink-0">
            <RackSlide
              product={product}
              isActive={i === currentIdx}
              liked={!!liked[product.id]}
              saved={!!saved[product.id]}
              hasOffer={!!hasOffer[product.id]}
              onLike={(e) => handleLike(product.id, e)}
              onSave={() => handleSave(product.id)}
              onOffer={() => {
                if (!currentUserId) { window.location.href = "/login"; return; }
                setOfferProduct(product);
              }}
              onSellerTap={() => {
                if (product.seller_id) {
                  setActiveSellerId(product.seller_id);
                  setActivePrefetchedProfile(product.profiles ?? null);
                }
              }}
            />
          </div>
        ))}
      </div>

      {/* progress dots */}
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 z-20 pointer-events-none">
        {products.map((_, i) => (
          <div key={i} className="rounded-full transition-all duration-300" style={{ width: "3px", height: i === currentIdx ? "16px" : "3px", background: i === currentIdx ? "#B48A5A" : "rgba(255,255,255,0.2)" }} />
        ))}
      </div>

      {/* counter */}
      <div className="absolute top-4 right-4 text-[10px] text-white/30 z-20 pointer-events-none" style={{ fontFamily: "var(--font-dm)" }}>
        {currentIdx + 1} / {products.length}
      </div>

      {hearts.map((h) => <HeartBurst key={h.id} x={h.x} y={h.y} />)}

      <SellerSheet
        sellerId={activeSellerId}
        prefetchedProfile={activePrefetchedProfile}
        onClose={() => { setActiveSellerId(null); setActivePrefetchedProfile(null); }}
      />

      {/* Offer sheet */}
      <AnimatePresence>
        {offerProduct && (
          <OfferSheet
            product={offerProduct}
            currentUserId={currentUserId}
            onClose={() => {
              setOfferProduct(null);
              // mark as having offer in UI
              if (offerProduct) setHasOffer((prev) => ({ ...prev, [offerProduct.id]: true }));
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}