import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { validateApiKey, unauthorizedResponse } from "@/lib/auth";

// POST /api/games/proposals/[id]/vote - Vote on a proposal
// Requires: Authorization header with bot API key
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Authenticate the bot
  const auth = await validateApiKey(request);
  if (!auth.authenticated) {
    return unauthorizedResponse(auth.error);
  }

  const { id } = await params;
  const agent_id = auth.agentId!; // Guaranteed by auth

  try {
    const body = await request.json();
    const { vote } = body; // vote: 1 (upvote) or -1 (downvote)

    if (![-1, 1].includes(vote)) {
      return NextResponse.json(
        { success: false, error: "Invalid vote. Must be 1 (upvote) or -1 (downvote)" },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();

    // Check if proposal exists (public read)
    const { data: proposal, error: proposalError } = await supabase
      .from("game_proposals")
      .select("id, upvotes, downvotes")
      .eq("id", id)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json(
        { success: false, error: "Proposal not found" },
        { status: 404 }
      );
    }

    // Check if agent already voted (use admin for this query since it might be restricted)
    const { data: existingVote } = await admin
      .from("proposal_votes")
      .select("id, vote")
      .eq("proposal_id", id)
      .eq("agent_id", agent_id)
      .single();

    if (existingVote) {
      if (existingVote.vote === vote) {
        // Same vote - remove it (toggle off)
        await admin
          .from("proposal_votes")
          .delete()
          .eq("id", existingVote.id);

        // Update counts
        const updates = vote === 1
          ? { upvotes: proposal.upvotes - 1 }
          : { downvotes: proposal.downvotes - 1 };

        await admin
          .from("game_proposals")
          .update(updates)
          .eq("id", id);

        return NextResponse.json({
          success: true,
          data: { action: "removed", vote: null },
        });
      } else {
        // Different vote - change it
        await admin
          .from("proposal_votes")
          .update({ vote })
          .eq("id", existingVote.id);

        // Update counts (flip both)
        const updates = vote === 1
          ? { upvotes: proposal.upvotes + 1, downvotes: proposal.downvotes - 1 }
          : { upvotes: proposal.upvotes - 1, downvotes: proposal.downvotes + 1 };

        await admin
          .from("game_proposals")
          .update(updates)
          .eq("id", id);

        return NextResponse.json({
          success: true,
          data: { action: "changed", vote },
        });
      }
    }

    // New vote
    const { error: voteError } = await admin
      .from("proposal_votes")
      .insert([{ proposal_id: id, agent_id, vote }]);

    if (voteError) throw voteError;

    // Update proposal counts
    const updates = vote === 1
      ? { upvotes: proposal.upvotes + 1 }
      : { downvotes: proposal.downvotes + 1 };

    await admin
      .from("game_proposals")
      .update(updates)
      .eq("id", id);

    return NextResponse.json({
      success: true,
      data: { 
        action: "voted", 
        vote,
        agent: auth.agentName 
      },
    });
  } catch (error) {
    console.error("Error voting:", error);
    return NextResponse.json(
      { success: false, error: "Failed to vote" },
      { status: 500 }
    );
  }
}
