import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse } from "@/lib/auth";
import { getMatch, pushNextTriviaQuestion, updateScore, updateGameState } from "@/lib/orchestrator/match-manager";
import {
  parseTriviaState,
  wrapTriviaState,
  getCurrentQuestion,
  isQuestionTimedOut,
  handleQuestionTimeout,
  getTimeRemaining,
} from "@/lib/games/trivia";

// GET /api/matches/[id]/poll - Poll for match updates (for agents)
// Supports long-polling with ?wait=10 (seconds to wait for new events)
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
    const waitSeconds = Math.min(parseInt(searchParams.get("wait") || "0"), 30); // Max 30s

    let match = await getMatch(matchId);
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

    // Long-polling: wait for new events if requested
    if (waitSeconds > 0) {
      const startTime = Date.now();
      const maxWait = waitSeconds * 1000;
      
      while (Date.now() - startTime < maxWait) {
        const newEvents = match.events.filter((e) => e.timestamp > since);
        if (newEvents.length > 0) break;
        
        // Wait 500ms then check again
        await new Promise(resolve => setTimeout(resolve, 500));
        match = await getMatch(matchId);
        if (!match) break;
      }
    }

    if (!match) {
      return NextResponse.json(
        { success: false, error: "Match not found" },
        { status: 404 }
      );
    }

    // Get events since timestamp
    const newEvents = match.events.filter((e) => e.timestamp > since);

    // Get opponent info
    const isAgentA = match.agentA.id === agentId;
    const you = isAgentA ? match.agentA : match.agentB;
    const opponent = isAgentA ? match.agentB : match.agentA;

    // Build response
    const response: Record<string, unknown> = {
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
        eventCount: newEvents.length,
        serverTime: Date.now(),
      },
    };

    // Add game-specific state
    if (match.format === "trivia_blitz" && match.state === "active") {
      const triviaData = await getTriviaStateForAgent(match, agentId);
      (response.data as Record<string, unknown>).trivia = triviaData.trivia;
      (response.data as Record<string, unknown>).action = triviaData.action;
    } else {
      // Generic action hints based on state
      (response.data as Record<string, unknown>).action = getActionHint(match.state, you.status);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error polling match:", error);
    return NextResponse.json(
      { success: false, error: "Failed to poll match" },
      { status: 500 }
    );
  }
}

/**
 * Get trivia state and action hints for an agent
 */
async function getTriviaStateForAgent(
  match: NonNullable<Awaited<ReturnType<typeof getMatch>>>,
  agentId: string
): Promise<{ trivia: Record<string, unknown>; action: Record<string, unknown> }> {
  let triviaState = parseTriviaState(match.gameState);
  
  if (!triviaState) {
    return {
      trivia: { status: "initializing" },
      action: {
        required: "wait",
        message: "Match initializing, question coming soon...",
        pollAgainMs: 1000,
      },
    };
  }

  // Check for timeout and handle it (agent-triggered timeout check)
  if (isQuestionTimedOut(triviaState)) {
    const agentIds = [match.agentA.id, match.agentB.id];
    const { state: newState, timedOutAgents } = handleQuestionTimeout(triviaState, agentIds);
    
    if (timedOutAgents.length > 0) {
      // Update scores
      for (const timedOutId of timedOutAgents) {
        await updateScore(match.id, timedOutId, newState.scores[timedOutId] || 0);
      }
      
      // Persist state
      await updateGameState(match.id, wrapTriviaState(newState));
      triviaState = newState;
      
      // Push next question
      setTimeout(() => pushNextTriviaQuestion(match.id), 300);
    }
  }

  const currentQuestion = getCurrentQuestion(triviaState);
  const questionTimeLeft = getTimeRemaining(triviaState);
  
  // Check if this agent already answered current question
  const alreadyAnswered = currentQuestion && triviaState.answers.some(
    (a) => a.questionId === currentQuestion.questionId && a.agentId === agentId
  );

  // Build trivia state for agent
  const trivia: Record<string, unknown> = {
    status: triviaState.status,
    questionNumber: triviaState.currentQuestionIndex + 1,
    totalQuestions: triviaState.questions.length,
    yourScore: triviaState.scores[agentId] || 0,
  };

  // Build action hint
  let action: Record<string, unknown>;

  if (triviaState.status === "completed") {
    action = {
      required: "none",
      message: "Match complete! Check final scores.",
    };
  } else if (triviaState.status === "between") {
    action = {
      required: "wait",
      message: "Between questions, next one coming...",
      pollAgainMs: 500,
    };
  } else if (currentQuestion) {
    if (alreadyAnswered) {
      action = {
        required: "wait",
        message: "You answered! Waiting for opponent...",
        pollAgainMs: 1000,
      };
      trivia.alreadyAnswered = true;
    } else {
      action = {
        required: "answer",
        message: `Answer now! ${Math.ceil(questionTimeLeft)}s remaining`,
        endpoint: "POST /api/matches/{id}/action",
        payload: {
          action: "answer",
          question_id: currentQuestion.questionId,
          answer: "<your_answer>",
        },
        timeRemainingSeconds: Math.ceil(questionTimeLeft),
      };
      trivia.question = currentQuestion;
    }
  } else {
    action = {
      required: "wait",
      message: "Waiting for question...",
      pollAgainMs: 1000,
    };
  }

  return { trivia, action };
}

/**
 * Get action hint based on match state
 */
function getActionHint(
  matchState: string,
  agentStatus: string
): Record<string, unknown> {
  switch (matchState) {
    case "open":
      return {
        required: "wait",
        message: "Waiting for opponent to join...",
        pollAgainMs: 2000,
      };
    case "waiting":
      if (agentStatus === "ready") {
        return {
          required: "wait",
          message: "You're ready! Waiting for opponent to ready up...",
          pollAgainMs: 1000,
        };
      }
      return {
        required: "ready",
        message: "Both players joined! Call /ready to start.",
        endpoint: "POST /api/matches/{id}/ready",
      };
    case "countdown":
      return {
        required: "wait",
        message: "Match starting in 3... 2... 1...",
        pollAgainMs: 500,
      };
    case "active":
      return {
        required: "play",
        message: "Match is active! Take actions based on game format.",
        pollAgainMs: 1000,
      };
    case "completed":
      return {
        required: "none",
        message: "Match completed!",
      };
    case "cancelled":
      return {
        required: "none",
        message: "Match was cancelled.",
      };
    default:
      return {
        required: "unknown",
        message: `Unknown state: ${matchState}`,
        pollAgainMs: 2000,
      };
  }
}
