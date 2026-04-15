"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase";

// ─────────────────────────────────────────────────────────────────
// 🔒 SECURITY CONFIG — replace with your real admin email
// This is checked CLIENT-SIDE as a UX gate only.
// The real enforcement is Supabase row-level security + role check.
// ─────────────────────────────────────────────────────────────────
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "you@yourdomain.com";
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// ─────────────────────────────────────────────────────────────────
// OTP INPUT — 6 separate digit boxes
// ─────────────────────────────────────────────────────────────────
function OtpInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (val: string) => void;
  disabled: boolean;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, "").split("").slice(0, 6);

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...digits];
      if (next[i]) {
        next[i] = "";
        onChange(next.join(""));
      } else if (i > 0) {
        next[i - 1] = "";
        onChange(next.join(""));
        inputRefs.current[i - 1]?.focus();
      }
    }
  };

  const handleChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) return;
    // Handle paste of full code
    if (raw.length === 6) {
      onChange(raw);
      inputRefs.current[5]?.focus();
      return;
    }
    const next = [...digits];
    next[i] = raw[raw.length - 1];
    onChange(next.join(""));
    if (i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      onChange(pasted);
      inputRefs.current[5]?.focus();
    }
    e.preventDefault();
  };

  return (
    <div className="flex gap-3 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={`w-11 h-14 text-center text-xl font-light border-b-2 bg-transparent outline-none transition-all duration-200
            ${d ? "border-[#2B0A0F] text-[#2B0A0F]" : "border-[#2B0A0F]/20 text-[#2B0A0F]/40"}
            ${disabled ? "opacity-30 cursor-not-allowed" : "focus:border-[#2B0A0F]"}
          `}
          style={{ fontFamily: "var(--font-playfair)" }}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────
type Stage = "email" | "otp" | "success";

export default function AdminLoginPage() {
  const [stage, setStage]           = useState<Stage>("email");
  const [email, setEmail]           = useState("");
  const [otp, setOtp]               = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [attempts, setAttempts]     = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [timeLeft, setTimeLeft]     = useState(0);

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();
      if (profile?.role === "admin") window.location.href = "/admin";
    });
  }, []);

  // Lockout countdown
  useEffect(() => {
    if (!lockedUntil) return;
    const tick = setInterval(() => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setAttempts(0);
        setTimeLeft(0);
        clearInterval(tick);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [lockedUntil]);

  // Resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const tick = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(tick); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [resendCooldown]);

  // Auto-verify when all 6 digits entered
  useEffect(() => {
    if (otp.replace(/\D/g, "").length === 6 && stage === "otp") {
      handleVerifyOtp();
    }
  }, [otp]);

  // ── SEND OTP ──
  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");

    // Lockout check
    if (lockedUntil && Date.now() < lockedUntil) return;

    // Email gate — vague error to prevent enumeration
    const normalized = email.trim().toLowerCase();
    if (normalized !== ADMIN_EMAIL.toLowerCase()) {
      // Fake a delay so timing attacks can't distinguish "wrong email" from "sent"
      await new Promise((r) => setTimeout(r, 800));
      setError("If that email is registered, a code has been sent.");
      return;
    }

    setLoading(true);
    const { error: supaError } = await supabase.auth.signInWithOtp({
      email: normalized,
      options: { shouldCreateUser: false }, // Never create new users via this flow
    });
    setLoading(false);

    if (supaError) {
      setError("Something went wrong. Try again.");
      return;
    }

    setStage("otp");
    setResendCooldown(60);
  };

  // ── VERIFY OTP ──
  const handleVerifyOtp = async () => {
    if (loading) return;
    setError("");
    setLoading(true);

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: ADMIN_EMAIL,
      token: otp.replace(/\D/g, ""),
      type: "email",
    });

    if (verifyError || !data.session) {
      setLoading(false);
      setOtp("");
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        const lockout = Date.now() + LOCKOUT_MINUTES * 60 * 1000;
        setLockedUntil(lockout);
        setError(`Too many attempts. Locked for ${LOCKOUT_MINUTES} minutes.`);
      } else {
        setError(`Invalid code. ${MAX_ATTEMPTS - newAttempts} attempt${MAX_ATTEMPTS - newAttempts !== 1 ? "s" : ""} remaining.`);
      }
      return;
    }

    // Final role check — even if somehow wrong user got here
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.session.user.id)
      .single();

    if (profile?.role !== "admin") {
      await supabase.auth.signOut();
      setLoading(false);
      setError("Access denied.");
      return;
    }

    // Log successful admin login
    await supabase.from("admin_audit_logs").insert({
      action: "admin_login",
      target: data.session.user.email,
      admin_email: data.session.user.email,
    });

    setStage("success");
    setTimeout(() => { window.location.href = "/admin"; }, 1200);
  };

  // ── RESEND ──
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setOtp("");
    setError("");
    await handleSendOtp();
  };

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  return (
    <main
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "#F6F3EF" }}
    >
      {/* Subtle grain texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px",
        }}
      />

      <div className="w-full max-w-sm relative">

        {/* Logo / wordmark */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <p className="text-[9px] uppercase tracking-[0.5em] text-[#2B0A0F]/30 mb-3">
            Thrift Gennie
          </p>
          <h1
            className="text-3xl text-[#2B0A0F]"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Admin Access
          </h1>
          <div className="mt-4 mx-auto w-8 h-px bg-[#2B0A0F]/15" />
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white border border-[#2B0A0F]/06 rounded-2xl p-8 shadow-sm"
        >
          <AnimatePresence mode="wait">

            {/* ── STAGE: EMAIL ── */}
            {stage === "email" && (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.25 }}
              >
                <p className="text-[9px] uppercase tracking-[0.3em] text-[#2B0A0F]/35 mb-1">Step 1 of 2</p>
                <p className="text-lg text-[#2B0A0F] mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
                  Enter your email
                </p>
                <p className="text-[10px] text-[#2B0A0F]/40 mb-8 leading-relaxed">
                  A one-time code will be sent to your inbox.
                </p>

                <form onSubmit={handleSendOtp} className="space-y-5">
                  <div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(""); }}
                      placeholder="your@email.com"
                      autoComplete="email"
                      autoFocus
                      disabled={loading || isLocked}
                      className="w-full bg-[#F6F3EF] border border-[#2B0A0F]/08 rounded-xl px-4 py-3.5 text-sm text-[#2B0A0F] outline-none focus:border-[#2B0A0F]/30 transition-colors placeholder:text-[#2B0A0F]/25 disabled:opacity-40"
                    />
                  </div>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[10px] text-[#B48A5A] text-center"
                    >
                      {error}
                    </motion.p>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !email.trim() || isLocked}
                    className="w-full bg-[#2B0A0F] text-[#F6F3EF] rounded-xl py-3.5 text-[10px] uppercase tracking-[0.3em] hover:opacity-80 transition-all disabled:opacity-25 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
                      </svg>
                    ) : "Send Code"}
                  </button>
                </form>

                {isLocked && (
                  <p className="text-center text-[10px] text-[#A1123F]/60 mt-4">
                    Locked — {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")} remaining
                  </p>
                )}
              </motion.div>
            )}

            {/* ── STAGE: OTP ── */}
            {stage === "otp" && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25 }}
              >
                <p className="text-[9px] uppercase tracking-[0.3em] text-[#2B0A0F]/35 mb-1">Step 2 of 2</p>
                <p className="text-lg text-[#2B0A0F] mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
                  Enter your code
                </p>
                <p className="text-[10px] text-[#2B0A0F]/40 mb-8 leading-relaxed">
                  Sent to <span className="font-medium text-[#2B0A0F]/60">{ADMIN_EMAIL}</span>.
                  Check your inbox.
                </p>

                <div className="mb-8">
                  <OtpInput
                    value={otp}
                    onChange={setOtp}
                    disabled={loading || isLocked}
                  />
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[10px] text-[#A1123F]/70 text-center mb-5"
                  >
                    {error}
                  </motion.p>
                )}

                {isLocked && (
                  <p className="text-center text-[10px] text-[#A1123F]/60 mb-5">
                    Locked — {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")} remaining
                  </p>
                )}

                <button
                  onClick={handleVerifyOtp}
                  disabled={otp.replace(/\D/g, "").length < 6 || loading || isLocked}
                  className="w-full bg-[#2B0A0F] text-[#F6F3EF] rounded-xl py-3.5 text-[10px] uppercase tracking-[0.3em] hover:opacity-80 transition-all disabled:opacity-25 flex items-center justify-center gap-2 mb-4"
                >
                  {loading ? (
                    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
                    </svg>
                  ) : "Verify & Sign In"}
                </button>

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => { setStage("email"); setOtp(""); setError(""); }}
                    className="text-[9px] uppercase tracking-[0.2em] opacity-30 hover:opacity-60 transition-opacity"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleResend}
                    disabled={resendCooldown > 0}
                    className="text-[9px] uppercase tracking-[0.2em] opacity-30 hover:opacity-60 transition-opacity disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STAGE: SUCCESS ── */}
            {stage === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="w-12 h-12 rounded-full bg-[#6B7E60]/12 flex items-center justify-center mx-auto mb-5"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="#6B7E60" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </motion.div>
                <p className="text-xl text-[#2B0A0F] mb-2" style={{ fontFamily: "var(--font-playfair)" }}>
                  Welcome back.
                </p>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#2B0A0F]/30 animate-pulse">
                  Redirecting to console…
                </p>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>

        {/* Security note */}
        {stage !== "success" && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center text-[8px] uppercase tracking-[0.2em] text-[#2B0A0F]/20 mt-6"
          >
            🔒 Restricted access · Thrift Gennie Admin
          </motion.p>
        )}
      </div>
    </main>
  );
}