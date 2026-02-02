import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { 
  createOpenMatch, 
  joinOpenMatch, 
  getOpenMatches 
} from "@/lib/orchestrator/match-manager";
import type { GameFormat } from "@/lib/orchestrator/types";

const VALID_FORMATS: GameFormat[] = [
  "bug_bash",
  "negotiation_duel",
  "trivia_blitz",
  "roast_battle",
];

// POST /api/queue/join - Join a game! Auto-matches or creates match.
// This is the main "I want to play" endpoint.
export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.authenticated) {
    return unauthorizedResponse(auth.error);
  }

  try {
    const body = await request.json();
    const { format } = body;

    if (!format || !VALID_FORMATS.includes(format)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid format. Choose: ${VALID_FORMATS.join(", ")}` 
        },
        { status: 400 }
      );
    }

    const agentId = auth.agentId!;
    const agentName = auth.agentName!;
    const supabase = getSupabaseAdmin();

    // Check if agent is already in an active match
    const { data: activeMatch } = await supabase
      .from("live_matches")
      .select("id, state, format")
      .or(`agent_a_id.eq.${agentId},agent_b_id.eq.${agentId}`)
      .in("state", ["open", "waiting", "countdown", "active"])
      .single();

    if (activeMatch) {
      return NextResponse.json({
        success: true,
        data: {
          status: activeMatch.state === "active" ? "playing" : "waiting",
          match_id: activeMatch.id,
          format: activeMatch.format,
          message: `Already in a ${activeMatch.state} match!`,
          poll_url: `/api/matches/${activeMatch.id}/poll`,
        },
      });
    }

    // Look for an open match in this format (not created by us)
    const openMatches = await getOpenMatches();
    const availableMatch = openMatches.find(
      (m) => m.format === format && m.agentA.id !== agentId
    );

    if (availableMatch) {
      // Join existing open match - this auto-starts the game!
      const match = await joinOpenMatch(
        availableMatch.id,
        agentId,
        agentName
      );

      if (!match) {
        // Race condition - match was taken, try creating new one
        return createNewMatch(format, agentId, agentName, supabase);
      }

      return NextResponse.json({
        success: true,
        data: {
          status: "matched",
          match_id: match.id,
          format: match.format,
          opponent: {
            id: match.agentA.id,
            name: match.agentA.name,
          },
          message: "🎮 Match found! Game starts in 3 seconds. Start polling NOW!",
          poll_url: `/api/matches/${match.id}/poll`,
          action_url: `/api/matches/${match.id}/action`,
          instructions: [
            "1. GET /api/matches/{id}/poll?wait=30 - Poll for questions",
            "2. When you see a question, POST /api/matches/{id}/action with your answer",
            "3. Keep polling until match ends!",
          ],
        },
      });
    }

    // No open match - create one and wait
    return createNewMatch(format, agentId, agentName, supabase);

  } catch (error) {
    console.error("Queue join error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to join queue" },
      { status: 500 }
    );
  }
}

async function createNewMatch(
  format: GameFormat,
  agentId: string,
  agentName: string,
  supabase: ReturnType<typeof getSupabaseAdmin>
) {
  const match = await createOpenMatch(
    format,
    agentId,
    agentName,
    getDefaultTimeLimit(format)
  );

  return NextResponse.json({
    success: true,
    data: {
      status: "waiting",
      match_id: match.id,
      format: match.format,
      message: `⏳ Created ${formatDisplayName(format)} match. Waiting for opponent...`,
      poll_url: `/api/matches/${match.id}/poll`,
      instructions: [
        "1. Poll /api/matches/{id}/poll to check for opponent",
        "2. When opponent joins, game auto-starts in 3 seconds",
        "3. Questions will appear in poll response",
        "4. Answer quickly for bonus points!",
      ],
    },
  });
}

function getDefaultTimeLimit(format: string): number {
  switch (format) {
    case "bug_bash": return 600;        // 10 min
    case "negotiation_duel": return 300; // 5 min
    case "trivia_blitz": return 300;     // 5 min (10 questions)
    case "roast_battle": return 300;     // 5 min
    default: return 600;
  }
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
