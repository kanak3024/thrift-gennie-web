"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

/* ─────────────────────────────
   CONSTANTS
───────────────────────────── */
const CONDITIONS = [
  { value: "Like New",   desc: "Worn once or never" },
  { value: "Good",       desc: "Minimal signs of wear" },
  { value: "Fair",       desc: "Visible wear, still great" },
  { value: "Well Loved", desc: "Loved to the max" },
];
const SIZES      = ["XS", "S", "M", "L", "XL", "XXL", "Free Size", "Custom"];
const CATEGORIES = ["Tops", "Bottoms", "Dresses", "Outerwear", "Accessories", "Footwear", "Bags", "Jewellery", "Other"];
const MOODS      = [
  { tag: "y2k",       label: "Y2K",          color: "#C77DFF" },
  { tag: "oldmoney",  label: "Old Money",    color: "#B48A5A" },
  { tag: "indie",     label: "Indie",        color: "#6B7E60" },
  { tag: "bollywood", label: "Bollywood",    color: "#C41E3A" },
  { tag: "90s",       label: "90s Minimal",  color: "#457B9D" },
];
const CITIES = ["Mumbai", "Pune", "Delhi", "Bengaluru", "Jaipur", "Hyderabad", "Chennai", "Kolkata", "Other"];
const MAX_PHOTOS = 4;
const MAX_DESC   = 500;

/* ─────────────────────────────
   TOAST
───────────────────────────── */
function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full text-[10px] uppercase tracking-[0.2em] shadow-lg whitespace-nowrap ${
        type === "success" ? "bg-[#2B0A0F] text-[#F6F3EF]" : "bg-[#A1123F] text-white"
      }`}
    >
      {message}
    </motion.div>
  );
}

/* ─────────────────────────────
   PHOTO SLOT
   FIX: each slot now triggers upload directly via its own hidden input
        so mobile browsers don't get confused by multiple/capture conflicts
───────────────────────────── */
function PhotoSlot({
  index, preview, onRemove, onFileSelected, isMain,
}: {
  index: number;
  preview?: string;
  onRemove: () => void;
  onFileSelected: (file: File) => void;
  isMain: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
    // Reset so same file can be re-selected if needed
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <motion.div
      layout
      className={`relative overflow-hidden rounded-xl group ${
        isMain ? "aspect-[3/4]" : "aspect-square"
      } ${
        !preview
          ? "border-2 border-dashed border-[#2B0A0F]/12 bg-[#EAE3DB]/50 hover:border-[#2B0A0F]/30 hover:bg-[#EAE3DB] transition-all cursor-pointer active:bg-[#EAE3DB]"
          : ""
      }`}
      onClick={() => !preview && inputRef.current?.click()}
    >
      {/* Hidden per-slot file input — no `multiple`, no `capture` so both gallery and camera work */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {preview ? (
        <>
          <Image src={preview} alt={`Photo ${index + 1}`} fill className="object-cover" />
          {/* Remove button — larger tap target on mobile */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="absolute top-2 right-2 w-8 h-8 bg-black/60 text-white text-[11px] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 sm:opacity-0 touch:opacity-100 transition-opacity hover:bg-black active:bg-black"
            aria-label="Remove photo"
          >
            ✕
          </button>
          {isMain && (
            <span className="absolute bottom-2 left-2 text-[8px] uppercase tracking-[0.2em] bg-black/50 text-white px-2 py-0.5 rounded-full">
              Main
            </span>
          )}
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 opacity-30 pointer-events-none">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
          </svg>
          <span className="text-[8px] uppercase tracking-[0.2em]">
            {isMain ? "Main Photo" : `Photo ${index + 1}`}
          </span>
        </div>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────
   PROGRESS BAR
───────────────────────────── */
function ProgressBar({ step, total }: { step: number; total: number }) {
  const labels = ["Photos", "Details"];
  return (
    <div className="flex items-center gap-3 mb-10">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] transition-all ${
            i < step
              ? "bg-[#2B0A0F] text-[#F6F3EF]"
              : i === step
              ? "bg-[#2B0A0F]/10 text-[#2B0A0F] border border-[#2B0A0F]/20"
              : "bg-[#2B0A0F]/05 text-[#2B0A0F]/25"
          }`}>
            {i < step ? "✓" : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`h-px w-8 transition-all ${i < step ? "bg-[#2B0A0F]" : "bg-[#2B0A0F]/10"}`} />
          )}
        </div>
      ))}
      <span className="ml-2 text-[9px] uppercase tracking-[0.2em] opacity-40">
        {labels[step] ?? ""}
      </span>
    </div>
  );
}

