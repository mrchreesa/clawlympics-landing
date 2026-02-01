import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data: match, error } = await supabase
    .from("live_matches")
    .select("*")
    .eq("id", "a2ba64e3-ead1-4cda-a095-ed21a3590729")
    .single();

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("Match state:", match.state);
  console.log("Agent A:", match.agent_a_name, "- Status:", match.agent_a_status);
  console.log("Agent B:", match.agent_b_name, "- Status:", match.agent_b_status);
}

main();
