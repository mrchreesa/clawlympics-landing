/**
 * Match Orchestrator Types
 * Core type definitions for the match system
 */

// Match states
export type MatchState = 
  | "waiting"      // Waiting for both agents to connect
  | "countdown"    // 3-2-1 countdown before start
  | "active"       // Match in progress
  | "completed"    // Match finished, winner determined
  | "cancelled";   // Match cancelled (agent disconnected, error, etc.)

// Game formats
export type GameFormat = 
  | "bug_bash"
  | "negotiation_duel"
  | "trivia_blitz"
  | "roast_battle";

// Agent connection status
export type AgentStatus = "disconnected" | "connected" | "ready";

// Match participant
export interface MatchAgent {
  id: string;
  name: string;
  status: AgentStatus;
  score: number;
  lastAction: number; // timestamp
}

// Match instance
export interface Match {
  id: string;
  format: GameFormat;
  state: MatchState;
  agentA: MatchAgent;
  agentB: MatchAgent;
  winnerId: string | null;
  startedAt: number | null;
  endedAt: number | null;
  timeLimit: number; // seconds
  spectatorCount: number;
  events: MatchEvent[];
}

// Events that happen during a match
export type MatchEventType =
  | "agent_connected"
  | "agent_disconnected"
  | "match_countdown"
  | "match_started"
  | "agent_action"
  | "score_update"
  | "match_completed"
  | "match_cancelled"
  | "chat_message";

export interface MatchEvent {
  id: string;
  type: MatchEventType;
  timestamp: number;
  agentId?: string;
  data: Record<string, unknown>;
}

// Messages from agents to orchestrator
export type AgentMessageType =
  | "join"         // Agent joining match
  | "ready"        // Agent ready to start
  | "action"       // Game-specific action
  | "submit"       // Submit answer/solution
  | "chat";        // In-game chat

export interface AgentMessage {
  type: AgentMessageType;
  matchId: string;
  agentId: string;
  apiKey: string;
  payload: Record<string, unknown>;
}

// Messages from orchestrator to agents
export type OrchestratorMessageType =
  | "match_info"      // Initial match info
  | "countdown"       // Countdown tick
  | "start"           // Match started
  | "opponent_action" // Opponent did something
  | "challenge"       // Game challenge/question
  | "result"          // Action result
  | "score"           // Score update
  | "end"             // Match ended
  | "error";          // Error occurred

export interface OrchestratorMessage {
  type: OrchestratorMessageType;
  matchId: string;
  timestamp: number;
  data: Record<string, unknown>;
}

// Bug Bash specific types
export interface BugBashChallenge {
  id: string;
  title: string;
  description: string;
  buggyCode: string;
  language: "javascript" | "python" | "typescript";
  tests: BugBashTest[];
  timeLimit: number;
}

export interface BugBashTest {
  id: string;
  name: string;
  input: string;
  expectedOutput: string;
}

export interface BugBashSubmission {
  agentId: string;
  code: string;
  timestamp: number;
}

export interface BugBashResult {
  agentId: string;
  testsTotal: number;
  testsPassed: number;
  passRate: number;
  executionTime: number;
  errors: string[];
}

// Negotiation Duel specific types
export interface NegotiationState {
  pot: number;
  round: number;
  maxRounds: number;
  proposals: NegotiationProposal[];
  agreement: NegotiationAgreement | null;
}

export interface NegotiationProposal {
  agentId: string;
  round: number;
  myShare: number;
  theirShare: number;
  timestamp: number;
}

export interface NegotiationAgreement {
  proposerId: string;
  accepterId: string;
  shares: { [agentId: string]: number };
}

// Trivia Blitz specific types
export interface TriviaQuestion {
  id: string;
  category: string;
  question: string;
  correctAnswer: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface TriviaAnswer {
  agentId: string;
  questionId: string;
  answer: string;
  timestamp: number;
  correct: boolean;
  points: number;
}

// Roast Battle specific types
export interface RoastRound {
  roundNumber: number;
  roasts: { [agentId: string]: string };
  votes: { [odience: string]: string }; // audience member -> voted for agent
}
