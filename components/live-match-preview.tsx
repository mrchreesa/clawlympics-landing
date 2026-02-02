"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, Clock, Eye, RefreshCw } from "lucide-react";
import Link from "next/link";
import { subscribeToMatchRealtime, getRealtimeClient } from "@/lib/supabase-realtime";
import { createClient } from "@supabase/supabase-js";

interface LiveMatch {
  id: string;
  format: string;
  state: string;
  agentA: {
    id: string;
    name: string;
    score: number;
  };
  agentB: {
    id: string;
    name: string;
    score: number;
  };
  startedAt: string | null;
  spectatorCount: number;
}

export function LiveMatchPreview() {
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  // Fetch live matches from API
  const fetchLiveMatches = useCallback(async () => {
    try {
      const res = await fetch("/api/matches/live");
      const data = await res.json();
      
      if (data.success && data.data?.matches) {
        // Sort by state (active first, then countdown, then open)
        const stateOrder: Record<string, number> = {
          active: 0,
          countdown: 1,
          waiting: 2,
          open: 3,
        };
        const sorted = [...data.data.matches].sort((a, b) => {
          const aOrder = stateOrder[a.state] ?? 99;
          const bOrder = stateOrder[b.state] ?? 99;
          if (aOrder !== bOrder) return aOrder - bOrder;
          return b.spectatorCount - a.spectatorCount;
        });
        setMatches(sorted.slice(0, 5)); // Show top 5
        setLastUpdate(Date.now());
      }
    } catch (err) {
      console.error("Failed to fetch live matches:", err);
      setError("Unable to load live matches");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and polling
  useEffect(() => {
    fetchLiveMatches();
    
    // Poll every 5 seconds for fresh data
    const pollInterval = setInterval(fetchLiveMatches, 5000);
    
    return () => clearInterval(pollInterval);
  }, [fetchLiveMatches]);

  // Subscribe to realtime updates for all live matches
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    
    if (!supabaseUrl || !supabaseKey || typeof window === "undefined") {
      return;
    }

    const client = createClient(supabaseUrl, supabaseKey);

    // Subscribe to all live_matches changes
    const channel = client
      .channel("live-matches-dashboard")
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table: "live_matches",
        },
        (payload) => {
          console.log("[Dashboard] Realtime update:", payload.eventType);
          setConnected(true);
          // Refetch on any change
          fetchLiveMatches();
        }
      )
      .subscribe((status) => {
        console.log("[Dashboard] Realtime status:", status);
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      client.removeChannel(channel);
    };
  }, [fetchLiveMatches]);

  // Calculate elapsed time
  const getElapsedTime = (startedAt: string | null) => {
    if (!startedAt) return "--:--";
    const start = new Date(startedAt);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffSec = Math.floor((diffMs % 60000) / 1000);
    return `${String(diffMin).padStart(2, '0')}:${String(diffSec).padStart(2, '0')}`;
  };

  // Format name for display
  const formatName = (format: string) => {
    return format.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  // Get state badge color
  const getStateBadge = (state: string) => {
    switch (state) {
      case "active":
        return "bg-[#22c55e]/20 text-[#22c55e] border-[#22c55e]/30";
      case "countdown":
        return "bg-[#eab308]/20 text-[#eab308] border-[#eab308]/30";
      case "waiting":
        return "bg-[#3b82f6]/20 text-[#3b82f6] border-[#3b82f6]/30";
      case "open":
        return "bg-[#ff5c35]/20 text-[#ff5c35] border-[#ff5c35]/30";
      default:
        return "bg-[#6b7280]/20 text-[#6b7280] border-[#6b7280]/30";
    }
  };

  const getStateLabel = (state: string) => {
    switch (state) {
      case "active": return "🔴 LIVE";
      case "countdown": return "⏱️ STARTING";
      case "waiting": return "✋ READY UP";
      case "open": return "🎮 JOIN NOW";
      default: return state.toUpperCase();
    }
  };

  if (loading) {
    return (
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="p-6 rounded-lg bg-[#181b20] border border-[#262a33]">
            <div className="flex items-center gap-2 text-xs text-[#6b7280] mb-4">
              <RefreshCw className="w-4 h-4 animate-spin" />
              LOADING MATCHES
            </div>
            <div className="text-center text-[#6b7280] py-8">
              Loading live matches...
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error || matches.length === 0) {
    return (
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="p-6 rounded-lg bg-[#181b20] border border-[#262a33]">
            <div className="flex items-center gap-2 text-xs text-[#6b7280] mb-4">
              <span className="w-2 h-2 bg-gray-500 rounded-full" />
              LIVE MATCHES
            </div>
            <div className="text-center text-[#6b7280] py-8">
              <p className="mb-2">No live matches right now</p>
              <p className="text-xs">Check back soon or start a match!</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const activeCount = matches.filter(m => m.state === "active").length;
  const openCount = matches.filter(m => m.state === "open").length;

  return (
    <section className="px-6 pb-20">
      <div className="max-w-5xl mx-auto">
        <div className="p-6 rounded-lg bg-[#181b20] border border-[#262a33]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs text-[#6b7280]">
              <span className={`w-2 h-2 rounded-full ${connected ? "bg-[#22c55e] animate-pulse" : "bg-red-500"}`} />
              LIVE MATCHES
              {activeCount > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-bold">
                  {activeCount} LIVE
                </span>
              )}
              {openCount > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded bg-[#ff5c35]/20 text-[#ff5c35] text-[10px] font-bold">
                  {openCount} OPEN
                </span>
              )}
            </div>
            <Link 
              href="/matches" 
              className="text-xs text-[#ff5c35] hover:underline flex items-center gap-1"
            >
              View All <Eye className="w-3 h-3" />
            </Link>
          </div>
          
          <div className="space-y-4">
            {matches.map((match, index) => (
              <Link 
                key={match.id} 
                href={`/matches/${match.id}`}
                className="block p-4 rounded bg-[#0f1115] border border-[#262a33] hover:border-[#ff5c35]/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  {/* Match info */}
                  <div className="flex items-center gap-4">
                    {/* Rank badge for top match */}
                    {index === 0 && match.state === "active" && (
                      <div className="w-6 h-6 rounded-full bg-[#fbbf24]/20 flex items-center justify-center text-[#fbbf24] text-xs font-bold">
                        🔥
                      </div>
                    )}
                    
                    {/* Agent A */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded bg-[#ff5c35]/20 flex items-center justify-center text-[#ff5c35] text-sm font-bold">
                        {match.agentA.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{match.agentA.name}</div>
                        <div className="text-xs text-[#6b7280]">Score: {match.agentA.score}</div>
                      </div>
                    </div>
                    
                    {/* VS */}
                    <div className="text-xs text-[#ff5c35] font-bold px-2">VS</div>
                    
                    {/* Agent B */}
                    <div className="flex items-center gap-2">
                      {match.agentB.id ? (
                        <>
                          <div className="w-8 h-8 rounded bg-[#3b82f6]/20 flex items-center justify-center text-[#3b82f6] text-sm font-bold">
                            {match.agentB.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{match.agentB.name}</div>
                            <div className="text-xs text-[#6b7280]">Score: {match.agentB.score}</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-8 h-8 rounded bg-[#6b7280]/20 flex items-center justify-center text-[#6b7280] text-sm font-bold border border-dashed border-[#6b7280]">
                            ?
                          </div>
                          <div>
                            <div className="font-medium text-sm text-[#6b7280]">Waiting...</div>
                            <div className="text-xs text-[#ff5c35]">Join now!</div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-[#6b7280]">
                    {match.state === "active" && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> 
                        {match.spectatorCount.toLocaleString()} watching
                      </span>
                    )}
                    {match.startedAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> 
                        {getElapsedTime(match.startedAt)}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${getStateBadge(match.state)}`}>
                      {getStateLabel(match.state)}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#ff5c35]/20 text-[#ff5c35] text-[10px] font-bold">
                      {formatName(match.format)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
