"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

const CONDITIONS = [
  { value: "Like New",   desc: "Worn once or never" },
  { value: "Good",       desc: "Minimal signs of wear" },
  { value: "Fair",       desc: "Visible wear, still great" },
  { value: "Well Loved", desc: "Loved to the max" },
];
const SIZES      = ["XS", "S", "M", "L", "XL", "XXL", "Free Size", "Custom"];
const CATEGORIES = ["Tops", "Bottoms", "Dresses", "Outerwear", "Accessories", "Footwear", "Bags", "Jewellery", "Other"];
const MOODS      = [
  { tag: "y2k",       label: "Y2K",         color: "#C77DFF" },
  { tag: "oldmoney",  label: "Old Money",   color: "#B48A5A" },
  { tag: "indie",     label: "Indie",       color: "#6B7E60" },
  { tag: "bollywood", label: "Bollywood",   color: "#C41E3A" },
  { tag: "90s",       label: "90s Minimal", color: "#457B9D" },
];
const CITIES     = ["Mumbai", "Pune", "Delhi", "Bengaluru", "Jaipur", "Hyderabad", "Chennai", "Kolkata", "Other"];
const MAX_PHOTOS = 4;
const MAX_DESC   = 500;
const MAX_TITLE  = 80;

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

export default function EditListingPage() {
  const router   = useRouter();
  const { id }   = useParams();

  const [loading, setLoading]           = useState(false);
  const [fetching, setFetching]         = useState(true);
  const [userId, setUserId]             = useState<string | null>(null);
  const [toast, setToast]               = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Existing images from DB
  const [existingImages, setExistingImages] = useState<string[]>([]);
  // New files the user adds
  const [newFiles, setNewFiles]             = useState<File[]>([]);
  const [newPreviews, setNewPreviews]       = useState<string[]>([]);

  // Form fields
  const [title, setTitle]               = useState("");
  const [price, setPrice]               = useState("");
  const [location, setLocation]         = useState("");
  const [description, setDescription]   = useState("");
  const [condition, setCondition]       = useState("");
  const [size, setSize]                 = useState("");
  const [category, setCategory]         = useState("");
  const [mood, setMood]                 = useState("");

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // All images shown = existing + new previews
  const allPreviews = [
    ...existingImages,
    ...newPreviews,
  ].slice(0, MAX_PHOTOS);

  /* ── AUTH + FETCH PRODUCT ── */
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setUserId(user.id);

      const { data: product } = await supabase
        .from("products").select("*").eq("id", id).single();

      if (!product) { router.replace("/account/" + user.id); return; }
      if (product.seller_id !== user.id) { router.replace("/account/" + user.id); return; }

      // Pre-fill all fields
      setTitle(product.title || "");
      setPrice(product.price?.toString() || "");
      setLocation(product.location || "");
      setDescription(product.description || "");
      setCondition(product.condition || "");
      setSize(product.size || "");
      setCategory(product.category || "");
      setMood(product.mood || "");

      const imgs = [product.image_url, ...(product.extra_images || [])].filter(Boolean);
      setExistingImages(imgs);
      setFetching(false);
    };
    init();
  }, [id, router]);

  /* ── REMOVE EXISTING IMAGE ── */
  const removeExisting = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  /* ── ADD NEW FILES ── */
  const handleNewFiles = (selected: FileList | null) => {
    if (!selected) return;
    const remaining = MAX_PHOTOS - existingImages.length - newFiles.length;
    const added = Array.from(selected).slice(0, remaining);
    const updated = [...newFiles, ...added];
    setNewFiles(updated);
    setNewPreviews(updated.map(f => URL.createObjectURL(f)));
  };

  const removeNew = (index: number) => {
    URL.revokeObjectURL(newPreviews[index]);
    const updatedFiles    = newFiles.filter((_, i) => i !== index);
    const updatedPreviews = newPreviews.filter((_, i) => i !== index);
    setNewFiles(updatedFiles);
    setNewPreviews(updatedPreviews);
  };

  /* ── SUBMIT ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !title.trim() || !price || !location || !condition || !category) {
      showToast("Please fill in all required fields", "error");
      return;
    }
    if (existingImages.length + newFiles.length === 0) {
      showToast("Add at least one photo", "error");
      return;
    }

    setLoading(true);
    try {
      // Upload any new files
      const uploadedUrls: string[] = [];
      for (const file of newFiles) {
        const ext       = file.name.split(".").pop();
        const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 20);
        const fileName  = `${cleanTitle}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const filePath  = `inventory/${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("product-images").upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("product-images").getPublicUrl(filePath);
        uploadedUrls.push(publicUrl);
      }

      // Combine: existing kept + newly uploaded
      const allImages   = [...existingImages, ...uploadedUrls];
      const mainImage   = allImages[0];
      const extraImages = allImages.slice(1);

      const { error: dbError } = await supabase
        .from("products")
        .update({
          title,
          price:        parseFloat(price),
          location,
          description,
          condition,
          size,
          category,
          mood,
          image_url:    mainImage,
          extra_images: extraImages,
        })
        .eq("id", id);

      if (dbError) throw dbError;

      showToast("Listing updated ✦");
      setTimeout(() => router.push(`/account/${userId}`), 1500);

    } catch (err: any) {
      console.error(err);
      showToast(`Update failed: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F3EF]">
        <p className="text-sm opacity-40">Loading listing...</p>
      </div>
    );
  }

  const canSubmit = title.trim() && price && location && condition && category;

  return (
    <main className="min-h-screen bg-[#F6F3EF] text-[#2B0A0F]">
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} />}
      </AnimatePresence>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-20 sm:pt-32 pb-24">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <p className="text-[9px] uppercase tracking-[0.4em] opacity-40 mb-3">Seller Studio</p>
          <h1
            className="leading-none mb-2"
            style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(1.8rem,5vw,3.5rem)" }}
          >
            Edit Listing
          </h1>
          <p className="text-[10px] uppercase tracking-[0.3em] opacity-40">
            Changes go live immediately after saving.
          </p>
        </motion.div>

        <form onSubmit={handleSubmit}>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

            {/* ── PHOTOS ── */}
            <div>
              <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-3">
                Photos ({allPreviews.length}/{MAX_PHOTOS})
              </label>

              <div className="grid grid-cols-4 gap-2 mb-3">
                {/* Existing images */}
                {existingImages.map((url, i) => (
                  <div key={`existing-${i}`} className={`relative overflow-hidden rounded-xl group ${i === 0 ? "col-span-2 row-span-2 aspect-[3/4]" : "aspect-square"}`}>
                    <Image src={url} alt={`Photo ${i + 1}`} fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => removeExisting(i)}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white text-[10px] rounded-full flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                    {i === 0 && (
                      <span className="absolute bottom-2 left-2 text-[8px] uppercase tracking-[0.2em] bg-black/50 text-white px-2 py-0.5 rounded-full">
                        Main
                      </span>
                    )}
                  </div>
                ))}

                {/* New preview images */}
                {newPreviews.map((url, i) => (
                  <div key={`new-${i}`} className="relative overflow-hidden rounded-xl aspect-square group">
                    <Image src={url} alt={`New photo ${i + 1}`} fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => removeNew(i)}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white text-[10px] rounded-full flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {/* Add more slot */}
                {allPreviews.length < MAX_PHOTOS && (
                  <label className="aspect-square rounded-xl border-2 border-dashed border-[#2B0A0F]/12 bg-[#EAE3DB]/50 hover:border-[#2B0A0F]/30 hover:bg-[#EAE3DB] transition-all cursor-pointer flex flex-col items-center justify-center gap-1 opacity-40 hover:opacity-70">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
                    </svg>
                    <span className="text-[8px] uppercase tracking-[0.15em]">Add</span>
                    <input
                      type="file" accept="image/*" multiple className="hidden"
                      onChange={(e) => handleNewFiles(e.target.files)}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* ── TITLE ── */}
            <div className="border-b border-[#2B0A0F]/12 focus-within:border-[#2B0A0F]/40 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[8px] uppercase tracking-[0.25em] opacity-40">Piece Name *</label>
                <span className={`text-[8px] opacity-30 ${title.length > MAX_TITLE * 0.8 ? "text-[#A1123F] opacity-70" : ""}`}>
                  {title.length}/{MAX_TITLE}
                </span>
              </div>
              <input
                required type="text" value={title} maxLength={MAX_TITLE}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-transparent pb-3 outline-none text-base placeholder:opacity-20"
              />
            </div>

            {/* ── PRICE + CITY ── */}
            <div className="grid grid-cols-2 gap-6">
              <div className="border-b border-[#2B0A0F]/12 focus-within:border-[#2B0A0F]/40 transition-colors">
                <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-2">Price (₹) *</label>
                <input
                  required type="number" min="50" inputMode="decimal" value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-transparent pb-3 outline-none text-base placeholder:opacity-20"
                />
              </div>
              <div className="border-b border-[#2B0A0F]/12 focus-within:border-[#2B0A0F]/40 transition-colors">
                <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-2">Your City *</label>
                <div className="relative">
                  <select
                    required value={location} onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-transparent pb-3 outline-none text-base appearance-none cursor-pointer pr-6"
                  >
                    <option value="">Select...</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <svg className="absolute right-0 bottom-4 pointer-events-none opacity-30" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* ── CONDITION ── */}
            <div>
              <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-3">Condition *</label>
              <div className="grid grid-cols-2 gap-2">
                {CONDITIONS.map((c) => (
                  <button key={c.value} type="button" onClick={() => setCondition(c.value)}
                    className={`px-4 py-3 rounded-xl border text-left transition-all ${
                      condition === c.value
                        ? "bg-[#2B0A0F] text-[#F6F3EF] border-[#2B0A0F]"
                        : "border-[#2B0A0F]/12 hover:border-[#2B0A0F]/30"
                    }`}
                  >
                    <p className="text-[10px] uppercase tracking-[0.15em] font-medium">{c.value}</p>
                    <p className={`text-[9px] mt-0.5 ${condition === c.value ? "opacity-60" : "opacity-35"}`}>{c.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* ── CATEGORY ── */}
            <div>
              <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-3">Category *</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button key={cat} type="button" onClick={() => setCategory(cat)}
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

            {/* ── SIZE ── */}
            <div>
              <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-3">Size</label>
              <div className="flex flex-wrap gap-2">
                {SIZES.map((s) => (
                  <button key={s} type="button" onClick={() => setSize(size === s ? "" : s)}
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

            {/* ── MOOD ── */}
            <div>
              <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-3">Mood / Aesthetic</label>
              <div className="flex flex-wrap gap-2">
                {MOODS.map((m) => (
                  <button key={m.tag} type="button" onClick={() => setMood(mood === m.tag ? "" : m.tag)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] uppercase tracking-[0.12em] transition-all ${
                      mood === m.tag
                        ? "border-transparent text-[#F6F3EF]"
                        : "border-[#2B0A0F]/12 hover:border-[#2B0A0F]/20"
                    }`}
                    style={mood === m.tag ? { background: m.color } : {}}
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.color }} />
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── DESCRIPTION ── */}
            <div className="border-b border-[#2B0A0F]/12 focus-within:border-[#2B0A0F]/40 transition-colors">
              <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-2">The Story</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESC))}
                rows={4}
                className="w-full bg-transparent pb-3 outline-none text-base placeholder:opacity-20 resize-none leading-relaxed"
              />
              <div className="border-b border-[#2B0A0F]/12 focus-within:border-[#2B0A0F]/40 transition-colors">
              <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-2">The Story</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESC))}
                rows={4}
                className="w-full bg-transparent pb-3 outline-none text-base placeholder:opacity-20 resize-none leading-relaxed"
              />
              <p className={`text-[9px] mb-2 ${description.length >= MAX_DESC ? "text-[#A1123F] opacity-80" : "opacity-25"}`}>
                {description.length}/{MAX_DESC}
              </p>
            </div>

            {/* ── ACTIONS ── */}
            <div className="space-y-3 pt-2">
              <motion.button
                type="submit" disabled={loading || !canSubmit} whileTap={{ scale: 0.98 }}
                className="w-full py-4 bg-[#2B0A0F] text-[#F6F3EF] rounded-full text-[10px] uppercase tracking-[0.3em] hover:opacity-80 transition-opacity disabled:opacity-30 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
                    </svg>
                    Saving Changes...
                  </>
                ) : "Save Changes ✦"}
              </motion.button>

              <button
                type="button" onClick={() => router.back()}
                className="w-full py-3 rounded-full border border-[#2B0A0F]/12 text-[10px] uppercase tracking-[0.2em] opacity-40 hover:opacity-80 transition-opacity"
              >
                ← Cancel
              </button>
            </div>

          </motion.div>
        </form>
      </div>
    </main>
    );
}