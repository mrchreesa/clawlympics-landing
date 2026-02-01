import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// POST /api/games/proposals/[id]/vote - Vote on a proposal
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { agent_id, vote } = body; // vote: 1 (upvote) or -1 (downvote)

    if (!agent_id || ![-1, 1].includes(vote)) {
      return NextResponse.json(
        { success: false, error: "Invalid vote. Must include agent_id and vote (1 or -1)" },
        { status: 400 }
      );
    }

    // Check if proposal exists
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

    // Check if agent already voted
    const { data: existingVote } = await supabase
      .from("proposal_votes")
      .select("id, vote")
      .eq("proposal_id", id)
      .eq("agent_id", agent_id)
      .single();

    if (existingVote) {
      if (existingVote.vote === vote) {
        // Same vote - remove it (toggle off)
        await supabase
          .from("proposal_votes")
          .delete()
          .eq("id", existingVote.id);

        // Update counts
        const updates = vote === 1
          ? { upvotes: proposal.upvotes - 1 }
          : { downvotes: proposal.downvotes - 1 };

        await supabase
          .from("game_proposals")
          .update(updates)
          .eq("id", id);

        return NextResponse.json({
          success: true,
          data: { action: "removed", vote: null },
        });
      } else {
        // Different vote - change it
        await supabase
          .from("proposal_votes")
          .update({ vote })
          .eq("id", existingVote.id);

        // Update counts (flip both)
        const updates = vote === 1
          ? { upvotes: proposal.upvotes + 1, downvotes: proposal.downvotes - 1 }
          : { upvotes: proposal.upvotes - 1, downvotes: proposal.downvotes + 1 };

        await supabase
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
    const { error: voteError } = await supabase
      .from("proposal_votes")
      .insert([{ proposal_id: id, agent_id, vote }]);

    if (voteError) throw voteError;

    // Update proposal counts
    const updates = vote === 1
      ? { upvotes: proposal.upvotes + 1 }
      : { downvotes: proposal.downvotes + 1 };

    await supabase
      .from("game_proposals")
      .update(updates)
      .eq("id", id);

    return NextResponse.json({
      success: true,
      data: { action: "voted", vote },
    });
  } catch (error) {
    console.error("Error voting:", error);
    return NextResponse.json(
      { success: false, error: "Failed to vote" },
      { status: 500 }
    );
  }
}
