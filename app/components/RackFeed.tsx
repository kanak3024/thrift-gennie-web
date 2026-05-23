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

// ── Action button — accepts MouseEvent so TS is happy ──────────
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
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1"
      aria-label={label}
    >
      <motion.div
        whileTap={{ scale: 0.82 }}
        className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all ${
          active
            ? activeStyle ?? "bg-white/20 border-white/30"
            : "bg-black/25 border-white/15 backdrop-blur-sm"
        }`}
      >
        {children}
      </motion.div>
      <span
        className="text-[10px] text-white/60 uppercase tracking-[0.12em]"
        style={{ fontFamily: "var(--font-dm)" }}
      >
        {label}
      </span>
    </button>
  );
}

// ── Single slide ───────────────────────────────────────────────
function RackSlide({
  product, isActive, liked, saved, inBag,
  onLike, onSave, onBag, onSellerTap,
}: {
  product: Product;
  isActive: boolean;
  liked: boolean;
  saved: boolean;
  inBag: boolean;
  onLike: (e: React.MouseEvent) => void;
  onSave: (e: React.MouseEvent) => void;
  onBag: (e: React.MouseEvent) => void;
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

      {/* gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />

      {/* ── SELLER BAR top left ── */}
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
            <p className="text-white/50 text-[11px] leading-tight" style={{ fontFamily: "var(--font-dm)" }}>
              @{seller.username}
            </p>
          )}
        </div>
      </button>

      {/* ── RIGHT ACTIONS ── */}
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

        <ActionBtn onClick={onBag} active={inBag} activeStyle="bg-[#2a4a34]/60 border-[#4a9a6a]/50" label={inBag ? "Added" : "Bag"}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={inBag ? "#6fd09a" : "white"} strokeWidth="1.8">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
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

      {/* ── BOTTOM INFO ── */}
      <div className="absolute bottom-0 left-0 right-16 px-4 pb-6 z-10">
        {product.mood && (
          <span
            className="inline-block mb-2 text-[9px] uppercase tracking-[0.2em] px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white/70"
            style={{ fontFamily: "var(--font-dm)" }}
          >
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
            <>
              <span className="w-1 h-1 rounded-full bg-white/25 inline-block" />
              <span>{product.location}</span>
            </>
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

      {/* scroll hint */}
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

  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [inBag, setInBag] = useState<Record<string, boolean>>({});
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const heartIdRef = useRef(0);

  const trackRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchDeltaY = useRef(0);
  const isTouching = useRef(false);
  const wheelLock = useRef<ReturnType<typeof setTimeout> | null>(null);

  // fetch products
  useEffect(() => {
    supabase
      .from("products")
      .select(`
        id, title, price, image_url, mood, size,
        condition, category, location, seller_id,
        profiles!products_seller_id_fkey(full_name, username, avatar_url)
      `)
      .eq("status", "available")
      .not("image_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (data) setProducts(data as unknown as Product[]);
        setLoading(false);
      });
  }, []);

  // pre-populate saved state from wishlist
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      supabase
        .from("wishlist")
        .select("product_id")
        .eq("user_id", data.user.id)
        .then(({ data: wl }) => {
          if (wl) {
            const map: Record<string, boolean> = {};
            wl.forEach((w) => { map[w.product_id] = true; });
            setSaved(map);
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

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    isTouching.current = true;
    touchDeltaY.current = 0;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isTouching.current) return;
    touchDeltaY.current = e.touches[0].clientY - touchStartY.current;
  };
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
      await supabase.from("wishlist").upsert({ user_id: user.id, product_id: productId });
    } else {
      await supabase.from("wishlist").delete().eq("user_id", user.id).eq("product_id", productId);
    }
  };

  const handleBag = (productId: string) => {
    setInBag((prev) => ({ ...prev, [productId]: !prev[productId] }));
    // wire to your cart context here if needed
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
          <p className="text-[#F6F3EF]/40 text-2xl mb-2" style={{ fontFamily: "var(--font-cormorant)" }}>
            The rack is empty.
          </p>
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/20" style={{ fontFamily: "var(--font-dm)" }}>
            Check back soon
          </p>
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
      {/* slide track */}
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
              inBag={!!inBag[product.id]}
              onLike={(e) => handleLike(product.id, e)}
              onSave={() => handleSave(product.id)}
              onBag={() => handleBag(product.id)}
              onSellerTap={() => setActiveSellerId(product.seller_id)}
            />
          </div>
        ))}
      </div>

      {/* progress dots */}
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 z-20 pointer-events-none">
        {products.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: "3px",
              height: i === currentIdx ? "16px" : "3px",
              background: i === currentIdx ? "#B48A5A" : "rgba(255,255,255,0.2)",
            }}
          />
        ))}
      </div>

      {/* counter */}
      <div className="absolute top-4 right-4 text-[10px] text-white/30 z-20 pointer-events-none" style={{ fontFamily: "var(--font-dm)" }}>
        {currentIdx + 1} / {products.length}
      </div>

      {/* hearts */}
      {hearts.map((h) => <HeartBurst key={h.id} x={h.x} y={h.y} />)}

      {/* seller sheet */}
      <SellerSheet sellerId={activeSellerId} onClose={() => setActiveSellerId(null)} />
    </div>
  );
}