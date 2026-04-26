import "./globals.css";
import { Playfair_Display, Inter, Cormorant_Garamond, DM_Sans } from "next/font/google";
import Navbar from "./components/Navbar";
import SupportChat from "./components/SupportChat";
import NotificationToast from "./components/NotificationToast";
import BottomNav from "./components/BottomNav";
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`
          ${playfair.variable}
          ${inter.variable}
          ${cormorant.variable}
          ${dmSans.variable}
          bg-[#F6F3EF]
          text-[#2B0A0F]
        `}
      >
        <Navbar />
        <NotificationToast />
        <NotificationToast />
<BottomNav />
        {children}
        <SupportChat />
      </body>
    </html>
  );
}