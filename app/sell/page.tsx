"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
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
const CITIES = ["Mumbai", "Pune", "Delhi", "Bengaluru", "Jaipur", "Hyderabad", "Chennai", "Kolkata", "Other"];
const COLOURS = [
  { label: "Black",  hex: "#1C1C1C" },
  { label: "White",  hex: "#F0EDE8" },
  { label: "Red",    hex: "#C0392B" },
  { label: "Pink",   hex: "#E91E8C" },
  { label: "Blue",   hex: "#2980B9" },
  { label: "Green",  hex: "#27AE60" },
  { label: "Brown",  hex: "#8B5E3C" },
  { label: "Beige",  hex: "#D4B896" },
  { label: "Yellow", hex: "#F1C40F" },
  { label: "Purple", hex: "#8E44AD" },
  { label: "Orange", hex: "#E67E22" },
  { label: "Multi",  hex: "conic-gradient(#C0392B,#F1C40F,#2980B9,#27AE60,#C0392B)" },
];

const MAX_PHOTOS = 4;
const MAX_DESC   = 500;
const MAX_TITLE  = 80;

const SIZE_GUIDE: Record<string, { chest: string; waist: string; hips: string }> = {
  XS:  { chest: "80–84",   waist: "60–64",  hips: "86–90"   },
  S:   { chest: "84–88",   waist: "64–68",  hips: "90–94"   },
  M:   { chest: "88–92",   waist: "68–72",  hips: "94–98"   },
  L:   { chest: "92–96",   waist: "72–76",  hips: "98–102"  },
  XL:  { chest: "96–100",  waist: "76–80",  hips: "102–106" },
  XXL: { chest: "100–104", waist: "80–84",  hips: "106–110" },
};

const PRICE_RANGES: Record<string, [number, number]> = {
  Tops:        [200,  800],
  Bottoms:     [300, 1200],
  Dresses:     [400, 2000],
  Outerwear:   [600, 3000],
  Accessories: [150,  900],
  Footwear:    [400, 2500],
  Bags:        [500, 4000],
  Jewellery:   [100,  800],
  Other:       [200, 1500],
};
const CONDITION_MULTIPLIER: Record<string, number> = {
  "Like New":   1.0,
  "Good":       0.8,
  "Fair":       0.6,
  "Well Loved": 0.4,
};

function getPriceRange(category: string, condition: string): [number, number] | null {
  if (!category || !condition) return null;
  const base = PRICE_RANGES[category];
  if (!base) return null;
  const mult = CONDITION_MULTIPLIER[condition] ?? 0.8;
  return [Math.round(base[0] * mult / 50) * 50, Math.round(base[1] * mult / 50) * 50];
}

