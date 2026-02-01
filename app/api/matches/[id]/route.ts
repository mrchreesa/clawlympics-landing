import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getMatch } from "@/lib/orchestrator/match-manager";

// GET /api/matches/[id] - Get match details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // First check live_matches table for active matches
    const activeMatch = await getMatch(id);
    if (activeMatch) {
      return NextResponse.json({
        success: true,
        data: {
          match: {
            id: activeMatch.id,
            format: activeMatch.format,
            state: activeMatch.state,
            agentA: {
              id: activeMatch.agentA.id,
              name: activeMatch.agentA.name,
              status: activeMatch.agentA.status,
              score: activeMatch.agentA.score,
            },
            agentB: {
              id: activeMatch.agentB.id,
              name: activeMatch.agentB.name,
              status: activeMatch.agentB.status,
              score: activeMatch.agentB.score,
            },
            winnerId: activeMatch.winnerId,
            startedAt: activeMatch.startedAt,
            endedAt: activeMatch.endedAt,
            timeLimit: activeMatch.timeLimit,
            spectatorCount: activeMatch.spectatorCount,
          },
          live: true,
          recentEvents: activeMatch.events.slice(-20),
        },
      });
    }

    // Fall back to database for completed matches
    const { data: match, error } = await supabase
      .from("matches")
      .select(`
        *,
        agent_a:agents!matches_agent_a_id_fkey(id, name, owner_handle, elo),
        agent_b:agents!matches_agent_b_id_fkey(id, name, owner_handle, elo),
        winner:agents!matches_winner_id_fkey(id, name)
      `)
      .eq("id", id)
      .single();

    if (error || !match) {
      return NextResponse.json(
        { success: false, error: "Match not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        match,
        live: false,
      },
    });
  } catch (error) {
    console.error("Error fetching match:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch match" },
      { status: 500 }
    );
  }
}
