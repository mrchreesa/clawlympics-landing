/**
 * Clawlympics Logger
 * 
 * Structured logging for monitoring game flow and debugging.
 * In production, these could be sent to a logging service.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  matchId?: string;
  agentId?: string;
  agentName?: string;
  event?: string;
  [key: string]: unknown;
}

function formatLog(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const prefix = {
    debug: "🔍",
    info: "ℹ️ ",
    warn: "⚠️ ",
    error: "❌",
  }[level];
  
  const contextStr = context 
    ? ` | ${Object.entries(context).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(" ")}`
    : "";
  
  return `[${timestamp}] ${prefix} ${message}${contextStr}`;
}

export const logger = {
  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === "development") {
      console.log(formatLog("debug", message, context));
    }
  },

  info(message: string, context?: LogContext) {
    console.log(formatLog("info", message, context));
  },

  warn(message: string, context?: LogContext) {
    console.warn(formatLog("warn", message, context));
  },

  error(message: string, context?: LogContext) {
    console.error(formatLog("error", message, context));
  },

  // Game-specific loggers
  match: {
    created(matchId: string, format: string, creatorName: string) {
      logger.info("Match created", { matchId, format, creator: creatorName });
    },
    
    joined(matchId: string, agentName: string) {
      logger.info("Agent joined match", { matchId, agentName });
    },
    
    ready(matchId: string, agentName: string) {
      logger.info("Agent ready", { matchId, agentName });
    },
    
    started(matchId: string, format: string, agentA: string, agentB: string) {
      logger.info("🚀 Match started", { matchId, format, agentA, agentB });
    },
    
    ended(matchId: string, winner: string | null, reason: string) {
      logger.info("🏆 Match ended", { matchId, winner, reason });
    },
  },

  trivia: {
    questionPushed(matchId: string, questionNum: number, totalQuestions: number) {
      logger.info(`❓ Question ${questionNum}/${totalQuestions} pushed`, { matchId });
    },
    
    answerReceived(matchId: string, agentName: string, answer: string, correct: boolean, points: number) {
      const emoji = correct ? "✅" : "❌";
      logger.info(`${emoji} Answer: "${answer}" (${correct ? "correct" : "wrong"})`, { 
        matchId, 
        agentName, 
        points: points.toFixed(2) 
      });
    },
    
    timeout(matchId: string, agentNames: string[]) {
      logger.warn("⏰ Question timeout", { matchId, timedOut: agentNames });
    },
    
    bothAnswered(matchId: string) {
      logger.info("Both agents answered, advancing to next question", { matchId });
    },
  },

  webhook: {
    sending(url: string, eventType: string) {
      logger.debug("📤 Sending webhook", { url: url.slice(0, 50) + "...", eventType });
    },
    
    success(url: string, eventType: string) {
      logger.debug("✅ Webhook delivered", { url: url.slice(0, 50) + "...", eventType });
    },
    
    failed(url: string, status: number, error: string) {
      logger.warn("❌ Webhook failed", { url: url.slice(0, 50) + "...", status, error });
    },
    
    error(url: string, error: string) {
      logger.error("💥 Webhook error", { url: url.slice(0, 50) + "...", error });
    },
  },

  api: {
    request(method: string, path: string, agentName?: string) {
      logger.debug(`${method} ${path}`, { agentName });
    },
    
    error(path: string, error: string) {
      logger.error(`API error: ${path}`, { error });
    },
  },
};
