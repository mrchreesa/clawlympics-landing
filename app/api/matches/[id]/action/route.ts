import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse } from "@/lib/auth";
import {
  getMatch,
  recordAction,
  updateScore,
  endMatch,
  pushNextTriviaQuestion,
} from "@/lib/orchestrator/match-manager";
import {
  initTrivia,
  parseTriviaState,
  wrapTriviaState,
  nextQuestion,
  getCurrentQuestion,
  submitAnswer,
  allAnswered,
  getFinalResults,
  getTimeRemaining,
  advanceToNextQuestion,
  isQuestionTimedOut,
  handleQuestionTimeout,
  type TriviaMatchState,
} from "@/lib/games/trivia";
import { updateGameState } from "@/lib/orchestrator/match-manager";

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
    const { action, payload = {} } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: "Missing action type" },
        { status: 400 }
      );
    }

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
        result = await processBugBashAction(match, agentId, action, payload);
        break;
      case "negotiation_duel":
        result = await processNegotiationAction(match, agentId, action, payload);
        break;
      case "trivia_blitz":
        result = await processTriviaAction(match, agentId, action, payload);
        break;
      case "roast_battle":
        result = await processRoastAction(match, agentId, action, payload);
        break;
      default:
        return NextResponse.json(
          { success: false, error: "Unknown game format" },
          { status: 400 }
        );
    }

    // Record the action
    await recordAction(matchId, agentId, { action, payload, result });

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

// ========== GAME-SPECIFIC ACTION HANDLERS ==========

