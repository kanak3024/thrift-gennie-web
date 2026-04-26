"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#1A060B] text-[#F6F3EF]">
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-10 flex flex-col md:flex-row justify-between items-start gap-8">
        
        {/* Brand */}
        <div>
          <p className="text-sm tracking-[0.3em] uppercase mb-2"
            style={{ fontFamily: "var(--font-playfair)" }}>
            Thrift Gennie
          </p>
          <p className="text-[10px] opacity-40 tracking-wide">
            Thrift it. Love it. Gennie it.
          </p>
          <p className="text-[10px] opacity-30 mt-1">
            Made with love in India
          </p>
        </div>

        {/* Links */}
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          {[
            { label: "Archive", href: "/buy" },
            { label: "Submit a Piece", href: "/sell" },
            { label: "Orders", href: "/orders" },
            { label: "Contact", href: "/contact" },
            { label: "Privacy", href: "/privacy" },
            { label: "Terms", href: "/terms" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[10px] uppercase tracking-[0.2em] opacity-40 hover:opacity-80 transition-opacity"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="border-t border-[#F6F3EF]/06 px-5 md:px-8 py-4 text-[9px] uppercase tracking-[0.15em] text-[#F6F3EF]/25 flex justify-between items-center">
        <span>© {new Date().getFullYear()} Thrift Gennie</span>
        <span>Est. Pune · Archive No. 001</span>
      </div>
    </footer>
  );
}