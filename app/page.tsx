"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import Navbar from "./components/Navbar";
import { supabase } from "../lib/supabase";

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
   MOOD CONFIG
========================= */
const MOODS = [
  { label: "Y2K", title: "Y2K It Girl",      tag: "y2k",       bg: "linear-gradient(160deg,#EAE3DB 0%,#D4C5B0 100%)" },
  { label: "Old Money", title: "Old Money",  tag: "oldmoney",  bg: "linear-gradient(160deg,#D4C09A 0%,#A8854A 100%)" },
  { label: "Indie",  title: "Indie Archive", tag: "indie",     bg: "linear-gradient(160deg,#B5C4A8 0%,#6B7E60 100%)" },
  { label: "Bollywood", title: "Bollywood Glam", tag: "bollywood", bg: "linear-gradient(160deg,#E8A08A 0%,#B84028 100%)" },
  { label: "90s",    title: "90s Minimal",   tag: "90s",       bg: "linear-gradient(160deg,#AECDCE 0%,#5A8D90 100%)" },
];

const MOOD_GRID = [
  { title: "Y2K It Girl",     tag: "y2k",       sub: "Trend",     count: 128, cls: "from-[#FFB3C6] to-[#C77DFF]" },
  { title: "Old Money",       tag: "oldmoney",  sub: "Aesthetic", count: 94,  cls: "from-[#C9A96E] to-[#8B6914]" },
  { title: "Indie Archive",   tag: "indie",     sub: "Vibe",      count: 67,  cls: "from-[#7B8B6F] to-[#3D4A35]" },
  { title: "Bollywood Glam",  tag: "bollywood", sub: "Statement", count: 112, cls: "from-[#FF6B35] to-[#C41E3A]" },
  { title: "90s Minimal",     tag: "90s",       sub: "Classic",   count: 79,  cls: "from-[#A8DADC] to-[#457B9D]" },
];

const TICKER_ITEMS = [
  "New Drop Every Sunday",
  "Mumbai · Pune · Delhi · Bangalore · Jaipur",
  "Gennie Verified — Pieces Curated with Care",
  "Buy Less · Choose Better · Wear it Like It's Yours",
  "Free Listing for Founding Sellers",
];

/* =========================
   SEARCH OVERLAY
========================= */
const SEARCH_HINTS = [
  "Y2K tops", "lehenga under ₹2000", "old money blazer",
  "vintage saree", "size S Mumbai", "Bollywood glam",
];

