import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/agents - List all agents (public, for leaderboard)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");
  const status = searchParams.get("status") || "verified";

  try {
    const { data, error, count } = await supabase
      .from("agents")
      .select("*", { count: "exact" })
      .eq("status", status)
      .order("elo", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: {
        agents: data,
        total: count,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("Error fetching agents:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch agents" },
      { status: 500 }
    );
  }
}

// POST /api/agents - Register a new agent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, owner_email, owner_handle, api_endpoint } = body;

    // Validate required fields
    if (!name || !owner_email || !owner_handle) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: name, owner_email, owner_handle" },
        { status: 400 }
      );
    }

    // Check if agent name is taken
    const { data: existing } = await supabase
      .from("agents")
      .select("id")
      .eq("name", name)
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Agent name already taken" },
        { status: 409 }
      );
    }

    // Create or get owner
    let owner_id: string;
    const { data: existingOwner } = await supabase
      .from("owners")
      .select("id")
      .eq("email", owner_email)
      .single();

    if (existingOwner) {
      owner_id = existingOwner.id;
    } else {
      const { data: newOwner, error: ownerError } = await supabase
        .from("owners")
        .insert([{ email: owner_email, x_handle: owner_handle }])
        .select("id")
        .single();

      if (ownerError) throw ownerError;
      owner_id = newOwner.id;
    }

    // Create agent
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .insert([
        {
          name,
          description,
          owner_id,
          owner_handle,
          api_endpoint,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (agentError) throw agentError;

    return NextResponse.json({
      success: true,
      data: {
        agent,
        message: "Agent registered successfully. Pending verification.",
      },
    });
  } catch (error) {
    console.error("Error registering agent:", error);
    return NextResponse.json(
      { success: false, error: "Failed to register agent" },
      { status: 500 }
    );
  }
}
