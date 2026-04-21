"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";

/* ─────────────────────────────
   HELPERS
───────────────────────────── */
function timeAgo(dateStr: string): string {
  const normalized = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T");
  const date = new Date(normalized.endsWith("Z") ? normalized : normalized + "Z");
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs  < 24) return `${hrs}h ago`;
  if (days < 7)  return `${days}d ago`;
  return new Date(normalized).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function isUnread(lastMsg: any, lastReadAt: string | null, userId: string): boolean {
  if (!lastMsg) return false;
  if (lastMsg.sender_id === userId) return false; // your own message
  if (!lastReadAt) return true; // never opened
  const normalized = (s: string) => s.includes("T") ? s : s.replace(" ", "T");
  const msgTime  = new Date(normalized(lastMsg.created_at) + (lastMsg.created_at.endsWith("Z") ? "" : "Z"));
  const readTime = new Date(normalized(lastReadAt) + (lastReadAt.endsWith("Z") ? "" : "Z"));
  return msgTime > readTime;
}

/* ─────────────────────────────
   SKELETON
───────────────────────────── */
function ConvSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-4 p-4 sm:p-5 bg-white rounded-2xl border border-[#2B0A0F]/06 animate-pulse">
          <div className="w-14 sm:w-16 h-[72px] sm:h-20 bg-[#EAE3DB] rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-3 py-1">
            <div className="h-3 bg-[#EAE3DB] rounded-full w-1/3" />
            <div className="h-3 bg-[#EAE3DB] rounded-full w-2/3" />
            <div className="h-3 bg-[#EAE3DB] rounded-full w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────
   CONVERSATION CARD
───────────────────────────── */
function ConvCard({
  conv,
  userId,
  index,
  lastReadAt,
}: {
  conv: any;
  userId: string;
  index: number;
  lastReadAt: string | null;
}) {
  const messages   = conv.messages || [];
  const lastMsg    = messages.reduce((latest: any, m: any) =>
    !latest || new Date(m.created_at) > new Date(latest.created_at) ? m : latest, null);
  const isSeller   = conv.seller_id === userId;
  const isSold     = conv.products?.status === "sold";
  const isLastMine = lastMsg?.sender_id === userId;
  const hasUnread  = isUnread(lastMsg, lastReadAt, userId);
  // Simulate unread — in production, track a `read_at` per user per conversation
   

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/messages/${conv.id}`} className="group block">
        <div className={`flex items-stretch bg-white rounded-2xl border transition-all duration-200 overflow-hidden hover:border-[#2B0A0F]/25 hover:shadow-sm ${
          hasUnread ? "border-[#B48A5A]/30" : "border-[#2B0A0F]/06"
        }`}>

          {/* Unread indicator strip */}
          {hasUnread && (
            <div className="w-1 flex-shrink-0 bg-[#B48A5A] rounded-l-2xl" />
          )}

          {/* Product image */}
          <div className="relative w-14 sm:w-[68px] flex-shrink-0 bg-[#EAE3DB] overflow-hidden">
            <Image
              src={conv.products?.image_url || "/final.png"}
              alt={conv.products?.title || "Piece"}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
            />
            {isSold && (
              <div className="absolute inset-0 bg-[#2B0A0F]/55 flex items-center justify-center">
                <span className="text-[7px] uppercase tracking-[0.2em] text-[#F6F3EF] rotate-[-20deg]">Sold</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 px-4 sm:px-5 py-3 sm:py-4 min-w-0">
            {/* Title row */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <h2
                className={`text-sm sm:text-base truncate leading-snug ${hasUnread ? "font-semibold" : "font-medium"}`}
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                {conv.products?.title || "Untitled Piece"}
              </h2>
              <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                {hasUnread && (
                  <span className="w-2 h-2 rounded-full bg-[#B48A5A] flex-shrink-0" />
                )}
                <span className="text-[8px] sm:text-[9px] uppercase tracking-widest opacity-30 whitespace-nowrap">
                  {lastMsg ? timeAgo(lastMsg.created_at) : ""}
                </span>
              </div>
            </div>

            {/* Last message preview */}
            <p className={`text-xs truncate pr-2 ${hasUnread ? "opacity-70" : "opacity-40 italic"}`}>
              {lastMsg
                ? `${isLastMine ? "You: " : ""}${lastMsg.text}`
                : "No messages yet..."}
            </p>

            {/* Meta chips */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {conv.products?.price && (
                <span className="text-[9px] opacity-50" style={{ fontFamily: "var(--font-playfair)" }}>
                  ₹{conv.products.price?.toLocaleString("en-IN")}
                </span>
              )}
              <span className="w-px h-2.5 bg-[#2B0A0F]/12" />
              <span className={`text-[8px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-full ${
                isSeller
                  ? "bg-[#B48A5A]/10 text-[#B48A5A]"
                  : "bg-[#2B0A0F]/06 text-[#2B0A0F]/50"
              }`}>
                {isSeller ? "Selling" : "Buying"}
              </span>
              {isSold && (
                <span className="text-[8px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-full bg-[#2B0A0F]/06 text-[#2B0A0F]/35">
                  Archived
                </span>
              )}
            </div>
          </div>

          {/* Arrow — desktop only */}
          <div className="hidden sm:flex items-center pr-4 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
            <span className="text-base opacity-30">→</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ─────────────────────────────
   MAIN PAGE
───────────────────────────── */
export default function MessagesPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [userId, setUserId]     = useState<string | null>(null);
  const [filter, setFilter]     = useState<"all" | "buying" | "selling">("all");
  const [search, setSearch]     = useState("");
  const [lastReadMap, setLastReadMap] = useState<Record<string, string | null>>({});

  /* ── AUTH + FETCH ── */
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchConversations(user.id);
      } else {
        setLoading(false);
      }
    };
    init();
  }, []);

  /* ── REAL-TIME INBOX UPDATES ── */
  useEffect(() => {
  if (!userId) return;
  const channel = supabase
    .channel("inbox-updates")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" },
      () => fetchConversations(userId, true))
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" },
      () => fetchConversations(userId, true))
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversations" },
      () => fetchConversations(userId, true))
    .subscribe();

  const interval = setInterval(() => fetchConversations(userId, true), 30_000);
  return () => { supabase.removeChannel(channel); clearInterval(interval); };
}, [userId]);

   const fetchConversations = async (currentId: string, silent = false) => {
  if (!silent) setLoading(true);

    // First get blocked user IDs
const { data: blockedData } = await supabase
  .from("blocks")
  .select("blocked_id")
  .eq("blocker_id", currentId);

const blockedIds = blockedData?.map((b: any) => b.blocked_id) || [];

const [{ data, error }, { data: participantData }] = await Promise.all([
  supabase
    .from("conversations")
    .select(`
      id,
      product_id,
      buyer_id,
      seller_id,
      products (title, image_url, price, status),
      messages (text, created_at, sender_id)
    `)
    .or(`buyer_id.eq.${currentId},seller_id.eq.${currentId}`)
    .order("created_at", { referencedTable: "messages", ascending: false })
    .limit(1, { referencedTable: "messages" }),// ← only fetch last message per conversation
    supabase
      .from("conversation_participants")
      .select("conversation_id, last_read_at")
      .eq("user_id", currentId)
  ]);

  if (!error && data) {
    const sorted = data.sort((a: any, b: any) => {
      const aLast = a.messages?.reduce((l: any, m: any) =>
        !l || new Date(m.created_at) > new Date(l.created_at) ? m : l, null);
      const bLast = b.messages?.reduce((l: any, m: any) =>
        !l || new Date(m.created_at) > new Date(l.created_at) ? m : l, null);
      return (bLast?.created_at ?? "").localeCompare(aLast?.created_at ?? "");
    });
    setConversations(sorted);
  }
  const withoutBlocked = sorted.filter((c: any) => {
  const otherId = c.buyer_id === currentId ? c.seller_id : c.buyer_id;
  return !blockedIds.includes(otherId);
});
setConversations(withoutBlocked);

  if (participantData) {
    const map: Record<string, string | null> = {};
    participantData.forEach((p: any) => {
      map[p.conversation_id] = p.last_read_at;
    });
    setLastReadMap(map);
  }

  setLoading(false);
};


  /* ── FILTER + SEARCH ── */
  const filtered = useMemo(() => {
    let list = conversations;
    if (filter === "buying")  list = list.filter(c => c.buyer_id  === userId);
    if (filter === "selling") list = list.filter(c => c.seller_id === userId);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.products?.title?.toLowerCase().includes(q));
    }
    return list;
  }, [conversations, filter, search, userId]);

  const unreadCount = useMemo(() =>
  conversations.filter(c => {
    const msgs = c.messages || [];
    const last = msgs.reduce((l: any, m: any) =>
      !l || new Date(m.created_at) > new Date(l.created_at) ? m : l, null);
    return isUnread(last, lastReadMap[c.id] ?? null, userId!);
  }).length,
[conversations, lastReadMap, userId]);

  const tabs = [
    { key: "all",     label: "All",        count: conversations.length },
    { key: "buying",  label: "Buying",     count: conversations.filter(c => c.buyer_id  === userId).length },
    { key: "selling", label: "Selling",    count: conversations.filter(c => c.seller_id === userId).length },
  ] as const;

  /* ── RENDER ── */
  return (
    <main className="min-h-screen bg-[#F6F3EF] text-[#2B0A0F]">

      {/* ── HEADER ── */}
      <div className="pt-20 sm:pt-28 pb-0 px-4 sm:px-8 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Title row */}
          <div className="flex items-start sm:items-end justify-between gap-4 mb-6 sm:mb-10 flex-wrap">
            <div>
              <p className="text-[9px] sm:text-[10px] tracking-[0.4em] uppercase opacity-40 mb-2 sm:mb-3">
                Archive Inbox
              </p>
              <h1
                className="leading-none"
                style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(2rem,5vw,4rem)" }}
              >
                Messages
              </h1>
            </div>

            {/* Active threads pill */}
            {conversations.length > 0 && (
              <div className="flex items-center gap-2 bg-[#2B0A0F] text-[#F6F3EF] rounded-full px-3 sm:px-4 py-2 self-start sm:self-auto">
                <span className="relative flex h-[6px] w-[6px] flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B48A5A] opacity-70" />
                  <span className="relative inline-flex rounded-full h-[6px] w-[6px] bg-[#B48A5A]" />
                </span>
                <span className="text-[9px] sm:text-[10px] tracking-[0.15em] sm:tracking-[0.2em] uppercase text-[#B48A5A] whitespace-nowrap">
                  {unreadCount > 0
                    ? `${unreadCount} unread`
                    : `${conversations.length} thread${conversations.length !== 1 ? "s" : ""}`}
                </span>
              </div>
            )}
          </div>

          {/* Search bar */}
          {conversations.length > 3 && (
            <div className="relative mb-5">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" width="12" height="12" viewBox="0 0 16 16" fill="none">
                <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs bg-white/70 border border-[#2B0A0F]/10 rounded-full outline-none focus:border-[#2B0A0F]/30 focus:bg-white transition-all"
              />
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex gap-0 border-b border-[#2B0A0F]/08">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`relative px-3 sm:px-5 py-2.5 sm:py-3 text-[9px] sm:text-[10px] tracking-[0.2em] sm:tracking-[0.25em] uppercase transition-colors ${
                  filter === tab.key
                    ? "text-[#2B0A0F]"
                    : "text-[#2B0A0F]/35 hover:text-[#2B0A0F]/70"
                }`}
              >
                {tab.label}
                <span className="ml-1 opacity-35">({tab.count})</span>
                {filter === tab.key && (
                  <motion.div
                    layoutId="tab-underline"
                    className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#2B0A0F]"
                  />
                )}
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── CONVERSATION LIST ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-4 sm:py-6">

        {/* Loading */}
        {loading && <ConvSkeleton />}

        {/* Not logged in */}
        {!loading && !userId && (
          <div className="py-20 sm:py-24 text-center border border-dashed border-[#2B0A0F]/10 rounded-2xl">
            <p className="text-[10px] uppercase tracking-[0.3em] opacity-30 mb-5">
              You need to be logged in
            </p>
            <Link href="/login">
              <button className="px-6 py-3 bg-[#2B0A0F] text-[#F6F3EF] rounded-full text-[10px] tracking-[0.2em] uppercase hover:opacity-80 transition-opacity">
                Log In
              </button>
            </Link>
          </div>
        )}

        {/* Empty state */}
        {!loading && userId && filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-20 sm:py-24 flex flex-col items-center gap-4 border border-dashed border-[#2B0A0F]/10 rounded-2xl"
          >
            <p className="text-2xl sm:text-3xl opacity-20" style={{ fontFamily: "var(--font-playfair)" }}>
              Quiet in here.
            </p>
            <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.3em] opacity-30 text-center px-6">
              {search
                ? `No conversations matching "${search}"`
                : filter === "all"
                ? "No conversations yet."
                : filter === "buying"
                ? "You haven't messaged any sellers yet."
                : "No one has messaged you about your pieces yet."}
            </p>
            {!search && (
              <Link href="/buy">
                <button className="mt-2 px-6 py-3 border border-[#2B0A0F]/20 rounded-full text-[9px] sm:text-[10px] tracking-[0.2em] uppercase hover:bg-[#2B0A0F] hover:text-[#F6F3EF] transition-all">
                  Browse the Archive →
                </button>
              </Link>
            )}
          </motion.div>
        )}

        {/* Conversations */}
        <AnimatePresence>
          {!loading && userId && filtered.length > 0 && (
            <div className="space-y-2">
               {filtered.map((conv, i) => (
  <ConvCard
    key={conv.id}
    conv={conv}
    userId={userId}
    index={i}
    lastReadAt={lastReadMap[conv.id] ?? null}
  />
))}
            </div>
          )}
        </AnimatePresence>

        {/* Result count when searching */}
        {search && filtered.length > 0 && (
          <p className="text-center text-[9px] uppercase tracking-[0.2em] opacity-30 mt-6">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} for "{search}"
          </p>
        )}
      </div>
    </main>
  );
}