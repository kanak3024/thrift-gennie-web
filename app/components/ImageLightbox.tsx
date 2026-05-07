"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";

interface ImageLightboxProps {
  images: string[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  productTitle?: string;
}

export default function ImageLightbox({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
  productTitle,
}: ImageLightboxProps) {
  const [idx, setIdx] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const lastPinchDist = useRef<number | null>(null);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const swipeStart = useRef<number | null>(null);
  const lastTap = useRef<number>(0);

  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, [idx, isOpen]);

  useEffect(() => {
    setIdx(initialIndex);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const prev = useCallback(() => setIdx((i) => Math.max(i - 1, 0)), []);
  const next = useCallback(() => setIdx((i) => Math.min(i + 1, images.length - 1)), [images.length]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, next, prev, onClose]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => {
      const next = s - e.deltaY * 0.003;
      return Math.min(Math.max(next, 1), 4);
    });
    if (scale <= 1.05) setOffset({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    setIsDragging(true);
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragStart.current || !isDragging) return;
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.x),
      y: dragStart.current.oy + (e.clientY - dragStart.current.y),
    });
  };
  const handleMouseUp = () => {
    dragStart.current = null;
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.sqrt(dx * dx + dy * dy);
    } else if (e.touches.length === 1) {
      swipeStart.current = e.touches[0].clientX;
      if (scale > 1) {
        dragStart.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          ox: offset.x,
          oy: offset.y,
        };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastPinchDist.current !== null) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const delta = dist - lastPinchDist.current;
      setScale((s) => Math.min(Math.max(s + delta * 0.008, 1), 4));
      lastPinchDist.current = dist;
    } else if (e.touches.length === 1 && scale > 1 && dragStart.current) {
      setOffset({
        x: dragStart.current.ox + (e.touches[0].clientX - dragStart.current.x),
        y: dragStart.current.oy + (e.touches[0].clientY - dragStart.current.y),
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    lastPinchDist.current = null;
    dragStart.current = null;
    if (scale <= 1 && swipeStart.current !== null && e.changedTouches.length === 1) {
      const diff = swipeStart.current - e.changedTouches[0].clientX;
      if (diff > 50) next();
      else if (diff < -50) prev();
    }
    swipeStart.current = null;
    if (scale <= 1.05) setOffset({ x: 0, y: 0 });
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      setScale((s) => (s > 1 ? 1 : 2.5));
      setOffset({ x: 0, y: 0 });
    }
    lastTap.current = now;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[9999] bg-[#0D0406] flex flex-col"
        >
          {/* TOP BAR */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 flex-shrink-0 border-b border-white/05">
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="text-white/35 text-[9px] tracking-[0.3em] uppercase flex-shrink-0"
                style={{ fontFamily: "var(--font-dm)" }}
              >
                {idx + 1} / {images.length}
              </span>
              {productTitle && (
                <>
                  <span className="text-white/15 text-xs flex-shrink-0">·</span>
                  <span
                    className="text-white/45 truncate text-sm"
                    style={{ fontFamily: "var(--font-cormorant)", fontStyle: "italic" }}
                  >
                    {productTitle}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {scale > 1 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }}
                  className="px-3 py-1.5 rounded-full border border-white/15 text-white/50 text-[9px] uppercase tracking-widest hover:border-white/40 hover:text-white transition-all"
                  style={{ fontFamily: "var(--font-dm)" }}
                >
                  Reset
                </motion.button>
              )}
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full border border-white/12 flex items-center justify-center text-white/40 hover:text-white hover:border-white/35 transition-all"
              >
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>

          {/* IMAGE AREA */}
          <div
            className="flex-1 relative overflow-hidden flex items-center justify-center"
            style={{ cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={handleDoubleTap}
          >
            {/* Prev */}
            {idx > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-3 sm:left-6 z-20 w-10 h-10 rounded-full bg-white/08 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/15 hover:text-white transition-all"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </button>
            )}

            {/* Image */}
            <AnimatePresence mode="wait">
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.18 }}
                className="absolute inset-0 flex items-center justify-center"
                style={{ userSelect: "none" }}
              >
                <div
                  style={{
                    transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)`,
                    transition: isDragging ? "none" : "transform 0.12s ease",
                    width: "100%",
                    height: "100%",
                    position: "relative",
                  }}
                >
                  <Image
                    src={images[idx]}
                    alt={productTitle || `Image ${idx + 1}`}
                    fill
                    className="object-contain select-none"
                    draggable={false}
                    priority
                    sizes="100vw"
                  />
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Next */}
            {idx < images.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-3 sm:right-6 z-20 w-10 h-10 rounded-full bg-white/08 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/15 hover:text-white transition-all"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            )}

            {/* Zoom hint */}
            {scale === 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none"
              >
                <p
                  className="text-white/25 text-[8px] uppercase tracking-[0.3em] text-center"
                  style={{ fontFamily: "var(--font-dm)" }}
                >
                  Scroll or pinch to zoom · Double-tap to zoom
                </p>
              </motion.div>
            )}
          </div>

          {/* THUMBNAIL STRIP */}
          {images.length > 1 && (
            <div className="flex-shrink-0 py-3 px-4 border-t border-white/05 flex justify-center gap-2 overflow-x-auto scrollbar-hide">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={`relative flex-shrink-0 rounded-lg overflow-hidden transition-all duration-200 ${
                    i === idx
                      ? "ring-2 ring-white/70 opacity-100 scale-105 w-12 h-16 sm:w-14 sm:h-[72px]"
                      : "opacity-30 hover:opacity-60 w-12 h-16 sm:w-14 sm:h-[72px]"
                  }`}
                >
                  <Image src={img} alt={`View ${i + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}