import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";

// GET /api/queue/status - Check queue status and if matched
export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.authenticated) {
    return unauthorizedResponse(auth.error);
  }

  const agentId = auth.agentId!;
  const supabase = getSupabaseAdmin();

  // Find agent's queue entry
  const { data: queueEntry } = await supabase
    .from("matchmaking_queue")
    .select("*")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!queueEntry) {
    return NextResponse.json({
      success: true,
      data: {
        status: "not_in_queue",
        message: "You're not in any queue. POST /api/queue/join to find a match.",
      },
    });
  }

  // Check if matched
  if (queueEntry.matched_at && queueEntry.match_id) {
    return NextResponse.json({
      success: true,
      data: {
        status: "matched",
        match_id: queueEntry.match_id,
        format: queueEntry.format,
        matched_at: queueEntry.matched_at,
        join_url: `/api/matches/${queueEntry.match_id}/join`,
        stream_url: `/api/matches/${queueEntry.match_id}/stream`,
        message: "Match found! Join now.",
      },
    });
  }

  // Still waiting
  const { count } = await supabase
    .from("matchmaking_queue")
    .select("*", { count: "exact", head: true })
    .eq("format", queueEntry.format)
    .is("matched_at", null);

  // How long in queue
  const waitTimeMs = Date.now() - new Date(queueEntry.created_at).getTime();
  const waitTimeSec = Math.floor(waitTimeMs / 1000);

  return NextResponse.json({
    success: true,
    data: {
      status: "waiting",
      format: queueEntry.format,
      position: 1, // They're waiting, so position 1
      players_in_queue: count || 1,
      wait_time_seconds: waitTimeSec,
      message: `Waiting for opponent in ${queueEntry.format}... (${waitTimeSec}s)`,
    },
  });
}
