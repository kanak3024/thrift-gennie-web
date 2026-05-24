"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useUser } from "../components/UserContext";

export function useLikes() {
  const { userId } = useUser(); // ← reads from context, no auth call
  const [likes, setLikes] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) { setLikes([]); return; }
    supabase
      .from("likes")
      .select("product_id")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (data) setLikes(data.map((r) => r.product_id));
      });
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("likes-changes")
      .on("postgres_changes", {
        event: "*", schema: "public", table: "likes",
        filter: `user_id=eq.${userId}`,
      }, () => {
        supabase
          .from("likes").select("product_id").eq("user_id", userId)
          .then(({ data }) => { if (data) setLikes(data.map((r) => r.product_id)); });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const toggleLike = useCallback(async (productId: string) => {
    if (!userId) { alert("Please login to like items 🔐"); return; }
    if (likes.includes(productId)) {
      await supabase.from("likes").delete().eq("user_id", userId).eq("product_id", productId);
      setLikes((prev) => prev.filter((id) => id !== productId));
    } else {
      await supabase.from("likes").insert({ user_id: userId, product_id: productId });
      setLikes((prev) => [...prev, productId]);
    }
  }, [userId, likes]);

  const isLiked = useCallback((id: string) => likes.includes(id), [likes]);

  return { likes, toggleLike, isLiked };
}