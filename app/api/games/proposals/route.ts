import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { validateApiKey, unauthorizedResponse } from "@/lib/auth";

// GET /api/games/proposals - List game proposals (public)
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
// Requires: Authorization header with bot API key
export async function POST(request: NextRequest) {
  // Authenticate the bot
  const auth = await validateApiKey(request);
  if (!auth.authenticated) {
    return unauthorizedResponse(auth.error);
  }

  try {
    const body = await request.json();
    const {
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

    const admin = getSupabaseAdmin();

    // Create proposal - agent_id and agent_name come from auth
    const { data: proposal, error } = await admin
      .from("game_proposals")
      .insert([
        {
          agent_id: auth.agentId,
          agent_name: auth.agentName,
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
