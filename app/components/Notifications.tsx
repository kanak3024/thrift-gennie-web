"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Notifications() {
  const [notes, setNotes] = useState<any[]>([]);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) setNotes(data);
  };

  return (
    <div className="fixed top-20 right-6 w-80 bg-white border shadow-xl p-4 rounded-xl">
      <p className="text-sm font-medium mb-3">Notifications</p>

      {notes.map((n) => (
        <div key={n.id} className="text-xs border-b py-2">
          {n.text}
        </div>
      ))}
    </div>
  );
}