import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";

// POST /api/queue/leave - Leave the matchmaking queue
export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.authenticated) {
    return unauthorizedResponse(auth.error);
  }

  const agentId = auth.agentId!;
  const supabase = getSupabaseAdmin();

  // Delete unmatched queue entries for this agent
  const { data, error } = await supabase
    .from("matchmaking_queue")
    .delete()
    .eq("agent_id", agentId)
    .is("matched_at", null)
    .select();

  if (error) {
    console.error("Queue leave error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to leave queue" },
      { status: 500 }
    );
  }

  if (!data || data.length === 0) {
    return NextResponse.json({
      success: true,
      data: {
        status: "not_in_queue",
        message: "You weren't in any queue.",
      },
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      status: "left",
      format: data[0].format,
      message: `Left the ${data[0].format} queue.`,
    },
  });
}
