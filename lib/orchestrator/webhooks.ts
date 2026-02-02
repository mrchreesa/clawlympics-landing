/**
 * Webhook notifications for agents
 * 
 * Supports two modes:
 * 1. OpenClaw Webhook (preferred) - Sends formatted messages to /hooks/agent
 * 2. Generic Webhook (legacy) - Sends JSON payloads to custom endpoints
 * 
 * OpenClaw Reference: https://docs.openclaw.ai/automation/webhook
 */

import type { Match, MatchEvent } from "./types";
import { logger } from "@/lib/logger";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export interface AgentWebhookConfig {
  agentId: string;
  webhookUrl?: string;
  webhookToken?: string;
  // Legacy callback URL (per-match, stored in live_matches)
  callbackUrl?: string;
}

/**
 * Get webhook config for an agent from the database
 */
export async function getAgentWebhookConfig(agentId: string): Promise<AgentWebhookConfig | null> {
  const supabase = getSupabaseAdmin();
  
  const { data, error } = await supabase
    .from("agents")
    .select("id, webhook_url, webhook_token")
    .eq("id", agentId)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return {
    agentId: data.id,
    webhookUrl: data.webhook_url || undefined,
    webhookToken: data.webhook_token || undefined,
  };
}

/**
 * Send event to agent via OpenClaw webhook
 * Reference: https://docs.openclaw.ai/automation/webhook#post-hooksagent
 */
async function sendOpenClawWebhook(
  config: AgentWebhookConfig,
  matchId: string,
  message: string,
  timeoutSeconds: number = 30
): Promise<boolean> {
  if (!config.webhookUrl || !config.webhookToken) {
    return false;
  }

  try {
    const payload = {
      message,
      name: "Clawlympics",
      sessionKey: `clawlympics:match:${matchId}`,
      wakeMode: "now",
      deliver: false, // Agent handles the response via API, not chat reply
      timeoutSeconds,
    };

    logger.webhook.sending(config.webhookUrl, "openclaw");

    const response = await fetch(config.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.webhookToken}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.webhook.failed(config.webhookUrl, response.status, errorText);
      return false;
    }

    logger.webhook.success(config.webhookUrl, "openclaw");
    return true;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    logger.webhook.error(config.webhookUrl, errMsg);
    return false;
  }
}

/**
 * Send event to agent via legacy generic webhook
 */
async function sendGenericWebhook(
  callbackUrl: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  try {
    logger.webhook.sending(callbackUrl, "generic");

    const response = await fetch(callbackUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Clawlympics-Event": payload.eventType as string,
        "X-Clawlympics-Match": payload.matchId as string,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      logger.webhook.failed(callbackUrl, response.status, `HTTP ${response.status}`);
      return false;
    }

    logger.webhook.success(callbackUrl, "generic");
    return true;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    logger.webhook.error(callbackUrl, errMsg);
    return false;
  }
}

/**
 * Format a trivia question as a message for OpenClaw agents
 */
function formatQuestionMessage(
  matchId: string,
  question: {
    questionId: string;
    questionNumber: number;
    totalQuestions: number;
    question: string;
    answers: string[];
    category: string;
    difficulty: string;
    timeLimit: number;
  }
): string {
  const answers = question.answers.map((a, i) => `  ${i + 1}) ${a}`).join("\n");
  
  return `❓ **CLAWLYMPICS - Question ${question.questionNumber}/${question.totalQuestions}**

${question.question}

${answers}

⏱️ **${question.timeLimit} seconds** | 📊 ${question.category} (${question.difficulty})

**Answer:**
\`\`\`
POST https://www.clawlympics.com/api/matches/${matchId}/action
Authorization: Bearer <your_api_key>
Content-Type: application/json

{
  "action": "answer",
  "question_id": "${question.questionId}",
  "answer": "<your answer text>"
}
\`\`\``;
}

/**
 * Format match start message
 */
function formatMatchStartMessage(
  matchId: string,
  format: string,
  opponentName: string,
  timeLimit: number
): string {
  return `🎮 **CLAWLYMPICS MATCH STARTED**

**Match ID:** ${matchId}
**Format:** ${format.replace(/_/g, " ").toUpperCase()}
**Opponent:** ${opponentName}
**Time Limit:** ${timeLimit} seconds

Questions will be pushed to you directly. Answer via:
\`POST https://www.clawlympics.com/api/matches/${matchId}/action\`

Good luck! 🏆`;
}

/**
 * Format match end message
 */
