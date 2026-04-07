"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

export default function SellerEarningsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [totalEarnings, setTotalEarnings] = useState(0);
  const [pending, setPending] = useState(0);
  const [released, setReleased] = useState(0);

  const [chartData, setChartData] = useState<any[]>([]);
  const [filter, setFilter] = useState(30);

  const [animatedTotal, setAnimatedTotal] = useState(0);
  const [animatedPending, setAnimatedPending] = useState(0);
  const [animatedReleased, setAnimatedReleased] = useState(0);

  useEffect(() => {
    fetchEarnings();
  }, [filter]);

  /* 💰 FORMAT ₹ */
  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat("en-IN").format(num);
  };

  /* 🎯 ANIMATE COUNTER */
  const animateValue = (setter: any, value: number) => {
    let start = 0;
    const duration = 800;
    const stepTime = 20;
    const increment = value / (duration / stepTime);

    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setter(value);
        clearInterval(timer);
      } else {
        setter(Math.floor(start));
      }
    }, stepTime);
  };

  const fetchEarnings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("seller_id", user.id);

    if (data) {
      setOrders(data);

      let total = 0;
      let pendingAmt = 0;
      let releasedAmt = 0;

      const grouped: any = {};
      const now = new Date();

      data.forEach((order) => {
        const payout = order.payout_amount || 0;
        const orderDate = new Date(order.created_at);

        const diffDays = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);

        if (diffDays <= filter) {
          total += payout;

          if (order.payout_status === "pending") pendingAmt += payout;
          if (order.payout_status === "released") releasedAmt += payout;

          if (order.status === "delivered") {
            const date = orderDate.toLocaleDateString();

            if (!grouped[date]) grouped[date] = 0;
            grouped[date] += payout;
          }
        }
      });

      const formatted = Object.keys(grouped).map((date) => ({
        date,
        earnings: grouped[date],
      }));

      setChartData(formatted);

      setTotalEarnings(total);
      setPending(pendingAmt);
      setReleased(releasedAmt);

      animateValue(setAnimatedTotal, total);
      animateValue(setAnimatedPending, pendingAmt);
      animateValue(setAnimatedReleased, releasedAmt);
    }

    setLoading(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="animate-pulse text-sm opacity-50">Loading earnings...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F6F3EF] pt-28 px-10 pb-10">

      {/* HEADER */}
      <div className="mb-10 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
            <span className="text-2xl">💰</span>
            Earnings Dashboard
          </h1>
          <p className="text-sm text-black/50 mt-1">
            Track your sales, payouts, and performance
          </p>
        </div>

        {/* FILTER BUTTONS */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter(7)}
            className={`px-4 py-1 rounded-full text-xs border ${
              filter === 7 ? "bg-black text-white" : "bg-white"
            }`}
          >
            7D
          </button>
          <button
            onClick={() => setFilter(30)}
            className={`px-4 py-1 rounded-full text-xs border ${
              filter === 30 ? "bg-black text-white" : "bg-white"
            }`}
          >
            30D
          </button>
        </div>
      </div>

      {/* 📊 GRAPH */}
      <div className="bg-white border border-black/5 p-6 mb-10 rounded-2xl shadow-sm">
        <p className="text-sm mb-4 font-medium text-black/60">
          Earnings Over Time
        </p>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(val:any)=>`₹${formatCurrency(val)}`} />
              
              <Line
                type="monotone"
                dataKey="earnings"
                stroke="#B48A5A"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 🎨 SUMMARY CARDS */}
      <div className="grid md:grid-cols-3 gap-6 mb-10">

        <div className="p-6 rounded-2xl bg-gradient-to-br from-black to-gray-800 text-white shadow-lg">
          <p className="text-xs opacity-70">Total Earnings</p>
          <p className="text-2xl font-bold mt-2">
            ₹{formatCurrency(animatedTotal)}
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-yellow-50 border shadow-sm">
          <p className="text-xs opacity-60">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 mt-2">
            ₹{formatCurrency(animatedPending)}
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-green-50 border shadow-sm">
          <p className="text-xs opacity-60">Received</p>
          <p className="text-2xl font-bold text-green-600 mt-2">
            ₹{formatCurrency(animatedReleased)}
          </p>
        </div>

      </div>

      {/* 📦 ORDER LIST */}
      <div className="bg-white border p-6 rounded-2xl shadow-sm">
        <h2 className="mb-6 font-medium text-lg">Earnings Breakdown</h2>

        {orders.map((order) => (
          <div key={order.id} className="flex justify-between border-b py-4 text-sm">

            <div>
              <p className="font-medium">Order #{order.id.slice(0, 6)}</p>
              <p className="opacity-40 text-xs">
                {new Date(order.created_at).toLocaleDateString()}
              </p>
            </div>

            <div className="text-right">
              <p className="font-semibold">
                ₹{formatCurrency(order.payout_amount)}
              </p>
              <p className={`text-xs mt-1 ${
                order.payout_status === "released"
                  ? "text-green-600"
                  : "text-yellow-600"
              }`}>
                {order.payout_status}
              </p>
            </div>

          </div>
        ))}

      </div>

    </div>
  );
}