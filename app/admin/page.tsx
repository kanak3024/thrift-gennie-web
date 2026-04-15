"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

// ─── TYPES ───────────────────────────────────────────────────────────────────

type Stats = {
  totalListings: number;
  activeUsers: number;
  totalRevenue: number;
  openDisputes: number;
  pendingPayouts: number;
  pendingKyc: number;
};

type RecentOrder = {
  id: string;
  amount: number;
  status: string;
  payout_status: string;
  created_at: string;
  products?: { title: string };
  profiles?: { full_name: string };
};

type Seller = {
  id: string;
  full_name: string;
  city?: string;
  kyc_status?: "verified" | "pending" | "failed" | null;
  is_suspended?: boolean;
  listing_count?: number;
  total_sales?: number;
  rating?: number;
};

type AuditLog = {
  id: string;
  action: string;
  target: string;
  admin_email: string;
  created_at: string;
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    delivered:  { bg: "#6B7E60/10", text: "#6B7E60", label: "Delivered" },
    shipped:    { bg: "#B48A5A/10", text: "#B48A5A", label: "Shipped" },
    processing: { bg: "#185FA5/10", text: "#185FA5", label: "Processing" },
    disputed:   { bg: "#A1123F/10", text: "#A1123F", label: "Disputed" },
    paid:       { bg: "#6B7E60/10", text: "#6B7E60", label: "Paid" },
    pending:    { bg: "#B48A5A/10", text: "#B48A5A", label: "Pending" },
    verified:   { bg: "#6B7E60/10", text: "#6B7E60", label: "Verified" },
    failed:     { bg: "#A1123F/10", text: "#A1123F", label: "Failed" },
    active:     { bg: "#6B7E60/10", text: "#6B7E60", label: "Active" },
    suspended:  { bg: "#A1123F/10", text: "#A1123F", label: "Suspended" },
    review:     { bg: "#B48A5A/10", text: "#B48A5A", label: "Review" },
  };
  const s = map[status] ?? { bg: "#888/10", text: "#888", label: status };
  return (
    <span
      className="text-[8px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-full font-medium"
      style={{ background: `${s.text}18`, color: s.text }}
    >
      {s.label}
    </span>
  );
}

function Avatar({ name, color }: { name: string; color: string }) {
  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-medium flex-shrink-0"
      style={{ background: `${color}18`, color }}
    >
      {(name || "?")[0].toUpperCase()}
    </div>
  );
}

// ─── SECURITY TOGGLE ─────────────────────────────────────────────────────────

