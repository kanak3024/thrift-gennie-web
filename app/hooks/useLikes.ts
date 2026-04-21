"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export function useLikes() {
  const [likes, setLikes] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Fetch likes from Supabase when user is known
  useEffect(() => {
    if (!userId) {
      setLikes([]);
      return;
    }

    const fetchLikes = async () => {
      const { data } = await supabase
        .from("likes")
        .select("product_id")
        .eq("user_id", userId);

      if (data) setLikes(data.map(row => row.product_id));
    };

    fetchLikes();
  }, [userId]);

  // Realtime sync — mirrors your useWishlist pattern exactly
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("likes-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "likes",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          const fetchLikes = async () => {
            const { data } = await supabase
              .from("likes")
              .select("product_id")
              .eq("user_id", userId);

            if (data) setLikes(data.map(row => row.product_id));
          };
          fetchLikes();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const toggleLike = async (productId: string) => {
    if (!userId) {
      alert("Please login to like items 🔐");
      return;
    }

    if (likes.includes(productId)) {
      // Unlike
      await supabase
        .from("likes")
        .delete()
        .eq("user_id", userId)
        .eq("product_id", productId);

      setLikes(prev => prev.filter(id => id !== productId));
    } else {
      // Like — trigger on_like_insert() fires automatically → notification created
      await supabase
        .from("likes")
        .insert({ user_id: userId, product_id: productId });

      setLikes(prev => [...prev, productId]);
    }
  };

  const isLiked = (id: string) => likes.includes(id);

  return { likes, toggleLike, isLiked };
}