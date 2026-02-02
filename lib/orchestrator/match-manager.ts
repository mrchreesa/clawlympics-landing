/**
 * Match Manager
 * Handles match lifecycle and state management
 * Uses Supabase for persistent storage
 */

import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";
import type {
  Match,
  MatchState,
  MatchEvent,
  GameFormat,
  AgentStatus,
} from "./types";

// In-memory subscribers (per-instance, for SSE)
const matchSubscribers = new Map<string, Set<(event: MatchEvent) => void>>();

// Local cache for active matches (refreshed on read)
const matchCache = new Map<string, { match: Match; timestamp: number }>();
const CACHE_TTL = 2000; // 2 seconds

/**
 * Check if agent B is a placeholder (open match)
 */
export function isOpenMatchPlaceholder(agentId: string): boolean {
  return agentId === OPEN_MATCH_PLACEHOLDER_ID || agentId === "";
}

/**
 * Convert DB row to Match object
 */
function dbToMatch(row: Record<string, unknown>): Match {
  const agentBId = row.agent_b_id as string;
  const agentBName = row.agent_b_name as string;
  const isOpen = isOpenMatchPlaceholder(agentBId);

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
      // Agent B shows placeholder info for open matches
      id: isOpen ? "" : agentBId,
      name: isOpen ? "Waiting for opponent..." : agentBName,
      status: (row.agent_b_status as AgentStatus) || "disconnected",
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
 * Create a new match with both players known
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
    throw new Error(`Failed to create match: ${error.message}`);
  }

  const match = dbToMatch(data);
  matchSubscribers.set(match.id, new Set());
  matchCache.set(match.id, { match, timestamp: Date.now() });

  logger.match.created(match.id, match.format, match.agentA.name);
  return match;
}

// Placeholder for "no opponent yet" in open matches
const OPEN_MATCH_PLACEHOLDER_ID = "00000000-0000-0000-0000-000000000000";
const OPEN_MATCH_PLACEHOLDER_NAME = "__OPEN__";

/**
 * Create an open match (lobby) - only one player, waiting for opponent
 */
export async function createOpenMatch(
  format: GameFormat,
  creatorId: string,
  creatorName: string,
  timeLimit: number = 600
): Promise<Match> {
  const supabase = getSupabaseAdmin();
  const id = randomUUID();

  const matchData = {
    id,
    format,
    state: "open", // New state: waiting for second player
    agent_a_id: creatorId,
    agent_a_name: creatorName,
    agent_a_score: 0,
    agent_a_status: "connected", // Creator is connected
    agent_b_id: OPEN_MATCH_PLACEHOLDER_ID, // Placeholder for open match
    agent_b_name: OPEN_MATCH_PLACEHOLDER_NAME,
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
    console.error("Error creating open match:", error);
    throw new Error(`Failed to create open match: ${error.message}`);
  }

  const match = dbToMatch(data);
  matchSubscribers.set(match.id, new Set());
  matchCache.set(match.id, { match, timestamp: Date.now() });

  return match;
}

/**
 * Join an open match as the second player
 * AUTO-STARTS the match (no /ready step needed)
 */
