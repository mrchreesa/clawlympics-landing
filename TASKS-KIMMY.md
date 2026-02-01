# 🎀 Kimmy's Tasks — Clawlympics Frontend

**Project:** Clawlympics — AI agents compete head-to-head, humans spectate  
**Your Role:** Frontend builder  
**Repo:** `/Users/kreeza/Desktop/Programming/Clawlympics`  
**Live Preview:** `http://localhost:3000` (run `npm run dev`)

---

## 🎨 Design System (MUST FOLLOW)

### Colors (defined in `globals.css`)
```css
--background: #0f1115;    /* Page background - near black */
--foreground: #ffffff;    /* Primary text - white */
--accent: #ff5c35;        /* Primary accent - orange/red */
--accent-secondary: #3b82f6;  /* Secondary accent - blue */
--card: #181b20;          /* Card backgrounds */
--card-border: #262a33;   /* Borders */
--muted: #6b7280;         /* Muted text - gray */
```

### Tailwind Classes to Use
- Backgrounds: `bg-[#0f1115]`, `bg-[#181b20]`
- Borders: `border-[#262a33]`
- Text: `text-white`, `text-[#6b7280]`, `text-[#9ca3af]`
- Accent: `text-[#ff5c35]`, `bg-[#ff5c35]`
- Hover states: `hover:text-white`, `hover:bg-[#262a33]`

### Typography
- Font: System UI (already set)
- Monospace (for code/stats): `font-family: 'SF Mono', 'Monaco', monospace` or class `terminal`
- Headings: `font-bold`
- Body: Default weight

### Components Available
- `components/ui/button.tsx` — Button component
- `components/ui/input.tsx` — Input component  
- `components/waitlist-form.tsx` — Email signup form

---

## 📋 Task 1: Games Showcase Page

### File to Create
```
app/games/page.tsx
```

### What This Page Does
Displays all 6 game formats in a visually appealing grid. Users can see what competitions exist and click to learn rules.

### API Endpoint
```
GET /api/games
```

### Exact API Response (use this to build your types)
```json
{
  "success": true,
  "data": {
    "live": [
      {
        "id": "bug_bash",
        "name": "Bug Bash",
        "tagline": "Speed Coding Duel",
        "description": "Two agents race to fix the same bug. First to pass all tests wins.",
        "format": "1v1",
        "duration": "5-15 min",
        "win_condition": "First to pass all tests (or most tests when time expires)",
        "icon": "🐛",
        "status": "live",
        "difficulty": "medium",
        "spectator_appeal": 4,
        "rules": [
          "Both agents receive identical buggy codebase",
          "Test suite provided with 5-10 tests",
          "Agents can run tests anytime",
          "First to 100% pass rate wins",
          "If time expires: highest pass rate wins",
          "Tie: fastest to reach that pass rate wins"
        ]
      },
      {
        "id": "negotiation_duel",
        "name": "Negotiation Duel",
        "tagline": "Split or Steal",
        "description": "Two agents negotiate to split $100. Greed vs cooperation.",
        "format": "1v1",
        "duration": "3-5 min",
        "win_condition": "Agent with most money after agreement (or $0 each if no deal)",
        "icon": "💰",
        "status": "live",
        "difficulty": "easy",
        "spectator_appeal": 5,
        "rules": [
          "Both agents start with a $100 pot to split",
          "Agents take turns proposing splits",
          "Max 10 rounds of negotiation",
          "Either agent can accept or reject proposals",
          "If accepted: split as agreed",
          "If no agreement after 10 rounds: both get $0",
          "Agent with more money wins"
        ]
      },
      {
        "id": "trivia_blitz",
        "name": "Trivia Blitz",
        "tagline": "Speed & Knowledge",
        "description": "Answer trivia questions faster than your opponent.",
        "format": "1v1 or Battle Royale (4-8)",
        "duration": "3-5 min",
        "win_condition": "Most points after 10 questions",
        "icon": "❓",
        "status": "live",
        "difficulty": "easy",
        "spectator_appeal": 4,
        "rules": [
          "10 questions per match",
          "Categories: science, history, tech, pop culture, random",
          "First correct answer gets the point",
          "Wrong answer: -0.5 points (prevents spam)",
          "Ties broken by average response time",
          "Battle Royale: last agent standing or most points"
        ]
      },
      {
        "id": "roast_battle",
        "name": "Roast Battle",
        "tagline": "Verbal Combat",
        "description": "Agents roast each other. Audience votes the winner.",
        "format": "1v1",
        "duration": "5 min",
        "win_condition": "Audience vote",
        "icon": "🎤",
        "status": "live",
        "difficulty": "medium",
        "spectator_appeal": 5,
        "rules": [
          "3 rounds of roasts",
          "Each agent gets 30 seconds per round",
          "Must stay clever, not cruel",
          "No slurs or hate speech",
          "Audience votes after all rounds",
          "Creativity and wit score highest"
        ]
      }
    ],
    "coming_soon": [
      {
        "id": "web_race",
        "name": "Web Race",
        "tagline": "Navigation Challenge",
        "description": "Complete web tasks fastest. Book flights, find data, fill forms.",
        "format": "1v1 or Battle Royale",
        "duration": "3-10 min",
        "win_condition": "First to complete objective correctly",
        "icon": "🌐",
        "status": "coming_soon",
        "difficulty": "hard",
        "spectator_appeal": 4,
        "rules": [
          "Agents get browser sandbox",
          "Task announced at start",
          "Must complete objective correctly",
          "Screenshots verify completion",
          "First correct completion wins"
        ]
      },
      {
        "id": "persuasion_pit",
        "name": "Persuasion Pit",
        "tagline": "Debate Arena",
        "description": "Agents debate a topic. Audience decides the winner.",
        "format": "1v1",
        "duration": "5-10 min",
        "win_condition": "Audience vote",
        "icon": "🎭",
        "status": "coming_soon",
        "difficulty": "hard",
        "spectator_appeal": 5,
        "rules": [
          "Topic announced, sides assigned",
          "Opening statements: 2 min each",
          "3 rebuttal rounds: 1 min each",
          "Closing statements: 1 min each",
          "Audience votes on most persuasive"
        ]
      }
    ],
    "total": 6
  }
}
```

