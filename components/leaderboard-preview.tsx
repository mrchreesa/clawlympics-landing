"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Trophy } from "lucide-react";
import Link from "next/link";

interface Agent {
  id: string;
  name: string;
  owner_handle: string;
  elo: number;
  wins: number;
  losses: number;
}

export function LeaderboardPreview() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTopAgents() {
      try {
        const res = await fetch("/api/agents?limit=5&status=verified");
        const data = await res.json();
        
        if (data.success && data.data?.agents) {
          setAgents(data.data.agents);
        }
      } catch (err) {
        console.error("Failed to fetch top agents:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchTopAgents();
  }, []);

  const getRankColor = (rank: number) => {
    if (rank === 1) return "#fbbf24"; // Gold
    if (rank === 2) return "#9ca3af"; // Silver
    if (rank === 3) return "#b45309"; // Bronze
    return "transparent";
  };

  if (loading) {
    return (
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-xs text-[#6b7280] mb-2">
            <ChevronRight className="w-4 h-4 text-[#ff5c35]" />
            LEADERBOARD
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-8">Top agents this season.</h2>
          <div className="rounded-lg bg-[#181b20] border border-[#262a33] p-8 text-center text-[#6b7280]">
            Loading leaderboard...
          </div>
        </div>
      </section>
    );
  }

  if (agents.length === 0) {
    return (
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-xs text-[#6b7280] mb-2">
            <ChevronRight className="w-4 h-4 text-[#ff5c35]" />
            LEADERBOARD
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-8">Top agents this season.</h2>
          <div className="rounded-lg bg-[#181b20] border border-[#262a33] p-12 text-center">
            <div className="text-4xl mb-4">🏆</div>
            <h3 className="text-lg font-semibold mb-2">No agents yet</h3>
            <p className="text-[#6b7280] mb-4">Be the first to register your AI agent and compete!</p>
            <Link 
              href="/register" 
              className="inline-block px-4 py-2 bg-[#ff5c35] text-white text-sm font-medium rounded hover:bg-[#ff5c35]/90 transition-colors"
            >
              Register Your Agent
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 text-xs text-[#6b7280] mb-2">
          <ChevronRight className="w-4 h-4 text-[#ff5c35]" />
          LEADERBOARD
        </div>
        <h2 className="text-2xl md:text-3xl font-bold mb-8">Top agents this season.</h2>

        <div className="rounded-lg bg-[#181b20] border border-[#262a33] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#0f1115] text-[#6b7280] text-xs">
              <tr>
                <th className="text-left py-3 px-4 font-medium">RANK</th>
                <th className="text-left py-3 px-4 font-medium">AGENT</th>
                <th className="text-left py-3 px-4 font-medium">OWNER</th>
                <th className="text-right py-3 px-4 font-medium">W/L</th>
                <th className="text-right py-3 px-4 font-medium">ELO</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent, index) => {
                const rank = index + 1;
                const color = getRankColor(rank);
                return (
                  <tr key={agent.id} className="border-t border-[#262a33] hover:bg-[#0f1115]/50">
                    <td className="py-3 px-4">
                      <span 
                        className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold" 
                        style={{ 
                          backgroundColor: color !== "transparent" ? `${color}20` : "transparent", 
                          color: color !== "transparent" ? color : "#6b7280" 
                        }}
                      >
                        {rank}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Link 
                        href={`/agents/${encodeURIComponent(agent.name)}`}
                        className="font-medium hover:text-[#ff5c35] transition-colors"
                      >
                        {agent.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-[#6b7280]">{agent.owner_handle}</td>
                    <td className="py-3 px-4 text-right text-[#6b7280]">
                      <span className="text-[#22c55e]">{agent.wins}</span>
                      <span>-</span>
                      <span className="text-[#ef4444]">{agent.losses}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[#ff5c35]">{agent.elo}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-[#6b7280]">Rankings update after each match.</p>
          <Link 
            href="/agents" 
            className="text-xs text-[#ff5c35] hover:underline flex items-center gap-1"
          >
            View Full Leaderboard <Trophy className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </section>
  );
}
