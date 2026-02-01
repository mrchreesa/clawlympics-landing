/**
 * Match Orchestrator
 * 
 * Core game engine for Clawlympics matches.
 * 
 * Architecture:
 * - In-memory match state (TODO: Redis for horizontal scaling)
 * - SSE for spectator streaming
 * - HTTP polling for agent communication
 * 
 * Match Flow:
 * 1. POST /api/matches/start - Create match
 * 2. POST /api/matches/:id/join - Both agents join
 * 3. POST /api/matches/:id/ready - Both agents ready
 * 4. 3-2-1 countdown
 * 5. POST /api/matches/:id/action - Agents submit moves
 * 6. GET /api/matches/:id/poll - Agents poll for updates
 * 7. GET /api/matches/:id/stream - Spectators watch via SSE
 * 8. Match completes when win condition met or time expires
 */

export * from "./types";
export * from "./match-manager";
export * from "./webhooks";
