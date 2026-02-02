import { NextRequest, NextResponse } from "next/server";
import {
  getMatch,
  checkAndHandleQuestionTimeout,
  tickMatchState,
} from "@/lib/orchestrator/match-manager";

// POST /api/matches/[id]/check-timeout - Public endpoint for spectators/agents to trigger timeout check
// Also ticks match state (handles countdown -> active, match timeout)
// This is the serverless-safe way to advance match state
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params;

  try {
    // First, tick the overall match state (countdown, match timeout)
    const { action: tickAction, match } = await tickMatchState(matchId);
    
    if (!match) {
      return NextResponse.json(
        { success: false, error: "Match not found" },
        { status: 404 }
      );
    }

    // If match just started or timed out, report that
    if (tickAction === "started") {
      return NextResponse.json({
        success: true,
        status: "match_started",
        message: "Countdown finished, match started!",
        state: match.state,
      });
    }

    if (tickAction === "timeout") {
      return NextResponse.json({
        success: true,
        status: "match_timeout",
        message: "Match time expired!",
        state: match.state,
      });
    }

    // For active trivia matches, also check question timeout
    if (match.state === "active" && match.format === "trivia_blitz") {
      const handled = await checkAndHandleQuestionTimeout(matchId);
      
      if (handled) {
        return NextResponse.json({
          success: true,
          status: "question_timeout_handled",
          message: "Question timeout handled, next question pushed",
        });
      }
    }

    return NextResponse.json({
      success: true,
      status: "no_action_needed",
      state: match.state,
    });
  } catch (error) {
    console.error("Error checking timeout:", error);
    return NextResponse.json(
      { success: false, error: "Failed to check timeout" },
      { status: 500 }
    );
  }
}