/* ─────────────────────────────
   MAIN PAGE
───────────────────────────── */
export default function SellPage() {
  const router = useRouter();

  // FIX: single camera input ref for the "Take Photo" button
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep]       = useState(0);
  const [userId, setUserId]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast]     = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Form fields
  const [title, setTitle]           = useState("");
  const [price, setPrice]           = useState("");
  const [location, setLocation]     = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition]   = useState("");
  const [size, setSize]             = useState("");
  const [category, setCategory]     = useState("");
  const [mood, setMood]             = useState("");
  const [files, setFiles]           = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── AUTH ── */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUserId(session.user.id);
      else router.push("/login");
    });
  }, [router]);

  /* ── Revoke object URLs on unmount to avoid memory leaks ── */
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── FILE HANDLING ── */

  // Called by each PhotoSlot when a file is chosen for that slot
  const handleSlotFile = (slotIndex: number, newFile: File) => {
    setFiles(prev => {
      const updated = [...prev];
      // If slot already has a file, replace it; otherwise push up to MAX_PHOTOS
      if (slotIndex < updated.length) {
        updated[slotIndex] = newFile;
      } else if (updated.length < MAX_PHOTOS) {
        updated.push(newFile);
      }
      // Regenerate all preview URLs
      setPreviewUrls(updated.map(f => URL.createObjectURL(f)));
      return updated;
    });
  };

  // Camera button adds to next empty slot
  const handleCameraFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (files.length >= MAX_PHOTOS) return;
    const updated = [...files, file];
    setFiles(updated);
    setPreviewUrls(updated.map(f => URL.createObjectURL(f)));
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    const newFiles    = files.filter((_, i) => i !== index);
    const newPreviews = previewUrls.filter((_, i) => i !== index);
    setFiles(newFiles);
    setPreviewUrls(newPreviews);
  };

  /* ── STEP VALIDATION ── */
  const canProceedStep0 = files.length >= 1;
  const canProceedStep1 = title.trim() && price && location && condition && category;

  /* ── Missing fields label for disabled button ── */
  const missingFields = () => {
    const missing = [];
    if (!title.trim()) missing.push("piece name");
    if (!price)        missing.push("price");
    if (!location)     missing.push("city");
    if (!condition)    missing.push("condition");
    if (!category)     missing.push("category");
    return missing;
  };

  /* ── SUBMIT ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) { router.push("/login"); return; }
    if (files.length === 0) { showToast("Please add at least one photo", "error"); return; }
    if (!canProceedStep1) {
      showToast(`Missing: ${missingFields().join(", ")}`, "error");
      return;
    }

    setLoading(true);

    try {
      const uploadedUrls: string[] = [];

      for (const file of files) {
        const fileExt    = file.name.split(".").pop();
        const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 20);
        const fileName   = `${cleanTitle}-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath   = `inventory/${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("product-images")
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      const { error: dbError } = await supabase.from("products").insert([{
        title,
        price:        parseFloat(price),
        location,
        description,
        condition,
        size,
        category,
        mood,
        image_url:    uploadedUrls[0],
        extra_images: uploadedUrls.slice(1),
        seller_id:    userId,
        status:       "available",
      }]);

      if (dbError) throw dbError;

      showToast("Piece added to the Archive ✦");
      setTimeout(() => router.push(`/account/${userId}`), 1500);

    } catch (err: any) {
      console.error("Submission error:", err);
      showToast(`Submission failed: ${err.message || "Unknown error"}`, "error");
    } finally {
      setLoading(false);
    }
  };

  /* ── RENDER ── */
  return (
    <main className="min-h-screen bg-[#F6F3EF] text-[#2B0A0F]">

      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} />}
      </AnimatePresence>

      {/* FIX: pt-20 on mobile (smaller nav), pt-32 on desktop */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 sm:pt-32 pb-24">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <p className="text-[9px] uppercase tracking-[0.4em] opacity-40 mb-3">Seller Studio</p>
          <h1
            className="leading-none mb-2"
            style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(2rem,5vw,3.5rem)" }}
          >
            Submit to the Archive
          </h1>
          <p className="text-[10px] uppercase tracking-[0.3em] opacity-40">
            Sourced with intention. Listed with care.
          </p>
        </motion.div>

        {/* Progress */}
        <ProgressBar step={step} total={2} />

        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">

            {/* ══════════════════
                STEP 0 — PHOTOS
            ══════════════════ */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div>
                  <h2
                    className="text-2xl mb-1"
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    First, the visuals.
                  </h2>
                  <p className="text-sm opacity-50">
                    Add up to {MAX_PHOTOS} photos. Natural light works best.
                  </p>
                </div>

                {/*
                  FIX: Responsive photo grid
                  Mobile: 2-col grid, all squares (simpler, touch-friendly)
                  Desktop (sm+): original layout — main large left + 3 small right
                */}

                {/* Mobile grid (< sm) */}
                <div className="grid grid-cols-2 gap-3 sm:hidden">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className={i === 0 ? "col-span-2" : ""}>
                      <PhotoSlot
                        index={i}
                        preview={previewUrls[i]}
                        onRemove={() => removeImage(i)}
                        onFileSelected={(file) => handleSlotFile(i, file)}
                        isMain={i === 0}
                      />
                    </div>
                  ))}
                </div>

                {/* Desktop grid (sm+) */}
                <div className="hidden sm:grid grid-cols-3 gap-3">
                  {/* Main photo — spans 2 rows */}
                  <div className="row-span-2">
                    <PhotoSlot
                      index={0}
                      preview={previewUrls[0]}
                      onRemove={() => removeImage(0)}
                      onFileSelected={(file) => handleSlotFile(0, file)}
                      isMain={true}
                    />
                  </div>
                  {/* Photos 2–4 */}
                  {[1, 2, 3].map((i) => (
                    <PhotoSlot
                      key={i}
                      index={i}
                      preview={previewUrls[i]}
                      onRemove={() => removeImage(i)}
                      onFileSelected={(file) => handleSlotFile(i, file)}
                      isMain={false}
                    />
                  ))}
                </div>

                {/*
                  FIX: Upload buttons
                  - "Upload Photos" uses a hidden input without `capture` → opens gallery on mobile
                  - "Take Photo" uses capture="environment" → opens camera directly
                  - Both are separate inputs to avoid browser conflicts
                */}
                <div className="flex gap-3">
                  {/* Gallery upload */}
                  <label className={`flex-1 flex items-center justify-center gap-2 border border-[#2B0A0F]/15 rounded-full py-3 text-[10px] uppercase tracking-[0.2em] hover:bg-[#2B0A0F] hover:text-[#F6F3EF] hover:border-[#2B0A0F] transition-all cursor-pointer select-none ${files.length >= MAX_PHOTOS ? "opacity-30 pointer-events-none" : ""}`}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    Upload Photos
                    {/* FIX: no `capture`, `multiple` allowed for gallery picker */}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      disabled={files.length >= MAX_PHOTOS}
                      onChange={(e) => {
                        const selected = Array.from(e.target.files || []);
                        const combined = [...files, ...selected].slice(0, MAX_PHOTOS);
                        setFiles(combined);
                        setPreviewUrls(combined.map(f => URL.createObjectURL(f)));
                        e.target.value = "";
                      }}
                    />
                  </label>

                  {/* Camera capture */}
                  <label className={`flex-1 flex items-center justify-center gap-2 border border-[#2B0A0F]/15 rounded-full py-3 text-[10px] uppercase tracking-[0.2em] hover:bg-[#2B0A0F] hover:text-[#F6F3EF] hover:border-[#2B0A0F] transition-all cursor-pointer select-none ${files.length >= MAX_PHOTOS ? "opacity-30 pointer-events-none" : ""}`}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                    </svg>
                    Take Photo
                    {/* FIX: `capture` here only, single file, no multiple */}
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      disabled={files.length >= MAX_PHOTOS}
                      onChange={handleCameraFile}
                    />
                  </label>
                </div>

                {/* Photo count indicator */}
                <div className="flex items-center gap-3">
                  {Array.from({ length: MAX_PHOTOS }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        i < files.length ? "bg-[#2B0A0F]" : "bg-[#2B0A0F]/10"
                      }`}
                    />
                  ))}
                  <span className="text-[9px] uppercase tracking-[0.2em] opacity-40 flex-shrink-0">
                    {files.length}/{MAX_PHOTOS}
                  </span>
                </div>

                <p className="text-[9px] uppercase tracking-[0.2em] opacity-35 leading-relaxed">
                  Tip — Lay the piece flat or hang it. Photograph the label, any flaws, and the full garment. More photos = faster sale.
                </p>

                {/* Next button */}
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={!canProceedStep0}
                  className="w-full py-4 bg-[#2B0A0F] text-[#F6F3EF] rounded-full text-[10px] uppercase tracking-[0.3em] hover:opacity-80 transition-opacity disabled:opacity-25"
                >
                  {canProceedStep0 ? "Next — Add Details →" : "Add at least one photo to continue"}
                </button>
              </motion.div>
            )}

            {/* ══════════════════
                STEP 1 — DETAILS
            ══════════════════ */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* FIX: on mobile the sidebar is hidden — show a compact photo strip at top instead */}
                <div className="flex gap-2 sm:hidden mb-6 overflow-x-auto pb-1">
                  {previewUrls.map((url, i) => (
                    <div key={i} className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-[#EAE3DB]">
                      <Image src={url} alt={`Photo ${i + 1}`} fill className="object-cover" />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setStep(0)}
                    className="flex-shrink-0 w-16 h-16 rounded-lg border border-dashed border-[#2B0A0F]/20 flex items-center justify-center text-[8px] uppercase tracking-[0.15em] opacity-40 hover:opacity-70 text-center leading-tight px-1"
                  >
                    Edit
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-10">

                  {/* Left — photo preview (desktop only) */}
                  <div className="hidden md:block">
                    <div className="sticky top-28 space-y-3">
                      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#EAE3DB]">
                        {previewUrls[0] && (
                          <Image src={previewUrls[0]} alt="Main photo" fill className="object-cover" />
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {previewUrls.slice(1, 4).map((url, i) => (
                          <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-[#EAE3DB]">
                            <Image src={url} alt={`Photo ${i + 2}`} fill className="object-cover" />
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep(0)}
                        className="w-full text-center text-[9px] uppercase tracking-[0.2em] opacity-35 hover:opacity-70 transition-opacity"
                      >
                        ← Edit Photos
                      </button>
                    </div>
                  </div>

                  {/* Right — form fields */}
                  <div className="space-y-8">

                    {/* Title */}
                    <div className="border-b border-[#2B0A0F]/12 focus-within:border-[#2B0A0F]/40 transition-colors">
                      <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-2">
                        Piece Name *
                      </label>
                      <input
                        suppressHydrationWarning
                        required
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Silk Anarkali Set, Vintage Denim Jacket..."
                        // FIX: font-size 16px minimum prevents iOS auto-zoom on focus
                        className="w-full bg-transparent pb-3 outline-none text-base sm:text-sm placeholder:opacity-20"
                      />
                    </div>

                    {/* Price + Location */}
                    {/* FIX: stack on very small screens, side-by-side from sm */}
                    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-6">
                      <div className="border-b border-[#2B0A0F]/12 focus-within:border-[#2B0A0F]/40 transition-colors">
                        <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-2">
                          Price (₹) *
                        </label>
                        <input
                          suppressHydrationWarning
                          required
                          type="number"
                          min="50"
                          inputMode="decimal"  // FIX: numeric keypad on mobile
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          placeholder="500"
                          className="w-full bg-transparent pb-3 outline-none text-base sm:text-sm placeholder:opacity-20"
                        />
                        {price && parseFloat(price) < 200 && (
                          <p className="text-[9px] text-[#A1123F] opacity-70 mt-1">
                            Tip — Most pieces sell between ₹300–₹2,000
                          </p>
                        )}
                      </div>

                      <div className="border-b border-[#2B0A0F]/12 focus-within:border-[#2B0A0F]/40 transition-colors">
                        <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-2">
                          Your City *
                        </label>
                        {/*
                          FIX: wrap select in relative div and add a custom chevron
                          because appearance-none removes the native arrow with no replacement
                        */}
                        <div className="relative">
                          <select
                            required
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="w-full bg-transparent pb-3 outline-none text-base sm:text-sm appearance-none cursor-pointer pr-6"
                          >
                            <option value="">Select city...</option>
                            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <svg
                            className="absolute right-0 bottom-4 pointer-events-none opacity-30"
                            width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                          >
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Condition */}
                    <div>
                      <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-3">
                        Condition *
                      </label>
                      {/* FIX: 2-col grid works on all sizes */}
                      <div className="grid grid-cols-2 gap-2">
                        {CONDITIONS.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => setCondition(c.value)}
                            className={`px-4 py-3 rounded-xl border text-left transition-all ${
                              condition === c.value
                                ? "bg-[#2B0A0F] text-[#F6F3EF] border-[#2B0A0F]"
                                : "border-[#2B0A0F]/12 hover:border-[#2B0A0F]/30 active:bg-[#EAE3DB]"
                            }`}
                          >
                            <p className="text-[10px] uppercase tracking-[0.15em] font-medium">{c.value}</p>
                            <p className={`text-[9px] mt-0.5 ${condition === c.value ? "opacity-60" : "opacity-35"}`}>
                              {c.desc}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Category */}
                    <div>
                      <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-3">
                        Category *
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setCategory(cat)}
                            className={`px-4 py-2 rounded-full border text-[10px] uppercase tracking-[0.12em] transition-all ${
                              category === cat
                                ? "bg-[#2B0A0F] text-[#F6F3EF] border-[#2B0A0F]"
                                : "border-[#2B0A0F]/12 hover:border-[#2B0A0F]/30 active:bg-[#EAE3DB]"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Size */}
                    <div>
                      <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-3">
                        Size
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {SIZES.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setSize(size === s ? "" : s)}
                            // FIX: min tap target 44px (Apple HIG / WCAG)
                            className={`min-w-[44px] h-[44px] px-3 rounded-full border text-[10px] uppercase tracking-[0.1em] transition-all ${
                              size === s
                                ? "bg-[#2B0A0F] text-[#F6F3EF] border-[#2B0A0F]"
                                : "border-[#2B0A0F]/12 hover:border-[#2B0A0F]/30 active:bg-[#EAE3DB]"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Mood */}
                    <div>
                      <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-1">
                        Mood / Aesthetic
                      </label>
                      <p className="text-[9px] opacity-30 mb-3">
                        This helps buyers find your piece through mood filters
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {MOODS.map((m) => (
                          <button
                            key={m.tag}
                            type="button"
                            onClick={() => setMood(mood === m.tag ? "" : m.tag)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] uppercase tracking-[0.12em] transition-all ${
                              mood === m.tag
                                ? "border-transparent text-[#F6F3EF]"
                                : "border-[#2B0A0F]/12 hover:border-[#2B0A0F]/20 active:bg-[#EAE3DB]"
                            }`}
                            style={mood === m.tag ? { background: m.color } : {}}
                          >
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ background: m.color }}
                            />
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Description */}
                    <div className="border-b border-[#2B0A0F]/12 focus-within:border-[#2B0A0F]/40 transition-colors">
                      <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-2">
                        The Story
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESC))} // FIX: enforce max client-side
                        placeholder="Tell us about this piece — where you got it, how you styled it, why it deserves a new home..."
                        rows={4}
                        // FIX: 16px min font prevents iOS zoom; resize-none already present
                        className="w-full bg-transparent pb-3 outline-none text-base sm:text-sm placeholder:opacity-20 resize-none leading-relaxed"
                      />
                      <p className={`text-[9px] mb-2 ${description.length >= MAX_DESC ? "text-[#A1123F] opacity-80" : "opacity-25"}`}>
                        {description.length}/{MAX_DESC} · A good story sells faster
                      </p>
                    </div>

                    {/* Submit */}
                    <div className="pt-4 space-y-3">
                      {/* FIX: show which fields are missing when button is disabled */}
                      {!canProceedStep1 && missingFields().length > 0 && (
                        <p className="text-[9px] text-[#A1123F] opacity-70 text-center">
                          Still needed: {missingFields().join(" · ")}
                        </p>
                      )}

                      <motion.button
                        type="submit"
                        disabled={loading || !canProceedStep1}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-4 bg-[#2B0A0F] text-[#F6F3EF] rounded-full text-[10px] uppercase tracking-[0.3em] hover:opacity-80 transition-opacity disabled:opacity-30 flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
                            </svg>
                            Archiving your piece...
                          </>
                        ) : (
                          "Submit Piece to Archive ✦"
                        )}
                      </motion.button>

                      <button
                        type="button"
                        onClick={() => setStep(0)}
                        className="w-full py-3 rounded-full border border-[#2B0A0F]/12 text-[10px] uppercase tracking-[0.2em] opacity-40 hover:opacity-80 transition-opacity"
                      >
                        ← Back to Photos
                      </button>
                    </div>

                    <p className="text-[9px] uppercase tracking-[0.15em] leading-relaxed opacity-30 text-center">
                      Every piece is reviewed before appearing in the Archive.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </form>
      </div>
    </main>
  );
}
