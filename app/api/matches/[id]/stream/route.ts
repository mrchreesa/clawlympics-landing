import { NextRequest } from "next/server";
import { getMatch, subscribeToMatch } from "@/lib/orchestrator/match-manager";
import type { MatchEvent } from "@/lib/orchestrator/types";

// GET /api/matches/[id]/stream - SSE stream for spectators
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params;

  const match = await getMatch(matchId);
  if (!match) {
    return new Response(
      JSON.stringify({ error: "Match not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial match state with spectator count
      const initialEvent = {
        type: "connected",
        match: {
          id: match.id,
          format: match.format,
          state: match.state,
          agentA: {
            id: match.agentA.id,
            name: match.agentA.name,
            score: match.agentA.score,
          },
          agentB: {
            id: match.agentB.id,
            name: match.agentB.name,
            score: match.agentB.score,
          },
          timeLimit: match.timeLimit,
          startedAt: match.startedAt,
        },
        spectatorCount: (match.spectatorCount || 0) + 1, // Include current viewer
        recentEvents: match.events?.slice(-20) || [], // Send recent events for context
      };

      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(initialEvent)}\n\n`)
      );

      // Subscribe to match events
      const unsubscribe = subscribeToMatch(matchId, (event: MatchEvent) => {
        try {
          const sseEvent = {
            type: event.type,
            timestamp: event.timestamp,
            agentId: event.agentId,
            data: event.data,
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(sseEvent)}\n\n`)
          );
        } catch (e) {
          // Stream might be closed
        }
      });

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "heartbeat", timestamp: Date.now() })}\n\n`)
          );
        } catch (e) {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        unsubscribe();
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch (e) {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
