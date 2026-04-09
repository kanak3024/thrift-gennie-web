import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const ADMIN_EMAIL    = Deno.env.get("ADMIN_EMAIL")!;

serve(async (req) => {
  try {
    const payload = await req.json();
    const record  = payload.record;

    // Called for both new tickets and new messages
    // Distinguish by checking which table triggered this
    const isNewTicket  = payload.table === "support_tickets";
    const isNewMessage = payload.table === "support_messages";

    // Don't email for admin's own messages — only user messages
    if (isNewMessage && record.is_admin) {
      return new Response("skipped", { status: 200 });
    }

    const subject = isNewTicket
      ? `🎫 New support ticket — ${record.subject}`
      : `💬 New message on ticket`;

    const bodyHtml = isNewTicket
      ? `
        <p>A new support ticket was just opened on <strong>Thrift Gennie</strong>.</p>
        <table style="border-collapse:collapse;width:100%;max-width:480px;font-family:sans-serif;font-size:14px;">
          <tr><td style="padding:8px 0;color:#888;width:120px;">Subject</td><td style="padding:8px 0;font-weight:500;">${record.subject}</td></tr>
          <tr><td style="padding:8px 0;color:#888;">Ticket ID</td><td style="padding:8px 0;font-family:monospace;">${record.id}</td></tr>
          <tr><td style="padding:8px 0;color:#888;">Opened at</td><td style="padding:8px 0;">${new Date(record.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td></tr>
        </table>
        <p style="margin-top:24px;">
          <a href="${Deno.env.get("SITE_URL") ?? "https://yourapp.com"}/admin/support"
             style="background:#2B0A0F;color:#F6F3EF;padding:12px 24px;border-radius:999px;text-decoration:none;font-size:13px;font-family:sans-serif;">
            Open Admin Panel →
          </a>
        </p>
      `
      : `
        <p>A user sent a new message on an open support ticket.</p>
        <table style="border-collapse:collapse;width:100%;max-width:480px;font-family:sans-serif;font-size:14px;">
          <tr><td style="padding:8px 0;color:#888;width:120px;">Message</td><td style="padding:8px 0;">${record.text ?? "(image attached)"}</td></tr>
          <tr><td style="padding:8px 0;color:#888;">Ticket ID</td><td style="padding:8px 0;font-family:monospace;">${record.ticket_id}</td></tr>
          <tr><td style="padding:8px 0;color:#888;">Sent at</td><td style="padding:8px 0;">${new Date(record.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td></tr>
          ${record.attachment_url ? `<tr><td style="padding:8px 0;color:#888;">Attachment</td><td style="padding:8px 0;"><a href="${record.attachment_url}" style="color:#2B0A0F;">View image →</a></td></tr>` : ""}
        </table>
        <p style="margin-top:24px;">
          <a href="${Deno.env.get("SITE_URL") ?? "https://yourapp.com"}/admin/support"
             style="background:#2B0A0F;color:#F6F3EF;padding:12px 24px;border-radius:999px;text-decoration:none;font-size:13px;font-family:sans-serif;">
            Reply Now →
          </a>
        </p>
      `;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        from:    "Thrift Gennie Support <onboarding@resend.dev>",
        to:      [ADMIN_EMAIL],
        subject: subject,
        html:    `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#2B0A0F;">
            <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.2em;color:#888;margin-bottom:24px;">
              Thrift Gennie · Support Alert
            </p>
            ${bodyHtml}
            <p style="margin-top:40px;font-size:11px;color:#ccc;">
              This is an automated alert. Do not reply to this email.
            </p>
          </div>
        `,
      }),
    });

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response("error", { status: 500 });
  }
});