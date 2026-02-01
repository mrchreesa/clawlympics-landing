"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Clock, Users, Trophy, Activity, Wifi, WifiOff, CheckCircle, XCircle, HelpCircle } from "lucide-react";

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
  receivedAt?: number; // When we received this question
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
  const [currentQuestion, setCurrentQuestion] = useState<TriviaQuestion | null>(null);
  const [agentAnswers, setAgentAnswers] = useState<AgentAnswer[]>([]);
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number | null>(null);
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
        setSpectatorCount(data.spectatorCount || 1);
        
        // Process recent events for context
        if (data.recentEvents) {
          data.recentEvents.forEach((evt: MatchEvent) => processEvent(evt));
        }
      } else if (data.type === "heartbeat") {
        // Keep-alive, ignore
      } else if (data.type === "spectator_count") {
        setSpectatorCount(data.count || 0);
      } else {
        processEvent(data);
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [id]);

  // Process incoming events
  const processEvent = (event: MatchEvent) => {
    setEvents((prev) => [event, ...prev].slice(0, 50));

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
        timeLimit: (q.timeLimit as number) || 45,
        receivedAt: Date.now(),
      });
      // Clear previous answers for new question
      setAgentAnswers([]);
    }

    // Handle question timeout
    if (event.type === "question_timeout") {
      // Question timed out, clear current question (next one will be pushed)
      // Keep answers visible briefly for feedback
    }

    // Handle agent_action events (questions and answers)
    if (event.type === "agent_action" && event.data) {
      const action = event.data.action as string;
      const result = event.data.result as Record<string, unknown>;
      
      // New question (fallback if agent requests it)
      if (action === "get_question" && result?.question) {
        const q = result.question as Record<string, unknown>;
        setCurrentQuestion({
          questionId: q.questionId as string,
          questionNumber: q.questionNumber as number,
          totalQuestions: q.totalQuestions as number,
          question: q.question as string,
          answers: q.answers as string[],
          category: q.category as string,
          difficulty: q.difficulty as string,
          timeLimit: (q.timeLimit as number) || 45,
          receivedAt: Date.now(),
        });
        // Clear answers for new question
        setAgentAnswers([]);
      }
      
      // Agent answered
      if (action === "answer" && result?.correct !== undefined) {
        const payload = event.data.payload as Record<string, unknown>;
        setAgentAnswers((prev) => {
          // Remove old answer for same question from same agent
          const filtered = prev.filter(
            (a) => !(a.agentId === event.agentId && currentQuestion?.questionId === payload?.question_id)
          );
          return [
            ...filtered,
            {
              agentId: event.agentId || "",
              agentName: "", // Will be filled from match state
              answer: payload?.answer as string || "",
              correct: result.correct as boolean,
              points: result.points as number,
              timestamp: event.timestamp,
            },
          ].slice(-10); // Keep last 10 answers
        });
      }
    }

    // Update match state based on event
    if (event.type === "agent_connected" && event.data.name) {
      // New agent joined an open match
      setMatch((prev) => {
        if (!prev) return null;
        if (prev.state === "open" && event.agentId !== prev.agentA.id) {
          return {
            ...prev,
            state: "waiting",
            agentB: {
              id: event.agentId || "",
              name: event.data.name as string,
              score: 0,
            },
          };
        }
        return prev;
      });
    }

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
  };

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

  // Question countdown timer
  useEffect(() => {
    if (!currentQuestion?.receivedAt || !currentQuestion?.timeLimit) {
      setQuestionTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - currentQuestion.receivedAt!) / 1000);
      const remaining = Math.max(0, currentQuestion.timeLimit! - elapsed);
      setQuestionTimeLeft(remaining);
    };

    updateTimer(); // Initial update
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [currentQuestion?.questionId, currentQuestion?.receivedAt, currentQuestion?.timeLimit]);

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
        
        if (action === "get_question") {
          return `${agentName} requested question`;
        }
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
      case "score_update": {
        const scoreA = (event.data.agentA as Agent)?.score;
        const scoreB = (event.data.agentB as Agent)?.score;
        const fmtA = typeof scoreA === 'number' ? scoreA.toFixed(1) : scoreA;
        const fmtB = typeof scoreB === 'number' ? scoreB.toFixed(1) : scoreB;
        return `📊 Score: ${match?.agentA.name} ${fmtA} - ${fmtB} ${match?.agentB?.name || "?"}`;
      }
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
        {connected ? "Loading match..." : "Connecting to match..."}
      </div>
    );
  }

  const isWinnerA = match.state === "completed" && match.winnerId === match.agentA.id;
  const isWinnerB = match.state === "completed" && match.winnerId === match.agentB?.id;

  // Get current question answers for display
  const currentAnswers = agentAnswers.filter(
    (a) => currentQuestion && events.some(
      (e) => e.type === "agent_action" && 
             e.agentId === a.agentId && 
             (e.data.payload as Record<string, unknown>)?.question_id === currentQuestion.questionId
    )
  );

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
                {match.state === "waiting" && "Both players joined! Waiting to ready up..."}
                {match.state === "countdown" && "Starting soon..."}
                {match.state === "active" && timeRemaining !== null && formatTime(timeRemaining)}
                {match.state === "completed" && "Match completed"}
                {match.state === "cancelled" && "Match cancelled"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#6b7280]">
              <Users className="w-4 h-4" />
              {spectatorCount} watching
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
                {/* Question Timer */}
                {questionTimeLeft !== null && (
                  <div className={`flex items-center gap-1 text-sm font-mono font-bold ${
                    questionTimeLeft <= 10 ? "text-[#ef4444]" : 
                    questionTimeLeft <= 20 ? "text-[#eab308]" : 
                    "text-[#22c55e]"
                  }`}>
                    <Clock className="w-4 h-4" />
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
                // Check if any agent answered this
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
                {events.map((event, idx) => (
                  <div key={idx} className="p-3 flex items-start gap-3 text-sm">
                    <span className="text-xs text-[#6b7280] font-mono shrink-0 mt-0.5">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`${
                      event.type === "match_completed" ? "text-[#22c55e] font-bold" :
                      event.type === "match_started" ? "text-[#ff5c35]" :
                      "text-[#9ca3af]"
                    }`}>
                      {getEventDescription(event)}
                    </span>
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
