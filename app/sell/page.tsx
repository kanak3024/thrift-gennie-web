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
───────────────────────────── */
function PhotoSlot({
  index, preview, onRemove, onClick, isMain,
}: {
  index: number; preview?: string; onRemove: () => void;
  onClick: () => void; isMain: boolean;
}) {
  return (
    <motion.div
      layout
      className={`relative overflow-hidden rounded-xl cursor-pointer group ${
        isMain ? "aspect-[3/4]" : "aspect-square"
      } ${!preview ? "border-2 border-dashed border-[#2B0A0F]/12 bg-[#EAE3DB]/50 hover:border-[#2B0A0F]/30 hover:bg-[#EAE3DB] transition-all" : ""}`}
      onClick={!preview ? onClick : undefined}
    >
      {preview ? (
        <>
          <Image src={preview} alt={`Photo ${index + 1}`} fill className="object-cover" />
          {/* Remove button */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="absolute top-2 right-2 w-6 h-6 bg-black/60 text-white text-[10px] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
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
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 opacity-30">
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
        {step === 0 ? "Photos" : step === 1 ? "Details" : "Review"}
      </span>
    </div>
  );
}

/* ─────────────────────────────
   MAIN PAGE
───────────────────────────── */
export default function SellPage() {
  const router  = useRouter();
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep]           = useState(0); // 0=photos, 1=details
  const [userId, setUserId]       = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const [toast, setToast]         = useState<{ message: string; type: "success" | "error" } | null>(null);

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
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
      } else {
        router.push("/login");
      }
    };
    getSession();
  }, []);

  /* ── FILE HANDLING ── */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const combined = [...files, ...selected].slice(0, MAX_PHOTOS);
    setFiles(combined);
    setPreviewUrls(combined.map(f => URL.createObjectURL(f)));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    const newFiles    = files.filter((_, i) => i !== index);
    const newPreviews = previewUrls.filter((_, i) => i !== index);
    setFiles(newFiles);
    setPreviewUrls(newPreviews);
  };

  /* ── STEP VALIDATION ── */
  const canProceedStep0 = files.length >= 1;
  const canProceedStep1 = title.trim() && price && location && condition && category;

  /* ── SUBMIT ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) { router.push("/login"); return; }
    if (files.length === 0) { showToast("Please add at least one photo", "error"); return; }
    if (!condition) { showToast("Please select a condition", "error"); return; }
    if (!canProceedStep1) { showToast("Please fill in all required fields", "error"); return; }

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
        price:       parseFloat(price),
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

      <div className="max-w-4xl mx-auto px-6 pt-32 pb-24">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <p className="text-[9px] uppercase tracking-[0.4em] opacity-40 mb-3">Seller Studio</p>
          <h1
            className="leading-none mb-2"
            style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(2.2rem,5vw,3.5rem)" }}
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

                {/* Photo grid — main large + 3 small */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Main photo — spans 2 rows */}
                  <div className="row-span-2">
                    <PhotoSlot
                      index={0}
                      preview={previewUrls[0]}
                      onRemove={() => removeImage(0)}
                      onClick={() => fileInputRef.current?.click()}
                      isMain={true}
                    />
                  </div>
                  {/* Photos 2-4 */}
                  {[1, 2, 3].map((i) => (
                    <PhotoSlot
                      key={i}
                      index={i}
                      preview={previewUrls[i]}
                      onRemove={() => removeImage(i)}
                      onClick={() => fileInputRef.current?.click()}
                      isMain={false}
                    />
                  ))}
                </div>

                {/* Upload buttons */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={files.length >= MAX_PHOTOS}
                    className="flex-1 flex items-center justify-center gap-2 border border-[#2B0A0F]/15 rounded-full py-3 text-[10px] uppercase tracking-[0.2em] hover:bg-[#2B0A0F] hover:text-[#F6F3EF] hover:border-[#2B0A0F] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    Upload Photos
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={files.length >= MAX_PHOTOS}
                    className="flex-1 flex items-center justify-center gap-2 border border-[#2B0A0F]/15 rounded-full py-3 text-[10px] uppercase tracking-[0.2em] hover:bg-[#2B0A0F] hover:text-[#F6F3EF] hover:border-[#2B0A0F] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                    </svg>
                    Take Photo
                  </button>
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

                {/* Hidden inputs */}
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />

                {/* Next button */}
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={!canProceedStep0}
                  className="w-full py-4 bg-[#2B0A0F] text-[#F6F3EF] rounded-full text-[10px] uppercase tracking-[0.3em] hover:opacity-80 transition-opacity disabled:opacity-25"
                >
                  Next — Add Details →
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
                <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-10">

                  {/* Left — photo preview */}
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
                        className="w-full bg-transparent pb-3 outline-none text-sm placeholder:opacity-20"
                      />
                    </div>

                    {/* Price + Location */}
                    <div className="grid grid-cols-2 gap-6">
                      <div className="border-b border-[#2B0A0F]/12 focus-within:border-[#2B0A0F]/40 transition-colors">
                        <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-2">
                          Price (₹) *
                        </label>
                        <input
                          suppressHydrationWarning
                          required
                          type="number"
                          min="50"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          placeholder="500"
                          className="w-full bg-transparent pb-3 outline-none text-sm placeholder:opacity-20"
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
                        <select
                          required
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          className="w-full bg-transparent pb-3 outline-none text-sm appearance-none cursor-pointer"
                        >
                          <option value="">Select city...</option>
                          {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Condition */}
                    <div>
                      <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-3">
                        Condition *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {CONDITIONS.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => setCondition(c.value)}
                            className={`px-4 py-3 rounded-xl border text-left transition-all ${
                              condition === c.value
                                ? "bg-[#2B0A0F] text-[#F6F3EF] border-[#2B0A0F]"
                                : "border-[#2B0A0F]/12 hover:border-[#2B0A0F]/30"
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
                                : "border-[#2B0A0F]/12 hover:border-[#2B0A0F]/30"
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
                            className={`min-w-[44px] h-[44px] px-3 rounded-full border text-[10px] uppercase tracking-[0.1em] transition-all ${
                              size === s
                                ? "bg-[#2B0A0F] text-[#F6F3EF] border-[#2B0A0F]"
                                : "border-[#2B0A0F]/12 hover:border-[#2B0A0F]/30"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Mood — NEW, critical for browse filters */}
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
                                : "border-[#2B0A0F]/12 hover:border-[#2B0A0F]/20"
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
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Tell us about this piece — where you got it, how you styled it, why it deserves a new home..."
                        rows={4}
                        className="w-full bg-transparent pb-3 outline-none text-sm placeholder:opacity-20 resize-none leading-relaxed"
                      />
                      <p className="text-[9px] opacity-25 mb-2">
                        {description.length}/500 · A good story sells faster
                      </p>
                    </div>

                    {/* Submit */}
                    <div className="pt-4 space-y-3">
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
