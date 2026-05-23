import RackFeed from "../components/RackFeed";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rack — Thrift Gennie",
  description: "Flip through the archive. Scroll, discover, wear it.",
};

export default function RackPage() {
  return (
    // full-screen, no scroll, dark bg — sits under the fixed Navbar
    <main
      className="fixed inset-0 bg-[#0e0c0b] flex flex-col"
      style={{ paddingTop: "57px", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <RackFeed />
    </main>
  );
}