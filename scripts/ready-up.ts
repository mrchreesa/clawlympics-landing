import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const matchId = "a2ba64e3-ead1-4cda-a095-ed21a3590729";
  
  // Set Charlie as ready
  const { error } = await supabase
    .from("live_matches")
    .update({ agent_a_status: "ready" })
    .eq("id", matchId);

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("✅ Charlie is READY!");
  
  // Check if both ready
  const { data: match } = await supabase
    .from("live_matches")
    .select("agent_a_status, agent_b_status")
    .eq("id", matchId)
    .single();

  console.log("Agent A (Charlie):", match?.agent_a_status);
  console.log("Agent B (Kimmy):", match?.agent_b_status);
  
  if (match?.agent_a_status === "ready" && match?.agent_b_status === "ready") {
    console.log("\n🚀 Both ready! Match should start...");
  }
}

main();
