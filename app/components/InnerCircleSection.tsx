"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import Image from "next/image";

export default function InnerCircleSection() {
  const [applied, setApplied] = useState(false);
  const [loggedIn] = useState(false);

  return (
    <section className="mt-40 bg-[#1A060B] text-[#F6F3EF] py-32 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 relative z-10">

        <p className="italic text-lg opacity-60 mb-10">
          “Not every piece belongs in the public archive.”
        </p>

        <p className="uppercase tracking-[0.35em] text-xs opacity-50 mb-6">
          Inner Circle
        </p>

        <h2 className="text-4xl mb-8">
          A Private Extension of the Archive
        </h2>

        <motion.div
          animate={{ opacity: [0.4, 0.5, 0.4] }}
          transition={{ duration: 4, repeat: Infinity }}
          className={`grid grid-cols-2 md:grid-cols-4 gap-6 ${
            loggedIn ? "blur-0 opacity-100" : "blur-sm opacity-40"
          }`}
        >
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="relative aspect-[4/5] bg-[#2B0A0F]">
              <Image
                src="/final.png"
                alt="Inner circle piece"
                fill
                className="object-cover"
              />
            </div>
          ))}
        </motion.div>

        <div className="mt-16">
          {!applied ? (
            <button
              onClick={() => setApplied(true)}
              className="px-8 py-4 border border-[#B48A5A] text-[#B48A5A] uppercase tracking-[0.3em] text-xs hover:bg-[#B48A5A] hover:text-[#1A060B] transition"
            >
              Request Consideration
            </button>
          ) : (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="uppercase tracking-[0.3em] text-xs text-[#B48A5A]"
            >
              Invitation Sent
            </motion.p>
          )}
        </div>

      </div>
    </section>
  );
}