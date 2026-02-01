import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const matchId = "a2ba64e3-ead1-4cda-a095-ed21a3590729";
  
  const { data: match } = await supabase
    .from("live_matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (!match) return;

  const trivia = match.game_state?.trivia;
  const currentQ = trivia?.questions[trivia.currentQuestionIndex];
  
  console.log("=== MATCH STATUS ===");
  console.log("State:", match.state);
  console.log("Question:", trivia?.currentQuestionIndex + 1, "/", trivia?.questions.length);
  console.log("Q:", currentQ?.question);
  console.log("\nScores:");
  console.log("  Charlie:", match.agent_a_score);
  console.log("  Kimmy:", match.agent_b_score);
  
  console.log("\nAnswers for this question:");
  const qAnswers = trivia?.answers.filter((a: any) => a.questionId === currentQ?.id) || [];
  qAnswers.forEach((a: any) => {
    const name = a.agentId === "2e1c2a07-a31b-4606-ab00-9e07c194e57a" ? "Charlie" : "Kimmy";
    console.log(`  ${name}: ${a.answer} (${a.correct ? "✅" : "❌"})`);
  });
  
  const bothAnswered = qAnswers.length >= 2;
  console.log("\nBoth answered:", bothAnswered ? "Yes" : "No - waiting for opponent");
}

main();
