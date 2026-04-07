"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

/* ─────────────────────────────
   STATUS CONFIG
───────────────────────────── */
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  pending:   { label: "Pending",   bg: "#B48A5A/10", text: "#B48A5A", dot: "#B48A5A" },
  paid:      { label: "Paid",      bg: "#457B9D/10", text: "#457B9D", dot: "#457B9D" },
  shipped:   { label: "Shipped",   bg: "#6B3FA0/10", text: "#6B3FA0", dot: "#6B3FA0" },
  delivered: { label: "Delivered", bg: "#6B7E60/10", text: "#6B7E60", dot: "#6B7E60" },
  cancelled: { label: "Cancelled", bg: "#A1123F/10", text: "#A1123F", dot: "#A1123F" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, text: "#888", dot: "#888" };
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[8px] uppercase tracking-[0.2em] px-2.5 py-1 rounded-full"
      style={{ color: cfg.text, background: `${cfg.dot}15`, border: `1px solid ${cfg.dot}25` }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

function OrderSkeleton() {
  return (
    <div className="space-y-3">
      {[1,2,3].map(i => (
        <div key={i} className="flex gap-5 p-5 bg-white rounded-2xl border border-[#2B0A0F]/05 animate-pulse">
          <div className="w-16 h-20 bg-[#EAE3DB] rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-3 py-1">
            <div className="h-3 bg-[#EAE3DB] rounded-full w-1/2" />
            <div className="h-3 bg-[#EAE3DB] rounded-full w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function OrdersPage() {
  const router = useRouter();
  const [user, setUser]                   = useState<any>(null);
  const [sellingOrders, setSellingOrders] = useState<any[]>([]);
  const [buyingOrders, setBuyingOrders]   = useState<any[]>([]);
  const [activeTab, setActiveTab]         = useState<"selling" | "buying">("selling");
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);

      const { data: selling } = await supabase
        .from("orders")
        .select("*, products(title, image_url, price)")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });
      setSellingOrders(selling || []);

      const { data: buying } = await supabase
        .from("orders")
        .select("*, products(title, image_url, price)")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });
      setBuyingOrders(buying || []);

      setLoading(false);
    };
    init();
  }, []);

  const orders = activeTab === "selling" ? sellingOrders : buyingOrders;

  return (
    <main className="min-h-screen bg-[#F6F3EF] text-[#2B0A0F]">
      <div className="max-w-4xl mx-auto px-6 pt-28 pb-20">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-[0.4em] opacity-35 mb-3">Your Activity</p>
              <h1
                className="leading-none"
                style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(2.5rem,5vw,3.5rem)" }}
              >
                Orders
              </h1>
            </div>
            {/* Summary pills */}
            <div className="flex gap-2">
              {sellingOrders.filter(o => o.status === "paid").length > 0 && (
                <div className="flex items-center gap-2 bg-[#2B0A0F] text-[#F6F3EF] rounded-full px-4 py-2">
                  <span className="relative flex h-[6px] w-[6px]">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B48A5A] opacity-70" />
                    <span className="relative inline-flex rounded-full h-[6px] w-[6px] bg-[#B48A5A]" />
                  </span>
                  <span className="text-[10px] tracking-[0.15em] uppercase text-[#B48A5A]">
                    {sellingOrders.filter(o => o.status === "paid").length} awaiting shipment
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[#2B0A0F]/08 mb-8">
          {(["selling", "buying"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-5 py-3 text-[10px] uppercase tracking-[0.25em] transition-colors ${
                activeTab === tab ? "text-[#2B0A0F]" : "text-[#2B0A0F]/35 hover:text-[#2B0A0F]/65"
              }`}
            >
              {tab === "selling" ? "I'm Selling" : "I'm Buying"}
              <span className="ml-1.5 opacity-40">
                {tab === "selling" ? sellingOrders.length : buyingOrders.length}
              </span>
              {activeTab === tab && (
                <motion.div
                  layoutId="orders-tab-line"
                  className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#2B0A0F]"
                />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <OrderSkeleton />
        ) : orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-24 text-center border border-dashed border-[#2B0A0F]/10 rounded-2xl"
          >
            <p
              className="text-2xl opacity-15 mb-3"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              {activeTab === "selling" ? "No orders yet." : "Nothing purchased yet."}
            </p>
            <p className="text-[9px] uppercase tracking-[0.3em] opacity-25 mb-8">
              {activeTab === "selling"
                ? "When someone buys your piece, it'll appear here."
                : "Pieces you buy will appear here."}
            </p>
            <Link href="/buy">
              <button className="px-6 py-3 border border-[#2B0A0F]/15 rounded-full text-[10px] uppercase tracking-[0.2em] hover:bg-[#2B0A0F] hover:text-[#F6F3EF] transition-all">
                Browse the Archive →
              </button>
            </Link>
          </motion.div>
        ) : (
          <AnimatePresence>
            <div className="space-y-3">
              {orders.map((order, i) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link href={`/orders/${order.id}`}>
                    <div className="flex items-stretch gap-0 bg-white rounded-2xl border border-[#2B0A0F]/06 hover:border-[#2B0A0F]/20 transition-all group overflow-hidden">

                      {/* Image */}
                      <div className="relative w-[72px] flex-shrink-0 bg-[#EAE3DB]">
                        <Image
                          src={order.products?.image_url || "/final.png"}
                          alt={order.products?.title || "Product"}
                          fill
                          className="object-cover"
                        />
                      </div>

                      {/* Details */}
                      <div className="flex-1 px-5 py-4 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-1.5">
                          <p className="text-sm font-medium truncate">{order.products?.title}</p>
                          <span className="text-[9px] uppercase tracking-widest opacity-30 flex-shrink-0 mt-0.5">
                            {new Date(order.created_at).toLocaleDateString("en-IN", {
                              day: "numeric", month: "short"
                            })}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                          <span
                            className="text-sm"
                            style={{ fontFamily: "var(--font-playfair)" }}
                          >
                            ₹{order.amount?.toLocaleString("en-IN")}
                          </span>
                          <span className="w-px h-3 bg-[#2B0A0F]/12" />
                          <StatusBadge status={order.status} />
                          {order.tracking_number && (
                            <>
                              <span className="w-px h-3 bg-[#2B0A0F]/12" />
                              <span className="text-[9px] uppercase tracking-[0.12em] opacity-40">
                                {order.courier_name} · {order.tracking_number}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Action hint for seller */}
                        {activeTab === "selling" && order.status === "paid" && (
                          <p className="text-[9px] uppercase tracking-[0.15em] text-[#B48A5A] mt-2">
                            ✦ Add tracking to ship →
                          </p>
                        )}
                      </div>

                      {/* Arrow */}
                      <div className="flex items-center pr-5 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                        <span className="text-base opacity-30">→</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </main>
  );
}
