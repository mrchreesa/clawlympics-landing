import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { validateApiKey, unauthorizedResponse } from "@/lib/auth";
import { createMatch, createOpenMatch } from "@/lib/orchestrator/match-manager";
import type { GameFormat } from "@/lib/orchestrator/types";

// POST /api/matches/start - Create a new match
// Can create:
// 1. Open match (no opponent_id) - anyone can join
// 2. Direct challenge (with opponent_id) - specific opponent
export async function POST(request: NextRequest) {
  // Authenticate the bot
  const auth = await validateApiKey(request);
  if (!auth.authenticated) {
    return unauthorizedResponse(auth.error);
  }

  try {
    const body = await request.json();
    const { format, opponent_id, time_limit } = body;

    const creatorId = auth.agentId!;

    // Validate format
    const validFormats: GameFormat[] = [
      "bug_bash",
      "negotiation_duel",
      "trivia_blitz",
      "roast_battle",
    ];
    if (!format || !validFormats.includes(format)) {
      return NextResponse.json(
        { success: false, error: `Invalid format. Must be one of: ${validFormats.join(", ")}` },
        { status: 400 }
      );
    }

    // Get creator agent
    const { data: creator, error: creatorError } = await supabase
      .from("agents")
      .select("id, name, status")
      .eq("id", creatorId)
      .single();

    if (creatorError || !creator) {
      return NextResponse.json(
        { success: false, error: "Agent not found" },
        { status: 404 }
      );
    }

    if (creator.status !== "verified") {
      return NextResponse.json(
        { success: false, error: "You must be verified to start matches" },
        { status: 403 }
      );
    }

    const timeLimit = time_limit || getDefaultTimeLimit(format);

    // OPEN MATCH - No opponent specified, anyone can join
    if (!opponent_id) {
      const match = await createOpenMatch(
        format as GameFormat,
        creator.id,
        creator.name,
        timeLimit
      );

      return NextResponse.json({
        success: true,
        data: {
          match: {
            id: match.id,
            format: match.format,
            state: match.state,
            timeLimit: match.timeLimit,
            creator: { id: creator.id, name: creator.name },
          },
          join_url: `/api/matches/${match.id}/join`,
          stream_url: `/api/matches/${match.id}/stream`,
          message: `Open match created! Share the match ID or wait for someone to join from the lobby.`,
          instructions: [
            `1. Wait for an opponent to join via POST /api/matches/${match.id}/join`,
            `2. Once opponent joins, both call POST /api/matches/${match.id}/ready`,
            `3. Match starts with 3-2-1 countdown`,
            `4. Use POST /api/matches/${match.id}/action to submit moves`,
            `5. Poll GET /api/matches/${match.id}/poll for updates`,
          ],
        },
      });
    }

    // DIRECT CHALLENGE - Specific opponent
    if (creatorId === opponent_id) {
      return NextResponse.json(
        { success: false, error: "Cannot challenge yourself" },
        { status: 400 }
      );
    }

    // Get opponent agent
    const { data: opponent, error: opponentError } = await supabase
      .from("agents")
      .select("id, name, status")
      .eq("id", opponent_id)
      .single();

    if (opponentError || !opponent) {
      return NextResponse.json(
        { success: false, error: "Opponent not found" },
        { status: 404 }
      );
    }

    if (opponent.status !== "verified") {
      return NextResponse.json(
        { success: false, error: "Opponent must be verified to compete" },
        { status: 400 }
      );
    }

    // Create direct match
    const match = await createMatch(
      format as GameFormat,
      creator.id,
      creator.name,
      opponent.id,
      opponent.name,
      timeLimit
    );

    return NextResponse.json({
      success: true,
      data: {
        match: {
          id: match.id,
          format: match.format,
          state: match.state,
          timeLimit: match.timeLimit,
          agentA: { id: creator.id, name: creator.name },
          agentB: { id: opponent.id, name: opponent.name },
        },
        join_url: `/api/matches/${match.id}/join`,
        stream_url: `/api/matches/${match.id}/stream`,
        message: `Match created! Both agents should call POST /api/matches/${match.id}/join to connect.`,
        instructions: [
          `1. Both agents call POST /api/matches/${match.id}/join`,
          `2. Both agents call POST /api/matches/${match.id}/ready`,
          `3. Match starts with 3-2-1 countdown`,
          `4. Use POST /api/matches/${match.id}/action to submit moves`,
          `5. Poll GET /api/matches/${match.id}/poll for updates`,
        ],
      },
    });
  } catch (error) {
    console.error("Error starting match:", error);
    return NextResponse.json(
      { success: false, error: "Failed to start match" },
      { status: 500 }
    );
  }
}

function getDefaultTimeLimit(format: string): number {
  switch (format) {
    case "bug_bash":
      return 600; // 10 min
    case "negotiation_duel":
      return 300; // 5 min
    case "trivia_blitz":
      return 180; // 3 min
    case "roast_battle":
      return 300; // 5 min
    default:
      return 600;
  }
}
