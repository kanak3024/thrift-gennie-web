"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { useWishlist } from "../hooks/useWishlist";
import { motion, AnimatePresence } from "framer-motion";

/* ─────────────────────────────
   SORT OPTIONS
───────────────────────────── */
const SORT_OPTIONS = [
  { value: "saved",   label: "Recently Saved" },
  { value: "low",     label: "Price: Low → High" },
  { value: "high",    label: "Price: High → Low" },
];

/* ─────────────────────────────
   SHARE WISHLIST MODAL
───────────────────────────── */
function ShareModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                   bg-[#F6F3EF] rounded-2xl p-6 sm:p-8
                   w-[calc(100vw-2rem)] sm:w-[360px] shadow-2xl"
      >
        <h3 className="text-xl mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
          Share your Reserve
        </h3>
        <p className="text-[10px] uppercase tracking-widest opacity-40 mb-6">
          Let someone know what you're eyeing
        </p>
        <div className="space-y-3">
          <button
            onClick={handleCopy}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-[#2B0A0F]/10 hover:bg-[#2B0A0F] hover:text-[#F6F3EF] hover:border-[#2B0A0F] transition-all"
          >
            <span className="text-xl">🔗</span>
            <span className="text-[10px] uppercase tracking-widest">
              {copied ? "Copied! ✓" : "Copy Link"}
            </span>
          </button>
          <button
            onClick={() => {
              const text = `Check out my wishlist on Thrift Gennie 🛍️\n${url}`;
              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
            }}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-[#2B0A0F]/10 hover:bg-[#25D366] hover:text-white hover:border-[#25D366] transition-all"
          >
            <span className="text-xl">💬</span>
            <span className="text-[10px] uppercase tracking-widest">Share on WhatsApp</span>
          </button>
        </div>
        <button
          onClick={onClose}
          className="w-full mt-4 py-3 text-[10px] uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
        >
          Close
        </button>
      </motion.div>
    </>
  );
}

/* ─────────────────────────────
   WISHLIST CARD
───────────────────────────── */
function WishlistCard({
  product,
  onRemove,
  onQuickBuy,
}: {
  product: any;
  onRemove: (id: string) => void;
  onQuickBuy: (p: any) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isSold = product.status === "sold";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3 }}
      className="group relative flex flex-col"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <div className={`relative aspect-[3/4] bg-[#EAE3DB] overflow-hidden rounded-2xl ${isSold ? "opacity-60" : ""}`}>
        <Image
          src={product.image_url || "/final.png"}
          alt={product.title}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />

        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* Sold overlay */}
        {isSold && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/25 rounded-2xl">
            <span className="bg-[#2B0A0F]/90 text-[#F6F3EF] text-[8px] uppercase tracking-[0.4em] px-5 py-2 rounded-full">
              Sold
            </span>
          </div>
        )}

        {/* Condition badge */}
        {product.condition && (
          <div className="absolute top-3 left-3">
            <span className="text-[8px] uppercase tracking-[0.15em] px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-white">
              {product.condition}
            </span>
          </div>
        )}

        {/* Remove — always visible on mobile, hover on desktop */}
        <motion.button
          animate={{ opacity: hovered ? 1 : 0, scale: hovered ? 1 : 0.85 }}
          initial={false}
          transition={{ duration: 0.15 }}
          onClick={(e) => { e.preventDefault(); onRemove(product.id); }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/85 backdrop-blur-sm
                     flex items-center justify-center text-[#2B0A0F] text-xs shadow-sm
                     opacity-100 sm:opacity-0 sm:group-hover:opacity-100
                     hover:bg-[#A1123F] hover:text-white transition-colors"
          aria-label="Remove from wishlist"
        >
          ✕
        </motion.button>

        {/* Quick buy — hover on desktop, always shown on mobile at bottom */}
        {!isSold && (
          <motion.button
            animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 6 }}
            initial={false}
            transition={{ duration: 0.2 }}
            onClick={(e) => { e.preventDefault(); onQuickBuy(product); }}
            className="absolute bottom-14 left-1/2 -translate-x-1/2 whitespace-nowrap
                       hidden sm:flex
                       bg-white/90 backdrop-blur-sm text-[#2B0A0F]
                       text-[9px] uppercase tracking-[0.2em] px-4 py-2 rounded-full
                       shadow-sm hover:bg-white transition-colors"
          >
            Buy Now →
          </motion.button>
        )}

        {/* Bottom info strip */}
        <Link href={`/product/${product.id}`} className="absolute bottom-0 left-0 right-0 p-4">
          <p className="text-[8px] uppercase tracking-[0.15em] text-white/60 mb-0.5 truncate">
            {product.location || "Archive"}
          </p>
          <div className="flex items-end justify-between gap-2">
            <p
              className="text-white leading-tight truncate"
              style={{ fontFamily: "var(--font-playfair)", fontSize: "0.9rem" }}
            >
              {product.title}
            </p>
            <p
              className="text-white/90 flex-shrink-0 text-sm"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              ₹{product.price?.toLocaleString("en-IN")}
            </p>
          </div>
        </Link>
      </div>

      {/* Mobile buy button — below card, only if not sold */}
      {!isSold && (
        <button
          onClick={() => onQuickBuy(product)}
          className="sm:hidden mt-2 w-full py-2.5 border border-[#2B0A0F]/15 rounded-full
                     text-[9px] uppercase tracking-[0.2em] hover:bg-[#2B0A0F] hover:text-[#F6F3EF]
                     transition-all"
        >
          Buy Now →
        </button>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────
   SKELETON
───────────────────────────── */
function WishlistSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5 md:gap-8">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[3/4] bg-[#EAE3DB] rounded-2xl mb-3" />
          <div className="h-2.5 bg-[#EAE3DB] rounded-full w-2/3 mb-2" />
          <div className="h-2.5 bg-[#EAE3DB] rounded-full w-1/3" />
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────
   EMPTY STATE
───────────────────────────── */
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-24 sm:py-32 flex flex-col items-center gap-5 border border-dashed border-[#2B0A0F]/10 rounded-2xl"
    >
      <p
        className="text-3xl sm:text-4xl opacity-15"
        style={{ fontFamily: "var(--font-playfair)" }}
      >
        Reserved
      </p>
      <p className="text-[10px] uppercase tracking-[0.3em] opacity-30 text-center px-6">
        The pieces you couldn't stop thinking about<br className="hidden sm:block" /> will live here.
      </p>
      <Link
        href="/buy"
        className="mt-2 px-8 py-3 border border-[#2B0A0F]/15 rounded-full text-[10px] uppercase tracking-[0.25em] hover:bg-[#2B0A0F] hover:text-[#F6F3EF] transition-all"
      >
        Browse the Archive →
      </Link>
    </motion.div>
  );
}

/* ─────────────────────────────
   MAIN PAGE
───────────────────────────── */
export default function WishlistPage() {
  const { wishlist, toggleWishlist } = useWishlist();

  const [products, setProducts]     = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [sortBy, setSortBy]         = useState("saved");
  const [shareOpen, setShareOpen]   = useState(false);

  /* ── FETCH ── */
  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      if (wishlist.length === 0) { setProducts([]); setLoading(false); return; }

      const { data, error } = await supabase
        .from("products")
        .select("id, title, price, location, image_url, condition, status, size, mood, category")
        .in("id", wishlist);

      if (!error && data) setProducts(data);
      setLoading(false);
    };
    fetch();
  }, [wishlist]);

  /* ── SORT ── */
  const sorted = useMemo(() => {
    const list = [...products];
    if (sortBy === "low")  return list.sort((a, b) => a.price - b.price);
    if (sortBy === "high") return list.sort((a, b) => b.price - a.price);
    // "saved" — preserve wishlist order
    return list.sort((a, b) => wishlist.indexOf(a.id) - wishlist.indexOf(b.id));
  }, [products, sortBy, wishlist]);

  const soldCount      = products.filter(p => p.status === "sold").length;
  const availableCount = products.length - soldCount;
  const totalValue     = products.filter(p => p.status !== "sold").reduce((s, p) => s + p.price, 0);

  const handleQuickBuy = (product: any) => {
    window.location.href = `/product/${product.id}`;
  };

  /* ── RENDER ── */
  return (
    <main className="min-h-screen bg-[#F6F3EF] text-[#2B0A0F]">

      {/* Share modal */}
      <AnimatePresence>
        {shareOpen && <ShareModal onClose={() => setShareOpen(false)} />}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 sm:pt-28 pb-20">

        {/* ── HEADER ── */}
        <div className="mb-8 sm:mb-12">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[9px] uppercase tracking-[0.4em] opacity-40 mb-3">Your Collection</p>
              <h1
                className="leading-none mb-3"
                style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(2.2rem,6vw,4rem)" }}
              >
                Reserved
                <span className="text-[#B48A5A] ml-2">✦</span>
              </h1>
              <p className="text-[10px] uppercase tracking-[0.3em] opacity-40">
                The pieces you couldn't stop thinking about.
              </p>
            </div>

            {/* Share button — only if wishlist has items */}
            {products.length > 0 && (
              <button
                onClick={() => setShareOpen(true)}
                className="flex items-center gap-2 border border-[#2B0A0F]/15 rounded-full px-4 py-2.5 text-[9px] uppercase tracking-[0.15em] hover:bg-[#2B0A0F] hover:text-[#F6F3EF] transition-all mt-1"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
                Share
              </button>
            )}
          </div>

          {/* ── STATS ROW ── */}
          {!loading && products.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-3 sm:gap-5 mt-6"
            >
              {[
                { label: "Pieces saved",   value: products.length },
                { label: "Still available", value: availableCount },
                { label: "Total value",    value: `₹${totalValue.toLocaleString("en-IN")}` },
                ...(soldCount > 0 ? [{ label: "Sold", value: soldCount, warn: true }] : []),
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col px-4 py-3 rounded-xl bg-[#2B0A0F]/04 border border-[#2B0A0F]/06"
                >
                  <span
                    className="text-base sm:text-lg font-medium"
                    style={{
                      fontFamily: "var(--font-playfair)",
                      color: (stat as any).warn ? "#A1123F" : undefined,
                    }}
                  >
                    {stat.value}
                  </span>
                  <span className="text-[8px] uppercase tracking-[0.2em] opacity-40 mt-0.5">
                    {stat.label}
                  </span>
                </div>
              ))}
            </motion.div>
          )}

          {/* Sold warning */}
          <AnimatePresence>
            {soldCount > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 px-4 py-3 rounded-xl bg-[#A1123F]/06 border border-[#A1123F]/12 flex items-center gap-3"
              >
                <span className="text-sm">🚩</span>
                <p className="text-[10px] uppercase tracking-[0.15em] text-[#A1123F]/80">
                  {soldCount} piece{soldCount > 1 ? "s" : ""} in your reserve {soldCount > 1 ? "have" : "has"} been sold
                </p>
                <button
                  onClick={() => products.filter(p => p.status === "sold").forEach(p => toggleWishlist(p))}
                  className="ml-auto text-[9px] uppercase tracking-[0.15em] text-[#A1123F]/60 hover:text-[#A1123F] transition-colors flex-shrink-0"
                >
                  Remove sold
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── SORT BAR ── */}
        {!loading && products.length > 0 && (
          <div className="flex items-center justify-between mb-6 sm:mb-8 gap-4">
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-40">
              {sorted.length} piece{sorted.length !== 1 ? "s" : ""}
            </p>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 text-xs bg-white/60 border border-[#2B0A0F]/10 rounded-full outline-none focus:border-[#2B0A0F]/30 cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* ── CONTENT ── */}
        {loading ? (
          <WishlistSkeleton />
        ) : products.length === 0 ? (
          <EmptyState />
        ) : (
          <motion.div
            layout
            className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5 md:gap-8"
          >
            <AnimatePresence>
              {sorted.map((product) => (
                <WishlistCard
                  key={product.id}
                  product={product}
                  onRemove={(id) => toggleWishlist(product)}
                  onQuickBuy={handleQuickBuy}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── BOTTOM CTA ── */}
        {!loading && products.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-16 sm:mt-20 pt-10 border-t border-[#2B0A0F]/08 flex flex-col sm:flex-row items-center justify-between gap-5"
          >
            <div>
              <p className="text-[9px] uppercase tracking-[0.3em] opacity-40 mb-1">Want more?</p>
              <p className="text-lg opacity-70" style={{ fontFamily: "var(--font-playfair)" }}>
                There's more in the archive.
              </p>
            </div>
            <Link
              href="/buy"
              className="flex-shrink-0 px-8 py-3.5 border border-[#2B0A0F]/15 rounded-full text-[10px] uppercase tracking-[0.25em] hover:bg-[#2B0A0F] hover:text-[#F6F3EF] transition-all"
            >
              Browse the Archive →
            </Link>
          </motion.div>
        )}
      </div>
    </main>
  );
}