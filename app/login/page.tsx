"use client";

import { useState, Suspense, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

/* ─────────────────────────────
   MOOD ROTATOR — left panel
───────────────────────────── */
const ARCHIVE_LINES = [
  { line1: "Thrift it.",   line2: "Love it.",    line3: "Gennie it.",  tag: "Y2K It Girl",      color: "#C77DFF" },
  { line1: "Pre-loved.",   line2: "Re-worn.",    line3: "Archived.",   tag: "Old Money",         color: "#B48A5A" },
  { line1: "Her story.",   line2: "Your style.", line3: "New chapter.", tag: "Indie Archive",    color: "#6B7E60" },
  { line1: "Vintage.",     line2: "Verified.",   line3: "Yours.",       tag: "Bollywood Glam",   color: "#C41E3A" },
];

const GENNIES = ["/y2k.png", "/oldmoney.png", "/streetstyle.png", "/night.png"];

/* ─────────────────────────────
   LOGIN FORM
───────────────────────────── */
function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading]             = useState(false);
  const [errorMsg, setErrorMsg]           = useState<string | null>(null);
  const [successMsg, setSuccessMsg]       = useState<string | null>(null);
  const [showPassword, setShowPassword]   = useState(false);

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  // Carousel state
  const [slideIdx, setSlideIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSlideIdx(i => (i + 1) % ARCHIVE_LINES.length), 4000);
    return () => clearInterval(t);
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const redirectTo = searchParams.get("redirect") || `/account/${data.user.id}`;
        router.push(redirectTo);
      }
    });
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isRegistering) {
        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;

        if (authData.user) {
          const { error: profileError } = await supabase.from("profiles").upsert([{
            id:        authData.user.id,
            full_name: fullName,
            username:  email.split("@")[0],
            bio:       "New curator in the archive.",
          }]);
          if (profileError) throw profileError;

          setSuccessMsg("Welcome to the Archive. Check your email to confirm, then sign in.");
          setIsRegistering(false);
          setEmail(""); setPassword(""); setFullName("");
        }
      } else {
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) throw loginError;
        const redirectTo = searchParams.get("redirect") || `/account/${loginData.user.id}`;
        router.push(redirectTo);
      }
    } catch (err: any) {
      console.error("Auth Error:", err.message);
      setErrorMsg(
        err.message === "Invalid login credentials"
          ? "Email or password is incorrect."
          : err.message === "User already registered"
          ? "This email is already registered. Try signing in."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  const slide = ARCHIVE_LINES[slideIdx];

  return (
    <main className="min-h-screen flex bg-[#F6F3EF] text-[#2B0A0F]">

      {/* ══════════════════════════
          LEFT PANEL — editorial
      ══════════════════════════ */}
      <div className="hidden lg:flex lg:w-[55%] relative bg-[#1A060B] overflow-hidden flex-col">

        {/* Grain overlay */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none z-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Logo */}
        <div className="relative z-20 p-10">
          <p
            className="text-[#B48A5A] text-xs tracking-[0.35em] uppercase"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Thrift Gennie
          </p>
        </div>

        {/* Gennie illustration */}
        <div className="absolute bottom-0 right-0 w-[340px] z-20 pointer-events-none">
          <AnimatePresence mode="wait">
            <motion.img
              key={GENNIES[slideIdx % GENNIES.length]}
              src={GENNIES[slideIdx % GENNIES.length]}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.7 }}
              className="w-full"
            />
          </AnimatePresence>
        </div>

        {/* Glow */}
        <div
          className="absolute bottom-[10%] right-[10%] w-[320px] h-[320px] rounded-full blur-3xl opacity-20 pointer-events-none z-10 transition-all duration-1000"
          style={{ background: slide.color }}
        />

        {/* Rotating headline */}
        <div className="absolute bottom-16 left-10 z-30">
          <AnimatePresence mode="wait">
            <motion.div
              key={slideIdx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.6 }}
            >
              {/* Mood tag */}
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
                style={{ background: `${slide.color}20`, border: `1px solid ${slide.color}40` }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: slide.color }} />
                <span className="text-[9px] uppercase tracking-[0.25em]" style={{ color: slide.color }}>
                  {slide.tag}
                </span>
              </div>

              <h2
                className="leading-[0.88] tracking-tight"
                style={{
                  fontFamily: "var(--font-playfair)",
                  fontSize: "clamp(2.8rem,5vw,4.5rem)",
                }}
              >
                <span className="block text-[#F6F3EF]/90">{slide.line1}</span>
                <span className="block italic" style={{ color: slide.color }}>{slide.line2}</span>
                <span className="block text-[#F6F3EF]/60">{slide.line3}</span>
              </h2>
            </motion.div>
          </AnimatePresence>

          {/* Slide dots */}
          <div className="flex gap-2 mt-6">
            {ARCHIVE_LINES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlideIdx(i)}
                className="h-1 rounded-full transition-all duration-300"
                style={{
                  width: i === slideIdx ? "24px" : "6px",
                  background: i === slideIdx ? slide.color : "rgba(246,243,239,0.2)",
                }}
              />
            ))}
          </div>
        </div>

        {/* Stats strip */}
        <div className="absolute top-1/2 -translate-y-1/2 left-10 z-20 flex flex-col gap-6">
          {[
            { num: "2.4k+", label: "Pieces archived" },
            { num: "₹340",  label: "Avg listing price" },
            { num: "5",     label: "Cities active" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-[#F6F3EF] text-xl font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>
                {s.num}
              </p>
              <p className="text-[#F6F3EF]/30 text-[9px] uppercase tracking-[0.2em] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════
          RIGHT PANEL — form
      ══════════════════════════ */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 min-h-screen">

        {/* Mobile logo */}
        <div className="lg:hidden mb-10 text-center">
          <p
            className="text-[#2B0A0F] text-sm tracking-[0.35em] uppercase"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Thrift Gennie
          </p>
        </div>

        <div className="w-full max-w-[380px]">

          {/* Header */}
          <AnimatePresence mode="wait">
            <motion.div
              key={isRegistering ? "register" : "login"}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="mb-10"
            >
              <p className="text-[9px] uppercase tracking-[0.4em] opacity-35 mb-3">
                {isRegistering ? "Create your profile" : "Welcome back"}
              </p>
              <h1
                className="leading-tight"
                style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(1.8rem,3vw,2.4rem)" }}
              >
                {isRegistering ? "Join the Archive." : "Curator Login."}
              </h1>
            </motion.div>
          </AnimatePresence>

          {/* Success message */}
          <AnimatePresence>
            {successMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 px-4 py-3 rounded-xl bg-[#6B7E60]/10 border border-[#6B7E60]/20 text-[10px] uppercase tracking-[0.15em] text-[#6B7E60] leading-relaxed"
              >
                {successMsg}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error message */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 px-4 py-3 rounded-xl bg-[#A1123F]/08 border border-[#A1123F]/15 text-[10px] uppercase tracking-[0.15em] text-[#A1123F] leading-relaxed"
              >
                {errorMsg}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-6">

            <AnimatePresence>
              {isRegistering && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="border-b border-[#2B0A0F]/12 focus-within:border-[#2B0A0F]/50 transition-colors pb-0">
                    <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-2">
                      Full Name
                    </label>
                    <input
                      required={isRegistering}
                      type="text"
                      placeholder="Your name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-transparent pb-3 outline-none text-sm placeholder:opacity-20"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email */}
            <div className="border-b border-[#2B0A0F]/12 focus-within:border-[#2B0A0F]/50 transition-colors">
              <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-2">
                Email
              </label>
              <input
                required
                type="email"
                placeholder="curator@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent pb-3 outline-none text-sm placeholder:opacity-20"
              />
            </div>

            {/* Password */}
            <div className="border-b border-[#2B0A0F]/12 focus-within:border-[#2B0A0F]/50 transition-colors">
              <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-2">
                Password
              </label>
              <div className="relative flex items-center">
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent pb-3 outline-none text-sm placeholder:opacity-20 pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 bottom-3 opacity-30 hover:opacity-70 transition-opacity"
                >
                  {showPassword ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            {!isRegistering && (
              <div className="flex justify-end -mt-2">
                <button
                  type="button"
                  onClick={() => router.push("/reset-password")}
                  className="text-[9px] uppercase tracking-[0.2em] opacity-30 hover:opacity-70 transition-opacity"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 bg-[#2B0A0F] text-[#F6F3EF] rounded-full text-[10px] uppercase tracking-[0.3em] hover:opacity-80 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
                  </svg>
                  {isRegistering ? "Creating Profile..." : "Verifying..."}
                </>
              ) : (
                isRegistering ? "Join the Archive →" : "Access Archive →"
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-[#2B0A0F]/08" />
            <span className="text-[9px] uppercase tracking-[0.2em] opacity-25">or</span>
            <div className="flex-1 h-px bg-[#2B0A0F]/08" />
          </div>

          {/* Toggle register/login */}
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className="w-full py-3.5 rounded-full border border-[#2B0A0F]/12 text-[10px] uppercase tracking-[0.2em] hover:border-[#2B0A0F]/30 hover:bg-[#2B0A0F]/03 transition-all text-[#2B0A0F]/60"
          >
            {isRegistering
              ? "Already a curator? Sign In"
              : "New here? Create a Profile"}
          </button>

          {/* Fine print */}
          <p className="text-center text-[8px] uppercase tracking-[0.15em] opacity-20 mt-8 leading-relaxed">
            By joining you agree to curate responsibly.<br />
            The Archive thanks you.
          </p>
        </div>
      </div>
    </main>
  );
}

/* ─────────────────────────────
   PAGE WRAPPER
───────────────────────────── */
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#1A060B]">
        <p
          className="text-[#B48A5A] text-[10px] uppercase tracking-[0.5em] animate-pulse"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Thrift Gennie
        </p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
