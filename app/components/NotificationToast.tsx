"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface Toast {
  id: string;
  text: string;
  link?: string | null;
}

export default function NotificationToast() {
  const [userId, setUserId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  /* ── Get current user + listen for auth changes ── */
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  /* ── Real-time listener for new notifications ── */
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newToast: Toast = {
            id: payload.new.id,
            text: payload.new.text,
            link: payload.new.link ?? null,
          };

          setToasts((prev) => [...prev, newToast]);

          // Auto-dismiss after 5 seconds
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
          }, 5000);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed top-20 right-4 z-[999] flex flex-col gap-2 w-[320px] pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="pointer-events-auto bg-[#2B0A0F] text-[#F6F3EF] rounded-2xl px-4 py-3 shadow-2xl flex items-start gap-3"
          >
            {/* Icon */}
            <div className="w-7 h-7 rounded-full bg-[#B48A5A]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[#B48A5A] text-xs">✦</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#B48A5A] mb-0.5">
                Thrift Gennie
              </p>
              {toast.link ? (
                <Link
                  href={toast.link}
                  onClick={() => dismiss(toast.id)}
                  className="text-xs leading-snug text-[#F6F3EF]/80 hover:text-[#F6F3EF] transition-colors"
                >
                  {toast.text}
                </Link>
              ) : (
                <p className="text-xs leading-snug text-[#F6F3EF]/80">
                  {toast.text}
                </p>
              )}
            </div>

            {/* Dismiss button */}
            <button
              onClick={() => dismiss(toast.id)}
              className="text-[#F6F3EF]/30 hover:text-[#F6F3EF] transition-colors flex-shrink-0 text-sm leading-none mt-0.5"
            >
              ✕
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}