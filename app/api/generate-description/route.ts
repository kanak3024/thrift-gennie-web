import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { base64, mediaType, title, category, condition, size, mood } = await req.json();

  const prompt = `You are a fashion copywriter for ThriftGennie, a curated Indian secondhand fashion marketplace.
Write a short, evocative product description (2–3 sentences, max 120 words) for this listing.

Details:
- Piece name: ${title || "Not specified"}
- Category: ${category || "Not specified"}
- Condition: ${condition || "Not specified"}
- Size: ${size || "Not specified"}
- Aesthetic/Mood: ${mood || "Not specified"}

Guidelines:
- Warm, editorial tone — like a friend recommending a find
- If a photo is provided, mention fabric, color, silhouette, details you observe
- Highlight why it deserves a new home
- No generic filler like "great condition" or "must have"
- End with a gentle styling hook
- Under 120 words
- Return ONLY the description, no labels or preamble`;

  const hasImage = !!base64;

  const parts = hasImage
    ? [
        { inline_data: { mime_type: mediaType, data: base64 } },
        { text: prompt },
      ]
    : [{ text: prompt }];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts }] }),
    }
  );

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  return NextResponse.json({ text });
}