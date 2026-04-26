"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  totalOrders: number;
  totalSellers: number;
  verifiedSellers: number;
  disputedOrders: number;
  deliveredOrders: number;
};

type StatDeltas = {
  listingsDelta: number;
  usersDeltaPct: number;
  revenueLabel: string;
  pendingPayoutsLabel: string;
};

type Sparklines = {
  listings: number[];
  users: number[];
  revenue: number[];
  payouts: number[];
};

// Platform Health
type PlatformHealth = {
  orderSuccessRate: number;   // delivered / total orders
  kycPassRate: number;        // verified / total sellers
  disputeRate: number;        // disputed / total orders
  payoutSlaAvgDays: number;   // avg days paid → payout done
};

// Live Activity
type ActivityEvent = {
  id: string;
  type: "order" | "ticket" | "signup";
  label: string;
  detail: string;
  ts: string;
};

type RecentOrder = {
  id: string;
  amount: number;
  status: string;
  payout_status: string;
  created_at: string;
  buyer_id: string;
  product_id?: string;
  productTitle?: string;
  buyerName?: string;
};

type Seller = {
  id: string;
  full_name: string;
  username?: string;
  phone?: string;
  phone_verified?: boolean;
  kyc_status?: "verified" | "pending" | "failed" | null;
  is_suspended?: boolean;
  bio?: string;
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

function normalise(arr: number[]): number[] {
  const max = Math.max(...arr, 1);
  return arr.map((v) => Math.round((v / max) * 100));
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { text: string; label: string }> = {
    delivered:      { text: "#6B7E60", label: "Delivered" },
    shipped:        { text: "#B48A5A", label: "Shipped" },
    processing:     { text: "#185FA5", label: "Processing" },
    disputed:       { text: "#A1123F", label: "Disputed" },
    paid:           { text: "#6B7E60", label: "Paid" },
    pending:        { text: "#B48A5A", label: "Pending" },
    verified:       { text: "#6B7E60", label: "Verified" },
    failed:         { text: "#A1123F", label: "Failed" },
    active:         { text: "#6B7E60", label: "Active" },
    suspended:      { text: "#A1123F", label: "Suspended" },
    review:         { text: "#B48A5A", label: "Review" },
    pending_kyc:    { text: "#B48A5A", label: "Pending KYC" },
  };
  const s = map[status] ?? { text: "#888", label: status };
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

// ─── SPARKLINE ───────────────────────────────────────────────────────────────

function Sparkline({ data, color = "currentColor" }: { data: number[]; color?: string }) {
  const norm = normalise(data);
  return (
    <div className="flex items-end gap-0.5 h-8 my-2">
      {norm.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all duration-500"
          style={{ height: `${Math.max(h, 6)}%`, background: color, opacity: 0.25 + (i / norm.length) * 0.5 }}
        />
      ))}
    </div>
  );
}

// ─── PLATFORM HEALTH RING ────────────────────────────────────────────────────

function HealthRing({ value, color, size = 40 }: { value: number; color: string; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (value / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`${color}20`} strokeWidth={3} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={3}
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
    </svg>
  );
}

// ─── SECURITY TOGGLE ─────────────────────────────────────────────────────────

