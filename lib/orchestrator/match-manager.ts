/**
 * Match Manager
 * Handles match lifecycle and state management
 * Uses Supabase for persistent storage
 */

import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import type {
  Match,
  MatchState,
  MatchEvent,
  MatchAgent,
  GameFormat,
  AgentStatus,
} from "./types";

// In-memory subscribers (per-instance, for SSE)
const matchSubscribers = new Map<string, Set<(event: MatchEvent) => void>>();

// Local cache for active matches (refreshed on read)
const matchCache = new Map<string, { match: Match; timestamp: number }>();
const CACHE_TTL = 2000; // 2 seconds

/**
 * Convert DB row to Match object
 */
function dbToMatch(row: Record<string, unknown>): Match {
  return {
    id: row.id as string,
    format: row.format as GameFormat,
    state: row.state as MatchState,
    agentA: {
      id: row.agent_a_id as string,
      name: row.agent_a_name as string,
      status: row.agent_a_status as AgentStatus,
      score: Number(row.agent_a_score) || 0,
      lastAction: Date.now(),
    },
    agentB: {
      id: row.agent_b_id as string,
      name: row.agent_b_name as string,
      status: row.agent_b_status as AgentStatus,
      score: Number(row.agent_b_score) || 0,
      lastAction: Date.now(),
    },
    winnerId: row.winner_id as string | null,
    startedAt: row.started_at ? new Date(row.started_at as string).getTime() : null,
    endedAt: row.ended_at ? new Date(row.ended_at as string).getTime() : null,
    timeLimit: row.time_limit as number,
    spectatorCount: row.spectator_count as number,
    events: (row.events as MatchEvent[]) || [],
    gameState: row.game_state as Record<string, unknown>,
  };
}

/**
 * Create a new match
 */
export async function createMatch(
  format: GameFormat,
  agentAId: string,
  agentAName: string,
  agentBId: string,
  agentBName: string,
  timeLimit: number = 600
): Promise<Match> {
  const supabase = getSupabaseAdmin();
  const id = randomUUID();

  const matchData = {
    id,
    format,
    state: "waiting",
    agent_a_id: agentAId,
    agent_a_name: agentAName,
    agent_a_score: 0,
    agent_a_status: "disconnected",
    agent_b_id: agentBId,
    agent_b_name: agentBName,
    agent_b_score: 0,
    agent_b_status: "disconnected",
    time_limit: timeLimit,
    events: [],
    game_state: {},
    spectator_count: 0,
  };

  const { data, error } = await supabase
    .from("live_matches")
    .insert(matchData)
    .select()
    .single();

  if (error) {
    console.error("Error creating match:", error);
    throw new Error("Failed to create match");
  }

  const match = dbToMatch(data);
  matchSubscribers.set(match.id, new Set());
  matchCache.set(match.id, { match, timestamp: Date.now() });

  return match;
}

/**
 * Get a match by ID
 */
export async function getMatch(matchId: string): Promise<Match | null> {
  // Check cache first
  const cached = matchCache.get(matchId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.match;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("live_matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (error || !data) {
    return null;
  }

  const match = dbToMatch(data);
  matchCache.set(matchId, { match, timestamp: Date.now() });
  
  // Ensure subscribers set exists
  if (!matchSubscribers.has(matchId)) {
    matchSubscribers.set(matchId, new Set());
  }

  return match;
}

/**
 * Get a match synchronously from cache (for non-async contexts)
 */
export function getMatchSync(matchId: string): Match | null {
  const cached = matchCache.get(matchId);
  return cached?.match || null;
}

/**
 * Get all active matches
 */
export async function getActiveMatches(): Promise<Match[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("live_matches")
    .select("*")
    .in("state", ["waiting", "countdown", "active"])
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(dbToMatch);
}

/**
 * Update match in database
 */
async function updateMatch(matchId: string, updates: Record<string, unknown>): Promise<Match | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("live_matches")
    .update(updates)
    .eq("id", matchId)
    .select()
    .single();

  if (error || !data) {
    console.error("Error updating match:", error);
    return null;
  }

  const match = dbToMatch(data);
  matchCache.set(matchId, { match, timestamp: Date.now() });
  return match;
}

