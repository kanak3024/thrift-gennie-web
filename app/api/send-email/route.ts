import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { type, to, data } = await req.json();

    let subject = "";
    let html = "";

    if (type === "order_confirmed") {
      subject = "Your order is confirmed — Thrift Gennie";
      html = `
        <div style="font-family: serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #2B0A0F;">
          <h1 style="font-size: 28px; margin-bottom: 8px;">Order Confirmed ✨</h1>
          <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.2em; opacity: 0.5;">Thrift Gennie Archive</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p>Hi there,</p>
          <p>Your order for <strong>${data.productTitle}</strong> has been confirmed!</p>
          <div style="background: #F6F3EF; padding: 20px; margin: 24px 0;">
            <p style="margin: 0; font-size: 13px;"><strong>Item:</strong> ${data.productTitle}</p>
            <p style="margin: 8px 0 0; font-size: 13px;"><strong>Amount:</strong> ₹${data.amount}</p>
            <p style="margin: 8px 0 0; font-size: 13px;"><strong>Order ID:</strong> ${data.orderId}</p>
          </div>
          <p>The seller has been notified and will ship your item soon. You'll receive another email when it's on its way!</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/orders/${data.orderId}" 
            style="display: inline-block; background: #2B0A0F; color: white; padding: 12px 32px; text-decoration: none; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3em; margin-top: 16px;">
            View Order
          </a>
          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
          <p style="font-size: 11px; opacity: 0.4; text-transform: uppercase; letter-spacing: 0.2em;">Thrift Gennie — Pre-loved Collective</p>
        </div>
      `;
    }

    if (type === "order_shipped") {
      subject = "Your order has been shipped — Thrift Gennie";
      html = `
        <div style="font-family: serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #2B0A0F;">
          <h1 style="font-size: 28px; margin-bottom: 8px;">Your Order is On Its Way 📦</h1>
          <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.2em; opacity: 0.5;">Thrift Gennie Archive</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p>Hi there,</p>
          <p>Great news! <strong>${data.productTitle}</strong> has been shipped.</p>
          <div style="background: #F6F3EF; padding: 20px; margin: 24px 0;">
            <p style="margin: 0; font-size: 13px;"><strong>Courier:</strong> ${data.courierName}</p>
            <p style="margin: 8px 0 0; font-size: 13px;"><strong>Tracking Number:</strong> ${data.trackingNumber}</p>
            ${data.trackingUrl ? `<p style="margin: 8px 0 0; font-size: 13px;"><strong>Track here:</strong> <a href="${data.trackingUrl}">${data.trackingUrl}</a></p>` : ""}
          </div>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/orders/${data.orderId}"
            style="display: inline-block; background: #2B0A0F; color: white; padding: 12px 32px; text-decoration: none; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3em; margin-top: 16px;">
            View Order
          </a>
          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
          <p style="font-size: 11px; opacity: 0.4; text-transform: uppercase; letter-spacing: 0.2em;">Thrift Gennie — Pre-loved Collective</p>
        </div>
      `;
    }

    if (type === "new_message") {
      subject = "You have a new message — Thrift Gennie";
      html = `
        <div style="font-family: serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #2B0A0F;">
          <h1 style="font-size: 28px; margin-bottom: 8px;">New Message 💬</h1>
          <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.2em; opacity: 0.5;">Thrift Gennie Archive</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p>Hi there,</p>
          <p>You have a new message about <strong>${data.productTitle}</strong>.</p>
          <div style="background: #F6F3EF; padding: 20px; margin: 24px 0; border-left: 3px solid #2B0A0F;">
            <p style="margin: 0; font-size: 13px; font-style: italic;">"${data.message}"</p>
          </div>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/messages/${data.conversationId}"
            style="display: inline-block; background: #2B0A0F; color: white; padding: 12px 32px; text-decoration: none; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3em; margin-top: 16px;">
            Reply Now
          </a>
          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
          <p style="font-size: 11px; opacity: 0.4; text-transform: uppercase; letter-spacing: 0.2em;">Thrift Gennie — Pre-loved Collective</p>
        </div>
      `;
    }

    const { error } = await resend.emails.send({
      from: "Thrift Gennie <onboarding@resend.dev>",
      to,
      subject,
      html,
    });

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Email error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
