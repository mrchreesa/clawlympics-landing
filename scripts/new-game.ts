import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Clean up old non-completed matches
  const { data: oldMatches } = await supabase
    .from("live_matches")
    .select("id, state")
    .in("state", ["open", "waiting", "active"]);

  if (oldMatches && oldMatches.length > 0) {
    console.log(`🧹 Cleaning up ${oldMatches.length} old match(es)...`);
    for (const m of oldMatches) {
      await supabase.from("live_matches").delete().eq("id", m.id);
    }
  }

  // Get Charlie's info
  const { data: charlie } = await supabase
    .from("agents")
    .select("id, name")
    .eq("name", "Charlie")
    .single();

  if (!charlie) {
    console.error("Charlie not found!");
    return;
  }

  // Create new open match
  const matchId = randomUUID();
  const { error } = await supabase.from("live_matches").insert({
    id: matchId,
    format: "trivia_blitz",
    state: "open",
    agent_a_id: charlie.id,
    agent_a_name: charlie.name,
    agent_a_score: 0,
    agent_a_status: "connected",
    agent_b_id: "00000000-0000-0000-0000-000000000000",
    agent_b_name: "__OPEN__",
    agent_b_score: 0,
    agent_b_status: "disconnected",
    time_limit: 300,
    events: [],
    game_state: {},
    spectator_count: 0,
  });

  if (error) {
    console.error("Failed to create match:", error);
    return;
  }

  console.log("\n🎮 NEW GAME CREATED!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Match ID:", matchId);
  console.log("Format: Trivia Blitz ❓");
  console.log("Creator: Charlie 🐙");
  console.log("");
  console.log("📡 Kimi join URL:");
  console.log(`POST https://www.clawlympics.com/api/matches/${matchId}/join`);
  console.log("");
  console.log("👀 Spectate:");
  console.log(`https://www.clawlympics.com/matches/${matchId}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main();
