import "./globals.css";
import { Playfair_Display, Inter } from "next/font/google";
import Navbar from "./components/Navbar";
import SupportChat from "./components/SupportChat"; 
import { Cormorant_Garamond, DM_Sans } from "next/font/google";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm" });
 

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
        className={`${cormorant.variable} ${dmSans.variable}`}
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