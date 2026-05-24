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
  const { userId } = useUser(); // ← reads from context, no auth call
  const [wishlist, setWishlist] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) { setWishlist([]); return; }
    supabase
      .from("wishlists").select("product_id").eq("user_id", userId)
      .then(({ data }) => { if (data) setWishlist(data.map((r) => r.product_id)); });
  }, [userId]);

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

  const toggleWishlist = useCallback(
    async (productId: string, onUnauthenticated?: () => void) => {
      if (!userId) { onUnauthenticated?.(); return; }
      const alreadySaved = wishlist.includes(productId);
      setWishlist((prev) =>
        alreadySaved ? prev.filter((id) => id !== productId) : [...prev, productId]
      );
      if (alreadySaved) {
        await supabase.from("wishlists").delete().eq("user_id", userId).eq("product_id", productId);
      } else {
        await supabase.from("wishlists").insert({ user_id: userId, product_id: productId });
      }
    },
    [userId, wishlist]
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