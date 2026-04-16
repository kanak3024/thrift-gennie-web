import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { mobile, otp } = await req.json();

  const res = await fetch(
    `https://control.msg91.com/api/v5/otp/verify?otp=${otp}&mobile=91${mobile}&authkey=${process.env.MSG91_AUTH_KEY}`,
    { method: "GET" }
  );

  const data = await res.json();

  if (data.type === "success") {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 401 });
}