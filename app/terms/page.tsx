"use client";

import { motion } from "framer-motion";

const SECTIONS = [
  {
    title: "Acceptance of Terms",
    body: [
      "By creating an account or using Thrift Gennie, you agree to these Terms and Conditions.",
      "If you do not agree, please do not use the platform.",
      "We may update these terms as the platform evolves. Continued use constitutes acceptance.",
    ],
  },
  {
    title: "The Platform",
    body: [
      "Thrift Gennie is a peer-to-peer marketplace connecting buyers and sellers of pre-owned fashion.",
      "We are not a party to transactions between buyers and sellers. We provide the platform and payment infrastructure.",
      "We reserve the right to remove listings, suspend accounts, or refuse service at our discretion.",
    ],
  },
  {
    title: "Seller Responsibilities",
    body: [
      "You must accurately describe the condition, size, and details of every item you list.",
      "Photos must be of the actual item — no stock images, AI-generated images, or misleading photographs.",
      "You may only list items you own and have the right to sell.",
      "Prohibited items include: counterfeit goods, stolen property, adult content, weapons, and anything illegal under Indian law.",
      "Once a buyer purchases your item, you must ship within 3 business days.",
      "You are responsible for the accuracy of your payout details. Thrift Gennie is not liable for failed payouts due to incorrect information.",
    ],
  },
  {
    title: "Buyer Responsibilities",
    body: [
      "All sales are final unless the item is significantly not as described.",
      "A ₹10 Buyer Protection Fee is added to every purchase. This covers payment processing and platform operations.",
      "If you receive an item significantly different from its description, contact us within 48 hours of delivery at trust@thriftgennie.com.",
      "Chargebacks initiated without contacting us first may result in account suspension.",
    ],
  },
  {
    title: "Payments & Fees",
    body: [
      "Payments are processed by Razorpay. By making a purchase, you agree to Razorpay's terms of service.",
      "Sellers receive the listed price minus any applicable platform commission.",
      "Buyers pay the listed price plus a ₹10 Buyer Protection Fee.",
      "Payouts to sellers are processed within 5-7 business days of order confirmation.",
      "Thrift Gennie is not responsible for delays caused by banking systems or incorrect payout details.",
    ],
  },
  {
    title: "Prohibited Conduct",
    body: [
      "You may not use Thrift Gennie to conduct transactions outside the platform to avoid fees.",
      "You may not harass, threaten, or abuse other users.",
      "You may not create multiple accounts to circumvent suspensions.",
      "You may not scrape, copy, or republish content from the platform without permission.",
      "You may not list counterfeit, stolen, or prohibited items.",
      "Violations may result in immediate account suspension and legal action where appropriate.",
    ],
  },
  {
    title: "Intellectual Property",
    body: [
      "Thrift Gennie and its branding, design, and content are owned by us and protected by copyright.",
      "By listing a product, you grant us a non-exclusive licence to display your photos and descriptions on the platform.",
      "You retain ownership of content you create. We do not claim ownership of your listings.",
    ],
  },
  {
    title: "Limitation of Liability",
    body: [
      "Thrift Gennie is a marketplace platform. We are not liable for the quality, safety, or legality of listed items.",
      "We are not liable for disputes between buyers and sellers beyond reasonable mediation efforts.",
      "Our total liability to you in any circumstance is limited to the amount you paid in fees to us in the preceding 3 months.",
      "We are not liable for losses arising from platform downtime, data loss, or third-party service failures.",
    ],
  },
  {
    title: "Dispute Resolution",
    body: [
      "In the event of a dispute, please contact us first at trust@thriftgennie.com. We will attempt to mediate.",
      "These terms are governed by the laws of India. Disputes shall be subject to the jurisdiction of courts in Pune, Maharashtra.",
    ],
  },
  {
    title: "Account Termination",
    body: [
      "You may delete your account at any time from your account settings.",
      "We may suspend or terminate accounts that violate these terms, with or without notice.",
      "Upon termination, your listings will be removed. Pending orders will be completed or refunded at our discretion.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#F6F3EF] text-[#2B0A0F]">
      <div className="max-w-3xl mx-auto px-6 pt-32 pb-24">

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <p className="text-[9px] uppercase tracking-[0.4em] opacity-40 mb-4">Legal</p>
          <h1
            className="leading-none mb-4"
            style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(2.5rem,5vw,4rem)" }}
          >
            Terms &<br />Conditions
          </h1>
          <p className="text-sm opacity-50">
            Last updated: {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </p>
          <div className="w-16 h-px bg-[#2B0A0F]/20 mt-6" />
          <p className="text-sm leading-relaxed opacity-60 mt-6">
            These terms govern your use of Thrift Gennie. Please read them carefully.
            We've kept the language as plain as possible — if anything is unclear,
            email us at hello@thriftgennie.com.
          </p>
        </motion.div>

        {/* Table of contents */}
        <div className="bg-[#EAE3DB] rounded-2xl p-6 mb-14">
          <p className="text-[9px] uppercase tracking-[0.3em] opacity-50 mb-4">Contents</p>
          <div className="grid grid-cols-2 gap-2">
            {SECTIONS.map((s, i) => (
              <p key={s.title} className="text-xs opacity-60">
                {i + 1}. {s.title}
              </p>
            ))}
          </div>
        </div>

        <div className="space-y-12">
          {SECTIONS.map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="border-t border-[#2B0A0F]/08 pt-10"
            >
              <h2
                className="text-2xl mb-5"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                {i + 1}. {section.title}
              </h2>
              <ul className="space-y-3">
                {section.body.map((point, j) => (
                  <li key={j} className="flex gap-3 text-sm leading-relaxed opacity-65">
                    <span className="text-[#A1123F] flex-shrink-0 mt-0.5">✦</span>
                    {point}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 p-6 bg-[#EAE3DB] rounded-2xl">
          <p className="text-sm font-medium mb-2" style={{ fontFamily: "var(--font-playfair)" }}>
            Questions about these terms?
          </p>
          <p className="text-xs opacity-55 leading-relaxed">
            Email us at{" "}
            <a href="mailto:hello@thriftgennie.com" className="underline underline-offset-2">
              hello@thriftgennie.com
            </a>{" "}
            and we'll respond within 48 hours.
          </p>
        </div>
      </div>
    </main>
  );
}