function formatMatchEndMessage(
  match: Match,
  agentId: string,
  reason: string
): string {
  const isAgentA = match.agentA.id === agentId;
  const yourScore = isAgentA ? match.agentA.score : match.agentB.score;
  const oppScore = isAgentA ? match.agentB.score : match.agentA.score;
  const oppName = isAgentA ? match.agentB.name : match.agentA.name;
  
  const won = match.winnerId === agentId;
  const result = match.winnerId 
    ? (won ? "🏆 **YOU WON!**" : "😔 You lost")
    : "🤝 **It's a draw!**";
  
  return `🏁 **MATCH COMPLETE**

${result}

**Final Score:**
  You: ${yourScore.toFixed(2)}
  ${oppName}: ${oppScore.toFixed(2)}

**Reason:** ${reason}

GG! 🎮`;
}

/**
 * Notify both agents in a match about an event
 * Tries OpenClaw webhook first, falls back to legacy callback URLs
 */
export async function notifyMatchAgents(
  match: Match,
  event: MatchEvent,
  agentACallbackUrl?: string,
  agentBCallbackUrl?: string
): Promise<void> {
  // Get webhook configs for both agents
  const [configA, configB] = await Promise.all([
    getAgentWebhookConfig(match.agentA.id),
    getAgentWebhookConfig(match.agentB.id),
  ]);

  // Prepare message based on event type
  let messageA: string | null = null;
  let messageB: string | null = null;
  let genericPayload: Record<string, unknown> | null = null;

  if (event.type === "challenge" && event.data.question) {
    const q = event.data.question as {
      questionId: string;
      questionNumber: number;
      totalQuestions: number;
      question: string;
      answers: string[];
      category: string;
      difficulty: string;
      timeLimit: number;
    };
    // Same question for both
    messageA = formatQuestionMessage(match.id, q);
    messageB = messageA;
    genericPayload = {
      eventType: "challenge",
      matchId: match.id,
      question: q,
      timestamp: Date.now(),
    };
  } else if (event.type === "match_started") {
    messageA = formatMatchStartMessage(match.id, match.format, match.agentB.name, match.timeLimit);
    messageB = formatMatchStartMessage(match.id, match.format, match.agentA.name, match.timeLimit);
    genericPayload = {
      eventType: "match_started",
      matchId: match.id,
      format: match.format,
      timeLimit: match.timeLimit,
      timestamp: Date.now(),
    };
  } else if (event.type === "match_completed") {
    messageA = formatMatchEndMessage(match, match.agentA.id, event.data.reason as string || "completed");
    messageB = formatMatchEndMessage(match, match.agentB.id, event.data.reason as string || "completed");
    genericPayload = {
      eventType: "match_completed",
      matchId: match.id,
      winnerId: match.winnerId,
      reason: event.data.reason,
      timestamp: Date.now(),
    };
  }

  // Notify Agent A
  if (messageA && configA?.webhookUrl) {
    // Prefer OpenClaw webhook
    sendOpenClawWebhook(configA, match.id, messageA).catch(() => {});
  } else if (agentACallbackUrl && genericPayload) {
    // Fall back to legacy callback
    sendGenericWebhook(agentACallbackUrl, {
      ...genericPayload,
      yourScore: match.agentA.score,
      opponentScore: match.agentB.score,
      opponentName: match.agentB.name,
    }).catch(() => {});
  }

  // Notify Agent B
  if (messageB && configB?.webhookUrl) {
    sendOpenClawWebhook(configB, match.id, messageB).catch(() => {});
  } else if (agentBCallbackUrl && genericPayload) {
    sendGenericWebhook(agentBCallbackUrl, {
      ...genericPayload,
      yourScore: match.agentB.score,
      opponentScore: match.agentA.score,
      opponentName: match.agentA.name,
    }).catch(() => {});
  }
}

/**
 * Notify a single agent about their answer result
 */
export async function notifyAnswerResult(
  matchId: string,
  agentId: string,
  result: {
    correct: boolean;
    yourAnswer: string;
    correctAnswer: string;
    points: number;
    totalScore: number;
  }
): Promise<void> {
  const config = await getAgentWebhookConfig(agentId);
  if (!config?.webhookUrl) return;

  const emoji = result.correct ? "✅" : "❌";
  const pointsStr = result.points >= 0 ? `+${result.points.toFixed(2)}` : result.points.toFixed(2);
  
  const message = `${emoji} **${result.correct ? "CORRECT!" : "WRONG"}**

Your answer: "${result.yourAnswer}"
${!result.correct ? `Correct answer: "${result.correctAnswer}"` : ""}

Points: ${pointsStr}
**Total score: ${result.totalScore.toFixed(2)}**

Next question coming...`;

  sendOpenClawWebhook(config, matchId, message).catch(() => {});
}
