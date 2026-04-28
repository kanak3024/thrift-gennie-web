import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "10 m"), // 5 attempts per 10 mins
  prefix: "rl:verify-otp",
});

export async function POST(req: NextRequest) {
  try {
    // Rate limit by IP
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
    const { success } = await ratelimit.limit(ip);
    if (!success) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }

    const { mobile, otp, userId } = await req.json();

    if (!mobile || !otp || !userId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Auth check — make sure userId matches logged in user
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user && user.id !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const res = await fetch(
      `https://control.msg91.com/api/v5/otp/verify?otp=${otp}&mobile=91${mobile}&authkey=${process.env.MSG91_AUTH_KEY}`,
      { method: "GET" }
    );
    const data = await res.json();
    
    console.log("[verify-otp] MSG91 response:", JSON.stringify(data));

    if (data.type !== "success") {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 401 });
    }

    const { error } = await supabase
      .from("profiles")
      .update({ phone: mobile, phone_verified: true })
      .eq("id", userId);

    if (error) {
      return NextResponse.json({ error: "Verified but failed to save" }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("[verify-otp] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}