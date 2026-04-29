"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function PhotoGuidelines() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-[#2B0A0F]/10 overflow-hidden">

      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#2B0A0F]/02 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[#B48A5A] text-xs">✦</span>
          <span className="text-[9px] uppercase tracking-[0.25em] opacity-50 font-medium">
            Photo Guidelines
          </span>
          {!open && (
            <span className="text-[8px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-full bg-[#B48A5A]/10 text-[#B48A5A]">
              Tap to see standards
            </span>
          )}
        </div>
        <motion.svg
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          width="10" height="10" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2"
          className="opacity-30"
        >
          <polyline points="6 9 12 15 18 9" />
        </motion.svg>
      </button>

      {/* Expandable body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="guidelines"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden border-t border-[#2B0A0F]/06"
          >
            <div className="px-4 pt-4 pb-5 space-y-4 bg-[#2B0A0F]/02">

              {/* 4 rules */}
              {[
                {
                  num: "01",
                  title: "Natural light only",
                  desc: "Shoot near a window. No flash, no harsh overhead bulb — flash kills fabric texture and makes colours look wrong.",
                  tip: "Best: morning light by a window, or overcast daylight outside",
                },
                {
                  num: "02",
                  title: "Clean, simple background",
                  desc: "White wall, plain door, or a flat bedsheet. Avoid cluttered rooms, patterned walls, or your unmade bed.",
                  tip: "Bonus: hang it on a hook on a plain door for an easy clean shot",
                },
                {
                  num: "03",
                  title: "Show the full piece first",
                  desc: "Your main photo must show the entire garment. Use the remaining photos for the label, details, and any flaws.",
                  tip: "Photo 1: full garment · Photo 2: label · Photo 3: detail or flaw",
                },
                {
                  num: "04",
                  title: "Always show flaws honestly",
                  desc: "Pilling, a small stain, a loose button — photograph it. Buyers who know what they're getting don't dispute or return.",
                  tip: "Honest photos = faster trust = faster sale",
                },
              ].map((rule) => (
                <div key={rule.num} className="flex gap-3">
                  <span className="text-[9px] font-medium text-[#B48A5A] min-w-[20px] pt-0.5 tracking-[0.1em]">
                    {rule.num}
                  </span>
                  <div>
                    <p className="text-[11px] font-medium tracking-[0.05em] mb-0.5">{rule.title}</p>
                    <p className="text-[10px] opacity-40 leading-relaxed">{rule.desc}</p>
                    <p className="text-[9px] text-[#6B7E60] mt-1 tracking-[0.04em]">✦ {rule.tip}</p>
                  </div>
                </div>
              ))}

              {/* Good vs bad */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="rounded-xl border border-[#A1123F]/15 bg-[#A1123F]/04 p-3">
                  <p className="text-[8px] uppercase tracking-[0.2em] text-[#A1123F] mb-1.5">skip this</p>
                  <p className="text-[9px] opacity-40 leading-relaxed">
                    flash on · dark room · messy background · blurry · shot on the floor
                  </p>
                </div>
                <div className="rounded-xl border border-[#6B7E60]/20 bg-[#6B7E60]/06 p-3">
                  <p className="text-[8px] uppercase tracking-[0.2em] text-[#6B7E60] mb-1.5">aim for this</p>
                  <p className="text-[9px] opacity-40 leading-relaxed">
                    window light · plain wall · full garment visible · label shown
                  </p>
                </div>
              </div>

              {/* Auto-rejected */}
              <div className="pt-1">
                <p className="text-[8px] uppercase tracking-[0.2em] opacity-30 mb-2">
                  auto-rejected
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {["Screenshots", "Stock images", "Watermarks", "Other people's photos"].map((item) => (
                    <span
                      key={item}
                      className="text-[8px] uppercase tracking-[0.1em] px-2.5 py-1 rounded-full bg-[#A1123F]/06 text-[#A1123F]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}