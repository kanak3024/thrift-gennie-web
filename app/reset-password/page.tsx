"use client";

import { useState, useEffect, Suspense } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [email, setEmail]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [message, setMessage]     = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setIsResetMode(true);
    });
  }, []);

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setMessage({ text: error.message, type: "error" });
    } else {
      setMessage({ text: "Reset link sent — check your inbox.", type: "success" });
      setEmail("");
    }
    setLoading(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setMessage({ text: "Passwords don't match.", type: "error" });
      return;
    }
    if (password.length < 6) {
      setMessage({ text: "Password must be at least 6 characters.", type: "error" });
      return;
    }
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage({ text: error.message, type: "error" });
    } else {
      setMessage({ text: "Password updated. Taking you back...", type: "success" });
      setTimeout(() => router.push("/login"), 2000);
    }
    setLoading(false);
  };

  const passwordsMatch = confirm.length > 0 && password === confirm;
  const passwordsMismatch = confirm.length > 0 && password !== confirm;

  return (
    <main className="min-h-screen flex bg-[#F6F3EF] text-[#2B0A0F]">

      {/* ══════════════════════════
          LEFT PANEL
      ══════════════════════════ */}
      <div className="hidden lg:flex lg:w-[55%] bg-[#1A060B] relative overflow-hidden flex-col items-start justify-between p-10">

        {/* Grain */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }}
        />

        {/* Glow */}
        <div className="absolute bottom-[15%] right-[10%] w-[300px] h-[300px] rounded-full blur-3xl opacity-15 bg-[#B48A5A] pointer-events-none" />

        {/* Logo */}
        <p
          className="text-[#B48A5A] text-xs tracking-[0.35em] uppercase relative z-10"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Thrift Gennie
        </p>

        {/* Centre copy */}
        <div className="relative z-10">
          <p className="text-[9px] uppercase tracking-[0.35em] text-[#F6F3EF]/30 mb-4">
            Account Recovery
          </p>
          <h2
            className="leading-[0.88] tracking-tight text-[#F6F3EF]"
            style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(2.5rem,4vw,4rem)" }}
          >
            {isResetMode ? (
              <>
                <span className="block">New password.</span>
                <span className="block italic text-[#B48A5A]">Fresh start.</span>
                <span className="block opacity-50">Same archive.</span>
              </>
            ) : (
              <>
                <span className="block">Forgot the</span>
                <span className="block italic text-[#B48A5A]">password?</span>
                <span className="block opacity-50">We've got you.</span>
              </>
            )}
          </h2>

          <p className="text-[#F6F3EF]/30 text-sm mt-6 max-w-xs leading-relaxed">
            {isResetMode
              ? "Choose something you'll remember. Your archive and listings are safe."
              : "Enter your email and we'll send a secure link to reset your password."}
          </p>
        </div>

        {/* Bottom label */}
        <p className="text-[#F6F3EF]/15 text-[9px] uppercase tracking-[0.3em] relative z-10">
          Archive No. 001 · Est. 2025
        </p>
      </div>

      {/* ══════════════════════════
          RIGHT PANEL — form
      ══════════════════════════ */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 min-h-screen">

        {/* Mobile logo */}
        <div className="lg:hidden mb-10">
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
              key={isResetMode ? "reset" : "send"}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="mb-10"
            >
              <p className="text-[9px] uppercase tracking-[0.4em] opacity-35 mb-3">
                {isResetMode ? "Step 2 of 2" : "Step 1 of 2"}
              </p>
              <h1
                className="leading-tight"
                style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(1.8rem,3vw,2.4rem)" }}
              >
                {isResetMode ? "New Password." : "Reset Password."}
              </h1>
              <p className="text-sm opacity-40 mt-2">
                {isResetMode
                  ? "Choose a new password for your account."
                  : "Enter your email and we'll send a reset link."}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Message */}
          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={`mb-6 px-4 py-3 rounded-xl text-[10px] uppercase tracking-[0.15em] leading-relaxed border ${
                  message.type === "success"
                    ? "bg-[#6B7E60]/10 border-[#6B7E60]/20 text-[#6B7E60]"
                    : message.type === "error"
                    ? "bg-[#A1123F]/08 border-[#A1123F]/15 text-[#A1123F]"
                    : "bg-[#2B0A0F]/05 border-[#2B0A0F]/10 text-[#2B0A0F]/60"
                }`}
              >
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── SEND RESET EMAIL FORM ── */}
          <AnimatePresence mode="wait">
            {!isResetMode ? (
              <motion.form
                key="send-form"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={handleSendResetEmail}
                className="space-y-6"
              >
                <div className="border-b border-[#2B0A0F]/12 focus-within:border-[#2B0A0F]/50 transition-colors">
                  <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-2">
                    Email Address
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

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 bg-[#2B0A0F] text-[#F6F3EF] rounded-full text-[10px] uppercase tracking-[0.3em] hover:opacity-80 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
                      </svg>
                      Sending...
                    </>
                  ) : "Send Reset Link →"}
                </motion.button>
              </motion.form>

            ) : (
              /* ── UPDATE PASSWORD FORM ── */
              <motion.form
                key="update-form"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={handleUpdatePassword}
                className="space-y-6"
              >
                {/* New password */}
                <div className="border-b border-[#2B0A0F]/12 focus-within:border-[#2B0A0F]/50 transition-colors">
                  <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-2">
                    New Password
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
                  {/* Strength hint */}
                  {password.length > 0 && (
                    <div className="flex gap-1 mt-2 pb-1">
                      {[1,2,3,4].map((i) => (
                        <div
                          key={i}
                          className="h-0.5 flex-1 rounded-full transition-all"
                          style={{
                            background: password.length >= i * 3
                              ? password.length < 6 ? "#A1123F"
                                : password.length < 10 ? "#B48A5A"
                                : "#6B7E60"
                              : "rgba(43,10,15,0.08)"
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div className={`border-b transition-colors ${
                  passwordsMismatch
                    ? "border-[#A1123F]/40"
                    : passwordsMatch
                    ? "border-[#6B7E60]/40"
                    : "border-[#2B0A0F]/12 focus-within:border-[#2B0A0F]/50"
                }`}>
                  <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-2">
                    Confirm Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      required
                      type={showConfirm ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="w-full bg-transparent pb-3 outline-none text-sm placeholder:opacity-20 pr-8"
                    />
                    <div className="absolute right-0 bottom-3 flex items-center gap-2">
                      {passwordsMatch && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7E60" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="opacity-30 hover:opacity-70 transition-opacity"
                      >
                        {showConfirm ? (
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
                </div>

                <motion.button
                  type="submit"
                  disabled={loading || passwordsMismatch}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 bg-[#2B0A0F] text-[#F6F3EF] rounded-full text-[10px] uppercase tracking-[0.3em] hover:opacity-80 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
                      </svg>
                      Updating...
                    </>
                  ) : "Update Password →"}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Back to login */}
          <div className="mt-8 text-center">
            <button
              onClick={() => router.push("/login")}
              className="text-[9px] uppercase tracking-[0.2em] opacity-30 hover:opacity-70 transition-opacity"
            >
              ← Back to Login
            </button>
          </div>

        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
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
      <ResetPasswordForm />
    </Suspense>
  );
}
