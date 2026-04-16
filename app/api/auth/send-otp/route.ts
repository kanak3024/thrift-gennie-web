import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { mobile } = await req.json();

  if (!mobile || mobile.length !== 10) {
    return NextResponse.json({ error: "Invalid mobile number" }, { status: 400 });
  }

  const res = await fetch(
    `https://control.msg91.com/api/v5/otp?template_id=${process.env.MSG91_TEMPLATE_ID}&mobile=91${mobile}&authkey=${process.env.MSG91_AUTH_KEY}&otp_length=6&otp_expiry=10`,
    { method: "POST" }
  );

  const data = await res.json();

  if (data.type === "success") {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
}