"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { motion, AnimatePresence } from "framer-motion";

/* ─────────────────────────────
   TYPES
───────────────────────────── */
interface Area {
  x: number; y: number; width: number; height: number;
}

interface ImageCropperProps {
  imageSrc: string;       // object URL of the selected file
  onCropDone: (croppedFile: File) => void;
  onCancel: () => void;
  aspectRatio?: number;   // default 3/4 (portrait)
}

/* ─────────────────────────────
   HELPER — canvas crop → File
───────────────────────────── */
async function getCroppedFile(
  imageSrc: string,
  pixelCrop: Area,
  originalFileName: string = "photo.jpg"
): Promise<File> {
  const image = await createImageBitmap(await fetch(imageSrc).then((r) => r.blob()));
  const canvas = document.createElement("canvas");
  canvas.width  = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y,
    pixelCrop.width, pixelCrop.height,
    0, 0,
    pixelCrop.width, pixelCrop.height
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error("Canvas is empty")); return; }
      const ext  = originalFileName.split(".").pop() || "jpg";
      const name = originalFileName.replace(/\.[^.]+$/, `_cropped.${ext}`);
      resolve(new File([blob], name, { type: blob.type }));
    }, "image/jpeg", 0.92);
  });
}

/* ─────────────────────────────
   ASPECT RATIO OPTIONS
───────────────────────────── */
const RATIOS = [
  { label: "Portrait", value: 3 / 4 },
  { label: "Square",   value: 1 },
  { label: "Free",     value: 0 },       // 0 = free crop
];

/* ─────────────────────────────
   MAIN COMPONENT
───────────────────────────── */
export default function ImageCropper({
  imageSrc,
  onCropDone,
  onCancel,
  aspectRatio = 3 / 4,
}: ImageCropperProps) {
  const [crop, setCrop]             = useState({ x: 0, y: 0 });
  const [zoom, setZoom]             = useState(1);
  const [rotation, setRotation]     = useState(0);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [selectedRatio, setSelectedRatio] = useState(aspectRatio);
  const [applying, setApplying]     = useState(false);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedArea(croppedAreaPixels);
  }, []);

  const handleApply = async () => {
    if (!croppedArea) return;
    setApplying(true);
    try {
      const file = await getCroppedFile(imageSrc, croppedArea);
      onCropDone(file);
    } catch (err) {
      console.error("Crop failed:", err);
    }
    setApplying(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black flex flex-col"
      >
        {/* ── TOP BAR ── */}
        <div className="flex items-center justify-between px-4 py-4 flex-shrink-0 border-b border-white/08">
          <button
            onClick={onCancel}
            className="text-white/50 hover:text-white transition-colors text-[10px] uppercase tracking-[0.2em]"
            style={{ fontFamily: "var(--font-dm)" }}
          >
            ← Cancel
          </button>
          <p className="text-white/60 text-[10px] uppercase tracking-[0.3em]" style={{ fontFamily: "var(--font-dm)" }}>
            Crop Photo
          </p>
          <button
            onClick={handleApply}
            disabled={applying}
            className="px-5 py-2 bg-white text-black rounded-full text-[10px] uppercase tracking-[0.2em] hover:opacity-85 transition-opacity disabled:opacity-40"
            style={{ fontFamily: "var(--font-dm)" }}
          >
            {applying ? "Applying..." : "Use Photo"}
          </button>
        </div>

        {/* ── CROPPER AREA ── */}
        <div className="relative flex-1 bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={selectedRatio === 0 ? undefined : selectedRatio}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: { background: "#000" },
              cropAreaStyle: {
                border: "2px solid rgba(255,255,255,0.8)",
                borderRadius: "8px",
              },
            }}
            showGrid
          />
        </div>

        {/* ── BOTTOM CONTROLS ── */}
        <div className="flex-shrink-0 bg-[#0D0406] border-t border-white/08 px-4 py-4 space-y-4">

          {/* Aspect ratio chips */}
          <div className="flex items-center gap-2 justify-center">
            {RATIOS.map((r) => (
              <button
                key={r.label}
                onClick={() => setSelectedRatio(r.value)}
                className={`px-4 py-1.5 rounded-full border text-[9px] uppercase tracking-[0.15em] transition-all ${
                  selectedRatio === r.value
                    ? "bg-white text-black border-white"
                    : "border-white/20 text-white/50 hover:border-white/40 hover:text-white/80"
                }`}
                style={{ fontFamily: "var(--font-dm)" }}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Zoom slider */}
          <div className="flex items-center gap-3">
            <span className="text-white/30 text-[9px] uppercase tracking-widest w-10 text-right" style={{ fontFamily: "var(--font-dm)" }}>
              Zoom
            </span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 h-0.5 accent-white cursor-pointer"
              style={{ accentColor: "white" }}
            />
            <span className="text-white/30 text-[9px] w-8" style={{ fontFamily: "var(--font-dm)" }}>
              {zoom.toFixed(1)}×
            </span>
          </div>

          {/* Rotation slider */}
          <div className="flex items-center gap-3">
            <span className="text-white/30 text-[9px] uppercase tracking-widest w-10 text-right" style={{ fontFamily: "var(--font-dm)" }}>
              Rotate
            </span>
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={rotation}
              onChange={(e) => setRotation(parseInt(e.target.value))}
              className="flex-1 h-0.5 cursor-pointer"
              style={{ accentColor: "white" }}
            />
            <span className="text-white/30 text-[9px] w-8" style={{ fontFamily: "var(--font-dm)" }}>
              {rotation}°
            </span>
          </div>

          {/* Quick rotation buttons */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setRotation((r) => r - 90)}
              className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center text-white/50 hover:text-white hover:border-white/35 transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2.5 2v6h6M2.66 15.57a10 10 0 1 0 .57-8.38"/>
              </svg>
            </button>
            <button
              onClick={() => setRotation(0)}
              className="px-3 py-1 rounded-full border border-white/15 text-white/40 text-[8px] uppercase tracking-widest hover:text-white hover:border-white/35 transition-all"
              style={{ fontFamily: "var(--font-dm)" }}
            >
              Reset
            </button>
            <button
              onClick={() => setRotation((r) => r + 90)}
              className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center text-white/50 hover:text-white hover:border-white/35 transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38"/>
              </svg>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}