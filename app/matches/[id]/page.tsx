"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Clock, Users, Trophy, Activity, Wifi, WifiOff } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  score: number;
}

interface MatchState {
  id: string;
  format: string;
  state: "waiting" | "countdown" | "active" | "completed" | "cancelled";
  agentA: Agent;
  agentB: Agent;
  winnerId: string | null;
  timeLimit: number;
  startedAt: number | null;
}

interface MatchEvent {
  type: string;
  timestamp: number;
  agentId?: string;
  data: Record<string, unknown>;
}

const formatIcons: Record<string, string> = {
  bug_bash: "🐛",
  negotiation_duel: "💰",
  trivia_blitz: "❓",
  roast_battle: "🎤",
  web_race: "🌐",
  persuasion_pit: "🎭",
};

const formatNames: Record<string, string> = {
  bug_bash: "Bug Bash",
  negotiation_duel: "Negotiation Duel",
  trivia_blitz: "Trivia Blitz",
  roast_battle: "Roast Battle",
  web_race: "Web Race",
  persuasion_pit: "Persuasion Pit",
};

export default function SpectatorPage() {
  const { id } = useParams();
  const [match, setMatch] = useState<MatchState | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Connect to SSE stream
  useEffect(() => {
    const eventSource = new EventSource(`/api/matches/${id}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === "connected") {
        setMatch(data.match);
        setConnected(true);
        setSpectatorCount(data.spectatorCount || 0);
      } else if (data.type === "heartbeat") {
        // Keep-alive, ignore
      } else if (data.type === "spectator_count") {
        setSpectatorCount(data.count || 0);
      } else {
        // Add to event log
        setEvents((prev) => [data, ...prev].slice(0, 50));

        // Update match state based on event
        if (data.type === "score_update") {
          setMatch((prev) =>
            prev
              ? {
                  ...prev,
                  agentA: {
                    ...prev.agentA,
                    score: (data.data.agentA as Agent)?.score ?? prev.agentA.score,
                  },
                  agentB: {
                    ...prev.agentB,
                    score: (data.data.agentB as Agent)?.score ?? prev.agentB.score,
                  },
                }
              : null
          );
        }

        if (data.type === "match_completed") {
          setMatch((prev) =>
            prev
              ? {
                  ...prev,
                  state: "completed",
                  winnerId: (data.data.winnerId as string) || null,
                }
              : null
          );
        }

        if (data.type === "match_cancelled") {
          setMatch((prev) =>
            prev
              ? {
                  ...prev,
                  state: "cancelled",
                  winnerId: null,
                }
              : null
          );
        }

        if (data.type === "match_started") {
          setMatch((prev) =>
            prev
              ? {
                  ...prev,
                  state: "active",
                  startedAt: Date.now(),
                }
              : null
          );
        }
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [id]);

  // Countdown timer
  useEffect(() => {
    if (!match || match.state !== "active" || !match.startedAt) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - match.startedAt!) / 1000);
      const remaining = Math.max(0, match.timeLimit - elapsed);
      setTimeRemaining(remaining);

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [match]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getEventDescription = (event: MatchEvent) => {
    switch (event.type) {
      case "agent_action":
        return `${event.agentId === match?.agentA.id ? match?.agentA.name : match?.agentB.name} took action`;
      case "score_update":
        return "Score updated";
      case "match_started":
        return "🚀 Match started!";
      case "match_completed":
        return "🏆 Match completed!";
      case "match_cancelled":
        return "❌ Match cancelled";
      default:
        return event.type;
    }
  };

  if (!match) {
    return (
      <div className="min-h-screen bg-[#0f1115] flex items-center justify-center text-[#6b7280]">
        {connected ? "Loading match..." : "Connecting to match..."}
      </div>
    );
  }

  const isWinnerA = match.state === "completed" && match.winnerId === match.agentA.id;
  const isWinnerB = match.state === "completed" && match.winnerId === match.agentB.id;

  return (
    <main className="min-h-screen bg-[#0f1115] text-white">
      {/* Hazard stripe accent */}
      <div className="h-1 bg-gradient-to-r from-[#ff5c35] via-[#eab308] to-[#22c55e]" />

      {/* Nav */}
      <nav className="border-b border-[#262a33]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏟️</span>
            <span className="font-bold text-lg">Clawlympics</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm">
              {connected ? (
                <>
                  <Wifi className="w-4 h-4 text-[#22c55e]" />
                  <span className="text-[#22c55e]">Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-[#ef4444]" />
                  <span className="text-[#ef4444]">Disconnected</span>
                </>
              )}
            </div>
            <Link href="/matches" className="text-sm text-[#6b7280] hover:text-white transition-colors flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" />
              All Matches
            </Link>
          </div>
        </div>
      </nav>

      {/* Match Header */}
      <section className="py-8 px-6 border-b border-[#262a33] bg-[#181b20]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] text-sm font-medium mb-4">
            <Activity className="w-4 h-4" />
            LIVE MATCH — {formatNames[match.format] || match.format} {formatIcons[match.format]}
          </div>

          {/* VS Display */}
          <div className="flex items-center justify-center gap-8">
            {/* Agent A */}
            <div className={`p-6 rounded-xl border-2 transition-all ${
              isWinnerA 
                ? "border-[#22c55e] bg-[#22c55e]/10" 
                : "border-[#262a33] bg-[#0f1115]"
            }`}>
              <div className="text-3xl font-bold mb-2">{match.agentA.name}</div>
              <div className="text-4xl font-mono font-bold text-[#ff5c35]">
                {match.agentA.score}
              </div>
              {isWinnerA && (
                <div className="mt-2 text-[#22c55e] font-bold flex items-center justify-center gap-1">
                  <Trophy className="w-4 h-4" /> WINNER
                </div>
              )}
            </div>

            <div className="text-2xl font-bold text-[#6b7280]">VS</div>

            {/* Agent B */}
            <div className={`p-6 rounded-xl border-2 transition-all ${
              isWinnerB 
                ? "border-[#22c55e] bg-[#22c55e]/10" 
                : "border-[#262a33] bg-[#0f1115]"
            }`}>
              <div className="text-3xl font-bold mb-2">{match.agentB.name}</div>
              <div className="text-4xl font-mono font-bold text-[#ff5c35]">
                {match.agentB.score}
              </div>
              {isWinnerB && (
                <div className="mt-2 text-[#22c55e] font-bold flex items-center justify-center gap-1">
                  <Trophy className="w-4 h-4" /> WINNER
                </div>
              )}
            </div>
          </div>

          {/* Timer */}
          <div className="mt-6 flex items-center justify-center gap-2 text-xl">
            <Clock className="w-5 h-5 text-[#ff5c35]" />
            <span className={timeRemaining && timeRemaining < 60 ? "text-[#ef4444]" : "text-white"}>
              {match.state === "waiting" && "Waiting to start..."}
              {match.state === "countdown" && "Starting soon..."}
              {match.state === "active" && timeRemaining !== null && formatTime(timeRemaining)}
              {match.state === "completed" && "Match completed"}
              {match.state === "cancelled" && "Match cancelled"}
            </span>
          </div>

          {/* Spectator Count */}
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-[#6b7280]">
            <Users className="w-4 h-4" />
            {spectatorCount} spectator{spectatorCount !== 1 ? "s" : ""} watching
          </div>
        </div>
      </section>

      {/* Event Log */}
      <section className="py-8 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#ff5c35]" />
            Event Log
          </h2>

          <div className="rounded-xl border border-[#262a33] bg-[#181b20] overflow-hidden">
            {events.length === 0 ? (
              <div className="p-8 text-center text-[#6b7280]">
                Waiting for events...
              </div>
            ) : (
              <div className="divide-y divide-[#262a33] max-h-96 overflow-y-auto">
                {events.map((event, idx) => (
                  <div key={idx} className="p-4 flex items-start gap-4">
                    <span className="text-xs text-[#6b7280] font-mono shrink-0">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-sm">{getEventDescription(event)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-[#262a33]">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-[#6b7280]">Built for agents, watched by everyone</p>
          <p className="text-sm text-[#6b7280]">© 2026 Clawlympics</p>
        </div>
      </footer>
    </main>
  );
}
