"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase";
import { useVisualViewport } from "../../hooks/useVisualViewport";

export default function ChatDetailPage() {
  const { id } = useParams();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [buyerId, setBuyerId] = useState<string | null>(null);
  const [productStatus, setProductStatus] = useState("available");
  const [productId, setProductId] = useState<string | null>(null);
  const [product, setProduct] = useState<any>(null);
  const [otherProfile, setOtherProfile] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingChannelRef = useRef<any>(null);
  const isLoadingMoreRef = useRef(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [otherIsTyping, setOtherIsTyping] = useState(false);
  const viewportHeight = useVisualViewport();
  const PAGE_SIZE = 50;

  /* ── Effect 1: init data once when page loads ── */
  useEffect(() => {
    const initChat = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: conv } = await supabase
        .from("conversations")
        .select(`
          product_id,
          seller_id,
          buyer_id,
          products (id, title, image_url, price, status, location, size, condition)
        `)
        .eq("id", id)
        .single();

      if (conv) {
        setProductId(conv.product_id);
        setSellerId(conv.seller_id);
        setBuyerId(conv.buyer_id);
        setProductStatus((conv.products as any)?.status || "available");
        setProduct(conv.products);

        const otherId = user.id === conv.seller_id ? conv.buyer_id : conv.seller_id;
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", otherId)
          .single();
        setOtherProfile(profile);

        // Create or update participant row — marks conversation as read on open
        await supabase
          .from("conversation_participants")
          .upsert(
            {
              conversation_id: id as string,
              user_id: user.id,
              last_read_at: new Date().toISOString(),
            },
            { onConflict: "conversation_id,user_id" }
          );
      }
    };

    initChat();
    fetchMessages();
    // Note: markAsRead is called inside initChat after user is confirmed
  }, [id]);

  /* ── Effect 2: real-time messages ── */
  useEffect(() => {
    const messageChannel = supabase
      .channel(`chat-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => {
          setMessages((prev) => {
            if (prev.find((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          // If user has this tab open and visible, mark as read immediately
          if (document.visibilityState === "visible") markAsRead();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(messageChannel); };
  }, [id]);

  /* ── Effect 3: real-time product status ── */
  useEffect(() => {
    if (!productId) return;
    const productChannel = supabase
      .channel(`product-${productId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "products", filter: `id=eq.${productId}` },
        (payload) => {
          setProductStatus(payload.new.status);
          setProduct((prev: any) => ({ ...prev, status: payload.new.status }));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(productChannel); };
  }, [productId]);

  /* ── Effect 4: typing indicator via presence ── */
  useEffect(() => {
  if (!userId) return;

  const typingChannel = supabase.channel(`typing-${id}`, {
    config: { presence: { key: userId } }
  });
  // Add this line right after typingChannel is created
  typingChannelRef.current = typingChannel;

  typingChannel
    .on("presence", { event: "sync" }, () => {
      const state = typingChannel.presenceState();
      // Check if anyone other than me is present and typing
      const othersTyping = Object.keys(state)
        .filter((key) => key !== userId)
        .some((key) => (state[key] as any)[0]?.isTyping === true);
      setOtherIsTyping(othersTyping);
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await typingChannel.track({ isTyping: false });
      }
    });

  return () => { supabase.removeChannel(typingChannel); };
}, [userId, id]);

/* ── Effect 5: cleanup typing timeout ── */
useEffect(() => {
  return () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };
}, []);

  /* ── AUTO SCROLL ── */
  useEffect(() => {
  if (isLoadingMoreRef.current) return; // don't scroll when loading older messages
  scrollRef.current?.scrollIntoView({ behavior: "smooth" });
}, [messages]);

useEffect(() => {
  // Prevent body scroll on iOS when chat is open
  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.width = "100%";
  return () => {
    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.width = "";
  };
}, []);

  /* ── FETCH MESSAGES ── */
  const fetchMessages = async () => {
  const { data, error, count } = await supabase
    .from("messages")
    .select("*", { count: "exact" })
    .eq("conversation_id", id)
    .order("created_at", { ascending: false }) // newest first so we can slice from end
    .range(0, PAGE_SIZE - 1);

  if (error) {
    setLoadError("Couldn't load messages. Pull down to retry.");
    return;
  }

  if (data) {
    const sorted = [...data].reverse(); // flip back to chronological order
    setMessages(sorted);
    setOffset(PAGE_SIZE);
    setHasMore((count ?? 0) > PAGE_SIZE);
  }
};

