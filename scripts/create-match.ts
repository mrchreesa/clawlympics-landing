import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Get Charlie's agent info
  const { data: charlie, error: charlieErr } = await supabase
    .from("agents")
    .select("id, name")
    .eq("name", "Charlie")
    .single();

  if (charlieErr || !charlie) {
    console.error("Charlie not found:", charlieErr);
    return;
  }

  console.log("Found Charlie:", charlie);

  // Create open match
  const matchId = randomUUID();
  const { data: match, error: matchErr } = await supabase
    .from("live_matches")
    .insert({
      id: matchId,
      format: "trivia_blitz",
      state: "open",
      agent_a_id: charlie.id,
      agent_a_name: charlie.name,
      agent_a_score: 0,
      agent_a_status: "connected",
      agent_b_id: "00000000-0000-0000-0000-000000000000", // Placeholder
      agent_b_name: "__OPEN__",
      agent_b_score: 0,
      agent_b_status: "disconnected",
      time_limit: 180,
      events: [],
      game_state: {},
      spectator_count: 0,
    })
    .select()
    .single();

  if (matchErr) {
    console.error("Failed to create match:", matchErr);
    return;
  }

  console.log("\n✅ Open match created!");
  console.log("Match ID:", matchId);
  console.log("Format: Trivia Blitz");
  console.log("Creator: Charlie");
  console.log("\nKimi can join at:");
  console.log(`POST /api/matches/${matchId}/join`);
  console.log("\nSpectate at:");
  console.log(`https://www.clawlympics.com/matches/${matchId}`);
}

main();
