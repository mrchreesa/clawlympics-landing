# 🎀 Kimmy's Tasks — Round 2 (Launch Prep)

**Priority:** HIGH — Preparing for public launch

## Task 1: Remove "Coming Soon" Badges

**File:** `app/games/page.tsx`

Currently Web Race and Persuasion Pit show "COMING SOON" with grayed out cards. Change them to show as "LIVE" like the other games.

**Changes needed:**
1. Remove the `opacity-60` class from coming_soon game cards
2. Change badge from "COMING SOON" (gray) to "LIVE" (green)
3. All 6 games should look the same — all live and clickable

**Current code pattern to find:**
```tsx
{games.coming_soon.map((game) => (
  // These cards have opacity-60 and gray badges
))}
```

**Make them match the live games styling.**

---

## Task 2: Spectator Match Page

**File to create:** `app/matches/[id]/page.tsx`

This page shows a LIVE match for spectators to watch.

### Features needed:
1. Connect to SSE stream: `GET /api/matches/${id}/stream`
2. Show both agents with their scores
3. Show match state (waiting/countdown/active/completed)
4. Show live event feed (actions, score updates)
5. Show countdown timer
6. Show winner when match completes

### API Response (SSE stream):
```javascript
// Initial event
{
  "type": "connected",
  "match": {
    "id": "...",
    "format": "bug_bash",
    "state": "active",
    "agentA": { "id": "...", "name": "Bot1", "score": 0 },
    "agentB": { "id": "...", "name": "Bot2", "score": 0 },
    "timeLimit": 600,
    "startedAt": 1234567890
  }
}

// Update events
{ "type": "agent_action", "agentId": "...", "data": {...} }
{ "type": "score_update", "data": { "agentA": {...}, "agentB": {...} } }
{ "type": "match_completed", "data": { "winnerId": "...", "reason": "completed" } }
```

### UI Layout:
```
┌─────────────────────────────────────────────────┐
│ 🏟️ LIVE MATCH — Bug Bash                        │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌───────────────┐     VS     ┌───────────────┐│
│  │    Bot1       │            │    Bot2       ││
│  │   Score: 80   │            │   Score: 40   ││
│  │   ████████░░  │            │   ████░░░░░░  ││
│  └───────────────┘            └───────────────┘│
│                                                 │
│              ⏱️ 4:32 remaining                  │
│                                                 │
│  ┌─────────────────────────────────────────────┐│
│  │ EVENT LOG                                   ││
│  │ 12:34:56 - Bot1 submitted code (4/5 tests) ││
│  │ 12:34:45 - Bot2 submitted code (2/5 tests) ││
│  │ 12:34:30 - Match started!                  ││
│  └─────────────────────────────────────────────┘│
│                                                 │
│  👁️ 42 spectators watching                      │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Code skeleton:
```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";

interface MatchState {
  id: string;
  format: string;
  state: "waiting" | "countdown" | "active" | "completed" | "cancelled";
  agentA: { id: string; name: string; score: number };
  agentB: { id: string; name: string; score: number };
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

export default function SpectatorPage() {
  const { id } = useParams();
  const [match, setMatch] = useState<MatchState | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Connect to SSE stream
    const eventSource = new EventSource(`/api/matches/${id}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === "connected") {
        setMatch(data.match);
        setConnected(true);
      } else if (data.type === "heartbeat") {
        // Keep-alive, ignore
      } else {
        // Add to event log
        setEvents((prev) => [data, ...prev].slice(0, 50));
        
        // Update match state based on event
        if (data.type === "score_update") {
          setMatch((prev) => prev ? {
            ...prev,
            agentA: { ...prev.agentA, score: data.data.agentA?.score ?? prev.agentA.score },
            agentB: { ...prev.agentB, score: data.data.agentB?.score ?? prev.agentB.score },
          } : null);
        }
        
        if (data.type === "match_completed" || data.type === "match_cancelled") {
          setMatch((prev) => prev ? {
            ...prev,
            state: data.type === "match_completed" ? "completed" : "cancelled",
            winnerId: data.data.winnerId as string || null,
          } : null);
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

  // TODO: Build the UI
  return (
    <main className="min-h-screen bg-[#0f1115] text-white">
      {/* Your implementation */}
    </main>
  );
}
```

---

## Task 3: Live Matches List

**File to create:** `app/matches/page.tsx`

Shows all currently active matches that spectators can click to watch.

### API Endpoint:
```
GET /api/matches/live
```

### Response:
```json
{
  "success": true,
  "data": {
    "matches": [
      {
        "id": "...",
        "format": "bug_bash",
        "state": "active",
        "agentA": { "id": "...", "name": "Bot1", "score": 80 },
        "agentB": { "id": "...", "name": "Bot2", "score": 40 },
        "startedAt": 1234567890,
        "spectatorCount": 42
      }
    ],
    "total": 1
  }
}
```

### UI:
- List of live match cards
- Each card shows: format icon, agent names, scores, spectator count
- Click card → go to `/matches/[id]`
- If no live matches: "No matches currently live. Check back soon!"
- Auto-refresh every 10 seconds

---

## Task 4: Navigation Updates

**Files:** `app/page.tsx`, any nav components

Add links to:
- `/matches` — "Live Matches" in nav
- Update any "Coming Soon" text on landing page

---

## Git Workflow

```bash
git pull origin main
# Make changes
git add -A
git commit -m "feat: launch prep - remove coming soon, add spectator UI"
git push origin main
```

---

**Questions?** Ask Kreeza to relay to Charlie!
