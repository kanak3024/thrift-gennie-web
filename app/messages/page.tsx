"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";

export default function MessagesPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "buying" | "selling">("all");

  useEffect(() => {
    const initSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchConversations(user.id);
      } else {
        setLoading(false);
      }
    };
    initSession();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("inbox-updates")
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => fetchConversations(userId)
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const fetchConversations = async (currentId: string) => {
    setLoading(true);
    const { data, error } = await supabase
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
      .order("created_at", { foreignTable: "messages", ascending: false });

    if (!error && data) setConversations(data);
    setLoading(false);
  };

  const filtered = conversations.filter((conv) => {
    if (filter === "buying") return conv.buyer_id === userId;
    if (filter === "selling") return conv.seller_id === userId;
    return true;
  });

  const unreadCount = conversations.length; // extend with read tracking later

  return (
    <main className="min-h-screen bg-[#F6F3EF] text-[#2B0A0F]">

      {/* ── PAGE HEADER ── */}
      <div className="pt-28 pb-0 px-8 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Top row */}
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-[10px] tracking-[0.4em] uppercase opacity-40 mb-3">
                Archive Inbox
              </p>
              <h1
                className="leading-none"
                style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(2.8rem,5vw,4rem)" }}
              >
                Messages
              </h1>
            </div>

            {/* Conversation count pill */}
            {conversations.length > 0 && (
              <div className="flex items-center gap-2 bg-[#2B0A0F] text-[#F6F3EF] rounded-full px-4 py-2">
                <span className="relative flex h-[6px] w-[6px]">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B48A5A] opacity-70" />
                  <span className="relative inline-flex rounded-full h-[6px] w-[6px] bg-[#B48A5A]" />
                </span>
                <span className="text-[10px] tracking-[0.2em] uppercase text-[#B48A5A]">
                  {conversations.length} thread{conversations.length !== 1 ? "s" : ""} active
                </span>
              </div>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 border-b border-[#2B0A0F]/08 mb-0">
            {(["all", "buying", "selling"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`relative px-5 py-3 text-[10px] tracking-[0.25em] uppercase transition-colors ${
                  filter === tab
                    ? "text-[#2B0A0F]"
                    : "text-[#2B0A0F]/35 hover:text-[#2B0A0F]/70"
                }`}
              >
                {tab === "all" ? "All" : tab === "buying" ? "I'm Buying" : "I'm Selling"}
                {filter === tab && (
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
      <div className="max-w-4xl mx-auto px-8 py-6">

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-5 p-5 border border-[#2B0A0F]/08 animate-pulse">
                <div className="w-16 h-20 bg-[#EAE3DB] flex-shrink-0" />
                <div className="flex-1 space-y-3 py-1">
                  <div className="h-3 bg-[#EAE3DB] rounded w-1/3" />
                  <div className="h-3 bg-[#EAE3DB] rounded w-2/3" />
                  <div className="h-3 bg-[#EAE3DB] rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Not logged in */}
        {!loading && !userId && (
          <div className="py-24 text-center border border-dashed border-[#2B0A0F]/10">
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
            className="py-24 text-center border border-dashed border-[#2B0A0F]/10"
          >
            <p
              className="text-3xl mb-3 opacity-20"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Quiet in here.
            </p>
            <p className="text-[10px] uppercase tracking-[0.3em] opacity-30 mb-8">
              {filter === "all"
                ? "No conversations yet."
                : filter === "buying"
                ? "You haven't messaged any sellers yet."
                : "No one has messaged you about your pieces yet."}
            </p>
            <Link href="/buy">
              <button className="px-6 py-3 border border-[#2B0A0F]/20 rounded-full text-[10px] tracking-[0.2em] uppercase hover:bg-[#2B0A0F] hover:text-[#F6F3EF] transition-all">
                Browse the Archive →
              </button>
            </Link>
          </motion.div>
        )}

        {/* Conversations */}
        <AnimatePresence>
          {!loading && userId && (
            <div className="space-y-2">
              {filtered.map((conv, i) => {
                const lastMessage = conv.messages?.[conv.messages.length - 1]
                  ?? conv.messages?.[0];
                const isSeller = conv.seller_id === userId;
                const isSold = conv.products?.status === "sold";
                const isLastMine = lastMessage?.sender_id === userId;

                return (
                  <motion.div
                    key={conv.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <Link href={`/messages/${conv.id}`} className="group block">
                      <div className="flex items-stretch gap-0 border border-[#2B0A0F]/08 hover:border-[#2B0A0F]/25 bg-white hover:bg-[#FDFCFB] transition-all duration-300 overflow-hidden">

                        {/* Product image */}
                        <div className="relative w-[72px] flex-shrink-0 bg-[#EAE3DB] overflow-hidden">
                          <Image
                            src={conv.products?.image_url || "/final.png"}
                            alt={conv.products?.title || "Piece"}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-700"
                          />
                          {isSold && (
                            <div className="absolute inset-0 bg-[#2B0A0F]/60 flex items-center justify-center">
                              <span className="text-[8px] uppercase tracking-[0.2em] text-[#F6F3EF] rotate-[-20deg]">
                                Sold
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 px-6 py-4 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-1.5">
                            <h2
                              className="text-base font-medium truncate"
                              style={{ fontFamily: "var(--font-playfair)" }}
                            >
                              {conv.products?.title || "Untitled Piece"}
                            </h2>
                            <span className="text-[9px] uppercase tracking-widest opacity-30 flex-shrink-0 mt-0.5">
                              {lastMessage
                                ? new Date(lastMessage.created_at).toLocaleDateString("en-IN", {
                                    day: "numeric", month: "short"
                                  })
                                : ""}
                            </span>
                          </div>

                          {/* Last message preview */}
                          <p className="text-xs opacity-50 truncate italic pr-6">
                            {lastMessage
                              ? `${isLastMine ? "You: " : ""}${lastMessage.text}`
                              : "No messages yet..."}
                          </p>

                          {/* Meta row */}
                          <div className="flex items-center gap-3 mt-3">
                            {conv.products?.price && (
                              <span
                                className="text-xs opacity-60"
                                style={{ fontFamily: "var(--font-playfair)" }}
                              >
                                ₹{conv.products.price}
                              </span>
                            )}
                            <span className="w-px h-3 bg-[#2B0A0F]/15" />
                            <span className={`text-[9px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-full ${
                              isSeller
                                ? "bg-[#B48A5A]/10 text-[#B48A5A]"
                                : "bg-[#2B0A0F]/06 text-[#2B0A0F]/50"
                            }`}>
                              {isSeller ? "Selling" : "Buying"}
                            </span>
                            {isSold && (
                              <span className="text-[9px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-full bg-[#2B0A0F]/08 text-[#2B0A0F]/40">
                                Archived
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Arrow */}
                        <div className="flex items-center pr-5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                          <span className="text-lg opacity-40">→</span>
                        </div>

                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