### UI Requirements

#### Page Layout
```
┌─────────────────────────────────────────────────┐
│ Nav (same as landing page)                      │
├─────────────────────────────────────────────────┤
│                                                 │
│ Section Header: "Competition Formats"           │
│ Subtext: "6 ways for AI agents to battle"       │
│                                                 │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│ │ 🐛 Bug Bash │ │ 💰 Negot.   │ │ ❓ Trivia   │ │
│ │ LIVE badge  │ │ LIVE badge  │ │ LIVE badge  │ │
│ │ tagline     │ │ tagline     │ │ tagline     │ │
│ │ format/dur  │ │ format/dur  │ │ format/dur  │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ │
│                                                 │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│ │ 🎤 Roast    │ │ 🌐 Web Race │ │ 🎭 Persuas. │ │
│ │ LIVE badge  │ │ SOON badge  │ │ SOON badge  │ │
│ │ (grayed)    │ │ (grayed)    │ │ (grayed)    │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### Card Component Specs

Each game card MUST have:
1. **Icon** — Large emoji (text-4xl or text-5xl)
2. **Status Badge** — Top right corner
   - LIVE: `bg-[#22c55e]/20 text-[#22c55e] border-[#22c55e]/30`
   - COMING SOON: `bg-[#6b7280]/20 text-[#6b7280]` + card opacity-60
3. **Name** — `font-bold text-lg`
4. **Tagline** — `text-xs text-[#ff5c35]` (or color per game)
5. **Description** — `text-sm text-[#9ca3af]`
6. **Meta row** — Format + Duration in `text-xs text-[#6b7280]`
7. **Difficulty badge** — Small pill showing easy/medium/hard
8. **Expand on click** — Show rules list when clicked (use state, accordion style)

#### Difficulty Badge Colors
- Easy: `bg-[#22c55e]/20 text-[#22c55e]`
- Medium: `bg-[#eab308]/20 text-[#eab308]`
- Hard: `bg-[#ef4444]/20 text-[#ef4444]`

#### Spectator Appeal (optional)
Show as 1-5 stars or a visual meter. Field is `spectator_appeal: 1-5`

### Code Skeleton
```tsx
// app/games/page.tsx
"use client";

import { useState, useEffect } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";

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
      });
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-[#0f1115] flex items-center justify-center text-[#6b7280]">Loading...</div>;
  }

  // TODO: Build the UI using the games data
  // - Map over games.live and games.coming_soon
  // - Create GameCard components
  // - Handle click to expand and show rules

  return (
    <main className="min-h-screen bg-[#0f1115] text-white">
      {/* Your implementation here */}
    </main>
  );
}
```

### Acceptance Criteria
- [ ] Page loads at `/games`
- [ ] Fetches data from `/api/games` on mount
- [ ] Shows loading state while fetching
- [ ] Displays all 6 games in a responsive grid (3 cols on desktop, 2 on tablet, 1 on mobile)
- [ ] Live games have green "LIVE" badge
- [ ] Coming soon games are grayed out with "COMING SOON" badge
- [ ] Clicking a card expands it to show rules
- [ ] Clicking again collapses it
- [ ] Only one card can be expanded at a time
- [ ] Difficulty badge visible on each card
- [ ] Matches the dark theme from landing page

---

## 📋 Task 2: Agent Profile Page

### File to Create
```
app/agents/[name]/page.tsx
```

### What This Page Does
Shows a single agent's profile with their stats, description, and match history.

### API Endpoint
```
GET /api/agents/{name_or_id}
```
The `[name]` parameter can be either the agent's name (like "TestBot4") or their UUID.

### Exact API Response
```json
{
  "success": true,
  "data": {
    "agent": {
      "id": "67171e38-3642-4a57-a563-9de098ba81ec",
      "name": "TestBot4",
      "description": "Fourth test",
      "owner_id": "50501b3d-0a9b-4f67-8378-3deb2a8aaf92",
      "owner_handle": "@testbot4",
      "api_endpoint": null,
      "elo": 1000,
      "wins": 0,
      "losses": 0,
      "status": "pending",
      "created_at": "2026-02-01T18:26:01.158906+00:00",
      "last_active": null
    },
    "recent_matches": []
  }
}
```

### UI Requirements

#### Page Layout
```
┌─────────────────────────────────────────────────┐
│ Nav                                             │
├─────────────────────────────────────────────────┤
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │  [Avatar]  TestBot4              [STATUS]   │ │
│ │            @testbot4                        │ │
│ │            "Fourth test"                    │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐       │
│ │   ELO     │ │   WINS    │ │  LOSSES   │       │
│ │   1000    │ │    0      │ │    0      │       │
│ └───────────┘ └───────────┘ └───────────┘       │
│                                                 │
│ Win Rate: 0% (0 matches)                        │
│ Member since: Feb 1, 2026                       │
│                                                 │
│ ─────────────────────────────────────────────── │
│                                                 │
│ RECENT MATCHES                                  │
│                                                 │
│ (No matches yet - show empty state)             │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### Component Specs

**Header Section:**
- Avatar: Generate from agent name (first letter in colored circle) or use a robot emoji 🤖
- Agent name: `text-2xl font-bold`
- Owner handle: `text-[#6b7280]`
- Description: `text-[#9ca3af]` (italic if null, show "No description")
- Status badge:
  - pending: `bg-[#eab308]/20 text-[#eab308]` with "PENDING VERIFICATION"
  - verified: `bg-[#22c55e]/20 text-[#22c55e]` with "VERIFIED"
  - suspended: `bg-[#ef4444]/20 text-[#ef4444]` with "SUSPENDED"

**Stats Cards:**
- Three cards in a row
- ELO: `text-[#ff5c35] text-3xl font-mono font-bold`
- Wins: `text-[#22c55e] text-3xl font-bold`
- Losses: `text-[#ef4444] text-3xl font-bold`

**Win Rate:**
- Calculate: `wins / (wins + losses) * 100` or 0% if no matches
- Show as percentage with total matches count

**Member Since:**
- Format `created_at` as human readable date: "Feb 1, 2026"

**Recent Matches Section:**
- If `recent_matches` is empty: Show friendly empty state
  - "No matches yet"
  - "This agent hasn't competed. Check back after their first battle!"
- If matches exist (for future): Show list of match cards

### Code Skeleton
```tsx
// app/agents/[name]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Trophy, TrendingUp, TrendingDown, Clock, User } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  description: string | null;
  owner_handle: string;
  elo: number;
  wins: number;
  losses: number;
  status: "pending" | "verified" | "suspended";
  created_at: string;
  last_active: string | null;
}

interface Match {
  id: string;
  format: string;
  winner_id: string | null;
  status: string;
  // ... other fields
}

export default function AgentProfilePage() {
  const params = useParams();
  const name = params.name as string;
  
  const [agent, setAgent] = useState<Agent | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/agents/${encodeURIComponent(name)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAgent(data.data.agent);
          setMatches(data.data.recent_matches);
        } else {
          setError(data.error || "Agent not found");
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load agent");
        setLoading(false);
      });
  }, [name]);

  if (loading) {
    return <div className="min-h-screen bg-[#0f1115] flex items-center justify-center text-[#6b7280]">Loading...</div>;
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-[#0f1115] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🤖</div>
          <h1 className="text-2xl font-bold text-white mb-2">Agent Not Found</h1>
          <p className="text-[#6b7280]">{error || "This agent doesn't exist."}</p>
        </div>
      </div>
    );
  }

  // Helper function to format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Calculate win rate
  const totalMatches = agent.wins + agent.losses;
  const winRate = totalMatches > 0 ? ((agent.wins / totalMatches) * 100).toFixed(1) : "0";

  // TODO: Build the UI
  return (
    <main className="min-h-screen bg-[#0f1115] text-white">
      {/* Your implementation here */}
    </main>
  );
}
```

### Acceptance Criteria
- [ ] Page loads at `/agents/TestBot4` (or any agent name)
- [ ] Shows loading state while fetching
- [ ] Shows 404 state if agent doesn't exist
- [ ] Displays agent name, owner handle, description
- [ ] Shows status badge with correct color
- [ ] Displays ELO, wins, losses in stat cards
- [ ] Shows calculated win rate
- [ ] Shows formatted "member since" date
- [ ] Shows empty state for matches section
- [ ] Responsive on mobile

---

## 📋 Task 3: Agents List/Leaderboard Page

### File to Create
```
app/agents/page.tsx
```

### What This Page Does
Shows all registered agents in a leaderboard format, sorted by ELO.

### API Endpoint
```
GET /api/agents?status=verified&limit=50
```

Note: Currently returns empty because all test agents are "pending". For development, test with:
```
GET /api/agents?status=pending
```

### Exact API Response
```json
{
  "success": true,
  "data": {
    "agents": [
      {
        "id": "67171e38-3642-4a57-a563-9de098ba81ec",
        "name": "TestBot4",
        "description": "Fourth test",
        "owner_id": "50501b3d-0a9b-4f67-8378-3deb2a8aaf92",
        "owner_handle": "@testbot4",
        "api_endpoint": null,
        "elo": 1000,
        "wins": 0,
        "losses": 0,
        "status": "pending",
        "created_at": "2026-02-01T18:26:01.158906+00:00",
        "last_active": null
      }
    ],
    "total": 4,
    "limit": 50,
    "offset": 0
  }
}
```

### UI Requirements

#### Page Layout
```
┌─────────────────────────────────────────────────┐
│ Nav                                             │
├─────────────────────────────────────────────────┤
│                                                 │
│ Leaderboard                     [Filter tabs]   │
│ "Top AI agents competing"       All|Verified    │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ # │ AGENT      │ OWNER    │ W/L  │ ELO     │ │
│ ├───┼────────────┼──────────┼──────┼─────────┤ │
│ │ 1 │ TestBot4   │@testbot4 │ 0-0  │ 1000    │ │
│ │ 2 │ TestBot3   │@testbot3 │ 0-0  │ 1000    │ │
│ │ 3 │ TestBot2   │@testbot2 │ 0-0  │ 1000    │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Showing 3 of 3 agents                           │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### Table Specs
- Rank column: Show 1, 2, 3 with medals (🥇🥈🥉) for top 3
- Agent name: Clickable, links to `/agents/[name]`
- Owner: Show handle, `text-[#6b7280]`
- W/L: Format as "wins-losses"
- ELO: `font-mono text-[#ff5c35]`
- Hover state: `hover:bg-[#181b20]`

#### Filter Tabs
- "All" — fetch with no status filter (or status=pending for now)
- "Verified" — fetch with `?status=verified`

### Acceptance Criteria
- [ ] Page loads at `/agents`
- [ ] Fetches agents from API
- [ ] Displays table with rank, name, owner, W/L, ELO
- [ ] Top 3 have medal emoji
- [ ] Agent names link to profile page
- [ ] Filter tabs work (switch between all/verified)
- [ ] Shows total count
- [ ] Responsive on mobile (maybe cards instead of table)

---

## 🚀 Getting Started

### 1. Clone and setup (if not already done)
```bash
cd /Users/kreeza/Desktop/Programming/Clawlympics
npm install
```

### 2. Start dev server
```bash
npm run dev
```

### 3. Test the APIs in browser
- http://localhost:3000/api/games
- http://localhost:3000/api/agents?status=pending
- http://localhost:3000/api/agents/TestBot4

### 4. Create your files
```bash
# Create games page
touch app/games/page.tsx

# Create agents list page
touch app/agents/page.tsx

# Create agent profile page
mkdir -p app/agents/\[name\]
touch app/agents/\[name\]/page.tsx
```

---

## 📝 Notes

### Shared Nav Component
The landing page has a nav bar. You can extract it into `components/nav.tsx` and reuse it, OR just copy-paste it into each page for now.

### Existing Components
Look at these for styling reference:
- `components/ui/button.tsx`
- `components/ui/input.tsx`
- `app/page.tsx` (landing page - lots of styling examples)

### Type Definitions
Import types from `lib/types.ts`:
```tsx
import type { Agent, GameFormat, Match } from "@/lib/types";
```

### Questions?
Ask Kreeza to relay to Charlie. Don't guess - ask!

---

**Priority Order:** Task 1 (Games) → Task 2 (Agent Profile) → Task 3 (Leaderboard)

Good luck! 🎀
