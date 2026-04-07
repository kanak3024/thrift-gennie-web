"use client";

import { useState } from "react";

export default function ContactPage() {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: any) => {
    e.preventDefault();
    alert("Message sent! (we’ll connect this to backend later)");
    setMessage("");
  };

  return (
    <main className="min-h-screen bg-[#F6F3EF] px-6 py-24 text-[#2B0A0F]">
      <div className="max-w-2xl mx-auto space-y-10">

        <h1 className="text-4xl tracking-tight" style={{ fontFamily: "var(--font-playfair)" }}>
          Contact Us
        </h1>

        <p className="text-sm uppercase tracking-[0.3em] text-[#B48A5A]">
          We’d love to hear from you
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">

          <input
            type="text"
            placeholder="Your Name"
            className="w-full border border-black/10 p-3 bg-transparent outline-none"
            required
          />

          <input
            type="email"
            placeholder="Your Email"
            className="w-full border border-black/10 p-3 bg-transparent outline-none"
            required
          />

          <textarea
            placeholder="Your Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="w-full border border-black/10 p-3 bg-transparent outline-none"
            required
          />

          <button
            type="submit"
            className="px-8 py-3 bg-[#2B0A0F] text-white text-[12px] uppercase tracking-widest hover:bg-black transition-all"
          >
            Send Message
          </button>

        </form>

        <div className="text-sm opacity-60 pt-6">
          Or email us directly at:
          <br />
          <span className="font-medium">hello@thriftgennie.com</span>
        </div>

      </div>
    </main>
  );
}