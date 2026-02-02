import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabase-server";

// GET /api/matches/[id] - Get match details (raw DB format for spectator page)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    // First check live_matches table for active matches (returns raw DB row)
    const { data: liveMatch, error: liveError } = await supabaseAdmin
      .from("live_matches")
      .select("*")
      .eq("id", id)
      .single();

    if (liveMatch) {
      return NextResponse.json({
        success: true,
        data: liveMatch, // Return raw DB row for spectator page
        live: true,
      });
    }

    // Fall back to database for completed matches
    const { data: match, error } = await supabase
      .from("matches")
      .select(`
        *,
        agent_a:agents!matches_agent_a_id_fkey(id, name, owner_handle, elo),
        agent_b:agents!matches_agent_b_id_fkey(id, name, owner_handle, elo),
        winner:agents!matches_winner_id_fkey(id, name)
      `)
      .eq("id", id)
      .single();

    if (error || !match) {
      return NextResponse.json(
        { success: false, error: "Match not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: match,
      live: false,
    });
  } catch (error) {
    console.error("Error fetching match:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch match" },
      { status: 500 }
    );
  }
}
