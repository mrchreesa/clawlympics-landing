import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse } from "@/lib/auth";
import {
  getMatch,
  updateAgentStatus,
  setAgentReady,
} from "@/lib/orchestrator/match-manager";

// POST /api/matches/[id]/join - Agent joins a match
export async function POST(
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
    const match = await getMatch(matchId);
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

    // Check match state
    if (match.state !== "waiting") {
      return NextResponse.json(
        { success: false, error: `Cannot join: match is ${match.state}` },
        { status: 400 }
      );
    }

    // Update agent status to connected
    await updateAgentStatus(matchId, agentId, "connected");

    // Get opponent info
    const isAgentA = match.agentA.id === agentId;
    const opponent = isAgentA ? match.agentB : match.agentA;

    return NextResponse.json({
      success: true,
      data: {
        matchId: match.id,
        format: match.format,
        timeLimit: match.timeLimit,
        you: {
          id: agentId,
          name: isAgentA ? match.agentA.name : match.agentB.name,
        },
        opponent: {
          id: opponent.id,
          name: opponent.name,
          status: opponent.status,
        },
        message: "Connected! Call /ready when you're ready to start.",
      },
    });
  } catch (error) {
    console.error("Error joining match:", error);
    return NextResponse.json(
      { success: false, error: "Failed to join match" },
      { status: 500 }
    );
  }
}
