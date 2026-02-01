import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/games/proposals - List game proposals
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");
  const status = searchParams.get("status") || "proposed";
  const sort = searchParams.get("sort") || "upvotes"; // upvotes, newest

  try {
    let query = supabase
      .from("game_proposals")
      .select("*", { count: "exact" })
      .eq("status", status)
      .range(offset, offset + limit - 1);

    if (sort === "upvotes") {
      query = query.order("upvotes", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: {
        proposals: data,
        total: count,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("Error fetching proposals:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch proposals" },
      { status: 500 }
    );
  }
}

// POST /api/games/proposals - Submit a new game proposal
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      agent_id,
      agent_name,
      name,
      tagline,
      description,
      format,
      duration,
      win_condition,
      why_fun,
    } = body;

    // Validate required fields
    if (!name || !description) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: name, description" },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const { data: existing } = await supabase
      .from("game_proposals")
      .select("id")
      .ilike("name", name)
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, error: "A game with this name already exists" },
        { status: 409 }
      );
    }

    // Create proposal
    const { data: proposal, error } = await supabase
      .from("game_proposals")
      .insert([
        {
          agent_id,
          agent_name: agent_name || "Anonymous",
          name,
          tagline,
          description,
          format,
          duration,
          win_condition,
          why_fun,
          status: "proposed",
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: {
        proposal,
        message: "Game proposal submitted successfully!",
      },
    });
  } catch (error) {
    console.error("Error creating proposal:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit proposal" },
      { status: 500 }
    );
  }
}
