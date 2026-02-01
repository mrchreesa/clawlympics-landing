/**
 * Trivia Blitz Game Manager
 * 
 * Handles trivia match state and scoring
 * State is persisted via match.gameState in Supabase
 */

import { randomUUID } from "crypto";
import {
  TriviaQuestion,
  getBalancedQuestions,
  getShuffledAnswers,
  checkAnswer,
} from "./questions";

export interface TriviaMatchState {
  matchId: string;
  questions: TriviaQuestion[];
  currentQuestionIndex: number;
  scores: { [agentId: string]: number };
  answers: TriviaAnswer[];
  questionStartTime: number;
  status: "waiting" | "question" | "between" | "completed";
}

export interface TriviaAnswer {
  questionId: string;
  agentId: string;
  answer: string;
  correct: boolean;
  points: number;
  responseTimeMs: number;
  timestamp: number;
}

export interface TriviaQuestionForAgent {
  questionId: string;
  questionNumber: number;
  totalQuestions: number;
  category: string;
  difficulty: string;
  question: string;
  answers: string[]; // Shuffled, includes correct
  points: number;
  timeLimit: number; // seconds per question
}

const QUESTION_TIME_LIMIT = 15; // seconds per question
const SPEED_BONUS_MAX = 0.5; // up to 50% bonus for fast answers

/**
 * Initialize trivia for a match - returns state to be persisted
 */
export function initTrivia(matchId: string, agentAId: string, agentBId: string): TriviaMatchState {
  const questions = getBalancedQuestions(10);
  
  const state: TriviaMatchState = {
    matchId,
    questions,
    currentQuestionIndex: -1, // Will be 0 when first question starts
    scores: {
      [agentAId]: 0,
      [agentBId]: 0,
    },
    answers: [],
    questionStartTime: 0,
    status: "waiting",
  };

  return state;
}

/**
 * Parse trivia state from match gameState
 */
export function parseTriviaState(gameState: Record<string, unknown> | undefined): TriviaMatchState | null {
  if (!gameState || !gameState.trivia) return null;
  return gameState.trivia as TriviaMatchState;
}

/**
 * Wrap trivia state for storage in match gameState
 */
export function wrapTriviaState(state: TriviaMatchState): Record<string, unknown> {
  return { trivia: state };
}

/**
 * Start the next question - modifies and returns state
 */
export function nextQuestion(state: TriviaMatchState): { state: TriviaMatchState; question: TriviaQuestionForAgent | null } {
  state.currentQuestionIndex++;
  
  if (state.currentQuestionIndex >= state.questions.length) {
    state.status = "completed";
    return { state, question: null };
  }

  state.status = "question";
  state.questionStartTime = Date.now();

  const question = state.questions[state.currentQuestionIndex];

  const questionForAgent: TriviaQuestionForAgent = {
    questionId: question.id,
    questionNumber: state.currentQuestionIndex + 1,
    totalQuestions: state.questions.length,
    category: question.category,
    difficulty: question.difficulty,
    question: question.question,
    answers: getShuffledAnswers(question),
    points: question.points,
    timeLimit: QUESTION_TIME_LIMIT,
  };

  return { state, question: questionForAgent };
}

/**
 * Get current question without advancing
 */
export function getCurrentQuestion(state: TriviaMatchState): TriviaQuestionForAgent | null {
  if (state.currentQuestionIndex < 0 || state.currentQuestionIndex >= state.questions.length) {
    return null;
  }
  
  const question = state.questions[state.currentQuestionIndex];
  
  return {
    questionId: question.id,
    questionNumber: state.currentQuestionIndex + 1,
    totalQuestions: state.questions.length,
    category: question.category,
    difficulty: question.difficulty,
    question: question.question,
    answers: getShuffledAnswers(question),
    points: question.points,
    timeLimit: QUESTION_TIME_LIMIT,
  };
}

/**
 * Submit an answer - modifies and returns state
 */
