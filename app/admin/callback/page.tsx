"use client";

import { useEffect } from "react";
import { supabase } from "../../../lib/supabase";

export default function AdminCallback() {
  useEffect(() => {
    const run = async () => {
      // Exchange the token in the URL for a session
      const { data, error } = await supabase.auth.getSession();
      
      if (error || !data.session) {
        window.location.href = "/admin/login";
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", data.session.user.id)
        .single();

      if (profile?.is_admin) {
        window.location.href = "/admin";
      } else {
        await supabase.auth.signOut();
        window.location.href = "/admin/login";
      }
    };

    run();
  }, []);

  return (
    <main className="min-h-screen bg-[#F6F3EF] flex items-center justify-center">
      <p className="text-[10px] uppercase tracking-[0.4em] opacity-30 animate-pulse">
        Verifying access…
      </p>
    </main>
  );
}