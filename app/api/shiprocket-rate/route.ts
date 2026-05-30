import { NextRequest, NextResponse } from "next/server";

// Cache token in memory (reuse until expiry)
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

async function getShiprocketToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const res = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD,
    }),
  });

  const data = await res.json();
  if (!data.token) throw new Error("Shiprocket auth failed");

  cachedToken = data.token;
  tokenExpiry = Date.now() + 23 * 60 * 60 * 1000; // 23 hours
  return cachedToken as string;
}

export async function POST(req: NextRequest) {
  try {
    const { pickup_pincode, delivery_pincode, weight } = await req.json();

    // Validate inputs
    if (!pickup_pincode || !delivery_pincode || !weight) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (!/^\d{6}$/.test(pickup_pincode) || !/^\d{6}$/.test(delivery_pincode)) {
      return NextResponse.json({ error: "Invalid pincode" }, { status: 400 });
    }

    const token = await getShiprocketToken();

    const params = new URLSearchParams({
      pickup_postcode: pickup_pincode,
      delivery_postcode: delivery_pincode,
      weight: weight.toString(),
      cod: "0",
    });

    const rateRes = await fetch(
      `https://apiv2.shiprocket.in/v1/external/courier/serviceability/?${params}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const rateData = await rateRes.json();

    if (!rateData.data?.available_courier_companies?.length) {
      return NextResponse.json({ error: "No couriers available for this route" }, { status: 404 });
    }

    // Find cheapest courier
    const couriers = rateData.data.available_courier_companies;
    const cheapest = couriers.reduce((min: any, c: any) =>
      c.freight_charge < min.freight_charge ? c : min
    );

    // Add 20% buffer so seller price covers cost
    const suggestedPrice = Math.ceil((cheapest.freight_charge * 1.2) / 10) * 10;

    return NextResponse.json({
      suggested_price: suggestedPrice,
      min_price: Math.ceil(cheapest.freight_charge),
      courier_name: cheapest.courier_name,
      estimated_days: cheapest.estimated_delivery_days,
    });
  } catch (err: any) {
    console.error("Shiprocket rate error:", err);
    return NextResponse.json({ error: "Failed to fetch shipping rate" }, { status: 500 });
  }
}