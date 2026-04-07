"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useWishlist } from "../hooks/useWishlist";
import { useSearchParams } from "next/navigation";

/* ─────────────────────────────
   CONSTANTS
───────────────────────────── */
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
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[420px] bg-[#F6F3EF] flex flex-col shadow-2xl"
      >
        {/* Close */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-[#2B0A0F]/08">
          <span className="text-[9px] uppercase tracking-[0.35em] opacity-40">Quick View</span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[#2B0A0F]/15 flex items-center justify-center text-sm opacity-50 hover:opacity-100 transition-opacity"
          >
            ✕
          </button>
        </div>

        {/* Image */}
        <div className="relative w-full aspect-[4/5] flex-shrink-0 bg-[#EAE3DB] overflow-hidden">
          <Image
            src={product.image_url || "/final.png"}
            alt={product.title}
            fill
            className="object-cover"
          />
          {/* Wishlist on image */}
          <button
            onClick={() => toggleWishlist(product)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={isWishlisted(product.id) ? "#A1123F" : "none"} stroke="#A1123F" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>

        {/* Info */}
        <div className="flex-1 overflow-y-auto px-7 py-6 space-y-5">
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

          {/* Meta chips */}
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

          {/* Description */}
          {product.description && (
            <p className="text-sm leading-relaxed text-[#2B0A0F]/65">
              {product.description}
            </p>
          )}
        </div>

        {/* CTA */}
        <div className="px-7 py-5 border-t border-[#2B0A0F]/08 flex gap-3">
          <Link href={`/product/${product.id}`} className="flex-1">
            <button className="w-full py-3.5 bg-[#2B0A0F] text-[#F6F3EF] rounded-full text-[11px] uppercase tracking-[0.2em] hover:opacity-80 transition-opacity">
              View Full Listing →
            </button>
          </Link>
          <button
            onClick={() => toggleWishlist(product)}
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
  onQuickView,
  isWishlisted,
  toggleWishlist,
}: {
  product: any;
  isLarge: boolean;
  onQuickView: (p: any) => void;
  isWishlisted: (id: string) => boolean;
  toggleWishlist: (p: any) => void;
}) {
  const [imgHovered, setImgHovered] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className={`group relative flex flex-col ${isLarge ? "col-span-2 row-span-2" : ""}`}
    >
      {/* Image container — NO zoom on hover */}
      <div
        className="relative overflow-hidden rounded-2xl bg-[#EAE3DB] flex-1"
        style={{ minHeight: isLarge ? "420px" : "220px" }}
        onMouseEnter={() => setImgHovered(true)}
        onMouseLeave={() => setImgHovered(false)}
      >
        <Image
          src={product.image_url || "/final.png"}
          alt={product.title}
          fill
          className="object-cover"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/05 to-transparent" />

        {/* Condition badge — top left */}
        {product.condition && (
          <div className="absolute top-3 left-3">
            <span className="text-[8px] uppercase tracking-[0.2em] px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-white">
              {product.condition}
            </span>
          </div>
        )}

        {/* Wishlist — top right, appears on hover */}
        <motion.button
          initial={false}
          animate={{ opacity: imgHovered ? 1 : 0, scale: imgHovered ? 1 : 0.8 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => { e.preventDefault(); toggleWishlist(product); }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill={isWishlisted(product.id) ? "#A1123F" : "none"} stroke="#A1123F" strokeWidth="2.5">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </motion.button>

        {/* Quick view — bottom, appears on hover */}
        <motion.button
          initial={false}
          animate={{ opacity: imgHovered ? 1 : 0, y: imgHovered ? 0 : 8 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => { e.preventDefault(); onQuickView(product); }}
          className="absolute bottom-14 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white/90 backdrop-blur-sm text-[#2B0A0F] text-[9px] uppercase tracking-[0.2em] px-4 py-2 rounded-full shadow-sm hover:bg-white transition-colors"
        >
          Quick View
        </motion.button>

        {/* Product info — always visible at bottom */}
        <Link href={`/product/${product.id}`} className="absolute bottom-0 left-0 right-0 p-4">
          <p className="text-[8px] uppercase tracking-[0.2em] text-white/60 mb-0.5">
            {product.location || "Archive"}
          </p>
          <h3
            className="text-white leading-tight truncate"
            style={{
              fontFamily: "var(--font-playfair)",
              fontSize: isLarge ? "1.15rem" : "0.9rem",
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
        </Link>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────
   SKELETON CARD
───────────────────────────── */
function SkeletonCard({ isLarge }: { isLarge: boolean }) {
  return (
    <div
      className={`rounded-2xl bg-[#EAE3DB] animate-pulse ${isLarge ? "col-span-2 row-span-2" : ""}`}
      style={{ minHeight: isLarge ? "420px" : "220px" }}
    />
  );
}

/* ─────────────────────────────
   BUY CONTENT (uses useSearchParams)
───────────────────────────── */
function BuyContent() {
  const searchParams = useSearchParams();

  const [products, setProducts]         = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [maxPrice, setMaxPrice]         = useState(100000);
  const [sortBy, setSortBy]             = useState("newest");
  const [mood, setMood]                 = useState(searchParams.get("mood") || "all");
  const [search, setSearch]             = useState("");
  const [selectedSizes, setSelectedSizes]       = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [quickViewProduct, setQuickViewProduct] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const { toggleWishlist, isWishlisted } = useWishlist();

  /* ── FETCH ── */
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const { data, error } = await supabase.from("products").select("*");
      if (!error && data) setProducts(data);
      setLoading(false);
    };
    fetchProducts();
  }, []);

  /* ── FILTER + SORT ── */
  const filtered = useMemo(() => {
    let temp = [...products];

    if (search.trim()) {
      const q = search.toLowerCase();
      temp = temp.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.location?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q)
      );
    }

    temp = temp.filter((p) => p.price <= maxPrice);

    if (mood !== "all") temp = temp.filter((p) => p.mood === mood);

    if (selectedSizes.length)
      temp = temp.filter((p) => selectedSizes.includes(p.size));

    if (selectedCategories.length)
      temp = temp.filter((p) => selectedCategories.includes(p.category));

    if (selectedConditions.length)
      temp = temp.filter((p) => selectedConditions.includes(p.condition));

    if (sortBy === "low")    temp.sort((a, b) => a.price - b.price);
    else if (sortBy === "high") temp.sort((a, b) => b.price - a.price);
    else temp.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return temp;
  }, [products, search, maxPrice, mood, selectedSizes, selectedCategories, selectedConditions, sortBy]);

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
    setSearch("");
  };

  const hasActiveFilters =
    mood !== "all" ||
    maxPrice < 100000 ||
    selectedSizes.length > 0 ||
    selectedCategories.length > 0 ||
    selectedConditions.length > 0;

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

      <div className="max-w-[1400px] mx-auto px-5 md:px-8 pt-28 pb-20 flex gap-8">

        {/* ══════════════════════
            SIDEBAR
        ══════════════════════ */}
        <>
          {/* Mobile backdrop */}
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

            {/* Clear all */}
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
          <div className="flex flex-col gap-5 mb-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="uppercase text-[10px] tracking-[0.4em] opacity-40 mb-2">
                  Archive Collection
                </p>
                <h1
                  className="leading-none"
                  style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(2rem,4vw,3rem)" }}
                >
                  Gennie Picks
                  <span className="text-[#B48A5A] ml-2">✦</span>
                </h1>
              </div>

              {/* Right: search + sort + mobile filter toggle */}
              <div className="flex items-center gap-3 flex-wrap justify-end">
                {/* Mobile filter button */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden flex items-center gap-2 border border-[#2B0A0F]/15 rounded-full px-4 py-2 text-[10px] uppercase tracking-[0.15em] hover:bg-[#2B0A0F] hover:text-[#F6F3EF] transition-all"
                >
                  <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                    <path d="M0 1h12M2 5h8M4 9h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Filters {hasActiveFilters && `(${[selectedSizes, selectedCategories, selectedConditions].flat().length + (mood !== "all" ? 1 : 0)})`}
                </button>

                {/* Search */}
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search pieces..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 pr-4 py-2.5 text-xs bg-white/60 border border-[#2B0A0F]/10 rounded-full outline-none focus:border-[#2B0A0F]/30 focus:bg-white transition-all w-[180px] md:w-[220px]"
                  />
                </div>

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2.5 text-xs bg-white/60 border border-[#2B0A0F]/10 rounded-full outline-none focus:border-[#2B0A0F]/30 cursor-pointer"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── ACTIVE FILTER CHIPS + RESULT COUNT ── */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[10px] uppercase tracking-[0.2em] opacity-40">
                {loading ? "Loading..." : `${filtered.length} piece${filtered.length !== 1 ? "s" : ""} found`}
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
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 auto-rows-[220px] md:auto-rows-[260px]"
          >
            <AnimatePresence>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <SkeletonCard key={i} isLarge={i === 0} />
                  ))
                : filtered.map((product, index) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      isLarge={index % 7 === 0}
                      onQuickView={setQuickViewProduct}
                      isWishlisted={isWishlisted}
                      toggleWishlist={toggleWishlist}
                    />
                  ))}
            </AnimatePresence>
          </motion.div>

          {/* ── EMPTY STATE ── */}
          <AnimatePresence>
            {!loading && filtered.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="py-28 flex flex-col items-center gap-4"
              >
                <p
                  className="text-3xl opacity-20"
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
   MAIN PAGE (with Suspense wrapper)
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
