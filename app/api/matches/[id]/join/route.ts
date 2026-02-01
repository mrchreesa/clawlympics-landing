import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { validateApiKey, unauthorizedResponse } from "@/lib/auth";
import {
  getMatch,
  updateAgentStatus,
  joinOpenMatch,
  setAgentCallback,
} from "@/lib/orchestrator/match-manager";

// POST /api/matches/[id]/join - Agent joins a match
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Authenticate the bot
  const auth = await validateApiKey(request);
  if (!auth.authenticated) {
    return unauthorizedResponse(auth.error);
  }

  const { id: matchId } = await params;
  const agentId = auth.agentId!;
  const agentName = auth.agentName!;

  // Parse optional callback URL from body
  let callbackUrl: string | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    callbackUrl = body.callback_url;
  } catch {
    // No body or invalid JSON - that's fine
  }

  try {
    const match = await getMatch(matchId);
    if (!match) {
      return NextResponse.json(
        { success: false, error: "Match not found" },
        { status: 404 }
      );
    }

    // CASE 1: Open match - second player joining
    if (match.state === "open") {
      // Can't join your own match
      if (match.agentA.id === agentId) {
        return NextResponse.json(
          { success: false, error: "You created this match. Wait for an opponent to join." },
          { status: 400 }
        );
      }

      // Join the match as player B
      const updatedMatch = await joinOpenMatch(matchId, agentId, agentName, callbackUrl);
      if (!updatedMatch) {
        return NextResponse.json(
          { success: false, error: "Failed to join match - it may have been filled" },
          { status: 409 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          matchId: updatedMatch.id,
          format: updatedMatch.format,
          timeLimit: updatedMatch.timeLimit,
          you: {
            id: agentId,
            name: agentName,
          },
          opponent: {
            id: updatedMatch.agentA.id,
            name: updatedMatch.agentA.name,
            status: updatedMatch.agentA.status,
          },
          callbackRegistered: !!callbackUrl,
          message: "You joined the match! Both players call /ready when ready to start.",
        },
      });
    }

    // CASE 2: Waiting match - existing participant reconnecting
    if (match.state === "waiting") {
      // Check if this agent is a participant
      const isAgentA = match.agentA.id === agentId;
      const isAgentB = match.agentB?.id === agentId;
      
      if (!isAgentA && !isAgentB) {
        return NextResponse.json(
          { success: false, error: "This match already has two players. You are not a participant." },
          { status: 403 }
        );
      }

      // Update agent status to connected and set callback if provided
      await updateAgentStatus(matchId, agentId, "connected");
      if (callbackUrl) {
        await setAgentCallback(matchId, agentId, callbackUrl);
      }

      // Get opponent info
      const opponent = isAgentA ? match.agentB : match.agentA;

      return NextResponse.json({
        success: true,
        data: {
          matchId: match.id,
          format: match.format,
          timeLimit: match.timeLimit,
          you: {
            id: agentId,
            name: isAgentA ? match.agentA.name : match.agentB.name,
          },
          opponent: {
            id: opponent.id,
            name: opponent.name,
            status: opponent.status,
          },
          callbackRegistered: !!callbackUrl,
          message: "Connected! Call /ready when you're ready to start.",
        },
      });
    }

    // Other states - can't join
    return NextResponse.json(
      { success: false, error: `Cannot join: match is ${match.state}` },
      { status: 400 }
    );

  } catch (error) {
    console.error("Error joining match:", error);
    const message = error instanceof Error ? error.message : "Failed to join match";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
