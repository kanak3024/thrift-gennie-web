"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import SupportChat from "./SupportChat";
import NotificationToast from "./NotificationToast";
import BottomNav from "./BottomNav";
import { UserProvider } from "./UserContext";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  return (
    <UserProvider>
      {!isAdmin && <Navbar />}
      {!isAdmin && <NotificationToast />}
      {!isAdmin && <BottomNav />}
      <div className={!isAdmin ? "min-h-screen bg-[#1A060B]" : ""}>
        {children}
      </div>
      {/* SupportChat outside page div so it's never trapped in a stacking context */}
      {!isAdmin && (
        <div className="relative z-[60]">
          <SupportChat />
        </div>
      )}
    </UserProvider>
  );
}