function SecurityToggle({
  label, sub, defaultOn, warn, settingKey, onToggle,
}: {
  label: string; sub: string; defaultOn: boolean; warn?: boolean;
  settingKey: string; onToggle: (key: string, value: boolean) => void;
}) {
  const [on, setOn] = useState(defaultOn);
  const [saving, setSaving] = useState(false);
  const toggle = async () => {
    const next = !on;
    setOn(next);
    setSaving(true);
    await onToggle(settingKey, next);
    setSaving(false);
  };
  return (
    <div className="flex items-center gap-4 py-3 border-b border-[#2B0A0F]/06 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[#2B0A0F]/80">{label}</p>
        <p className="text-[9px] uppercase tracking-[0.1em] text-[#2B0A0F]/35 mt-0.5">{sub}</p>
      </div>
      <button
        onClick={toggle} disabled={saving}
        className="relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 focus:outline-none disabled:opacity-50"
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

// ─── LIVE ACTIVITY FEED ───────────────────────────────────────────────────────

function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  const iconMap: Record<ActivityEvent["type"], { icon: string; color: string }> = {
    order:   { icon: "↗", color: "#6B7E60" },
    ticket:  { icon: "!", color: "#A1123F" },
    signup:  { icon: "+", color: "#185FA5" },
  };
  return (
    <div className="bg-white border border-[#2B0A0F]/06 p-6 rounded-xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6B7E60] animate-pulse" />
          <p className="text-[10px] uppercase tracking-[0.3em] opacity-50 font-medium">Live Activity</p>
        </div>
        <span className="text-[8px] uppercase tracking-[0.15em] opacity-25">Realtime</span>
      </div>
      {events.length === 0 ? (
        <p className="text-xs italic opacity-30 text-center py-6">Waiting for events…</p>
      ) : (
        <div className="space-y-2.5">
          {events.map((ev) => {
            const { icon, color } = iconMap[ev.type];
            return (
              <div key={ev.id} className="flex items-start gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5"
                  style={{ background: `${color}15`, color }}
                >
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs">{ev.label}</p>
                  <p className="text-[9px] opacity-35 mt-0.5">{ev.detail}</p>
                </div>
                <span className="text-[8px] opacity-25 flex-shrink-0 mt-0.5">{timeAgo(ev.ts)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── PLATFORM HEALTH CARD ─────────────────────────────────────────────────────

function PlatformHealthCard({ health }: { health: PlatformHealth }) {
  const metrics = [
    {
      label: "Order Success",
      sub: "Delivered / total",
      value: health.orderSuccessRate,
      color: "#6B7E60",
      display: `${health.orderSuccessRate.toFixed(1)}%`,
    },
    {
      label: "KYC Pass Rate",
      sub: "Verified sellers",
      value: health.kycPassRate,
      color: "#185FA5",
      display: `${health.kycPassRate.toFixed(1)}%`,
    },
    {
      label: "Dispute Rate",
      sub: "Disputed / total",
      value: health.disputeRate,
      color: health.disputeRate > 10 ? "#A1123F" : "#B48A5A",
      display: `${health.disputeRate.toFixed(1)}%`,
      invert: true, // lower is better
    },
    {
      label: "Payout SLA",
      sub: "Avg days to clear",
      value: Math.min(health.payoutSlaAvgDays / 7 * 100, 100), // normalise vs 7-day target
      color: health.payoutSlaAvgDays <= 2 ? "#6B7E60" : health.payoutSlaAvgDays <= 5 ? "#B48A5A" : "#A1123F",
      display: health.payoutSlaAvgDays > 0 ? `${health.payoutSlaAvgDays.toFixed(1)}d` : "—",
      invert: true,
    },
  ];

  return (
    <div className="bg-white border border-[#2B0A0F]/06 p-6 rounded-xl">
      <div className="flex items-center justify-between mb-6">
        <p className="text-[10px] uppercase tracking-[0.3em] opacity-50 font-medium">Platform Health</p>
        <span className="text-[8px] uppercase tracking-[0.15em] opacity-25">Computed</span>
      </div>
      <div className="grid grid-cols-2 gap-5">
        {metrics.map((m) => (
          <div key={m.label} className="flex items-center gap-3">
            <HealthRing value={m.invert ? 100 - m.value : m.value} color={m.color} />
            <div className="min-w-0">
              <p
                className="text-xl font-light"
                style={{ fontFamily: "var(--font-playfair)", color: m.color }}
              >
                {m.display}
              </p>
              <p className="text-[9px] font-medium text-[#2B0A0F]/70 mt-0.5">{m.label}</p>
              <p className="text-[8px] uppercase tracking-[0.1em] opacity-30">{m.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────

function AdminSidebar({
  stats, adminUser, onSignOut, sessionMins, sessionSecs,
}: {
  stats: Stats; adminUser: any; onSignOut: () => void;
  sessionMins: number; sessionSecs: number;
}) {
  return (
    <div className="w-[200px] flex-shrink-0 min-h-screen border-r border-[#2B0A0F]/08 flex flex-col bg-[#F6F3EF]">
      <div className="px-4 py-5 border-b border-[#2B0A0F]/08">
        <p className="text-[10px] uppercase tracking-[0.3em] font-medium">Thrift Gennie</p>
        <p className="text-[8px] uppercase tracking-[0.2em] opacity-30 mt-0.5">Admin Console</p>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {/* Overview */}
        <p className="text-[8px] uppercase tracking-[0.15em] opacity-30 px-2 pb-1 pt-2">Overview</p>
        <Link href="/admin" className="flex items-center gap-2 px-2 py-2 rounded-lg bg-[#2B0A0F]/06 text-[11px] font-medium">
          Dashboard
        </Link>

        {/* Marketplace */}
        <p className="text-[8px] uppercase tracking-[0.15em] opacity-30 px-2 pb-1 pt-3">Marketplace</p>
        <Link href="/admin/listings" className="flex items-center justify-between px-2 py-2 rounded-lg text-[11px] opacity-50 hover:opacity-80 hover:bg-[#2B0A0F]/04 transition-all">
          Listings
          <span className="bg-[#6B7E60]/15 text-[#6B7E60] text-[8px] px-1.5 py-0.5 rounded-full">
            {stats.totalListings}
          </span>
        </Link>
        <Link href="/admin/orders" className="flex items-center justify-between px-2 py-2 rounded-lg text-[11px] opacity-50 hover:opacity-80 hover:bg-[#2B0A0F]/04 transition-all">
          Orders
          <span className="bg-[#185FA5]/15 text-[#185FA5] text-[8px] px-1.5 py-0.5 rounded-full">
            {stats.totalOrders}
          </span>
        </Link>
        <Link href="/admin/payout" className="flex items-center justify-between px-2 py-2 rounded-lg text-[11px] opacity-50 hover:opacity-80 hover:bg-[#2B0A0F]/04 transition-all">
          Payouts
          {stats.pendingPayouts > 0 && (
            <span className="bg-[#B48A5A]/15 text-[#B48A5A] text-[8px] px-1.5 py-0.5 rounded-full">
              {stats.pendingPayouts}
            </span>
          )}
        </Link>

        {/* Users */}
        <p className="text-[8px] uppercase tracking-[0.15em] opacity-30 px-2 pb-1 pt-3">Users</p>
        <Link href="/admin/sellers" className="flex items-center justify-between px-2 py-2 rounded-lg text-[11px] opacity-50 hover:opacity-80 hover:bg-[#2B0A0F]/04 transition-all">
          Sellers
          <span className="bg-[#2B0A0F]/10 text-[#2B0A0F]/60 text-[8px] px-1.5 py-0.5 rounded-full">
            {stats.totalSellers}
          </span>
        </Link>
        <Link href="/admin/buyers" className="flex items-center justify-between px-2 py-2 rounded-lg text-[11px] opacity-50 hover:opacity-80 hover:bg-[#2B0A0F]/04 transition-all">
          Buyers
          <span className="bg-[#2B0A0F]/10 text-[#2B0A0F]/60 text-[8px] px-1.5 py-0.5 rounded-full">
            {stats.activeUsers}
          </span>
        </Link>

        {/* Trust & Safety */}
        <p className="text-[8px] uppercase tracking-[0.15em] opacity-30 px-2 pb-1 pt-3">Trust & Safety</p>
        <Link href="/admin/support" className="flex items-center justify-between px-2 py-2 rounded-lg text-[11px] opacity-50 hover:opacity-80 hover:bg-[#2B0A0F]/04 transition-all">
          Support
          {stats.openDisputes > 0 && (
            <span className="bg-[#A1123F]/15 text-[#A1123F] text-[8px] px-1.5 py-0.5 rounded-full">
              {stats.openDisputes}
            </span>
          )}
        </Link>
        <Link href="/admin/kyc" className="flex items-center justify-between px-2 py-2 rounded-lg text-[11px] opacity-50 hover:opacity-80 hover:bg-[#2B0A0F]/04 transition-all">
          KYC Review
          {stats.pendingKyc > 0 && (
            <span className="bg-[#B48A5A]/15 text-[#B48A5A] text-[8px] px-1.5 py-0.5 rounded-full">
              {stats.pendingKyc}
            </span>
          )}
        </Link>
        <Link href="/admin/audit" className="flex items-center justify-between px-2 py-2 rounded-lg text-[11px] opacity-50 hover:opacity-80 hover:bg-[#2B0A0F]/04 transition-all">
          Audit Log
        </Link>

        {/* System */}
        <p className="text-[8px] uppercase tracking-[0.15em] opacity-30 px-2 pb-1 pt-3">System</p>
        <Link href="/admin/settings" className="flex items-center gap-2 px-2 py-2 rounded-lg text-[11px] opacity-50 hover:opacity-80 hover:bg-[#2B0A0F]/04 transition-all">
          Settings
        </Link>
      </nav>

      <div className="px-4 py-4 border-t border-[#2B0A0F]/08 space-y-2">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6B7E60] animate-pulse" />
          <span className="text-[8px] uppercase tracking-[0.15em] opacity-30">
            {sessionMins}:{sessionSecs.toString().padStart(2, "0")}
          </span>
        </div>
        <p className="text-[9px] opacity-30 truncate">{adminUser?.full_name || adminUser?.email}</p>
        <button onClick={onSignOut} className="text-[9px] uppercase tracking-[0.15em] text-[#A1123F]/50 hover:text-[#A1123F] transition-colors">
          Sign out
        </button>
      </div>
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
    totalOrders: 0,
    totalSellers: 0,
    verifiedSellers: 0,
    disputedOrders: 0,
    deliveredOrders: 0,
  });
  const [deltas, setDeltas] = useState<StatDeltas>({
    listingsDelta: 0,
    usersDeltaPct: 0,
    revenueLabel: "All time",
    pendingPayoutsLabel: "Awaiting transfer",
  });
  const [sparklines, setSparklines] = useState<Sparklines>({
    listings: [0, 0, 0, 0, 0, 0, 0],
    users:    [0, 0, 0, 0, 0, 0, 0],
    revenue:  [0, 0, 0, 0, 0, 0, 0],
    payouts:  [0, 0, 0, 0, 0, 0, 0],
  });
  const [health, setHealth] = useState<PlatformHealth>({
    orderSuccessRate: 0,
    kycPassRate: 0,
    disputeRate: 0,
    payoutSlaAvgDays: 0,
  });
  const [activityFeed, setActivityFeed] = useState<ActivityEvent[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [sellerTab, setSellerTab] = useState<"all" | "pending_kyc" | "flagged" | "top">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [sessionExpiry, setSessionExpiry] = useState<number>(30 * 60);
  const adminUserRef = useRef<any>(null);
  const activityRef = useRef<ActivityEvent[]>([]);

  // ── AUTH GUARD ──
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user }, error: authErr }) => {
      if (authErr || !user) { window.location.href = "/admin/login"; return; }
      const { data: profile, error: profileErr } = await supabase
        .from("profiles").select("role, full_name").eq("id", user.id).single();
      if (profileErr || profile?.role !== "admin") { window.location.href = "/"; return; }
      const resolved = { ...user, full_name: profile.full_name };
      adminUserRef.current = resolved;
      setAdminUser(resolved);
    });
  }, []);

  // ── SESSION COUNTDOWN ──
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

  // ── REALTIME ACTIVITY FEED ──
  useEffect(() => {
    if (!adminUser) return;

    const pushEvent = (ev: ActivityEvent) => {
      activityRef.current = [ev, ...activityRef.current].slice(0, 10);
      setActivityFeed([...activityRef.current]);
    };

    const ordersChannel = supabase
      .channel("realtime:orders")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        const r = payload.new as any;
        pushEvent({
          id: `order-${r.id}`,
          type: "order",
          label: `New order #${r.id?.slice(0, 8).toUpperCase()}`,
          detail: `₹${r.amount?.toLocaleString("en-IN")} · ${r.status}`,
          ts: r.created_at || new Date().toISOString(),
        });
      })
      .subscribe();

    const ticketsChannel = supabase
      .channel("realtime:tickets")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_tickets" }, (payload) => {
        const r = payload.new as any;
        pushEvent({
          id: `ticket-${r.id}`,
          type: "ticket",
          label: `Support ticket opened`,
          detail: r.subject || r.message?.slice(0, 40) || "No subject",
          ts: r.created_at || new Date().toISOString(),
        });
      })
      .subscribe();

    const profilesChannel = supabase
      .channel("realtime:profiles")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, (payload) => {
        const r = payload.new as any;
        pushEvent({
          id: `signup-${r.id}`,
          type: "signup",
          label: `New ${r.role || "user"} signed up`,
          detail: r.full_name || r.email || "Unknown",
          ts: r.created_at || new Date().toISOString(),
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(ticketsChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, [adminUser]);

  // ── FETCH ALL ──
  const fetchAll = useCallback(async () => {
    if (!adminUserRef.current) return;
    try {
      await Promise.all([
        fetchStats(),
        fetchSparklines(),
        fetchRecentOrders(),
        fetchSellers(),
        fetchAuditLogs(),
      ]);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!adminUser) return;
    fetchAll();
    const poll = setInterval(fetchAll, 60_000);
    return () => clearInterval(poll);
  }, [adminUser, fetchAll]);

  // ── STATS + PLATFORM HEALTH ──
  const fetchStats = async () => {
    const sevenDaysAgo = daysAgo(7);
    const fourteenDaysAgo = daysAgo(14);

    const [
      listings, activeUserRows, orders, tickets,
      payouts, kyc, newListings, usersThisWeek, usersPriorWeek,
      totalSellersResult, verifiedSellersResult,
      disputedOrdersResult, deliveredOrdersResult,
      totalOrdersResult,
      payoutSlaRows,
    ] = await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("buyer_id").gte("created_at", daysAgo(90)),
      supabase.from("orders").select("amount").in("status", ["paid", "delivered", "shipped"])
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("orders").select("id", { count: "exact", head: true })
        .eq("payout_status", "pending").in("status", ["paid", "delivered", "shipped"])
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("kyc_status", "pending"),
      supabase.from("products").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
      supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
      supabase.from("profiles").select("id", { count: "exact", head: true })
        .gte("created_at", fourteenDaysAgo).lt("created_at", sevenDaysAgo),
      // Platform health queries
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "seller"),
      supabase.from("profiles").select("id", { count: "exact", head: true })
        .eq("role", "seller").eq("kyc_status", "verified"),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "disputed"),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "delivered"),
      supabase.from("orders").select("id", { count: "exact", head: true }),
      // Payout SLA: orders that went from paid → payout done, fetch created_at and payout_completed_at
      supabase.from("orders").select("created_at, payout_completed_at")
        .eq("payout_status", "paid").not("payout_completed_at", "is", null).limit(100),
    ]);

    const revenue = (orders.data || []).reduce((sum: number, o: any) => sum + (o.amount || 0), 0);
    const uniqueBuyers = new Set((activeUserRows.data || []).map((r: any) => r.buyer_id)).size;
    const thisWeekUsers = usersThisWeek.count || 0;
    const priorWeekUsers = usersPriorWeek.count || 1;
    const usersDeltaPct = Math.round(((thisWeekUsers - priorWeekUsers) / priorWeekUsers) * 100);

    const totalOrd = totalOrdersResult.count || 0;
    const deliveredOrd = deliveredOrdersResult.count || 0;
    const disputedOrd = disputedOrdersResult.count || 0;
    const totalSell = totalSellersResult.count || 0;
    const verifiedSell = verifiedSellersResult.count || 0;

    // Payout SLA: avg days
    const slaRows = payoutSlaRows.data || [];
    const avgSla = slaRows.length > 0
      ? slaRows.reduce((sum: number, r: any) => {
          const diff = new Date(r.payout_completed_at).getTime() - new Date(r.created_at).getTime();
          return sum + diff / (1000 * 60 * 60 * 24);
        }, 0) / slaRows.length
      : 0;

    setStats({
      totalListings: listings.count || 0,
      activeUsers: uniqueBuyers,
      totalRevenue: revenue,
      openDisputes: tickets.count || 0,
      pendingPayouts: payouts.count || 0,
      pendingKyc: kyc.count || 0,
      totalOrders: totalOrd,
      totalSellers: totalSell,
      verifiedSellers: verifiedSell,
      disputedOrders: disputedOrd,
      deliveredOrders: deliveredOrd,
    });

    setDeltas({
      listingsDelta: newListings.count || 0,
      usersDeltaPct,
      revenueLabel: "All time",
      pendingPayoutsLabel: (payouts.count || 0) > 0 ? "Awaiting transfer" : "All clear",
    });

    setHealth({
      orderSuccessRate: totalOrd > 0 ? (deliveredOrd / totalOrd) * 100 : 0,
      kycPassRate: totalSell > 0 ? (verifiedSell / totalSell) * 100 : 0,
      disputeRate: totalOrd > 0 ? (disputedOrd / totalOrd) * 100 : 0,
      payoutSlaAvgDays: avgSla,
    });
  };

  // ── SPARKLINES ──
  const fetchSparklines = async () => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });
    const [listingRows, orderRows, userRows] = await Promise.all([
      supabase.from("products").select("created_at").gte("created_at", days[0].toISOString()),
      supabase.from("orders").select("created_at, amount, payout_status").gte("created_at", days[0].toISOString()),
      supabase.from("profiles").select("created_at").gte("created_at", days[0].toISOString()),
    ]);
    const bucket = (rows: any[]) =>
      days.map((d) => {
        const next = new Date(d); next.setDate(next.getDate() + 1);
        return rows.filter((r) => { const t = new Date(r.created_at).getTime(); return t >= d.getTime() && t < next.getTime(); }).length;
      });
    const revBucket = days.map((d) => {
      const next = new Date(d); next.setDate(next.getDate() + 1);
      return (orderRows.data || []).filter((r) => { const t = new Date(r.created_at).getTime(); return t >= d.getTime() && t < next.getTime(); })
        .reduce((sum, r: any) => sum + (r.amount || 0), 0);
    });
    const payoutBucket = days.map((d) => {
      const next = new Date(d); next.setDate(next.getDate() + 1);
      return (orderRows.data || []).filter((r) => { const t = new Date(r.created_at).getTime(); return t >= d.getTime() && t < next.getTime() && r.payout_status === "pending"; }).length;
    });
    setSparklines({
      listings: bucket(listingRows.data || []),
      users: bucket(userRows.data || []),
      revenue: revBucket,
      payouts: payoutBucket,
    });
  };

  // ── RECENT ORDERS — manual join ──
  const fetchRecentOrders = async () => {
    const { data: orderData, error: orderErr } = await supabase
      .from("orders")
      .select("id, amount, status, payout_status, created_at, buyer_id, product_id")
      .order("created_at", { ascending: false })
      .limit(5);

    if (orderErr) { console.error("orders fetch:", orderErr.message); return; }
    if (!orderData || orderData.length === 0) { setRecentOrders([]); return; }

    // Collect unique IDs for manual joins
    const buyerIds = [...new Set(orderData.map((o: any) => o.buyer_id).filter(Boolean))];
    const productIds = [...new Set(orderData.map((o: any) => o.product_id).filter(Boolean))];

    const [profileRows, productRows] = await Promise.all([
      buyerIds.length > 0
        ? supabase.from("profiles").select("id, full_name").in("id", buyerIds)
        : Promise.resolve({ data: [] }),
      productIds.length > 0
        ? supabase.from("products").select("id, title").in("id", productIds)
        : Promise.resolve({ data: [] }),
    ]);

    const profileMap: Record<string, string> = {};
    (profileRows.data || []).forEach((p: any) => { profileMap[p.id] = p.full_name; });
    const productMap: Record<string, string> = {};
    (productRows.data || []).forEach((p: any) => { productMap[p.id] = p.title; });

    setRecentOrders(
      orderData.map((o: any) => ({
        ...o,
        buyerName: profileMap[o.buyer_id] || "Unknown",
        productTitle: productMap[o.product_id] || "—",
      }))
    );
  };

  // ── SELLERS ──
  const fetchSellers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, username, phone, phone_verified, kyc_status, is_suspended, bio")
      .eq("role", "seller")
      .order("full_name", { ascending: true })
      .limit(20);
    if (error) console.error("sellers fetch:", error.message);
    if (data) setSellers(data as Seller[]);
  };

  // ── AUDIT LOGS ──
  const fetchAuditLogs = async () => {
    const { data, error } = await supabase
      .from("admin_audit_logs").select("*")
      .order("created_at", { ascending: false }).limit(5);
    if (error) console.error("audit log fetch:", error.message);
    if (data) setAuditLogs(data as AuditLog[]);
  };

  // ── SECURITY TOGGLE ──
  const handleSecurityToggle = async (key: string, value: boolean) => {
    await supabase.from("admin_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    await supabase.from("admin_audit_logs").insert({
      action: "security_setting_changed",
      target: `${key}=${value}`,
      admin_email: adminUserRef.current?.email,
    });
    fetchAuditLogs();
  };

  // ── SELLER SUSPEND / REINSTATE ──
  const handleSuspendSeller = async (sellerId: string, suspend: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_suspended: suspend }).eq("id", sellerId);
    if (error) { console.error("suspend error:", error.message); return; }
    await supabase.from("admin_audit_logs").insert({
      action: suspend ? "seller_suspended" : "seller_reinstated",
      target: sellerId,
      admin_email: adminUserRef.current?.email,
    });
    setSellers((prev) => prev.map((s) => (s.id === sellerId ? { ...s, is_suspended: suspend } : s)));
    fetchAuditLogs();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const filteredSellers = sellers.filter((s) => {
    if (sellerTab === "pending_kyc") return s.kyc_status === "pending";
    if (sellerTab === "flagged") return s.is_suspended;
    return true;
  });

  const sessionMins = Math.floor(sessionExpiry / 60);
  const sessionSecs = sessionExpiry % 60;

  if (loading) return (
    <div className="min-h-screen bg-[#F6F3EF] flex items-center justify-center">
      <p className="uppercase tracking-[0.5em] text-[10px] opacity-40 animate-pulse">Loading Console…</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#F6F3EF] flex flex-col items-center justify-center gap-4">
      <p className="uppercase tracking-[0.3em] text-[10px] text-[#A1123F]">Failed to load</p>
      <p className="text-xs opacity-40 max-w-sm text-center">{error}</p>
      <button onClick={() => { setError(null); setLoading(true); fetchAll(); }}
        className="text-[9px] uppercase tracking-[0.2em] border border-[#2B0A0F]/20 px-4 py-2 rounded-full hover:bg-[#2B0A0F]/05 transition-colors">
        Retry
      </button>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#F6F3EF] text-[#2B0A0F] flex">

      {/* ── SIDEBAR ── */}
      <AdminSidebar
        stats={stats} adminUser={adminUser} onSignOut={handleSignOut}
        sessionMins={sessionMins} sessionSecs={sessionSecs}
      />

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── TOPBAR ── */}
        <div className="border-b border-[#2B0A0F]/08 px-8 h-14 flex items-center justify-between bg-[#F6F3EF] flex-shrink-0">
          <h1 className="text-[10px] uppercase tracking-[0.3em] font-medium opacity-60">Dashboard</h1>
          <div className="flex items-center gap-3">
            <span className="text-[8px] uppercase tracking-[0.15em] opacity-25">Live · refreshes every 60s</span>
            <button onClick={() => fetchAll()} className="text-[8px] uppercase tracking-[0.15em] opacity-30 hover:opacity-70 transition-opacity">
              ↺ Refresh
            </button>
            <input
              placeholder="Search…"
              className="text-[11px] bg-[#2B0A0F]/05 border border-[#2B0A0F]/08 rounded-full px-4 py-1.5 outline-none w-48"
            />
          </div>
        </div>

        {/* ── SCROLLABLE CONTENT ── */}
        <div className="flex-1 overflow-y-auto px-8 py-8 pb-20">

          {/* ── ALERT BANNERS ── */}
          {stats.openDisputes > 0 && (
            <Link href="/admin/support">
              <div className="flex items-center gap-4 mb-4 px-5 py-4 border border-[#A1123F]/20 bg-[#A1123F]/04 rounded-xl hover:bg-[#A1123F]/08 transition-colors cursor-pointer">
                <span className="text-[#A1123F] text-[10px]">●</span>
                <p className="text-xs text-[#A1123F]/80 flex-1">
                  <strong>{stats.openDisputes} open support ticket{stats.openDisputes !== 1 ? "s" : ""}</strong>{" "}— requires your attention
                </p>
                <span className="text-[9px] uppercase tracking-[0.2em] text-[#A1123F]/60">Review →</span>
              </div>
            </Link>
          )}
          {stats.pendingKyc > 0 && (
            <div className="flex items-center gap-4 mb-4 px-5 py-4 border border-[#B48A5A]/20 bg-[#B48A5A]/04 rounded-xl">
              <span className="text-[#B48A5A] text-[10px]">●</span>
              <p className="text-xs text-[#B48A5A]/80 flex-1">
                <strong>{stats.pendingKyc} seller{stats.pendingKyc !== 1 ? "s" : ""} pending KYC</strong>{" "}— review and verify
              </p>
              <button onClick={() => setSellerTab("pending_kyc")}
                className="text-[9px] uppercase tracking-[0.2em] text-[#B48A5A]/60 hover:text-[#B48A5A] transition-colors">
                Review →
              </button>
            </div>
          )}

          {/* ── METRIC CARDS ── */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total listings", value: stats.totalListings.toLocaleString("en-IN"), sparkData: sparklines.listings,
                delta: deltas.listingsDelta > 0 ? `+${deltas.listingsDelta} this week` : "No new listings this week" },
              { label: "Active buyers", value: stats.activeUsers.toLocaleString("en-IN"), sparkData: sparklines.users,
                delta: deltas.usersDeltaPct > 0 ? `+${deltas.usersDeltaPct}% vs last week` : deltas.usersDeltaPct < 0 ? `${deltas.usersDeltaPct}% vs last week` : "Same as last week" },
              { label: "Total revenue", value: `₹${stats.totalRevenue.toLocaleString("en-IN")}`, sparkData: sparklines.revenue, delta: deltas.revenueLabel },
              { label: "Pending payouts", value: stats.pendingPayouts.toLocaleString("en-IN"), sparkData: sparklines.payouts,
                delta: deltas.pendingPayoutsLabel, warn: stats.pendingPayouts > 0 },
            ].map((card) => (
              <div key={card.label} className="bg-white border border-[#2B0A0F]/06 p-6 rounded-xl">
                <p className="text-[9px] uppercase tracking-[0.3em] opacity-40 mb-3">{card.label}</p>
                <p className="text-3xl font-light mb-1" style={{ fontFamily: "var(--font-playfair)", color: card.warn ? "#A1123F" : "#2B0A0F" }}>
                  {card.value}
                </p>
                <Sparkline data={card.sparkData} color={card.warn ? "#A1123F" : "#2B0A0F"} />
                <p className="text-[9px] opacity-30">{card.delta}</p>
              </div>
            ))}
          </div>

          {/* ── PLATFORM HEALTH + LIVE ACTIVITY ── */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <PlatformHealthCard health={health} />
            <ActivityFeed events={activityFeed} />
          </div>

          {/* ── ORDERS + SECURITY ── */}
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
                <div>
                  {recentOrders.map((order, i) => {
                    const colors = ["#6B7E60", "#B48A5A", "#185FA5", "#534AB7", "#A1123F"];
                    const color = colors[i % colors.length];
                    return (
                      <div key={order.id} className="flex items-center gap-3 py-3 border-b border-[#2B0A0F]/05 last:border-0">
                        <Avatar name={order.buyerName || "?"} color={color} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate">{order.productTitle}</p>
                          <p className="text-[9px] opacity-35 mt-0.5">
                            {order.buyerName} · #{order.id.slice(0, 8).toUpperCase()} · {timeAgo(order.created_at)}
                          </p>
                        </div>
                        <p className="text-sm font-light" style={{ fontFamily: "var(--font-playfair)" }}>
                          ₹{order.amount?.toLocaleString("en-IN")}
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
                <Link href="/admin/audit" className="text-[9px] uppercase tracking-[0.2em] opacity-30 hover:opacity-70 transition-opacity">
                  Audit log →
                </Link>
              </div>
              <SecurityToggle label="Two-factor auth (admin)" sub="Enforced for all admin accounts" defaultOn={true} settingKey="2fa_admin" onToggle={handleSecurityToggle} />
              <SecurityToggle label="Seller ID verification" sub="Aadhaar / PAN required to list" defaultOn={true} settingKey="seller_id_verification" onToggle={handleSecurityToggle} />
              <SecurityToggle label="IP allowlist for admin login" sub="Restrict access to known IPs" defaultOn={false} warn={true} settingKey="ip_allowlist" onToggle={handleSecurityToggle} />
              <SecurityToggle label="Activity audit log" sub="Every admin action is recorded" defaultOn={true} settingKey="audit_log" onToggle={handleSecurityToggle} />
              <SecurityToggle label="Auto session timeout (30 min)" sub="Idle sessions signed out automatically" defaultOn={true} settingKey="session_timeout" onToggle={handleSecurityToggle} />
              {auditLogs.length > 0 && (
                <div className="mt-5 pt-5 border-t border-[#2B0A0F]/06">
                  <p className="text-[9px] uppercase tracking-[0.25em] opacity-30 mb-3">Recent actions</p>
                  <div className="space-y-2">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="flex items-center gap-2">
                        <span className="text-[8px] opacity-25 flex-shrink-0">{timeAgo(log.created_at)}</span>
                        <span className="text-[9px] opacity-50 truncate">
                          {log.action.replace(/_/g, " ")} — {log.target?.slice(0, 8)}
                        </span>
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
              <button className="text-[9px] uppercase tracking-[0.2em] opacity-30 hover:opacity-70 transition-opacity">Export CSV →</button>
            </div>

            <div className="flex gap-1 p-1 bg-[#2B0A0F]/05 rounded-full w-fit mb-6">
              {(["all", "pending_kyc", "flagged"] as const).map((tab) => (
                <button key={tab} onClick={() => setSellerTab(tab)}
                  className={`px-4 py-1.5 rounded-full text-[8px] uppercase tracking-[0.15em] transition-all ${sellerTab === tab ? "bg-[#2B0A0F] text-[#F6F3EF]" : "opacity-40 hover:opacity-70"}`}>
                  {tab === "pending_kyc" ? "Pending KYC" : tab}
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
                      {["Seller", "Username", "Phone", "Phone Verified", "KYC", "Status", "Action"].map((h) => (
                        <th key={h} className="text-left text-[8px] uppercase tracking-[0.12em] opacity-30 pb-3 pr-4 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSellers.map((seller, i) => {
                      const colors = ["#6B7E60", "#B48A5A", "#185FA5", "#534AB7", "#A1123F"];
                      const color = colors[i % colors.length];
                      return (
                        <tr key={seller.id} className="border-b border-[#2B0A0F]/04 last:border-0 hover:bg-[#F6F3EF]/50 transition-colors">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <Avatar name={seller.full_name} color={color} />
                              <span className="text-xs">{seller.full_name}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-xs opacity-50">@{seller.username || "—"}</td>
                          <td className="py-3 pr-4 text-xs opacity-50">{seller.phone || "—"}</td>
                          <td className="py-3 pr-4">
                            {seller.phone_verified
                              ? <span className="text-[8px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-full font-medium" style={{ background: "#6B7E6018", color: "#6B7E60" }}>Yes</span>
                              : <span className="text-[8px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-full font-medium" style={{ background: "#88888818", color: "#888" }}>No</span>
                            }
                          </td>
                          <td className="py-3 pr-4"><StatusPill status={seller.kyc_status || "pending"} /></td>
                          <td className="py-3 pr-4"><StatusPill status={seller.is_suspended ? "suspended" : "active"} /></td>
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
      </div>
    </main>
  );
}