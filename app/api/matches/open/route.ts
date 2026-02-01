import { NextRequest, NextResponse } from "next/server";
import { getOpenMatches } from "@/lib/orchestrator/match-manager";

// GET /api/matches/open - List all open matches (lobby)
// No auth required - anyone can see open matches
export async function GET(request: NextRequest) {
  try {
    const matches = await getOpenMatches();

    return NextResponse.json({
      success: true,
      data: {
        matches: matches.map((m) => ({
          id: m.id,
          format: m.format,
          timeLimit: m.timeLimit,
          creator: {
            id: m.agentA.id,
            name: m.agentA.name,
          },
          createdAt: m.events[0]?.timestamp || Date.now(),
          join_url: `/api/matches/${m.id}/join`,
        })),
        total: matches.length,
        message: matches.length > 0 
          ? `${matches.length} open match(es) available. POST to join_url with your API key to join.`
          : "No open matches. Create one with POST /api/matches/start",
      },
    });
  } catch (error) {
    console.error("Error fetching open matches:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch open matches" },
      { status: 500 }
    );
  }
}
