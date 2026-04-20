"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../../../lib/supabase";
import Link from "next/link";

type Buyer = {
  id: string;
  full_name: string;
  username?: string;
  phone?: string;
  created_at: string;
  totalOrders: number;
  totalSpent: number;
};

function Avatar({ name, color }: { name: string; color: string }) {
  return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0"
      style={{ background: `${color}18`, color }}>
      {(name || "?")[0].toUpperCase()}
    </div>
  );
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function BuyersPage() {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const adminUserRef = useRef<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { window.location.href = "/admin/login"; return; }
      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin") { window.location.href = "/"; return; }
      adminUserRef.current = user;
      fetchBuyers();
    });
  }, []);

  const fetchBuyers = async () => {
    setLoading(true);

    // "Buyers" = anyone who has placed at least one order.
    // Same user can also be a seller — we don't filter by role.
    const { data: orders } = await supabase
      .from("orders")
      .select("buyer_id, amount");

    if (!orders || orders.length === 0) {
      setBuyers([]);
      setLoading(false);
      return;
    }

    // Build order-count + spend map
    const orderMap: Record<string, { count: number; total: number }> = {};
    orders.forEach((o: any) => {
      if (!orderMap[o.buyer_id]) orderMap[o.buyer_id] = { count: 0, total: 0 };
      orderMap[o.buyer_id].count++;
      orderMap[o.buyer_id].total += o.amount || 0;
    });
    const buyerIds = Object.keys(orderMap);

    // Fetch their profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, username, phone, created_at")
      .in("id", buyerIds)
      .order("created_at", { ascending: false });

    setBuyers(
      (profiles || []).map((p: any) => ({
        ...p,
        totalOrders: orderMap[p.id]?.count || 0,
        totalSpent:  orderMap[p.id]?.total || 0,
      }))
    );
    setLoading(false);
  };

  const filtered = buyers.filter((b) =>
    !search ||
    b.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.username?.toLowerCase().includes(search.toLowerCase()) ||
    b.phone?.includes(search)
  );

  // Sort by most spent by default
  const sorted = [...filtered].sort((a, b) => b.totalSpent - a.totalSpent);

  const colors = ["#6B7E60", "#B48A5A", "#185FA5", "#534AB7", "#A1123F"];

  return (
    <main className="min-h-screen bg-[#F6F3EF] text-[#2B0A0F] flex flex-col">

      <div className="border-b border-[#2B0A0F]/08 px-8 h-14 flex items-center justify-between bg-[#F6F3EF]">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-[9px] uppercase tracking-[0.2em] opacity-30 hover:opacity-70 transition-opacity">← Dashboard</Link>
          <span className="opacity-20">/</span>
          <h1 className="text-[10px] uppercase tracking-[0.3em] font-medium opacity-60">Buyers</h1>
        </div>
        <input placeholder="Search buyers…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="text-[11px] bg-[#2B0A0F]/05 border border-[#2B0A0F]/08 rounded-full px-4 py-1.5 outline-none w-52" />
      </div>

      <div className="flex-1 px-8 py-8">

        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total buyers",  value: buyers.length },
            { label: "Total orders",  value: buyers.reduce((s, b) => s + b.totalOrders, 0) },
            { label: "Total spent",   value: `₹${buyers.reduce((s, b) => s + b.totalSpent, 0).toLocaleString("en-IN")}` },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-[#2B0A0F]/06 p-5 rounded-xl">
              <p className="text-[9px] uppercase tracking-[0.3em] opacity-40 mb-1">{s.label}</p>
              <p className="text-2xl font-light" style={{ fontFamily: "var(--font-playfair)" }}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-[#2B0A0F]/06 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#2B0A0F]/06 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.3em] opacity-50 font-medium">All Buyers</p>
            <span className="text-[9px] opacity-30">{sorted.length} results · sorted by spend</span>
          </div>

          {loading ? (
            <p className="text-xs italic opacity-30 text-center py-12">Loading…</p>
          ) : sorted.length === 0 ? (
            <p className="text-xs italic opacity-30 text-center py-12">No buyers found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2B0A0F]/06">
                    {["Buyer", "Username", "Phone", "Orders", "Total Spent", "Joined"].map((h) => (
                      <th key={h} className="text-left text-[8px] uppercase tracking-[0.12em] opacity-30 py-3 px-6 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((buyer, i) => (
                    <tr key={buyer.id} className="border-b border-[#2B0A0F]/04 last:border-0 hover:bg-[#F6F3EF]/50 transition-colors">
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-2">
                          <Avatar name={buyer.full_name} color={colors[i % colors.length]} />
                          <span className="text-xs whitespace-nowrap">{buyer.full_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-6 text-xs opacity-50">@{buyer.username || "—"}</td>
                      <td className="py-3 px-6 text-xs opacity-50 whitespace-nowrap">{buyer.phone || "—"}</td>
                      <td className="py-3 px-6 text-xs">{buyer.totalOrders}</td>
                      <td className="py-3 px-6 text-sm font-light whitespace-nowrap" style={{ fontFamily: "var(--font-playfair)" }}>
                        ₹{buyer.totalSpent.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-6 text-[9px] opacity-40 whitespace-nowrap">{timeAgo(buyer.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}