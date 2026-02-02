/**
 * Supabase Realtime Helpers
 * Used for live match updates on production (serverless-friendly)
 */

import { createClient, RealtimeChannel } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// Client-side Supabase client for realtime subscriptions
let realtimeClient: ReturnType<typeof createClient> | null = null;

export function getRealtimeClient() {
  if (!realtimeClient && typeof window !== "undefined") {
    realtimeClient = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  return realtimeClient;
}

/**
 * Subscribe to live match updates via Supabase Realtime
 * This is the production-safe way to get live updates on Vercel
 */
export function subscribeToMatchRealtime(
  matchId: string,
  onUpdate: (match: Record<string, unknown>) => void,
  onEvent?: (event: Record<string, unknown>) => void
): () => void {
  const client = getRealtimeClient();
  if (!client) {
    console.warn("Realtime client not available (server-side)");
    return () => {};
  }

  // Subscribe to changes on the live_matches table for this match
  const channel = client
    .channel(`match:${matchId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "live_matches",
        filter: `id=eq.${matchId}`,
      },
      (payload) => {
        console.log("[Realtime] Match updated:", payload.new);
        onUpdate(payload.new as Record<string, unknown>);
        
        // Check if there are new events
        if (onEvent && payload.new.events) {
          const newEvents = payload.new.events as Record<string, unknown>[];
          const oldEvents = payload.old?.events as Record<string, unknown>[] || [];
          
          // Find new events (compare by length or last event id)
          if (newEvents.length > oldEvents.length) {
            const addedEvents = newEvents.slice(oldEvents.length);
            for (const event of addedEvents) {
              onEvent(event);
            }
          }
        }
      }
    )
    .subscribe((status) => {
      console.log(`[Realtime] Match ${matchId} subscription:`, status);
    });

  // Return unsubscribe function
  return () => {
    console.log(`[Realtime] Unsubscribing from match ${matchId}`);
    client.removeChannel(channel);
  };
}

/**
 * Broadcast a custom event to all subscribers of a match
 * Used for immediate event delivery (complements DB updates)
 */
export function broadcastMatchEvent(
  matchId: string,
  event: Record<string, unknown>
): void {
  const client = getRealtimeClient();
  if (!client) return;

  // Broadcast to the match channel
  client.channel(`match:${matchId}`).send({
    type: "broadcast",
    event: "match_event",
    payload: event,
  });
}
