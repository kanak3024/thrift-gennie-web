"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useUser } from "../components/UserContext";

type WishlistContextType = {
  wishlist: string[];
  toggleWishlist: (productId: string, onUnauthenticated?: () => void) => Promise<void>;
  isWishlisted: (id: string) => boolean;
};

const WishlistContext = createContext<WishlistContextType>({
  wishlist: [],
  toggleWishlist: async () => {},
  isWishlisted: () => false,
});

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { userId } = useUser();
  const [wishlist, setWishlist] = useState<string[]>([]);

  // ── Fetch on mount / user change ──
  useEffect(() => {
    if (!userId) { setWishlist([]); return; }
    supabase
      .from("wishlists")
      .select("product_id")
      .eq("user_id", userId)
      .then(({ data, error }) => {
        if (error) console.error("Wishlist fetch error:", error);
        if (data) setWishlist(data.map((r) => r.product_id));
      });
  }, [userId]);

  // ── Realtime sync ──
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("wishlist-global")
      .on("postgres_changes", {
        event: "*", schema: "public", table: "wishlists",
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        if (payload.eventType === "INSERT") {
          setWishlist((prev) =>
            prev.includes(payload.new.product_id) ? prev : [...prev, payload.new.product_id]
          );
        } else if (payload.eventType === "DELETE") {
          setWishlist((prev) => prev.filter((id) => id !== payload.old.product_id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // ── Toggle: optimistic update + rollback on error ──
  const toggleWishlist = useCallback(
    async (productId: string, onUnauthenticated?: () => void) => {
      if (!userId) { onUnauthenticated?.(); return; }

      // Read current state inside functional updater — no stale closure
      let alreadySaved = false;
      setWishlist((prev) => {
        alreadySaved = prev.includes(productId);
        return alreadySaved
          ? prev.filter((id) => id !== productId)
          : [...prev, productId];
      });

      if (alreadySaved) {
        const { error } = await supabase
          .from("wishlists")
          .delete()
          .eq("user_id", userId)
          .eq("product_id", productId);

        if (error) {
          console.error("Wishlist delete failed:", error);
          // Rollback
          setWishlist((prev) => [...prev, productId]);
        }
      } else {
        const { error } = await supabase
          .from("wishlists")
          .insert({ user_id: userId, product_id: productId });

        if (error) {
          console.error("Wishlist insert failed:", error);
          // Rollback
          setWishlist((prev) => prev.filter((id) => id !== productId));
        }
      }
    },
    [userId] // ← wishlist removed from deps; state read via functional updater instead
  );

  const isWishlisted = useCallback((id: string) => wishlist.includes(id), [wishlist]);

  return (
    <WishlistContext.Provider value={{ wishlist, toggleWishlist, isWishlisted }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist(onUnauthenticated?: () => void) {
  const ctx = useContext(WishlistContext);
  return {
    ...ctx,
    toggleWishlist: (productId: string) => ctx.toggleWishlist(productId, onUnauthenticated),
  };
}