function getQualityScore(fields: {
  photos: number; title: string; price: string; location: string;
  condition: string; category: string; size: string; mood: string;
  description: string; brand: string; colour: string;
}): { score: number; label: string; color: string; tips: string[] } {
  let score = 0;
  const tips: string[] = [];

  if (fields.photos >= 1)              score += 20; else tips.push("Add a photo");
  if (fields.photos >= 3)              score += 10; else if (fields.photos >= 1) tips.push("Add more photos for faster sales");
  if (fields.title.length >= 5)        score += 10; else tips.push("Add a piece name");
  if (fields.price)                    score += 10; else tips.push("Set a price");
  if (fields.location)                 score += 5;
  if (fields.condition)                score += 10; else tips.push("Select condition");
  if (fields.category)                 score += 10; else tips.push("Pick a category");
  if (fields.size)                     score += 5;
  if (fields.mood)                     score += 5;
  if (fields.description.length >= 30) score += 10; else tips.push("Write a short description");
  if (fields.brand)                    score += 5;
  if (fields.colour)                   score += 5;  else tips.push("Pick a colour");

  const label = score >= 85 ? "Excellent" : score >= 60 ? "Good" : score >= 35 ? "Fair" : "Getting started";
  const color = score >= 85 ? "#6B7E60"  : score >= 60 ? "#B48A5A" : score >= 35 ? "#C77DFF" : "#2B0A0F";
  return { score, label, color, tips };
}

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full text-[10px] uppercase tracking-[0.2em] shadow-lg whitespace-nowrap ${
        type === "success" ? "bg-[#2B0A0F] text-[#F6F3EF]" : "bg-[#A1123F] text-white"
      }`}
    >{message}</motion.div>
  );
}

function PhotoSlot({ index, preview, onRemove, onFileSelected, isMain }: {
  index: number; preview?: string; onRemove: () => void; onFileSelected: (file: File) => void; isMain: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <motion.div layout
      className={`relative overflow-hidden rounded-xl group ${isMain ? "aspect-[3/4]" : "aspect-square"} ${
        !preview ? "border-2 border-dashed border-[#2B0A0F]/12 bg-[#EAE3DB]/50 hover:border-[#2B0A0F]/30 hover:bg-[#EAE3DB] transition-all cursor-pointer" : ""
      }`}
      onClick={() => !preview && inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileSelected(f); if (inputRef.current) inputRef.current.value = ""; }}
      />
      {preview ? (
        <>
          <Image src={preview} alt={`Photo ${index + 1}`} fill className="object-cover" />
          <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="absolute top-2 right-2 w-8 h-8 bg-black/60 text-white text-[11px] rounded-full flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">✕</button>
          {isMain && <span className="absolute bottom-2 left-2 text-[8px] uppercase tracking-[0.2em] bg-black/50 text-white px-2 py-0.5 rounded-full">Main</span>}
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 opacity-30 pointer-events-none">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>
          <span className="text-[8px] uppercase tracking-[0.2em]">{isMain ? "Main Photo" : `Photo ${index + 1}`}</span>
        </div>
      )}
    </motion.div>
  );
}

function ProgressBar({ step, total }: { step: number; total: number }) {
  const labels = ["Photos", "Details"];
  return (
    <div className="flex items-center gap-2 sm:gap-3 mb-8 sm:mb-10">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] transition-all flex-shrink-0 ${
              i < step ? "bg-[#2B0A0F] text-[#F6F3EF]" : i === step ? "bg-[#2B0A0F]/10 text-[#2B0A0F] border border-[#2B0A0F]/20" : "bg-[#2B0A0F]/05 text-[#2B0A0F]/25"
            }`}>{i < step ? "✓" : i + 1}</div>
            <span className={`text-[9px] uppercase tracking-[0.15em] hidden sm:block ${i === step ? "opacity-60" : "opacity-20"}`}>{labels[i]}</span>
          </div>
          {i < total - 1 && <div className={`h-px w-6 sm:w-10 transition-all ${i < step ? "bg-[#2B0A0F]" : "bg-[#2B0A0F]/10"}`} />}
        </div>
      ))}
      <span className="ml-1 text-[9px] uppercase tracking-[0.2em] opacity-40 sm:hidden">{labels[step] ?? ""}</span>
    </div>
  );
}