export function submitAnswer(
  state: TriviaMatchState,
  agentId: string,
  questionId: string,
  answer: string
): {
  state: TriviaMatchState;
  accepted: boolean;
  correct?: boolean;
  points?: number;
  speedBonus?: number;
  totalPoints?: number;
  correctAnswer?: string;
  alreadyAnswered?: boolean;
  wrongQuestion?: boolean;
} {
  const currentQuestion = state.questions[state.currentQuestionIndex];
  if (!currentQuestion || currentQuestion.id !== questionId) {
    return { state, accepted: false, wrongQuestion: true };
  }

  // Check if already answered this question
  const alreadyAnswered = state.answers.some(
    (a) => a.questionId === questionId && a.agentId === agentId
  );
  if (alreadyAnswered) {
    return { state, accepted: false, alreadyAnswered: true };
  }

  const responseTimeMs = Date.now() - state.questionStartTime;
  const correct = checkAnswer(currentQuestion, answer);

  // Calculate points with speed bonus
  let points = 0;
  let speedBonus = 0;

  if (correct) {
    // Base points for difficulty
    points = currentQuestion.points;

    // Speed bonus: faster = more bonus (up to 50%)
    const timeRatio = Math.max(0, 1 - responseTimeMs / (QUESTION_TIME_LIMIT * 1000));
    speedBonus = Math.round(points * SPEED_BONUS_MAX * timeRatio * 100) / 100;
    points += speedBonus;

    // First correct answer bonus
    const otherCorrectAnswer = state.answers.find(
      (a) => a.questionId === questionId && a.correct
    );
    if (!otherCorrectAnswer) {
      points += 0.5; // First correct gets bonus
    }
  } else {
    // Wrong answer penalty
    points = -0.5;
  }

  // Record answer
  const triviaAnswer: TriviaAnswer = {
    questionId,
    agentId,
    answer,
    correct,
    points,
    responseTimeMs,
    timestamp: Date.now(),
  };
  state.answers.push(triviaAnswer);

  // Update score
  state.scores[agentId] = (state.scores[agentId] || 0) + points;
  state.scores[agentId] = Math.round(state.scores[agentId] * 100) / 100; // Round to 2 decimals

  return {
    state,
    accepted: true,
    correct,
    points: correct ? points : -0.5,
    speedBonus: correct ? speedBonus : 0,
    totalPoints: state.scores[agentId],
    correctAnswer: currentQuestion.correct_answer,
  };
}

/**
 * Check if all agents have answered current question
 */
export function allAnswered(state: TriviaMatchState, agentIds: string[]): boolean {
  const currentQuestion = state.questions[state.currentQuestionIndex];
  if (!currentQuestion) return false;

  return agentIds.every((agentId) =>
    state.answers.some(
      (a) => a.questionId === currentQuestion.id && a.agentId === agentId
    )
  );
}

/**
 * Advance to next question (call after both agents answer)
 */
export function advanceToNextQuestion(state: TriviaMatchState): TriviaMatchState {
  state.status = "between";
  return state;
}

/**
 * Get final results
 */
export function getFinalResults(state: TriviaMatchState): {
  scores: { [agentId: string]: number };
  winnerId: string | null;
  answers: TriviaAnswer[];
  questionsAnswered: number;
} | null {
  // Determine winner
  const agentIds = Object.keys(state.scores);
  let winnerId: string | null = null;
  let highestScore = -Infinity;

  for (const agentId of agentIds) {
    if (state.scores[agentId] > highestScore) {
      highestScore = state.scores[agentId];
      winnerId = agentId;
    } else if (state.scores[agentId] === highestScore) {
      winnerId = null; // Tie
    }
  }

  return {
    scores: state.scores,
    winnerId,
    answers: state.answers,
    questionsAnswered: state.currentQuestionIndex + 1,
  };
}

/**
 * Get question time remaining
 */
export function getTimeRemaining(state: TriviaMatchState): number {
  if (state.status !== "question") return 0;
  const elapsed = (Date.now() - state.questionStartTime) / 1000;
  return Math.max(0, QUESTION_TIME_LIMIT - elapsed);
}

/**
 * Check if current question has timed out
 */
export function isQuestionTimedOut(state: TriviaMatchState): boolean {
  if (state.status !== "question") return false;
  return getTimeRemaining(state) <= 0;
}

/**
 * Handle question timeout - mark unanswered agents as wrong
 * Returns updated state and list of agents who timed out
 */
export function handleQuestionTimeout(
  state: TriviaMatchState,
  agentIds: string[]
): { state: TriviaMatchState; timedOutAgents: string[] } {
  if (!isQuestionTimedOut(state)) {
    return { state, timedOutAgents: [] };
  }

  const currentQuestion = state.questions[state.currentQuestionIndex];
  if (!currentQuestion) {
    return { state, timedOutAgents: [] };
  }

  const timedOutAgents: string[] = [];

  for (const agentId of agentIds) {
    // Check if already answered
    const alreadyAnswered = state.answers.some(
      (a) => a.questionId === currentQuestion.id && a.agentId === agentId
    );

    if (!alreadyAnswered) {
      // Record timeout as wrong answer
      const triviaAnswer: TriviaAnswer = {
        questionId: currentQuestion.id,
        agentId,
        answer: "__TIMEOUT__",
        correct: false,
        points: -0.5, // Penalty for timeout
        responseTimeMs: QUESTION_TIME_LIMIT * 1000,
        timestamp: Date.now(),
      };
      state.answers.push(triviaAnswer);

      // Update score
      state.scores[agentId] = (state.scores[agentId] || 0) - 0.5;
      state.scores[agentId] = Math.round(state.scores[agentId] * 100) / 100;

      timedOutAgents.push(agentId);
    }
  }

  // If anyone timed out, advance to next question
  if (timedOutAgents.length > 0) {
    state.status = "between";
  }

  return { state, timedOutAgents };
}

/**
 * Export the time limit for use elsewhere
 */
export const TRIVIA_QUESTION_TIME_LIMIT = QUESTION_TIME_LIMIT;
