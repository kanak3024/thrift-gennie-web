"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase";
import Link from "next/link";

/* ─────────────────────────────
   TYPES
───────────────────────────── */
type Ticket = {
  id: string;
  subject: string;
  status: "open" | "in_progress" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  created_at: string;
  updated_at: string;
  user_id: string;
  profiles?: { full_name: string; avatar_url: string | null };
  support_messages?: { text: string; is_admin: boolean; created_at: string }[];
};

/* ─────────────────────────────
   HELPERS
───────────────────────────── */
const STATUS_STYLE: Record<string, { text: string; dot: string; label: string }> = {
  open:        { text: "#6B7E60", dot: "#6B7E60", label: "Open" },
  in_progress: { text: "#B48A5A", dot: "#B48A5A", label: "In Progress" },
  closed:      { text: "#888",    dot: "#888",    label: "Closed" },
};

const PRIORITY_STYLE: Record<string, { label: string; color: string }> = {
  low:    { label: "Low",    color: "#888" },
  normal: { label: "Normal", color: "#B48A5A" },
  high:   { label: "High",   color: "#A1123F" },
  urgent: { label: "Urgent", color: "#A1123F" },
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ─────────────────────────────
   MAIN PAGE
───────────────────────────── */
export default function AdminSupportPage() {
  const [tickets, setTickets]               = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages]             = useState<any[]>([]);
  const [replyText, setReplyText]           = useState("");
  const [sending, setSending]               = useState(false);
  const [loading, setLoading]               = useState(true);
  const [filterStatus, setFilterStatus]     = useState<"all" | "open" | "in_progress" | "closed">("open");
  const [adminUser, setAdminUser]           = useState<any>(null);

  // Use a ref so realtime callbacks always have the latest filterStatus
  const filterStatusRef = useRef(filterStatus);
  useEffect(() => { filterStatusRef.current = filterStatus; }, [filterStatus]);

  const adminUserRef = useRef<any>(null);
  const scrollRef    = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLTextAreaElement>(null);

  /* ── AUTH CHECK ── */
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { window.location.href = "/admin/login"; return; } // FIX: was "admin/login"

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") { window.location.href = "/"; return; }
      adminUserRef.current = user;
      setAdminUser(user);
    });
  }, []);

  /* ── FETCH TICKETS — stable with useCallback ── */
   const fetchTickets = useCallback(async () => {
  const status = filterStatusRef.current;
  setLoading(true);

  let query = supabase
    .from("support_tickets")
    .select(`*, support_messages (text, is_admin, created_at)`)
    .order("updated_at", { ascending: false });

  if (status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) { console.error("fetchTickets:", error.message); setLoading(false); return; }

  // Manual join since FK isn't in schema cache yet
  const userIds = [...new Set((data || []).map((t: any) => t.user_id).filter(Boolean))];
  
  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", userIds);

  const profileMap = Object.fromEntries((profileData || []).map((p: any) => [p.id, p]));

  const tickets = (data || []).map((t: any) => ({
    ...t,
    profiles: profileMap[t.user_id] ?? null,
  }));

  setTickets(tickets as Ticket[]);
  setLoading(false);
}, []);
  // Re-fetch when auth resolves or filter changes
  useEffect(() => {
    if (!adminUser) return;
    fetchTickets();
  }, [adminUser, filterStatus, fetchTickets]);

  /* ── GLOBAL REALTIME: new tickets or status changes ── */
  useEffect(() => {
    if (!adminUser) return;

    const channel = supabase
      .channel("admin-tickets-list")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "support_tickets",
      }, () => {
        // Any ticket mutation → refresh the list with current filter
        fetchTickets();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [adminUser, fetchTickets]);

  /* ── SELECT TICKET ── */
  const selectTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setReplyText("");

    // Mark as in_progress only if still open
    if (ticket.status === "open") {
      const { error } = await supabase
        .from("support_tickets")
        .update({ status: "in_progress" })
        .eq("id", ticket.id);

      if (!error) {
        setTickets((prev) =>
          prev.map((t) => t.id === ticket.id ? { ...t, status: "in_progress" } : t)
        );
        setSelectedTicket((t) => t ? { ...t, status: "in_progress" } : t);
      }
    }

    // Fetch full message history
    const { data, error } = await supabase
      .from("support_messages")
      .select("*")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true });

    if (error) console.error("fetchMessages:", error.message);
    if (data) setMessages(data);

    // Mark unread user messages as read by admin
    await supabase
      .from("support_messages")
      .update({ read_by_admin: true })
      .eq("ticket_id", ticket.id)
      .eq("is_admin", false)
      .eq("read_by_admin", false);

    setTimeout(() => inputRef.current?.focus(), 200);
  };

  /* ── PER-TICKET REALTIME ── */
  useEffect(() => {
    if (!selectedTicket) return;

    const channel = supabase
      .channel(`admin-support-${selectedTicket.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "support_messages",
        filter: `ticket_id=eq.${selectedTicket.id}`,
      }, (payload) => {
        setMessages((prev) => {
          if (prev.find((m) => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
        fetchTickets(); // refresh list so last-message preview updates
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedTicket?.id, fetchTickets]); // key on id only, not whole object

  /* ── AUTO-SCROLL ── */
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── SEND REPLY ── */
  const sendReply = async () => {
    if (!replyText.trim() || !selectedTicket || !adminUserRef.current || sending) return;
    const text = replyText.trim();
    setReplyText("");
    setSending(true);

    const { error } = await supabase.from("support_messages").insert({
      ticket_id:     selectedTicket.id,
      sender_id:     adminUserRef.current.id,
      text,
      is_admin:      true,
      read_by_user:  false,
      read_by_admin: true,
    });

    if (error) console.error("sendReply:", error.message);

    // Update ticket updated_at so it bubbles to top of list
    await supabase
      .from("support_tickets")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", selectedTicket.id);

    setSending(false);
    inputRef.current?.focus();
  };

  /* ── CHANGE STATUS ── */
  const changeStatus = async (status: string) => {
    if (!selectedTicket) return;
    const { error } = await supabase
      .from("support_tickets")
      .update({
        status,
        updated_at: new Date().toISOString(),
        ...(status === "closed" ? { closed_at: new Date().toISOString() } : {}),
      })
      .eq("id", selectedTicket.id);

    if (error) { console.error("changeStatus:", error.message); return; }

    setSelectedTicket((t) => t ? { ...t, status: status as any } : t);
    setTickets((prev) =>
      prev.map((t) => t.id === selectedTicket.id ? { ...t, status: status as any } : t)
    );
  };

  /* ── CHANGE PRIORITY ── */
  const changePriority = async (priority: string) => {
    if (!selectedTicket) return;
    const { error } = await supabase
      .from("support_tickets")
      .update({ priority, updated_at: new Date().toISOString() })
      .eq("id", selectedTicket.id);

    if (error) { console.error("changePriority:", error.message); return; }

    setSelectedTicket((t) => t ? { ...t, priority: priority as any } : t);
    setTickets((prev) =>
      prev.map((t) => t.id === selectedTicket.id ? { ...t, priority: priority as any } : t)
    );
  };
  const broadcastTyping = useCallback(() => {
  if (!selectedTicket) return;
  supabase.channel(`support-${selectedTicket.id}`).send({
    type: "broadcast",
    event: "typing",
    payload: {},
  });
}, [selectedTicket]);

  /* ── STATS — derived from fetched tickets, always in sync ── */
  const stats = {
    open:        tickets.filter((t) => t.status === "open").length,
    in_progress: tickets.filter((t) => t.status === "in_progress").length,
    closed:      tickets.filter((t) => t.status === "closed").length,
  };

  return (
    <main className="min-h-screen bg-[#F6F3EF] text-[#2B0A0F]">

      {/* ── TOP NAV ── */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-[#F6F3EF]/95 backdrop-blur-md border-b border-[#2B0A0F]/08">
        <div className="max-w-screen-xl mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/admin"
              className="text-[10px] uppercase tracking-[0.3em] opacity-30 hover:opacity-70 transition-opacity"
            >
              ← Dashboard
            </Link>
            <span className="w-px h-4 bg-[#2B0A0F]/10" />
            <Link
              href="/admin/payout"
              className="text-[10px] uppercase tracking-[0.3em] opacity-30 hover:opacity-70 transition-opacity"
            >
              Payouts
            </Link>
            <span className="w-px h-4 bg-[#2B0A0F]/10" />
            <span className="text-[10px] uppercase tracking-[0.3em] opacity-70">Support</span>
          </div>
          <p className="text-[9px] uppercase tracking-[0.3em] opacity-30">Admin Panel</p>
        </div>
      </div>

      <div className="pt-16 flex h-screen overflow-hidden">

        {/* ══════════════════════
            LEFT: TICKET LIST
        ══════════════════════ */}
        <div className="w-[360px] flex-shrink-0 border-r border-[#2B0A0F]/08 flex flex-col h-full overflow-hidden">

          {/* Header + stats */}
          <div className="px-6 pt-8 pb-4 flex-shrink-0">
            <p className="text-[9px] uppercase tracking-[0.4em] opacity-40 mb-1">Admin</p>
            <h1 className="text-3xl mb-6" style={{ fontFamily: "var(--font-playfair)" }}>
              Support
            </h1>

            {/* Live stats */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {[
                { label: "Open",        value: stats.open,        color: "#6B7E60" },
                { label: "In Progress", value: stats.in_progress, color: "#B48A5A" },
                { label: "Closed",      value: stats.closed,      color: "#888" },
              ].map((s) => (
                <button
                  key={s.label}
                  onClick={() => setFilterStatus(
                    s.label === "In Progress" ? "in_progress"
                    : s.label.toLowerCase() as any
                  )}
                  className="flex flex-col items-center py-3 rounded-xl border border-[#2B0A0F]/08 bg-white hover:border-[#2B0A0F]/20 transition-colors"
                >
                  <span
                    className="text-xl font-medium"
                    style={{ color: s.color, fontFamily: "var(--font-playfair)" }}
                  >
                    {s.value}
                  </span>
                  <span className="text-[8px] uppercase tracking-[0.15em] opacity-40 mt-0.5">
                    {s.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 p-1 bg-[#2B0A0F]/05 rounded-full">
              {(["open", "in_progress", "all", "closed"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  className={`flex-1 py-1.5 rounded-full text-[8px] uppercase tracking-[0.15em] transition-all ${
                    filterStatus === f
                      ? "bg-[#2B0A0F] text-[#F6F3EF]"
                      : "opacity-40 hover:opacity-70"
                  }`}
                >
                  {f === "in_progress" ? "Active" : f === "all" ? "All" : f}
                </button>
              ))}
            </div>
          </div>

          {/* Ticket list */}
          <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
            {loading && (
              <div className="space-y-2 pt-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 bg-[#EAE3DB]/50 rounded-xl animate-pulse" />
                ))}
              </div>
            )}

            {!loading && tickets.length === 0 && (
              <div className="flex flex-col items-center justify-center pt-16 text-center">
                <p className="text-xl opacity-15 mb-2" style={{ fontFamily: "var(--font-playfair)" }}>
                  All clear.
                </p>
                <p className="text-[9px] uppercase tracking-[0.2em] opacity-30">
                  No {filterStatus !== "all" ? filterStatus.replace("_", " ") : ""} tickets.
                </p>
              </div>
            )}

            <AnimatePresence>
              {tickets.map((ticket, i) => {
                const st       = STATUS_STYLE[ticket.status];
                const pt       = PRIORITY_STYLE[ticket.priority];
                // Last message preview: most recent in the sorted array
                const lastMsg  = ticket.support_messages
                  ?.slice()
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                const isSelected = selectedTicket?.id === ticket.id;
                // Unread = last message is from the user (not admin)
                const unread   = lastMsg && !lastMsg.is_admin;

                return (
                  <motion.button
                    key={ticket.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => selectTicket(ticket)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      isSelected
                        ? "border-[#2B0A0F] bg-[#2B0A0F] text-[#F6F3EF]"
                        : "border-[#2B0A0F]/08 bg-white hover:border-[#2B0A0F]/20 hover:bg-[#FDFCFB]"
                    }`}
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0 ${
                          isSelected ? "bg-white/10 text-[#F6F3EF]" : "bg-[#EAE3DB] text-[#2B0A0F]"
                        }`}>
                          {(ticket.profiles?.full_name || "?")[0].toUpperCase()}
                        </div>
                        <span className={`text-[10px] font-medium truncate ${isSelected ? "text-[#F6F3EF]" : ""}`}>
                          {ticket.profiles?.full_name || "Unknown User"}
                        </span>
                      </div>
                      <span className={`text-[8px] flex-shrink-0 ${isSelected ? "opacity-40" : "opacity-30"}`}>
                        {timeAgo(ticket.updated_at)}
                      </span>
                    </div>

                    {/* Subject */}
                    <p className={`text-xs mb-2.5 ${isSelected ? "text-[#F6F3EF]/80" : "text-[#2B0A0F]/70"}`}>
                      {ticket.subject}
                    </p>

                    {/* Last message preview */}
                    {lastMsg && (
                      <p className={`text-[9px] truncate mb-2.5 italic ${isSelected ? "opacity-40" : "opacity-40"}`}>
                        {lastMsg.is_admin ? "You: " : ""}{lastMsg.text}
                      </p>
                    )}

                    {/* Tags */}
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[8px] uppercase tracking-[0.12em] px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          isSelected ? "bg-white/10 text-white" : ""
                        }`}
                        style={!isSelected ? { background: `${st.text}15`, color: st.text } : {}}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: isSelected ? "white" : st.dot }}
                        />
                        {st.label}
                      </span>

                      {ticket.priority !== "normal" && (
                        <span
                          className={`text-[8px] uppercase tracking-[0.12em] px-2 py-0.5 rounded-full ${
                            isSelected ? "bg-white/10 text-white" : ""
                          }`}
                          style={!isSelected ? { background: `${pt.color}15`, color: pt.color } : {}}
                        >
                          {pt.label}
                        </span>
                      )}

                      {unread && !isSelected && (
                        <span className="ml-auto w-2 h-2 rounded-full bg-[#A1123F]" />
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* ══════════════════════
            RIGHT: CHAT PANEL
        ══════════════════════ */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {!selectedTicket ? (

            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <p className="text-4xl opacity-10 mb-4" style={{ fontFamily: "var(--font-playfair)" }}>
                Select a ticket.
              </p>
              <p className="text-[9px] uppercase tracking-[0.3em] opacity-25">
                Choose a conversation from the left to reply.
              </p>
            </div>

          ) : (
            <>
              {/* ── TICKET HEADER ── */}
              <div className="px-8 py-5 border-b border-[#2B0A0F]/08 flex-shrink-0 bg-[#F6F3EF]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.3em] opacity-40 mb-1">
                      {selectedTicket.profiles?.full_name || "Unknown"} · #{selectedTicket.id.slice(0, 8).toUpperCase()}
                    </p>
                    <h2 className="text-2xl" style={{ fontFamily: "var(--font-playfair)" }}>
                      {selectedTicket.subject}
                    </h2>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-3">
                    {/* Priority */}
                    <select
                      value={selectedTicket.priority}
                      onChange={(e) => changePriority(e.target.value)}
                      className="text-[9px] uppercase tracking-[0.15em] border border-[#2B0A0F]/12 rounded-full px-3 py-2 bg-white outline-none cursor-pointer hover:border-[#2B0A0F]/30 transition-colors"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>

                    {/* Status buttons */}
                    <div className="flex gap-1.5">
                      {(["open", "in_progress", "closed"] as const).map((s) => {
                        const st = STATUS_STYLE[s];
                        const isActive = selectedTicket.status === s;
                        return (
                          <button
                            key={s}
                            onClick={() => changeStatus(s)}
                            className={`text-[8px] uppercase tracking-[0.15em] px-3 py-2 rounded-full border transition-all ${
                              isActive
                                ? "border-[#2B0A0F] bg-[#2B0A0F] text-[#F6F3EF]"
                                : "border-[#2B0A0F]/10 hover:border-[#2B0A0F]/25"
                            }`}
                          >
                            {st.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-4 mt-3">
                  <span className="text-[8px] uppercase tracking-[0.15em] opacity-30">
                    Opened{" "}
                    {new Date(selectedTicket.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <span className="w-px h-3 bg-[#2B0A0F]/10" />
                  <span className="text-[8px] uppercase tracking-[0.15em] opacity-30">
                    Last activity {timeAgo(selectedTicket.updated_at)}
                  </span>
                  <span className="w-px h-3 bg-[#2B0A0F]/10" />
                  <span className="text-[8px] uppercase tracking-[0.15em] opacity-30">
                    {messages.length} message{messages.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* ── MESSAGES ── */}
              <div
                className="flex-1 overflow-y-auto px-8 py-6 space-y-2"
                style={{ background: "#FDFCFB" }}
              >
                {messages.length === 0 && !loading && (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-[10px] uppercase tracking-[0.2em] opacity-20">No messages yet</p>
                  </div>
                )}
                {messages.map((msg, idx) => {
                  const isAdmin    = msg.is_admin;
                  const prev       = messages[idx - 1];
                  const sameAsPrev = prev?.is_admin === msg.is_admin;
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isAdmin ? "justify-end" : "justify-start"} ${
                        sameAsPrev ? "mt-1" : "mt-5"
                      }`}
                    >
                      <div className={`max-w-[65%] flex flex-col ${isAdmin ? "items-end" : "items-start"}`}>
                        {!sameAsPrev && (
                          <span
                            className={`text-[8px] uppercase tracking-[0.15em] opacity-30 mb-1.5 ${
                              isAdmin ? "pr-1" : "pl-1"
                            }`}
                          >
                            {isAdmin ? "You (Support)" : selectedTicket.profiles?.full_name || "User"}
                          </span>
                        )}
                        <div
                          className={`px-5 py-3.5 text-sm leading-relaxed ${
                            isAdmin
                              ? "bg-[#2B0A0F] text-[#F6F3EF] rounded-[18px] rounded-br-[4px]"
                              : "bg-white text-[#2B0A0F] border border-[#2B0A0F]/08 rounded-[18px] rounded-bl-[4px] shadow-sm"
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
                                className="rounded-lg max-w-full max-h-60 object-cover cursor-zoom-in"
                                style={{ display: "block" }}
                              />
                            </a>
                          )}
                          {msg.text && <span>{msg.text}</span>}
                        </div>
                        {(idx === messages.length - 1 ||
                          messages[idx + 1]?.is_admin !== msg.is_admin) && (
                          <span
                            className={`text-[8px] opacity-25 mt-1.5 ${isAdmin ? "pr-1" : "pl-1"}`}
                          >
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
                <div ref={scrollRef} />
              </div>

              {/* ── REPLY BOX ── */}
              <div className="px-8 py-5 border-t border-[#2B0A0F]/08 flex-shrink-0 bg-[#F6F3EF]">
                {selectedTicket.status === "closed" ? (
                  <div className="flex items-center justify-between py-3 px-5 rounded-xl bg-[#2B0A0F]/04 border border-dashed border-[#2B0A0F]/10">
                    <p className="text-[9px] uppercase tracking-[0.3em] opacity-30">
                      This ticket is closed.
                    </p>
                    <button
                      onClick={() => changeStatus("open")}
                      className="text-[9px] uppercase tracking-[0.15em] px-3 py-1.5 border border-[#2B0A0F]/15 rounded-full hover:bg-[#2B0A0F] hover:text-[#F6F3EF] hover:border-[#2B0A0F] transition-all"
                    >
                      Reopen
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-3 items-end">
                    <div className="flex-1 relative">
                      <textarea
                        ref={inputRef}
                        value={replyText}
                        onChange={(e) => {
  setReplyText(e.target.value);
  broadcastTyping();
}}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendReply();
                          }
                        }}
                        placeholder="Write your reply… (Enter to send, Shift+Enter for new line)"
                        rows={3}
                        className="w-full bg-white border border-[#2B0A0F]/12 rounded-2xl px-5 py-4 text-sm outline-none focus:border-[#2B0A0F]/40 transition-colors placeholder:opacity-25 resize-none"
                      />
                      <span className="absolute bottom-3 right-4 text-[8px] uppercase tracking-[0.15em] opacity-20">
                        {replyText.length > 0 ? `${replyText.length} chars` : "Shift+↵ new line"}
                      </span>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={sendReply}
                      disabled={!replyText.trim() || sending}
                      className="h-12 px-6 rounded-full bg-[#2B0A0F] text-[#F6F3EF] text-[10px] uppercase tracking-[0.2em] disabled:opacity-25 hover:opacity-80 transition-all flex items-center gap-2 flex-shrink-0"
                    >
                      {sending ? (
                        <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                        </svg>
                      ) : (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                          <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      Send
                    </motion.button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}