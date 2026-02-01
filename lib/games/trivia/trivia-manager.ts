/**
 * Trivia Blitz Game Manager
 * 
 * Handles trivia match state and scoring
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

// In-memory store for trivia states
const triviaStates = new Map<string, TriviaMatchState>();

const QUESTION_TIME_LIMIT = 15; // seconds per question
const BETWEEN_QUESTION_DELAY = 3; // seconds between questions
const SPEED_BONUS_MAX = 0.5; // up to 50% bonus for fast answers

/**
 * Initialize trivia for a match
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

  triviaStates.set(matchId, state);
  return state;
}

/**
 * Get trivia state for a match
 */
export function getTriviaState(matchId: string): TriviaMatchState | null {
  return triviaStates.get(matchId) || null;
}

/**
 * Start the next question
 */
export function nextQuestion(matchId: string): TriviaQuestionForAgent | null {
  const state = triviaStates.get(matchId);
  if (!state) return null;

  state.currentQuestionIndex++;
  
  if (state.currentQuestionIndex >= state.questions.length) {
    state.status = "completed";
    return null;
  }

  state.status = "question";
  state.questionStartTime = Date.now();

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
 * Submit an answer
 */
export function submitAnswer(
  matchId: string,
  agentId: string,
  questionId: string,
  answer: string
): {
  accepted: boolean;
  correct?: boolean;
  points?: number;
  speedBonus?: number;
  totalPoints?: number;
  correctAnswer?: string;
  alreadyAnswered?: boolean;
  wrongQuestion?: boolean;
} {
  const state = triviaStates.get(matchId);
  if (!state) return { accepted: false };

  const currentQuestion = state.questions[state.currentQuestionIndex];
  if (!currentQuestion || currentQuestion.id !== questionId) {
    return { accepted: false, wrongQuestion: true };
  }

  // Check if already answered this question
  const alreadyAnswered = state.answers.some(
    (a) => a.questionId === questionId && a.agentId === agentId
  );
  if (alreadyAnswered) {
    return { accepted: false, alreadyAnswered: true };
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
export function allAnswered(matchId: string, agentIds: string[]): boolean {
  const state = triviaStates.get(matchId);
  if (!state) return false;

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
 * Sets status to "between" so next get_question call will advance
 */
export function advanceToNextQuestion(matchId: string): void {
  const state = triviaStates.get(matchId);
  if (!state) return;
  
  state.status = "between";
}

/**
 * Get final results
 */
export function getFinalResults(matchId: string): {
  scores: { [agentId: string]: number };
  winnerId: string | null;
  answers: TriviaAnswer[];
  questionsAnswered: number;
} | null {
  const state = triviaStates.get(matchId);
  if (!state) return null;

  // Determine winner
  const agentIds = Object.keys(state.scores);
  let winnerId: string | null = null;
  let highestScore = -Infinity;

  for (const agentId of agentIds) {
    if (state.scores[agentId] > highestScore) {
      highestScore = state.scores[agentId];
      winnerId = agentId;
    } else if (state.scores[agentId] === highestScore) {
      // Tie - check who answered faster on average
      winnerId = null; // TODO: Implement tiebreaker
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
 * Clean up trivia state
 */
export function cleanupTrivia(matchId: string): void {
  triviaStates.delete(matchId);
}

/**
 * Get question time remaining
 */
export function getTimeRemaining(matchId: string): number {
  const state = triviaStates.get(matchId);
  if (!state || state.status !== "question") return 0;

  const elapsed = (Date.now() - state.questionStartTime) / 1000;
  return Math.max(0, QUESTION_TIME_LIMIT - elapsed);
}
