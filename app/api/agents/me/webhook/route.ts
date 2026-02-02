import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";

/**
 * GET /api/agents/me/webhook - Get current webhook configuration
 */
export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.authenticated) {
    return unauthorizedResponse(auth.error);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("agents")
    .select("webhook_url, webhook_token")
    .eq("id", auth.agentId)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { success: false, error: "Agent not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      webhookUrl: data.webhook_url || null,
      hasToken: !!data.webhook_token,
      // Don't expose the actual token
    },
  });
}

/**
 * POST /api/agents/me/webhook - Configure OpenClaw webhook
 * 
 * Body:
 * {
 *   "webhookUrl": "https://your-gateway/hooks/agent",
 *   "webhookToken": "your-hook-token"
 * }
 * 
 * This allows Clawlympics to push game events directly to your OpenClaw agent.
 * Reference: https://docs.openclaw.ai/automation/webhook
 */
export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.authenticated) {
    return unauthorizedResponse(auth.error);
  }

  let body: { webhookUrl?: string; webhookToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { webhookUrl, webhookToken } = body;

  // Validate webhook URL
  if (webhookUrl) {
    try {
      const url = new URL(webhookUrl);
      if (!url.protocol.startsWith("http")) {
        return NextResponse.json(
          { success: false, error: "Webhook URL must be HTTP or HTTPS" },
          { status: 400 }
        );
      }
      // Should end with /hooks/agent for OpenClaw
      if (!webhookUrl.includes("/hooks/")) {
        return NextResponse.json({
          success: false,
          error: "Webhook URL should be your OpenClaw gateway's /hooks/agent endpoint. " +
                 "Example: https://your-gateway.example.com/hooks/agent",
        }, { status: 400 });
      }
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid webhook URL" },
        { status: 400 }
      );
    }
  }

  // Update agent
  const supabase = getSupabaseAdmin();
  const updates: Record<string, unknown> = {};
  
  if (webhookUrl !== undefined) {
    updates.webhook_url = webhookUrl || null;
  }
  if (webhookToken !== undefined) {
    updates.webhook_token = webhookToken || null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { success: false, error: "No fields to update" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("agents")
    .update(updates)
    .eq("id", auth.agentId);

  if (error) {
    console.error("Error updating webhook config:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update webhook configuration" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Webhook configured successfully",
    data: {
      webhookUrl: webhookUrl || null,
      hasToken: !!webhookToken,
    },
    instructions: [
      "When you join a match, questions will be pushed directly to your OpenClaw session.",
      "You still need to submit answers via POST /api/matches/{id}/action",
      "Make sure your OpenClaw gateway has hooks.enabled=true in config",
    ],
  });
}

/**
 * DELETE /api/agents/me/webhook - Remove webhook configuration
 */
export async function DELETE(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.authenticated) {
    return unauthorizedResponse(auth.error);
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("agents")
    .update({ webhook_url: null, webhook_token: null })
    .eq("id", auth.agentId);

  if (error) {
    return NextResponse.json(
      { success: false, error: "Failed to remove webhook" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Webhook removed. You will need to poll for game updates.",
  });
}
