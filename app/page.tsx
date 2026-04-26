"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import Navbar from "./components/Navbar";
import { supabase } from "../lib/supabase";

/* =========================
   FONT SETUP — add to layout.tsx
   ─────────────────────────────
   import { Cormorant_Garamond, DM_Sans } from "next/font/google";

   const cormorant = Cormorant_Garamond({
     subsets: ["latin"],
     weight: ["300", "400", "500", "600", "700"],
     style: ["normal", "italic"],
     variable: "--font-cormorant",
   });
   const dmSans = DM_Sans({
     subsets: ["latin"],
     variable: "--font-dm",
   });

   Add to <html>: className={`${cormorant.variable} ${dmSans.variable}`}
   ─────────────────────────────
   Color changes from this file:
   - var(--font-playfair) → var(--font-cormorant)
   - var(--font-inter)    → var(--font-dm)
   - Ticker dot: #A1123F  → #C9901A  (gold)
   - Countdown pill:       maroon  → gold (#C9901A)
========================= */

/* =========================
   WEEK CALCULATION
========================= */
function getWeekNumber() {
  const start = new Date("2025-01-01");
  const now = new Date();
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 7)) + 1;
}

/* =========================
   COUNTDOWN
========================= */
function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();
      if (diff <= 0) { setTimeLeft("New Drop Live"); return; }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      setTimeLeft(`${days}d ${hours}h`);
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);
  return timeLeft;
}

