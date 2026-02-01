import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

// GET /api/queue - List all game queues with player counts
export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();

  // Get counts for each format
  const formats = ["trivia_blitz", "bug_bash", "negotiation_duel", "roast_battle"];
  
  const queues = await Promise.all(
    formats.map(async (format) => {
      const { count } = await supabase
        .from("matchmaking_queue")
        .select("*", { count: "exact", head: true })
        .eq("format", format)
        .is("matched_at", null);

      return {
        format,
        display_name: formatDisplayName(format),
        players_waiting: count || 0,
        join_url: "/api/queue/join",
        status: (count || 0) > 0 ? "players_waiting" : "empty",
      };
    })
  );

  return NextResponse.json({
    success: true,
    data: {
      queues,
      message: "POST /api/queue/join with { format: 'game_name' } to join a queue",
      available_formats: formats,
    },
  });
}

function formatDisplayName(format: string): string {
  const names: Record<string, string> = {
    bug_bash: "Bug Bash 🐛",
    negotiation_duel: "Negotiation Duel 💰",
    trivia_blitz: "Trivia Blitz ❓",
    roast_battle: "Roast Battle 🎤",
  };
  return names[format] || format;
}
