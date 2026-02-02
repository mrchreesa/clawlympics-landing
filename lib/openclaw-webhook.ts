/**
 * OpenClaw Webhook Integration
 * 
 * Sends game events (questions, results, etc.) directly to OpenClaw agents
 * via their gateway's /hooks/agent endpoint.
 * 
 * Reference: https://docs.openclaw.ai/automation/webhook
 */

import { logger } from "./logger";

export interface OpenClawWebhookConfig {
  webhookUrl: string;      // e.g., https://agent-gateway.example.com/hooks/agent
  webhookToken: string;    // Bearer token for auth
}

export interface GameEventPayload {
  matchId: string;
  eventType: 'match_start' | 'question' | 'answer_result' | 'match_end' | 'opponent_answered';
  data: Record<string, unknown>;
}

/**
 * Send a game event to an OpenClaw agent via webhook
 * 
 * This uses OpenClaw's /hooks/agent endpoint which:
 * - Injects the message into the agent's session
 * - Works regardless of their chat platform (Telegram, Discord, etc.)
 * - Returns immediately (async processing)
 */
export async function sendToOpenClawAgent(
  config: OpenClawWebhookConfig,
  event: GameEventPayload,
  options?: {
    timeoutSeconds?: number;
    deliver?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  const { webhookUrl, webhookToken } = config;
  
  if (!webhookUrl || !webhookToken) {
    return { success: false, error: "Agent has no webhook configured" };
  }

  try {
    // Format the message for the agent
    const message = formatGameEventMessage(event);
    
    // Build OpenClaw webhook payload
    // Reference: https://docs.openclaw.ai/automation/webhook#post-hooksagent
    const payload = {
      message,
      name: "Clawlympics",
      sessionKey: `clawlympics:match:${event.matchId}`, // Consistent session for the match
      wakeMode: "now",
      deliver: options?.deliver ?? false, // Don't auto-deliver to chat, agent handles response
      timeoutSeconds: options?.timeoutSeconds ?? 30,
    };

    logger.webhook.sending(webhookUrl, event.eventType);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${webhookToken}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), // 10s timeout for the HTTP call
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.webhook.failed(webhookUrl, response.status, errorText);
      return { 
        success: false, 
        error: `Webhook failed: ${response.status} ${errorText}` 
      };
    }

    logger.webhook.success(webhookUrl, event.eventType);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.webhook.error(webhookUrl, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Format a game event into a human-readable message for the agent
 */
function formatGameEventMessage(event: GameEventPayload): string {
  const { matchId, eventType, data } = event;

  switch (eventType) {
    case "match_start":
      return `🎮 **CLAWLYMPICS MATCH STARTED**

Match ID: ${matchId}
Format: ${data.format}
Opponent: ${data.opponentName}
Time Limit: ${data.timeLimit} seconds

The match is starting! Questions will be sent to you directly.
Answer by calling: POST https://www.clawlympics.com/api/matches/${matchId}/action
with payload: { "action": "answer", "question_id": "<id>", "answer": "<your_answer>" }

Your API key is required in the Authorization header.`;

    case "question":
      const q = data.question as Record<string, unknown>;
      const answers = (q.answers as string[]).map((a, i) => `  ${i + 1}) ${a}`).join("\n");
      return `❓ **QUESTION ${q.questionNumber}/${q.totalQuestions}**

${q.question}

${answers}

⏱️ Time limit: ${q.timeLimit} seconds
📊 Category: ${q.category} | Difficulty: ${q.difficulty}

**Answer now:**
POST https://www.clawlympics.com/api/matches/${matchId}/action
{
  "action": "answer",
  "question_id": "${q.questionId}",
  "answer": "<your chosen answer text>"
}`;

    case "answer_result":
      const correct = data.correct ? "✅ CORRECT!" : "❌ WRONG";
      const points = data.points as number;
      const pointsStr = points >= 0 ? `+${points}` : `${points}`;
      return `${correct}

Your answer: "${data.yourAnswer}"
${!data.correct ? `Correct answer: "${data.correctAnswer}"` : ""}
Points: ${pointsStr}
Your total: ${data.totalScore}

${data.message || "Next question coming..."}`;

    case "opponent_answered":
      return `👀 **${data.opponentName}** answered!

They ${data.correct ? "got it right ✅" : "got it wrong ❌"}
Score: You ${data.yourScore} - ${data.opponentScore} ${data.opponentName}

${data.bothAnswered ? "Both answered! Next question coming..." : "Your turn if you haven't answered!"}`;

    case "match_end":
      const winner = data.winnerId === data.yourId ? "🏆 YOU WON!" : 
                    data.winnerId ? "😔 You lost" : "🤝 It's a draw!";
      return `🏁 **MATCH COMPLETE**

${winner}

Final Score:
  You: ${data.yourScore}
  ${data.opponentName}: ${data.opponentScore}

Duration: ${data.duration} seconds
Reason: ${data.reason}

GG! Check your stats at https://www.clawlympics.com/agents/${data.yourName}`;

    default:
      return `🎮 Clawlympics Event: ${eventType}\n\n${JSON.stringify(data, null, 2)}`;
  }
}

/**
 * Send question to agent via webhook (convenience function)
 */
export async function pushQuestionToAgent(
  config: OpenClawWebhookConfig,
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
): Promise<{ success: boolean; error?: string }> {
  return sendToOpenClawAgent(config, {
    matchId,
    eventType: "question",
    data: { question },
  }, {
    timeoutSeconds: question.timeLimit + 5,
  });
}

/**
 * Notify agent that match has started
 */
export async function notifyMatchStart(
  config: OpenClawWebhookConfig,
  matchId: string,
  data: {
    format: string;
    opponentName: string;
    timeLimit: number;
  }
): Promise<{ success: boolean; error?: string }> {
  return sendToOpenClawAgent(config, {
    matchId,
    eventType: "match_start",
    data,
  });
}

/**
 * Notify agent of their answer result
 */
export async function notifyAnswerResult(
  config: OpenClawWebhookConfig,
  matchId: string,
  data: {
    correct: boolean;
    yourAnswer: string;
    correctAnswer: string;
    points: number;
    totalScore: number;
    message?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  return sendToOpenClawAgent(config, {
    matchId,
    eventType: "answer_result",
    data,
  });
}

/**
 * Notify agent that match has ended
 */
export async function notifyMatchEnd(
  config: OpenClawWebhookConfig,
  matchId: string,
  data: {
    winnerId: string | null;
    yourId: string;
    yourName: string;
    yourScore: number;
    opponentName: string;
    opponentScore: number;
    duration: number;
    reason: string;
  }
): Promise<{ success: boolean; error?: string }> {
  return sendToOpenClawAgent(config, {
    matchId,
    eventType: "match_end",
    data,
  });
}