/**
 * Update agent status in a match
 */
export async function updateAgentStatus(
  matchId: string,
  agentId: string,
  status: AgentStatus
): Promise<Match | null> {
  const match = await getMatch(matchId);
  if (!match) return null;

  const isAgentA = match.agentA.id === agentId;
  const isAgentB = match.agentB.id === agentId;
  if (!isAgentA && !isAgentB) return null;

  const updates: Record<string, unknown> = isAgentA
    ? { agent_a_status: status }
    : { agent_b_status: status };

  const updatedMatch = await updateMatch(matchId, updates);
  if (!updatedMatch) return null;

  // Emit event
  await emitEvent(matchId, {
    id: randomUUID(),
    type: status === "connected" ? "agent_connected" : "agent_disconnected",
    timestamp: Date.now(),
    agentId,
    data: { status },
  });

  // Check if both agents are ready
  if (
    updatedMatch.state === "waiting" &&
    updatedMatch.agentA.status === "ready" &&
    updatedMatch.agentB.status === "ready"
  ) {
    startCountdown(matchId);
  }

  return updatedMatch;
}

/**
 * Mark agent as ready
 */
export async function setAgentReady(matchId: string, agentId: string): Promise<Match | null> {
  return updateAgentStatus(matchId, agentId, "ready");
}

/**
 * Start countdown before match
 */
async function startCountdown(matchId: string): Promise<void> {
  const match = await getMatch(matchId);
  if (!match || match.state !== "waiting") return;

  await updateMatch(matchId, { state: "countdown" });

  // 3-2-1 countdown
  for (let i = 3; i > 0; i--) {
    await emitEvent(matchId, {
      id: randomUUID(),
      type: "match_countdown",
      timestamp: Date.now(),
      data: { count: i },
    });
    await sleep(1000);
  }

  await startMatch(matchId);
}

/**
 * Start the match
 */
async function startMatch(matchId: string): Promise<void> {
  const match = await getMatch(matchId);
  if (!match) return;

  await updateMatch(matchId, {
    state: "active",
    started_at: new Date().toISOString(),
  });

  await emitEvent(matchId, {
    id: randomUUID(),
    type: "match_started",
    timestamp: Date.now(),
    data: {
      format: match.format,
      timeLimit: match.timeLimit,
      agentA: { id: match.agentA.id, name: match.agentA.name },
      agentB: { id: match.agentB.id, name: match.agentB.name },
    },
  });

  // Set timeout for match end
  setTimeout(async () => {
    const currentMatch = await getMatch(matchId);
    if (currentMatch?.state === "active") {
      await endMatch(matchId, "timeout");
    }
  }, match.timeLimit * 1000);
}

/**
 * Update agent score
 */
export async function updateScore(
  matchId: string,
  agentId: string,
  score: number
): Promise<Match | null> {
  const match = await getMatch(matchId);
  if (!match || match.state !== "active") return null;

  const isAgentA = match.agentA.id === agentId;
  const isAgentB = match.agentB.id === agentId;
  if (!isAgentA && !isAgentB) return null;

  const updates: Record<string, unknown> = isAgentA
    ? { agent_a_score: score }
    : { agent_b_score: score };

  const updatedMatch = await updateMatch(matchId, updates);
  if (!updatedMatch) return null;

  await emitEvent(matchId, {
    id: randomUUID(),
    type: "score_update",
    timestamp: Date.now(),
    agentId,
    data: {
      score,
      agentA: { id: updatedMatch.agentA.id, score: updatedMatch.agentA.score },
      agentB: { id: updatedMatch.agentB.id, score: updatedMatch.agentB.score },
    },
  });

  return updatedMatch;
}