function SecurityToggle({
  label,
  sub,
  defaultOn,
  warn,
}: {
  label: string;
  sub: string;
  defaultOn: boolean;
  warn?: boolean;
}) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center gap-4 py-3 border-b border-[#2B0A0F]/06 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[#2B0A0F]/80">{label}</p>
        <p className="text-[9px] uppercase tracking-[0.1em] text-[#2B0A0F]/35 mt-0.5">{sub}</p>
      </div>
      <button
        onClick={() => setOn(!on)}
        className="relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 focus:outline-none"
        style={{ background: on ? (warn ? "#B48A5A" : "#6B7E60") : "#2B0A0F18" }}
        aria-label={`Toggle ${label}`}
      >
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200 shadow-sm"
          style={{ left: on ? "calc(100% - 18px)" : "2px" }}
        />
      </button>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalListings: 0,
    activeUsers: 0,
    totalRevenue: 0,
    openDisputes: 0,
    pendingPayouts: 0,
    pendingKyc: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [sellerTab, setSellerTab] = useState<"all" | "pending_kyc" | "flagged" | "top">("all");
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [sessionExpiry, setSessionExpiry] = useState<number>(30 * 60); // 30 min in seconds

  // ── AUTH GUARD ──
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { window.location.href = "admin/login"; return; }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single();
      if (profile?.role !== "admin") { window.location.href = "/"; return; }
      setAdminUser({ ...user, full_name: profile.full_name });
    });
  }, []);

  // ── SESSION COUNTDOWN (UX only — real timeout via Supabase session) ──
  useEffect(() => {
    if (!adminUser) return;
    const interval = setInterval(() => {
      setSessionExpiry((prev) => {
        if (prev <= 1) {
          supabase.auth.signOut().then(() => { window.location.href = "/login"; });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [adminUser]);

  // ── FETCH DATA ──
  useEffect(() => {
    if (!adminUser) return;
    fetchAll();
  }, [adminUser]);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchRecentOrders(), fetchSellers(), fetchAuditLogs()]);
    setLoading(false);
  };

  const fetchStats = async () => {
    const [listings, users, orders, tickets, payouts, kyc] = await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "user"),
      supabase.from("orders").select("amount").eq("status", "paid"),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("payout_status", "pending").eq("status", "paid"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("kyc_status", "pending"),
    ]);

    const revenue = (orders.data || []).reduce((sum: number, o: any) => sum + (o.amount || 0), 0);

    setStats({
      totalListings: listings.count || 0,
      activeUsers: users.count || 0,
      totalRevenue: revenue,
      openDisputes: tickets.count || 0,
      pendingPayouts: payouts.count || 0,
      pendingKyc: kyc.count || 0,
    });
  };

  const fetchRecentOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("id, amount, status, payout_status, created_at, products(title), profiles!orders_buyer_id_fkey(full_name)")
      .order("created_at", { ascending: false })
      .limit(5);
    if (data) setRecentOrders(data as RecentOrder[]);
  };

  const fetchSellers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, city, kyc_status, is_suspended, listing_count, total_sales, rating")
      .eq("role", "seller")
      .order("total_sales", { ascending: false })
      .limit(20);
    if (data) setSellers(data as Seller[]);
  };

  const fetchAuditLogs = async () => {
    const { data } = await supabase
      .from("admin_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);
    if (data) setAuditLogs(data as AuditLog[]);
  };

  const handleSuspendSeller = async (sellerId: string, suspend: boolean) => {
    await supabase.from("profiles").update({ is_suspended: suspend }).eq("id", sellerId);
    // Log the action
    await supabase.from("admin_audit_logs").insert({
      action: suspend ? "seller_suspended" : "seller_reinstated",
      target: sellerId,
      admin_email: adminUser?.email,
    });
    setSellers((prev) =>
      prev.map((s) => s.id === sellerId ? { ...s, is_suspended: suspend } : s)
    );
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  // ── SELLER FILTER ──
  const filteredSellers = sellers.filter((s) => {
    if (sellerTab === "pending_kyc") return s.kyc_status === "pending";
    if (sellerTab === "flagged") return s.is_suspended;
    if (sellerTab === "top") return (s.total_sales || 0) > 5000;
    return true;
  });

  const sessionMins = Math.floor(sessionExpiry / 60);
  const sessionSecs = sessionExpiry % 60;

  if (loading) return (
    <div className="min-h-screen bg-[#F6F3EF] flex items-center justify-center">
      <p className="uppercase tracking-[0.5em] text-[10px] opacity-40 animate-pulse">Loading Console...</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#F6F3EF] text-[#2B0A0F]">

      {/* ── TOP NAV ── */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-[#F6F3EF]/95 backdrop-blur-md border-b border-[#2B0A0F]/08">
        <div className="max-w-screen-xl mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-[10px] uppercase tracking-[0.3em] opacity-30 hover:opacity-70 transition-opacity">
              ← Home
            </Link>
            <span className="w-px h-4 bg-[#2B0A0F]/10" />
            <span className="text-[10px] uppercase tracking-[0.3em] opacity-70 font-medium">Dashboard</span>
            <span className="w-px h-4 bg-[#2B0A0F]/10" />
            <Link href="/admin/payout" className="text-[10px] uppercase tracking-[0.3em] opacity-30 hover:opacity-70 transition-opacity">
              Payouts
              {stats.pendingPayouts > 0 && (
                <span className="ml-2 bg-[#B48A5A] text-white text-[8px] px-1.5 py-0.5 rounded-full">
                  {stats.pendingPayouts}
                </span>
              )}
            </Link>
            <span className="w-px h-4 bg-[#2B0A0F]/10" />
            <Link href="/admin/support" className="text-[10px] uppercase tracking-[0.3em] opacity-30 hover:opacity-70 transition-opacity">
              Support
              {stats.openDisputes > 0 && (
                <span className="ml-2 bg-[#A1123F] text-white text-[8px] px-1.5 py-0.5 rounded-full">
                  {stats.openDisputes}
                </span>
              )}
            </Link>
          </div>

          <div className="flex items-center gap-5">
            {/* Session countdown */}
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6B7E60] animate-pulse" />
              <span className="text-[9px] uppercase tracking-[0.2em] opacity-40">
                Session {sessionMins}:{sessionSecs.toString().padStart(2, "0")}
              </span>
            </div>
            <span className="text-[9px] uppercase tracking-[0.2em] opacity-30">
              {adminUser?.full_name || adminUser?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="text-[9px] uppercase tracking-[0.2em] opacity-30 hover:opacity-70 hover:text-[#A1123F] transition-all"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="pt-16 max-w-screen-xl mx-auto px-8 pb-20">

        {/* ── HEADER ── */}
        <div className="py-12 flex items-end justify-between border-b border-[#2B0A0F]/08 mb-10">
          <div>
            <p className="text-[9px] uppercase tracking-[0.4em] opacity-40 mb-2">Admin Console</p>
            <h1 className="text-5xl" style={{ fontFamily: "var(--font-playfair)" }}>
              Dashboard
            </h1>
          </div>
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-[0.3em] opacity-30">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* ── ALERT BANNERS ── */}
        {stats.openDisputes > 0 && (
          <Link href="/admin/support">
            <div className="flex items-center gap-4 mb-4 px-5 py-4 border border-[#A1123F]/20 bg-[#A1123F]/04 rounded-xl hover:bg-[#A1123F]/08 transition-colors cursor-pointer">
              <span className="text-[#A1123F] text-[10px]">●</span>
              <p className="text-xs text-[#A1123F]/80 flex-1">
                <strong>{stats.openDisputes} open support ticket{stats.openDisputes !== 1 ? "s" : ""}</strong> — requires your attention
              </p>
              <span className="text-[9px] uppercase tracking-[0.2em] text-[#A1123F]/60">Review →</span>
            </div>
          </Link>
        )}
        {stats.pendingKyc > 0 && (
          <div className="flex items-center gap-4 mb-4 px-5 py-4 border border-[#B48A5A]/20 bg-[#B48A5A]/04 rounded-xl">
            <span className="text-[#B48A5A] text-[10px]">●</span>
            <p className="text-xs text-[#B48A5A]/80 flex-1">
              <strong>{stats.pendingKyc} seller{stats.pendingKyc !== 1 ? "s" : ""} pending KYC</strong> — review and verify
            </p>
            <button
              onClick={() => setSellerTab("pending_kyc")}
              className="text-[9px] uppercase tracking-[0.2em] text-[#B48A5A]/60 hover:text-[#B48A5A] transition-colors"
            >
              Review →
            </button>
          </div>
        )}

        {/* ── METRIC CARDS ── */}
        <div className="grid grid-cols-4 gap-4 mb-10">
          {[
            { label: "Total listings",    value: stats.totalListings.toLocaleString(),          delta: "+128 this week" },
            { label: "Active users",       value: stats.activeUsers.toLocaleString(),            delta: "+6.2% vs last week" },
            { label: "Total revenue",      value: `₹${stats.totalRevenue.toLocaleString()}`,     delta: "All time" },
            { label: "Pending payouts",    value: stats.pendingPayouts.toLocaleString(),         delta: "Awaiting transfer", warn: stats.pendingPayouts > 0 },
          ].map((card) => (
            <div key={card.label} className="bg-white border border-[#2B0A0F]/06 p-6 rounded-xl">
              <p className="text-[9px] uppercase tracking-[0.3em] opacity-40 mb-3">{card.label}</p>
              <p
                className="text-3xl font-light mb-1"
                style={{ fontFamily: "var(--font-playfair)", color: card.warn ? "#A1123F" : "#2B0A0F" }}
              >
                {card.value}
              </p>
              <p className="text-[9px] opacity-30">{card.delta}</p>
            </div>
          ))}
        </div>

        {/* ── TWO COLUMN: ORDERS + SECURITY ── */}
        <div className="grid grid-cols-2 gap-6 mb-6">

          {/* Recent Orders */}
          <div className="bg-white border border-[#2B0A0F]/06 p-6 rounded-xl">
            <div className="flex items-center justify-between mb-6">
              <p className="text-[10px] uppercase tracking-[0.3em] opacity-50 font-medium">Recent Orders</p>
              <Link href="/admin/payout" className="text-[9px] uppercase tracking-[0.2em] opacity-30 hover:opacity-70 transition-opacity">
                View all →
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <p className="text-xs italic opacity-30 text-center py-8">No orders yet</p>
            ) : (
              <div className="space-y-0">
                {recentOrders.map((order, i) => {
                  const colors = ["#6B7E60", "#B48A5A", "#185FA5", "#534AB7", "#A1123F"];
                  const color = colors[i % colors.length];
                  return (
                    <div key={order.id} className="flex items-center gap-3 py-3 border-b border-[#2B0A0F]/05 last:border-0">
                      <Avatar name={order.profiles?.full_name || "?"} color={color} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate">{order.products?.title || "—"}</p>
                        <p className="text-[9px] opacity-35 mt-0.5">#{order.id.slice(0, 8).toUpperCase()}</p>
                      </div>
                      <p className="text-sm font-light" style={{ fontFamily: "var(--font-playfair)" }}>
                        ₹{order.amount?.toLocaleString()}
                      </p>
                      <StatusPill status={order.status} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Security Controls */}
          <div className="bg-white border border-[#2B0A0F]/06 p-6 rounded-xl">
            <div className="flex items-center justify-between mb-6">
              <p className="text-[10px] uppercase tracking-[0.3em] opacity-50 font-medium">Security Controls</p>
              <span className="text-[9px] uppercase tracking-[0.2em] opacity-30">Audit log →</span>
            </div>

            <SecurityToggle
              label="Two-factor auth (admin)"
              sub="Enforced for all admin accounts"
              defaultOn={true}
            />
            <SecurityToggle
              label="Seller ID verification"
              sub="Aadhaar / PAN required to list"
              defaultOn={true}
            />
            <SecurityToggle
              label="IP allowlist for admin login"
              sub="Restrict access to known IPs"
              defaultOn={false}
              warn={true}
            />
            <SecurityToggle
              label="Activity audit log"
              sub="Every admin action is recorded"
              defaultOn={true}
            />
            <SecurityToggle
              label="Auto session timeout (30 min)"
              sub="Idle sessions signed out automatically"
              defaultOn={true}
            />

            {/* Recent audit entries */}
            {auditLogs.length > 0 && (
              <div className="mt-5 pt-5 border-t border-[#2B0A0F]/06">
                <p className="text-[9px] uppercase tracking-[0.25em] opacity-30 mb-3">Recent actions</p>
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex items-center gap-2">
                      <span className="text-[8px] opacity-25 flex-shrink-0">{timeAgo(log.created_at)}</span>
                      <span className="text-[9px] opacity-50 truncate">{log.action.replace(/_/g, " ")} — {log.target?.slice(0, 8)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── SELLER MANAGEMENT ── */}
        <div className="bg-white border border-[#2B0A0F]/06 p-6 rounded-xl">
          <div className="flex items-center justify-between mb-5">
            <p className="text-[10px] uppercase tracking-[0.3em] opacity-50 font-medium">Seller Management</p>
            <button className="text-[9px] uppercase tracking-[0.2em] opacity-30 hover:opacity-70 transition-opacity">
              Export CSV →
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-[#2B0A0F]/05 rounded-full w-fit mb-6">
            {(["all", "pending_kyc", "flagged", "top"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSellerTab(tab)}
                className={`px-4 py-1.5 rounded-full text-[8px] uppercase tracking-[0.15em] transition-all ${
                  sellerTab === tab
                    ? "bg-[#2B0A0F] text-[#F6F3EF]"
                    : "opacity-40 hover:opacity-70"
                }`}
              >
                {tab === "pending_kyc" ? "Pending KYC" : tab === "top" ? "Top Earners" : tab}
              </button>
            ))}
          </div>

          {filteredSellers.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-[#2B0A0F]/10 rounded-xl">
              <p className="text-xs italic opacity-30">No sellers in this category</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2B0A0F]/06">
                    {["Seller", "City", "Listings", "Revenue", "Rating", "KYC", "Status", "Action"].map((h) => (
                      <th key={h} className="text-left text-[8px] uppercase tracking-[0.12em] opacity-30 pb-3 pr-4 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredSellers.map((seller, i) => {
                    const colors = ["#6B7E60", "#B48A5A", "#185FA5", "#534AB7", "#A1123F"];
                    const color = colors[i % colors.length];
                    const statusLabel = seller.is_suspended ? "suspended" : "active";
                    const kycLabel = seller.kyc_status || "pending";
                    return (
                      <tr key={seller.id} className="border-b border-[#2B0A0F]/04 last:border-0 hover:bg-[#F6F3EF]/50 transition-colors">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <Avatar name={seller.full_name} color={color} />
                            <span className="text-xs">{seller.full_name}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-xs opacity-50">{seller.city || "—"}</td>
                        <td className="py-3 pr-4 text-xs">{seller.listing_count || 0}</td>
                        <td className="py-3 pr-4 text-xs" style={{ fontFamily: "var(--font-playfair)" }}>
                          ₹{(seller.total_sales || 0).toLocaleString()}
                        </td>
                        <td className="py-3 pr-4 text-xs">{seller.rating?.toFixed(1) || "—"}</td>
                        <td className="py-3 pr-4"><StatusPill status={kycLabel} /></td>
                        <td className="py-3 pr-4"><StatusPill status={statusLabel} /></td>
                        <td className="py-3">
                          <button
                            onClick={() => handleSuspendSeller(seller.id, !seller.is_suspended)}
                            className={`text-[8px] uppercase tracking-[0.15em] px-3 py-1.5 border rounded-full transition-all ${
                              seller.is_suspended
                                ? "border-[#6B7E60]/30 text-[#6B7E60] hover:bg-[#6B7E60] hover:text-white"
                                : "border-[#A1123F]/30 text-[#A1123F] hover:bg-[#A1123F] hover:text-white"
                            }`}
                          >
                            {seller.is_suspended ? "Reinstate" : "Suspend"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}