"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ContactPage() {
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });

      if (res.ok) {
        setSent(true);
        setName(""); setEmail(""); setSubject(""); setMessage("");
      } else {
        setError("Something went wrong. Please try emailing us directly.");
      }
    } catch {
      setError("Something went wrong. Please try emailing us directly.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F6F3EF] text-[#2B0A0F]">
      <div className="max-w-5xl mx-auto px-6 pt-32 pb-24">

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <p className="text-[9px] uppercase tracking-[0.4em] opacity-40 mb-4">Get in Touch</p>
          <h1
            className="leading-none"
            style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(2.8rem,6vw,5rem)" }}
          >
            We'd love to<br />
            <span className="italic text-[#A1123F]">hear from you.</span>
          </h1>
        </motion.div>

        <div className="grid md:grid-cols-[1fr_1.5fr] gap-16">

          {/* LEFT — contact info */}
          <div className="flex flex-col gap-8">
            {[
              {
                label: "General Enquiries",
                value: "hello@thriftgennie.com",
                sub: "For anything and everything",
              },
              {
                label: "Seller Support",
                value: "sellers@thriftgennie.com",
                sub: "Listing issues, payouts, questions",
              },
              {
                label: "Report a Listing",
                value: "trust@thriftgennie.com",
                sub: "Fake items, scams, policy violations",
              },
              {
                label: "Based in",
                value: "Pune, Maharashtra",
                sub: "Shipping across India",
              },
            ].map((item) => (
              <div key={item.label} className="border-b border-[#2B0A0F]/08 pb-6">
                <p className="text-[9px] uppercase tracking-[0.25em] opacity-40 mb-1">{item.label}</p>
                <p className="text-base font-medium">{item.value}</p>
                <p className="text-xs opacity-40 mt-0.5">{item.sub}</p>
              </div>
            ))}
          </div>

          {/* RIGHT — form */}
          <div>
            <AnimatePresence mode="wait">
              {sent ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center h-full gap-4 py-20 text-center"
                >
                  <p className="text-4xl" style={{ fontFamily: "var(--font-playfair)" }}>✦</p>
                  <p className="text-2xl" style={{ fontFamily: "var(--font-playfair)" }}>Message sent.</p>
                  <p className="text-sm opacity-50">We'll get back to you within 24 hours.</p>
                  <button
                    onClick={() => setSent(false)}
                    className="mt-4 px-6 py-2.5 border border-[#2B0A0F]/15 rounded-full text-[10px] uppercase tracking-[0.2em] hover:bg-[#2B0A0F] hover:text-[#F6F3EF] transition-all"
                  >
                    Send Another
                  </button>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onSubmit={handleSubmit}
                  className="space-y-6"
                >
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-4 py-3 rounded-xl bg-[#A1123F]/08 border border-[#A1123F]/15 text-[10px] uppercase tracking-[0.15em] text-[#A1123F]"
                      >
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="grid grid-cols-2 gap-5">
                    <div className="border-b border-[#2B0A0F]/12 focus-within:border-[#2B0A0F]/40 transition-colors">
                      <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-2">Name</label>
                      <input
                        required type="text" value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        className="w-full bg-transparent pb-3 outline-none text-sm placeholder:opacity-20"
                      />
                    </div>
                    <div className="border-b border-[#2B0A0F]/12 focus-within:border-[#2B0A0F]/40 transition-colors">
                      <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-2">Email</label>
                      <input
                        required type="email" value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@email.com"
                        className="w-full bg-transparent pb-3 outline-none text-sm placeholder:opacity-20"
                      />
                    </div>
                  </div>

                  <div className="border-b border-[#2B0A0F]/12 focus-within:border-[#2B0A0F]/40 transition-colors">
                    <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-2">Subject</label>
                    <input
                      required type="text" value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="What's this about?"
                      className="w-full bg-transparent pb-3 outline-none text-sm placeholder:opacity-20"
                    />
                  </div>

                  <div className="border-b border-[#2B0A0F]/12 focus-within:border-[#2B0A0F]/40 transition-colors">
                    <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-2">Message</label>
                    <textarea
                      required value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tell us everything..."
                      rows={5}
                      className="w-full bg-transparent pb-3 outline-none text-sm placeholder:opacity-20 resize-none leading-relaxed"
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
                    ) : "Send Message →"}
                  </motion.button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </main>
  );
}