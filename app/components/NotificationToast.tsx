"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useActivity } from "@/context/ActivityContext";
import Link from "next/link";

interface Toast {
  id: string;
  text: string;
  link?: string | null;
}

export default function NotificationToast() {
  const { activities } = useActivity();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seenIds = useRef<Set<string>>(new Set());

  /* ── Watch for new activities pushed in from shared context ── */
  useEffect(() => {
    if (!activities.length) return;

    // The newest activity is always first (sorted descending in context)
    const latest = activities[0];

    // Only show a toast if we haven't seen this id before
    if (seenIds.current.has(latest.id)) return;
    seenIds.current.add(latest.id);

    // Don't toast on initial load — only on new inserts after mount
    // We track this by checking if the activity is less than 10 seconds old
    const ageMs = Date.now() - new Date(latest.created_at).getTime();
    if (ageMs > 10_000) return;

    const newToast: Toast = {
      id: latest.id,
      text: latest.text,
      link: (latest as any).link ?? null,
    };

    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 5000);
  }, [activities]);

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