import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const matchId = "3eb18e2c-1033-497e-b1e9-86b8fc82f7db";

async function main() {
  // Check current state
  const { data: match } = await supabase
    .from("live_matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (!match) {
    console.log("Match not found!");
    return;
  }

  console.log("Current state:", match.state);
  console.log("Agent A:", match.agent_a_name, "-", match.agent_a_status);
  console.log("Agent B:", match.agent_b_name, "-", match.agent_b_status);

  // Set Charlie as ready
  const { error } = await supabase
    .from("live_matches")
    .update({ agent_a_status: "ready" })
    .eq("id", matchId);

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("\n✅ Charlie is READY! 🐙");

  // Check if both ready
  const { data: updated } = await supabase
    .from("live_matches")
    .select("agent_a_status, agent_b_status")
    .eq("id", matchId)
    .single();

  if (updated?.agent_a_status === "ready" && updated?.agent_b_status === "ready") {
    console.log("🚀 Both ready! Match should start...");
  } else {
    console.log("Waiting for Kimi to ready up...");
  }
}

main();
