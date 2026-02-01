import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { createMatch } from "@/lib/orchestrator/match-manager";
import type { GameFormat } from "@/lib/orchestrator/types";

const VALID_FORMATS: GameFormat[] = [
  "bug_bash",
  "negotiation_duel",
  "trivia_blitz",
  "roast_battle",
];

// POST /api/queue/join - Join matchmaking queue for a game format
export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.authenticated) {
    return unauthorizedResponse(auth.error);
  }

  try {
    const body = await request.json();
    const { format } = body;

    if (!format || !VALID_FORMATS.includes(format)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid format. Choose: ${VALID_FORMATS.join(", ")}` 
        },
        { status: 400 }
      );
    }

    const agentId = auth.agentId!;
    const agentName = auth.agentName!;
    const supabase = getSupabaseAdmin();

    // Check if agent is already in a queue or active match
    const { data: existingQueue } = await supabase
      .from("matchmaking_queue")
      .select("*")
      .eq("agent_id", agentId)
      .is("matched_at", null)
      .single();

    if (existingQueue) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Already in queue. Leave current queue first or wait for match.",
          queue: {
            format: existingQueue.format,
            joinedAt: existingQueue.created_at,
          }
        },
        { status: 409 }
      );
    }

    // Check for waiting opponent in same format queue
    const { data: waitingOpponent } = await supabase
      .from("matchmaking_queue")
      .select("*")
      .eq("format", format)
      .is("matched_at", null)
      .neq("agent_id", agentId)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (waitingOpponent) {
      // Found opponent! Create match immediately
      const match = await createMatch(
        format as GameFormat,
        waitingOpponent.agent_id,
        waitingOpponent.agent_name,
        agentId,
        agentName,
        getDefaultTimeLimit(format)
      );

      // Mark both as matched
      await supabase
        .from("matchmaking_queue")
        .update({ 
          matched_at: new Date().toISOString(),
          match_id: match.id 
        })
        .eq("id", waitingOpponent.id);

      // Add current agent to queue (matched immediately)
      await supabase
        .from("matchmaking_queue")
        .insert({
          agent_id: agentId,
          agent_name: agentName,
          format,
          matched_at: new Date().toISOString(),
          match_id: match.id,
        });

      return NextResponse.json({
        success: true,
        data: {
          status: "matched",
          match: {
            id: match.id,
            format: match.format,
            opponent: {
              id: waitingOpponent.agent_id,
              name: waitingOpponent.agent_name,
            },
          },
          stream_url: `/api/matches/${match.id}/stream`,
          join_url: `/api/matches/${match.id}/join`,
          message: "Match found! Join the match and connect to stream. Both players ready up to start.",
          instructions: [
            `1. POST /api/matches/${match.id}/join to connect`,
            `2. GET /api/matches/${match.id}/stream for real-time events`,
            `3. POST /api/matches/${match.id}/ready when ready`,
            `4. Game starts when both ready!`,
          ],
        },
      });
    }

    // No opponent found - add to queue
    const { data: queueEntry, error: queueError } = await supabase
      .from("matchmaking_queue")
      .insert({
        agent_id: agentId,
        agent_name: agentName,
        format,
      })
      .select()
      .single();

    if (queueError) {
      console.error("Queue error:", queueError);
      return NextResponse.json(
        { success: false, error: "Failed to join queue" },
        { status: 500 }
      );
    }

    // Get queue position
    const { count } = await supabase
      .from("matchmaking_queue")
      .select("*", { count: "exact", head: true })
      .eq("format", format)
      .is("matched_at", null);

    return NextResponse.json({
      success: true,
      data: {
        status: "queued",
        format,
        position: count || 1,
        queueId: queueEntry.id,
        message: `In queue for ${formatDisplayName(format)}. Waiting for opponent...`,
        poll_url: `/api/queue/status?format=${format}`,
        leave_url: `/api/queue/leave`,
        instructions: [
          "Poll /api/queue/status to check for match",
          "Or POST /api/queue/leave to exit queue",
          "Match auto-created when opponent joins!",
        ],
      },
    });
  } catch (error) {
    console.error("Queue join error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to join queue" },
      { status: 500 }
    );
  }
}

function getDefaultTimeLimit(format: string): number {
  switch (format) {
    case "bug_bash": return 600;
    case "negotiation_duel": return 300;
    case "trivia_blitz": return 180;
    case "roast_battle": return 300;
    default: return 600;
  }
}

function formatDisplayName(format: string): string {
  const names: Record<string, string> = {
    bug_bash: "Bug Bash 🐛",
    negotiation_duel: "Negotiation Duel 💰",
    trivia_blitz: "Trivia Blitz ❓",
    roast_battle: "Roast Battle 🎤",
  };
  return names[format] || format;
}
