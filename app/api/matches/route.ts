import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { validateApiKey, unauthorizedResponse } from "@/lib/auth";

// GET /api/matches - List matches (public)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");
  const status = searchParams.get("status"); // optional filter
  const format = searchParams.get("format"); // optional filter
  const agent = searchParams.get("agent"); // optional: filter by agent id

  try {
    let query = supabase
      .from("matches")
      .select(`
        *,
        agent_a:agents!matches_agent_a_id_fkey(id, name, owner_handle, elo),
        agent_b:agents!matches_agent_b_id_fkey(id, name, owner_handle, elo),
        winner:agents!matches_winner_id_fkey(id, name),
        challenge:challenges(id, title, format, difficulty)
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("status", status);
    }
    if (format) {
      query = query.eq("format", format);
    }
    if (agent) {
      query = query.or(`agent_a_id.eq.${agent},agent_b_id.eq.${agent}`);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: {
        matches: data,
        total: count,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("Error fetching matches:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch matches" },
      { status: 500 }
    );
  }
}

// POST /api/matches - Create a new match
// Requires: Bot API key (bot must be one of the participants)
// Note: In production, matches are typically created by the orchestrator/matchmaking system
export async function POST(request: NextRequest) {
  // Authenticate the bot
  const auth = await validateApiKey(request);
  if (!auth.authenticated) {
    return unauthorizedResponse(auth.error);
  }

  try {
    const body = await request.json();
    const { format, opponent_id, challenge_id } = body;

    // The authenticated bot is always agent_a
    const agent_a_id = auth.agentId!;
    const agent_b_id = opponent_id;

    // Validate
    if (!format || !agent_b_id || !challenge_id) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: format, opponent_id, challenge_id" },
        { status: 400 }
      );
    }

    // Can't challenge yourself
    if (agent_a_id === agent_b_id) {
      return NextResponse.json(
        { success: false, error: "Cannot challenge yourself" },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();

    // Verify both agents exist and are verified
    const { data: agents } = await supabase
      .from("agents")
      .select("id, name, status")
      .in("id", [agent_a_id, agent_b_id]);

    if (!agents || agents.length !== 2) {
      return NextResponse.json(
        { success: false, error: "Opponent not found" },
        { status: 404 }
      );
    }

    const challenger = agents.find(a => a.id === agent_a_id);
    const opponent = agents.find(a => a.id === agent_b_id);

    if (challenger?.status !== "verified") {
      return NextResponse.json(
        { success: false, error: "Your agent must be verified to create matches" },
        { status: 403 }
      );
    }

    if (opponent?.status !== "verified") {
      return NextResponse.json(
        { success: false, error: "Opponent must be verified to compete" },
        { status: 400 }
      );
    }

    // Create match
    const { data: match, error } = await admin
      .from("matches")
      .insert([
        {
          format,
          agent_a_id,
          agent_b_id,
          challenge_id,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: { 
        match,
        message: `Match created: ${challenger?.name} vs ${opponent?.name}`,
      },
    });
  } catch (error) {
    console.error("Error creating match:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create match" },
      { status: 500 }
    );
  }
}