function QualityMeter({ score, label, color, tips }: { score: number; label: string; color: string; tips: string[] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-[#2B0A0F]/08 bg-white/60 p-4 mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] uppercase tracking-[0.25em] opacity-40">Listing Quality</span>
        <span className="text-[10px] uppercase tracking-[0.15em] font-medium" style={{ color }}>{label}</span>
      </div>
      <div className="h-1.5 w-full bg-[#2B0A0F]/08 rounded-full overflow-hidden mb-3">
        <motion.div animate={{ width: `${score}%` }} transition={{ duration: 0.5, ease: "easeOut" }} className="h-full rounded-full" style={{ background: color }} />
      </div>
      {tips.length > 0 && score < 85 && (
        <div className="flex flex-wrap gap-1.5">
          {tips.slice(0, 2).map((tip) => (
            <span key={tip} className="text-[8px] uppercase tracking-[0.1em] px-2 py-1 rounded-full bg-[#2B0A0F]/05 opacity-50">+ {tip}</span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function SizeGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[#F6F3EF] rounded-2xl p-6 sm:p-8 w-[calc(100vw-2rem)] sm:w-[480px] shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl" style={{ fontFamily: "var(--font-playfair)" }}>Size Guide</h3>
            <p className="text-[9px] uppercase tracking-widest opacity-40 mt-0.5">Measurements in centimetres</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full border border-[#2B0A0F]/15 flex items-center justify-center text-[11px] opacity-40 hover:opacity-100 transition-opacity">✕</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2B0A0F]/10">
                {["Size", "Chest", "Waist", "Hips"].map(h => (
                  <th key={h} className="text-left text-[9px] uppercase tracking-[0.2em] opacity-40 pb-3 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(SIZE_GUIDE).map(([s, m], i) => (
                <tr key={s} className={`border-b border-[#2B0A0F]/05 ${i % 2 === 0 ? "bg-[#2B0A0F]/02" : ""}`}>
                  <td className="py-3 pr-4 font-medium text-[10px] uppercase tracking-widest">{s}</td>
                  <td className="py-3 pr-4 text-[11px] opacity-60">{m.chest} cm</td>
                  <td className="py-3 pr-4 text-[11px] opacity-60">{m.waist} cm</td>
                  <td className="py-3 text-[11px] opacity-60">{m.hips} cm</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-5 pt-4 border-t border-[#2B0A0F]/08">
          <p className="text-[9px] uppercase tracking-[0.15em] opacity-35 leading-relaxed">
            General Indian sizing guidelines. Vintage and imported pieces may run differently — mention in your description if sizing is unusual.
          </p>
        </div>
      </motion.div>
    </>
  );
}

function AIDescriptionButton({ photos, title, category, condition, size, mood, onGenerated }: {
  photos: string[]; title: string; category: string; condition: string; size: string; mood: string; onGenerated: (text: string) => void;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const generate = async () => {
    if (photos.length === 0) return;
    setState("loading");
    try {
      const blob   = await fetch(photos[0]).then((r) => r.blob());
      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload  = () => res((reader.result as string).split(",")[1]);
        reader.onerror = rej;
        reader.readAsDataURL(blob);
      });
      const response = await fetch("/api/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, mediaType: blob.type || "image/jpeg", title, category, condition, size, mood }),
      });
      const data = await response.json();
      if (data.text) { onGenerated(data.text); setState("done"); setTimeout(() => setState("idle"), 3000); }
      else setState("idle");
    } catch { setState("idle"); }
  };
  return (
    <motion.button type="button" onClick={generate} disabled={state === "loading" || photos.length === 0} whileTap={{ scale: 0.97 }}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] uppercase tracking-[0.2em] transition-all ${
        state === "done"    ? "border-[#6B7E60] text-[#6B7E60] bg-[#6B7E60]/08"
        : state === "loading" ? "border-[#2B0A0F]/20 text-[#2B0A0F]/40"
        : photos.length === 0 ? "border-[#2B0A0F]/10 text-[#2B0A0F]/25 cursor-not-allowed"
        : "border-[#B48A5A]/50 text-[#B48A5A] hover:bg-[#B48A5A]/08"
      }`}
    >
      {state === "loading" ? <><svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/></svg>Writing...</>
        : state === "done" ? <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Done</>
        : <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>✦ Write with AI</>
      }
    </motion.button>
  );
}

export default function SellPage() {
  const router         = useRouter();
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep]                 = useState(0);
  const [userId, setUserId]             = useState<string | null>(null);
  const [loading, setLoading]           = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [toast, setToast]               = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  const [title, setTitle]               = useState("");
  const [brand, setBrand]               = useState("");
  const [price, setPrice]               = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [negotiable, setNegotiable]     = useState(false);
  const [shippingPrice, setShippingPrice] = useState<string>("0");
  const [freeShipping, setFreeShipping] = useState(false);
  const [location, setLocation]         = useState("");
  const [description, setDescription]   = useState("");
  const [condition, setCondition]       = useState("");
  const [size, setSize]                 = useState("");
  const [category, setCategory]         = useState("");
  const [mood, setMood]                 = useState("");
  const [colour, setColour]             = useState("");
  const [files, setFiles]               = useState<File[]>([]);
  const [previewUrls, setPreviewUrls]   = useState<string[]>([]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setUserId(user.id);
      setCheckingAuth(false);
    };
    checkUser();
  }, [router]);

  const handleSlotFile = (slotIndex: number, newFile: File) => {
    setFiles(prev => {
      const updated = [...prev];
      if (slotIndex < updated.length) updated[slotIndex] = newFile;
      else if (updated.length < MAX_PHOTOS) updated.push(newFile);
      setPreviewUrls(updated.map(f => URL.createObjectURL(f)));
      return updated;
    });
  };

  const handleCameraFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || files.length >= MAX_PHOTOS) return;
    const updated = [...files, file];
    setFiles(updated);
    setPreviewUrls(updated.map(f => URL.createObjectURL(f)));
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setFiles(files.filter((_, i) => i !== index));
    setPreviewUrls(previewUrls.filter((_, i) => i !== index));
  };

  const canProceedStep0 = files.length >= 1;
  const canProceedStep1 = title.trim() && price && location && condition && category;

  const missingFields = () => {
    const m = [];
    if (!title.trim()) m.push("piece name");
    if (!price)        m.push("price");
    if (!location)     m.push("city");
    if (!condition)    m.push("condition");
    if (!category)     m.push("category");
    return m;
  };

  const priceRange = getPriceRange(category, condition);
  const quality    = getQualityScore({ photos: files.length, title, price, location, condition, category, size, mood, description, brand, colour });
  const savingPct  = price && originalPrice && parseFloat(originalPrice) > parseFloat(price)
    ? Math.round((1 - parseFloat(price) / parseFloat(originalPrice)) * 100) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) { router.push("/login"); return; }
    if (files.length === 0) { showToast("Please add at least one photo", "error"); return; }
    if (!canProceedStep1) { showToast(`Missing: ${missingFields().join(", ")}`, "error"); return; }

    setLoading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const fileExt    = file.name.split(".").pop();
        const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 20);
        const fileName   = `${cleanTitle}-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath   = `inventory/${userId}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from("product-images").upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(filePath);
        uploadedUrls.push(publicUrl);
      }
      const { error: dbError } = await supabase.from("products").insert([{
        title, brand: brand || null,
        price: parseFloat(price),
        original_price: originalPrice ? parseFloat(originalPrice) : null,
        negotiable,
        shipping_price: freeShipping ? 0 : Math.min(parseInt(shippingPrice) || 0, 60),
        location, description, condition, size, category, mood,
        colour: colour || null,
        image_url:    uploadedUrls[0],
        extra_images: uploadedUrls.slice(1),
        seller_id:    userId,
        status:       "available",
      }]);
      if (dbError) throw dbError;
      showToast("Piece added to the Archive ✦");
      setTimeout(() => router.push(`/account/${userId}`), 1500);
    } catch (err: any) {
      showToast(`Submission failed: ${err.message || "Unknown error"}`, "error");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) return <div className="min-h-screen flex items-center justify-center"><p className="text-sm opacity-40">Checking access...</p></div>;

  return (
    <main className="min-h-screen bg-[#F6F3EF] text-[#2B0A0F]">
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} />}
        {sizeGuideOpen && <SizeGuideModal onClose={() => setSizeGuideOpen(false)} />}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 sm:pt-32 pb-24">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8 sm:mb-10">
          <p className="text-[9px] uppercase tracking-[0.4em] opacity-40 mb-3">Seller Studio</p>
          <h1 className="leading-none mb-2" style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(1.8rem,5vw,3.5rem)" }}>Submit to the Archive</h1>
          <p className="text-[10px] uppercase tracking-[0.3em] opacity-40">Sourced with intention. Listed with care.</p>
        </motion.div>

        <ProgressBar step={step} total={2} />

        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">

            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-6 sm:space-y-8">
                <div>
                  <h2 className="text-2xl mb-1" style={{ fontFamily: "var(--font-playfair)" }}>First, the visuals.</h2>
                  <p className="text-sm opacity-50">Add up to {MAX_PHOTOS} photos. Natural light works best.</p>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:hidden">
                  <div className="col-span-3"><PhotoSlot index={0} preview={previewUrls[0]} onRemove={() => removeImage(0)} onFileSelected={(f) => handleSlotFile(0, f)} isMain={true} /></div>
                  {[1, 2, 3].map((i) => <PhotoSlot key={i} index={i} preview={previewUrls[i]} onRemove={() => removeImage(i)} onFileSelected={(f) => handleSlotFile(i, f)} isMain={false} />)}
                </div>
                <div className="hidden sm:grid grid-cols-3 gap-3">
                  <div className="row-span-2"><PhotoSlot index={0} preview={previewUrls[0]} onRemove={() => removeImage(0)} onFileSelected={(f) => handleSlotFile(0, f)} isMain={true} /></div>
                  {[1, 2, 3].map((i) => <PhotoSlot key={i} index={i} preview={previewUrls[i]} onRemove={() => removeImage(i)} onFileSelected={(f) => handleSlotFile(i, f)} isMain={false} />)}
                </div>
                <div className="flex gap-3">
                  <label className={`flex-1 flex items-center justify-center gap-2 border border-[#2B0A0F]/15 rounded-full py-3.5 text-[10px] uppercase tracking-[0.2em] hover:bg-[#2B0A0F] hover:text-[#F6F3EF] hover:border-[#2B0A0F] transition-all cursor-pointer select-none ${files.length >= MAX_PHOTOS ? "opacity-30 pointer-events-none" : ""}`}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    Upload
                    <input type="file" accept="image/*" multiple className="hidden" disabled={files.length >= MAX_PHOTOS}
                      onChange={(e) => { const s = Array.from(e.target.files || []); const c = [...files, ...s].slice(0, MAX_PHOTOS); setFiles(c); setPreviewUrls(c.map(f => URL.createObjectURL(f))); e.target.value = ""; }} />
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-2 border border-[#2B0A0F]/15 rounded-full py-3.5 text-[10px] uppercase tracking-[0.2em] hover:bg-[#2B0A0F] hover:text-[#F6F3EF] hover:border-[#2B0A0F] transition-all cursor-pointer select-none ${files.length >= MAX_PHOTOS ? "opacity-30 pointer-events-none" : ""}`}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    Take Photo
                    <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" disabled={files.length >= MAX_PHOTOS} onChange={handleCameraFile} />
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  {Array.from({ length: MAX_PHOTOS }).map((_, i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i < files.length ? "bg-[#2B0A0F]" : "bg-[#2B0A0F]/10"}`} />
                  ))}
                  <span className="text-[9px] uppercase tracking-[0.2em] opacity-40 flex-shrink-0">{files.length}/{MAX_PHOTOS}</span>
                </div>
                <p className="text-[9px] uppercase tracking-[0.2em] opacity-35 leading-relaxed">Tip — Lay flat or hang. Photograph the label, any flaws, and the full garment. More photos = faster sale.</p>
                <button type="button" onClick={() => setStep(1)} disabled={!canProceedStep0}
                  className="w-full py-4 bg-[#2B0A0F] text-[#F6F3EF] rounded-full text-[10px] uppercase tracking-[0.3em] hover:opacity-80 transition-opacity disabled:opacity-25">
                  {canProceedStep0 ? "Next — Add Details →" : "Add at least one photo to continue"}
                </button>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                <div className="flex gap-2 sm:hidden mb-5 overflow-x-auto pb-1">
                  {previewUrls.map((url, i) => (
                    <div key={i} className="relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-[#EAE3DB]">
                      <Image src={url} alt={`Photo ${i + 1}`} fill className="object-cover" />
                    </div>
                  ))}
                  <button type="button" onClick={() => setStep(0)}
                    className="flex-shrink-0 w-14 h-14 rounded-lg border border-dashed border-[#2B0A0F]/20 flex items-center justify-center text-[8px] uppercase tracking-[0.1em] opacity-40 hover:opacity-70 text-center leading-tight px-1">Edit</button>
                </div>

                <QualityMeter {...quality} />

                <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-8 md:gap-10">
                  <div className="hidden md:block">
                    <div className="sticky top-28 space-y-3">
                      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#EAE3DB]">
                        {previewUrls[0] && <Image src={previewUrls[0]} alt="Main photo" fill className="object-cover" />}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {previewUrls.slice(1, 4).map((url, i) => (
                          <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-[#EAE3DB]">
                            <Image src={url} alt={`Photo ${i + 2}`} fill className="object-cover" />
                          </div>
                        ))}
                      </div>
                      <button type="button" onClick={() => setStep(0)} className="w-full text-center text-[9px] uppercase tracking-[0.2em] opacity-35 hover:opacity-70 transition-opacity">← Edit Photos</button>
                    </div>
                  </div>

                  <div className="space-y-7 sm:space-y-8">

                    {/* Title */}
                    <div className="border-b border-[#2B0A0F]/12 focus-within:border-[#2B0A0F]/40 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[8px] uppercase tracking-[0.25em] opacity-40">Piece Name *</label>
                        <span className={`text-[8px] opacity-30 ${title.length > MAX_TITLE * 0.8 ? "text-[#A1123F] opacity-70" : ""}`}>{title.length}/{MAX_TITLE}</span>
                      </div>
                      <input suppressHydrationWarning required type="text" value={title} maxLength={MAX_TITLE}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Silk Anarkali Set, Vintage Denim Jacket..."
                        className="w-full bg-transparent pb-3 outline-none text-base placeholder:opacity-20"
                      />
                    </div>

                    {/* Brand */}
                    <div className="border-b border-[#2B0A0F]/12 focus-within:border-[#2B0A0F]/40 transition-colors">
                      <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-2">Brand / Label</label>
                      <input suppressHydrationWarning type="text" value={brand} onChange={(e) => setBrand(e.target.value)}
                        placeholder="e.g. Zara, H&M, Fabindia, No Label..."
                        className="w-full bg-transparent pb-3 outline-none text-base placeholder:opacity-20"
                      />
                    </div>

                    {/* Price + Original Price */}
                    <div className="grid grid-cols-2 gap-4 sm:gap-6">
                      <div className="border-b border-[#2B0A0F]/12 focus-within:border-[#2B0A0F]/40 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[8px] uppercase tracking-[0.25em] opacity-40">Price (₹) *</label>
                          <button type="button" onClick={() => setNegotiable(!negotiable)}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-[8px] uppercase tracking-[0.15em] transition-all ${
                              negotiable ? "bg-[#6B7E60] border-[#6B7E60] text-white" : "border-[#2B0A0F]/15 opacity-40 hover:opacity-70"
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${negotiable ? "bg-white" : "bg-[#2B0A0F]/40"}`} />
                            {negotiable ? "Negotiable" : "Fixed"}
                          </button>
                        </div>
                        <input suppressHydrationWarning required type="number" min="50" inputMode="decimal"
                          value={price} onChange={(e) => setPrice(e.target.value)} placeholder="500"
                          className="w-full bg-transparent pb-3 outline-none text-base placeholder:opacity-20"
                        />
                        <AnimatePresence>
                          {priceRange && (
                            <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                              className="text-[9px] text-[#B48A5A] mb-2 leading-snug">
                              ✦ Similar {category} ({condition}) sell for ₹{priceRange[0].toLocaleString("en-IN")}–₹{priceRange[1].toLocaleString("en-IN")}
                            </motion.p>
                          )}
                        </AnimatePresence>
                        {price && parseFloat(price) < 200 && <p className="text-[9px] text-[#A1123F] opacity-70 mt-0.5 mb-2">Most pieces sell between ₹300–₹2,000</p>}
                      </div>

                      <div className="border-b border-[#2B0A0F]/12 focus-within:border-[#2B0A0F]/40 transition-colors">
                        <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-2">Original Price (₹)</label>
                        <input suppressHydrationWarning type="number" min="0" inputMode="decimal"
                          value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)}
                          placeholder="What you paid"
                          className="w-full bg-transparent pb-3 outline-none text-base placeholder:opacity-20"
                        />
                        <AnimatePresence>
                          {savingPct && savingPct > 0 && (
                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[9px] text-[#6B7E60] mb-2">
                              ✦ Buyer saves {savingPct}% off retail
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    {/* Shipping */}
<div className="border-b border-[#2B0A0F]/12 focus-within:border-[#2B0A0F]/40 transition-colors">
  <div className="flex items-center justify-between mb-2">
    <label className="text-[8px] uppercase tracking-[0.25em] opacity-40">
      Shipping Charge
    </label>
    <button
      type="button"
      onClick={() => {
        setFreeShipping(!freeShipping);
        if (!freeShipping) setShippingPrice("0");
      }}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-[8px] uppercase tracking-[0.15em] transition-all ${
        freeShipping
          ? "bg-[#6B7E60] border-[#6B7E60] text-white"
          : "border-[#2B0A0F]/15 opacity-40 hover:opacity-70"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${freeShipping ? "bg-white" : "bg-[#2B0A0F]/40"}`} />
      {freeShipping ? "Free Shipping" : "Set Free"}
    </button>
  </div>

  {!freeShipping ? (
    <>
      <input
        suppressHydrationWarning
        type="number"
        min="0"
        max="60"
        inputMode="numeric"
        value={shippingPrice}
        onChange={(e) => {
          const val = Math.min(parseInt(e.target.value) || 0, 60);
          setShippingPrice(val.toString());
        }}
        placeholder="0"
        className="w-full bg-transparent pb-3 outline-none text-base placeholder:opacity-20"
      />
      <p className="text-[9px] opacity-30 mb-2">
        Max ₹60 · Buyer pays this on top of item price
      </p>
    </>
  ) : (
    <p className="text-[9px] text-[#6B7E60] pb-3">
      ✦ Free shipping makes your listing stand out
    </p>
  )}
</div>

                    {/* City */}
                    <div className="border-b border-[#2B0A0F]/12 focus-within:border-[#2B0A0F]/40 transition-colors">
                      <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-2">Your City *</label>
                      <div className="relative">
                        <select required value={location} onChange={(e) => setLocation(e.target.value)}
                          className="w-full bg-transparent pb-3 outline-none text-base appearance-none cursor-pointer pr-6">
                          <option value="">Select...</option>
                          {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <svg className="absolute right-0 bottom-4 pointer-events-none opacity-30" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                      </div>
                    </div>

                    {/* Condition */}
                    <div>
                      <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-3">Condition *</label>
                      <div className="grid grid-cols-2 gap-2">
                        {CONDITIONS.map((c) => (
                          <button key={c.value} type="button" onClick={() => setCondition(c.value)}
                            className={`px-4 py-3 rounded-xl border text-left transition-all active:scale-[0.98] ${
                              condition === c.value ? "bg-[#2B0A0F] text-[#F6F3EF] border-[#2B0A0F]" : "border-[#2B0A0F]/12 hover:border-[#2B0A0F]/30 active:bg-[#EAE3DB]"
                            }`}>
                            <p className="text-[10px] uppercase tracking-[0.15em] font-medium">{c.value}</p>
                            <p className={`text-[9px] mt-0.5 ${condition === c.value ? "opacity-60" : "opacity-35"}`}>{c.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Category */}
                    <div>
                      <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-3">Category *</label>
                      <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((cat) => (
                          <button key={cat} type="button" onClick={() => setCategory(cat)}
                            className={`px-3 sm:px-4 py-2 rounded-full border text-[10px] uppercase tracking-[0.12em] transition-all active:scale-[0.97] ${
                              category === cat ? "bg-[#2B0A0F] text-[#F6F3EF] border-[#2B0A0F]" : "border-[#2B0A0F]/12 hover:border-[#2B0A0F]/30 active:bg-[#EAE3DB]"
                            }`}>{cat}</button>
                        ))}
                      </div>
                    </div>

                    {/* Size + Size Guide */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-[8px] uppercase tracking-[0.25em] opacity-40">Size</label>
                        <button type="button" onClick={() => setSizeGuideOpen(true)}
                          className="flex items-center gap-1 text-[8px] uppercase tracking-[0.2em] opacity-40 hover:opacity-80 transition-opacity">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                          Size Guide
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {SIZES.map((s) => (
                          <button key={s} type="button" onClick={() => setSize(size === s ? "" : s)}
                            className={`min-w-[44px] h-[44px] px-3 rounded-full border text-[10px] uppercase tracking-[0.1em] transition-all active:scale-[0.97] ${
                              size === s ? "bg-[#2B0A0F] text-[#F6F3EF] border-[#2B0A0F]" : "border-[#2B0A0F]/12 hover:border-[#2B0A0F]/30 active:bg-[#EAE3DB]"
                            }`}>{s}</button>
                        ))}
                      </div>
                    </div>

                    {/* Colour */}
                    <div>
                      <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-3">Colour</label>
                      <div className="flex flex-wrap gap-2">
                        {COLOURS.map((c) => (
                          <button key={c.label} type="button" onClick={() => setColour(colour === c.label ? "" : c.label)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-full border text-[10px] uppercase tracking-[0.1em] transition-all active:scale-[0.97] ${
                              colour === c.label ? "border-[#2B0A0F] bg-[#2B0A0F]/05 font-medium" : "border-[#2B0A0F]/12 hover:border-[#2B0A0F]/30"
                            }`}>
                            <span className="w-3 h-3 rounded-full flex-shrink-0 border border-black/10" style={{ background: c.hex, minWidth: "12px" }} />
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Mood */}
                    <div>
                      <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-1">Mood / Aesthetic</label>
                      <p className="text-[9px] opacity-30 mb-3">Helps buyers find your piece through mood filters</p>
                      <div className="flex flex-wrap gap-2">
                        {MOODS.map((m) => (
                          <button key={m.tag} type="button" onClick={() => setMood(mood === m.tag ? "" : m.tag)}
                            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full border text-[10px] uppercase tracking-[0.12em] transition-all active:scale-[0.97] ${
                              mood === m.tag ? "border-transparent text-[#F6F3EF]" : "border-[#2B0A0F]/12 hover:border-[#2B0A0F]/20 active:bg-[#EAE3DB]"
                            }`}
                            style={mood === m.tag ? { background: m.color } : {}}>
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.color }} />
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Description */}
                    <div className="border-b border-[#2B0A0F]/12 focus-within:border-[#2B0A0F]/40 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[8px] uppercase tracking-[0.25em] opacity-40">The Story</label>
                        <AIDescriptionButton photos={previewUrls} title={title} category={category} condition={condition} size={size} mood={mood} onGenerated={(text) => setDescription(text)} />
                      </div>
                      <textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESC))}
                        placeholder="Tell us about this piece — where you got it, how you styled it, why it deserves a new home..."
                        rows={4} className="w-full bg-transparent pb-3 outline-none text-base placeholder:opacity-20 resize-none leading-relaxed"
                      />
                      <p className={`text-[9px] mb-2 ${description.length >= MAX_DESC ? "text-[#A1123F] opacity-80" : "opacity-25"}`}>
                        {description.length}/{MAX_DESC} · A good story sells faster
                      </p>
                    </div>

                    {/* Submit */}
                    <div className="pt-2 space-y-3">
                      {!canProceedStep1 && missingFields().length > 0 && (
                        <p className="text-[9px] text-[#A1123F] opacity-70 text-center">Still needed: {missingFields().join(" · ")}</p>
                      )}
                      <motion.button type="submit" disabled={loading || !canProceedStep1} whileTap={{ scale: 0.98 }}
                        className="w-full py-4 bg-[#2B0A0F] text-[#F6F3EF] rounded-full text-[10px] uppercase tracking-[0.3em] hover:opacity-80 transition-opacity disabled:opacity-30 flex items-center justify-center gap-2">
                        {loading ? (
                          <><svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/></svg>Archiving your piece...</>
                        ) : "Submit Piece to Archive ✦"}
                      </motion.button>
                      <button type="button" onClick={() => setStep(0)}
                        className="w-full py-3 rounded-full border border-[#2B0A0F]/12 text-[10px] uppercase tracking-[0.2em] opacity-40 hover:opacity-80 transition-opacity">
                        ← Back to Photos
                      </button>
                    </div>

                    <p className="text-[9px] uppercase tracking-[0.15em] leading-relaxed opacity-30 text-center">Every piece is reviewed before appearing in the Archive.</p>
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