/**
 * Record an agent action
 */
export async function recordAction(
  matchId: string,
  agentId: string,
  action: Record<string, unknown>
): Promise<Match | null> {
  const match = await getMatch(matchId);
  if (!match || match.state !== "active") return null;

  const isAgentA = match.agentA.id === agentId;
  const isAgentB = match.agentB.id === agentId;
  if (!isAgentA && !isAgentB) return null;

  await emitEvent(matchId, {
    id: randomUUID(),
    type: "agent_action",
    timestamp: Date.now(),
    agentId,
    data: action,
  });

  return match;
}

/**
 * End the match
 */
export async function endMatch(
  matchId: string,
  reason: "completed" | "timeout" | "disconnect" | "forfeit",
  winnerId?: string
): Promise<Match | null> {
  const match = await getMatch(matchId);
  if (!match) return null;

  const newState = reason === "disconnect" ? "cancelled" : "completed";

  // Determine winner if not provided
  if (!winnerId && reason !== "disconnect") {
    if (match.agentA.score > match.agentB.score) {
      winnerId = match.agentA.id;
    } else if (match.agentB.score > match.agentA.score) {
      winnerId = match.agentB.id;
    }
  }

  const updatedMatch = await updateMatch(matchId, {
    state: newState,
    ended_at: new Date().toISOString(),
    winner_id: winnerId || null,
  });

  if (!updatedMatch) return null;

  await emitEvent(matchId, {
    id: randomUUID(),
    type: newState === "cancelled" ? "match_cancelled" : "match_completed",
    timestamp: Date.now(),
    data: {
      reason,
      winnerId: winnerId || null,
      winnerName: winnerId
        ? (match.agentA.id === winnerId ? match.agentA.name : match.agentB.name)
        : null,
      finalScores: {
        [match.agentA.id]: match.agentA.score,
        [match.agentB.id]: match.agentB.score,
      },
      duration: match.startedAt
        ? Math.floor((Date.now() - match.startedAt) / 1000)
        : 0,
    },
  });

  // Clean up subscribers after a delay
  setTimeout(() => {
    matchSubscribers.delete(matchId);
    matchCache.delete(matchId);
  }, 60000);

  return updatedMatch;
}

/**
 * Subscribe to match events (for SSE)
 */
export function subscribeToMatch(
  matchId: string,
  callback: (event: MatchEvent) => void
): () => void {
  let subscribers = matchSubscribers.get(matchId);
  if (!subscribers) {
    subscribers = new Set();
    matchSubscribers.set(matchId, subscribers);
  }

  subscribers.add(callback);

  // Update spectator count in DB (fire and forget)
  updateMatch(matchId, { spectator_count: subscribers.size }).catch(() => {});

  return () => {
    subscribers?.delete(callback);
    updateMatch(matchId, { spectator_count: subscribers?.size || 0 }).catch(() => {});
  };
}

/**
 * Emit an event to all subscribers and store in DB
 */
async function emitEvent(matchId: string, event: MatchEvent): Promise<void> {
  // Get current events and append
  const match = await getMatch(matchId);
  if (match) {
    const events = [...match.events, event].slice(-100); // Keep last 100
    await updateMatch(matchId, { events });
  }

  // Notify local subscribers
  const subscribers = matchSubscribers.get(matchId);
  if (subscribers) {
    for (const callback of subscribers) {
      try {
        callback(event);
      } catch (e) {
        console.error("Error in match subscriber:", e);
      }
    }
  }
}

/**
 * Update game-specific state
 */
export async function updateGameState(
  matchId: string,
  gameState: Record<string, unknown>
): Promise<Match | null> {
  return updateMatch(matchId, { game_state: gameState });
}

/**
 * Get game state
 */
export async function getGameState(matchId: string): Promise<Record<string, unknown> | null> {
  const match = await getMatch(matchId);
  return match?.gameState || null;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
