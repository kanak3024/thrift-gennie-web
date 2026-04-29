// app/page.tsx — NO "use client" here
import { createClient } from "@supabase/supabase-js";
import HomePageClient from "./components/HomePageClient";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function HomePage() {
  // This runs on the SERVER before the page loads
  const [{ data: products }, { data: priceData }] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("products")
      .select("price, location"),
  ]);

  const prices = (priceData ?? []).map((p: any) => p.price).filter(Boolean);
  const avgPrice = prices.length
    ? Math.round(prices.reduce((a: number, b: number) => a + b, 0) / prices.length)
    : 0;
  const cities = new Set((priceData ?? []).map((p: any) => p.location).filter(Boolean)).size;

  return (
    <HomePageClient
      initialProducts={products ?? []}
      initialStats={{ pieces: priceData?.length ?? 0, avgPrice, cities }}
    />
  );
}