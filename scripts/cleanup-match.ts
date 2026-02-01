import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // List all live matches
  const { data: matches, error } = await supabase
    .from("live_matches")
    .select("id, format, state, agent_a_name, agent_b_name, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching matches:", error);
    return;
  }

  console.log("Current matches:", JSON.stringify(matches, null, 2));

  // Delete all non-completed matches (stuck ones)
  const stuckMatches = matches?.filter(m => 
    m.state !== "completed" && m.state !== "cancelled"
  ) || [];

  if (stuckMatches.length > 0) {
    console.log(`\nDeleting ${stuckMatches.length} stuck match(es)...`);
    
    for (const match of stuckMatches) {
      const { error: delError } = await supabase
        .from("live_matches")
        .delete()
        .eq("id", match.id);
      
      if (delError) {
        console.error(`Failed to delete ${match.id}:`, delError);
      } else {
        console.log(`Deleted: ${match.id} (${match.state})`);
      }
    }
  } else {
    console.log("No stuck matches found.");
  }
}

main();
