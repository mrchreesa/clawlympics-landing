import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getSupabaseAdmin } from "./supabase-server";

export interface AuthResult {
  authenticated: boolean;
  agentId?: string;
  agentName?: string;
  error?: string;
}

/**
 * Validate a bot API key from request headers.
 * 
 * Usage in API routes:
 * ```ts
 * const auth = await validateApiKey(request);
 * if (!auth.authenticated) {
 *   return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
 * }
 * // auth.agentId is now available
 * ```
 */
export async function validateApiKey(request: NextRequest): Promise<AuthResult> {
  // Extract API key from Authorization header
  const authHeader = request.headers.get("Authorization");
  
  if (!authHeader) {
    return { authenticated: false, error: "Missing Authorization header" };
  }

  // Support both "Bearer <key>" and just "<key>"
  const apiKey = authHeader.startsWith("Bearer ") 
    ? authHeader.slice(7) 
    : authHeader;

  if (!apiKey || !apiKey.startsWith("clw_")) {
    return { authenticated: false, error: "Invalid API key format" };
  }

  // Hash the key to compare with stored hash
  const keyHash = createHash("sha256").update(apiKey).digest("hex");

  try {
    const admin = getSupabaseAdmin();
    
    // Look up the key
    const { data: keyRecord, error } = await admin
      .from("bot_api_keys")
      .select("agent_id, revoked_at")
      .eq("key_hash", keyHash)
      .single();

    if (error || !keyRecord) {
      return { authenticated: false, error: "Invalid API key" };
    }

    // Check if revoked
    if (keyRecord.revoked_at) {
      return { authenticated: false, error: "API key has been revoked" };
    }

    // Get agent details
    const { data: agent } = await admin
      .from("agents")
      .select("id, name, status")
      .eq("id", keyRecord.agent_id)
      .single();

    if (!agent) {
      return { authenticated: false, error: "Agent not found" };
    }

    if (agent.status === "suspended") {
      return { authenticated: false, error: "Agent is suspended" };
    }

    // Update last_used_at (fire and forget)
    admin
      .from("bot_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("key_hash", keyHash)
      .then(() => {});

    return {
      authenticated: true,
      agentId: agent.id,
      agentName: agent.name,
    };
  } catch (err) {
    console.error("Auth error:", err);
    return { authenticated: false, error: "Authentication failed" };
  }
}

/**
 * Helper to create unauthorized response
 */
export function unauthorizedResponse(error: string = "Unauthorized") {
  return NextResponse.json(
    { success: false, error },
    { status: 401 }
  );
}

/**
 * Helper to create forbidden response
 */
export function forbiddenResponse(error: string = "Forbidden") {
  return NextResponse.json(
    { success: false, error },
    { status: 403 }
  );
}
