"use client";

import { motion } from "framer-motion";

const SECTIONS = [
  {
    title: "Information We Collect",
    body: [
      "When you create an account, we collect your name, email address, and password (encrypted).",
      "When you list a product, we collect product details, photos, price, and your location (city only — never your exact address).",
      "When you make a purchase, we collect payment information processed securely by Razorpay. We never store your card details.",
      "We collect payout information (bank account / UPI) only for sellers, stored securely and never shared.",
      "We automatically collect basic usage data (pages visited, device type) to improve the platform.",
    ],
  },
  {
    title: "How We Use Your Information",
    body: [
      "To operate the marketplace — connecting buyers and sellers, processing payments, fulfilling orders.",
      "To send transactional emails — order confirmations, shipping updates, account alerts.",
      "To improve Thrift Gennie — analysing usage patterns to build a better product.",
      "To keep the archive safe — detecting fraud, fake listings, and policy violations.",
      "We do not sell your personal data to third parties. Ever.",
    ],
  },
  {
    title: "How We Share Your Information",
    body: [
      "With Razorpay for payment processing. Their privacy policy governs how they handle payment data.",
      "With shipping partners when an order is placed — only the information needed to fulfil delivery.",
      "With law enforcement if legally required to do so.",
      "Between buyers and sellers — your display name and city are visible on listings and in chats. Your email and phone are never shared.",
    ],
  },
  {
    title: "Cookies & Tracking",
    body: [
      "We use essential cookies to keep you logged in and remember your preferences.",
      "We use analytics cookies (anonymised) to understand how the platform is used.",
      "We do not use advertising or tracking cookies. We are not ad-funded.",
      "You can disable cookies in your browser settings, though this may affect functionality.",
    ],
  },
  {
    title: "Data Retention",
    body: [
      "We retain your account data for as long as your account is active.",
      "If you delete your account, we delete your personal data within 30 days, except where legally required to retain it.",
      "Order records are retained for 7 years for tax and legal compliance.",
    ],
  },
  {
    title: "Your Rights",
    body: [
      "Access: You can request a copy of the data we hold about you.",
      "Correction: You can update your profile information at any time.",
      "Deletion: You can request deletion of your account and data.",
      "Portability: You can request your data in a portable format.",
      "To exercise any of these rights, email us at privacy@thriftgennie.com.",
    ],
  },
  {
    title: "Security",
    body: [
      "All data is transmitted over HTTPS.",
      "Passwords are hashed and never stored in plain text.",
      "Payment data is handled entirely by Razorpay and never touches our servers.",
      "We conduct regular security reviews and promptly address vulnerabilities.",
    ],
  },
  {
    title: "Changes to This Policy",
    body: [
      "We may update this policy as the platform evolves. We will notify you of significant changes via email.",
      "Continued use of Thrift Gennie after changes constitutes acceptance of the updated policy.",
    ],
  },
];

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="text-sm opacity-50">
            Last updated: {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </p>
          <div className="w-16 h-px bg-[#2B0A0F]/20 mt-6" />
          <p className="text-sm leading-relaxed opacity-60 mt-6">
            At Thrift Gennie, we believe your data belongs to you. This policy explains
            what we collect, why we collect it, and how we protect it. We've written
            it in plain English because legal jargon shouldn't be a barrier to knowing
            your rights.
          </p>
        </motion.div>

        <div className="space-y-12">
          {SECTIONS.map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
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
            Questions about your privacy?
          </p>
          <p className="text-xs opacity-55 leading-relaxed">
            Email us at{" "}
            <a href="mailto:privacy@thriftgennie.com" className="underline underline-offset-2">
              privacy@thriftgennie.com
            </a>{" "}
            and we'll respond within 48 hours.
          </p>
        </div>
      </div>
    </main>
  );
}