export async function joinOpenMatch(
  matchId: string,
  joinerId: string,
  joinerName: string,
  callbackUrl?: string
): Promise<Match | null> {
  const supabase = getSupabaseAdmin();
  
  // Get fresh match data
  const { data: matchData, error: matchError } = await supabase
    .from("live_matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (matchError || !matchData) return null;

  // Can only join open matches
  if (matchData.state !== "open") {
    throw new Error("Match is not open for joining");
  }

  // Can't join your own match
  if (matchData.agent_a_id === joinerId) {
    throw new Error("You created this match - wait for an opponent");
  }

  // AUTO-READY: Set both players to ready and go straight to countdown
  const updateData: Record<string, unknown> = {
    agent_b_id: joinerId,
    agent_b_name: joinerName,
    agent_b_status: "ready",      // Auto-ready the joiner
    agent_a_status: "ready",      // Auto-ready the creator too
    state: "countdown",           // Skip waiting, go straight to countdown
  };
  
  // Store callback URL if provided
  if (callbackUrl) {
    updateData.agent_b_callback_url = callbackUrl;
  }

  const { data, error } = await supabase
    .from("live_matches")
    .update(updateData)
    .eq("id", matchId)
    .eq("state", "open") // Ensure still open (prevent race)
    .select()
    .single();

  if (error || !data) {
    logger.error("Failed to join match", { matchId, error: error?.message });
    return null;
  }

  const updatedMatch = dbToMatch(data);
  matchCache.set(matchId, { match: updatedMatch, timestamp: Date.now() });

  logger.match.joined(matchId, joinerName);

  // Emit join event
  await emitEvent(matchId, {
    id: randomUUID(),
    type: "agent_joined",
    timestamp: Date.now(),
    agentId: joinerId,
    data: { 
      status: "ready",
      name: joinerName,
      message: `${joinerName} joined! Match starting in 3 seconds...`,
    },
  });

  // AUTO-START: Trigger countdown immediately (non-blocking)
  startCountdown(matchId);

  return updatedMatch;
}

/**
 * Get all open matches (lobby)
 */
export async function getOpenMatches(): Promise<Match[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("live_matches")
    .select("*")
    .eq("state", "open")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(dbToMatch);
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
    .in("state", ["open", "waiting", "countdown", "active"])
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
 * Set callback URL for an agent in a match
 */
export async function setAgentCallback(
  matchId: string,
  agentId: string,
  callbackUrl: string
): Promise<boolean> {
  const match = await getMatch(matchId);
  if (!match) return false;

  const isAgentA = match.agentA.id === agentId;
  const isAgentB = match.agentB.id === agentId;
  if (!isAgentA && !isAgentB) return false;

  const supabase = getSupabaseAdmin();
  const column = isAgentA ? "agent_a_callback_url" : "agent_b_callback_url";
  
  const { error } = await supabase
    .from("live_matches")
    .update({ [column]: callbackUrl })
    .eq("id", matchId);

  return !error;
}

/**
 * Get callback URLs for both agents in a match
 */
export async function getMatchCallbacks(matchId: string): Promise<{
  agentACallback?: string;
  agentBCallback?: string;
}> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("live_matches")
    .select("agent_a_callback_url, agent_b_callback_url")
    .eq("id", matchId)
    .single();

  if (error || !data) {
    return {};
  }

  return {
    agentACallback: data.agent_a_callback_url || undefined,
    agentBCallback: data.agent_b_callback_url || undefined,
  };
}

/**
 * Emit an event only to local subscribers (no DB write)
 * Use for high-frequency events like countdown
 */
function emitEventLocal(matchId: string, event: MatchEvent): void {
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
 * Start countdown before match
 */
async function startCountdown(matchId: string): Promise<void> {
  const match = await getMatch(matchId);
  if (!match || match.state !== "waiting") return;

  await updateMatch(matchId, { state: "countdown" });

  // 3-2-1 countdown - use local emit for speed (no DB write)
  for (let i = 3; i > 0; i--) {
    emitEventLocal(matchId, {
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
 * Start the match and push first question (for trivia)
 */
async function startMatch(matchId: string): Promise<void> {
  const match = await getMatch(matchId);
  if (!match) return;

  logger.match.started(matchId, match.format, match.agentA.name, match.agentB.name);

  await updateMatch(matchId, {
    state: "active",
    started_at: new Date().toISOString(),
  });

  const startEvent = {
    id: randomUUID(),
    type: "match_started" as const,
    timestamp: Date.now(),
    data: {
      format: match.format,
      timeLimit: match.timeLimit,
      agentA: { id: match.agentA.id, name: match.agentA.name },
      agentB: { id: match.agentB.id, name: match.agentB.name },
      message: "Match started! Listen for 'challenge' events or call get_question.",
    },
  };
  await emitEvent(matchId, startEvent);

  // Notify agents via webhook
  const { notifyMatchAgents } = await import("./webhooks");
  const callbacks = await getMatchCallbacks(matchId);
  notifyMatchAgents(match, startEvent, callbacks.agentACallback, callbacks.agentBCallback);

  // For trivia matches, push the first question immediately
  if (match.format === "trivia_blitz") {
    // Small delay to ensure match_started is received first
    setTimeout(() => pushNextTriviaQuestion(matchId), 500);
  }

  // Set timeout for match end
  setTimeout(async () => {
    const currentMatch = await getMatch(matchId);
    if (currentMatch?.state === "active") {
      await endMatch(matchId, "timeout");
    }
  }, match.timeLimit * 1000);
}

/**
 * Push next trivia question to all subscribers via SSE
 * Called automatically when match starts and when question advances
 */
export async function pushNextTriviaQuestion(matchId: string): Promise<void> {
  // Dynamic import to avoid circular dependency
  const { 
    initTriviaFromDB, 
    parseTriviaState, 
    wrapTriviaState, 
    nextQuestion,
    getFinalResults 
  } = await import("@/lib/games/trivia");

  const match = await getMatch(matchId);
  if (!match || match.state !== "active" || match.format !== "trivia_blitz") return;

  // Load or initialize trivia state (from DB for fresh questions)
  let triviaState = parseTriviaState(match.gameState);
  if (!triviaState) {
    triviaState = await initTriviaFromDB(match.id, match.agentA.id, match.agentB.id);
  }

  // Get next question
  const { state: newState, question } = nextQuestion(triviaState);
  triviaState = newState;

  // Persist state
  await updateGameState(matchId, wrapTriviaState(triviaState));

  if (!question) {
    // No more questions - end match
    const results = getFinalResults(triviaState);
    if (results) {
      await updateScore(matchId, match.agentA.id, results.scores[match.agentA.id] || 0);
      await updateScore(matchId, match.agentB.id, results.scores[match.agentB.id] || 0);
      await endMatch(matchId, "completed", results.winnerId || undefined);
    }
    return;
  }

  // Log and push question
  logger.trivia.questionPushed(matchId, question.questionNumber, question.totalQuestions);

  const challengeEvent = {
    id: randomUUID(),
    type: "challenge" as const,
    timestamp: Date.now(),
    data: {
      question,
      message: `Question ${question.questionNumber}/${question.totalQuestions}: Answer within ${question.timeLimit} seconds!`,
    },
  };
  await emitEvent(matchId, challengeEvent);

  // Notify agents via webhook (if registered)
  const { notifyMatchAgents } = await import("./webhooks");
  const callbacks = await getMatchCallbacks(matchId);
  const freshMatch = await getMatch(matchId);
  if (freshMatch) {
    notifyMatchAgents(freshMatch, challengeEvent, callbacks.agentACallback, callbacks.agentBCallback);
  }

  // Set question timeout
  setTimeout(async () => {
    await handleTriviaQuestionTimeout(matchId);
  }, (question.timeLimit + 1) * 1000); // +1s grace period
}

/**
 * Handle trivia question timeout - penalize non-answerers and advance
 */
async function handleTriviaQuestionTimeout(matchId: string): Promise<void> {
  const { 
    parseTriviaState, 
    wrapTriviaState, 
    handleQuestionTimeout,
    isQuestionTimedOut 
  } = await import("@/lib/games/trivia");

  const match = await getMatch(matchId);
  if (!match || match.state !== "active") return;

  const triviaState = parseTriviaState(match.gameState);
  if (!triviaState || !isQuestionTimedOut(triviaState)) return;

  const agentIds = [match.agentA.id, match.agentB.id];
  const { state: newState, timedOutAgents } = handleQuestionTimeout(triviaState, agentIds);

  if (timedOutAgents.length > 0) {
    // Update scores for timed out agents
    for (const agentId of timedOutAgents) {
      await updateScore(matchId, agentId, newState.scores[agentId] || 0);
    }

    // Emit timeout event
    await emitEvent(matchId, {
      id: randomUUID(),
      type: "question_timeout",
      timestamp: Date.now(),
      data: {
        timedOutAgents,
        message: `Time's up! ${timedOutAgents.length} agent(s) didn't answer. -0.5 penalty each.`,
      },
    });

    // Persist and advance to next question
    await updateGameState(matchId, wrapTriviaState(newState));
    
    // Push next question after short delay
    setTimeout(() => pushNextTriviaQuestion(matchId), 1000);
  }
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

  const winnerName = winnerId
    ? (match.agentA.id === winnerId ? match.agentA.name : match.agentB.name)
    : null;
  
  logger.match.ended(matchId, winnerName, reason);

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
 * Note: spectator count is tracked locally per serverless instance only
 * (DB persistence doesn't work well with serverless - count grows forever)
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
  
  // Broadcast updated count to all local subscribers
  const countEvent: MatchEvent = {
    id: randomUUID(),
    type: "spectator_count",
    timestamp: Date.now(),
    data: { count: subscribers.size },
  };
  for (const cb of subscribers) {
    try { cb(countEvent); } catch {}
  }

  return () => {
    subscribers?.delete(callback);
    // Broadcast updated count on disconnect
    if (subscribers && subscribers.size > 0) {
      const countEvent: MatchEvent = {
        id: randomUUID(),
        type: "spectator_count",
        timestamp: Date.now(),
        data: { count: subscribers.size },
      };
      for (const cb of subscribers) {
        try { cb(countEvent); } catch {}
      }
    }
  };
}

/**
 * Get local spectator count for a match (this instance only)
 */
export function getLocalSpectatorCount(matchId: string): number {
  return matchSubscribers.get(matchId)?.size || 0;
}

/**
 * Emit an event to all subscribers and store in DB
 */
export async function emitEvent(matchId: string, event: MatchEvent): Promise<void> {
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
