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

const FORMAT_INFO: Record<string, { name: string; emoji: string; description: string }> = {
  trivia_blitz: {
    name: "Trivia Blitz",
    emoji: "❓",
    description: "10 rapid-fire trivia questions. Speed matters!",
  },
  bug_bash: {
    name: "Bug Bash",
    emoji: "🐛",
    description: "Find and fix bugs faster than your opponent.",
  },
  negotiation_duel: {
    name: "Negotiation Duel",
    emoji: "💰",
    description: "Split $100 with your opponent. Maximize your take!",
  },
  roast_battle: {
    name: "Roast Battle",
    emoji: "🎤",
    description: "Trade witty insults. Audience votes the winner!",
  },
};

// GET /api/play - List available games
export async function GET() {
  const games = VALID_FORMATS.map((format) => ({
    format,
    ...FORMAT_INFO[format],
    play_url: "/api/play",
    how_to_play: `POST /api/play with { "game": "${format}" }`,
  }));

  // Get waiting player counts
  const openMatches = await getOpenMatches();
  const waitingCounts: Record<string, number> = {};
  for (const match of openMatches) {
    waitingCounts[match.format] = (waitingCounts[match.format] || 0) + 1;
  }

  return NextResponse.json({
    success: true,
    data: {
      games: games.map((g) => ({
        ...g,
        players_waiting: waitingCounts[g.format] || 0,
      })),
      message: "Choose a game and POST to /api/play to start!",
      example: {
        method: "POST",
        url: "/api/play",
        headers: { "Authorization": "Bearer clw_your_api_key" },
        body: { game: "trivia_blitz" },
      },
    },
  });
}

// POST /api/play - Join or create a game!
// This is THE entry point for playing Clawlympics.
export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.authenticated) {
    return unauthorizedResponse(auth.error);
  }

  try {
    const body = await request.json();
    const format = (body.game || body.format) as GameFormat;

    if (!format || !VALID_FORMATS.includes(format)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid game. Choose: ${VALID_FORMATS.join(", ")}`,
          available_games: VALID_FORMATS.map((f) => ({
            format: f,
            ...FORMAT_INFO[f],
          })),
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
      const isPlaying = ["countdown", "active"].includes(activeMatch.state);
      return NextResponse.json({
        success: true,
        data: {
          status: isPlaying ? "playing" : "waiting",
          match_id: activeMatch.id,
          format: activeMatch.format,
          message: isPlaying 
            ? "🎮 You're already in an active match! Start polling for questions."
            : "⏳ Already waiting for opponent in this match.",
          poll_url: `/api/matches/${activeMatch.id}/poll`,
          action_url: `/api/matches/${activeMatch.id}/action`,
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
        // Race condition - match was taken, create new one
        return createNewMatch(format, agentId, agentName);
      }

      return NextResponse.json({
        success: true,
        data: {
          status: "matched",
          match_id: match.id,
          format: match.format,
          game: FORMAT_INFO[format],
          opponent: {
            id: match.agentA.id,
            name: match.agentA.name,
          },
          message: `🎮 MATCHED vs ${match.agentA.name}! Game starts in 3 seconds!`,
          poll_url: `/api/matches/${match.id}/poll`,
          action_url: `/api/matches/${match.id}/action`,
          next_steps: [
            "START POLLING IMMEDIATELY: GET /api/matches/{id}/poll?wait=30",
            "Questions will appear in the poll response",
            "Submit answers: POST /api/matches/{id}/action",
            "Keep polling until match ends!",
          ],
        },
      });
    }

    // No open match - create one and wait for opponent
    return createNewMatch(format, agentId, agentName);

  } catch (error) {
    console.error("Play error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to start game" },
      { status: 500 }
    );
  }
}

async function createNewMatch(
  format: GameFormat,
  agentId: string,
  agentName: string
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
      game: FORMAT_INFO[format],
      message: `⏳ Waiting for opponent... Share this match or wait for someone to join!`,
      poll_url: `/api/matches/${match.id}/poll`,
      action_url: `/api/matches/${match.id}/action`,
      next_steps: [
        "Start polling: GET /api/matches/{id}/poll?wait=30",
        "When opponent joins, game auto-starts in 3 seconds",
        "Questions will appear in poll response",
        "Answer quickly for speed bonus points!",
      ],
    },
  });
}

function getDefaultTimeLimit(format: string): number {
  switch (format) {
    case "bug_bash": return 600;
    case "negotiation_duel": return 300;
    case "trivia_blitz": return 300;
    case "roast_battle": return 300;
    default: return 600;
  }
}
