"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

/* ─────────────────────────────
   CONSTANTS
───────────────────────────── */
const STATUS_STEPS = ["pending", "paid", "shipped", "delivered"];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  pending:   { label: "Pending",   color: "#B48A5A", icon: "🕐" },
  paid:      { label: "Paid",      color: "#457B9D", icon: "💳" },
  shipped:   { label: "Shipped",   color: "#6B3FA0", icon: "📦" },
  delivered: { label: "Delivered", color: "#6B7E60", icon: "✓"  },
  cancelled: { label: "Cancelled", color: "#A1123F", icon: "✕"  },
};

const COURIERS = [
  "Delhivery", "BlueDart", "DTDC", "Ekart", "XpressBees",
  "India Post", "FedEx", "Shiprocket", "Other",
];

/* ─────────────────────────────
   TOAST
───────────────────────────── */
function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full text-[10px] uppercase tracking-[0.2em] shadow-lg whitespace-nowrap ${
        type === "success" ? "bg-[#2B0A0F] text-[#F6F3EF]" : "bg-[#A1123F] text-white"
      }`}
    >
      {message}
    </motion.div>
  );
}

/* ─────────────────────────────
   STATUS STEPPER
   — horizontal on md+, vertical on mobile
───────────────────────────── */
function StatusStepper({ currentStatus }: { currentStatus: string }) {
  const currentStep = STATUS_STEPS.indexOf(currentStatus);

  return (
    <>
      {/* MOBILE: vertical stepper */}
      <div className="flex flex-col gap-0 md:hidden">
        {STATUS_STEPS.map((step, i) => {
          const isCompleted = i < currentStep;
          const isCurrent   = i === currentStep;
          const cfg = STATUS_CONFIG[step];
          return (
            <div key={step} className="flex items-start gap-4">
              {/* dot + line */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all flex-shrink-0"
                  style={{
                    background: isCompleted || isCurrent ? cfg.color : "transparent",
                    borderColor: isCompleted || isCurrent ? cfg.color : "rgba(43,10,15,0.12)",
                  }}
                >
                  {isCompleted ? (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : isCurrent ? (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  ) : null}
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div
                    className="w-px flex-1 my-1 min-h-[20px] transition-all"
                    style={{ background: i < currentStep ? cfg.color : "rgba(43,10,15,0.08)" }}
                  />
                )}
              </div>
              {/* label */}
              <div className="pb-4">
                <p
                  className="text-[10px] uppercase tracking-[0.15em] leading-none pt-1.5"
                  style={{ color: isCompleted || isCurrent ? cfg.color : "rgba(43,10,15,0.25)" }}
                >
                  {cfg.label}
                </p>
                {isCurrent && (
                  <p className="text-[9px] opacity-40 mt-1">Current status</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* DESKTOP: horizontal stepper */}
      <div className="hidden md:flex items-center justify-between w-full">
        {STATUS_STEPS.map((step, i) => {
          const isCompleted = i < currentStep;
          const isCurrent   = i === currentStep;
          const cfg = STATUS_CONFIG[step];
          return (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all border-2"
                  style={{
                    background: isCompleted || isCurrent ? cfg.color : "transparent",
                    borderColor: isCompleted || isCurrent ? cfg.color : "rgba(43,10,15,0.12)",
                  }}
                >
                  {isCompleted ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : isCurrent ? (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  ) : null}
                </div>
                <p
                  className="text-[8px] uppercase tracking-[0.15em] text-center"
                  style={{ color: isCompleted || isCurrent ? cfg.color : "rgba(43,10,15,0.25)" }}
                >
                  {cfg.label}
                </p>
              </div>
              {i < STATUS_STEPS.length - 1 && (
                <div
                  className="flex-1 h-px mx-3 mb-5 transition-all"
                  style={{ background: i < currentStep ? STATUS_CONFIG[STATUS_STEPS[i + 1]].color : "rgba(43,10,15,0.08)" }}
                />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ─────────────────────────────
   MAIN PAGE
───────────────────────────── */
export default function OrderDetailPage() {
  const { id } = useParams();
  const router  = useRouter();

  const [order, setOrder]                   = useState<any>(null);
  const [user, setUser]                     = useState<any>(null);
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [toast, setToast]                   = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [courierName, setCourierName]       = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl]       = useState("");
  // Dispute
  const [disputeOpen, setDisputeOpen]     = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDetails, setDisputeDetails] = useState("");
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [disputeSuccess, setDisputeSuccess] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);

      const { data: orderData } = await supabase
        .from("orders")
        .select("*, products(title, image_url, price, description, condition, size)")
        .eq("id", id)
        .single();

      if (orderData) {
        setOrder(orderData);
        setCourierName(orderData.courier_name || "");
        setTrackingNumber(orderData.tracking_number || "");
        setTrackingUrl(orderData.tracking_url || "");
      }
      setLoading(false);
    };
    init();
  }, [id]);

  const isSeller = user?.id === order?.seller_id;
  const isBuyer  = user?.id === order?.buyer_id;

  /* ── UPDATE TRACKING ── */
  const handleUpdateTracking = async () => {
    if (!trackingNumber || !courierName) {
      showToast("Please enter courier name and tracking number", "error");
      return;
    }
    setSaving(true);
    const isFirstTimeShipped = order.status !== "shipped";

    const { error } = await supabase
      .from("orders")
      .update({
        courier_name: courierName,
        tracking_number: trackingNumber,
        tracking_url: trackingUrl,
        status: "shipped",
        shipped_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) { showToast("Failed to update tracking", "error"); setSaving(false); return; }

    if (isFirstTimeShipped) {
      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "order_shipped",
          to: order.buyer_email,
          data: { productTitle: order.products?.title, courierName, trackingNumber, trackingUrl, orderId: id },
        }),
      });
    }

    const { data: conversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("product_id", order.product_id)
      .eq("buyer_id", order.buyer_id)
      .maybeSingle();

    if (conversation) {
      await supabase.from("messages").insert({
        conversation_id: conversation.id,
        sender_id: user.id,
        text: `Your order has been shipped!\n\nCourier: ${courierName}\nTracking: ${trackingNumber}${trackingUrl ? `\nTrack here: ${trackingUrl}` : ""}`,
      });
    }

    setOrder({ ...order, courier_name: courierName, tracking_number: trackingNumber, tracking_url: trackingUrl, status: "shipped" });
    showToast("Tracking updated — buyer has been notified ✦");
    setSaving(false);
  };

  /* ── MARK DELIVERED ── */
  const handleMarkDelivered = async () => {
    const { error } = await supabase
      .from("orders")
      .update({ status: "delivered", delivered_at: new Date().toISOString() })
      .eq("id", id);

    if (!error) {
      setOrder({ ...order, status: "delivered" });
      showToast("Order marked as delivered ✦");
    } else {
      showToast("Failed to update status", "error");
    }
  };
  /* ── RAISE DISPUTE ── */
const handleDispute = async () => {
  if (!disputeReason) { showToast("Please select a reason", "error"); return; }
  setDisputeLoading(true);
  const { error } = await supabase.from("support_tickets").insert({
    order_id:   id,
    user_id:    user.id,
    reason:     disputeReason,
    details:    disputeDetails,
    status:     "open",
    created_at: new Date().toISOString(),
  });
  if (!error) {
    // Notify admin
    await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "admin_alert",
        to: process.env.NEXT_PUBLIC_ADMIN_EMAIL || "",
        data: {
          subject:  `Dispute raised — Order #${String(id).slice(0,8).toUpperCase()}`,
          orderId:  id,
          reason:   disputeReason,
          details:  disputeDetails,
          buyerId:  order.buyer_id,
        },
      }),
    });
    setDisputeSuccess(true);
    setTimeout(() => { setDisputeOpen(false); setDisputeSuccess(false); }, 2500);
  } else {
    showToast("Failed to submit. Please try again.", "error");
  }
  setDisputeLoading(false);
};


  /* ── LOADING / NOT FOUND ── */
  if (loading) return (
    <main className="min-h-screen bg-[#F6F3EF] flex items-center justify-center">
      <p className="text-[10px] uppercase tracking-[0.5em] opacity-30 animate-pulse"
        style={{ fontFamily: "var(--font-playfair)" }}>
        Loading Order...
      </p>
    </main>
  );

  if (!order) return (
    <main className="min-h-screen bg-[#F6F3EF] flex flex-col items-center justify-center gap-5 px-4">
      <p className="text-3xl opacity-15" style={{ fontFamily: "var(--font-playfair)" }}>Order not found.</p>
      <Link href="/orders">
        <button className="px-6 py-3 border border-[#2B0A0F]/15 rounded-full text-[10px] uppercase tracking-[0.2em] hover:bg-[#2B0A0F] hover:text-[#F6F3EF] transition-all">
          Back to Orders
        </button>
      </Link>
    </main>
  );

  const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const addr      = order.shipping_address;

  return (
    <main className="min-h-screen bg-[#F6F3EF] text-[#2B0A0F]">

      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} />}
      </AnimatePresence>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 sm:pt-28 pb-20">

        {/* Back */}
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] opacity-35 hover:opacity-80 transition-opacity mb-8 sm:mb-10"
        >
          ← Back to Orders
        </Link>

        {/* ── ORDER ID + STATUS ── */}
        <div className="flex items-start justify-between gap-3 mb-6 sm:mb-8 flex-wrap">
          <div>
            <p className="text-[9px] uppercase tracking-[0.35em] opacity-35 mb-2">Order Receipt</p>
            <h1
              className="leading-none"
              style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(1.4rem,3vw,2rem)" }}
            >
              #{order.id.slice(0, 8).toUpperCase()}
            </h1>
            <p className="text-[9px] uppercase tracking-[0.2em] opacity-30 mt-2">
              {new Date(order.created_at).toLocaleDateString("en-IN", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </p>
          </div>
          <div
            className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full border text-[9px] sm:text-[10px] uppercase tracking-[0.15em] flex-shrink-0"
            style={{
              color: statusCfg.color,
              borderColor: `${statusCfg.color}30`,
              background: `${statusCfg.color}10`,
            }}
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusCfg.color }} />
            {statusCfg.label}
          </div>
        </div>

        {/* ── PRODUCT CARD ── */}
        <div className="bg-white rounded-2xl border border-[#2B0A0F]/06 overflow-hidden mb-4 sm:mb-6">
          <div className="flex items-stretch">
            <div className="relative w-20 sm:w-24 flex-shrink-0 bg-[#EAE3DB]">
              <Image
                src={order.products?.image_url || "/final.png"}
                alt={order.products?.title}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1 p-4 sm:p-5 min-w-0">
              <p
                className="text-base font-medium mb-2 leading-snug"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                {order.products?.title}
              </p>
              <div className="flex items-center gap-2 flex-wrap mb-3">
                {order.products?.condition && (
                  <span className="text-[8px] uppercase tracking-[0.15em] px-2.5 py-1 rounded-full bg-[#2B0A0F]/05 text-[#2B0A0F]/50">
                    {order.products.condition}
                  </span>
                )}
                {order.products?.size && (
                  <span className="text-[8px] uppercase tracking-[0.15em] px-2.5 py-1 rounded-full bg-[#2B0A0F]/05 text-[#2B0A0F]/50">
                    Size {order.products.size}
                  </span>
                )}
              </div>
              <p className="text-xl text-[#A1123F]" style={{ fontFamily: "var(--font-playfair)" }}>
                ₹{order.amount?.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>

        {/* ── STATUS STEPPER ── */}
        <div className="bg-white rounded-2xl border border-[#2B0A0F]/06 p-5 sm:p-6 mb-4 sm:mb-6">
          <p className="text-[9px] uppercase tracking-[0.3em] opacity-35 mb-5 sm:mb-6">Order Progress</p>
          <StatusStepper currentStatus={order.status} />
        </div>

        {/* ── SHIPPING ADDRESS (visible to both buyer + seller) ── */}
        {addr && (
          <div className="bg-white rounded-2xl border border-[#2B0A0F]/06 p-5 sm:p-6 mb-4 sm:mb-6">
            <p className="text-[9px] uppercase tracking-[0.3em] opacity-35 mb-4">Shipping Address</p>
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{addr.fullName}</p>
              <p className="text-xs opacity-55">{addr.phone}</p>
              <p className="text-xs opacity-55 leading-relaxed mt-1">
                {addr.addressLine1}
                {addr.addressLine2 ? `, ${addr.addressLine2}` : ""}
              </p>
              <p className="text-xs opacity-55">
                {addr.city}, {addr.state} – {addr.pincode}
              </p>
            </div>
          </div>
        )}

        {/* ── TRACKING INFO (visible when shipped) ── */}
        {order.tracking_number && (
          <div className="bg-white rounded-2xl border border-[#2B0A0F]/06 p-5 sm:p-6 mb-4 sm:mb-6">
            <p className="text-[9px] uppercase tracking-[0.3em] opacity-35 mb-5">Shipment Details</p>
            <div className="space-y-0">
              {[
                { label: "Courier",      value: order.courier_name },
                { label: "Tracking No.", value: order.tracking_number, mono: true },
                ...(order.shipped_at ? [{
                  label: "Shipped On",
                  value: new Date(order.shipped_at).toLocaleDateString("en-IN", {
                    day: "numeric", month: "short", year: "numeric",
                  }),
                }] : []),
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center py-2.5 border-b border-[#2B0A0F]/05 last:border-0">
                  <span className="text-[9px] uppercase tracking-[0.2em] opacity-40">{row.label}</span>
                  <span className={`text-sm font-medium ${(row as any).mono ? "font-mono text-xs" : ""}`}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
            {order.tracking_url && (
              <a
                href={order.tracking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-full border border-[#2B0A0F]/15 text-[10px] uppercase tracking-[0.2em] hover:bg-[#2B0A0F] hover:text-[#F6F3EF] hover:border-[#2B0A0F] transition-all"
              >
                Track Package →
              </a>
            )}
          </div>
        )}

        {/* ── SELLER: ADD / UPDATE TRACKING ── */}
        {isSeller && order.status !== "delivered" && order.status !== "cancelled" && (
          <div className="bg-white rounded-2xl border border-[#2B0A0F]/06 p-5 sm:p-6 mb-4 sm:mb-6">
            <p className="text-[9px] uppercase tracking-[0.3em] opacity-35 mb-5 sm:mb-6">
              {order.status === "shipped" ? "Update Shipment" : "Mark as Shipped"}
            </p>

            <div className="space-y-5">
              {/* Courier */}
              <div className="border-b border-[#2B0A0F]/10 focus-within:border-[#2B0A0F]/40 transition-colors">
                <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-2">
                  Courier Service *
                </label>
                <div className="relative">
                  <select
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    className="w-full bg-transparent pb-3 outline-none text-base appearance-none cursor-pointer pr-5"
                  >
                    <option value="">Select courier...</option>
                    {COURIERS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <svg className="absolute right-0 bottom-4 pointer-events-none opacity-30" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </div>

              {/* Tracking number */}
              <div className="border-b border-[#2B0A0F]/10 focus-within:border-[#2B0A0F]/40 transition-colors">
                <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-2">
                  Tracking Number *
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. DEL1234567890"
                  className="w-full bg-transparent pb-3 outline-none text-base placeholder:opacity-20 font-mono"
                />
              </div>

              {/* Tracking URL */}
              <div className="border-b border-[#2B0A0F]/10 focus-within:border-[#2B0A0F]/40 transition-colors">
                <label className="text-[8px] uppercase tracking-[0.25em] opacity-40 block mb-2">
                  Tracking URL <span className="opacity-50">(optional)</span>
                </label>
                <input
                  type="url"
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-transparent pb-3 outline-none text-base placeholder:opacity-20"
                />
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-1">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleUpdateTracking}
                  disabled={saving}
                  className="w-full py-4 bg-[#2B0A0F] text-[#F6F3EF] rounded-full text-[10px] uppercase tracking-[0.25em] hover:opacity-80 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
                      </svg>
                      Saving...
                    </>
                  ) : order.status === "shipped" ? "Update Tracking" : "Mark as Shipped →"}
                </motion.button>

                {order.status === "shipped" && (
                  <button
                    onClick={handleMarkDelivered}
                    className="w-full py-3.5 rounded-full border border-[#6B7E60]/30 text-[#6B7E60] text-[10px] uppercase tracking-[0.2em] hover:bg-[#6B7E60]/08 transition-all"
                  >
                    Confirm Delivered ✓
                  </button>
                )}

                <Link href={`/orders/${id}/label`} target="_blank" className="block">
                  <button className="w-full py-3.5 rounded-full border border-[#2B0A0F]/15 text-[10px] uppercase tracking-[0.2em] hover:bg-[#2B0A0F] hover:text-[#F6F3EF] transition-all">
                    Print Shipping Label →
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── BUYER: DISPUTE / HELP ── */}
{isBuyer && order.status !== "delivered" && order.status !== "cancelled" && (
  <div className="bg-white rounded-2xl border border-[#2B0A0F]/06 p-5 sm:p-6">
    <p className="text-[9px] uppercase tracking-[0.3em] opacity-35 mb-3">Need Help?</p>
    <p className="text-sm opacity-50 mb-4 leading-relaxed">
      Have a question or issue with your order?
    </p>
    <div className="flex flex-col gap-3">
      <Link href="/messages">
        <button className="w-full py-3.5 rounded-full border border-[#2B0A0F]/15 text-[10px] uppercase tracking-[0.2em] hover:bg-[#2B0A0F] hover:text-[#F6F3EF] transition-all">
          Message Seller →
        </button>
      </Link>
      <button
        onClick={() => setDisputeOpen(true)}
        className="w-full py-3.5 rounded-full border border-[#A1123F]/30 text-[#A1123F] text-[10px] uppercase tracking-[0.2em] hover:bg-[#A1123F] hover:text-white transition-all"
      >
        Raise a Dispute
      </button>
    </div>
  </div>
)}

{/* ── DISPUTE MODAL ── */}
<AnimatePresence>
  {disputeOpen && (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
        onClick={() => !disputeLoading && setDisputeOpen(false)}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[#F6F3EF] rounded-2xl p-6 sm:p-8 w-[calc(100vw-2rem)] sm:w-[400px] shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        {disputeSuccess ? (
          <div className="text-center py-6">
            <p className="text-3xl mb-3">✦</p>
            <p className="text-lg mb-2" style={{ fontFamily: "var(--font-playfair)" }}>Dispute Raised</p>
            <p className="text-[10px] uppercase tracking-widest opacity-40">
              We'll review your case and get back to you within 24 hours.
            </p>
          </div>
        ) : (
          <>
            <h3 className="text-xl mb-1" style={{ fontFamily: "var(--font-playfair)" }}>Raise a Dispute</h3>
            <p className="text-[9px] uppercase tracking-[0.25em] opacity-40 mb-6">
              Order #{String(id).slice(0, 8).toUpperCase()}
            </p>

            <div className="space-y-3 mb-5">
              {[
                { value: "not_received",    label: "Item not received" },
                { value: "not_as_described", label: "Item not as described" },
                { value: "damaged",         label: "Item arrived damaged" },
                { value: "wrong_item",      label: "Wrong item sent" },
                { value: "other",           label: "Other issue" },
              ].map((reason) => (
                <button
                  key={reason.value}
                  onClick={() => setDisputeReason(reason.value)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all ${
                    disputeReason === reason.value
                      ? "bg-[#A1123F] text-white"
                      : "border border-[#2B0A0F]/10 hover:border-[#2B0A0F]/30"
                  }`}
                >
                  {reason.label}
                </button>
              ))}
            </div>

            <div className="border-b border-[#2B0A0F]/10 pb-2 mb-5">
              <label className="text-[8px] uppercase tracking-[0.2em] opacity-40 block mb-2">
                Additional Details (optional)
              </label>
              <textarea
                value={disputeDetails}
                onChange={(e) => setDisputeDetails(e.target.value)}
                placeholder="Describe the issue in detail..."
                rows={3}
                className="w-full bg-transparent text-sm outline-none placeholder:opacity-20 resize-none"
              />
            </div>

            <p className="text-[9px] opacity-30 mb-5 leading-relaxed">
              🔒 Our team will review this within 24 hours and reach out via email.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDisputeOpen(false)}
                disabled={disputeLoading}
                className="flex-1 py-3.5 rounded-full border border-[#2B0A0F]/15 text-[10px] uppercase tracking-[0.2em] hover:opacity-60 transition-opacity disabled:opacity-30"
              >
                Cancel
              </button>
              <button
                onClick={handleDispute}
                disabled={disputeLoading || !disputeReason}
                className="flex-1 py-3.5 rounded-full bg-[#A1123F] text-white text-[10px] uppercase tracking-[0.2em] hover:opacity-80 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {disputeLoading ? (
                  <>
                    <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
                    </svg>
                    Submitting...
                  </>
                ) : "Submit Dispute"}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </>
  )}
</AnimatePresence>

         

        {/* ── DELIVERED STATE ── */}
        {order.status === "delivered" && (
          <div className="bg-[#6B7E60]/08 rounded-2xl border border-[#6B7E60]/20 p-6 text-center">
            <p className="text-[#6B7E60] text-[9px] uppercase tracking-[0.3em] mb-2">✦ Delivered</p>
            <p className="text-sm opacity-60">
              {isBuyer ? "Your piece has arrived. Enjoy it." : "This order has been delivered."}
            </p>
            {isBuyer && (
              <Link href="/buy" className="mt-4 inline-block">
                <button className="px-6 py-2.5 rounded-full border border-[#6B7E60]/30 text-[#6B7E60] text-[9px] uppercase tracking-[0.2em] hover:bg-[#6B7E60]/10 transition-all">
                  Browse More →
                </button>
              </Link>
            )}
          </div>
        )}

      </div>
    </main>
  );
}