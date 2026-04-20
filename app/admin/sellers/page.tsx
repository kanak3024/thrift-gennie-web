"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../../../lib/supabase";
import Link from "next/link";

type Seller = {
  id: string;
  full_name: string;
  username?: string;
  phone?: string;
  phone_verified?: boolean;
  kyc_status?: "verified" | "pending" | "failed" | null;
  is_suspended?: boolean;
  created_at: string;
  totalListings: number;
  totalRevenue: number;
};

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { text: string; label: string }> = {
    verified:  { text: "#6B7E60", label: "Verified" },
    pending:   { text: "#B48A5A", label: "Pending" },
    failed:    { text: "#A1123F", label: "Failed" },
    active:    { text: "#6B7E60", label: "Active" },
    suspended: { text: "#A1123F", label: "Suspended" },
  };
  const s = map[status] ?? { text: "#888", label: status };
  return (
    <span className="text-[8px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-full font-medium"
      style={{ background: `${s.text}18`, color: s.text }}>
      {s.label}
    </span>
  );
}

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

export default function SellersPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "pending_kyc" | "suspended">("all");
  const adminUserRef = useRef<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { window.location.href = "/admin/login"; return; }
      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin") { window.location.href = "/"; return; }
      adminUserRef.current = user;
      fetchSellers();
    });
  }, []);

  const fetchSellers = async () => {
    setLoading(true);

    // "Sellers" = anyone who has at least one product listing.
    // We do NOT filter by role because on Thrift Gennie the same user can buy and sell.
    const { data: products } = await supabase
      .from("products")
      .select("seller_id");

    if (!products || products.length === 0) {
      setSellers([]);
      setLoading(false);
      return;
    }

    // Build listing-count map + unique seller IDs
    const listingCountMap: Record<string, number> = {};
    products.forEach((p: any) => {
      listingCountMap[p.seller_id] = (listingCountMap[p.seller_id] || 0) + 1;
    });
    const sellerIds = Object.keys(listingCountMap);

    // Fetch their profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, username, phone, phone_verified, kyc_status, is_suspended, created_at")
      .in("id", sellerIds)
      .order("created_at", { ascending: false });

    if (!profiles || profiles.length === 0) {
      setSellers([]);
      setLoading(false);
      return;
    }

    // Fetch revenue for those sellers
    const { data: orderData } = await supabase
      .from("orders")
      .select("seller_id, amount")
      .in("seller_id", sellerIds)
      .in("status", ["paid", "delivered", "shipped"]);

    const revenueMap: Record<string, number> = {};
    (orderData || []).forEach((o: any) => {
      revenueMap[o.seller_id] = (revenueMap[o.seller_id] || 0) + (o.amount || 0);
    });

    setSellers(
      profiles.map((p: any) => ({
        ...p,
        totalListings: listingCountMap[p.id] || 0,
        totalRevenue:  revenueMap[p.id]  || 0,
      }))
    );
    setLoading(false);
  };

  const handleSuspend = async (id: string, suspend: boolean) => {
    await supabase.from("profiles").update({ is_suspended: suspend }).eq("id", id);
    await supabase.from("admin_audit_logs").insert({
      action: suspend ? "seller_suspended" : "seller_reinstated",
      target: id,
      admin_email: adminUserRef.current?.email,
    });
    setSellers((prev) => prev.map((s) => s.id === id ? { ...s, is_suspended: suspend } : s));
  };

  const filtered = sellers
    .filter((s) =>
      tab === "pending_kyc" ? s.kyc_status === "pending" :
      tab === "suspended"   ? s.is_suspended :
      true
    )
    .filter((s) =>
      !search ||
      s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.username?.toLowerCase().includes(search.toLowerCase())
    );

  const colors = ["#6B7E60", "#B48A5A", "#185FA5", "#534AB7", "#A1123F"];

  return (
    <main className="min-h-screen bg-[#F6F3EF] text-[#2B0A0F] flex flex-col">

      <div className="border-b border-[#2B0A0F]/08 px-8 h-14 flex items-center justify-between bg-[#F6F3EF]">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-[9px] uppercase tracking-[0.2em] opacity-30 hover:opacity-70 transition-opacity">← Dashboard</Link>
          <span className="opacity-20">/</span>
          <h1 className="text-[10px] uppercase tracking-[0.3em] font-medium opacity-60">Sellers</h1>
        </div>
        <input placeholder="Search sellers…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="text-[11px] bg-[#2B0A0F]/05 border border-[#2B0A0F]/08 rounded-full px-4 py-1.5 outline-none w-52" />
      </div>

      <div className="flex-1 px-8 py-8">
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total sellers",  value: sellers.length },
            { label: "KYC verified",   value: sellers.filter((s) => s.kyc_status === "verified").length },
            { label: "Pending KYC",    value: sellers.filter((s) => s.kyc_status === "pending").length },
            { label: "Suspended",      value: sellers.filter((s) => s.is_suspended).length },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-[#2B0A0F]/06 p-5 rounded-xl">
              <p className="text-[9px] uppercase tracking-[0.3em] opacity-40 mb-1">{s.label}</p>
              <p className="text-2xl font-light" style={{ fontFamily: "var(--font-playfair)" }}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-[#2B0A0F]/06 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#2B0A0F]/06 flex items-center justify-between">
            <div className="flex gap-1 p-1 bg-[#2B0A0F]/05 rounded-full">
              {(["all", "pending_kyc", "suspended"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-1.5 rounded-full text-[8px] uppercase tracking-[0.15em] transition-all ${tab === t ? "bg-[#2B0A0F] text-[#F6F3EF]" : "opacity-40 hover:opacity-70"}`}>
                  {t === "pending_kyc" ? "Pending KYC" : t}
                </button>
              ))}
            </div>
            <span className="text-[9px] opacity-30">{filtered.length} results</span>
          </div>

          {loading ? (
            <p className="text-xs italic opacity-30 text-center py-12">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs italic opacity-30 text-center py-12">No sellers found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2B0A0F]/06">
                    {["Seller", "Username", "Phone", "Phone Verified", "KYC", "Status", "Listings", "Revenue", "Joined", "Action"].map((h) => (
                      <th key={h} className="text-left text-[8px] uppercase tracking-[0.12em] opacity-30 py-3 px-4 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((seller, i) => (
                    <tr key={seller.id} className="border-b border-[#2B0A0F]/04 last:border-0 hover:bg-[#F6F3EF]/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Avatar name={seller.full_name} color={colors[i % colors.length]} />
                          <span className="text-xs whitespace-nowrap">{seller.full_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs opacity-50">@{seller.username || "—"}</td>
                      <td className="py-3 px-4 text-xs opacity-50 whitespace-nowrap">{seller.phone || "—"}</td>
                      <td className="py-3 px-4">
                        {seller.phone_verified
                          ? <span className="text-[8px] px-2 py-0.5 rounded-full" style={{ background: "#6B7E6018", color: "#6B7E60" }}>Yes</span>
                          : <span className="text-[8px] px-2 py-0.5 rounded-full" style={{ background: "#88888818", color: "#888" }}>No</span>
                        }
                      </td>
                      <td className="py-3 px-4"><StatusPill status={seller.kyc_status || "pending"} /></td>
                      <td className="py-3 px-4"><StatusPill status={seller.is_suspended ? "suspended" : "active"} /></td>
                      <td className="py-3 px-4 text-xs">{seller.totalListings}</td>
                      <td className="py-3 px-4 text-xs font-light whitespace-nowrap" style={{ fontFamily: "var(--font-playfair)" }}>
                        ₹{seller.totalRevenue.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4 text-[9px] opacity-40 whitespace-nowrap">{timeAgo(seller.created_at)}</td>
                      <td className="py-3 px-4">
                        <button onClick={() => handleSuspend(seller.id, !seller.is_suspended)}
                          className={`text-[8px] uppercase tracking-[0.15em] px-3 py-1.5 border rounded-full transition-all whitespace-nowrap ${
                            seller.is_suspended
                              ? "border-[#6B7E60]/30 text-[#6B7E60] hover:bg-[#6B7E60] hover:text-white"
                              : "border-[#A1123F]/30 text-[#A1123F] hover:bg-[#A1123F] hover:text-white"
                          }`}>
                          {seller.is_suspended ? "Reinstate" : "Suspend"}
                        </button>
                      </td>
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