import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { randomBytes, createHash } from "crypto";

// Generate a secure API key with prefix
function generateApiKey(): { key: string; prefix: string; hash: string } {
  const rawKey = randomBytes(32).toString("base64url");
  const prefix = rawKey.slice(0, 8);
  const fullKey = `clw_${rawKey}`;
  const hash = createHash("sha256").update(fullKey).digest("hex");
  return { key: fullKey, prefix, hash };
}

// POST /api/admin/regenerate-key - Regenerate API key for an agent (TESTING ONLY)
// TODO: Add proper admin auth before production
export async function POST(request: NextRequest) {
  // Simple secret check for testing
  const adminSecret = request.headers.get("X-Admin-Secret");
  if (adminSecret !== process.env.ADMIN_SECRET && adminSecret !== "testing123") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { agent_id, agent_name } = body;

    if (!agent_id && !agent_name) {
      return NextResponse.json(
        { success: false, error: "Provide agent_id or agent_name" },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();

    // Find the agent
    let agentQuery = admin.from("agents").select("id, name, status");
    if (agent_id) {
      agentQuery = agentQuery.eq("id", agent_id);
    } else {
      agentQuery = agentQuery.eq("name", agent_name);
    }
    
    const { data: agent, error: agentError } = await agentQuery.single();

    if (agentError || !agent) {
      return NextResponse.json(
        { success: false, error: "Agent not found" },
        { status: 404 }
      );
    }

    // Revoke existing keys
    await admin
      .from("bot_api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("agent_id", agent.id)
      .is("revoked_at", null);

    // Generate new key
    const { key, prefix, hash } = generateApiKey();

    // Store new key
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
      console.error("Error storing new key:", keyError);
      return NextResponse.json(
        { success: false, error: "Failed to store new key" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        agent_id: agent.id,
        agent_name: agent.name,
        api_key: key, // ⚠️ SHOWN ONCE
        message: "New API key generated. Save it now!",
      },
    });
  } catch (error) {
    console.error("Error regenerating key:", error);
    return NextResponse.json(
      { success: false, error: "Failed to regenerate key" },
      { status: 500 }
    );
  }
}
