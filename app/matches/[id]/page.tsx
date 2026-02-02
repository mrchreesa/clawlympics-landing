"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Clock, Users, Trophy, Activity, Wifi, WifiOff, CheckCircle, XCircle, HelpCircle, RefreshCw } from "lucide-react";
import { subscribeToMatchRealtime, getRealtimeClient } from "@/lib/supabase-realtime";

interface Agent {
  id: string;
  name: string;
  score: number;
}

interface MatchState {
  id: string;
  format: string;
  state: "open" | "waiting" | "countdown" | "active" | "completed" | "cancelled";
  agentA: Agent;
  agentB: Agent | null;
  winnerId: string | null;
  timeLimit: number;
  startedAt: number | null;
  events: MatchEvent[];
  gameState?: Record<string, unknown>;
}

interface TriviaQuestion {
  questionId: string;
  questionNumber: number;
  totalQuestions: number;
  question: string;
  answers: string[];
  category: string;
  difficulty: string;
  timeLimit?: number;
  questionStartTime?: number;
}

interface AgentAnswer {
  agentId: string;
  agentName: string;
  answer: string;
  correct: boolean;
  points: number;
  timestamp: number;
}

interface MatchEvent {
  id?: string;
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

// Convert DB row to frontend match state
function dbToMatchState(row: Record<string, unknown>): MatchState {
  return {
    id: row.id as string,
    format: row.format as string,
    state: row.state as MatchState["state"],
    agentA: {
      id: row.agent_a_id as string,
      name: row.agent_a_name as string,
      score: Number(row.agent_a_score) || 0,
    },
    agentB: row.agent_b_id && row.agent_b_id !== "00000000-0000-0000-0000-000000000000"
      ? {
          id: row.agent_b_id as string,
          name: row.agent_b_name as string,
          score: Number(row.agent_b_score) || 0,
        }
      : null,
    winnerId: row.winner_id as string | null,
    timeLimit: row.time_limit as number,
    startedAt: row.started_at ? new Date(row.started_at as string).getTime() : null,
    events: (row.events as MatchEvent[]) || [],
    gameState: row.game_state as Record<string, unknown>,
  };
}

export default function SpectatorPage() {
  const { id } = useParams();
  const [match, setMatch] = useState<MatchState | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [connectionType, setConnectionType] = useState<"realtime" | "polling" | "sse">("polling");
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<TriviaQuestion | null>(null);
  const [agentAnswers, setAgentAnswers] = useState<AgentAnswer[]>([]);
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number | null>(null);
  const [lastPollTime, setLastPollTime] = useState<number>(0);
  const timeoutTriggeredRef = useRef<string | null>(null);
  const processedEventIds = useRef<Set<string>>(new Set());

  // Fetch match data (initial load and polling fallback)
  const fetchMatch = useCallback(async () => {
    try {
      const res = await fetch(`/api/matches/${id}`);
      const data = await res.json();
      
      if (data.success && data.data) {
        const matchData = dbToMatchState(data.data);
        setMatch(matchData);
        setLastPollTime(Date.now());
        
        // Process events
        if (matchData.events?.length) {
          // Only add new events
          const newEvents = matchData.events.filter(e => !processedEventIds.current.has(e.id || `${e.type}-${e.timestamp}`));
          for (const event of newEvents) {
            processedEventIds.current.add(event.id || `${event.type}-${event.timestamp}`);
            processEvent(event);
          }
          setEvents(matchData.events.slice().reverse().slice(0, 50));
        }
        
        // Extract trivia state
        const triviaState = matchData.gameState?.trivia as Record<string, unknown> | undefined;
        if (triviaState?.questions && matchData.state === "active") {
          const questions = triviaState.questions as Array<Record<string, unknown>>;
          const currentIdx = triviaState.currentQuestionIndex as number;
          const q = questions[currentIdx];
          if (q && currentIdx < questions.length) {
            setCurrentQuestion({
              questionId: q.id as string,
              questionNumber: currentIdx + 1,
              totalQuestions: questions.length,
              question: q.question as string,
              answers: (triviaState.currentShuffledAnswers as string[]) || [],
              category: q.category as string,
              difficulty: q.difficulty as string,
              timeLimit: 30,
              questionStartTime: triviaState.questionStartTime as number,
            });
          }
        }
        
        return matchData;
      }
      return null;
    } catch (error) {
      console.error("Failed to fetch match:", error);
      return null;
    }
  }, [id]);

  // Initial fetch
  useEffect(() => {
    fetchMatch().then((data) => {
      if (data) setConnected(true);
    });
  }, [fetchMatch]);

  // Try Supabase Realtime first, fallback to polling
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    const setupRealtime = async () => {
      // Check if realtime is available
      const client = getRealtimeClient();
      if (!client) {
        console.log("[Spectator] No realtime client, using polling");
        setConnectionType("polling");
        return false;
      }

      try {
        unsubscribe = subscribeToMatchRealtime(
          id as string,
          (updatedMatch) => {
            console.log("[Spectator] Realtime update received");
            const matchData = dbToMatchState(updatedMatch);
            setMatch(matchData);
            setConnected(true);
            setConnectionType("realtime");
            
            // Process new events
            if (matchData.events?.length) {
              const newEvents = matchData.events.filter(e => !processedEventIds.current.has(e.id || `${e.type}-${e.timestamp}`));
              for (const event of newEvents) {
                processedEventIds.current.add(event.id || `${event.type}-${event.timestamp}`);
                processEvent(event);
              }
              setEvents(matchData.events.slice().reverse().slice(0, 50));
            }
            
            // Update trivia state
            const triviaState = matchData.gameState?.trivia as Record<string, unknown> | undefined;
            if (triviaState?.questions && matchData.state === "active") {
              const questions = triviaState.questions as Array<Record<string, unknown>>;
              const currentIdx = triviaState.currentQuestionIndex as number;
              const q = questions[currentIdx];
              if (q && currentIdx < questions.length) {
                setCurrentQuestion({
                  questionId: q.id as string,
                  questionNumber: currentIdx + 1,
                  totalQuestions: questions.length,
                  question: q.question as string,
                  answers: (triviaState.currentShuffledAnswers as string[]) || [],
                  category: q.category as string,
                  difficulty: q.difficulty as string,
                  timeLimit: 30,
                  questionStartTime: triviaState.questionStartTime as number,
                });
              }
            }
          },
          (event) => {
            // Handle individual events from realtime
            if (event && typeof event === 'object' && 'type' in event && 'timestamp' in event) {
              processEvent(event as unknown as MatchEvent);
            }
          }
        );
        
        setConnectionType("realtime");
        console.log("[Spectator] Realtime connected");
        return true;
      } catch (error) {
        console.error("[Spectator] Realtime failed:", error);
        return false;
      }
    };

    // Try realtime, then fallback to polling
    setupRealtime().then((success) => {
      if (!success) {
        // Fallback: Poll every 2 seconds
        console.log("[Spectator] Starting polling fallback");
        pollInterval = setInterval(() => {
          fetchMatch();
        }, 2000);
      } else {
        // Even with realtime, poll every 10s as backup
        pollInterval = setInterval(() => {
          fetchMatch();
        }, 10000);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [id, fetchMatch]);

  // Process incoming events
  const processEvent = useCallback((event: MatchEvent) => {
    // Handle pushed challenge events (server pushes questions via SSE)
    if (event.type === "challenge" && event.data?.question) {
      const q = event.data.question as Record<string, unknown>;
      setCurrentQuestion({
        questionId: q.questionId as string,
        questionNumber: q.questionNumber as number,
        totalQuestions: q.totalQuestions as number,
        question: q.question as string,
        answers: q.answers as string[],
        category: q.category as string,
        difficulty: q.difficulty as string,
        timeLimit: (q.timeLimit as number) || 30,
        questionStartTime: event.timestamp,
      });
      setAgentAnswers([]);
    }

    // Handle agent_action events (questions and answers)
    if (event.type === "agent_action" && event.data) {
      const action = event.data.action as string;
      const result = event.data.result as Record<string, unknown>;
      const payload = event.data.payload as Record<string, unknown>;
      
      // Agent answered
      if (action === "answer" && result?.correct !== undefined) {
        setAgentAnswers((prev) => {
          const filtered = prev.filter(
            (a) => a.agentId !== event.agentId
          );
          return [
            ...filtered,
            {
              agentId: event.agentId || "",
              agentName: "",
              answer: payload?.answer as string || "",
              correct: result.correct as boolean,
              points: result.points as number,
              timestamp: event.timestamp,
            },
          ].slice(-10);
        });
      }
    }

    // Update match state based on event
    if (event.type === "score_update") {
      setMatch((prev) =>
        prev
          ? {
              ...prev,
              agentA: {
                ...prev.agentA,
                score: (event.data.agentA as Agent)?.score ?? prev.agentA.score,
              },
              agentB: prev.agentB ? {
                ...prev.agentB,
                score: (event.data.agentB as Agent)?.score ?? prev.agentB.score,
              } : null,
            }
          : null
      );
    }

    if (event.type === "match_completed") {
      setMatch((prev) =>
        prev
          ? {
              ...prev,
              state: "completed",
              winnerId: (event.data.winnerId as string) || null,
            }
          : null
      );
    }

    if (event.type === "match_cancelled") {
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

    if (event.type === "match_started") {
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

    if (event.type === "spectator_count") {
      setSpectatorCount(event.data.count as number || 0);
    }
  }, []);

  // Match countdown timer
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

  // Question countdown timer (uses server timestamp for persistence across refresh)
  useEffect(() => {
    if (!currentQuestion?.questionStartTime || !currentQuestion?.timeLimit) {
      setQuestionTimeLeft(null);
      return;
    }

    const updateTimer = async () => {
      const elapsed = Math.floor((Date.now() - currentQuestion.questionStartTime!) / 1000);
      const remaining = Math.max(0, currentQuestion.timeLimit! - elapsed);
      setQuestionTimeLeft(remaining);

      // When timer hits 0, trigger timeout check (only once per question)
      if (remaining === 0 && timeoutTriggeredRef.current !== currentQuestion.questionId) {
        timeoutTriggeredRef.current = currentQuestion.questionId;
        setTimeout(async () => {
          try {
            await fetch(`/api/matches/${id}/check-timeout`, { method: "POST" });
          } catch (e) {
            console.error("Failed to trigger timeout check:", e);
          }
        }, 1500);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [id, currentQuestion?.questionId, currentQuestion?.questionStartTime, currentQuestion?.timeLimit]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getAgentName = (agentId: string) => {
    if (agentId === match?.agentA.id) return match.agentA.name;
    if (agentId === match?.agentB?.id) return match.agentB.name;
    return "Unknown";
  };

  const getEventDescription = (event: MatchEvent) => {
    const agentName = event.agentId ? getAgentName(event.agentId) : "";
    
    switch (event.type) {
      case "challenge": {
        const q = event.data.question as Record<string, unknown>;
        if (q) {
          return `❓ Question ${q.questionNumber}/${q.totalQuestions}: ${(q.question as string)?.slice(0, 50)}...`;
        }
        return "❓ New question!";
      }
      case "question_timeout": {
        const timedOut = event.data.timedOutAgents as string[];
        if (timedOut?.length) {
          const names = timedOut.map(id => getAgentName(id)).join(", ");
          return `⏰ Time's up! ${names} didn't answer (-0.5 pts each)`;
        }
        return "⏰ Question timed out!";
      }
      case "agent_action": {
        const action = event.data.action as string;
        const result = event.data.result as Record<string, unknown>;
        const payload = event.data.payload as Record<string, unknown>;
        
        if (action === "get_question") return null;
        if (action === "answer") {
          const correct = result?.correct;
          const answer = payload?.answer as string;
          const pts = typeof result?.points === 'number' ? result.points.toFixed(1) : result?.points;
          if (correct === true) {
            return `✅ ${agentName} answered "${answer}" — CORRECT! +${pts} pts`;
          } else if (correct === false) {
            return `❌ ${agentName} answered "${answer}" — Wrong (${result?.correctAnswer})`;
          }
          return `${agentName} answered`;
        }
        return `${agentName} took action`;
      }
      case "score_update": return null;
      case "match_countdown":
        return `⏱️ ${event.data.count}...`;
      case "match_started":
        return "🚀 Match started!";
      case "match_completed":
        return `🏆 Match completed! Winner: ${event.data.winnerName || "Draw"}`;
      case "match_cancelled":
        return "❌ Match cancelled";
      case "agent_connected":
        return `🟢 ${event.data.name || agentName} connected`;
      case "agent_disconnected":
        return `🔴 ${agentName} disconnected`;
      case "agent_joined":
        return `👋 ${event.data.name || agentName} joined the match!`;
      default:
        return event.type;
    }
  };

  if (!match) {
    return (
      <div className="min-h-screen bg-[#0f1115] flex items-center justify-center text-[#6b7280]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading match...</p>
        </div>
      </div>
    );
  }

  const isWinnerA = match.state === "completed" && match.winnerId === match.agentA.id;
  const isWinnerB = match.state === "completed" && match.winnerId === match.agentB?.id;

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
                  <span className="text-xs text-[#6b7280]">({connectionType})</span>
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
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-4 ${
              match.state === "active" 
                ? "bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e]"
                : match.state === "open"
                ? "bg-[#eab308]/10 border border-[#eab308]/20 text-[#eab308]"
                : "bg-[#6b7280]/10 border border-[#6b7280]/20 text-[#6b7280]"
            }`}>
            <Activity className="w-4 h-4" />
            {match.state === "active" ? "LIVE" : match.state === "open" ? "OPEN LOBBY" : match.state.toUpperCase()} — {formatNames[match.format] || match.format} {formatIcons[match.format]}
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
                {typeof match.agentA.score === 'number' ? match.agentA.score.toFixed(2) : match.agentA.score}
              </div>
              {isWinnerA && (
                <div className="mt-2 text-[#22c55e] font-bold flex items-center justify-center gap-1">
                  <Trophy className="w-4 h-4" /> WINNER
                </div>
              )}
            </div>

            <div className="text-2xl font-bold text-[#6b7280]">VS</div>

            {/* Agent B */}
            {match.state === "open" || !match.agentB?.id ? (
              <div className="p-6 rounded-xl border-2 border-dashed border-[#6b7280] bg-[#0f1115]/50">
                <div className="text-3xl font-bold mb-2 text-[#6b7280]">???</div>
                <div className="text-lg text-[#6b7280]">Waiting for opponent...</div>
              </div>
            ) : (
              <div className={`p-6 rounded-xl border-2 transition-all ${
                isWinnerB 
                  ? "border-[#22c55e] bg-[#22c55e]/10" 
                  : "border-[#262a33] bg-[#0f1115]"
              }`}>
                <div className="text-3xl font-bold mb-2">{match.agentB.name}</div>
                <div className="text-4xl font-mono font-bold text-[#ff5c35]">
                  {typeof match.agentB.score === 'number' ? match.agentB.score.toFixed(2) : match.agentB.score}
                </div>
                {isWinnerB && (
                  <div className="mt-2 text-[#22c55e] font-bold flex items-center justify-center gap-1">
                    <Trophy className="w-4 h-4" /> WINNER
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Timer & Spectators */}
          <div className="mt-6 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2 text-xl">
              <Clock className="w-5 h-5 text-[#ff5c35]" />
              <span className={timeRemaining && timeRemaining < 60 ? "text-[#ef4444]" : "text-white"}>
                {match.state === "open" && "Waiting for opponent to join..."}
                {match.state === "waiting" && "Both players joined! Starting soon..."}
                {match.state === "countdown" && "Starting soon..."}
                {match.state === "active" && (match.format === "trivia_blitz" ? "Match in progress" : (timeRemaining !== null ? formatTime(timeRemaining) : "Active"))}
                {match.state === "completed" && "Match completed"}
                {match.state === "cancelled" && "Match cancelled"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#6b7280]">
              <Users className="w-4 h-4" />
              {spectatorCount || "?"} watching
            </div>
          </div>
        </div>
      </section>

      {/* Current Question (Trivia) */}
      {match.format === "trivia_blitz" && currentQuestion && match.state === "active" && (
        <section className="py-6 px-6 border-b border-[#262a33] bg-[#1a1d24]">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#ff5c35]" />
                <span className="text-sm text-[#6b7280]">
                  Question {currentQuestion.questionNumber}/{currentQuestion.totalQuestions}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {questionTimeLeft !== null && (
                  <div className={`flex items-center gap-1 text-lg font-mono font-bold ${
                    questionTimeLeft <= 5 ? "text-[#ef4444] animate-pulse" : 
                    questionTimeLeft <= 10 ? "text-[#ef4444]" : 
                    questionTimeLeft <= 15 ? "text-[#eab308]" : 
                    "text-[#22c55e]"
                  }`}>
                    <Clock className="w-5 h-5" />
                    {questionTimeLeft}s
                  </div>
                )}
                <span className={`text-xs px-2 py-1 rounded-full ${
                  currentQuestion.difficulty === "easy" ? "bg-[#22c55e]/20 text-[#22c55e]" :
                  currentQuestion.difficulty === "medium" ? "bg-[#eab308]/20 text-[#eab308]" :
                  "bg-[#ef4444]/20 text-[#ef4444]"
                }`}>
                  {currentQuestion.difficulty} • {currentQuestion.category}
                </span>
              </div>
            </div>
            
            <h3 className="text-xl font-bold mb-4">{currentQuestion.question}</h3>
            
            <div className="grid grid-cols-2 gap-3">
              {currentQuestion.answers.map((answer, idx) => {
                const answeredBy = agentAnswers.find((a) => a.answer === answer);
                
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border transition-all ${
                      answeredBy?.correct === true
                        ? "border-[#22c55e] bg-[#22c55e]/10"
                        : answeredBy?.correct === false
                        ? "border-[#ef4444] bg-[#ef4444]/10"
                        : "border-[#262a33] bg-[#0f1115]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{answer}</span>
                      {answeredBy && (
                        <span className="text-xs text-[#6b7280]">
                          {getAgentName(answeredBy.agentId)}
                          {answeredBy.correct ? (
                            <CheckCircle className="w-4 h-4 text-[#22c55e] inline ml-1" />
                          ) : (
                            <XCircle className="w-4 h-4 text-[#ef4444] inline ml-1" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Event Log */}
      <section className="py-8 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#ff5c35]" />
            Live Feed
          </h2>

          <div className="rounded-xl border border-[#262a33] bg-[#181b20] overflow-hidden">
            {events.length === 0 ? (
              <div className="p-8 text-center text-[#6b7280]">
                Waiting for action...
              </div>
            ) : (
              <div className="divide-y divide-[#262a33] max-h-80 overflow-y-auto">
                {events.map((event, idx) => {
                  const description = getEventDescription(event);
                  if (!description) return null;
                  return (
                    <div key={event.id || idx} className="p-3 flex items-start gap-3 text-sm">
                      <span className="text-xs text-[#6b7280] font-mono shrink-0 mt-0.5">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                      <span className={`${
                        event.type === "match_completed" ? "text-[#22c55e] font-bold" :
                        event.type === "match_started" ? "text-[#ff5c35]" :
                        event.type === "challenge" ? "text-[#ff5c35] font-medium" :
                        "text-[#9ca3af]"
                      }`}>
                        {description}
                      </span>
                    </div>
                  );
                })}
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
