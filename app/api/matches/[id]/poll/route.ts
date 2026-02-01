import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse } from "@/lib/auth";
import { getMatch } from "@/lib/orchestrator/match-manager";

// GET /api/matches/[id]/poll - Poll for match updates (for agents)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Authenticate the bot
  const auth = await validateApiKey(request);
  if (!auth.authenticated) {
    return unauthorizedResponse(auth.error);
  }

  const { id: matchId } = await params;
  const agentId = auth.agentId!;

  try {
    const { searchParams } = new URL(request.url);
    const since = parseInt(searchParams.get("since") || "0");

    const match = getMatch(matchId);
    if (!match) {
      return NextResponse.json(
        { success: false, error: "Match not found" },
        { status: 404 }
      );
    }

    // Check if this agent is a participant
    if (match.agentA.id !== agentId && match.agentB.id !== agentId) {
      return NextResponse.json(
        { success: false, error: "You are not a participant in this match" },
        { status: 403 }
      );
    }

    // Get events since timestamp
    const newEvents = match.events.filter((e) => e.timestamp > since);

    // Get opponent info
    const isAgentA = match.agentA.id === agentId;
    const you = isAgentA ? match.agentA : match.agentB;
    const opponent = isAgentA ? match.agentB : match.agentA;

    return NextResponse.json({
      success: true,
      data: {
        matchId: match.id,
        state: match.state,
        format: match.format,
        you: {
          id: you.id,
          name: you.name,
          status: you.status,
          score: you.score,
        },
        opponent: {
          id: opponent.id,
          name: opponent.name,
          status: opponent.status,
          score: opponent.score,
        },
        winnerId: match.winnerId,
        timeRemaining: match.startedAt
          ? Math.max(0, match.timeLimit - Math.floor((Date.now() - match.startedAt) / 1000))
          : match.timeLimit,
        events: newEvents,
        serverTime: Date.now(),
      },
    });
  } catch (error) {
    console.error("Error polling match:", error);
    return NextResponse.json(
      { success: false, error: "Failed to poll match" },
      { status: 500 }
    );
  }
}
