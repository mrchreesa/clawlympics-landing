import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse } from "@/lib/auth";
import {
  getMatch,
  recordAction,
  updateScore,
  endMatch,
} from "@/lib/orchestrator/match-manager";

// POST /api/matches/[id]/action - Agent submits an action
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
    const body = await request.json();
    const { action, payload } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: "Missing action type" },
        { status: 400 }
      );
    }

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

    // Check match is active
    if (match.state !== "active") {
      return NextResponse.json(
        { success: false, error: `Cannot act: match is ${match.state}` },
        { status: 400 }
      );
    }

    // Process action based on game format
    let result: Record<string, unknown> = {};

    switch (match.format) {
      case "bug_bash":
        result = processBugBashAction(match, agentId, action, payload);
        break;
      case "negotiation_duel":
        result = processNegotiationAction(match, agentId, action, payload);
        break;
      case "trivia_blitz":
        result = processTriviaAction(match, agentId, action, payload);
        break;
      case "roast_battle":
        result = processRoastAction(match, agentId, action, payload);
        break;
      default:
        return NextResponse.json(
          { success: false, error: "Unknown game format" },
          { status: 400 }
        );
    }

    // Record the action
    recordAction(matchId, agentId, { action, payload, result });

    return NextResponse.json({
      success: true,
      data: {
        action,
        result,
        matchState: match.state,
        scores: {
          you: match.agentA.id === agentId ? match.agentA.score : match.agentB.score,
          opponent: match.agentA.id === agentId ? match.agentB.score : match.agentA.score,
        },
      },
    });
  } catch (error) {
    console.error("Error processing action:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process action" },
      { status: 500 }
    );
  }
}

// Game-specific action processors
function processBugBashAction(
  match: ReturnType<typeof getMatch>,
  agentId: string,
  action: string,
  payload: Record<string, unknown>
): Record<string, unknown> {
  if (!match) return { error: "No match" };

  switch (action) {
    case "submit_code":
      // TODO: Actually run the code in a sandbox
      const code = payload.code as string;
      if (!code) {
        return { error: "No code provided" };
      }

      // Placeholder: simulate test results
      const testsPassed = Math.floor(Math.random() * 5) + 1;
      const testsTotal = 5;
      const passRate = (testsPassed / testsTotal) * 100;

      // Update score
      updateScore(match.id, agentId, passRate);

      // Check for win condition (100% pass rate)
      if (passRate === 100) {
        endMatch(match.id, "completed", agentId);
        return {
          testsPassed,
          testsTotal,
          passRate,
          status: "winner",
          message: "All tests passed! You win!",
        };
      }

      return {
        testsPassed,
        testsTotal,
        passRate,
        status: "submitted",
        message: `${testsPassed}/${testsTotal} tests passed`,
      };

    case "run_tests":
      return {
        status: "pending",
        message: "Running tests...",
      };

    default:
      return { error: `Unknown action: ${action}` };
  }
}

function processNegotiationAction(
  match: ReturnType<typeof getMatch>,
  agentId: string,
  action: string,
  payload: Record<string, unknown>
): Record<string, unknown> {
  if (!match) return { error: "No match" };

  switch (action) {
    case "propose":
      const myShare = payload.my_share as number;
      const theirShare = payload.their_share as number;

      if (myShare + theirShare !== 100) {
        return { error: "Shares must sum to 100" };
      }

      return {
        status: "proposed",
        proposal: { myShare, theirShare },
        message: `Proposed split: you get $${myShare}, opponent gets $${theirShare}`,
      };

    case "accept":
      // Accept current proposal
      const opponentId = match.agentA.id === agentId ? match.agentB.id : match.agentA.id;
      
      // Placeholder: whoever accepted gets the worse deal typically
      updateScore(match.id, agentId, 40);
      updateScore(match.id, opponentId, 60);
      endMatch(match.id, "completed", opponentId);

      return {
        status: "accepted",
        message: "Deal accepted! Match complete.",
      };

    case "reject":
      return {
        status: "rejected",
        message: "Proposal rejected. Make a counter-offer.",
      };

    default:
      return { error: `Unknown action: ${action}` };
  }
}

function processTriviaAction(
  match: ReturnType<typeof getMatch>,
  agentId: string,
  action: string,
  payload: Record<string, unknown>
): Record<string, unknown> {
  if (!match) return { error: "No match" };

  switch (action) {
    case "answer":
      const answer = payload.answer as string;
      const questionId = payload.question_id as string;

      // Placeholder: random correctness
      const correct = Math.random() > 0.5;
      const points = correct ? 1 : -0.5;
      
      const agent = match.agentA.id === agentId ? match.agentA : match.agentB;
      updateScore(match.id, agentId, agent.score + points);

      return {
        questionId,
        answer,
        correct,
        points,
        newScore: agent.score + points,
      };

    default:
      return { error: `Unknown action: ${action}` };
  }
}

function processRoastAction(
  match: ReturnType<typeof getMatch>,
  agentId: string,
  action: string,
  payload: Record<string, unknown>
): Record<string, unknown> {
  if (!match) return { error: "No match" };

  switch (action) {
    case "roast":
      const roast = payload.roast as string;
      if (!roast || roast.length < 10) {
        return { error: "Roast too short" };
      }

      return {
        status: "submitted",
        roast,
        message: "Roast submitted! Waiting for opponent...",
      };

    default:
      return { error: `Unknown action: ${action}` };
  }
}
