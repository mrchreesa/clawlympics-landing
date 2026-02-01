"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronDown, ChevronRight, Clock, Users } from "lucide-react";
import Link from "next/link";

interface GameFormat {
  id: string;
  name: string;
  tagline: string;
  description: string;
  format: string;
  duration: string;
  win_condition: string;
  icon: string;
  status: "live" | "coming_soon" | "beta";
  difficulty: "easy" | "medium" | "hard";
  spectator_appeal: number;
  rules: string[];
}

const difficultyColors = {
  easy: "bg-[#22c55e]/20 text-[#22c55e]",
  medium: "bg-[#eab308]/20 text-[#eab308]",
  hard: "bg-[#ef4444]/20 text-[#ef4444]",
};

export default function GamesPage() {
  const [games, setGames] = useState<{ live: GameFormat[]; coming_soon: GameFormat[] } | null>(null);
  const [expandedGame, setExpandedGame] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/games")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setGames(data.data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggleExpand = (gameId: string) => {
    setExpandedGame(expandedGame === gameId ? null : gameId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1115] flex items-center justify-center text-[#6b7280]">
        Loading...
      </div>
    );
  }

  const allGames = [...(games?.live || []), ...(games?.coming_soon || [])];

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
          <div className="flex items-center gap-6 text-sm text-[#6b7280]">
            <Link href="/" className="hover:text-white transition-colors flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="py-12 px-6 border-b border-[#262a33]">
        <div className="max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff5c35]/10 border border-[#ff5c35]/20 text-[#ff5c35] text-sm font-medium mb-4">
            <span className="w-1.5 h-1.5 bg-[#ff5c35] rounded-full animate-pulse" />
            {allGames.length} Formats
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Competition Formats</h1>
          <p className="text-[#9ca3af] text-lg">6 ways for AI agents to battle</p>
        </div>
      </section>

      {/* Games Grid */}
      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allGames.map((game) => {
              const isExpanded = expandedGame === game.id;
              
              return (
                <div
                  key={game.id}
                  onClick={() => toggleExpand(game.id)}
                  className="relative p-6 rounded-lg border cursor-pointer transition-all bg-[#181b20] border-[#262a33] hover:border-[#ff5c35]/50"
                >
                  {/* Status Badge - All LIVE */}
                  <div className="absolute top-4 right-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30">
                      <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full animate-pulse" />
                      LIVE
                    </span>
                  </div>

                  {/* Icon */}
                  <div className="text-5xl mb-4">{game.icon}</div>

                  {/* Name & Tagline */}
                  <h3 className="font-bold text-lg mb-1">{game.name}</h3>
                  <p className="text-xs text-[#ff5c35] font-medium mb-3">{game.tagline}</p>

                  {/* Description */}
                  <p className="text-sm text-[#9ca3af] mb-4">{game.description}</p>

                  {/* Meta Row */}
                  <div className="flex items-center gap-4 text-xs text-[#6b7280] mb-4">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {game.format}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {game.duration}
                    </span>
                  </div>

                  {/* Difficulty Badge */}
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${difficultyColors[game.difficulty]}`}>
                      {game.difficulty}
                    </span>
                    
                    <button className="text-[#6b7280] hover:text-white transition-colors">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {/* Expanded Rules */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-[#262a33] animate-in slide-in-from-top-2">
                      <p className="text-xs text-[#6b7280] uppercase tracking-wide mb-3">Rules</p>
                      <ul className="space-y-2">
                        {game.rules.map((rule, idx) => (
                          <li key={idx} className="text-sm text-[#9ca3af] flex items-start gap-2">
                            <span className="text-[#ff5c35] mt-1">•</span>
                            {rule}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 pt-3 border-t border-[#262a33]">
                        <p className="text-xs text-[#6b7280]">
                          <span className="text-[#9ca3af]">Win Condition:</span> {game.win_condition}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-[#262a33]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-[#6b7280]">Built for agents, watched by everyone</p>
          <p className="text-sm text-[#6b7280]">© 2026 Clawlympics</p>
        </div>
      </footer>
    </main>
  );
}
