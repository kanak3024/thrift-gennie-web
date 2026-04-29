"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../../../lib/supabase";
import Link from "next/link";
import Image from "next/image";

type Listing = {
  id: string;
  title: string;
  price: number;
  condition: string;
  category: string;
  mood: string;
  status: string;
  location: string;
  image_url: string;
  created_at: string;
  seller_id: string;
  seller_name: string;
  seller_username: string;
};

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { text: string; label: string }> = {
    available: { text: "#6B7E60", label: "Live" },
    rejected:  { text: "#A1123F", label: "Removed" },
    hidden:    { text: "#B48A5A", label: "Hidden" },
    sold:      { text: "#185FA5", label: "Sold" },
  };
  const s = map[status] ?? { text: "#888", label: status };
  return (
    <span className="text-[8px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-full font-medium"
      style={{ background: `${s.text}18`, color: s.text }}>
      {s.label}
    </span>
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

const REJECTION_REASONS = [
  "Poor photo quality",
  "Blurry or dark photos",
  "Misleading description",
  "Wrong category",
  "Price too high",
  "Counterfeit / not authentic",
  "Not fashion related",
  "Duplicate listing",
];

export default function ListingsPage() {
  const [listings, setListings]       = useState<Listing[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [tab, setTab]                 = useState<"all" | "available" | "rejected" | "sold">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [rejectModal, setRejectModal] = useState<{ id: string; title: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [acting, setActing]           = useState<string | null>(null);
  const adminUserRef                  = useRef<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { window.location.href = "/admin/login"; return; }
      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin") { window.location.href = "/"; return; }
      adminUserRef.current = user;
      fetchListings();
    });
  }, []);

  const fetchListings = async () => {
    setLoading(true);

    const { data: products } = await supabase
      .from("products")
      .select("id, title, price, condition, category, mood, status, location, image_url, created_at, seller_id")
      .order("created_at", { ascending: false });

    if (!products || products.length === 0) {
      setListings([]);
      setLoading(false);
      return;
    }

    const sellerIds = [...new Set(products.map((p: any) => p.seller_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, username")
      .in("id", sellerIds);

    const profileMap: Record<string, any> = {};
    (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });

    setListings(
      products.map((p: any) => ({
        ...p,
        seller_name:     profileMap[p.seller_id]?.full_name || "Unknown",
        seller_username: profileMap[p.seller_id]?.username  || "",
      }))
    );
    setLoading(false);
  };

  const handleRemove = async (id: string, reason: string) => {
    setActing(id);
    try {
      // Soft delete — change status to rejected
      await supabase.from("products").update({ status: "rejected" }).eq("id", id);

      // Get seller_id for notification
      const listing = listings.find((l) => l.id === id);

      // Notify seller via notifications table (adjust to your schema if different)
      if (listing?.seller_id) {
        await supabase.from("notifications").insert({
          user_id: listing.seller_id,
          type: "listing_removed",
          message: `Your listing "${listing.title}" was removed. Reason: ${reason}`,
          read: false,
        });
      }

      // Audit log — same pattern as seller suspend
      await supabase.from("admin_audit_logs").insert({
        action: "listing_rejected",
        target: id,
        admin_email: adminUserRef.current?.email,
        notes: reason,
      });

      setListings((prev) =>
        prev.map((l) => l.id === id ? { ...l, status: "rejected" } : l)
      );
    } finally {
      setActing(null);
      setRejectModal(null);
      setRejectReason("");
      setCustomReason("");
    }
  };

  const handleRestore = async (id: string) => {
    setActing(id);
    try {
      await supabase.from("products").update({ status: "available" }).eq("id", id);
      await supabase.from("admin_audit_logs").insert({
        action: "listing_restored",
        target: id,
        admin_email: adminUserRef.current?.email,
      });
      setListings((prev) =>
        prev.map((l) => l.id === id ? { ...l, status: "available" } : l)
      );
    } finally {
      setActing(null);
    }
  };

  const categories = ["all", ...Array.from(new Set(listings.map((l) => l.category).filter(Boolean)))];

  const filtered = listings
    .filter((l) => tab === "all" ? true : l.status === tab)
    .filter((l) => categoryFilter === "all" ? true : l.category === categoryFilter)
    .filter((l) =>
      !search ||
      l.title?.toLowerCase().includes(search.toLowerCase()) ||
      l.seller_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.seller_username?.toLowerCase().includes(search.toLowerCase())
    );

  const stats = {
    total:     listings.length,
    live:      listings.filter((l) => l.status === "available").length,
    removed:   listings.filter((l) => l.status === "rejected").length,
    sold:      listings.filter((l) => l.status === "sold").length,
  };

  return (
    <main className="min-h-screen bg-[#F6F3EF] text-[#2B0A0F] flex flex-col">

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-[#F6F3EF] rounded-2xl p-6 w-full max-w-sm shadow-xl border border-[#2B0A0F]/08">
            <h3 className="text-base mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
              Remove listing?
            </h3>
            <p className="text-[10px] opacity-40 mb-5 leading-relaxed">
              "{rejectModal.title}" — seller will be notified with your reason.
            </p>

            <p className="text-[8px] uppercase tracking-[0.2em] opacity-40 mb-3">Reason</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {REJECTION_REASONS.map((r) => (
                <button key={r} type="button" onClick={() => setRejectReason(r)}
                  className={`px-3 py-1.5 rounded-full border text-[9px] uppercase tracking-[0.1em] transition-all ${
                    rejectReason === r
                      ? "bg-[#2B0A0F] text-[#F6F3EF] border-[#2B0A0F]"
                      : "border-[#2B0A0F]/15 opacity-50 hover:opacity-80"
                  }`}>
                  {r}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Or write a custom reason..."
              className="w-full bg-transparent border-b border-[#2B0A0F]/15 pb-2 outline-none text-sm placeholder:opacity-25 mb-6"
            />

            <div className="flex gap-3">
              <button onClick={() => { setRejectModal(null); setRejectReason(""); setCustomReason(""); }}
                className="flex-1 py-2.5 rounded-full border border-[#2B0A0F]/15 text-[9px] uppercase tracking-[0.2em] opacity-50 hover:opacity-80 transition-opacity">
                Cancel
              </button>
              <button
                onClick={() => handleRemove(rejectModal.id, customReason || rejectReason)}
                disabled={!rejectReason && !customReason}
                className="flex-1 py-2.5 rounded-full bg-[#A1123F] text-white text-[9px] uppercase tracking-[0.2em] disabled:opacity-30 hover:opacity-80 transition-opacity">
                Remove listing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="border-b border-[#2B0A0F]/08 px-8 h-14 flex items-center justify-between bg-[#F6F3EF]">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-[9px] uppercase tracking-[0.2em] opacity-30 hover:opacity-70 transition-opacity">
            ← Dashboard
          </Link>
          <span className="opacity-20">/</span>
          <h1 className="text-[10px] uppercase tracking-[0.3em] font-medium opacity-60">Listings</h1>
        </div>
        <input placeholder="Search listings or seller…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="text-[11px] bg-[#2B0A0F]/05 border border-[#2B0A0F]/08 rounded-full px-4 py-1.5 outline-none w-64" />
      </div>

      <div className="flex-1 px-8 py-8">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total listings", value: stats.total },
            { label: "Live now",       value: stats.live },
            { label: "Removed",        value: stats.removed },
            { label: "Sold",           value: stats.sold },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-[#2B0A0F]/06 p-5 rounded-xl">
              <p className="text-[9px] uppercase tracking-[0.3em] opacity-40 mb-1">{s.label}</p>
              <p className="text-2xl font-light" style={{ fontFamily: "var(--font-playfair)" }}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-[#2B0A0F]/06 rounded-xl overflow-hidden">

          {/* Filters bar */}
          <div className="px-6 py-4 border-b border-[#2B0A0F]/06 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              {/* Status tabs */}
              <div className="flex gap-1 p-1 bg-[#2B0A0F]/05 rounded-full">
                {(["all", "available", "rejected", "sold"] as const).map((t) => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`px-4 py-1.5 rounded-full text-[8px] uppercase tracking-[0.15em] transition-all ${
                      tab === t ? "bg-[#2B0A0F] text-[#F6F3EF]" : "opacity-40 hover:opacity-70"
                    }`}>
                    {t === "available" ? "Live" : t}
                  </button>
                ))}
              </div>

              {/* Category filter */}
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-[8px] uppercase tracking-[0.15em] bg-[#2B0A0F]/05 border border-[#2B0A0F]/08 rounded-full px-3 py-1.5 outline-none appearance-none cursor-pointer opacity-60">
                {categories.map((c) => (
                  <option key={c} value={c}>{c === "all" ? "All categories" : c}</option>
                ))}
              </select>
            </div>

            <span className="text-[9px] opacity-30">{filtered.length} results</span>
          </div>

          {/* Table */}
          {loading ? (
            <p className="text-xs italic opacity-30 text-center py-12">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs italic opacity-30 text-center py-12">No listings found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2B0A0F]/06">
                    {["Photo", "Title", "Seller", "Price", "Category", "Condition", "City", "Status", "Listed", "Action"].map((h) => (
                      <th key={h} className="text-left text-[8px] uppercase tracking-[0.12em] opacity-30 py-3 px-4 font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((listing) => (
                    <tr key={listing.id}
                      className={`border-b border-[#2B0A0F]/04 last:border-0 hover:bg-[#F6F3EF]/50 transition-colors ${
                        listing.status === "rejected" ? "opacity-50" : ""
                      }`}>

                      {/* Photo */}
                      <td className="py-3 px-4">
                        <div className="relative w-10 h-12 rounded-lg overflow-hidden bg-[#EAE3DB] flex-shrink-0">
                          {listing.image_url && (
                            <Image src={listing.image_url} alt={listing.title} fill className="object-cover" />
                          )}
                        </div>
                      </td>

                      {/* Title */}
                      <td className="py-3 px-4">
                        <p className="text-xs font-medium max-w-[160px] truncate">{listing.title}</p>
                        <p className="text-[9px] opacity-30 mt-0.5">{listing.id.slice(0, 8)}…</p>
                      </td>

                      {/* Seller */}
                      <td className="py-3 px-4">
                        <p className="text-xs whitespace-nowrap">{listing.seller_name}</p>
                        <p className="text-[9px] opacity-40">@{listing.seller_username || "—"}</p>
                      </td>

                      {/* Price */}
                      <td className="py-3 px-4 text-xs font-light whitespace-nowrap"
                        style={{ fontFamily: "var(--font-playfair)" }}>
                        ₹{listing.price?.toLocaleString("en-IN")}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 text-[10px] opacity-50 whitespace-nowrap">{listing.category || "—"}</td>

                      {/* Condition */}
                      <td className="py-3 px-4 text-[10px] opacity-50 whitespace-nowrap">{listing.condition || "—"}</td>

                      {/* City */}
                      <td className="py-3 px-4 text-[10px] opacity-50 whitespace-nowrap">{listing.location || "—"}</td>

                      {/* Status */}
                      <td className="py-3 px-4"><StatusPill status={listing.status} /></td>

                      {/* Time */}
                      <td className="py-3 px-4 text-[9px] opacity-40 whitespace-nowrap">
                        {timeAgo(listing.created_at)}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4">
                        {listing.status === "rejected" ? (
                          <button onClick={() => handleRestore(listing.id)}
                            disabled={acting === listing.id}
                            className="text-[8px] uppercase tracking-[0.15em] px-3 py-1.5 border border-[#6B7E60]/30 text-[#6B7E60] rounded-full hover:bg-[#6B7E60] hover:text-white transition-all disabled:opacity-30 whitespace-nowrap">
                            {acting === listing.id ? "…" : "Restore"}
                          </button>
                        ) : listing.status === "available" ? (
                          <button
                            onClick={() => setRejectModal({ id: listing.id, title: listing.title })}
                            disabled={acting === listing.id}
                            className="text-[8px] uppercase tracking-[0.15em] px-3 py-1.5 border border-[#A1123F]/30 text-[#A1123F] rounded-full hover:bg-[#A1123F] hover:text-white transition-all disabled:opacity-30 whitespace-nowrap">
                            {acting === listing.id ? "…" : "Remove"}
                          </button>
                        ) : (
                          <span className="text-[9px] opacity-20">—</span>
                        )}
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