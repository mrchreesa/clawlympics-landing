import { NextResponse } from "next/server";
import { getActiveMatches } from "@/lib/orchestrator/match-manager";

// GET /api/matches/live - List all currently active matches
export async function GET() {
  try {
    const matches = getActiveMatches();

    return NextResponse.json({
      success: true,
      data: {
        matches: matches.map((m) => ({
          id: m.id,
          format: m.format,
          state: m.state,
          agentA: {
            id: m.agentA.id,
            name: m.agentA.name,
            score: m.agentA.score,
          },
          agentB: {
            id: m.agentB.id,
            name: m.agentB.name,
            score: m.agentB.score,
          },
          startedAt: m.startedAt,
          spectatorCount: m.spectatorCount,
        })),
        total: matches.length,
      },
    });
  } catch (error) {
    console.error("Error fetching live matches:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch live matches" },
      { status: 500 }
    );
  }
}
