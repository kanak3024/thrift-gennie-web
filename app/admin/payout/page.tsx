"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function AdminPayoutsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "paid">("pending");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        products (title, image_url, price),
        profiles!orders_seller_id_fkey (
          full_name,
          bank_account_name,
          bank_account_number,
          bank_ifsc,
          bank_upi
        )
      `)
      .order("created_at", { ascending: false });

    if (!error && data) setOrders(data);
    setLoading(false);
  };

  const handleMarkPaid = async (orderId: string) => {
    const { error } = await supabase
      .from("orders")
      .update({
        payout_status: "paid",
        payout_date: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (!error) {
      setOrders(prev =>
        prev.map(o => o.id === orderId
          ? { ...o, payout_status: "paid", payout_date: new Date().toISOString() }
          : o
        )
      );
    }
  };

  const pendingOrders = orders.filter(o => 
  o.payout_status === "pending" && 
  (o.status === "payment_held" || o.status === "released")
);
  const paidOrders = orders.filter(o => o.payout_status === "paid");
  const displayOrders = activeTab === "pending" ? pendingOrders : paidOrders;

 const totalPending = pendingOrders.reduce((sum, o) => sum + Number(o.amount), 0);
  if (loading) return (
    <div className="min-h-screen bg-[#F6F3EF] flex items-center justify-center">
      <p className="uppercase tracking-[0.5em] text-[10px] opacity-40 animate-pulse">Loading Payouts...</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#F6F3EF] pt-40 pb-20 px-6 text-[#2B0A0F]">
      <div className="max-w-4xl mx-auto">

        {/* HEADER */}
        <div className="mb-12">
          <p className="text-[10px] uppercase tracking-widest opacity-40 mb-2">Admin</p>
          <h1 className="text-4xl mb-2" style={{ fontFamily: "var(--font-playfair)" }}>
            Payout Dashboard
          </h1>
          <p className="text-[10px] uppercase tracking-[0.3em] opacity-50">
            Manage seller payouts manually
          </p>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-3 gap-4 mb-12">
          <div className="bg-white border border-black/5 p-6">
            <p className="text-[9px] uppercase tracking-widest opacity-40 mb-2">Pending Payouts</p>
            <p className="text-2xl font-light">₹{totalPending.toLocaleString()}</p>
            <p className="text-[9px] opacity-40 mt-1">{pendingOrders.length} orders</p>
          </div>
          <div className="bg-white border border-black/5 p-6">
            <p className="text-[9px] uppercase tracking-widest opacity-40 mb-2">Total Paid Out</p>
            <p className="text-2xl font-light">
              ₹{paidOrders.reduce((sum, o) => sum + o.amount, 0).toLocaleString()}
            </p>
            <p className="text-[9px] opacity-40 mt-1">{paidOrders.length} orders</p>
          </div>
          <div className="bg-white border border-black/5 p-6">
            <p className="text-[9px] uppercase tracking-widest opacity-40 mb-2">Platform Fee</p>
            <p className="text-2xl font-light">₹0</p>
            <p className="text-[9px] opacity-40 mt-1">0% for now</p>
          </div>
        </div>

        {/* TABS */}
        <div className="border-t border-black/10 pt-4 mb-10">
          <div className="flex gap-12">
            <button
              onClick={() => setActiveTab("pending")}
              className={`text-[10px] uppercase tracking-[0.4em] font-bold pt-4 transition-all ${
                activeTab === "pending" ? "border-t-2 border-[#2B0A0F] opacity-100" : "opacity-30 hover:opacity-60"
              }`}
            >
              Pending — {pendingOrders.length}
            </button>
            <button
              onClick={() => setActiveTab("paid")}
              className={`text-[10px] uppercase tracking-[0.4em] font-bold pt-4 transition-all ${
                activeTab === "paid" ? "border-t-2 border-[#2B0A0F] opacity-100" : "opacity-30 hover:opacity-60"
              }`}
            >
              Paid — {paidOrders.length}
            </button>
          </div>
        </div>

        {/* ORDERS LIST */}
        {displayOrders.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-black/10">
            <p className="text-sm italic opacity-40">
              {activeTab === "pending" ? "No pending payouts 🎉" : "No payouts made yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayOrders.map((order) => {
              const seller = order.profiles;
              const hasBankDetails = seller?.bank_account_number || seller?.bank_upi;

              return (
                <div key={order.id} className="bg-white border border-black/5 p-6">
                  <div className="flex items-start justify-between gap-6">

                    {/* ORDER INFO */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <p className="text-[9px] uppercase tracking-widest opacity-40">
                          Order #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                        <span className={`text-[8px] uppercase tracking-widest px-2 py-0.5 ${
                          order.payout_status === "paid"
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-amber-50 text-amber-600"
                        }`}>
                          {order.payout_status === "paid" ? "Paid Out" : "Pending"}
                        </span>
                      </div>

                      <p className="text-sm font-medium mb-1">{order.products?.title}</p>
                      <p className="text-xl font-light mb-4">₹{order.amount?.toLocaleString()}</p>

                      {/* SELLER BANK DETAILS */}
                      <div className="bg-[#F6F3EF] p-4 space-y-1">
                        <p className="text-[9px] uppercase tracking-widest opacity-40 mb-2">Seller Payout Details</p>

                        {seller?.full_name && (
                          <p className="text-xs"><span className="opacity-50">Seller:</span> {seller.full_name}</p>
                        )}

                        {hasBankDetails ? (
                          <>
                            {seller?.bank_account_name && (
                              <p className="text-xs"><span className="opacity-50">Account Name:</span> {seller.bank_account_name}</p>
                            )}
                            {seller?.bank_account_number && (
                              <p className="text-xs"><span className="opacity-50">Account No:</span> {seller.bank_account_number}</p>
                            )}
                            {seller?.bank_ifsc && (
                              <p className="text-xs"><span className="opacity-50">IFSC:</span> {seller.bank_ifsc}</p>
                            )}
                            {seller?.bank_upi && (
                              <p className="text-xs"><span className="opacity-50">UPI:</span> {seller.bank_upi}</p>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-amber-600">⚠️ Seller hasn't added bank details yet</p>
                        )}

                        <p className="text-[9px] opacity-40 mt-2">
                          Ordered: {new Date(order.created_at).toLocaleDateString("en-IN", {
                            day: "numeric", month: "long", year: "numeric"
                          })}
                        </p>

                        {order.payout_date && (
                          <p className="text-[9px] text-emerald-600">
                            Paid out: {new Date(order.payout_date).toLocaleDateString("en-IN", {
                              day: "numeric", month: "long", year: "numeric"
                            })}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* ACTION */}
                    {activeTab === "pending" && (
                      <div className="flex flex-col gap-3 flex-shrink-0">
                        {hasBankDetails && (

                            <a
                          
                            href={seller?.bank_upi
                              ? `upi://pay?pa=${seller.bank_upi}&am=${order.amount}&cu=INR`
                              : "#"
                            }
                            className="text-center text-[9px] uppercase tracking-widest border border-[#2B0A0F] px-4 py-2 hover:bg-[#2B0A0F] hover:text-white transition-all"
                          >
                            Pay via UPI
                          </a>
                        )}
                        <button
                          onClick={() => handleMarkPaid(order.id)}
                          className="text-[9px] uppercase tracking-widest bg-emerald-600 text-white px-4 py-2 hover:bg-emerald-700 transition-all"
                        >
                          ✓ Mark as Paid
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </main>
  );
}