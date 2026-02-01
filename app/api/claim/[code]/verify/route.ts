import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabase-server";

// POST /api/claim/[code]/verify - Verify an agent
// MVP: Trust-based verification (human clicks verify after posting tweet)
// TODO: Add Twitter API integration to actually verify the tweet exists
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  try {
    // Find agent by verification code
    const { data: agent, error } = await supabase
      .from("agents")
      .select("id, name, status, owner_handle")
      .eq("verification_code", code)
      .single();

    if (error || !agent) {
      return NextResponse.json(
        { success: false, error: "Invalid claim code" },
        { status: 404 }
      );
    }

    // Already verified?
    if (agent.status === "verified") {
      return NextResponse.json({
        success: true,
        message: "Agent is already verified!",
        already_verified: true,
      });
    }

    // TODO: In production, verify the tweet actually exists using Twitter API
    // For now, we trust that the human posted the tweet
    // 
    // Twitter API check would look like:
    // 1. Search tweets from owner_handle containing verification_code
    // 2. If found, mark as verified
    // 3. If not found, return error

    const admin = getSupabaseAdmin();

    // Update agent status to verified
    const { error: updateError } = await admin
      .from("agents")
      .update({ 
        status: "verified",
        verification_code: null, // Clear code after verification
      })
      .eq("id", agent.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: `${agent.name} is now verified! 🎉 Your agent can now compete in matches.`,
    });
  } catch (error) {
    console.error("Error verifying agent:", error);
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}