function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[999] bg-[#F6F3EF]/95 backdrop-blur-xl flex items-start justify-center pt-32"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <div className="w-[560px] max-w-[90vw]">
            <div className="flex items-center gap-4 border-b border-[#2B0A0F]/20 pb-3">
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none" className="opacity-40 flex-shrink-0">
                <circle cx="6.5" cy="6.5" r="5" stroke="#2B0A0F" strokeWidth="1.5"/>
                <path d="M10.5 10.5L14 14" stroke="#2B0A0F" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                ref={inputRef}
                type="text"
                placeholder="Search the archive..."
                className="flex-1 bg-transparent border-none outline-none text-[#2B0A0F] placeholder:text-[#2B0A0F]/30"
                style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(1.4rem,3vw,2rem)", fontStyle: "italic" }}
              />
              <button
                onClick={onClose}
                className="text-[#2B0A0F]/40 hover:text-[#2B0A0F] transition-colors text-xl leading-none"
              >✕</button>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {SEARCH_HINTS.map((hint) => (
                <button
                  key={hint}
                  className="bg-[#2B0A0F]/07 hover:bg-[#2B0A0F] hover:text-[#F6F3EF] text-[#2B0A0F] transition-all rounded-full px-4 py-2 text-xs tracking-wide border border-[#2B0A0F]/10"
                  style={{ fontFamily: "var(--font-inter)" }}
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
   MAIN PAGE
========================= */
export default function HomePage() {
  const week = getWeekNumber();
  const nextSunday = new Date();
  nextSunday.setDate(nextSunday.getDate() + ((7 - nextSunday.getDay()) % 7));
  const countdown = useCountdown(nextSunday);

  const [products, setProducts] = useState<any[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeMoodIdx, setActiveMoodIdx] = useState(0);

  /* Original Gennie carousel state — untouched */
  const gennies = ["/night.png", "/y2k.png", "/oldmoney.png", "/streetstyle.png"];
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % gennies.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  /* Supabase fetch */
  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8);
      if (!error) setProducts(data);
    };
    fetchProducts();
  }, []);

  /* Lock scroll when search open */
  useEffect(() => {
    document.body.style.overflow = searchOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [searchOpen]);

  const activeMood = MOODS[activeMoodIdx];

  return (
    <main className="relative overflow-hidden bg-[#F6F3EF] text-[#2B0A0F]">

      {/* ── SEARCH OVERLAY ── */}
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* ── NAV — original Navbar component ── */}
      <Navbar />

      {/* ═══════════════════════════
          HERO SECTION
      ═══════════════════════════ */}
      <section className="relative min-h-screen flex items-center pt-24">

        {/* Vertical Archive Label — kept from original */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 rotate-[-90deg] tracking-[0.4em] text-xs opacity-30 hidden lg:block">
          ARCHIVE NO. 001 · EST. 2025
        </div>

        <div className="max-w-7xl mx-auto px-6 w-full grid grid-cols-1 md:grid-cols-2 items-center gap-8">

          {/* ── LEFT ── */}
          <div className="relative z-10">

            {/* Live pill — NEW */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-3 mb-7"
            >
              <span className="relative flex h-[7px] w-[7px]">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A1123F] opacity-60" />
                <span className="relative inline-flex rounded-full h-[7px] w-[7px] bg-[#A1123F]" />
              </span>
              <span className="text-[10px] tracking-[0.3em] uppercase opacity-50">
                Live archive · 247 pieces this week
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7 }}
              className="leading-[0.88] tracking-tight"
              style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(4rem,8vw,7rem)" }}
            >
              <span className="block">Thrift it.</span>
              <span className="block text-[#A1123F] italic">Love it.</span>
              <span className="block font-medium">Gennie it.</span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38, duration: 0.6 }}
              className="mt-10 max-w-lg space-y-3"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              <p className="text-lg">This isn't thrift.</p>
              <p className="italic text-lg">It's a fashion archive.</p>
              <p className="text-[#2B0A0F]/65 leading-relaxed">
                Pre-loved pieces with history, taste, and attitude —
                curated by people who know an outfit is never just an outfit.
              </p>
              <p className="uppercase tracking-[0.3em] text-[10px] pt-2 opacity-40">
                Buy less · Choose better · Wear it like it's yours
              </p>
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.52 }}
              className="mt-10 flex gap-4"
            >
              <Link href="/buy">
                <button className="px-7 py-4 bg-[#2B0A0F] text-white rounded-full text-xs tracking-[0.18em] uppercase hover:opacity-80 transition-all hover:scale-[1.02] active:scale-[0.98]">
                  Enter the Archive →
                </button>
              </Link>
              <Link href="/sell">
                <button className="px-7 py-4 border border-[#2B0A0F]/25 rounded-full text-xs tracking-[0.18em] uppercase hover:bg-[#2B0A0F] hover:text-white transition-all">
                  Submit a Piece
                </button>
              </Link>
            </motion.div>

            {/* Social proof stats — NEW */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-12 flex gap-8 border-t border-[#2B0A0F]/08 pt-8"
            >
              {[
                { num: "2.4k",  label: "Pieces Listed" },
                { num: "₹340",  label: "Avg Price" },
                { num: "5 Cities", label: "Mum · Pune · Del + more" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-2xl font-bold" style={{ fontFamily: "var(--font-playfair)" }}>{s.num}</div>
                  <div className="text-[10px] tracking-[0.18em] uppercase opacity-40 mt-1">{s.label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* ── RIGHT — ORIGINAL GENNIE CAROUSEL (untouched logic) + mood chips ── */}
          <div className="relative h-[600px] hidden md:block">

            {/* Golden glow */}
            <div className="absolute w-[420px] h-[420px] bg-[#B48A5A]/20 blur-3xl rounded-full top-[20%] left-[20%]" />

            {/* Shop by mood label */}
            <div className="absolute top-[20px] left-[40px] z-30">
              <p className="uppercase tracking-[0.3em] text-xs text-[#2B0A0F]/60">
                Shop by your mood
              </p>
            </div>

            {/* Mood chips — NEW, overlaid on right side */}
            <div className="absolute top-12 right-0 flex flex-col gap-2 z-40">
              {MOODS.map((mood, i) => (
                <button
                  key={mood.tag}
                  onClick={() => setActiveMoodIdx(i)}
                  className={`rounded-full px-4 py-2 text-[11px] tracking-[0.1em] transition-all border whitespace-nowrap text-left ${
                    activeMoodIdx === i
                      ? "bg-[#2B0A0F] text-[#F6F3EF] border-[#2B0A0F] font-medium"
                      : "bg-white text-[#2B0A0F] border-[#2B0A0F]/10 hover:bg-[#2B0A0F] hover:text-[#F6F3EF] hover:border-[#2B0A0F]"
                  }`}
                >
                  {activeMoodIdx === i ? "✦ " : ""}{mood.label}
                </button>
              ))}
            </div>

            {/* ── ORIGINAL GENNIE IMAGES — UNTOUCHED ── */}
            <motion.img
              key={gennies[index]}
              src={gennies[index]}
              initial={{ x: 80, opacity: 0 }}
              animate={{ x: 0, opacity: 1, y: [0, -10, 0] }}
              transition={{
                x: { duration: 0.8 },
                opacity: { duration: 0.8 },
                y: { repeat: Infinity, duration: 4 },
              }}
              className="absolute bottom-[-20px] right-[20px] w-[380px] z-20"
            />
            <motion.img
              key={gennies[(index + 1) % gennies.length]}
              src={gennies[(index + 1) % gennies.length]}
              initial={{ x: 80, opacity: 0 }}
              animate={{ x: 0, opacity: 0.9, y: [0, 10, 0] }}
              transition={{
                x: { duration: 0.8 },
                opacity: { duration: 0.8 },
                y: { repeat: Infinity, duration: 5 },
              }}
              className="absolute top-[40px] left-[0px] w-[280px] z-10 scale-90 opacity-90"
            />

            {/* Mood label card — updates on chip click */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeMood.tag}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="absolute bottom-8 left-8 z-30 bg-white/70 backdrop-blur-md rounded-2xl px-5 py-4 border border-[#2B0A0F]/08"
              >
                <p className="text-[9px] tracking-[0.3em] uppercase opacity-50">Current Mood</p>
                <p className="text-lg mt-0.5" style={{ fontFamily: "var(--font-playfair)" }}>
                  {activeMood.title}
                </p>
                <Link href={`/buy?mood=${activeMood.tag}`}>
                  <span className="text-[10px] tracking-[0.15em] uppercase text-[#A1123F] hover:opacity-70 transition-opacity">
                    Shop this mood →
                  </span>
                </Link>
              </motion.div>
            </AnimatePresence>
          </div>

        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-25">
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="flex flex-col items-center gap-1"
          >
            <span className="text-[9px] tracking-[0.3em] uppercase">Scroll</span>
            <div className="w-px h-8 bg-[#2B0A0F] relative">
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-[6px] border-l-transparent border-r-transparent border-t-[#2B0A0F]" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════
          TICKER — NEW
      ═══════════════════════════ */}
      <div className="bg-[#1A060B] text-[#F6F3EF] py-3 overflow-hidden">
        <div className="flex whitespace-nowrap" style={{ animation: "ticker 24s linear infinite" }}>
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-4 px-8 text-[10px] tracking-[0.3em] uppercase opacity-60">
              <span className="w-1 h-1 rounded-full bg-[#A1123F] inline-block flex-shrink-0" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════
          SHOP BY MOOD GRID — UPGRADED
      ═══════════════════════════ */}
      <section className="bg-[#F6F3EF] text-[#2B0A0F] py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-end mb-12">
            <div>
              <p className="uppercase tracking-[0.4em] text-[10px] opacity-40 mb-3">Browse by Mood</p>
              <h2 className="text-5xl" style={{ fontFamily: "var(--font-playfair)" }}>
                Choose Your Aesthetic
              </h2>
            </div>
            <Link href="/buy" className="text-[10px] tracking-[0.2em] uppercase opacity-40 hover:opacity-100 transition-opacity">
              View All →
            </Link>
          </div>

          <div className="grid grid-cols-5 gap-4">
            {MOOD_GRID.map((mood) => (
              <Link key={mood.tag} href={`/buy?mood=${mood.tag}`} className="group">
                <div className="rounded-[18px] overflow-hidden aspect-[3/4] relative cursor-pointer">
                  <div className={`w-full h-full bg-gradient-to-br ${mood.cls} group-hover:scale-105 transition-transform duration-500`} />

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

                  {/* Piece count badge */}
                  <div className="absolute top-3 right-3 bg-white/15 backdrop-blur-md rounded-full px-3 py-1 text-[10px] text-white tracking-wide">
                    {mood.count} pieces
                  </div>

                  <div className="absolute bottom-5 left-5 right-5 text-white">
                    <p className="text-[9px] tracking-[0.25em] uppercase opacity-65">{mood.sub}</p>
                    <h3 className="text-[1.1rem] mt-1" style={{ fontFamily: "var(--font-playfair)" }}>
                      {mood.title}
                    </h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════
          WEEKLY ARCHIVE DROP
      ═══════════════════════════ */}
      <section className="bg-[#1A060B] text-[#F6F3EF] py-28">
        <div className="max-w-7xl mx-auto px-6">

          <div className="flex justify-between items-end mb-6">
            <div>
              <p className="uppercase text-[10px] tracking-[0.35em] opacity-50">
                Archive Drop · Week {week}
              </p>
              <h2 className="text-5xl mt-3" style={{ fontFamily: "var(--font-playfair)" }}>
                This Week's Finds
              </h2>
            </div>
            <Link href="/buy" className="text-[10px] tracking-[0.2em] uppercase opacity-40 hover:opacity-100 transition-opacity">
              View Full Drop →
            </Link>
          </div>

          {/* Countdown pill — NEW */}
          <div className="inline-flex items-center gap-2 bg-[#A1123F]/15 border border-[#A1123F]/30 rounded-full px-4 py-2 mb-10">
            <span className="relative flex h-[6px] w-[6px]">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A1123F] opacity-60" />
              <span className="relative inline-flex rounded-full h-[6px] w-[6px] bg-[#A1123F]" />
            </span>
            <span className="text-[10px] tracking-[0.2em] uppercase text-[#E8859C]">
              Next drop in {countdown}
            </span>
          </div>

          <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
            {products.length === 0 && (
              <p className="opacity-40 text-sm">Loading archive...</p>
            )}
            {products.map((item) => (
              <Link key={item.id} href={`/product/${item.id}`} className="min-w-[260px] group flex-shrink-0">
                <div className="bg-[#2B0A0F] rounded-2xl overflow-hidden border border-[#F6F3EF]/08 hover:border-[#F6F3EF]/20 transition-all hover:-translate-y-1">
                  <div className="relative aspect-[3/4]">
                    <Image
                      src={item.image_url}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:scale-105 transition duration-700"
                    />
                    <div className="absolute top-3 left-3 bg-white text-black text-[9px] px-3 py-1 rounded-full uppercase tracking-wide">
                      Rare Find
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-medium mb-1">{item.title}</h3>
                    <p className="text-xs opacity-50 tracking-wide">
                      ₹{item.price} · {item.location}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

        </div>
      </section>

      {/* ═══════════════════════════
          SELL STRIP — NEW
      ═══════════════════════════ */}
      <section className="bg-[#A1123F] text-[#F6F3EF] py-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

          <div>
            <h2
              className="leading-[1.05]"
              style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(2rem,3.5vw,3rem)" }}
            >
              Your wardrobe<br />
              <em>is someone's</em><br />
              next favourite fit.
            </h2>
            <p className="mt-4 text-sm leading-relaxed opacity-75 max-w-sm">
              Turn clothes you don't wear into money you can spend on
              clothes you will. Listing takes 90 seconds.
            </p>
            <Link href="/sell">
              <button className="mt-7 px-7 py-4 bg-[#F6F3EF] text-[#2B0A0F] rounded-full text-xs tracking-[0.18em] uppercase hover:opacity-85 transition-all hover:scale-[1.02]">
                Submit a Piece →
              </button>
            </Link>
          </div>

          <div className="flex flex-col gap-4">
            {[
              { n: "01", title: "Photograph It",  sub: "3 photos, natural light. The archive does the rest." },
              { n: "02", title: "Set Your Price", sub: "You control it. We suggest based on similar pieces." },
              { n: "03", title: "Get Paid",        sub: "Direct to your UPI. No delays, no drama." },
            ].map((step) => (
              <div
                key={step.n}
                className="flex items-center gap-5 bg-white/10 rounded-2xl px-6 py-5 border border-white/15"
              >
                <span
                  className="text-3xl opacity-25 flex-shrink-0 w-8"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  {step.n}
                </span>
                <div>
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-xs opacity-60 mt-0.5 leading-relaxed">{step.sub}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ═══════════════════════════
          FOOTER
      ═══════════════════════════ */}
      <footer className="bg-[#1A060B] text-[#F6F3EF]/40 px-8 py-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] tracking-[0.15em] uppercase">
        <span className="text-[#F6F3EF] not-uppercase" style={{ fontFamily: "var(--font-playfair)", fontSize: "14px", letterSpacing: "0.25em", textTransform: "uppercase" }}>
          Thrift Gennie
        </span>
        <span>© 2026 · Archive No. 001 · Est. Pune</span>
        <span>Sourced across India · Made with love</span>
      </footer>

      {/* ── GLOBAL STYLES ── */}
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
