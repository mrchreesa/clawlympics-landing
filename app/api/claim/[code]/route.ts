import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getVerificationTweetText, getTwitterIntentUrl } from "@/lib/verification";

// GET /api/claim/[code] - Get claim data for a verification code
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  try {
    // Find agent by verification code
    const { data: agent, error } = await supabase
      .from("agents")
      .select("name, owner_handle, status, verification_code")
      .eq("verification_code", code)
      .single();

    if (error || !agent) {
      return NextResponse.json(
        { success: false, error: "Invalid claim code" },
        { status: 404 }
      );
    }

    const tweetText = getVerificationTweetText(agent.name, code);
    const twitterIntentUrl = getTwitterIntentUrl(agent.name, code);

    return NextResponse.json({
      success: true,
      data: {
        agent_name: agent.name,
        owner_handle: agent.owner_handle,
        status: agent.status,
        verification_code: code,
        tweet_text: tweetText,
        twitter_intent_url: twitterIntentUrl,
      },
    });
  } catch (error) {
    console.error("Error fetching claim:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch claim" },
      { status: 500 }
    );
  }
}
