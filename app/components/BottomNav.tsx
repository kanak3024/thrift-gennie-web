"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWishlist } from "../hooks/useWishlist";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useUser } from "./UserContext";

export default function BottomNav() {
  const pathname = usePathname();
  const { wishlist } = useWishlist();
  const { user, loading } = useUser(); // ← reads from shared context, zero auth calls
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!user) { setUnreadMessages(0); return; }
    supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", user.id)
      .eq("read", false)
      .then(({ count }) => setUnreadMessages(count || 0));

    // realtime message badge
    const channel = supabase
      .channel("bottomnav_messages")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `receiver_id=eq.${user.id}`,
      }, () => setUnreadMessages((c) => c + 1))
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "messages",
        filter: `receiver_id=eq.${user.id}`,
      }, () => {
        supabase.from("messages").select("*", { count: "exact", head: true })
          .eq("receiver_id", user.id).eq("read", false)
          .then(({ count }) => setUnreadMessages(count || 0));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const lastTab = {
    href: user ? `/account/${user.id}` : "/login",
    label: user ? "Account" : "Login",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.5"}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  };

  const tabs = [
    {
      href: "/buy",
      label: "Archive",
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.5"}>
          <path d="M3 3h18v4H3zM3 7l2 14h14l2-14"/>
          <path d="M10 12h4"/>
        </svg>
      ),
    },
    {
      href: "/sell",
      label: "Submit",
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.5"}>
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v8M8 12h8" strokeLinecap="round"/>
        </svg>
      ),
    },
    // ── RACK TAB (replaces Messages) ──
    {
      href: "/rack",
      label: "Rack",
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.5"}>
          {/* Clothing rack icon — horizontal bar + hangers */}
          <path d="M2 6h20" strokeLinecap="round"/>
          <path d="M12 6V3" strokeLinecap="round"/>
          <path d="M8 6c0-1.1.9-2 2-2h4a2 2 0 0 1 2 2" strokeLinecap="round"/>
          <path d="M7 6l-2 13h14L17 6" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M10 12h4" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      href: "/wishlist",
      label: "Saved",
      badge: wishlist.length,
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24"
          fill={active ? "#A1123F" : "none"}
          stroke={active ? "#A1123F" : "currentColor"}
          strokeWidth={active ? "2" : "1.5"}
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      ),
    },
    lastTab,
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#1A060B] backdrop-blur-md border-t border-white/08"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={loading ? "#" : tab.href}
              className="relative flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all"
            >
              <div className="relative">
                <span style={{ color: active ? "#B48A5A" : "rgba(246,243,239,0.45)" }}>
                  {tab.icon(active)}
                </span>
                {"badge" in tab && tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-[#A1123F] text-white text-[8px] font-bold rounded-full flex items-center justify-center px-1">
                    {tab.badge > 9 ? "9+" : tab.badge}
                  </span>
                ) : null}
              </div>
              <span
                className="text-[9px] uppercase tracking-[0.15em]"
                style={{ color: active ? "#B48A5A" : "rgba(246,243,239,0.35)" }}
              >
                {loading && tab === lastTab ? "" : tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}