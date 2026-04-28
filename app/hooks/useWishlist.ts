"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export function useWishlist(onUnauthenticated?: () => void) {
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) { setWishlist([]); return; }

    const fetchWishlist = async () => {
      const { data } = await supabase
        .from("wishlists").select("product_id").eq("user_id", userId);
      if (data) setWishlist(data.map(row => row.product_id));
    };

    fetchWishlist();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("wishlist-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "wishlists", filter: `user_id=eq.${userId}` },
        () => {
          const fetchWishlist = async () => {
            const { data } = await supabase
              .from("wishlists").select("product_id").eq("user_id", userId);
            if (data) setWishlist(data.map(row => row.product_id));
          };
          fetchWishlist();
        }
      ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const toggleWishlist = async (productId: string) => {
    if (!userId) {
      // 🔥 fire the modal instead of alert
      onUnauthenticated?.();
      return;
    }

    if (wishlist.includes(productId)) {
      await supabase.from("wishlists").delete()
        .eq("user_id", userId).eq("product_id", productId);
      setWishlist(prev => prev.filter(id => id !== productId));
    } else {
      await supabase.from("wishlists").insert({ user_id: userId, product_id: productId });
      setWishlist(prev => [...prev, productId]);
    }
  };

  const isWishlisted = (id: string) => wishlist.includes(id);

  return { wishlist, toggleWishlist, isWishlisted };
}