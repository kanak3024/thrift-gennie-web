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
  const [imageUploading, setImageUploading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
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

        // Check if this user is blocked
        const { data: blockData } = await supabase
          .from("blocks")
          .select("id")
          .eq("blocker_id", user.id)
          .eq("blocked_id", otherId)
          .maybeSingle();
        setIsBlocked(!!blockData);

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
    typingChannelRef.current = typingChannel;

    typingChannel
      .on("presence", { event: "sync" }, () => {
        const state = typingChannel.presenceState();
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
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  /* ── Effect 6: prevent body scroll on iOS ── */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    };
  }, []);

  /* ── AUTO SCROLL ── */
  useEffect(() => {
    if (isLoadingMoreRef.current) return;
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── FETCH MESSAGES ── */
  const fetchMessages = async () => {
    const { data, error, count } = await supabase
      .from("messages")
      .select("*", { count: "exact" })
      .eq("conversation_id", id)
      .order("created_at", { ascending: false })
      .range(0, PAGE_SIZE - 1);

    if (error) {
      setLoadError("Couldn't load messages. Pull down to retry.");
      return;
    }

    if (data) {
      const sorted = [...data].reverse();
      setMessages(sorted);
      setOffset(PAGE_SIZE);
      setHasMore((count ?? 0) > PAGE_SIZE);
    }
  };

  /* ── LOAD MORE MESSAGES ── */
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
      setMessages((prev) => [...sorted, ...prev]);
      setOffset((prev) => prev + PAGE_SIZE);
      setHasMore((count ?? 0) > offset + PAGE_SIZE);
    }

    isLoadingMoreRef.current = false;
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
    typingChannelRef.current?.track({ isTyping: false });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setSending(true);

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMsg = {
      id: optimisticId,
      conversation_id: id,
      text,
      sender_id: userId,
      created_at: new Date().toISOString(),
      receiver_id: null,
      product_id: null,
      image_url: null,
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
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticId ? { ...m, _sending: false, _failed: true } : m
        )
      );
      setSendError("Message failed to send. Tap to retry.");
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    }

    setSending(false);
    inputRef.current?.focus();
  };

  /* ── SEND IMAGE ── */
  const sendImage = async (file: File) => {
    if (!userId || imageUploading) return;

    const currentId = id as string;
    if (!currentId) return;

    setImageUploading(true);

    const ext = file.name.split(".").pop();
    const path = `${userId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("chat-images")
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      alert("Failed to upload image");
      setImageUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("chat-images")
      .getPublicUrl(path);

    await supabase.from("messages").insert({
      conversation_id: currentId,
      sender_id: userId,
      text: "",
      image_url: publicUrl,
    });

    setImageUploading(false);
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

  /* ── BLOCK / UNBLOCK ── */
  const handleBlock = async () => {
    if (!userId || !otherProfile) return;
    setBlockLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    const otherId = sellerId === userId ? buyerId : sellerId;

    await fetch("/api/block", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        blockedId: otherId,
        action: isBlocked ? "unblock" : "block",
      }),
    });

    setIsBlocked((prev) => !prev);
    setBlockLoading(false);
  };

  /* ── REPORT USER ── */
  const handleReport = async () => {
    if (!userId) return;
    const otherId = sellerId === userId ? buyerId : sellerId;
    const reason = window.prompt("Reason for report (spam, harassment, scam, other):");
    if (!reason) return;
    await supabase.from("reports").insert({
      reporter_id: userId,
      reported_id: otherId,
      reason,
    });
    alert("Report submitted. We'll review it shortly.");
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
         <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">

  {/* Back */}
  <Link
    href="/messages"
    className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity flex-shrink-0"
  >
    ← <span className="hidden sm:inline">Inbox</span>
  </Link>

  <span className="w-px h-5 bg-[#2B0A0F]/10 flex-shrink-0" />

  {/* Product info */}
  {product && (
    <div className="flex items-center gap-2.5 flex-1 min-w-0">
      <div className="relative w-8 h-10 flex-shrink-0 overflow-hidden rounded-sm bg-[#EAE3DB]">
        <Image
          src={product.image_url || "/final.png"}
          alt={product.title}
          fill
          className="object-cover"
        />
        {isSold && <div className="absolute inset-0 bg-[#2B0A0F]/50" />}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate leading-tight" style={{ fontFamily: "var(--font-playfair)" }}>
          {product.title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-[10px] opacity-50" style={{ fontFamily: "var(--font-playfair)" }}>
            ₹{product.price}
          </span>
          {product.size && (
            <span className="text-[9px] uppercase tracking-[0.15em] opacity-35">· {product.size}</span>
          )}
          {product.location && (
            <span className="text-[9px] uppercase tracking-[0.15em] opacity-35 hidden sm:inline">· {product.location}</span>
          )}
        </div>
      </div>
    </div>
  )}

  {/* Other person avatar only on mobile, name on desktop */}
  {otherProfile && (
    <div className="flex items-center gap-2 flex-shrink-0">
      <div className="w-7 h-7 rounded-full bg-[#EAE3DB] flex items-center justify-center text-[10px] font-medium overflow-hidden flex-shrink-0">
        {otherProfile.avatar_url ? (
          <Image src={otherProfile.avatar_url} alt="" width={28} height={28} className="object-cover" />
        ) : (
          <span>{(otherProfile.full_name || "?")[0].toUpperCase()}</span>
        )}
      </div>
      <span className="hidden sm:inline text-[10px] uppercase tracking-[0.15em] opacity-50 truncate max-w-[80px]">
        {otherProfile.full_name}
      </span>
    </div>
  )}

  {/* Mark sold — text on desktop, icon on mobile */}
  {isSeller && !isSold && (
    <button
      onClick={markAsSold}
      className="flex-shrink-0 text-[9px] uppercase tracking-[0.15em] border border-[#2B0A0F]/25 px-2.5 sm:px-3 py-1.5 rounded-full hover:bg-[#2B0A0F] hover:text-[#F6F3EF] transition-all whitespace-nowrap"
    >
      <span className="hidden sm:inline">Mark Sold</span>
      <span className="sm:hidden">Sold</span>
    </button>
  )}

  {/* ⋮ menu for block + report */}
  <div className="relative flex-shrink-0 group">
    <button className="w-8 h-8 rounded-full border border-[#2B0A0F]/20 flex items-center justify-center text-[#2B0A0F]/40 hover:text-[#2B0A0F] hover:border-[#2B0A0F]/40 transition-all text-base leading-none">
      ⋮
    </button>
    <div className="absolute right-0 top-10 w-36 bg-white rounded-xl border border-[#2B0A0F]/08 shadow-xl overflow-hidden text-[10px] uppercase tracking-[0.15em] z-50 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all">
      {!isSeller && (
        <button
          onClick={handleBlock}
          disabled={blockLoading}
          className="block w-full text-left px-4 py-3 hover:bg-[#F6F3EF] transition-colors border-b border-[#2B0A0F]/05 disabled:opacity-40"
        >
          {blockLoading ? "..." : isBlocked ? "Unblock" : "Block"}
        </button>
      )}
      <button
        onClick={handleReport}
        className="block w-full text-left px-4 py-3 text-[#A1123F] hover:bg-[#A1123F]/05 transition-colors"
      >
        Report
      </button>
      </div>
        </div>
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

      {/* ── BLOCKED BANNER ── */}
      <AnimatePresence>
        {isBlocked && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="fixed top-[120px] left-0 right-0 z-30 bg-red-500 text-white text-[9px] uppercase tracking-[0.4em] py-2.5 text-center"
          >
            — You have blocked this user —
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MESSAGES AREA ── */}
      <div
        className="flex-1 overflow-y-auto px-6"
        style={{
          paddingTop: isSold || isBlocked ? "168px" : "136px",
          paddingBottom: `${Math.max(176, window.innerHeight - viewportHeight + 176)}px`,
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
            <p className="text-2xl opacity-15" style={{ fontFamily: "var(--font-playfair)" }}>
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
                        className={`text-sm leading-relaxed transition-opacity ${
                          m.image_url
                            ? "p-0 bg-transparent"
                            : `px-5 py-3 ${isMe
                                ? "bg-[#2B0A0F] text-[#F6F3EF] rounded-[18px] rounded-br-[4px]"
                                : "bg-white text-[#2B0A0F] border border-[#2B0A0F]/08 rounded-[18px] rounded-bl-[4px]"
                              }`
                        } ${m._sending ? "opacity-50" : ""} ${m._failed ? "opacity-50 cursor-pointer border border-red-300" : ""}`}
                      >
                        {m.image_url ? (
                          <div className="relative rounded-2xl overflow-hidden max-w-[220px]">
                            <Image
                              src={m.image_url}
                              alt="Shared image"
                              width={220}
                              height={280}
                              className="object-cover rounded-2xl"
                              style={{ maxHeight: "280px" }}
                            />
                          </div>
                        ) : (
                          <>
                            {m.text}
                            {m._failed && (
                              <span className="block text-[9px] text-red-400 mt-1">
                                Failed — tap to retry
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      {/* Timestamp with UTC fix */}
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
      </div>

      {/* ── INPUT BAR ── */}
      <div
        className="fixed left-0 right-0 bg-[#F6F3EF]/95 backdrop-blur-md border-t border-[#2B0A0F]/08 z-40 transition-transform duration-100"
        style={{
          bottom: "64px",
          transform: `translateY(-${Math.max(0, window.innerHeight - viewportHeight)}px)`
        }}
      >
        <div className="max-w-[760px] mx-auto px-6 py-4">
          {isSold || isBlocked ? (
            <div className="text-center py-2">
              <p className="text-[10px] uppercase tracking-[0.3em] opacity-30">
                {isBlocked
                  ? "You have blocked this user"
                  : "This thread is archived · Piece has been sold"}
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

                {/* Hidden file input */}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) sendImage(file);
                    e.target.value = "";
                  }}
                />

                {/* Image upload button */}
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={imageUploading}
                  className="w-10 h-10 rounded-full border border-[#2B0A0F]/15 flex items-center justify-center flex-shrink-0 text-[#2B0A0F]/40 hover:text-[#2B0A0F] hover:border-[#2B0A0F]/30 transition-all disabled:opacity-25"
                >
                  {imageUploading ? (
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <path d="M21 15l-5-5L5 21"/>
                    </svg>
                  )}
                </button>

                <input
                  ref={inputRef}
                  suppressHydrationWarning
                  className="flex-1 bg-white border border-[#2B0A0F]/12 rounded-full px-5 py-3 text-sm outline-none focus:border-[#2B0A0F]/40 transition-colors placeholder:opacity-30"
                  placeholder="Write a message..."
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    typingChannelRef.current?.track({ isTyping: true });
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
