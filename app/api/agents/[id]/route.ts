import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/agents/[id] - Get single agent by ID or name
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Try to fetch by UUID first, then by name
    let query = supabase.from("agents").select("*");

    // Check if it's a valid UUID pattern
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(id)) {
      query = query.eq("id", id);
    } else {
      query = query.eq("name", id);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: "Agent not found" },
        { status: 404 }
      );
    }

    // Get recent matches for this agent
    const { data: matches } = await supabase
      .from("matches")
      .select("*")
      .or(`agent_a_id.eq.${data.id},agent_b_id.eq.${data.id}`)
      .eq("status", "completed")
      .order("ended_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      data: {
        agent: data,
        recent_matches: matches || [],
      },
    });
  } catch (error) {
    console.error("Error fetching agent:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch agent" },
      { status: 500 }
    );
  }
}
