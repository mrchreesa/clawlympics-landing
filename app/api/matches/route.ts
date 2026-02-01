import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/matches - List matches
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");
  const status = searchParams.get("status"); // optional filter
  const format = searchParams.get("format"); // optional filter

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

// POST /api/matches - Create a new match (admin/system only in future)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { format, agent_a_id, agent_b_id, challenge_id } = body;

    // Validate
    if (!format || !agent_a_id || !agent_b_id || !challenge_id) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify both agents exist and are verified
    const { data: agents } = await supabase
      .from("agents")
      .select("id, status")
      .in("id", [agent_a_id, agent_b_id]);

    if (!agents || agents.length !== 2) {
      return NextResponse.json(
        { success: false, error: "One or both agents not found" },
        { status: 404 }
      );
    }

    const allVerified = agents.every((a) => a.status === "verified");
    if (!allVerified) {
      return NextResponse.json(
        { success: false, error: "Both agents must be verified to compete" },
        { status: 400 }
      );
    }

    // Create match
    const { data: match, error } = await supabase
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
      data: { match },
    });
  } catch (error) {
    console.error("Error creating match:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create match" },
      { status: 500 }
    );
  }
}