/* =========================
   ANIMATED COUNTER
========================= */
function useCountUp(target: number, duration = 1400) {
  const [val, setVal] = useState(0);
  const startedRef = useRef(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true;
          const start = performance.now();
          const step = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setVal(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { val, ref };
}

/* =========================
   MOOD CONFIG
========================= */
const MOODS = [
  {
    label: "Y2K",
    title: "Y2K It Girl",
    tag: "y2k",
    gennie: "/y2k.png",
    bg: "linear-gradient(160deg,#EAE3DB 0%,#D4C5B0 100%)",
  },
  {
    label: "Old Money",
    title: "Old Money",
    tag: "oldmoney",
    gennie: "/oldmoney.png",
    bg: "linear-gradient(160deg,#D4C09A 0%,#A8854A 100%)",
  },
  {
    label: "Indie",
    title: "Indie Archive",
    tag: "indie",
    gennie: "/streetstyle.png",
    bg: "linear-gradient(160deg,#B5C4A8 0%,#6B7E60 100%)",
  },
  {
    label: "Bollywood",
    title: "Bollywood Glam",
    tag: "bollywood",
    gennie: "/night.png",
    bg: "linear-gradient(160deg,#E8A08A 0%,#B84028 100%)",
  },
  {
    label: "90s",
    title: "90s Minimal",
    tag: "90s",
    gennie: "/y2k.png",
    bg: "linear-gradient(160deg,#AECDCE 0%,#5A8D90 100%)",
  },
];

const MOOD_GRID = [
  { title: "Y2K It Girl",    tag: "y2k",       sub: "Trend",     cls: "from-[#F7C5D5] via-[#DBA8E8] to-[#B48AE0]", mascot: "/y2k.png" },
  { title: "Old Money",      tag: "oldmoney",  sub: "Aesthetic", cls: "from-[#E8D5B0] via-[#C9A96E] to-[#8B6914]", mascot: "/oldmoney.png" },
  { title: "Indie Archive",  tag: "indie",     sub: "Vibe",      cls: "from-[#C8D5B8] via-[#8FA87A] to-[#4A6240]", mascot: "/streetstyle.png" },
  { title: "Bollywood Glam", tag: "bollywood", sub: "Statement", cls: "from-[#F5C0A0] via-[#E8804A] to-[#B84028]", mascot: "/night.png" },
  { title: "90s Minimal",    tag: "90s",       sub: "Classic",   cls: "from-[#C5D8E8] via-[#7AAFC8] to-[#3A6E8A]", mascot: "/y2k.png" },
];

const TICKER_ITEMS = [
  "New Drop Every Sunday",
  "Mumbai · Pune · Delhi · Bangalore · Jaipur",
  "Gennie Verified — Pieces Curated with Care",
  "Buy Less · Choose Better · Wear it Like It's Yours",
  "Free Listing for Founding Sellers",
];

const CAROUSEL_INTERVAL = 3500;

/* =========================
   AUTO-CYCLING CAROUSEL HOOK
   — resets timer when user manually picks a mood
========================= */
function useCarousel(length: number) {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = (fromIdx: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setIdx((prev) => (prev + 1) % length);
    }, CAROUSEL_INTERVAL);
  };

  useEffect(() => {
    startTimer(0);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const jumpTo = (i: number) => {
    setIdx(i);
    startTimer(i);
  };

  return { idx, jumpTo };
}

/* =========================
   BADGE LOGIC
========================= */
function getProductBadge(item: any): { label: string; cls: string } | null {
  const createdAt = new Date(item.created_at);
  const ageHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  if (ageHours < 24) return { label: "Just In", cls: "bg-white text-black" };
  if (item.quantity === 1 || item.stock === 1) return { label: "Almost Gone", cls: "bg-[#A1123F] text-white" };
  if (item.is_rare) return { label: "Rare Find", cls: "bg-[#C9901A] text-white" };
  return null;
}

/* =========================
   SEARCH OVERLAY
========================= */
function SearchOverlay({
  open, onClose, trendingSearches,
}: {
  open: boolean; onClose: () => void; trendingSearches: string[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const hints = trendingSearches.length > 0
    ? trendingSearches
    : ["Y2K tops", "lehenga under ₹2000", "old money blazer", "vintage saree", "size S Mumbai"];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[999] bg-[#F6F3EF]/95 backdrop-blur-xl flex items-start justify-center pt-24 px-5"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <div className="w-full max-w-[560px]">
            <div className="flex items-center gap-4 border-b border-[#2B0A0F]/20 pb-3">
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none" className="opacity-40 flex-shrink-0">
                <circle cx="6.5" cy="6.5" r="5" stroke="#2B0A0F" strokeWidth="1.5" />
                <path d="M10.5 10.5L14 14" stroke="#2B0A0F" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                placeholder="Search the archive..."
                className="flex-1 bg-transparent border-none outline-none text-[#2B0A0F] placeholder:text-[#2B0A0F]/30"
                style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(1.2rem,4vw,2rem)", fontStyle: "italic" }}
              />
              <button onClick={onClose} className="text-[#2B0A0F]/40 hover:text-[#2B0A0F] transition-colors text-xl leading-none">✕</button>
            </div>
            <p className="mt-5 text-[9px] tracking-[0.25em] uppercase opacity-35 mb-3" style={{ fontFamily: "var(--font-dm)" }}>
              Trending this week
            </p>
            <div className="flex flex-wrap gap-2">
              {hints.map((hint) => (
                <button
                  key={hint}
                  className="bg-[#2B0A0F]/07 hover:bg-[#2B0A0F] hover:text-[#F6F3EF] text-[#2B0A0F] transition-all rounded-full px-4 py-2 text-xs tracking-wide border border-[#2B0A0F]/10"
                  style={{ fontFamily: "var(--font-dm)" }}
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* =========================
   LIVE STATS
========================= */
function useLiveStats() {
  const [stats, setStats] = useState({ pieces: 0, avgPrice: 0, cities: 0 });
  useEffect(() => {
    async function fetchStats() {
      const [{ count: pieces }, { data: priceData }] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("products").select("price"),
      ]);
      const prices = (priceData ?? []).map((p: any) => p.price).filter(Boolean);
      const avgPrice = prices.length
        ? Math.round(prices.reduce((a: number, b: number) => a + b, 0) / prices.length)
        : 0;
      const { data: locationData } = await supabase.from("products").select("location");
      const cities = new Set((locationData ?? []).map((p: any) => p.location).filter(Boolean)).size;
      setStats({ pieces: pieces ?? 0, avgPrice, cities });
    }
    fetchStats();
  }, []);
  return stats;
}

/* =========================
   MOOD PIECE PREVIEWS
========================= */
function useMoodPreviews(tag: string) {
  const [pieces, setPieces] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const cache = useRef<Record<string, { pieces: any[]; count: number }>>({});

  useEffect(() => {
    if (cache.current[tag]) {
      setPieces(cache.current[tag].pieces);
      setCount(cache.current[tag].count);
      return;
    }
    async function doFetch() {
      const [{ data }, { count: total }] = await Promise.all([
        supabase.from("products").select("id, image_url, title, price").eq("mood_tag", tag).order("created_at", { ascending: false }).limit(3),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("mood_tag", tag),
      ]);
      const result = { pieces: data ?? [], count: total ?? 0 };
      cache.current[tag] = result;
      setPieces(result.pieces);
      setCount(result.count);
    }
    doFetch();
  }, [tag]);

  return { pieces, count };
}

/* =========================
   MOOD GRID ITEM
========================= */
 function MoodGridItem({ mood, index }: { mood: typeof MOOD_GRID[0]; index: number }) {
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function fetch() {
      const [{ data }, { count: total }] = await Promise.all([
        supabase
          .from("products")
          .select("image_url")
          .eq("mood", mood.tag)
          .eq("status", "available")
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("mood", mood.tag)
          .eq("status", "available"),
      ]);
      if (data?.[0]?.image_url) setBgImage(data[0].image_url);
      setCount(total ?? 0);
    }
    fetch();
  }, [mood.tag]);

  const isWide = index === 4;

  return (
    <Link
      href={`/buy?mood=${mood.tag}`}
      className={`group relative overflow-hidden rounded-[20px] cursor-pointer ${
        isWide ? "col-span-2 md:col-span-2 aspect-[2/1] md:aspect-[3/1]" : "aspect-[3/4]"
      }`}
    >
      {/* Background — real image or gradient */}
      {bgImage ? (
        <div className="absolute inset-0">
          <Image
            src={bgImage}
            alt={mood.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
        </div>
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${mood.cls} group-hover:scale-105 transition-transform duration-700`}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        </div>
      )}

      {/* Piece count badge */}
      <div className="absolute top-3 left-3 z-20">
        <span
          className="text-[9px] uppercase tracking-[0.2em] px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-white border border-white/20"
          style={{ fontFamily: "var(--font-dm)" }}
        >
          {count > 0 ? `${count} pieces` : "Coming soon"}
        </span>
      </div>

      {/* Mascot — positioned differently for wide card */}
      {mood.mascot && (
        <div className={`absolute z-10 pointer-events-none ${
          isWide
            ? "right-8 bottom-0 h-[90%] w-auto"
            : "right-0 bottom-0 h-[65%] w-auto"
        }`}>
          <img
            src={mood.mascot}
            alt=""
            className="h-full w-auto object-contain group-hover:scale-105 transition-transform duration-500 drop-shadow-2xl"
          />
        </div>
      )}

      {/* Text */}
      <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
        <p
          className="text-[8px] uppercase tracking-[0.3em] text-white/60 mb-1"
          style={{ fontFamily: "var(--font-dm)" }}
        >
          {mood.sub}
        </p>
        <h3
          className={`text-white leading-tight ${isWide ? "text-2xl md:text-3xl" : "text-lg"}`}
          style={{ fontFamily: "var(--font-cormorant)", fontWeight: 500 }}
        >
          {mood.title}
        </h3>
        <span
          className="inline-block mt-2 text-[9px] uppercase tracking-[0.2em] text-white/50 group-hover:text-white/90 transition-colors"
          style={{ fontFamily: "var(--font-dm)" }}
        >
          Shop now →
        </span>
      </div>
    </Link>
  );
}
/* =========================
   STAT CARD
========================= */
function StatCard({ num, label, prefix = "", suffix = "" }: { num: number; label: string; prefix?: string; suffix?: string }) {
  const { val, ref } = useCountUp(num);
  return (
    <div ref={ref}>
      <div style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(1.4rem,3vw,1.8rem)", fontWeight: 500 }}>
        {prefix}{val.toLocaleString("en-IN")}{suffix}
      </div>
      <div className="text-[9px] md:text-[10px] tracking-[0.18em] uppercase opacity-40 mt-1" style={{ fontFamily: "var(--font-dm)" }}>{label}</div>
    </div>
  );
}

/* =========================
   MOOD HERO CARD
========================= */
function MoodHeroCard({ mood }: { mood: typeof MOODS[0] }) {
  const { pieces, count } = useMoodPreviews(mood.tag);
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={mood.tag}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3 }}
        className="absolute bottom-8 left-8 z-30 bg-white/75 backdrop-blur-md rounded-2xl px-5 py-4 border border-[#2B0A0F]/08"
      >
        <p className="text-[9px] tracking-[0.3em] uppercase opacity-50" style={{ fontFamily: "var(--font-dm)" }}>Current Mood</p>
        <p className="mt-0.5" style={{ fontFamily: "var(--font-cormorant)", fontWeight: 500, fontSize: "1.25rem" }}>
          {mood.title}
        </p>
        {count > 0 && (
          <p className="text-[10px] opacity-40 mt-0.5" style={{ fontFamily: "var(--font-dm)" }}>{count} pieces available</p>
        )}
        {pieces.length > 0 && (
          <div className="flex gap-1.5 mt-2">
            {pieces.slice(0, 3).map((p) => (
              <div key={p.id} className="w-8 h-10 rounded-md overflow-hidden border border-[#2B0A0F]/10">
                <Image src={p.image_url} alt={p.title} width={32} height={40} className="object-cover w-full h-full" />
              </div>
            ))}
          </div>
        )}
        <Link href={`/buy?mood=${mood.tag}`}>
          <span className="text-[10px] tracking-[0.15em] uppercase hover:opacity-70 transition-opacity mt-2 inline-block" style={{ color: "#C9901A", fontFamily: "var(--font-dm)" }}>
            Shop this mood →
          </span>
        </Link>
      </motion.div>
    </AnimatePresence>
  );
}

/* =========================
   CAROUSEL PROGRESS DOTS
========================= */
function CarouselDots({ total, active, onSelect }: { total: number; active: number; onSelect: (i: number) => void }) {
  return (
    <div className="flex gap-1.5 items-center">
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          aria-label={`Go to mood ${i + 1}`}
          className="transition-all duration-300"
          style={{
            width: i === active ? "20px" : "6px",
            height: "6px",
            borderRadius: "999px",
            background: i === active ? "#C9901A" : "rgba(43,10,15,0.2)",
          }}
        />
      ))}
    </div>
  );
}

/* =========================
   EMAIL CAPTURE
========================= */
function EmailCapture() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSubmit() {
    if (!email || !email.includes("@")) return;
    setStatus("loading");
    const { error } = await supabase.from("email_subscribers").insert({ email });
    setStatus(error ? "error" : "done");
  }

  if (status === "done") {
    return <p className="text-xs tracking-wide opacity-60" style={{ fontFamily: "var(--font-dm)" }}>✦ You're on the list. See you Sunday.</p>;
  }

  return (
    <div className="flex gap-2 items-center">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        className="bg-white/08 border border-[#F6F3EF]/15 rounded-full px-4 py-2.5 text-xs text-[#F6F3EF] placeholder:text-[#F6F3EF]/30 outline-none focus:border-[#F6F3EF]/30 transition-colors w-52"
        style={{ fontFamily: "var(--font-dm)" }}
      />
      <button
        onClick={handleSubmit}
        disabled={status === "loading"}
        className="px-5 py-2.5 bg-[#F6F3EF] text-[#1A060B] rounded-full text-xs tracking-[0.15em] uppercase hover:opacity-85 transition-all disabled:opacity-50"
        style={{ fontFamily: "var(--font-dm)" }}
      >
        {status === "loading" ? "..." : "Join"}
      </button>
      {status === "error" && <span className="text-[10px] text-[#E8859C]" style={{ fontFamily: "var(--font-dm)" }}>Try again</span>}
    </div>
  );
}

/* =========================
   MAIN PAGE
========================= */
export default function HomePage() {
  const week = getWeekNumber();
  const nextSunday = new Date();
  nextSunday.setDate(nextSunday.getDate() + ((7 - nextSunday.getDay()) % 7 || 7));
  const countdown = useCountdown(nextSunday);

  const [products, setProducts] = useState<any[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [trendingSearches, setTrendingSearches] = useState<string[]>([]);
  const liveStats = useLiveStats();

  // Carousel drives the active mood. jumpTo() resets the auto-cycle timer.
  const { idx: activeMoodIdx, jumpTo } = useCarousel(MOODS.length);
  const activeMood = MOODS[activeMoodIdx];
  const secondaryIdx = (activeMoodIdx + MOODS.length - 1) % MOODS.length;

  useEffect(() => {
    supabase.from("products").select("*").order("created_at", { ascending: false }).limit(8)
      .then(({ data, error }) => { if (!error && data) setProducts(data); });
  }, []);

  useEffect(() => {
    supabase.from("trending_searches").select("query").order("count", { ascending: false }).limit(8)
      .then(({ data }) => { if (data?.length) setTrendingSearches(data.map((d: any) => d.query)); });
  }, []);

  useEffect(() => {
    document.body.style.overflow = searchOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [searchOpen]);

  return (
    <main className="relative overflow-hidden bg-[#F6F3EF] text-[#2B0A0F]">

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} trendingSearches={trendingSearches} />
      <Navbar />

      {/* ══════════════════════════
          HERO
      ══════════════════════════ */}
      <section className="relative min-h-screen flex items-center pt-20 md:pt-24">

        <div
          className="absolute left-6 top-1/2 -translate-y-1/2 rotate-[-90deg] tracking-[0.4em] text-xs opacity-25 hidden lg:block"
          style={{ fontFamily: "var(--font-dm)" }}
        >
          ARCHIVE NO. 001 · EST. 2025
        </div>

        <div className="max-w-7xl mx-auto px-5 md:px-6 w-full grid grid-cols-1 md:grid-cols-2 items-center gap-8 py-10 md:py-0">

          {/* LEFT */}
          <div className="relative z-10">

            {/* Live pill */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex items-center gap-3 mb-6">
              <span className="relative flex h-[7px] w-[7px]">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A1123F] opacity-60" />
                <span className="relative inline-flex rounded-full h-[7px] w-[7px] bg-[#A1123F]" />
              </span>
              <span className="text-[10px] tracking-[0.3em] uppercase opacity-50" style={{ fontFamily: "var(--font-dm)" }}>
                Live archive · {liveStats.pieces > 0 ? `${liveStats.pieces} pieces` : "247 pieces this week"}
              </span>
            </motion.div>

            {/* Headline — each line staggers in with blur clear */}
            <h1 className="leading-[0.88] tracking-tight" style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(3.5rem,10vw,7.5rem)" }}>
              {[
                { text: "Thrift it.", style: {}, delay: 0.15 },
                { text: "Love it.", style: { color: "#A1123F", fontStyle: "italic" as const }, delay: 0.27 },
                { text: "Gennie it.", style: { fontWeight: 500 }, delay: 0.39 },
              ].map(({ text, style, delay }) => (
                <motion.span
                  key={text}
                  className="block"
                  style={style}
                  initial={{ opacity: 0, y: 30, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                >
                  {text}
                </motion.span>
              ))}
            </h1>

            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.52, duration: 0.6 }}
              className="mt-7 md:mt-10 space-y-2 md:space-y-3"
              style={{ fontFamily: "var(--font-dm)" }}
            >
              <p className="text-base md:text-lg">This isn't thrift.</p>
              <p className="italic text-base md:text-lg" style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.2rem" }}>It's a fashion archive.</p>
              <p className="text-[#2B0A0F]/60 leading-relaxed text-sm md:text-base max-w-sm">
                Pre-loved pieces with history, taste, and attitude —
                curated by people who know an outfit is never just an outfit.
              </p>
              <p className="uppercase tracking-[0.3em] text-[10px] pt-1 opacity-35">
                Buy less · Choose better · Wear it like it's yours
              </p>
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.62 }}
              className="mt-7 md:mt-10 flex flex-wrap items-center gap-4"
            >
              <Link href="/buy">
                <button
                  className="px-6 py-3.5 md:px-7 md:py-4 bg-[#2B0A0F] text-white rounded-full text-xs tracking-[0.18em] uppercase hover:opacity-80 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ fontFamily: "var(--font-dm)" }}
                >
                  Enter the Archive →
                </button>
              </Link>
              <Link href="/sell">
                <span
                  className="text-xs tracking-[0.15em] uppercase opacity-45 hover:opacity-100 transition-opacity underline underline-offset-4 decoration-[#2B0A0F]/20"
                  style={{ fontFamily: "var(--font-dm)" }}
                >
                  Submit a piece →
                </span>
              </Link>
            </motion.div>

            {/* Live stats */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.76 }}
              className="mt-8 md:mt-12 flex gap-6 md:gap-8 border-t border-[#2B0A0F]/08 pt-6 md:pt-8"
            >
              <StatCard num={liveStats.pieces || 2400} label="Pieces Listed" suffix="+" />
              <StatCard num={liveStats.avgPrice || 340} label="Avg Price" prefix="₹" />
              <StatCard num={liveStats.cities || 5} label="Cities" suffix=" Cities" />
            </motion.div>
          </div>

          {/* RIGHT — CAROUSEL (desktop) */}
          <div className="relative h-[620px] hidden md:block">

            {/* Ambient glow shifts with mood */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`glow-${activeMood.tag}`}
                className="absolute w-[440px] h-[440px] rounded-full top-[15%] left-[10%]"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.18, 0.28, 0.18] }}
                exit={{ opacity: 0, transition: { duration: 0.4 }  }}
                transition={{ opacity: { duration: 4, repeat: Infinity } }}
                style={{ background: activeMood.bg, filter: "blur(70px)" }}
              />
            </AnimatePresence>

            {/* Shop by mood label */}
            <div className="absolute top-[20px] left-[40px] z-30">
              <p className="uppercase tracking-[0.3em] text-xs text-[#2B0A0F]/55" style={{ fontFamily: "var(--font-dm)" }}>
                Shop by your mood
              </p>
            </div>

            {/* Mood chips + carousel dots */}
            <div className="absolute top-12 right-0 flex flex-col gap-2 z-40">
              {MOODS.map((mood, i) => (
                <button
                  key={mood.tag}
                  onClick={() => jumpTo(i)}
                  className="rounded-full px-4 py-2 text-[11px] tracking-[0.1em] transition-all border whitespace-nowrap text-left"
                  style={{
                    fontFamily: "var(--font-dm)",
                    background: activeMoodIdx === i ? "#2B0A0F" : "white",
                    color: activeMoodIdx === i ? "#F6F3EF" : "#2B0A0F",
                    borderColor: activeMoodIdx === i ? "#2B0A0F" : "rgba(43,10,15,0.1)",
                    fontWeight: activeMoodIdx === i ? 500 : 400,
                  }}
                >
                  {activeMoodIdx === i ? "✦ " : ""}{mood.label}
                </button>
              ))}
              <div className="mt-2 pl-3">
                <CarouselDots total={MOODS.length} active={activeMoodIdx} onSelect={jumpTo} />
              </div>
            </div>

            {/* PRIMARY GENNIE — driven by carousel */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`primary-${activeMood.tag}`}
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -50, opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="absolute bottom-[-20px] right-[20px] w-[390px] z-20"
              >
                <motion.img
                  src={activeMood.gennie}
                  alt={activeMood.title}
                  animate={{ y: [0, -12, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="w-full"
                />
              </motion.div>
            </AnimatePresence>

            {/* SECONDARY GENNIE — previous mood */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`secondary-${MOODS[secondaryIdx].tag}`}
                initial={{ x: -40, opacity: 0 }}
                animate={{ x: 0, opacity: 0.6 }}
                exit={{ x: 40, opacity: 0 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
                className="absolute top-[40px] left-[0px] w-[270px] z-10"
              >
                <motion.img
                  src={MOODS[secondaryIdx].gennie}
                  alt={MOODS[secondaryIdx].title}
                  animate={{ y: [0, 10, 0] }}
                  transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                  className="w-full scale-90"
                />
              </motion.div>
            </AnimatePresence>

            {/* Mood card */}
            <MoodHeroCard mood={activeMood} />
          </div>

          {/* MOBILE — active Gennie + chips */}
          <div className="md:hidden flex flex-col gap-4">
            <div className="relative h-64 flex justify-center">
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeMood.tag}
                  src={activeMood.gennie}
                  alt={activeMood.title}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.35 }}
                  className="h-full object-contain"
                />
              </AnimatePresence>
            </div>
            <div className="flex gap-2 flex-wrap">
              {MOODS.map((mood, i) => (
                <button
                  key={mood.tag}
                  onClick={() => jumpTo(i)}
                  className="rounded-full px-4 py-2 text-[11px] tracking-[0.1em] border transition-all"
                  style={{
                    fontFamily: "var(--font-dm)",
                    background: activeMoodIdx === i ? "#2B0A0F" : "white",
                    color: activeMoodIdx === i ? "#F6F3EF" : "#2B0A0F",
                    borderColor: activeMoodIdx === i ? "#2B0A0F" : "rgba(43,10,15,0.15)",
                  }}
                >
                  {mood.label}
                </button>
              ))}
            </div>
            <CarouselDots total={MOODS.length} active={activeMoodIdx} onSelect={jumpTo} />
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex-col items-center gap-2 opacity-20 hidden md:flex">
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="flex flex-col items-center gap-1">
            <span className="text-[9px] tracking-[0.3em] uppercase" style={{ fontFamily: "var(--font-dm)" }}>Scroll</span>
            <div className="w-px h-8 bg-[#2B0A0F] relative">
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-[6px] border-l-transparent border-r-transparent border-t-[#2B0A0F]" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════
          TICKER — gold dot
      ══════════════════════════ */}
      <div className="bg-[#1A060B] text-[#F6F3EF] py-3 overflow-hidden">
        <div className="flex whitespace-nowrap" style={{ animation: "ticker 24s linear infinite" }}>
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-4 px-8 text-[10px] tracking-[0.3em] uppercase opacity-60" style={{ fontFamily: "var(--font-dm)" }}>
              <span className="w-1 h-1 rounded-full bg-[#C9901A] inline-block flex-shrink-0" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ══════════════════════════
          MOOD GRID
      ══════════════════════════ */}
      <section className="bg-[#F6F3EF] text-[#2B0A0F] py-16 md:py-28">
        <div className="max-w-7xl mx-auto px-5 md:px-6">
          <div className="flex justify-between items-end mb-8 md:mb-12">
            <div>
              <p className="uppercase tracking-[0.4em] text-[10px] opacity-40 mb-2 md:mb-3" style={{ fontFamily: "var(--font-dm)" }}>Browse by Mood</p>
              <h2 className="text-3xl md:text-5xl" style={{ fontFamily: "var(--font-cormorant)", fontWeight: 500 }}>
                Choose Your Aesthetic
              </h2>
            </div>
            <Link href="/buy" className="text-[10px] tracking-[0.2em] uppercase opacity-40 hover:opacity-100 transition-opacity whitespace-nowrap ml-4" style={{ fontFamily: "var(--font-dm)" }}>
              View All →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
             {MOOD_GRID.map((mood, i) => <MoodGridItem key={mood.tag} mood={mood} index={i} />)}
          </div>
        </div>
      </section>

      {/* ══════════════════════════
          WEEKLY ARCHIVE DROP
      ══════════════════════════ */}
      <section className="bg-[#1A060B] text-[#F6F3EF] py-16 md:py-28">
        <div className="max-w-7xl mx-auto px-5 md:px-6">
          <div className="flex justify-between items-end mb-4 md:mb-6">
            <div>
              <p className="uppercase text-[10px] tracking-[0.35em] opacity-50" style={{ fontFamily: "var(--font-dm)" }}>
                Archive Drop · Week {week}
              </p>
              <h2 className="text-3xl md:text-5xl mt-2 md:mt-3" style={{ fontFamily: "var(--font-cormorant)", fontWeight: 500 }}>
                This Week's Finds
              </h2>
            </div>
            <Link href="/buy" className="text-[10px] tracking-[0.2em] uppercase opacity-40 hover:opacity-100 transition-opacity whitespace-nowrap ml-4" style={{ fontFamily: "var(--font-dm)" }}>
              View All →
            </Link>
          </div>

          {/* Countdown — gold */}
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-7 md:mb-10"
            style={{ background: "rgba(201,144,26,0.12)", border: "1px solid rgba(201,144,26,0.3)" }}
          >
            <span className="relative flex h-[6px] w-[6px]">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C9901A] opacity-60" />
              <span className="relative inline-flex rounded-full h-[6px] w-[6px] bg-[#C9901A]" />
            </span>
            <span className="text-[10px] tracking-[0.2em] uppercase text-[#C9901A]" style={{ fontFamily: "var(--font-dm)" }}>
              Next drop in {countdown}
            </span>
          </div>

          <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4 scrollbar-hide -mx-5 px-5 md:mx-0 md:px-0">
            {products.length === 0 && <p className="opacity-40 text-sm" style={{ fontFamily: "var(--font-dm)" }}>Loading archive...</p>}
            {products.map((item) => {
              const badge = getProductBadge(item);
              return (
                <Link key={item.id} href={`/product/${item.id}`} className="min-w-[200px] md:min-w-[260px] group flex-shrink-0">
                  <div className="bg-[#2B0A0F] rounded-2xl overflow-hidden border border-[#F6F3EF]/08 hover:border-[#F6F3EF]/20 transition-all hover:-translate-y-1">
                    <div className="relative aspect-[3/4]">
                      <Image src={item.image_url} alt={item.title} fill className="object-cover group-hover:scale-105 transition duration-700" />
                      {badge && (
                        <div className={`absolute top-3 left-3 text-[9px] px-3 py-1 rounded-full uppercase tracking-wide font-medium ${badge.cls}`} style={{ fontFamily: "var(--font-dm)" }}>
                          {badge.label}
                        </div>
                      )}
                    </div>
                    <div className="p-3 md:p-4">
                      <h3 className="mb-1" style={{ fontFamily: "var(--font-cormorant)", fontSize: "1rem", fontWeight: 500 }}>{item.title}</h3>
                      <p className="text-xs opacity-50 tracking-wide" style={{ fontFamily: "var(--font-dm)" }}>₹{item.price} · {item.location}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════
          SELL STRIP
      ══════════════════════════ */}
      <section className="bg-[#A1123F] text-[#F6F3EF] py-14 md:py-20 px-5 md:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 items-center">
          <div>
            <h2 className="leading-[1.05]" style={{ fontFamily: "var(--font-cormorant)", fontWeight: 500, fontSize: "clamp(1.8rem,5vw,3.2rem)" }}>
              Your wardrobe<br />
              <em>is someone's</em><br />
              next favourite fit.
            </h2>
            <p className="mt-4 text-sm leading-relaxed opacity-75 max-w-sm" style={{ fontFamily: "var(--font-dm)" }}>
              Turn clothes you don't wear into money you can spend on
              clothes you will. Listing takes 90 seconds.
            </p>
            <Link href="/sell">
              <button className="mt-6 md:mt-7 px-7 py-4 bg-[#F6F3EF] text-[#2B0A0F] rounded-full text-xs tracking-[0.18em] uppercase hover:opacity-85 transition-all hover:scale-[1.02]" style={{ fontFamily: "var(--font-dm)" }}>
                Submit a Piece →
              </button>
            </Link>
          </div>
          <div className="flex flex-col gap-3 md:gap-4">
            {[
              { n: "01", title: "Photograph It",  sub: "3 photos, natural light. The archive does the rest." },
              { n: "02", title: "Set Your Price", sub: "You control it. We suggest based on similar pieces." },
              { n: "03", title: "Get Paid",        sub: "Direct to your UPI. No delays, no drama." },
            ].map((step) => (
              <div key={step.n} className="flex items-center gap-4 md:gap-5 bg-white/10 rounded-2xl px-5 md:px-6 py-4 md:py-5 border border-white/15">
                <span className="text-2xl md:text-3xl opacity-25 flex-shrink-0 w-8" style={{ fontFamily: "var(--font-cormorant)" }}>{step.n}</span>
                <div>
                  <p className="text-sm font-medium" style={{ fontFamily: "var(--font-dm)" }}>{step.title}</p>
                  <p className="text-xs opacity-60 mt-0.5 leading-relaxed" style={{ fontFamily: "var(--font-dm)" }}>{step.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════
          FOOTER
      ══════════════════════════ */}
      <footer className="bg-[#1A060B] text-[#F6F3EF]">
        <div className="border-b border-[#F6F3EF]/08 py-10 px-5 md:px-8">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <p style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.1rem", fontWeight: 500 }}>
                Get the Sunday drop in your inbox.
              </p>
              <p className="text-[11px] opacity-40 mt-1 tracking-wide" style={{ fontFamily: "var(--font-dm)" }}>
                New pieces every week. No spam, ever.
              </p>
            </div>
            <EmailCapture />
          </div>
        </div>
        <div className="px-5 md:px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-3 text-[10px] tracking-[0.15em] uppercase text-[#F6F3EF]/40 text-center" style={{ fontFamily: "var(--font-dm)" }}>
          <span className="text-[#F6F3EF]" style={{ fontFamily: "var(--font-cormorant)", fontSize: "15px", letterSpacing: "0.25em", textTransform: "uppercase" }}>
            Thrift Gennie
          </span>
          <span>© 2026 · Archive No. 001 · Est. Pune</span>
          <span>Sourced across India · Made with love</span>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </main>
  );
}