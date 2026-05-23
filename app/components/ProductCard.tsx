"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useWishlist } from "../context/WishlistContext";
import { useLikes } from "../hooks/useLikes";

type Product = {
  id: string;
  title: string;
  price: number;
  location: string;
  image: string;
};

interface ProductStats {
  views: number;
  likes: number;
  saves: number;
}

// ─── Stat pill shown at bottom of card ───────────────────────
function StatPill({ icon, count }: { icon: React.ReactNode; count: number }) {
  return (
    <div className="flex items-center gap-1 text-[11px] font-medium text-[#6B5A52]">
      <span className="text-[12px]">{icon}</span>
      <span>{count}</span>
    </div>
  );
}

export default function ProductCard({ product }: { product: Product }) {
  const { toggleWishlist, isWishlisted } = useWishlist();
  const { toggleLike, isLiked } = useLikes();
  const [stats, setStats] = useState<ProductStats>({ views: 0, likes: 0, saves: 0 });
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [saveAnimating, setSaveAnimating] = useState(false);

  // ── Fetch counts ──
  useEffect(() => {
    const fetchStats = async () => {
      const { count: likeCount } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("product_id", product.id);

      const { count: saveCount } = await supabase
        .from("wishlists")
        .select("*", { count: "exact", head: true })
        .eq("product_id", product.id);

      const { data: productData } = await supabase
        .from("products")
        .select("view_count")
        .eq("id", product.id)
        .single();

      setStats({
        views: productData?.view_count ?? 0,
        likes: likeCount ?? 0,
        saves: saveCount ?? 0,
      });
    };

    fetchStats();
  }, [product.id]);

  // ── Realtime: update counts live when likes/saves change ──
  useEffect(() => {
    const channel = supabase
      .channel(`product-stats-${product.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "likes", filter: `product_id=eq.${product.id}` },
        (payload) => {
          setStats(prev => ({
            ...prev,
            likes: payload.eventType === "INSERT" ? prev.likes + 1 : Math.max(0, prev.likes - 1),
          }));
        }
      )
      .on("postgres_changes",
        { event: "*", schema: "public", table: "wishlists", filter: `product_id=eq.${product.id}` },
        (payload) => {
          setStats(prev => ({
            ...prev,
            saves: payload.eventType === "INSERT" ? prev.saves + 1 : Math.max(0, prev.saves - 1),
          }));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [product.id]);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLikeAnimating(true);
    await toggleLike(product.id);
    setTimeout(() => setLikeAnimating(false), 400);
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSaveAnimating(true);
    await toggleWishlist(product.id);
    setTimeout(() => setSaveAnimating(false), 400);
  };

  const liked   = isLiked(product.id);
  const saved   = isWishlisted(product.id);

  return (
    <div className="group relative rounded-2xl border border-[#EEE5DC] bg-white overflow-hidden hover:shadow-xl transition-all duration-300">

      {/* ── Action buttons: Like + Save ── */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">

        {/* ── LIKE button → `likes` table, NOT Reserved ── */}
        <motion.button
          whileTap={{ scale: 0.75 }}
          whileHover={{ scale: 1.15 }}
          onClick={handleLike}
          className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm border border-[#EEE5DC] flex items-center justify-center shadow-sm"
          title="Like this piece"
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={liked ? "liked" : "not-liked"}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-center"
            >
              <svg
                width="14" height="14" viewBox="0 0 24 24"
                fill={liked ? "#A1123F" : "none"}
                stroke={liked ? "#A1123F" : "white"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </motion.span>
          </AnimatePresence>
        </motion.button>

        {/* ── SAVE button → `wishlists` table → shows in Reserved ── */}
        <motion.button
          whileTap={{ scale: 0.75 }}
          whileHover={{ scale: 1.15 }}
          onClick={handleWishlist}
          className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm border border-[#EEE5DC] flex items-center justify-center shadow-sm"
          title="Save to Reserved"
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={saved ? "saved" : "not-saved"}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-center"
            >
              <svg
                width="14" height="14" viewBox="0 0 24 24"
                fill={saved ? "#B48A5A" : "none"}
                stroke="#B48A5A"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>

      {/* ── Hot badge: shows when saves >= 3 ── */}
      {stats.saves >= 3 && (
        <div className="absolute top-3 left-3 z-20">
          <div className="flex items-center gap-1 bg-[#FFF3E8] border border-[#F0C890]/30 text-[#7C4A1E] text-[10px] font-bold px-2 py-1 rounded-full">
            🔥 {stats.saves} saves
          </div>
        </div>
      )}

      <Link href={`/product/${product.id}`}>
        {/* ── Product image ── */}
        <div className="relative aspect-square bg-[#F5F0EA]">
          <Image
            src={product.image}
            alt={product.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>

        {/* ── Product info ── */}
        <div className="p-3.5 space-y-1">
          <h3 className="font-semibold text-[#1A0A0A] truncate text-sm">
            {product.title}
          </h3>

          <p className="font-bold text-[#1A0A0A]">
            ₹{product.price}
          </p>

          <p className="text-xs text-[#8B7A6E]">
            {product.location}
          </p>

          {/* ── Stats row ── */}
          <div className="flex items-center gap-3 pt-1.5 border-t border-[#F0EBE4] mt-2">
            {/* Views */}
            <StatPill
              count={stats.views}
              icon={
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              }
            />
            {/* Likes */}
            <StatPill
              count={stats.likes}
              icon={
                <svg width="11" height="11" viewBox="0 0 24 24"
                  fill={stats.likes > 0 ? "#A1123F" : "none"}
                  stroke={stats.likes > 0 ? "#A1123F" : "#C4B8B0"} strokeWidth="2"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              }
            />
            {/* Saves */}
            <StatPill
              count={stats.saves}
              icon={
                <svg width="11" height="11" viewBox="0 0 24 24"
                  fill={stats.saves > 0 ? "#B48A5A" : "none"}
                  stroke="#B48A5A" strokeWidth="2"
                >
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
              }
            />
          </div>
        </div>
      </Link>
    </div>
  );
}