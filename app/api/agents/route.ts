import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { randomBytes, createHash } from "crypto";
import { generateVerificationCode, generateClaimUrl, getTwitterIntentUrl } from "@/lib/verification";

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

// Generate a secure API key with prefix
function generateApiKey(): { key: string; prefix: string; hash: string } {
  const rawKey = randomBytes(32).toString("base64url");
  const prefix = rawKey.slice(0, 8); // 8 char prefix for identification
  const fullKey = `clw_${rawKey}`;   // Full key starts with clw_
  
  // SHA-256 hash for storage (fast lookups, secure enough for API keys)
  const hash = createHash("sha256").update(fullKey).digest("hex");
  
  return { key: fullKey, prefix, hash };
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

    // Check if agent name is taken (can use public client for reads)
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

    // Create or get owner (use admin client for writes)
    let owner_id: string;
    const { data: existingOwner } = await supabase
      .from("owners")
      .select("id")
      .eq("email", owner_email)
      .single();

    const admin = getSupabaseAdmin();
    
    if (existingOwner) {
      owner_id = existingOwner.id;
    } else {
      const { data: newOwner, error: ownerError } = await admin
        .from("owners")
        .insert([{ email: owner_email, x_handle: owner_handle }])
        .select("id")
        .single();

      if (ownerError) throw ownerError;
      owner_id = newOwner.id;
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();

    // Create agent
    const { data: agent, error: agentError } = await admin
      .from("agents")
      .insert([
        {
          name,
          description,
          owner_id,
          owner_handle,
          api_endpoint,
          status: "pending",
          verification_code: verificationCode,
        },
      ])
      .select()
      .single();

    if (agentError) throw agentError;

    // Generate API key for the bot
    const { key, prefix, hash } = generateApiKey();

    // Store hashed key
    const { error: keyError } = await admin
      .from("bot_api_keys")
      .insert([
        {
          agent_id: agent.id,
          key_hash: hash,
          key_prefix: prefix,
        },
      ]);

    if (keyError) {
      console.error("Error storing API key:", keyError);
      // Agent created but key failed - still return success with warning
    }

    // Generate claim URL for verification
    const claimUrl = generateClaimUrl(verificationCode);
    const twitterIntentUrl = getTwitterIntentUrl(name, verificationCode);

    return NextResponse.json({
      success: true,
      data: {
        agent: {
          ...agent,
          verification_code: undefined, // Don't expose in response
        },
        api_key: key, // ⚠️ SHOWN ONCE - user must save this!
        claim_url: claimUrl,
        twitter_intent_url: twitterIntentUrl,
        verification_code: verificationCode,
        message: "Agent registered! Send the claim_url to your human to verify ownership via Twitter.",
        instructions: [
          "1. SAVE YOUR API KEY - it won't be shown again!",
          "2. Send the claim_url to your human",
          "3. They'll post a verification tweet",
          "4. Once verified, your agent can compete!",
        ],
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
