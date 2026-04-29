"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";

const SUBJECTS = [
  { value: "General Inquiry",  icon: "✦", label: "General Inquiry" },
  { value: "Order Issue",      icon: "📦", label: "Order Issue" },
  { value: "Payment Problem",  icon: "₹",  label: "Payment Problem" },
  { value: "Seller Concern",   icon: "🏷", label: "Seller Concern" },
  { value: "Report a Problem", icon: "🚩", label: "Report a Problem" },
];

const QUICK_REPLIES = [
  "How does payment work?",
  "How do I return an item?",
  "Is cash on delivery available?",
  "How long does shipping take?",
];

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_MB = 10;

export default function SupportChat() {
  const [open, setOpen]               = useState(false);
  const [user, setUser]               = useState<any>(null);
  const [userRole, setUserRole]       = useState<string | null>(null);  // FIX: track role
  const [ticketId, setTicketId]       = useState<string | null>(null);
  const [messages, setMessages]       = useState<any[]>([]);
  const [newMessage, setNewMessage]   = useState("");
  const [sending, setSending]         = useState(false);
  const [loading, setLoading]         = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [step, setStep]               = useState<"subject" | "chat">("subject");
  const [selectedSubject, setSelectedSubject] = useState("General Inquiry");
  const [pulse, setPulse]             = useState(true);
  const [sendError, setSendError] = useState(false);
  const [agentTyping, setAgentTyping] = useState(false);

  // Attachment state
  const [pendingFile, setPendingFile]       = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [uploading, setUploading]           = useState(false);
  const [uploadError, setUploadError]       = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);

  // FIX: track current ticketId in a ref so realtime cleanup is always in sync
  const ticketIdRef = useRef<string | null>(null);
  useEffect(() => { ticketIdRef.current = ticketId; }, [ticketId]);

   useEffect(() => {
  // Check session immediately (fast, no network call)
  supabase.auth.getSession().then(async ({ data: { session } }) => {
    const u = session?.user;
    if (!u) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", u.id)
      .single();

    const role = profile?.role ?? null;
    setUserRole(role);
    if (role === "admin") return;
    setUser(u);
  });

  // Also listen for auth changes (login/logout)
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
    const u = session?.user;
    if (!u) { setUser(null); setUserRole(null); return; }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", u.id)
      .single();

    const role = profile?.role ?? null;
    setUserRole(role);
    if (role === "admin") return;
    setUser(u);
  });

  const t = setTimeout(() => setPulse(false), 8000);
  return () => {
    subscription.unsubscribe();
    clearTimeout(t);
  };
}, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open && step === "chat") {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open, step]);

  /* ── REALTIME: per-ticket messages ── */
  useEffect(() => {
  if (!ticketId) return;

  const channel = supabase
    .channel(`support-${ticketId}`)
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "support_messages",
      filter: `ticket_id=eq.${ticketId}`,
    }, (payload) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === payload.new.id)) return prev;
        return [...prev, payload.new];
      });
      setAgentTyping(false);
      if (!open && payload.new.is_admin) setUnreadCount((c) => c + 1);
    })
    .on("broadcast", { event: "typing" }, () => {
      setAgentTyping(true);
      setTimeout(() => setAgentTyping(false), 3000);
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [ticketId]);// re-subscribe only when ticketId changes, NOT when open changes

  // Unread badge: clear when panel opens
  useEffect(() => {
    if (open) setUnreadCount(0);
  }, [open]);

  /* ── CHECK FOR EXISTING OPEN TICKET ── */
  useEffect(() => {
    if (!user) return;

    const checkExisting = async () => {
      const { data } = await supabase
        .from("support_tickets")
        .select("id, subject, status")
        .eq("user_id", user.id)
        .in("status", ["open", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setTicketId(data.id);
        setSelectedSubject(data.subject);
        setStep("chat");
        fetchMessages(data.id);
      }
    };

    checkExisting();
  }, [user]);

  const fetchMessages = async (tid: string) => {
    const { data, error } = await supabase
      .from("support_messages")
      .select("*")
      .eq("ticket_id", tid)
      .order("created_at", { ascending: true });
    if (error) console.error("fetchMessages:", error.message);
    if (data) setMessages(data);
  };

    const startTicket = async () => {
  if (!user) return;
  setLoading(true);

  const { data, error } = await supabase
    .from("support_tickets")
    .insert({ user_id: user.id, subject: selectedSubject })
    .select()
    .single();
  
  // rest stays the same...

    if (error) {
      console.error("startTicket:", error.message);
      setLoading(false);
      return;
    }

    if (data) {
      setTicketId(data.id);
      setStep("chat");

      // Insert the automated greeting
      await supabase.from("support_messages").insert({
        ticket_id:     data.id,
        sender_id:     null,
        text:          `Hi there! 👋 You've reached Thrift Gennie support. We've received your inquiry about "${selectedSubject}". Our team usually responds within a few hours. Feel free to describe your issue below — you can also send images if needed.`,
        is_admin:      true,
        read_by_user:  false,
        read_by_admin: true,
      });

      await fetchMessages(data.id);
    }
    setLoading(false);
  };

  /* ── FILE HANDLING ── */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError("Only JPG, PNG and WebP images are allowed.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setUploadError(`Image must be under ${MAX_SIZE_MB}MB.`);
      return;
    }

    setPendingFile(file);
    setPendingPreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const clearPending = () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
    setUploadError(null);
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    const ext  = file.name.split(".").pop();
    const path = `${user.id}/${ticketId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("support-attachments")
      .upload(path, file, { contentType: file.type });
    if (error) { setUploadError("Upload failed. Please try again."); return null; }
    const { data } = supabase.storage.from("support-attachments").getPublicUrl(path);
    return data.publicUrl;
  };

  /* ── SEND MESSAGE ── */
   const sendMessage = async (text?: string) => {
  const msgText = text ?? newMessage;
  if ((!msgText.trim() && !pendingFile) || !ticketId || !user || sending) return;

  setNewMessage("");
  setSending(true);
  setUploadError(null);

  let attachmentUrl: string | null = null;
  if (pendingFile) {
    setUploading(true);
    attachmentUrl = await uploadFile(pendingFile);
    setUploading(false);
    if (!attachmentUrl) { setSending(false); return; }
    clearPending();
  }

  const newMsg = {
    ticket_id:      ticketId,
    sender_id:      user.id,
    text:           msgText.trim() || null,
    attachment_url: attachmentUrl,
    is_admin:       false,
    read_by_user:   true,
    read_by_admin:  false,
  };

  // ✅ Optimistically add to local state immediately
  const optimisticMsg = {
    ...newMsg,
    id: `optimistic-${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  setMessages((prev) => [...prev, optimisticMsg]);

  const { data, error } = await supabase
    .from("support_messages")
    .insert(newMsg)
    .select()
    .single();

  if (error) {
  console.error("sendMessage:", error.message);
  setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
  setSendError(true);
  setTimeout(() => setSendError(false), 4000); // auto-dismiss after 4s
} else if (data) {
  setMessages((prev) =>
    prev.map((m) => (m.id === optimisticMsg.id ? data : m))
  );
}

  setSending(false);
  inputRef.current?.focus();
};

  const closeTicket = async () => {
    if (!ticketId) return;
    await supabase
      .from("support_tickets")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", ticketId);
    setTicketId(null);
    setMessages([]);
    setStep("subject");
  };

  // FIX: Don't render the widget at all for admins or unauthenticated users
  // who haven't loaded yet. Once role is resolved, only show for non-admins.
  if (userRole === "admin") return null;

  return (
    <>
    
      {/* ── FLOATING BUTTON ── */}
  <div className="fixed bottom-24 right-4 md:bottom-6 md:right-6"  >
        <AnimatePresence>
          {pulse && !open && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.95 }}
              className="bg-[#2B0A0F] text-[#F6F3EF] text-[9px] uppercase tracking-[0.2em] px-4 py-2.5 rounded-full shadow-lg whitespace-nowrap"
            >
              Need help? Chat with us ✦
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setOpen((o) => !o)}
          className="relative w-14 h-14 rounded-full bg-[#2B0A0F] text-[#F6F3EF] shadow-2xl flex items-center justify-center hover:scale-105 transition-transform"
        >
          <AnimatePresence mode="wait">
            {open ? (
              <motion.svg
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
                width="18" height="18" viewBox="0 0 24 24" fill="none"
              >
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </motion.svg>
            ) : (
              <motion.svg
                key="chat"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.2 }}
                width="20" height="20" viewBox="0 0 24 24" fill="none"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </motion.svg>
            )}
          </AnimatePresence>

          {unreadCount > 0 && !open && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#A1123F] text-white text-[9px] flex items-center justify-center font-medium">
              {unreadCount}
            </span>
          )}
          {pulse && !open && (
            <span className="absolute inset-0 rounded-full animate-ping bg-[#2B0A0F] opacity-20" />
          )}
        </button>
       </div>

      {/* ── CHAT PANEL ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-36 right-4 md:bottom-24 md:right-6 z-50 w-[calc(100vw-2rem)] md:w-[360px] max-h-[min(600px,calc(100svh-8rem))] flex flex-col bg-[#F6F3EF] rounded-2xl shadow-2xl overflow-hidden border border-[#2B0A0F]/08"
            style={{ boxShadow: "0 32px 80px rgba(43,10,15,0.22)" }}
          >
            {/* HEADER */}
            <div className="bg-[#2B0A0F] px-6 py-5 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-[#B48A5A]/20 border border-[#B48A5A]/30 flex items-center justify-center">
                    <span className="text-[#B48A5A] text-sm">✦</span>
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#6B7E60] border border-[#2B0A0F]" />
                </div>
                <div>
                  <p className="text-[#F6F3EF] text-sm" style={{ fontFamily: "var(--font-playfair)" }}>
                    Thrift Gennie Support
                  </p>
                  <p className="text-[#F6F3EF]/40 text-[9px] uppercase tracking-[0.2em]">
                    Usually replies in a few hours
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center text-[#F6F3EF]/40 hover:text-[#F6F3EF] hover:border-white/30 transition-all text-xs"
              >
                ✕
              </button>
            </div>

            {/* NOT LOGGED IN */}
            {!user ? (
              <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 text-center">
                <p className="text-3xl opacity-20 mb-4" style={{ fontFamily: "var(--font-playfair)" }}>
                  Hello.
                </p>
                <p className="text-[10px] uppercase tracking-[0.3em] opacity-40 mb-6">
                  Log in to chat with our support team
                </p>
                <a
                  href="/login"
                  className="px-6 py-3 bg-[#2B0A0F] text-[#F6F3EF] rounded-full text-[9px] uppercase tracking-[0.2em] hover:opacity-80 transition-opacity"
                >
                  Log In
                </a>
              </div>

            ) : step === "subject" ? (

              /* SUBJECT PICKER */
              <div className="flex-1 flex flex-col overflow-y-auto">
                <div className="px-6 pt-6 pb-4">
                  <p className="text-[10px] uppercase tracking-[0.3em] opacity-40 mb-1">
                    What can we help with?
                  </p>
                  <p className="text-lg" style={{ fontFamily: "var(--font-playfair)" }}>
                    Choose a topic
                  </p>
                </div>
                <div className="px-4 pb-4 space-y-2 flex-1">
                  {SUBJECTS.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setSelectedSubject(s.value)}
                      className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl border transition-all text-left ${
                        selectedSubject === s.value
                          ? "border-[#2B0A0F] bg-[#2B0A0F] text-[#F6F3EF]"
                          : "border-[#2B0A0F]/10 hover:border-[#2B0A0F]/30 bg-white"
                      }`}
                    >
                      <span className="text-base w-5 flex-shrink-0 text-center">{s.icon}</span>
                      <span className="text-[11px] uppercase tracking-[0.15em]">{s.label}</span>
                      {selectedSubject === s.value && (
                        <span className="ml-auto text-[#B48A5A]">✓</span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="px-4 pb-6">
                  <button
                    onClick={startTicket}
                    disabled={loading}
                    className="w-full py-4 bg-[#2B0A0F] text-[#F6F3EF] rounded-full text-[10px] uppercase tracking-[0.25em] hover:opacity-80 transition-opacity disabled:opacity-40"
                  >
                    {loading ? "Starting..." : "Start Chat →"}
                  </button>
                </div>
              </div>

            ) : (

              /* CHAT VIEW */
              <>
                {/* Ticket subject bar */}
                <div className="px-5 py-3 border-b border-[#2B0A0F]/06 bg-[#EAE3DB]/40 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#6B7E60]" />
                    <span className="text-[9px] uppercase tracking-[0.2em] opacity-60">
                      {selectedSubject}
                    </span>
                  </div>
                  <button
                    onClick={closeTicket}
                    className="text-[9px] uppercase tracking-[0.15em] opacity-30 hover:opacity-60 hover:text-[#A1123F] transition-all"
                  >
                    Close ticket
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3 min-h-0">
                  {messages.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-[10px] uppercase tracking-[0.2em] opacity-20">Loading…</p>
                    </div>
                  )}
                  {messages.map((msg, idx) => {
                    const isMe       = !msg.is_admin;
                    const prev       = messages[idx - 1];
                    const sameAsPrev = prev?.is_admin === msg.is_admin;
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`flex ${isMe ? "justify-end" : "justify-start"} ${
                          sameAsPrev ? "mt-1" : "mt-4"
                        }`}
                      >
                        {!isMe && !sameAsPrev && (
                          <div className="w-6 h-6 rounded-full bg-[#2B0A0F] flex items-center justify-center text-[#B48A5A] text-[8px] flex-shrink-0 mr-2 mt-auto mb-1">
                            ✦
                          </div>
                        )}
                        {!isMe && sameAsPrev && <div className="w-8 flex-shrink-0" />}

                        <div className={`max-w-[78%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                          <div
                            className={`px-4 py-3 text-sm leading-relaxed ${
                              isMe
                                ? "bg-[#2B0A0F] text-[#F6F3EF] rounded-[16px] rounded-br-[4px]"
                                : "bg-white text-[#2B0A0F] border border-[#2B0A0F]/08 rounded-[16px] rounded-bl-[4px]"
                            }`}
                          >
                            {msg.attachment_url && (
                              <a
                                href={msg.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block mb-2"
                              >
                                <img
                                  src={msg.attachment_url}
                                  alt="Attachment"
                                  className="rounded-lg max-w-full max-h-48 object-cover"
                                  style={{ display: "block" }}
                                />
                              </a>
                            )}
                            {msg.text && <span>{msg.text}</span>}
                          </div>
                          {(idx === messages.length - 1 ||
                            messages[idx + 1]?.is_admin !== msg.is_admin) && (
                            <span className={`text-[8px] opacity-30 mt-1 ${isMe ? "pr-1" : "pl-1"}`}>
                              {new Date(msg.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                  {/* Typing indicator */}
<AnimatePresence>
  {agentTyping && (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      className="flex justify-start mt-4"
    >
      <div className="w-6 h-6 rounded-full bg-[#2B0A0F] flex items-center justify-center text-[#B48A5A] text-[8px] flex-shrink-0 mr-2 mt-auto mb-1">
        ✦
      </div>
      <div className="bg-white border border-[#2B0A0F]/08 rounded-[16px] rounded-bl-[4px] px-4 py-3 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[#2B0A0F]/30 block"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </motion.div>
  )}
</AnimatePresence>
                  <div ref={scrollRef} />
                </div>

                {/* Quick replies (only on first message) */}
                {messages.length <= 1 && (
                  <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide flex-shrink-0">
                    {QUICK_REPLIES.map((qr) => (
                      <button
                        key={qr}
                        onClick={() => sendMessage(qr)}
                        className="flex-shrink-0 px-3 py-2 rounded-full border border-[#2B0A0F]/12 text-[9px] uppercase tracking-[0.12em] whitespace-nowrap hover:bg-[#2B0A0F] hover:text-[#F6F3EF] hover:border-[#2B0A0F] transition-all bg-white"
                      >
                        {qr}
                      </button>
                    ))}
                  </div>
                )}

                {/* Image preview above input */}
                {pendingPreview && (
                  <div className="px-4 pt-2 flex-shrink-0">
                    <div className="relative inline-block">
                      <img
                        src={pendingPreview}
                        alt="Preview"
                        className="h-20 rounded-lg object-cover border border-[#2B0A0F]/10"
                      />
                      <button
                        onClick={clearPending}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#2B0A0F] text-[#F6F3EF] text-[9px] flex items-center justify-center hover:bg-[#A1123F] transition-colors"
                      >
                        ✕
                      </button>
                      {uploading && (
                        <div className="absolute inset-0 rounded-lg bg-black/40 flex items-center justify-center">
                          <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Upload error */}
                {uploadError && (
                  <div className="px-4 flex-shrink-0">
                    <p className="text-[9px] text-[#A1123F] uppercase tracking-[0.15em]">{uploadError}</p>
                  </div>
                )}

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                {/* Send error toast */}
<AnimatePresence>
  {sendError && (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      className="mx-4 mb-2 flex items-center justify-between gap-3 bg-[#A1123F]/10 border border-[#A1123F]/20 rounded-xl px-4 py-3 flex-shrink-0"
    >
      <p className="text-[9px] uppercase tracking-[0.15em] text-[#A1123F]">
        Message failed to send
      </p>
      <button
        onClick={() => sendMessage()}
        className="text-[9px] uppercase tracking-[0.15em] text-[#A1123F] underline underline-offset-2 hover:opacity-70 transition-opacity whitespace-nowrap"
      >
        Retry ↺
      </button>
    </motion.div>
  )}
</AnimatePresence>

                {/* Input row */}
                <div className="px-4 py-4 border-t border-[#2B0A0F]/08 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={sending}
                      className="w-9 h-9 rounded-full border border-[#2B0A0F]/12 flex items-center justify-center text-[#2B0A0F]/40 hover:text-[#2B0A0F] hover:border-[#2B0A0F]/30 transition-all flex-shrink-0 disabled:opacity-25"
                      title="Attach image"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
                          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                        />
                      </svg>
                    </button>

                    <input
                      ref={inputRef}
                      suppressHydrationWarning
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                      placeholder={pendingFile ? "Add a caption… (optional)" : "Describe your issue..."}
                      className="flex-1 bg-white border border-[#2B0A0F]/12 rounded-full px-4 py-3 text-sm outline-none focus:border-[#2B0A0F]/40 transition-colors placeholder:opacity-30"
                    />

                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => sendMessage()}
                      disabled={(!newMessage.trim() && !pendingFile) || sending}
                      className="w-10 h-10 rounded-full bg-[#2B0A0F] text-[#F6F3EF] flex items-center justify-center flex-shrink-0 disabled:opacity-25 hover:bg-[#1A060B] transition-colors"
                    >
                      {sending ? (
                        <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </motion.button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}