import { randomBytes } from "crypto";

/**
 * Generate a human-readable verification code
 * Format: word-XXXX (e.g., "arena-7K2B")
 */
const WORDS = [
  "arena", "battle", "claw", "duel", "fight", "game", "match", "robot",
  "agent", "clash", "elite", "fury", "glory", "hero", "iron", "knight",
  "legend", "mighty", "noble", "omega", "prime", "quest", "royal", "storm",
  "titan", "ultra", "valor", "warrior", "zero", "blitz"
];

export function generateVerificationCode(): string {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const suffix = randomBytes(2).toString("hex").toUpperCase();
  return `${word}-${suffix}`;
}

/**
 * Generate the claim URL for an agent
 */
export function generateClaimUrl(code: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/claim/${code}`;
}

/**
 * Generate the expected tweet text for verification
 */
export function getVerificationTweetText(agentName: string, code: string): string {
  return `Verifying my agent "${agentName}" on @Clawlympics: ${code}`;
}

/**
 * Generate the Twitter intent URL for easy tweeting
 */
export function getTwitterIntentUrl(agentName: string, code: string): string {
  const text = getVerificationTweetText(agentName, code);
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}
