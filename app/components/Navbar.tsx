"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useWishlist } from "../hooks/useWishlist";
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

type Piece = {
  id: string;
  title: string;
  price: number;
  vibe?: string;
  seller_id?: string;
  seller_name?: string;
  image_url?: string;
};

type Seller = {
  id: string;
  full_name: string;
  username?: string;
  avatar_url?: string;
  listing_count?: number;
};

type SearchResults = {
  pieces: Piece[];
  sellers: Seller[];
};

const VIBES = ["Y2K", "Old Money", "Indie", "Bollywood", "90s", "Dark Academia", "Cottagecore"];
const SIZES = ["XS", "S", "M", "L", "XL", "Free size"];
const BUDGETS = ["Under ₹500", "₹500–₹1500", "₹1500–₹3000", "₹3000+"];
const TRENDING = ["mini skirts", "leather trench", "cargo sets", "sheer tops", "bling clutch"];

export default function Navbar() {
  const { wishlist } = useWishlist();
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({ pieces: [], sellers: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"pieces" | "sellers">("pieces");
  const [suggestedSellers, setSuggestedSellers] = useState<Seller[]>([]);
  const [activeVibes, setActiveVibes] = useState<string[]>([]);
  const [activeSize, setActiveSize] = useState<string | null>(null);
  const [activeBudget, setActiveBudget] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  const fetchProfile = async (userId: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();
    setUserName(profile?.full_name ?? null);
  };

  const fetchSuggestedSellers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .limit(5);
    if (data) setSuggestedSellers(data);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) fetchProfile(data.user.id);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setUserName(null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen || searchOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen, searchOpen]);

  useEffect(() => {
    if (searchOpen) {
      fetchSuggestedSellers();
      setTimeout(() => searchInputRef.current?.focus(), 80);
    } else {
      setQuery("");
      setResults({ pieces: [], sellers: [] });
      setActiveTab("pieces");
    }
  }, [searchOpen]);

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults({ pieces: [], sellers: [] });
      setLoading(false);
      return;
    }
    setLoading(true);

    const [piecesRes, sellersRes] = await Promise.all([
      supabase
        .from("listings")
        .select("id, title, price, vibe, image_url, seller_id")
        .or(`title.ilike.%${q}%,vibe.ilike.%${q}%`)
        .limit(12),
      supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .or(`full_name.ilike.%${q}%,username.ilike.%${q}%`)
        .limit(6),
    ]);

    setResults({
      pieces: piecesRes.data ?? [],
      sellers: sellersRes.data ?? [],
    });

    if ((sellersRes.data ?? []).length > 0) {
      setSuggestedSellers(sellersRes.data ?? []);
    }

    setLoading(false);
  }, []);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => runSearch(val), 280);
  };

  const handleTrendingClick = (word: string) => {
    setQuery(word);
    runSearch(word);
  };

  const toggleVibe = (v: string) =>
    setActiveVibes((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);

  const highlight = (text: string | null, q: string) => {
    if (!text) return "";
    if (!q.trim()) return text;
    const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"); // ✅ add this line
    const parts = text.split(re);
    return parts.map((part, i) =>
      re.test(part)
        ? <mark key={i} className="bg-[#B48A5A]/30 text-[#F6F3EF] rounded px-[2px]">{part}</mark>
        : part
    );
};
  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};


  const avatarColors = ["#3d1a2e", "#1a2e3d", "#1a3d2e", "#2e1a3d", "#3d2e1a"];
  const getAvatarColor = (id: string) => avatarColors[id.charCodeAt(0) % avatarColors.length];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push("/login");
  };

  const navLinks = [
    { href: "/buy", label: "Archive" },
    { href: "/sell", label: "Submit" },
    { href: "/messages", label: "Messages" },
    { href: "/wishlist", label: "Reserved" },
    ...(user ? [{ href: `/account/${user.id}`, label: "Account" }] : []),
    ...(!user ? [{ href: "/login", label: "Login" }] : []),
  ];

  const noResults = query.trim() && !loading && results.pieces.length === 0 && results.sellers.length === 0;

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 left-0 w-full z-50 bg-[#1A060B]/95 backdrop-blur-md border-b border-white/10 text-[#F6F3EF]"
      >
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-4 flex items-center gap-5">

          {/* BRAND */}
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            className="flex-shrink-0 uppercase tracking-[0.35em] text-xs font-semibold
                       text-[#B48A5A] drop-shadow-[0_0_6px_rgba(180,138,90,0.6)]
                       hover:text-[#d6a96c] transition"
          >
            THRIFT GENNIE
          </Link>

          {/* ── SEARCH PILL — right after logo, desktop only ── */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden md:flex items-center gap-2.5 pl-3.5 pr-3 py-[7px] rounded-full
                       bg-white/[0.06] border border-white/[0.12] text-white/40
                       hover:bg-white/[0.10] hover:border-white/20 hover:text-white/60
                       transition-all duration-200 flex-shrink-0"
            aria-label="Open search"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
              <circle cx="11" cy="11" r="7" />
              <line x1="16.5" y1="16.5" x2="22" y2="22" />
            </svg>
            <span className="text-[11px] tracking-wide whitespace-nowrap">
              Search pieces, vibes, sellers...
            </span>
            <span className="ml-2 text-[9px] opacity-50 border border-white/20 rounded px-1 py-0.5 tracking-wide">
              ⌘K
            </span>
          </button>

          {/* Spacer — pushes nav links to the right */}
          <div className="hidden md:block flex-1" />

          {/* DESKTOP NAV LINKS */}
          <nav className="hidden md:flex items-center gap-8 text-xs uppercase tracking-[0.25em]">

            {[
              { href: "/buy", label: "Archive" },
              { href: "/sell", label: "Submit" },
              { href: "/messages", label: "Messages" },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="relative group text-white/70 hover:text-white transition transform hover:-translate-y-[1px]"
              >
                <span className="after:content-[''] after:absolute after:left-0 after:bottom-[-4px] after:w-0 after:h-[1px] after:bg-[#B48A5A] after:transition-all group-hover:after:w-full">
                  {label}
                </span>
              </Link>
            ))}

            <div className="relative group text-white/70 hover:text-white transition transform hover:-translate-y-[1px]">
              <Link href="/wishlist">
                <span className="after:content-[''] after:absolute after:left-0 after:bottom-[-4px] after:w-0 after:h-[1px] after:bg-[#B48A5A] after:transition-all group-hover:after:w-full">
                  Reserved
                </span>
              </Link>
              {wishlist.length > 0 && (
                <span className="absolute -top-2 -right-4 text-[10px] bg-[#B48A5A] text-black px-2 rounded-full font-bold shadow-md shadow-[#B48A5A]/30">
                  {wishlist.length}
                </span>
              )}
            </div>

            {user && (
              <Link
                href={`/account/${user.id}`}
                className="relative group text-white/70 hover:text-white transition transform hover:-translate-y-[1px]"
              >
                <span className="after:content-[''] after:absolute after:left-0 after:bottom-[-4px] after:w-0 after:h-[1px] after:bg-[#B48A5A] after:transition-all group-hover:after:w-full">
                  Account
                </span>
              </Link>
            )}

            {!user ? (
              <Link
                href="/login"
                className="relative group text-white/70 hover:text-white transition transform hover:-translate-y-[1px]"
              >
                <span className="after:content-[''] after:absolute after:left-0 after:bottom-[-4px] after:w-0 after:h-[1px] after:bg-[#B48A5A] after:transition-all group-hover:after:w-full">
                  Login
                </span>
              </Link>
            ) : (
              <div className="flex items-center gap-5 ml-1 border-l border-white/10 pl-6">
                <span className="text-[10px] opacity-50 tracking-normal normal-case">
                  {userName ?? user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="border border-white/30 px-4 py-1 rounded-full hover:bg-white hover:text-black transition-all duration-300"
                >
                  Logout
                </button>
              </div>
            )}
          </nav>

          {/* MOBILE RIGHT — search icon + hamburger */}
          <div className="flex md:hidden items-center gap-4 ml-auto">
            {wishlist.length > 0 && (
              <Link href="/wishlist">
                <span className="text-[10px] bg-[#B48A5A] text-black px-2 py-0.5 rounded-full font-bold">
                  {wishlist.length}
                </span>
              </Link>
            )}
            <button
              onClick={() => setSearchOpen(true)}
              className="text-white/60 hover:text-[#B48A5A] transition"
              aria-label="Search"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="7" />
                <line x1="16.5" y1="16.5" x2="22" y2="22" />
              </svg>
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex flex-col gap-[5px] p-1"
              aria-label="Toggle menu"
            >
              <motion.span animate={menuOpen ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }} className="block w-5 h-[1.5px] bg-[#F6F3EF] origin-center transition-all" />
              <motion.span animate={menuOpen ? { opacity: 0 } : { opacity: 1 }} className="block w-5 h-[1.5px] bg-[#F6F3EF]" />
              <motion.span animate={menuOpen ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }} className="block w-5 h-[1.5px] bg-[#F6F3EF] origin-center transition-all" />
            </button>
          </div>

        </div>
      </motion.header>

      {/* ── SEARCH OVERLAY ── */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex flex-col"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSearchOpen(false)}
            />

            {/* Panel */}
            <div className="relative z-10 mt-[57px] bg-[#F5F0E8] w-full shadow-2xl max-h-[85vh] overflow-hidden flex flex-col">

              {/* Search input row */}
              <div className="flex items-center gap-3 px-6 md:px-10 py-4 border-b border-[#D4C9B0]">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#9a8a7a" strokeWidth="1.8" className="flex-shrink-0">
                  <circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="22" y2="22" />
                </svg>
                <input
                  ref={searchInputRef}
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="search pieces, vibes, sellers..."
                  className="flex-1 bg-transparent text-[#2d1a0e] text-base md:text-lg placeholder:text-[#b0a090] outline-none font-light tracking-wide"
                />
                {loading && (
                  <svg className="animate-spin text-[#B48A5A] flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                )}
                {query && (
                  <button
                    onClick={() => { setQuery(""); setResults({ pieces: [], sellers: [] }); searchInputRef.current?.focus(); }}
                    className="text-[#9a8a7a] hover:text-[#2d1a0e] text-lg leading-none transition flex-shrink-0"
                  >
                    ✕
                  </button>
                )}
                <button
                  onClick={() => setSearchOpen(false)}
                  className="ml-1 text-[#9a8a7a] hover:text-[#2d1a0e] text-[10px] uppercase tracking-widest transition flex-shrink-0"
                >
                  close
                </button>
              </div>

              {/* Body */}
              <div className="flex flex-col md:flex-row flex-1 overflow-hidden">

                {/* LEFT */}
                <div className="flex-1 overflow-y-auto px-6 md:px-10 py-5">

                  {/* IDLE — filters + trending */}
                  {!query && (
                    <>
                      <p className="text-[9px] tracking-[3px] text-[#9a8a7a] mb-3 uppercase">Filter by vibe</p>
                      <div className="flex flex-wrap gap-2 mb-5">
                        {VIBES.map((v) => (
                          <button
                            key={v}
                            onClick={() => toggleVibe(v)}
                            className={`px-3 py-1.5 rounded-full text-[11px] border transition-all tracking-wide ${
                              activeVibes.includes(v)
                                ? "bg-[#2d1a0e] text-[#e8d5b0] border-[#2d1a0e]"
                                : "bg-[#f0e8d8] text-[#5a3e28] border-[#d4c4a0] hover:bg-[#2d1a0e] hover:text-[#e8d5b0] hover:border-[#2d1a0e]"
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>

                      <p className="text-[9px] tracking-[3px] text-[#9a8a7a] mb-3 uppercase">Size</p>
                      <div className="flex flex-wrap gap-2 mb-5">
                        {SIZES.map((s) => (
                          <button
                            key={s}
                            onClick={() => setActiveSize(activeSize === s ? null : s)}
                            className={`px-3 py-1.5 rounded-full text-[11px] border transition-all tracking-wide ${
                              activeSize === s
                                ? "bg-[#c94060] text-white border-[#c94060]"
                                : "bg-white text-[#5a3e28] border-[#d4c4a0] hover:bg-[#c94060] hover:text-white hover:border-[#c94060]"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>

                      <p className="text-[9px] tracking-[3px] text-[#9a8a7a] mb-3 uppercase">Budget</p>
                      <div className="flex flex-wrap gap-2 mb-6">
                        {BUDGETS.map((b) => (
                          <button
                            key={b}
                            onClick={() => setActiveBudget(activeBudget === b ? null : b)}
                            className={`px-3 py-1.5 rounded-full text-[11px] border transition-all tracking-wide ${
                              activeBudget === b
                                ? "bg-[#2d1a0e] text-[#e8d5b0] border-[#2d1a0e]"
                                : "bg-white text-[#5a3e28] border-[#d4c4a0] hover:bg-[#2d1a0e] hover:text-[#e8d5b0] hover:border-[#2d1a0e]"
                            }`}
                          >
                            {b}
                          </button>
                        ))}
                      </div>

                      {(activeVibes.length > 0 || activeSize || activeBudget) && (
                        <button
                          onClick={() => {
                            router.push(`/buy?vibes=${activeVibes.join(",")}&size=${activeSize ?? ""}&budget=${activeBudget ?? ""}`);
                            setSearchOpen(false);
                          }}
                          className="mb-6 bg-[#2d1a0e] text-[#e8d5b0] text-[11px] tracking-[2px] uppercase px-5 py-2.5 rounded-full hover:bg-[#B48A5A] hover:text-black transition-all"
                        >
                          Browse filtered archive →
                        </button>
                      )}

                      <p className="text-[9px] tracking-[3px] text-[#9a8a7a] mb-3 uppercase">Trending right now</p>
                      {TRENDING.map((word, i) => (
                        <button
                          key={word}
                          onClick={() => handleTrendingClick(word)}
                          className="flex items-center gap-3 w-full py-2.5 border-b border-[#e0d8c8] text-left group"
                        >
                          <span className="text-[11px] text-[#b0a090] w-5">0{i + 1}</span>
                          <span className="text-[13px] text-[#2d1a0e] group-hover:text-[#c94060] transition">{word}</span>
                        </button>
                      ))}
                    </>
                  )}

                  {/* RESULTS */}
                  {query && (
                    <>
                      <div className="flex gap-0 mb-4 border-b border-[#e0d8c8]">
                        {(["pieces", "sellers"] as const).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-2.5 pt-1 px-4 text-[10px] tracking-[2px] uppercase border-b-2 -mb-px transition-all ${
                              activeTab === tab
                                ? "border-[#c94060] text-[#2d1a0e]"
                                : "border-transparent text-[#9a8a7a] hover:text-[#2d1a0e]"
                            }`}
                          >
                            {tab} ({tab === "pieces" ? results.pieces.length : results.sellers.length})
                          </button>
                        ))}
                      </div>

                      {activeTab === "pieces" && (
                        <div>
                          {results.pieces.length === 0 && !loading && (
                            <div className="text-center py-10 text-[#9a8a7a] text-sm">
                              <div className="text-3xl mb-2">🧺</div>
                              nothing in the archive matches that vibe yet
                            </div>
                          )}
                          {results.pieces.map((p) => (
                            <Link
                              key={p.id}
                              href={`/buy/${p.id}`}
                              onClick={() => setSearchOpen(false)}
                              className="flex items-center gap-3 py-3 border-b border-[#e0d8c8] hover:opacity-70 transition group"
                            >
                              <div className="w-11 h-11 rounded-md bg-[#f0e8d8] flex-shrink-0 overflow-hidden">
                                {p.image_url
                                  ? <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
                                  : <span className="flex items-center justify-center h-full text-lg">🛍️</span>
                                }
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] text-[#2d1a0e] font-medium truncate group-hover:text-[#c94060] transition">
                                  {highlight(p.title, query)}
                                </p>
                                {p.seller_name && (
                                  <p className="text-[11px] text-[#9a8a7a]">@{p.seller_name}</p>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                <span className="text-[13px] font-medium text-[#2d1a0e]">₹{p.price}</span>
                                {p.vibe && (
                                  <span className="text-[9px] tracking-wide px-2 py-0.5 rounded-full bg-[#f0e8d8] text-[#7a5a38] border border-[#d4c4a0]">
                                    {p.vibe}
                                  </span>
                                )}
                              </div>
                            </Link>
                          ))}
                          {results.pieces.length > 0 && (
                            <button
                              onClick={() => { router.push(`/buy?q=${query}`); setSearchOpen(false); }}
                              className="mt-4 text-[11px] text-[#9a8a7a] hover:text-[#c94060] tracking-widest uppercase transition"
                            >
                              see all results in archive →
                            </button>
                          )}
                        </div>
                      )}

                      {activeTab === "sellers" && (
                        <div>
                          {results.sellers.length === 0 && !loading && (
                            <div className="text-center py-10 text-[#9a8a7a] text-sm">
                              <div className="text-3xl mb-2">👀</div>
                              no sellers found for that name
                            </div>
                          )}
                          {results.sellers.map((s) => (
                            <Link
                              key={s.id}
                              href={`/account/${s.id}`}
                              onClick={() => setSearchOpen(false)}
                              className="flex items-center gap-3 py-3 border-b border-[#e0d8c8] hover:opacity-70 transition"
                            >
                              <div
                                className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-medium overflow-hidden"
                                style={{ background: getAvatarColor(s.id), color: "#e8d5b0" }}
                              >
                                {s.avatar_url
                                  ? <img src={s.avatar_url} alt={s.full_name} className="w-full h-full object-cover rounded-full" />
                                  : getInitials(s.full_name)
                                }
                              </div>
                              <div>
                                <p className="text-[13px] text-[#2d1a0e] font-medium">
                                  {highlight(s.full_name, query)}
                                </p>
                                {s.username && (
                                  <p className="text-[11px] text-[#9a8a7a]">
                                    {highlight(`@${s.username}`, query)}
                                  </p>
                                )}
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}

                      {noResults && (
                        <div className="text-center py-10 text-[#9a8a7a] text-sm">
                          <div className="text-3xl mb-2">🔍</div>
                          no pieces or sellers found for <span className="italic">"{query}"</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* RIGHT — suggested sellers, desktop only */}
                <div className="hidden md:block w-72 border-l border-[#e0d8c8] px-5 py-5 overflow-y-auto flex-shrink-0">
                  <p className="text-[9px] tracking-[3px] text-[#9a8a7a] mb-3 uppercase">
                    {query && results.sellers.length > 0 ? "Matching sellers" : "People you might know"}
                  </p>
                  {suggestedSellers.map((s) => (
                    <Link
                      key={s.id}
                      href={`/account/${s.id}`}
                      onClick={() => setSearchOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#f0e8d8] transition"
                    >
                      <div
                        className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-[12px] font-medium overflow-hidden"
                        style={{ background: getAvatarColor(s.id), color: "#e8d5b0" }}
                      >
                        {s.avatar_url
                          ? <img src={s.avatar_url} alt={s.full_name} className="w-full h-full object-cover rounded-full" />
                          : getInitials(s.full_name)
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-[#2d1a0e] font-medium truncate">
                          {query ? highlight(s.full_name, query) : s.full_name}
                        </p>
                        {s.username && (
                          <p className="text-[11px] text-[#9a8a7a] truncate">@{s.username}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MOBILE MENU OVERLAY */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 bg-[#1A060B] flex flex-col pt-24 px-8 md:hidden"
          >
            <nav className="flex flex-col gap-6 mt-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-[#F6F3EF]/70 hover:text-[#B48A5A] uppercase tracking-[0.3em] text-sm border-b border-white/[0.08] pb-6 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            {user && (
              <div className="mt-10 pt-6 border-t border-white/10">
                <p className="text-[10px] opacity-40 tracking-wide capitalize mb-4">
                  {userName ?? user.email}
                </p>
                <button
                  onClick={handleLogout}
                  className="border border-white/30 px-6 py-2 rounded-full text-xs tracking-[0.2em] uppercase hover:bg-white hover:text-black transition-all"
                >
                  Logout
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
