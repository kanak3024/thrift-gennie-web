"use client";

import { useEffect, useState, Suspense, useRef, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useWishlist } from "../context/WishlistContext";
import { useSearchParams } from "next/navigation";

/* ─────────────────────────────
   CONSTANTS
───────────────────────────── */
const PAGE_SIZE  = 20;
const CATEGORIES = ["Tops", "Bottoms", "Dresses", "Ethnic", "Accessories"];
const SIZES      = ["XS", "S", "M", "L", "XL", "XXL", "Free Size"];
const CONDITIONS = ["Like New", "Good", "Fair", "Well Loved"];
const MOODS      = [
  { tag: "all",        label: "All Moods",       color: "#2B0A0F" },
  { tag: "y2k",        label: "Y2K It Girl",     color: "#C77DFF" },
  { tag: "oldmoney",   label: "Old Money",       color: "#B48A5A" },
  { tag: "indie",      label: "Indie Archive",   color: "#6B7E60" },
  { tag: "bollywood",  label: "Bollywood Glam",  color: "#C41E3A" },
];
const SORT_OPTIONS = [
  { value: "newest",  label: "Newest First" },
  { value: "low",     label: "Price: Low → High" },
  { value: "high",    label: "Price: High → Low" },
];

/* ─────────────────────────────
   QUICK VIEW DRAWER
───────────────────────────── */
function QuickViewDrawer({
  product,
  onClose,
  isWishlisted,
  toggleWishlist,
}: {
  product: any;
  onClose: () => void;
  isWishlisted: (id: string) => boolean;
  toggleWishlist: (p: any) => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const conditionColor: Record<string, string> = {
    "like new": "#6B7E60",
    "good":     "#B48A5A",
    "fair":     "#A1123F",
    "well loved": "#666",
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full sm:max-w-[420px] bg-[#F6F3EF] flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 sm:px-7 py-5 border-b border-[#2B0A0F]/08">
          <span className="text-[9px] uppercase tracking-[0.35em] opacity-40">Quick View</span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[#2B0A0F]/15 flex items-center justify-center text-sm opacity-50 hover:opacity-100 transition-opacity"
          >
            ✕
          </button>
        </div>

        <div className="relative w-full aspect-[4/5] flex-shrink-0 bg-[#EAE3DB] overflow-hidden">
          <Image
            src={product.image_url || "/final.png"}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 100vw, 420px"
            className="object-cover"
          />
          <button
            onClick={() => toggleWishlist(product.id)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={isWishlisted(product.id) ? "#A1123F" : "none"} stroke="#A1123F" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-6 space-y-5">
          <div>
            <p className="text-[9px] uppercase tracking-[0.3em] opacity-40 mb-1">
              {product.location || "Archive"} · {product.mood || ""}
            </p>
            <h2
              className="text-2xl leading-tight"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              {product.title}
            </h2>
            <p
              className="text-2xl mt-2 text-[#A1123F]"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              ₹{product.price}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {product.size && (
              <span className="text-[10px] uppercase tracking-[0.15em] px-3 py-1.5 rounded-full bg-[#2B0A0F]/06 text-[#2B0A0F]/70">
                Size {product.size}
              </span>
            )}
            {product.condition && (
              <span
                className="text-[10px] uppercase tracking-[0.15em] px-3 py-1.5 rounded-full"
                style={{
                  background: `${conditionColor[product.condition?.toLowerCase()] || "#666"}15`,
                  color: conditionColor[product.condition?.toLowerCase()] || "#666",
                }}
              >
                {product.condition}
              </span>
            )}
            {product.category && (
              <span className="text-[10px] uppercase tracking-[0.15em] px-3 py-1.5 rounded-full bg-[#2B0A0F]/06 text-[#2B0A0F]/70">
                {product.category}
              </span>
            )}
          </div>

          {product.description && (
            <p className="text-sm leading-relaxed text-[#2B0A0F]/65">
              {product.description}
            </p>
          )}
        </div>

        <div className="px-5 sm:px-7 py-5 border-t border-[#2B0A0F]/08 flex gap-3">
          <Link href={`/product/${product.id}`} className="flex-1">
            <button className="w-full py-3.5 bg-[#2B0A0F] text-[#F6F3EF] rounded-full text-[11px] uppercase tracking-[0.2em] hover:opacity-80 transition-opacity">
              View Full Listing →
            </button>
          </Link>
          <button
            onClick={() => toggleWishlist(product.id)}
            className="w-12 h-12 rounded-full border border-[#2B0A0F]/15 flex items-center justify-center hover:border-[#A1123F]/40 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={isWishlisted(product.id) ? "#A1123F" : "none"} stroke="#A1123F" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>
      </motion.div>
    </>
  );
}

/* ─────────────────────────────
   FILTER CHIP
───────────────────────────── */
function ActiveFilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2B0A0F] text-[#F6F3EF] text-[9px] uppercase tracking-[0.15em]"
    >
      {label}
      <button onClick={onRemove} className="opacity-60 hover:opacity-100 leading-none">✕</button>
    </motion.span>
  );
}

/* ─────────────────────────────
   PRODUCT CARD
───────────────────────────── */
function ProductCard({
  product,
  isLarge,
  index,           // ← NEW: used for priority on first image
  onQuickView,
  isWishlisted,
  toggleWishlist,
  isMobile,
}: {
  product: any;
  isLarge: boolean;
  index: number;   // ← NEW
  onQuickView: (p: any) => void;
  isWishlisted: (id: string) => boolean;
  toggleWishlist: (p: any) => void;
  isMobile: boolean;
}) {
  const [imgHovered, setImgHovered] = useState(false);
  const effectiveLarge = isLarge && !isMobile;
  // FIX 3: first 4 cards load eagerly, rest lazy
  const isAboveFold = index < 4;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className={`group relative flex flex-col ${effectiveLarge ? "col-span-2 row-span-2" : ""}`}
      onMouseEnter={() => setImgHovered(true)}
      onMouseLeave={() => setImgHovered(false)}
    >
      <Link
        href={`/product/${product.id}`}
        className="relative overflow-hidden rounded-2xl bg-[#EAE3DB] flex-1 block"
        style={{ minHeight: effectiveLarge ? "420px" : isMobile ? "180px" : "220px" }}
      >
        <Image
          src={product.image_url || "/final.png"}
          alt={product.title}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className="object-cover"
          // FIX 3: priority + eager loading for above-fold images
          priority={isAboveFold}
          loading={isAboveFold ? "eager" : "lazy"}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/05 to-transparent" />
        {product.condition && (
          <div className="absolute top-3 left-3">
            <span className="text-[8px] uppercase tracking-[0.2em] px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-white">
              {product.condition}
            </span>
          </div>
        )}
        {!isMobile && (
          <motion.button
            initial={false}
            animate={{ opacity: imgHovered ? 1 : 0, y: imgHovered ? 0 : 8 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => { e.preventDefault(); onQuickView(product); }}
            className="absolute bottom-14 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white/90 backdrop-blur-sm text-[#2B0A0F] text-[9px] uppercase tracking-[0.2em] px-4 py-2 rounded-full shadow-sm hover:bg-white transition-colors"
          >
            Quick View
          </motion.button>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
          <p className="text-[8px] uppercase tracking-[0.2em] text-white/60 mb-0.5">
            {product.location || "Archive"}
          </p>
          <h3
            className="text-white leading-tight truncate"
            style={{
              fontFamily: "var(--font-playfair)",
              fontSize: effectiveLarge ? "1.15rem" : isMobile ? "0.8rem" : "0.9rem",
            }}
          >
            {product.title}
          </h3>
          <div className="flex items-center justify-between mt-1">
            <p className="text-white/90 text-sm" style={{ fontFamily: "var(--font-playfair)" }}>
              ₹{product.price}
            </p>
            {product.size && (
              <span className="text-[8px] uppercase tracking-[0.15em] text-white/50">
                {product.size}
              </span>
            )}
          </div>
        </div>
      </Link>
      <motion.button
        initial={false}
        animate={{
          opacity: isMobile ? 1 : imgHovered ? 1 : 0,
          scale: isMobile ? 1 : imgHovered ? 1 : 0.8,
        }}
        transition={{ duration: 0.15 }}
        onClick={() => toggleWishlist(product.id)}
        className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center"
      >
        <svg
          width="18" height="18" viewBox="0 0 24 24"
          fill={isWishlisted(product.id) ? "#A1123F" : "none"}
          stroke={isWishlisted(product.id) ? "#A1123F" : "white"}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.4))" }}
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </motion.button>
    </motion.div>
  );
}

/* ─────────────────────────────
   SKELETON CARD
───────────────────────────── */
function SkeletonCard({ isLarge, isMobile }: { isLarge: boolean; isMobile: boolean }) {
  const effectiveLarge = isLarge && !isMobile;
  return (
    <div
      className={`rounded-2xl bg-[#EAE3DB] animate-pulse ${effectiveLarge ? "col-span-2 row-span-2" : ""}`}
      style={{ minHeight: effectiveLarge ? "420px" : isMobile ? "180px" : "220px" }}
    />
  );
}

/* ─────────────────────────────
   BUY CONTENT
───────────────────────────── */
function BuyContent() {
  const searchParams = useSearchParams();

  const [products, setProducts]             = useState<any[]>([]);
  const [loading, setLoading]               = useState(true);
  const [loadingMore, setLoadingMore]       = useState(false);
  const [hasMore, setHasMore]               = useState(true);
  const [page, setPage]                     = useState(0);
  const [maxPrice, setMaxPrice]             = useState(100000);
  const [sortBy, setSortBy]                 = useState("newest");
  const [mood, setMood]                     = useState(searchParams.get("mood") || "all");

  // FIX 4: split input state from debounced search state
  const [searchInput, setSearchInput]       = useState("");
  const [search, setSearch]                 = useState("");

  const [selectedSizes, setSelectedSizes]               = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories]     = useState<string[]>([]);
  const [selectedConditions, setSelectedConditions]     = useState<string[]>([]);
  const [quickViewProduct, setQuickViewProduct]         = useState<any>(null);
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [isMobile, setIsMobile]             = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { toggleWishlist, isWishlisted }    = useWishlist(() => setShowLoginModal(true));
  const loaderRef                           = useRef<HTMLDivElement>(null);

  // FIX 4: debounce search — only update `search` 400ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  /* ── DETECT MOBILE ── */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* ── FIX 1: FETCH WITH SERVER-SIDE FILTERS ── */
  const fetchProducts = useCallback(async (pageNum: number, replace = false) => {
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);

    // Build query with all filters applied on Supabase, not in JS
    let query = supabase
      .from("products")
      .select("id, title, price, image_url, condition, size, category, mood, location, created_at")
      .lte("price", maxPrice)
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    // Apply mood filter server-side
    if (mood !== "all") query = query.eq("mood", mood);

    // Apply size filter server-side
    if (selectedSizes.length) query = query.in("size", selectedSizes);

    // Apply category filter server-side
    if (selectedCategories.length) query = query.in("category", selectedCategories);

    // Apply condition filter server-side
    if (selectedConditions.length) query = query.in("condition", selectedConditions);

    // Apply search server-side
    if (search.trim()) query = query.ilike("title", `%${search.trim()}%`);

    // Apply sort server-side
    if (sortBy === "low")        query = query.order("price", { ascending: true });
    else if (sortBy === "high")  query = query.order("price", { ascending: false });
    else                         query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (!error && data) {
      setProducts(prev => replace ? data : [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    }

    if (pageNum === 0) setLoading(false);
    else setLoadingMore(false);
  }, [maxPrice, mood, selectedSizes, selectedCategories, selectedConditions, search, sortBy]);

  /* ── FIX 1: RESET + REFETCH WHENEVER FILTERS CHANGE ── */
  useEffect(() => {
    setPage(0);
    setProducts([]);
    fetchProducts(0, true);
  }, [fetchProducts]);

  /* ── INFINITE SCROLL OBSERVER ── */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchProducts(nextPage);
        }
      },
      { threshold: 0.1 }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, page, fetchProducts]);

  /* ── TOGGLE HELPERS ── */
  const toggleArr = (arr: string[], val: string, setArr: (a: string[]) => void) => {
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const clearAll = () => {
    setMood("all");
    setMaxPrice(100000);
    setSelectedSizes([]);
    setSelectedCategories([]);
    setSelectedConditions([]);
    setSearchInput("");
    setSearch("");
  };

  const hasActiveFilters =
    mood !== "all" ||
    maxPrice < 100000 ||
    selectedSizes.length > 0 ||
    selectedCategories.length > 0 ||
    selectedConditions.length > 0;

  const activeFilterCount =
    [selectedSizes, selectedCategories, selectedConditions].flat().length +
    (mood !== "all" ? 1 : 0) +
    (maxPrice < 100000 ? 1 : 0);

  /* ── RENDER ── */
  return (
    <main className="min-h-screen bg-[#EFE8E1] text-[#2B0A0F]">

      {/* Quick view drawer */}
      <AnimatePresence>
        {quickViewProduct && (
          <QuickViewDrawer
            product={quickViewProduct}
            onClose={() => setQuickViewProduct(null)}
            isWishlisted={isWishlisted}
            toggleWishlist={toggleWishlist}
          />
        )}
      </AnimatePresence>

      {/* Login modal */}
      <AnimatePresence>
        {showLoginModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={() => setShowLoginModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-[320px] bg-[#1a1520] border border-[#3d3245] text-center px-9 py-9 overflow-hidden"
              style={{ borderRadius: "2px" }}
            >
              <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: "linear-gradient(90deg, #c9a96e 0%, #e8c99a 40%, #c9a96e 100%)" }} />
              <p className="text-[9px] uppercase tracking-[0.25em] text-[#8a7a6a] mb-5">Archive Access</p>
              <h2 className="text-[#e8d8c0] leading-tight mb-4" style={{ fontFamily: "var(--font-playfair)", fontSize: "1.6rem" }}>
                Save the piece,<br />claim the story.
              </h2>
              <div className="w-7 h-px bg-[#c9a96e] opacity-60 mx-auto mb-5" />
              <p className="text-[12px] text-[#8a7a6a] leading-relaxed mb-7">
                Your wishlist lives behind a login.<br />Log in before it&apos;s gone.
              </p>
              <Link href="/login" className="block w-full mb-3">
                <button className="w-full py-3 text-[11px] uppercase tracking-[0.18em] text-[#f0dcd8] transition-opacity hover:opacity-80" style={{ background: "#6b1a2a", borderRadius: "1px" }}>
                  Log in to save
                </button>
              </Link>
              <button
                onClick={() => setShowLoginModal(false)}
                className="w-full py-2.5 text-[10px] uppercase tracking-[0.15em] text-[#6a5e6e] border border-[#3d3245] hover:border-[#8a7a6a] hover:text-[#a09098] transition-all"
                style={{ borderRadius: "1px", background: "transparent" }}
              >
                Keep browsing
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-5 md:px-8 pt-20 sm:pt-28 pb-20 flex gap-6 md:gap-8">

        {/* ══════════════════════
            SIDEBAR
        ══════════════════════ */}
        <>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/30 z-30 md:hidden"
                onClick={() => setSidebarOpen(false)}
              />
            )}
          </AnimatePresence>

          <aside
            className={`
              fixed md:sticky top-0 md:top-28 left-0 bottom-0 z-40 md:z-auto
              w-[280px] md:w-[220px] flex-shrink-0
              bg-[#EFE8E1] md:bg-transparent
              overflow-y-auto md:overflow-visible
              transition-transform duration-300 md:translate-x-0
              ${sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
              md:h-[calc(100vh-7rem)] px-6 md:px-0 py-8 md:py-0
            `}
          >
            <div className="flex items-center justify-between mb-8 md:block">
              <p className="uppercase text-[10px] tracking-[0.4em] opacity-40">Filters</p>
              <button
                onClick={() => setSidebarOpen(false)}
                className="md:hidden opacity-40 hover:opacity-100 text-lg"
              >✕</button>
            </div>

            <AnimatePresence>
              {hasActiveFilters && (
                <motion.button
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  onClick={clearAll}
                  className="w-full mb-6 text-[9px] uppercase tracking-[0.2em] text-[#A1123F] hover:opacity-70 transition-opacity text-left"
                >
                  ✕ Clear all filters
                </motion.button>
              )}
            </AnimatePresence>

            {/* ── PRICE ── */}
            <div className="mb-8">
              <p className="text-[10px] uppercase tracking-[0.3em] opacity-40 mb-4">Max Price</p>
              <input
                type="range" min="500" max="100000" value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-[#2B0A0F]"
              />
              <div className="flex justify-between mt-2">
                <span className="text-[10px] opacity-40">₹500</span>
                <span className="text-[11px] font-medium">₹{maxPrice.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* ── MOOD ── */}
            <div className="mb-8">
              <p className="text-[10px] uppercase tracking-[0.3em] opacity-40 mb-4">Mood</p>
              <div className="flex flex-col gap-2">
                {MOODS.map((m) => (
                  <button
                    key={m.tag}
                    onClick={() => setMood(m.tag)}
                    className={`flex items-center gap-3 text-left transition-all text-sm ${
                      mood === m.tag ? "opacity-100" : "opacity-40 hover:opacity-70"
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-transform"
                      style={{
                        background: m.color,
                        transform: mood === m.tag ? "scale(1.3)" : "scale(1)",
                      }}
                    />
                    <span className={mood === m.tag ? "font-medium" : ""}>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── CATEGORY ── */}
            <div className="mb-8">
              <p className="text-[10px] uppercase tracking-[0.3em] opacity-40 mb-4">Category</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => toggleArr(selectedCategories, cat, setSelectedCategories)}
                    className={`text-[10px] uppercase tracking-[0.12em] px-3 py-1.5 rounded-full border transition-all ${
                      selectedCategories.includes(cat)
                        ? "bg-[#2B0A0F] text-[#F6F3EF] border-[#2B0A0F]"
                        : "border-[#2B0A0F]/15 text-[#2B0A0F]/60 hover:border-[#2B0A0F]/40"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* ── SIZE ── */}
            <div className="mb-8">
              <p className="text-[10px] uppercase tracking-[0.3em] opacity-40 mb-4">Size</p>
              <div className="flex flex-wrap gap-2">
                {SIZES.map((sz) => (
                  <button
                    key={sz}
                    onClick={() => toggleArr(selectedSizes, sz, setSelectedSizes)}
                    className={`w-10 h-10 text-[10px] rounded-full border transition-all ${
                      sz === "Free Size" ? "w-auto px-3" : ""
                    } ${
                      selectedSizes.includes(sz)
                        ? "bg-[#2B0A0F] text-[#F6F3EF] border-[#2B0A0F]"
                        : "border-[#2B0A0F]/15 text-[#2B0A0F]/60 hover:border-[#2B0A0F]/40"
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* ── CONDITION ── */}
            <div className="mb-8">
              <p className="text-[10px] uppercase tracking-[0.3em] opacity-40 mb-4">Condition</p>
              <div className="flex flex-col gap-2">
                {CONDITIONS.map((cond) => (
                  <button
                    key={cond}
                    onClick={() => toggleArr(selectedConditions, cond, setSelectedConditions)}
                    className={`flex items-center gap-2.5 text-sm text-left transition-all ${
                      selectedConditions.includes(cond) ? "opacity-100" : "opacity-40 hover:opacity-70"
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-sm border flex-shrink-0 transition-all ${
                      selectedConditions.includes(cond)
                        ? "bg-[#2B0A0F] border-[#2B0A0F]"
                        : "border-[#2B0A0F]/30"
                    }`} />
                    {cond}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </>

        {/* ══════════════════════
            MAIN CONTENT
        ══════════════════════ */}
        <div className="flex-1 min-w-0">

          {/* ── PAGE HEADER ── */}
          <div className="flex flex-col gap-4 sm:gap-5 mb-6 sm:mb-8">

            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="uppercase text-[10px] tracking-[0.4em] opacity-40 mb-1 sm:mb-2">
                  Archive Collection
                </p>
                <h1
                  className="leading-none"
                  style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(1.6rem,4vw,3rem)" }}
                >
                  Gennie Picks
                  <span className="text-[#B48A5A] ml-2">✦</span>
                </h1>
              </div>

              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden flex-shrink-0 mt-1 flex items-center gap-2 border border-[#2B0A0F]/15 rounded-full px-3 py-2 text-[10px] uppercase tracking-[0.15em] hover:bg-[#2B0A0F] hover:text-[#F6F3EF] transition-all"
              >
                <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                  <path d="M0 1h12M2 5h8M4 9h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Filters {hasActiveFilters && `(${activeFilterCount})`}
              </button>
            </div>

            {/* Search + Sort row */}
            <div className="flex items-center gap-2 sm:gap-3 w-full md:justify-end">
              <div className="relative flex-1 md:flex-none">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {/* FIX 4: onChange updates searchInput (debounced → search) */}
                <input
                  type="text"
                  placeholder="Search pieces..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full md:w-[220px] pl-9 pr-4 py-2.5 text-xs bg-white/60 border border-[#2B0A0F]/10 rounded-full outline-none focus:border-[#2B0A0F]/30 focus:bg-white transition-all"
                />
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-shrink-0 px-3 sm:px-4 py-2.5 text-xs bg-white/60 border border-[#2B0A0F]/10 rounded-full outline-none focus:border-[#2B0A0F]/30 cursor-pointer"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Active filter chips + result count */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <span className="text-[10px] uppercase tracking-[0.2em] opacity-40">
                {loading ? "Loading..." : `${products.length} piece${products.length !== 1 ? "s" : ""} found`}
              </span>

              <AnimatePresence>
                {mood !== "all" && (
                  <ActiveFilterChip
                    key="mood"
                    label={MOODS.find((m) => m.tag === mood)?.label || mood}
                    onRemove={() => setMood("all")}
                  />
                )}
                {maxPrice < 100000 && (
                  <ActiveFilterChip
                    key="price"
                    label={`Under ₹${maxPrice.toLocaleString("en-IN")}`}
                    onRemove={() => setMaxPrice(100000)}
                  />
                )}
                {selectedCategories.map((cat) => (
                  <ActiveFilterChip
                    key={cat}
                    label={cat}
                    onRemove={() => setSelectedCategories((prev) => prev.filter((c) => c !== cat))}
                  />
                ))}
                {selectedSizes.map((sz) => (
                  <ActiveFilterChip
                    key={sz}
                    label={`Size ${sz}`}
                    onRemove={() => setSelectedSizes((prev) => prev.filter((s) => s !== sz))}
                  />
                ))}
                {selectedConditions.map((cond) => (
                  <ActiveFilterChip
                    key={cond}
                    label={cond}
                    onRemove={() => setSelectedConditions((prev) => prev.filter((c) => c !== cond))}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* ── PRODUCT GRID ── */}
          <motion.div
            layout
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4 auto-rows-[180px] sm:auto-rows-[220px] md:auto-rows-[260px]"
          >
            <AnimatePresence>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <SkeletonCard key={i} isLarge={i === 0} isMobile={isMobile} />
                  ))
                : products.map((product, index) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      isLarge={index % 7 === 0}
                      index={index}        // ← FIX 3: pass index for priority
                      onQuickView={setQuickViewProduct}
                      isWishlisted={isWishlisted}
                      toggleWishlist={toggleWishlist}
                      isMobile={isMobile}
                    />
                  ))}
            </AnimatePresence>
          </motion.div>

          {/* ── INFINITE SCROLL TRIGGER ── */}
          {!loading && (
            <div ref={loaderRef} className="col-span-full flex justify-center py-10">
              {loadingMore && (
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#2B0A0F]/30 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#2B0A0F]/30 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#2B0A0F]/30 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              )}
              {!hasMore && products.length > 0 && (
                <p className="text-[10px] uppercase tracking-[0.3em] opacity-30">
                  You&apos;ve seen it all ✦
                </p>
              )}
            </div>
          )}

          {/* ── EMPTY STATE ── */}
          <AnimatePresence>
            {!loading && products.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="py-20 sm:py-28 flex flex-col items-center gap-4"
              >
                <p
                  className="text-2xl sm:text-3xl opacity-20"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  Nothing found.
                </p>
                <p className="text-[10px] uppercase tracking-[0.3em] opacity-30">
                  Try adjusting your filters
                </p>
                <button
                  onClick={clearAll}
                  className="mt-2 px-6 py-3 border border-[#2B0A0F]/15 rounded-full text-[10px] uppercase tracking-[0.2em] hover:bg-[#2B0A0F] hover:text-[#F6F3EF] transition-all"
                >
                  Clear All Filters
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}

/* ─────────────────────────────
   MAIN PAGE
───────────────────────────── */
export default function BuyPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#EFE8E1] flex items-center justify-center">
        <p className="text-[10px] uppercase tracking-[0.4em] opacity-40">Loading...</p>
      </main>
    }>
      <BuyContent />
    </Suspense>
  );
}