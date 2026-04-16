"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

type Step = "phone" | "otp" | "success";

export default function VerifyPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(30);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // countdown timer for resend
  useEffect(() => {
    if (step !== "otp") return;
    setTimer(30);
    const interval = setInterval(() => {
      setTimer(t => {
        if (t <= 1) { clearInterval(interval); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  const handleSendOTP = async () => {
    setError("");
    if (mobile.length !== 10) {
      setError("Please enter a valid 10-digit number");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile }),
      });
      const data = await res.json();
      if (data.success) {
        setStep("otp");
      } else {
        setError("Could not send OTP. Try again.");
      }
    } catch {
      setError("Something went wrong. Try again.");
    }
    setLoading(false);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // numbers only
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    // auto-focus next
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      setError("Please enter the complete 6-digit OTP");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, otp: otpString }),
      });
      const data = await res.json();
      if (data.success) {
        setStep("success");
        setTimeout(() => router.push("/seller/dashboard"), 1500);
      } else {
        setError("Incorrect OTP. Please try again.");
      }
    } catch {
      setError("Something went wrong. Try again.");
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#F6F3EF] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">

        <p className="text-[10px] uppercase tracking-[0.4em] opacity-40 mb-4">
          Seller Verification
        </p>

        <h1
          className="mb-4"
          style={{
            fontFamily: "var(--font-playfair)",
            fontSize: "clamp(1.8rem,4vw,2.8rem)"
          }}
        >
          {step === "success"
            ? "You're verified ✦"
            : step === "otp"
            ? "Enter your code ✦"
            : "One last step before you sell ✦"}
        </h1>

        <p className="text-sm opacity-50 mb-8 leading-relaxed">
          {step === "success"
            ? "Taking you to your dashboard..."
            : step === "otp"
            ? `We sent a 6-digit code to +91 ${mobile}`
            : "Verify your number to start listing pieces and receive payouts securely."}
        </p>

        {/* STEP 1 — Phone Input */}
        {step === "phone" && (
          <div className="bg-white border border-[#2B0A0F]/08 rounded-2xl p-6 mb-6">
            <div className="flex items-center border border-[#2B0A0F]/15 rounded-xl overflow-hidden mb-4">
              <span className="px-4 py-3 text-sm opacity-50 border-r border-[#2B0A0F]/15 bg-[#F6F3EF]">
                +91
              </span>
              <input
                type="tel"
                placeholder="10-digit mobile number"
                value={mobile}
                onChange={e => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="flex-1 px-4 py-3 text-sm bg-transparent outline-none"
                maxLength={10}
              />
            </div>
            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
            <button
              onClick={handleSendOTP}
              disabled={loading}
              className="w-full py-4 bg-[#2B0A0F] text-[#F6F3EF] rounded-full text-[10px] uppercase tracking-[0.3em] hover:opacity-80 transition disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send OTP →"}
            </button>
          </div>
        )}

        {/* STEP 2 — OTP Input */}
        {step === "otp" && (
          <div className="bg-white border border-[#2B0A0F]/08 rounded-2xl p-6 mb-6">
            {/* 6 boxes */}
            <div className="flex gap-2 justify-center mb-6">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  type="tel"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  className="w-11 h-12 text-center text-lg border border-[#2B0A0F]/20 rounded-xl outline-none focus:border-[#2B0A0F] transition"
                />
              ))}
            </div>

            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

            <button
              onClick={handleVerifyOTP}
              disabled={loading}
              className="w-full py-4 bg-[#2B0A0F] text-[#F6F3EF] rounded-full text-[10px] uppercase tracking-[0.3em] hover:opacity-80 transition disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify →"}
            </button>

            <div className="mt-4">
              {timer > 0 ? (
                <p className="text-[9px] uppercase tracking-[0.2em] opacity-40">
                  Resend in {timer}s
                </p>
              ) : (
                <button
                  onClick={handleSendOTP}
                  className="text-[9px] uppercase tracking-[0.2em] opacity-50 hover:opacity-80"
                >
                  Resend OTP
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 3 — Success */}
        {step === "success" && (
          <div className="bg-white border border-[#2B0A0F]/08 rounded-2xl p-6 mb-6">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-sm opacity-60">Phone number verified successfully!</p>
          </div>
        )}

        <p className="mt-3 text-[9px] uppercase tracking-[0.2em] opacity-40">
          ⏱ Takes less than 30 seconds
        </p>

        <button
          onClick={() => step === "otp" ? setStep("phone") : router.push("/account")}
          className="mt-4 text-[9px] uppercase tracking-[0.2em] opacity-40 hover:opacity-70"
        >
          ← {step === "otp" ? "Change Number" : "Back to Account"}
        </button>

      </div>
    </main>
  );
}