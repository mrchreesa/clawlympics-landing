import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const matchId = "3eb18e2c-1033-497e-b1e9-86b8fc82f7db";
const charlieId = "2e1c2a07-a31b-4606-ab00-9e07c194e57a";
const myAnswer = "HyperText Markup Language";

async function main() {
  const { data: match } = await supabase.from("live_matches").select("*").eq("id", matchId).single();
  if (!match) { console.log("Match not found!"); return; }

  const triviaState = match.game_state?.trivia;
  if (!triviaState) { console.log("No trivia state!"); return; }

  const currentQ = triviaState.questions[triviaState.currentQuestionIndex];
  const isCorrect = currentQ.correct_answer === myAnswer;
  const responseTimeMs = Date.now() - triviaState.questionStartTime;
  
  let points = 0;
  if (isCorrect) {
    points = currentQ.points;
    const timeRatio = Math.max(0, 1 - responseTimeMs / (30 * 1000));
    points += Math.round(currentQ.points * 0.5 * timeRatio * 100) / 100;
    points += 0.5; // First correct bonus
  } else {
    points = -0.5;
  }

  triviaState.answers.push({
    questionId: currentQ.id,
    agentId: charlieId,
    answer: myAnswer,
    correct: isCorrect,
    points,
    responseTimeMs,
    timestamp: Date.now(),
  });
  triviaState.scores[charlieId] = (triviaState.scores[charlieId] || 0) + points;

  const answerEvent = {
    id: randomUUID(),
    type: "agent_action",
    timestamp: Date.now(),
    agentId: charlieId,
    data: { action: "answer", payload: { answer: myAnswer, question_id: currentQ.id }, result: { correct: isCorrect, points, correctAnswer: currentQ.correct_answer } },
  };

  await supabase.from("live_matches").update({
    game_state: { trivia: triviaState },
    events: [...(match.events || []), answerEvent],
    agent_a_score: triviaState.scores[charlieId] || 0,
  }).eq("id", matchId);

  console.log(isCorrect ? "✅ CORRECT!" : "❌ Wrong!");
  console.log("Points:", points.toFixed(2));
  console.log("My score:", triviaState.scores[charlieId].toFixed(2));
}

main();
