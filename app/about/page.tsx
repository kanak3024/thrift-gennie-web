"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#F6F3EF] text-[#2B0A0F]">

      {/* HERO */}
      <section className="max-w-4xl mx-auto px-6 pt-32 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-[9px] uppercase tracking-[0.4em] opacity-40 mb-4">Our Story</p>
          <h1
            className="leading-[0.9] mb-8"
            style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(3rem,7vw,5.5rem)" }}
          >
            This isn't thrift.<br />
            <span className="italic text-[#A1123F]">It's a fashion</span><br />
            archive.
          </h1>
          <div className="w-16 h-px bg-[#2B0A0F]/20 mb-8" />
          <p className="text-lg leading-relaxed text-[#2B0A0F]/65 max-w-xl">
            Thrift Gennie was born out of a simple frustration — great clothes
            sitting in wardrobes across India, unworn, unloved, unseen.
          </p>
        </motion.div>
      </section>

      {/* MISSION */}
      <section className="bg-[#1A060B] text-[#F6F3EF] py-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-[9px] uppercase tracking-[0.4em] opacity-40 mb-4">Why We Exist</p>
              <h2
                className="text-4xl leading-tight mb-6"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                Fashion deserves a second chapter.
              </h2>
              <p className="text-[#F6F3EF]/60 leading-relaxed text-sm">
                India generates millions of tonnes of textile waste every year.
                Most of it is clothes that still have years of life left — they just
                need to find the right person.
              </p>
              <p className="text-[#F6F3EF]/60 leading-relaxed text-sm mt-4">
                We built Thrift Gennie to be the place where pre-loved pieces find
                new homes — curated, not cluttered. An archive, not a dumpsite.
              </p>
            </div>
            <div className="flex flex-col gap-6">
              {[
                { num: "2.4k+", label: "Pieces archived" },
                { num: "₹340",  label: "Average listing price" },
                { num: "5",     label: "Cities and growing" },
                { num: "100%",  label: "Peer to peer" },
              ].map((s) => (
                <div key={s.label} className="border-b border-[#F6F3EF]/08 pb-6">
                  <p className="text-3xl font-semibold text-[#B48A5A]"
                    style={{ fontFamily: "var(--font-playfair)" }}>
                    {s.num}
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.2em] opacity-40 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="max-w-4xl mx-auto px-6 py-24">
        <p className="text-[9px] uppercase tracking-[0.4em] opacity-40 mb-4">What We Stand For</p>
        <h2
          className="text-4xl mb-16"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          The archive values.
        </h2>
        <div className="grid md:grid-cols-3 gap-10">
          {[
            {
              title: "Curated, not chaotic",
              body: "Every piece submitted is reviewed. We're building a fashion archive, not a garage sale.",
            },
            {
              title: "People first",
              body: "Sellers keep the lion's share. We take a small fee to keep the lights on, nothing more.",
            },
            {
              title: "Conscious by default",
              body: "Every purchase on Thrift Gennie is one fewer new garment produced. That matters.",
            },
          ].map((v) => (
            <div key={v.title}>
              <div className="w-8 h-px bg-[#A1123F] mb-5" />
              <h3
                className="text-xl mb-3"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                {v.title}
              </h3>
              <p className="text-sm leading-relaxed opacity-55">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#EAE3DB] py-20">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2
            className="text-4xl mb-4"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Ready to join the archive?
          </h2>
          <p className="text-sm opacity-55 mb-8">
            List your first piece in 90 seconds. No fees for sellers.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/buy">
              <button className="px-8 py-4 bg-[#2B0A0F] text-[#F6F3EF] rounded-full text-[10px] uppercase tracking-[0.25em] hover:opacity-80 transition-opacity">
                Browse Archive →
              </button>
            </Link>
            <Link href="/sell">
              <button className="px-8 py-4 border border-[#2B0A0F]/25 rounded-full text-[10px] uppercase tracking-[0.25em] hover:bg-[#2B0A0F] hover:text-[#F6F3EF] transition-all">
                Submit a Piece
              </button>
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}