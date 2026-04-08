import "./globals.css";
import { Playfair_Display, Inter } from "next/font/google";
import Navbar from "./components/Navbar";
import SupportChat from "./components/SupportChat"; // ✅ ADD THIS

export const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`
          ${playfair.variable}
          ${inter.variable}
          bg-[#F6F3EF]
          text-[#2B0A0F]
        `}
      >
        {/* Navbar */}
        <Navbar />

        {/* Main Pages */}
        {children}

        {/* ✅ GLOBAL SUPPORT CHAT (FLOATING) */}
        <SupportChat />
      </body>
    </html>
  );
}