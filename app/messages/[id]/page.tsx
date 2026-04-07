"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase";

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ── INIT ── */
  useEffect(() => {
    const initChat = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Fetch conversation + product + profiles
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
        setProductStatus(conv.products?.status || "available");
        setProduct(conv.products);

        // Fetch the OTHER person's profile
        const otherId = user.id === conv.seller_id ? conv.buyer_id : conv.seller_id;
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", otherId)
          .single();
        setOtherProfile(profile);
      }
    };

    initChat();
    fetchMessages();

    // Real-time messages
    const messageChannel = supabase
      .channel(`chat-${id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => {
          setMessages((prev) => {
            if (prev.find((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    // Real-time product status
    const productChannel = supabase
      .channel("product-status")
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "products" },
        (payload) => {
          if (payload.new.id === productId) {
            setProductStatus(payload.new.status);
            setProduct((prev: any) => ({ ...prev, status: payload.new.status }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(productChannel);
    };
  }, [id, productId]);

  /* ── AUTO SCROLL ── */
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── FETCH MESSAGES ── */
  const fetchMessages = async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });
    if (data) setMessages(data);
  };

  /* ── SEND MESSAGE ── */
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userId || sending) return;

    const text = newMessage.trim();
    setNewMessage("");
    setSending(true);

    const { error } = await supabase.from("messages").insert([{
      conversation_id: id,
      text,
      sender_id: userId,
    }]);

    if (error) {
      console.error("Send Error:", error.message);
      setNewMessage(text);
    }
    setSending(false);
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
    const date = new Date(msg.created_at).toLocaleDateString("en-IN", {
      weekday: "long", day: "numeric", month: "long"
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
        className="flex-1 overflow-y-auto px-6 pb-28"
        style={{ paddingTop: isSold ? "168px" : "136px", maxWidth: "760px", margin: "0 auto", width: "100%" }}
      >

        {/* Empty state */}
        {messages.length === 0 && (
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
                      <div className={`px-5 py-3 text-sm leading-relaxed ${
                        isMe
                          ? "bg-[#2B0A0F] text-[#F6F3EF] rounded-[18px] rounded-br-[4px]"
                          : "bg-white text-[#2B0A0F] border border-[#2B0A0F]/08 rounded-[18px] rounded-bl-[4px]"
                      }`}>
                        {m.text}
                      </div>
                      {/* Timestamp — only on last in group or last message */}
                      {(idx === msgs.length - 1 || msgs[idx + 1]?.sender_id !== m.sender_id) && (
                        <span className={`text-[9px] opacity-30 mt-1.5 ${isMe ? "pr-1" : "pl-1"}`}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}

        <div ref={scrollRef} />
      </div>

      {/* ── INPUT BAR ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#F6F3EF]/95 backdrop-blur-md border-t border-[#2B0A0F]/08 z-40">
        <div className="max-w-[760px] mx-auto px-6 py-4">
          {isSold ? (
            <div className="text-center py-2">
              <p className="text-[10px] uppercase tracking-[0.3em] opacity-30">
                This thread is archived · Piece has been sold
              </p>
            </div>
          ) : (
            <form onSubmit={sendMessage} className="flex items-center gap-3">
              <input
                ref={inputRef}
                suppressHydrationWarning
                className="flex-1 bg-white border border-[#2B0A0F]/12 rounded-full px-5 py-3 text-sm outline-none focus:border-[#2B0A0F]/40 transition-colors placeholder:opacity-30"
                placeholder="Write a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
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
          )}
        </div>
      </div>

    </main>
  );
}
