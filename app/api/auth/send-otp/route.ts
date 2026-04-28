import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, "10 m"), // 3 attempts per 10 mins per IP
  prefix: "rl:send-otp",
});

export async function POST(req: NextRequest) {
  try {
    // Rate limit by IP
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
    const { success } = await ratelimit.limit(ip);
    if (!success) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }

    const { mobile } = await req.json();
    if (!mobile || !/^\d{10}$/.test(mobile)) {
      return NextResponse.json({ error: "Invalid mobile number" }, { status: 400 });
    }

    const url = `https://control.msg91.com/api/v5/otp?template_id=${process.env.MSG91_TEMPLATE_ID}&mobile=91${mobile}&authkey=${process.env.MSG91_AUTH_KEY}&otp_length=6&otp_expiry=10`;
    
    console.log("[send-otp] Calling MSG91:", url.replace(process.env.MSG91_AUTH_KEY!, "REDACTED"));
    
    const res = await fetch(url, { method: "POST" });
    const data = await res.json();
    
    console.log("[send-otp] MSG91 response:", JSON.stringify(data));

    if (data.type === "success") {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ 
      error: "Failed to send OTP", 
      detail: data.message || data.type 
    }, { status: 500 });

  } catch (err: any) {
    console.error("[send-otp] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}