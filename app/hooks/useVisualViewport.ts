import { useEffect, useState } from "react";

export function useVisualViewport() {
  const [viewportHeight, setViewportHeight] = useState<number>(
    typeof window !== "undefined" ? window.innerHeight : 800
  );

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const handler = () => setViewportHeight(viewport.height);
    viewport.addEventListener("resize", handler);
    viewport.addEventListener("scroll", handler);

    return () => {
      viewport.removeEventListener("resize", handler);
      viewport.removeEventListener("scroll", handler);
    };
  }, []);

  return viewportHeight;
}