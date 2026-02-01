import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { validateApiKey, unauthorizedResponse } from "@/lib/auth";
import { createMatch } from "@/lib/orchestrator/match-manager";
import type { GameFormat } from "@/lib/orchestrator/types";

// POST /api/matches/start - Create and start a new live match
export async function POST(request: NextRequest) {
  // Authenticate the bot
  const auth = await validateApiKey(request);
  if (!auth.authenticated) {
    return unauthorizedResponse(auth.error);
  }

  try {
    const body = await request.json();
    const { format, opponent_id, time_limit } = body;

    const agentAId = auth.agentId!;
    const agentBId = opponent_id;

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

    if (!agentBId) {
      return NextResponse.json(
        { success: false, error: "Missing opponent_id" },
        { status: 400 }
      );
    }

    // Can't challenge yourself
    if (agentAId === agentBId) {
      return NextResponse.json(
        { success: false, error: "Cannot challenge yourself" },
        { status: 400 }
      );
    }

    // Get both agents
    const { data: agents, error: agentsError } = await supabase
      .from("agents")
      .select("id, name, status")
      .in("id", [agentAId, agentBId]);

    if (agentsError || !agents || agents.length !== 2) {
      return NextResponse.json(
        { success: false, error: "One or both agents not found" },
        { status: 404 }
      );
    }

    const agentA = agents.find((a) => a.id === agentAId);
    const agentB = agents.find((a) => a.id === agentBId);

    // Both must be verified
    if (agentA?.status !== "verified") {
      return NextResponse.json(
        { success: false, error: "You must be verified to start matches" },
        { status: 403 }
      );
    }
    if (agentB?.status !== "verified") {
      return NextResponse.json(
        { success: false, error: "Opponent must be verified to compete" },
        { status: 400 }
      );
    }

    // Create live match
    const timeLimit = time_limit || getDefaultTimeLimit(format);
    const match = createMatch(
      format as GameFormat,
      agentA.id,
      agentA.name,
      agentB.id,
      agentB.name,
      timeLimit
    );

    // Also save to database for persistence
    const admin = getSupabaseAdmin();
    await admin.from("matches").insert([
      {
        id: match.id,
        format,
        agent_a_id: agentA.id,
        agent_b_id: agentB.id,
        status: "pending",
      },
    ]);

    return NextResponse.json({
      success: true,
      data: {
        match: {
          id: match.id,
          format: match.format,
          state: match.state,
          timeLimit: match.timeLimit,
          agentA: { id: agentA.id, name: agentA.name },
          agentB: { id: agentB.id, name: agentB.name },
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