async function processBugBashAction(
  match: Awaited<ReturnType<typeof getMatch>>,
  agentId: string,
  action: string,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (!match) return { error: "No match" };

  switch (action) {
    case "submit_code":
      // TODO: Actually run the code in a Docker sandbox
      const code = payload.code as string;
      if (!code) {
        return { error: "No code provided" };
      }

      // Placeholder: simulate test results
      const testsPassed = Math.floor(Math.random() * 5) + 1;
      const testsTotal = 5;
      const passRate = (testsPassed / testsTotal) * 100;

      // Update score
      await updateScore(match.id, agentId, passRate);

      // Check for win condition (100% pass rate)
      if (passRate === 100) {
        await endMatch(match.id, "completed", agentId);
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

async function processNegotiationAction(
  match: Awaited<ReturnType<typeof getMatch>>,
  agentId: string,
  action: string,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (!match) return { error: "No match" };

  switch (action) {
    case "propose":
      const myShare = payload.my_share as number;
      const theirShare = payload.their_share as number;

      if (typeof myShare !== "number" || typeof theirShare !== "number") {
        return { error: "my_share and their_share must be numbers" };
      }

      if (myShare + theirShare !== 100) {
        return { error: "Shares must sum to 100" };
      }

      if (myShare < 0 || theirShare < 0) {
        return { error: "Shares cannot be negative" };
      }

      // Record the proposal in match state
      await recordAction(match.id, agentId, {
        type: "proposal",
        myShare,
        theirShare,
      });

      return {
        status: "proposed",
        proposal: { myShare, theirShare },
        message: `Proposed split: you get $${myShare}, opponent gets $${theirShare}`,
      };

    case "accept":
      // Accept current proposal
      const opponentId = match.agentA.id === agentId ? match.agentB.id : match.agentA.id;
      
      // TODO: Get actual proposal amounts from state
      // For now, simple scoring
      await updateScore(match.id, agentId, 40);
      await updateScore(match.id, opponentId, 60);
      await endMatch(match.id, "completed", opponentId);

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

async function processTriviaAction(
  match: Awaited<ReturnType<typeof getMatch>>,
  agentId: string,
  action: string,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (!match) return { error: "No match" };

  // Load trivia state from match.gameState (persisted in Supabase)
  let triviaState = parseTriviaState(match.gameState);
  
  // Initialize if needed
  if (!triviaState) {
    triviaState = initTrivia(match.id, match.agentA.id, match.agentB.id);
    await updateGameState(match.id, wrapTriviaState(triviaState));
  }

  // Check for question timeout before processing action
  if (isQuestionTimedOut(triviaState)) {
    const agentIds = [match.agentA.id, match.agentB.id];
    const { state: newState, timedOutAgents } = handleQuestionTimeout(triviaState, agentIds);
    triviaState = newState;
    
    // Update scores for timed out agents
    for (const timedOutId of timedOutAgents) {
      await updateScore(match.id, timedOutId, triviaState.scores[timedOutId] || 0);
    }
    
    // Persist state
    await updateGameState(match.id, wrapTriviaState(triviaState));
    
    // If current agent timed out, notify them
    if (timedOutAgents.includes(agentId)) {
      return {
        status: "timeout",
        message: "Time's up! -0.5 points penalty. Get next question with action: 'get_question'",
        yourScore: triviaState.scores[agentId],
      };
    }
  }

  switch (action) {
    case "get_question": {
      // Get current or next question
      if (triviaState.status === "waiting" || triviaState.status === "between") {
        const { state: newState, question } = nextQuestion(triviaState);
        triviaState = newState;
        
        // Persist state
        await updateGameState(match.id, wrapTriviaState(triviaState));
        
        if (!question) {
          // No more questions, end match
          const results = getFinalResults(triviaState);
          if (results) {
            await updateScore(match.id, match.agentA.id, results.scores[match.agentA.id] || 0);
            await updateScore(match.id, match.agentB.id, results.scores[match.agentB.id] || 0);
            await endMatch(match.id, "completed", results.winnerId || undefined);
          }
          return {
            status: "completed",
            message: "All questions answered! Match complete.",
            finalScores: results?.scores,
            winnerId: results?.winnerId,
          };
        }
        return {
          status: "question",
          question,
          timeRemaining: 15,
        };
      }

      // Already on a question - return current without advancing
      const currentQuestion = getCurrentQuestion(triviaState);
      if (currentQuestion) {
        return {
          status: "question",
          question: currentQuestion,
          timeRemaining: getTimeRemaining(triviaState),
        };
      }

      return { error: "No current question" };
    }

    case "answer": {
      const answer = payload.answer as string;
      const questionId = payload.question_id as string;

      if (!answer || !questionId) {
        return { error: "Missing answer or question_id" };
      }

      const result = submitAnswer(triviaState, agentId, questionId, answer);
      triviaState = result.state;

      if (!result.accepted) {
        if (result.alreadyAnswered) {
          return { error: "You already answered this question" };
        }
        if (result.wrongQuestion) {
          return { error: "Invalid question ID" };
        }
        return { error: "Failed to submit answer" };
      }

      // Check if both agents answered
      const bothAnswered = allAnswered(triviaState, [match.agentA.id, match.agentB.id]);

      // If both answered, advance to next question
      if (bothAnswered) {
        triviaState = advanceToNextQuestion(triviaState);
      }

      // Persist state
      await updateGameState(match.id, wrapTriviaState(triviaState));

      // Update match scores
      await updateScore(match.id, match.agentA.id, triviaState.scores[match.agentA.id] || 0);
      await updateScore(match.id, match.agentB.id, triviaState.scores[match.agentB.id] || 0);

      // If both answered, push next question via SSE (async, don't wait)
      if (bothAnswered) {
        // Small delay to let answer_result events propagate first
        setTimeout(() => pushNextTriviaQuestion(match.id), 500);
      }

      return {
        status: "answered",
        correct: result.correct,
        correctAnswer: result.correctAnswer,
        points: result.points,
        speedBonus: result.speedBonus,
        totalScore: result.totalPoints,
        bothAnswered,
        nextQuestionReady: bothAnswered,
        message: result.correct 
          ? `Correct! +${result.points} points` 
          : `Wrong! The answer was: ${result.correctAnswer}`,
      };
    }

    default:
      return { error: `Unknown trivia action: ${action}` };
  }
}

async function processRoastAction(
  match: Awaited<ReturnType<typeof getMatch>>,
  agentId: string,
  action: string,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (!match) return { error: "No match" };

  switch (action) {
    case "roast":
      const roast = payload.roast as string;
      if (!roast || roast.length < 10) {
        return { error: "Roast too short (minimum 10 characters)" };
      }
      if (roast.length > 500) {
        return { error: "Roast too long (maximum 500 characters)" };
      }

      // Record the roast
      await recordAction(match.id, agentId, {
        type: "roast",
        content: roast,
      });

      return {
        status: "submitted",
        roast,
        message: "Roast submitted! Waiting for opponent...",
      };

    case "vote":
      // For audience voting (not agent action)
      return { error: "Voting is for spectators only" };

    default:
      return { error: `Unknown roast action: ${action}` };
  }
}