const loadMoreMessages = async () => {
  if (loadingMore || !hasMore) return;
  setLoadingMore(true);
  isLoadingMoreRef.current = true;

  const { data, error, count } = await supabase
    .from("messages")
    .select("*", { count: "exact" })
    .eq("conversation_id", id)
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (error) {
    isLoadingMoreRef.current = false;
    setLoadingMore(false);
    return;
  }

  if (data) {
    const sorted = [...data].reverse();
    setMessages((prev) => [...sorted, ...prev]); // prepend older messages
    setOffset((prev) => prev + PAGE_SIZE);
    setHasMore((count ?? 0) > offset + PAGE_SIZE);
  }

  setLoadingMore(false);
};

  /* ── MARK AS READ ── */
  const markAsRead = async () => {
    if (!userId) return;
    await supabase
      .from("conversation_participants")
      .upsert(
        { conversation_id: id, user_id: userId, last_read_at: new Date().toISOString() },
        { onConflict: "conversation_id,user_id" }
      );
  };

  /* ── SEND MESSAGE ── */
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userId || sending) return;

    const text = newMessage.trim();
    setNewMessage("");
    typingChannelRef.current?.track({ isTyping: false }); // ← add this
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setSending(true);

    // Optimistic message — appears instantly before DB confirms
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMsg = {
      id: optimisticId,
      conversation_id: id,
      text,
      sender_id: userId,
      created_at: new Date().toISOString(),
      receiver_id: null,
      product_id: null,
      _sending: true,
      _failed: false,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    const { error } = await supabase.from("messages").insert([{
      conversation_id: id,
      text,
      sender_id: userId,
    }]);

    if (error) {
      // Mark the optimistic message as failed instead of removing it
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticId ? { ...m, _sending: false, _failed: true } : m
        )
      );
      setSendError("Message failed to send. Tap to retry.");
    } else {
      // Remove optimistic message — real one will arrive via real-time
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    }

    setSending(false);
    inputRef.current?.focus();
  };

  /* ── RETRY FAILED MESSAGE ── */
  const retryMessage = async (failedMsg: any) => {
    setMessages((prev) => prev.filter((m) => m.id !== failedMsg.id));
    setSendError(null);
    setNewMessage(failedMsg.text);
    inputRef.current?.focus();
  };

  /* ── MARK AS SOLD ── */
  const markAsSold = async () => {
    if (!productId) return;
    const { error } = await supabase
      .from("products")
      .update({ status: "sold" })
      .eq("id", productId);
    if (!error) setProductStatus("sold");
  };

  const isSold = productStatus === "sold";
  const isSeller = userId === sellerId;

  /* ── GROUP MESSAGES BY DATE ── */
  const groupedMessages = messages.reduce((groups: any, msg) => {
    const raw = msg.created_at.includes("T") ? msg.created_at : msg.created_at.replace(" ", "T");
    const date = new Date(raw.endsWith("Z") ? raw : raw + "Z").toLocaleDateString("en-IN", {
      weekday: "long", day: "numeric", month: "long",
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  return (
    <main className="min-h-screen bg-[#F6F3EF] flex flex-col">

      {/* ── HEADER ── */}
      <div className="fixed top-[64px] left-0 right-0 z-40 bg-[#F6F3EF]/95 backdrop-blur-md border-b border-[#2B0A0F]/08">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-5">

          {/* Back */}
          <Link
            href="/messages"
            className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity flex-shrink-0"
          >
            ← Inbox
          </Link>

          <span className="w-px h-5 bg-[#2B0A0F]/10 flex-shrink-0" />

          {/* Product thumbnail + info */}
          {product && (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative w-9 h-11 flex-shrink-0 overflow-hidden rounded-sm bg-[#EAE3DB]">
                <Image
                  src={product.image_url || "/final.png"}
                  alt={product.title}
                  fill
                  className="object-cover"
                />
                {isSold && (
                  <div className="absolute inset-0 bg-[#2B0A0F]/50" />
                )}
              </div>
              <div className="min-w-0">
                <p
                  className="text-sm font-medium truncate leading-tight"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  {product.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] opacity-50" style={{ fontFamily: "var(--font-playfair)" }}>
                    ₹{product.price}
                  </span>
                  {product.size && (
                    <>
                      <span className="w-px h-2.5 bg-[#2B0A0F]/15" />
                      <span className="text-[9px] uppercase tracking-[0.15em] opacity-40">
                        Size {product.size}
                      </span>
                    </>
                  )}
                  {product.location && (
                    <>
                      <span className="w-px h-2.5 bg-[#2B0A0F]/15" />
                      <span className="text-[9px] uppercase tracking-[0.15em] opacity-40">
                        {product.location}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Other person's name */}
          {otherProfile && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-7 h-7 rounded-full bg-[#EAE3DB] flex items-center justify-center text-[10px] font-medium overflow-hidden">
                {otherProfile.avatar_url ? (
                  <Image src={otherProfile.avatar_url} alt="" width={28} height={28} className="object-cover" />
                ) : (
                  <span>{(otherProfile.full_name || "?")[0].toUpperCase()}</span>
                )}
              </div>
              <span className="text-[10px] uppercase tracking-[0.15em] opacity-50">
                {otherProfile.full_name || "Curator"}
              </span>
            </div>
          )}

          {/* Seller: Mark as sold */}
          {isSeller && !isSold && (
            <button
              onClick={markAsSold}
              className="flex-shrink-0 text-[9px] uppercase tracking-[0.18em] border border-[#2B0A0F]/25 px-3 py-1.5 rounded-full hover:bg-[#2B0A0F] hover:text-[#F6F3EF] hover:border-[#2B0A0F] transition-all"
            >
              Mark Sold
            </button>
          )}
        </div>
      </div>

      {/* ── SOLD BANNER ── */}
      <AnimatePresence>
        {isSold && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="fixed top-[120px] left-0 right-0 z-30 bg-[#2B0A0F] text-[#F6F3EF] text-[9px] uppercase tracking-[0.4em] py-2.5 text-center"
          >
            — This Archive Piece is Sold · Thread Archived —
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MESSAGES AREA ── */}
      <div
  className="flex-1 overflow-y-auto px-6"
  style={{
    paddingTop: isSold ? "168px" : "136px",
    paddingBottom: `${Math.max(112, window.innerHeight - viewportHeight + 112)}px`,
    maxWidth: "760px",
    margin: "0 auto",
    width: "100%"
  }}
>

        {/* Load error */}
        {loadError && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 mb-4 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-[11px] text-red-400">{loadError}</p>
            <button
              onClick={() => { setLoadError(null); fetchMessages(); }}
              className="text-[10px] uppercase tracking-widest text-red-400 hover:text-red-600"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {messages.length === 0 && !loadError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center pt-20 gap-3"
          >
            <p
              className="text-2xl opacity-15"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Start the conversation.
            </p>
            <p className="text-[9px] uppercase tracking-[0.3em] opacity-25">
              Ask about condition, sizing, or make an offer.
            </p>
          </motion.div>
        )}
        {/* Load earlier messages */}
{hasMore && (
  <div className="flex justify-center mb-4">
    <button
      onClick={loadMoreMessages}
      disabled={loadingMore}
      className="flex items-center gap-2 text-[9px] uppercase tracking-[0.25em] opacity-40 hover:opacity-100 transition-opacity disabled:opacity-20"
    >
      {loadingMore ? (
        <>
          <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
          </svg>
          Loading...
        </>
      ) : (
        "↑ Load earlier messages"
      )}
    </button>
  </div>
)}

        {/* Grouped messages */}
        {Object.entries(groupedMessages).map(([date, msgs]: [string, any]) => (
          <div key={date}>

            {/* Date divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-[#2B0A0F]/06" />
              <span className="text-[9px] uppercase tracking-[0.25em] opacity-30 flex-shrink-0">
                {date}
              </span>
              <div className="flex-1 h-px bg-[#2B0A0F]/06" />
            </div>

            {/* Messages */}
            <div className="space-y-2">
              {msgs.map((m: any, idx: number) => {
                const isMe = m.sender_id === userId;
                const prevMsg = idx > 0 ? msgs[idx - 1] : null;
                const isSameAsPrev = prevMsg?.sender_id === m.sender_id;

                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${isMe ? "justify-end" : "justify-start"} ${isSameAsPrev ? "mt-1" : "mt-4"}`}
                  >
                    <div className={`max-w-[72%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                      <div
                        onClick={() => m._failed && retryMessage(m)}
                        className={`px-5 py-3 text-sm leading-relaxed transition-opacity ${
                          isMe
                            ? "bg-[#2B0A0F] text-[#F6F3EF] rounded-[18px] rounded-br-[4px]"
                            : "bg-white text-[#2B0A0F] border border-[#2B0A0F]/08 rounded-[18px] rounded-bl-[4px]"
                        } ${m._sending ? "opacity-50" : ""} ${m._failed ? "opacity-50 cursor-pointer border border-red-300" : ""}`}
                      >
                        {m.text}
                        {m._failed && (
                          <span className="block text-[9px] text-red-400 mt-1">
                            Failed — tap to retry
                          </span>
                        )}
                      </div>

                      {/* Timestamp with UTC fix — hidden while sending or failed */}
                      {(idx === msgs.length - 1 || msgs[idx + 1]?.sender_id !== m.sender_id) && !m._sending && !m._failed && (
                        <span className={`text-[9px] opacity-30 mt-1.5 ${isMe ? "pr-1" : "pl-1"}`}>
                          {(() => {
                            const raw = m.created_at.includes("T") ? m.created_at : m.created_at.replace(" ", "T");
                            return new Date(raw.endsWith("Z") ? raw : raw + "Z")
                              .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                          })()}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
        {/* Typing indicator */}
<AnimatePresence>
  {otherIsTyping && (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.2 }}
      className="flex justify-start mt-4"
    >
      <div className="bg-white border border-[#2B0A0F]/08 rounded-[18px] rounded-bl-[4px] px-5 py-3 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#2B0A0F]/30 animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-[#2B0A0F]/30 animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-[#2B0A0F]/30 animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </motion.div>
  )}
</AnimatePresence>

<div ref={scrollRef} />

        <div ref={scrollRef} />
      </div>

      {/* ── INPUT BAR ── */}
      <div
  className="fixed left-0 right-0 bg-[#F6F3EF]/95 backdrop-blur-md border-t border-[#2B0A0F]/08 z-40 transition-transform duration-100"
  style={{
    bottom: 0,
    transform: `translateY(-${Math.max(0, window.innerHeight - viewportHeight)}px)`
  }}
>
        <div className="max-w-[760px] mx-auto px-6 py-4">
          {isSold ? (
            <div className="text-center py-2">
              <p className="text-[10px] uppercase tracking-[0.3em] opacity-30">
                This thread is archived · Piece has been sold
              </p>
            </div>
          ) : (
            <>
              {/* Send error banner */}
              {sendError && (
                <div className="flex items-center justify-between gap-3 px-2 py-2 mb-2">
                  <p className="text-[10px] text-red-400">{sendError}</p>
                  <button
                    onClick={() => setSendError(null)}
                    className="text-[10px] uppercase tracking-widest text-red-400 hover:text-red-600"
                  >
                    Dismiss
                  </button>
                </div>
              )}
              <form onSubmit={sendMessage} className="flex items-center gap-3">
                <input
                  ref={inputRef}
                  suppressHydrationWarning
                  className="flex-1 bg-white border border-[#2B0A0F]/12 rounded-full px-5 py-3 text-sm outline-none focus:border-[#2B0A0F]/40 transition-colors placeholder:opacity-30"
                  placeholder="Write a message..."
                  value={newMessage}
                  onChange={(e) => {
  setNewMessage(e.target.value);

  // Broadcast that I'm typing
  typingChannelRef.current?.track({ isTyping: true });

  // Stop typing indicator after 2 seconds of no input
  if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  typingTimeoutRef.current = setTimeout(() => {
    typingChannelRef.current?.track({ isTyping: false });
  }, 2000);
}}
                    
                />
                <motion.button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  whileTap={{ scale: 0.95 }}
                  className="w-11 h-11 rounded-full bg-[#2B0A0F] text-[#F6F3EF] flex items-center justify-center flex-shrink-0 disabled:opacity-25 hover:bg-[#1A060B] transition-colors"
                >
                  {sending ? (
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </motion.button>
              </form>
            </>
          )}
        </div>
      </div>

    </main>
  );
}