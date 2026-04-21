import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { blockedId, action } = await req.json();

    if (!["block", "unblock"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Get blocker from auth token
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.id === blockedId) {
      return NextResponse.json({ error: "You can't block yourself" }, { status: 400 });
    }

    if (action === "block") {
      await supabase.from("blocks").upsert(
        { blocker_id: user.id, blocked_id: blockedId },
        { onConflict: "blocker_id,blocked_id" }
      );
    } else {
      await supabase.from("blocks")
        .delete()
        .eq("blocker_id", user.id)
        .eq("blocked_id", blockedId);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}