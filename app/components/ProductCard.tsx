"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useWishlist } from "../hooks/useWishlist";
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
function StatPill({ icon, count }: { icon: string; count: number }) {
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

  // ── Fetch counts (views from product_views, likes + saves aggregated) ──
  useEffect(() => {
    const fetchStats = async () => {
      // Like count
      const { count: likeCount } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("product_id", product.id);

      // Save/wishlist count
      const { count: saveCount } = await supabase
        .from("wishlists")
        .select("*", { count: "exact", head: true })
        .eq("product_id", product.id);

      // View count — from products table's view_count column
      // If you don't have this column yet, see note below
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
        () => refetchCounts()
      )
      .on("postgres_changes",
        { event: "*", schema: "public", table: "wishlists", filter: `product_id=eq.${product.id}` },
        () => refetchCounts()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [product.id]);

  const refetchCounts = async () => {
    const { count: likeCount } = await supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("product_id", product.id);

    const { count: saveCount } = await supabase
      .from("wishlists")
      .select("*", { count: "exact", head: true })
      .eq("product_id", product.id);

    setStats(prev => ({
      ...prev,
      likes: likeCount ?? 0,
      saves: saveCount ?? 0,
    }));
  };

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

  return (
    <div className="group relative rounded-2xl border border-[#EEE5DC] bg-white overflow-hidden hover:shadow-xl transition-all duration-300">

      {/* ── Action buttons: Like + Wishlist ── */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">

        {/* Like button */}
        <motion.button
          whileTap={{ scale: 0.75 }}
          whileHover={{ scale: 1.15 }}
          onClick={handleLike}
          className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm border border-[#EEE5DC] flex items-center justify-center shadow-sm"
          title="Like"
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={isLiked(product.id) ? "liked" : "not-liked"}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-sm leading-none"
            >
              {isLiked(product.id) ? "❤️" : "🤍"}
            </motion.span>
          </AnimatePresence>
        </motion.button>

        {/* Wishlist / Save button */}
        <motion.button
          whileTap={{ scale: 0.75 }}
          whileHover={{ scale: 1.15 }}
          onClick={handleWishlist}
          className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm border border-[#EEE5DC] flex items-center justify-center shadow-sm"
          title="Save to wishlist"
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={isWishlisted(product.id) ? "saved" : "not-saved"}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-sm leading-none"
            >
              {isWishlisted(product.id) ? "🔖" : "🏷️"}
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
            <StatPill icon="👁️" count={stats.views} />
            <StatPill icon="🤍" count={stats.likes} />
            <StatPill icon="🔖" count={stats.saves} />
          </div>
        </div>
      </Link>
    </div>
  );
}