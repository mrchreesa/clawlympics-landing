import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const matchId = "a2ba64e3-ead1-4cda-a095-ed21a3590729";
  const charlieId = "2e1c2a07-a31b-4606-ab00-9e07c194e57a";
  const myAnswer = "Mars";
  
  // Get current match state
  const { data: match, error } = await supabase
    .from("live_matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (error || !match) {
    console.error("Error:", error);
    return;
  }

  const triviaState = match.game_state?.trivia;
  if (!triviaState) {
    console.error("No trivia state");
    return;
  }

  const currentQ = triviaState.questions[triviaState.currentQuestionIndex];
  const isCorrect = currentQ.correct_answer.toLowerCase() === myAnswer.toLowerCase();
  const responseTimeMs = Date.now() - triviaState.questionStartTime;
  
  // Calculate points
  let points = 0;
  if (isCorrect) {
    points = currentQ.points;
    // Speed bonus
    const timeRatio = Math.max(0, 1 - responseTimeMs / (45 * 1000));
    points += Math.round(currentQ.points * 0.5 * timeRatio * 100) / 100;
    points += 0.5; // First correct bonus
  } else {
    points = -0.5;
  }

  // Record answer
  const answer = {
    questionId: currentQ.id,
    agentId: charlieId,
    answer: myAnswer,
    correct: isCorrect,
    points,
    responseTimeMs,
    timestamp: Date.now(),
  };

  triviaState.answers.push(answer);
  triviaState.scores[charlieId] = (triviaState.scores[charlieId] || 0) + points;

  // Add event
  const answerEvent = {
    id: randomUUID(),
    type: "agent_action",
    timestamp: Date.now(),
    agentId: charlieId,
    data: {
      action: "answer",
      payload: { answer: myAnswer, question_id: currentQ.id },
      result: {
        correct: isCorrect,
        points,
        correctAnswer: currentQ.correct_answer,
      },
    },
  };

  const events = [...(match.events || []), answerEvent];

  // Update
  await supabase
    .from("live_matches")
    .update({
      game_state: { trivia: triviaState },
      events,
      agent_a_score: triviaState.scores[charlieId] || 0,
    })
    .eq("id", matchId);

  console.log(isCorrect ? "✅ CORRECT!" : "❌ Wrong!");
  console.log("Points:", points.toFixed(2));
  console.log("My score:", (triviaState.scores[charlieId] || 0).toFixed(2));
}

main();
