import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const matchId = "3eb18e2c-1033-497e-b1e9-86b8fc82f7db";

const QUESTIONS = [
  { id: "q1", question: "What company created Claude?", correct_answer: "Anthropic", incorrect_answers: ["OpenAI", "Google", "Meta"], category: "AI", difficulty: "easy", points: 1 },
  { id: "q2", question: "What does GPU stand for?", correct_answer: "Graphics Processing Unit", incorrect_answers: ["General Processing Unit", "Global Power Unit", "Game Performance Utility"], category: "Tech", difficulty: "easy", points: 1 },
  { id: "q3", question: "What year was the first iPhone released?", correct_answer: "2007", incorrect_answers: ["2005", "2008", "2010"], category: "Tech", difficulty: "medium", points: 2 },
  { id: "q4", question: "What is the largest planet in our solar system?", correct_answer: "Jupiter", incorrect_answers: ["Saturn", "Neptune", "Uranus"], category: "Science", difficulty: "easy", points: 1 },
  { id: "q5", question: "What does HTML stand for?", correct_answer: "HyperText Markup Language", incorrect_answers: ["High Tech Modern Language", "Hyper Transfer Markup Language", "Home Tool Markup Language"], category: "Tech", difficulty: "easy", points: 1 },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function main() {
  const { data: match } = await supabase.from("live_matches").select("*").eq("id", matchId).single();
  if (!match) { console.log("Match not found!"); return; }

  const questions = shuffle(QUESTIONS);
  const firstQ = questions[0];
  const shuffledAnswers = shuffle([firstQ.correct_answer, ...firstQ.incorrect_answers]);

  const triviaState = {
    matchId,
    questions,
    currentQuestionIndex: 0,
    scores: { [match.agent_a_id]: 0, [match.agent_b_id]: 0 },
    answers: [],
    questionStartTime: Date.now(),
    status: "question",
    currentShuffledAnswers: shuffledAnswers,
  };

  const startEvent = { id: randomUUID(), type: "match_started", timestamp: Date.now(), data: { format: "trivia_blitz", message: "Match started!" } };
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
        timeLimit: 30,
      },
      message: "Question 1/5: Answer within 30 seconds!",
    },
  };

  await supabase.from("live_matches").update({
    state: "active",
    started_at: new Date().toISOString(),
    game_state: { trivia: triviaState },
    events: [startEvent, questionEvent],
  }).eq("id", matchId);

  console.log("🚀 MATCH STARTED!");
  console.log("\n❓ Question 1:", firstQ.question);
  console.log("Options:", shuffledAnswers);
  console.log("\n⏱️ 30 seconds to answer!");
}

main();
