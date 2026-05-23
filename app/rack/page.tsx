import RackFeed from "../components/RackFeed";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rack — Thrift Gennie",
  description: "Flip through the archive. Scroll, discover, wear it.",
};

export default function RackPage() {
  return (
    // full-screen dark bg
    <main
      className="fixed inset-0 bg-[#0a0806] flex items-center justify-center"
      style={{ paddingTop: "57px" }}
    >
      {/*
        Mobile: full width, full height
        Desktop (md+): centered phone-frame look, 390px wide
        — dark bg on either side feels intentional, like Instagram Reels on desktop
      */}
      <div
        className="
          relative w-full h-full
          md:w-[390px] md:h-full md:max-h-[calc(100vh-57px)]
          md:rounded-2xl md:overflow-hidden
          md:shadow-2xl md:shadow-black/60
          flex flex-col
        "
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <RackFeed />
      </div>
    </main>
  );
}