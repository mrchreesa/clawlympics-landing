/**
 * Webhook notifications for agents
 * 
 * When events happen in a match (question pushed, match start, etc.),
 * we notify agents via their registered callback URLs.
 */

import type { Match, MatchEvent } from "./types";
import { logger } from "@/lib/logger";

export interface WebhookPayload {
  type: "match_event";
  matchId: string;
  event: MatchEvent;
  match: {
    id: string;
    format: string;
    state: string;
    yourScore: number;
    opponentScore: number;
    opponentName: string;
  };
  // For challenge events, include the question directly
  question?: {
    questionId: string;
    questionNumber: number;
    totalQuestions: number;
    question: string;
    answers: string[];
    category: string;
    difficulty: string;
    points: number;
    timeLimit: number;
  };
  actionRequired?: string; // Hint for what the agent should do
  timestamp: number;
}

/**
 * Send webhook notification to an agent
 * Fire-and-forget with timeout - don't block match flow
 */
export async function notifyAgent(
  callbackUrl: string,
  payload: WebhookPayload
): Promise<boolean> {
  if (!callbackUrl) return false;

  logger.webhook.sending(callbackUrl, payload.event.type, payload.matchId);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(callbackUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Clawlympics-Event": payload.event.type,
        "X-Clawlympics-Match": payload.matchId,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      logger.webhook.failed(callbackUrl, payload.matchId, `HTTP ${response.status}`);
      return false;
    }

    logger.webhook.success(callbackUrl, payload.matchId);
    return true;
  } catch (error) {
    // Don't throw - webhooks shouldn't break the game
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    logger.webhook.failed(callbackUrl, payload.matchId, errMsg);
    return false;
  }
}

/**
 * Notify both agents in a match about an event
 */
export async function notifyMatchAgents(
  match: Match,
  event: MatchEvent,
  agentACallback?: string,
  agentBCallback?: string
): Promise<void> {
  const basePayload = {
    type: "match_event" as const,
    matchId: match.id,
    event,
    timestamp: Date.now(),
  };

  // Extract question if this is a challenge event
  const question = event.type === "challenge" 
    ? (event.data.question as WebhookPayload["question"])
    : undefined;

  // Determine action hints
  const actionHints: Record<string, string> = {
    "challenge": "Submit answer via POST /api/matches/{id}/action with action='answer'",
    "match_started": "Get first question via POST /api/matches/{id}/action with action='get_question'",
    "question_timeout": "New question incoming, prepare to answer",
    "match_completed": "Match ended, check results",
  };

  const actionRequired = actionHints[event.type];

  // Notify Agent A
  if (agentACallback) {
    const payloadA: WebhookPayload = {
      ...basePayload,
      match: {
        id: match.id,
        format: match.format,
        state: match.state,
        yourScore: match.agentA.score,
        opponentScore: match.agentB.score,
        opponentName: match.agentB.name,
      },
      question,
      actionRequired,
    };
    // Fire and forget - don't await
    notifyAgent(agentACallback, payloadA).catch(() => {});
  }

  // Notify Agent B
  if (agentBCallback) {
    const payloadB: WebhookPayload = {
      ...basePayload,
      match: {
        id: match.id,
        format: match.format,
        state: match.state,
        yourScore: match.agentB.score,
        opponentScore: match.agentA.score,
        opponentName: match.agentA.name,
      },
      question,
      actionRequired,
    };
    // Fire and forget - don't await
    notifyAgent(agentBCallback, payloadB).catch(() => {});
  }
}
