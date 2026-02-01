/**
 * Match Manager
 * Handles match lifecycle and state management
 */

import { randomUUID } from "crypto";
import type {
  Match,
  MatchState,
  MatchEvent,
  MatchAgent,
  GameFormat,
  AgentStatus,
} from "./types";

// In-memory store for active matches
// TODO: Move to Redis for production (horizontal scaling)
const activeMatches = new Map<string, Match>();
const matchSubscribers = new Map<string, Set<(event: MatchEvent) => void>>();

/**
 * Create a new match
 */
export function createMatch(
  format: GameFormat,
  agentAId: string,
  agentAName: string,
  agentBId: string,
  agentBName: string,
  timeLimit: number = 600 // 10 min default
): Match {
  const match: Match = {
    id: randomUUID(),
    format,
    state: "waiting",
    agentA: {
      id: agentAId,
      name: agentAName,
      status: "disconnected",
      score: 0,
      lastAction: Date.now(),
    },
    agentB: {
      id: agentBId,
      name: agentBName,
      status: "disconnected",
      score: 0,
      lastAction: Date.now(),
    },
    winnerId: null,
    startedAt: null,
    endedAt: null,
    timeLimit,
    spectatorCount: 0,
    events: [],
  };

  activeMatches.set(match.id, match);
  matchSubscribers.set(match.id, new Set());

  return match;
}

/**
 * Get a match by ID
 */
export function getMatch(matchId: string): Match | null {
  return activeMatches.get(matchId) || null;
}

/**
 * Get all active matches
 */
export function getActiveMatches(): Match[] {
  return Array.from(activeMatches.values());
}

/**
 * Update agent status in a match
 */
export function updateAgentStatus(
  matchId: string,
  agentId: string,
  status: AgentStatus
): Match | null {
  const match = activeMatches.get(matchId);
  if (!match) return null;

  const agent = getAgentInMatch(match, agentId);
  if (!agent) return null;

  agent.status = status;
  agent.lastAction = Date.now();

  // Emit event
  emitEvent(matchId, {
    id: randomUUID(),
    type: status === "connected" ? "agent_connected" : "agent_disconnected",
    timestamp: Date.now(),
    agentId,
    data: { status },
  });

  // Check if both agents are ready
  if (
    match.state === "waiting" &&
    match.agentA.status === "ready" &&
    match.agentB.status === "ready"
  ) {
    startCountdown(matchId);
  }

  return match;
}

/**
 * Mark agent as ready
 */
export function setAgentReady(matchId: string, agentId: string): Match | null {
  return updateAgentStatus(matchId, agentId, "ready");
}

/**
 * Start countdown before match
 */
async function startCountdown(matchId: string): Promise<void> {
  const match = activeMatches.get(matchId);
  if (!match || match.state !== "waiting") return;

  match.state = "countdown";

  // 3-2-1 countdown
  for (let i = 3; i > 0; i--) {
    emitEvent(matchId, {
      id: randomUUID(),
      type: "match_countdown",
      timestamp: Date.now(),
      data: { count: i },
    });
    await sleep(1000);
  }

  startMatch(matchId);
}

/**
 * Start the match
 */
function startMatch(matchId: string): void {
  const match = activeMatches.get(matchId);
  if (!match) return;

  match.state = "active";
  match.startedAt = Date.now();

  emitEvent(matchId, {
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
  setTimeout(() => {
    if (match.state === "active") {
      endMatch(matchId, "timeout");
    }
  }, match.timeLimit * 1000);
}

/**
 * Update agent score
 */
export function updateScore(
  matchId: string,
  agentId: string,
  score: number
): Match | null {
  const match = activeMatches.get(matchId);
  if (!match || match.state !== "active") return null;

  const agent = getAgentInMatch(match, agentId);
  if (!agent) return null;

  agent.score = score;
  agent.lastAction = Date.now();

  emitEvent(matchId, {
    id: randomUUID(),
    type: "score_update",
    timestamp: Date.now(),
    agentId,
    data: {
      score,
      agentA: { id: match.agentA.id, score: match.agentA.score },
      agentB: { id: match.agentB.id, score: match.agentB.score },
    },
  });

  return match;
}

/**
 * Record an agent action
 */
export function recordAction(
  matchId: string,
  agentId: string,
  action: Record<string, unknown>
): Match | null {
  const match = activeMatches.get(matchId);
  if (!match || match.state !== "active") return null;

  const agent = getAgentInMatch(match, agentId);
  if (!agent) return null;

  agent.lastAction = Date.now();

  emitEvent(matchId, {
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
export function endMatch(
  matchId: string,
  reason: "completed" | "timeout" | "disconnect" | "forfeit",
  winnerId?: string
): Match | null {
  const match = activeMatches.get(matchId);
  if (!match) return null;

  match.state = reason === "disconnect" ? "cancelled" : "completed";
  match.endedAt = Date.now();

  // Determine winner if not provided
  if (!winnerId && reason !== "disconnect") {
    if (match.agentA.score > match.agentB.score) {
      winnerId = match.agentA.id;
    } else if (match.agentB.score > match.agentA.score) {
      winnerId = match.agentB.id;
    }
    // If scores equal, no winner (draw)
  }

  match.winnerId = winnerId || null;

  emitEvent(matchId, {
    id: randomUUID(),
    type: match.state === "cancelled" ? "match_cancelled" : "match_completed",
    timestamp: Date.now(),
    data: {
      reason,
      winnerId: match.winnerId,
      winnerName: winnerId ? getAgentInMatch(match, winnerId)?.name : null,
      finalScores: {
        [match.agentA.id]: match.agentA.score,
        [match.agentB.id]: match.agentB.score,
      },
      duration: match.startedAt
        ? Math.floor((match.endedAt - match.startedAt) / 1000)
        : 0,
    },
  });

  // Clean up after a delay
  setTimeout(() => {
    activeMatches.delete(matchId);
    matchSubscribers.delete(matchId);
  }, 60000); // Keep for 1 minute for late spectators

  return match;
}

/**
 * Subscribe to match events
 */
export function subscribeToMatch(
  matchId: string,
  callback: (event: MatchEvent) => void
): () => void {
  const subscribers = matchSubscribers.get(matchId);
  if (!subscribers) {
    return () => {};
  }

  subscribers.add(callback);

  // Update spectator count
  const match = activeMatches.get(matchId);
  if (match) {
    match.spectatorCount = subscribers.size;
  }

  // Return unsubscribe function
  return () => {
    subscribers.delete(callback);
    if (match) {
      match.spectatorCount = subscribers.size;
    }
  };
}

/**
 * Emit an event to all subscribers
 */
function emitEvent(matchId: string, event: MatchEvent): void {
  const match = activeMatches.get(matchId);
  if (match) {
    match.events.push(event);
    // Keep only last 100 events in memory
    if (match.events.length > 100) {
      match.events = match.events.slice(-100);
    }
  }

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
 * Get agent in match by ID
 */
function getAgentInMatch(match: Match, agentId: string): MatchAgent | null {
  if (match.agentA.id === agentId) return match.agentA;
  if (match.agentB.id === agentId) return match.agentB;
  return null;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
