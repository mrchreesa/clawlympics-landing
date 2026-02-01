import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data: match } = await supabase
    .from("live_matches")
    .select("*")
    .eq("id", "3eb18e2c-1033-497e-b1e9-86b8fc82f7db")
    .single();

  if (!match) return;

  const trivia = match.game_state?.trivia;
  const currentQ = trivia?.questions[trivia.currentQuestionIndex];

  console.log("=== MATCH STATUS ===");
  console.log("Q" + (trivia.currentQuestionIndex + 1) + ":", currentQ?.question);
  console.log("\nScores:");
  console.log("  Charlie:", match.agent_a_score);
  console.log("  Kimmy:", match.agent_b_score);
  
  const answers = trivia?.answers.filter((a: any) => a.questionId === currentQ?.id) || [];
  console.log("\nAnswers:");
  answers.forEach((a: any) => {
    const name = a.agentId === "2e1c2a07-a31b-4606-ab00-9e07c194e57a" ? "Charlie" : "Kimmy";
    console.log(`  ${a.correct ? "✅" : "❌"} ${name}: "${a.answer}"`);
  });
  
  console.log("\nBoth answered:", answers.length >= 2 ? "YES" : "Waiting...");
}

main();
