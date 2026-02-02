import { NextRequest, NextResponse } from "next/server";
import {
  getMatch,
  updateScore,
  updateGameState,
  pushNextTriviaQuestion,
} from "@/lib/orchestrator/match-manager";
import {
  parseTriviaState,
  wrapTriviaState,
  isQuestionTimedOut,
  handleQuestionTimeout,
} from "@/lib/games/trivia";
import { logger } from "@/lib/logger";

// POST /api/matches/[id]/check-timeout - Public endpoint for spectators to trigger timeout check
// This is a workaround for serverless setTimeout not persisting
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params;

  try {
    const match = await getMatch(matchId);
    if (!match) {
      return NextResponse.json(
        { success: false, error: "Match not found" },
        { status: 404 }
      );
    }

    // Only for active trivia matches
    if (match.state !== "active" || match.format !== "trivia_blitz") {
      return NextResponse.json({
        success: true,
        status: "not_applicable",
        message: "Not an active trivia match",
      });
    }

    const triviaState = parseTriviaState(match.gameState);
    if (!triviaState) {
      return NextResponse.json({
        success: true,
        status: "no_state",
        message: "No trivia state found",
      });
    }

    // Check if question has timed out
    if (isQuestionTimedOut(triviaState)) {
      const agentIds = [match.agentA.id, match.agentB.id];
      const { state: newState, timedOutAgents } = handleQuestionTimeout(triviaState, agentIds);

      if (timedOutAgents.length > 0) {
        // Update scores for timed out agents
        for (const timedOutId of timedOutAgents) {
          await updateScore(matchId, timedOutId, newState.scores[timedOutId] || 0);
        }

        // Persist state
        await updateGameState(matchId, wrapTriviaState(newState));

        // Log timeout
        const timedOutNames = timedOutAgents.map(id =>
          id === match.agentA.id ? match.agentA.name : match.agentB.name
        );
        logger.trivia.timeout(matchId, timedOutNames);

        // Push next question after short delay
        setTimeout(() => pushNextTriviaQuestion(matchId), 500);

        return NextResponse.json({
          success: true,
          status: "timeout_handled",
          timedOutAgents: timedOutNames,
          message: `Time's up! ${timedOutNames.join(", ")} didn't answer.`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      status: "no_timeout",
      message: "Question not timed out or already handled",
    });
  } catch (error) {
    console.error("Error checking timeout:", error);
    return NextResponse.json(
      { success: false, error: "Failed to check timeout" },
      { status: 500 }
    );
  }
}
