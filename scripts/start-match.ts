import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Trivia questions (hardcoded fallback)
const QUESTIONS = [
  {
    id: "q1",
    question: "What company created Claude?",
    correct_answer: "Anthropic",
    incorrect_answers: ["OpenAI", "Google", "Meta"],
    category: "AI",
    difficulty: "easy",
    points: 1,
  },
  {
    id: "q2", 
    question: "What does LLM stand for in AI?",
    correct_answer: "Large Language Model",
    incorrect_answers: ["Linear Learning Machine", "Logical Language Module", "Limited Learning Model"],
    category: "AI",
    difficulty: "medium",
    points: 2,
  },
  {
    id: "q3",
    question: "What planet is known as the Red Planet?",
    correct_answer: "Mars",
    incorrect_answers: ["Venus", "Jupiter", "Saturn"],
    category: "Science",
    difficulty: "easy",
    points: 1,
  },
  {
    id: "q4",
    question: "What AI beat the world champion in Go in 2016?",
    correct_answer: "AlphaGo",
    incorrect_answers: ["Deep Blue", "Watson", "GPT-3"],
    category: "AI",
    difficulty: "medium",
    points: 2,
  },
  {
    id: "q5",
    question: "What does GPU stand for?",
    correct_answer: "Graphics Processing Unit",
    incorrect_answers: ["General Processing Unit", "Graphical Program Utility", "Gaming Performance Unit"],
    category: "Tech",
    difficulty: "easy",
    points: 1,
  },
];

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function main() {
  const matchId = "a2ba64e3-ead1-4cda-a095-ed21a3590729";
  
  // Initialize trivia state
  const questions = shuffle(QUESTIONS);
  const firstQ = questions[0];
  const shuffledAnswers = shuffle([firstQ.correct_answer, ...firstQ.incorrect_answers]);
  
  const triviaState = {
    matchId,
    questions,
    currentQuestionIndex: 0,
    scores: {},
    answers: [],
    questionStartTime: Date.now(),
    status: "question",
    currentShuffledAnswers: shuffledAnswers,
  };
  
  // Start match
  const startEvent = {
    id: randomUUID(),
    type: "match_started",
    timestamp: Date.now(),
    data: {
      format: "trivia_blitz",
      timeLimit: 180,
      message: "Match started! Listen for 'challenge' events.",
    },
  };
  
  // Push first question event
  const questionEvent = {
    id: randomUUID(),
    type: "challenge",
    timestamp: Date.now(),
    data: {
      question: {
        questionId: firstQ.id,
        questionNumber: 1,
        totalQuestions: questions.length,
        category: firstQ.category,
        difficulty: firstQ.difficulty,
        question: firstQ.question,
        answers: shuffledAnswers,
        points: firstQ.points,
        timeLimit: 45,
      },
      message: "Question 1/5: Answer within 45 seconds!",
    },
  };
  
  const { error } = await supabase
    .from("live_matches")
    .update({
      state: "active",
      started_at: new Date().toISOString(),
      game_state: { trivia: triviaState },
      events: [startEvent, questionEvent],
    })
    .eq("id", matchId);

  if (error) {
    console.error("Error starting match:", error);
    return;
  }

  console.log("🚀 Match STARTED!");
  console.log("\n📝 Question 1:", firstQ.question);
  console.log("Options:", shuffledAnswers);
  console.log("\n⏱️ 45 seconds to answer!");
  console.log("\nSpectate: https://www.clawlympics.com/matches/" + matchId);
}

main();
