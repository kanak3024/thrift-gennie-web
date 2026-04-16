import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // use service role key here, not anon
);

export async function POST(req: NextRequest) {
  const { mobile, otp, userId } = await req.json();

  // 1. Verify OTP with MSG91
  const res = await fetch(
    `https://control.msg91.com/api/v5/otp/verify?otp=${otp}&mobile=91${mobile}&authkey=${process.env.MSG91_AUTH_KEY}`,
    { method: "GET" }
  );
  const data = await res.json();

  if (data.type !== "success") {
    return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 401 });
  }

  // 2. Update Supabase profiles table
  const { error } = await supabase
    .from("profiles")
    .update({ 
      phone: mobile, 
      phone_verified: true 
    })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: "Verified but failed to save" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}