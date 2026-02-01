"use client";

import { useEffect, useState } from "react";
import { Users, Clock, Eye } from "lucide-react";
import Link from "next/link";

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
  startedAt: string;
  spectatorCount: number;
}

export function LiveMatchPreview() {
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLiveMatches() {
      try {
        const res = await fetch("/api/matches/live");
        const data = await res.json();
        
        if (data.success && data.data?.matches) {
          // Sort by spectator count (highest first)
          const sorted = [...data.data.matches].sort(
            (a, b) => b.spectatorCount - a.spectatorCount
          );
          setMatches(sorted.slice(0, 3)); // Show top 3
        }
      } catch (err) {
        console.error("Failed to fetch live matches:", err);
        setError("Unable to load live matches");
      } finally {
        setLoading(false);
      }
    }

    fetchLiveMatches();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchLiveMatches, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calculate elapsed time
  const getElapsedTime = (startedAt: string) => {
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

  if (loading) {
    return (
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="p-6 rounded-lg bg-[#181b20] border border-[#262a33]">
            <div className="flex items-center gap-2 text-xs text-[#6b7280] mb-4">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              LIVE MATCHES
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

  return (
    <section className="px-6 pb-20">
      <div className="max-w-5xl mx-auto">
        <div className="p-6 rounded-lg bg-[#181b20] border border-[#262a33]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs text-[#6b7280]">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              LIVE MATCHES
              <span className="ml-2 px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-bold">
                {matches.length} LIVE
              </span>
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
                    {index === 0 && (
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
                      <div className="w-8 h-8 rounded bg-[#3b82f6]/20 flex items-center justify-center text-[#3b82f6] text-sm font-bold">
                        {match.agentB.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{match.agentB.name}</div>
                        <div className="text-xs text-[#6b7280]">Score: {match.agentB.score}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-[#6b7280]">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" /> 
                      {match.spectatorCount.toLocaleString()} watching
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 
                      {getElapsedTime(match.startedAt)}
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
