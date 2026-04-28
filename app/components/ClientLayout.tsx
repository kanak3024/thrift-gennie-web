"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import SupportChat from "./SupportChat";
import NotificationToast from "./NotificationToast";
import BottomNav from "./BottomNav";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  return (
    <>
      {!isAdmin && <Navbar />}
      {!isAdmin && <NotificationToast />}
      {!isAdmin && <BottomNav />}
       // AFTER
<div className={!isAdmin ? "min-h-screen" : ""}>
  {children}
</div>
      {!isAdmin && <SupportChat />}
    </>
  );
}