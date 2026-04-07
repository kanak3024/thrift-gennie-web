"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t mt-20">
      <div className="max-w-7xl mx-auto px-6 py-10 grid md:grid-cols-3 gap-8 text-sm text-gray-600">
        
        {/* BRAND */}
        <div>
          <h3 className="font-semibold text-gray-800 mb-2 tracking-widest">
            THRIFT GENNIE
          </h3>
          <p>Thrift it. Love it. Gennie it.</p>
          <p className="mt-2">Made with 💖 in India</p>
        </div>

        {/* EXPLORE */}
        <div>
          <h3 className="font-semibold text-gray-800 mb-2">Explore</h3>
          <ul className="space-y-1">
            <li><Link href="/" className="hover:text-black">Buy</Link></li>
            <li><Link href="/sell" className="hover:text-black">Sell</Link></li>
            <li><Link href="/" className="hover:text-black">Rent</Link></li>
            <li><Link href="/orders" className="hover:text-black">My Orders</Link></li>
          </ul>
        </div>

        {/* LEGAL */}
        <div>
          <h3 className="font-semibold text-gray-800 mb-2">Legal</h3>
          <ul className="space-y-1">
            <li><Link href="/about" className="hover:text-black">About</Link></li>
            <li><Link href="/contact" className="hover:text-black">Contact</Link></li>
            <li><Link href="/privacy" className="hover:text-black">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-black">Terms & Conditions</Link></li>
          </ul>
        </div>

      </div>

      {/* BOTTOM BAR */}
      <div className="text-center text-[11px] text-gray-400 pb-6">
        © {new Date().getFullYear()} Thrift Gennie. All rights reserved.
      </div>
    </footer>
  );
}