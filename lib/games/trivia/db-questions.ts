/**
 * Database-backed trivia questions
 * Fetches random questions from Supabase instead of hardcoded list
 */

import { getSupabaseAdmin } from "@/lib/supabase-server";

export interface DBTriviaQuestion {
  id: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
  category: string;
  difficulty: "easy" | "medium" | "hard";
  points: number;
}

/**
 * Fetch random questions from the database
 * Returns a balanced mix of difficulties
 */
export async function getRandomQuestionsFromDB(count: number = 10): Promise<DBTriviaQuestion[]> {
  const supabase = getSupabaseAdmin();
  
  // Get a mix of difficulties: 4 easy, 4 medium, 2 hard
  const easyCount = Math.floor(count * 0.4);
  const mediumCount = Math.floor(count * 0.4);
  const hardCount = count - easyCount - mediumCount;
  
  const [easyResult, mediumResult, hardResult] = await Promise.all([
    supabase
      .from("trivia_questions")
      .select("*")
      .eq("difficulty", "easy")
      .limit(easyCount * 3) // Fetch more to randomize
      .order("created_at", { ascending: false }),
    supabase
      .from("trivia_questions")
      .select("*")
      .eq("difficulty", "medium")
      .limit(mediumCount * 3)
      .order("created_at", { ascending: false }),
    supabase
      .from("trivia_questions")
      .select("*")
      .eq("difficulty", "hard")
      .limit(hardCount * 3)
      .order("created_at", { ascending: false }),
  ]);
  
  // Shuffle and pick the right number from each difficulty
  const shuffle = <T>(arr: T[]): T[] => arr.sort(() => Math.random() - 0.5);
  
  const easy = shuffle(easyResult.data || []).slice(0, easyCount);
  const medium = shuffle(mediumResult.data || []).slice(0, mediumCount);
  const hard = shuffle(hardResult.data || []).slice(0, hardCount);
  
  // Combine and shuffle all questions
  const allQuestions = shuffle([...easy, ...medium, ...hard]);
  
  return allQuestions.map(q => ({
    id: q.id,
    question: q.question,
    correct_answer: q.correct_answer,
    incorrect_answers: q.incorrect_answers,
    category: q.category,
    difficulty: q.difficulty,
    points: q.points,
  }));
}

/**
 * Convert DB question to the format used by trivia-manager
 */
export function convertDBQuestion(dbQ: DBTriviaQuestion): {
  id: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
  category: string;
  difficulty: "easy" | "medium" | "hard";
  points: number;
} {
  return {
    id: dbQ.id,
    question: dbQ.question,
    correct_answer: dbQ.correct_answer,
    incorrect_answers: dbQ.incorrect_answers,
    category: dbQ.category,
    difficulty: dbQ.difficulty,
    points: dbQ.points,
  };
}

/**
 * Get shuffled answer options (correct + incorrect, randomized)
 */
export function getShuffledAnswersDB(question: DBTriviaQuestion): string[] {
  const allAnswers = [question.correct_answer, ...question.incorrect_answers];
  return allAnswers.sort(() => Math.random() - 0.5);
}

/**
 * Check if an answer is correct (case-insensitive)
 */
export function checkAnswerDB(question: DBTriviaQuestion, answer: string): boolean {
  return question.correct_answer.toLowerCase().trim() === answer.toLowerCase().trim();
}

/**
 * Get total question count in database
 */
export async function getQuestionCount(): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase
    .from("trivia_questions")
    .select("*", { count: "exact", head: true });
  
  return count || 0;
}
