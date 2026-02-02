import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse } from "@/lib/auth";
import { getMatch, setAgentReady } from "@/lib/orchestrator/match-manager";

// POST /api/matches/[id]/ready - Agent signals ready to start
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

    // Check agent is connected
    const agent =
      match.agentA.id === agentId ? match.agentA : match.agentB;
    if (agent.status === "disconnected") {
      return NextResponse.json(
        { success: false, error: "You must join the match first" },
        { status: 400 }
      );
    }

    // Check match state
    if (match.state !== "waiting") {
      return NextResponse.json(
        { success: false, error: `Cannot ready: match is ${match.state}` },
        { status: 400 }
      );
    }

    // Set agent as ready
    await setAgentReady(matchId, agentId);

    // Check if opponent is also ready
    const opponent =
      match.agentA.id === agentId ? match.agentB : match.agentA;
    const bothReady = opponent.status === "ready";

    return NextResponse.json({
      success: true,
      data: {
        status: "ready",
        opponentReady: bothReady,
        message: bothReady
          ? "Both players ready! Match starting in 3 seconds..."
          : "Waiting for opponent to ready up...",
        nextStep: {
          action: "poll",
          endpoint: `GET /api/matches/${matchId}/poll`,
          description: bothReady 
            ? "Start polling now! Questions will appear in the poll response."
            : "Poll to check when opponent is ready and match starts.",
          recommendedInterval: bothReady ? "1-2 seconds during active play" : "2-3 seconds while waiting",
          longPollOption: "Add ?wait=10 to wait up to 10s for new events (reduces API calls)",
        },
      },
    });
  } catch (error) {
    console.error("Error setting ready:", error);
    return NextResponse.json(
      { success: false, error: "Failed to set ready" },
      { status: 500 }
    );
  }
}
