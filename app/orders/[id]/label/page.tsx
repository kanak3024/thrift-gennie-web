"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

export default function ShippingLabelPage() {
  const { id } = useParams();
  const router  = useRouter();
  const [order, setOrder]     = useState<any>(null);
  const [seller, setSeller]   = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: orderData } = await supabase
        .from("orders")
        .select("*, products(title, image_url)")
        .eq("id", id)
        .single();

      if (!orderData || user.id !== orderData.seller_id) {
        router.push(`/orders/${id}`);
        return;
      }

      setOrder(orderData);

      const { data: sellerData } = await supabase
        .from("profiles")
        .select("full_name, phone, address_line, city, state, pincode")
        .eq("id", orderData.seller_id)
        .single();

      if (sellerData) setSeller(sellerData);
      setLoading(false);
    };
    init();
  }, [id]);

  if (loading) return (
    <main className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-[10px] uppercase tracking-widest opacity-30 animate-pulse">Loading label...</p>
    </main>
  );

  if (!order) return null;

  const addr = order.shipping_address;
  const shortId = order.id.slice(0, 8).toUpperCase();

  return (
    <>
      {/* Print button — hidden when printing */}
      <div className="print:hidden fixed top-4 right-4 z-50 flex gap-3">
        <button
          onClick={() => window.print()}
          className="px-5 py-2.5 bg-[#2B0A0F] text-[#F6F3EF] rounded-full text-[10px] uppercase tracking-[0.2em] hover:opacity-80 transition-opacity"
        >
          Print Label
        </button>
        <button
          onClick={() => router.push(`/orders/${id}`)}
          className="px-5 py-2.5 border border-[#2B0A0F]/20 rounded-full text-[10px] uppercase tracking-[0.2em] hover:opacity-60 transition-opacity"
        >
          ← Back
        </button>
      </div>

      {/* Label — this is what gets printed */}
      <main className="min-h-screen bg-[#f5f5f5] print:bg-white flex items-center justify-center p-8 print:p-0">
        <div
          className="bg-white w-[148mm] print:w-full print:shadow-none shadow-2xl"
          style={{ fontFamily: "serif" }}
        >
          {/* Top bar */}
          <div className="bg-[#2B0A0F] text-[#F6F3EF] px-6 py-3 flex items-center justify-between">
            <span style={{ fontFamily: "serif", fontSize: "14px", letterSpacing: "0.15em" }}>
              THRIFT GENNIE
            </span>
            <span style={{ fontSize: "10px", opacity: 0.6, letterSpacing: "0.1em" }}>
              SHIPPING LABEL
            </span>
          </div>

          <div className="p-6 space-y-5">

            {/* Order ID + barcode row */}
            <div className="flex items-start justify-between border-b border-black/10 pb-4">
              <div>
                <p style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.3em", opacity: 0.4 }}>
                  Order ID
                </p>
                <p style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "0.1em", marginTop: "2px" }}>
                  #{shortId}
                </p>
                <p style={{ fontSize: "9px", opacity: 0.4, marginTop: "4px" }}>
                  {new Date(order.created_at).toLocaleDateString("en-IN", {
                    day: "numeric", month: "long", year: "numeric"
                  })}
                </p>
              </div>
              {/* Simple visual barcode placeholder using CSS stripes */}
              <div style={{ display: "flex", gap: "2px", alignItems: "flex-end", height: "40px" }}>
                {shortId.split("").map((_char: string, i: number) => (
                  <div
                    key={i}
                    style={{
                      width: i % 3 === 0 ? "3px" : "1.5px",
                      height: i % 2 === 0 ? "40px" : "28px",
                      background: "#2B0A0F",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* TO: Buyer address */}
            <div className="border-2 border-black/80 p-4 rounded">
              <p style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.3em", opacity: 0.5, marginBottom: "8px" }}>
                Ship To
              </p>
              <p style={{ fontSize: "16px", fontWeight: 700, marginBottom: "4px" }}>
                {addr?.fullName || "—"}
              </p>
              <p style={{ fontSize: "12px", lineHeight: 1.6, color: "#333" }}>
                {addr?.addressLine}
              </p>
              <p style={{ fontSize: "12px", lineHeight: 1.6, color: "#333" }}>
                {addr?.city}, {addr?.state} — {addr?.pincode}
              </p>
              <p style={{ fontSize: "12px", marginTop: "6px", fontWeight: 600 }}>
                📞 {addr?.phone}
              </p>
            </div>

            {/* FROM: Seller address */}
            <div className="border border-black/20 p-4 rounded">
              <p style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.3em", opacity: 0.5, marginBottom: "8px" }}>
                Return Address (From)
              </p>
              <p style={{ fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                {seller?.full_name || "Seller"}
              </p>
              {seller?.address_line ? (
                <>
                  <p style={{ fontSize: "11px", lineHeight: 1.6, color: "#555" }}>
                    {seller.address_line}
                  </p>
                  <p style={{ fontSize: "11px", color: "#555" }}>
                    {seller.city}, {seller.state} — {seller.pincode}
                  </p>
                  {seller.phone && (
                    <p style={{ fontSize: "11px", marginTop: "4px" }}>📞 {seller.phone}</p>
                  )}
                </>
              ) : (
                <p style={{ fontSize: "11px", color: "#999", fontStyle: "italic" }}>
                  Add your address in profile settings to show return address
                </p>
              )}
            </div>

            {/* Item */}
            <div className="border-t border-black/10 pt-4">
              <p style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.3em", opacity: 0.4, marginBottom: "6px" }}>
                Contents
              </p>
              <p style={{ fontSize: "12px", fontWeight: 600 }}>{order.products?.title}</p>
              <p style={{ fontSize: "11px", opacity: 0.5, marginTop: "2px" }}>
                Pre-loved fashion item · Handle with care
              </p>
            </div>

            {/* Footer */}
            <div className="border-t border-black/10 pt-3 flex items-center justify-between">
              <p style={{ fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.3 }}>
                thriftgennie.com
              </p>
              <p style={{ fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.3 }}>
                Pre-loved Collective
              </p>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @media print {
          @page { margin: 0; size: A5; }
          body { margin: 0; }
        }
      `}</style>
    </>
  );
}