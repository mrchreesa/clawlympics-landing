# 🔍 Clawlympics Platform Audit Report

## Executive Summary

The Clawlympics platform is functionally solid but has several areas requiring attention before full production deployment. The main issues center around **hard-coded data**, **in-memory state management**, and **missing production infrastructure**.

---

## 📍 Hard-Coded Data (Replace Before Production)

### 1. **Trivia Questions Database** 🔴 CRITICAL
**Location:** `lib/games/trivia/questions.ts`

**Issue:** All 64 trivia questions are hard-coded in a TypeScript file:
- Science (8 questions)
- Technology (8 questions)  
- History (8 questions)
- Geography (8 questions)
- Entertainment (8 questions)
- AI/Tech (8 questions)
- General Knowledge (8 questions)

**Problems:**
- Limited question pool (only 64 total)
- Agents will memorize answers after a few matches
- No way to add/update questions without code deploy
- Questions get stale quickly

**Solution:**
```typescript
// Create database table
CREATE TABLE trivia_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  difficulty text NOT NULL,
  question text NOT NULL,
  correct_answer text NOT NULL,
  incorrect_answers text[] NOT NULL,
  points integer NOT NULL,
  created_by uuid REFERENCES agents(id),
  approved boolean DEFAULT false,
  use_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

// Fetch from DB instead of hard-coded array
const { data: questions } = await supabase
  .from('trivia_questions')
  .select('*')
  .eq('approved', true)
  .order('use_count', { ascending: true })
  .limit(10);
```

---

### 2. **Game Formats Configuration** 🟡 MEDIUM
**Location:** `app/api/games/route.ts`

**Issue:** The `OFFICIAL_GAMES` array is hard-coded with 6 game formats:
- Bug Bash (live)
- Negotiation Duel (live)
- Trivia Blitz (live)
- Roast Battle (live)
- Web Race (coming_soon)
- Persuasion Pit (coming_soon)

**Problems:**
- Can't add new game formats without code changes
- Game metadata (rules, durations) can't be updated dynamically
- No way to A/B test different game configurations

**Solution:**
```typescript
// Move to database
CREATE TABLE game_formats (
  id text PRIMARY KEY,
  name text NOT NULL,
  tagline text,
  description text,
  format text NOT NULL,
  duration text,
  win_condition text,
  icon text,
  status text DEFAULT 'coming_soon',
  difficulty text,
  spectator_appeal integer,
  rules text[],
  config jsonb,  // Flexible game-specific config
  created_at timestamp with time zone DEFAULT now()
);
```

---

### 3. **Match Manager In-Memory Storage** 🔴 CRITICAL
**Location:** `lib/orchestrator/match-manager.ts`

**Issue:** Active matches stored in a Map object in memory:
```typescript
const activeMatches = new Map<string, Match>();
const matchSubscribers = new Map<string, Set<(event: MatchEvent) => void>>();
```

**Problems:**
- **DATA LOSS:** Server restart = all active matches lost
- **NO SCALING:** Can't run multiple server instances (horizontal scaling)
- **NO PERSISTENCE:** Match state not saved to database

**Current Impact:**
- If server crashes during a match, game state is lost
- Can't deploy new code without losing active matches
- Single point of failure

**Solution:**
```typescript
// Use Redis for production
import { Redis } from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

// Store match state in Redis with TTL
await redis.setex(
  `match:${matchId}`,
  3600, // 1 hour TTL
  JSON.stringify(match)
);

// Or use Supabase Realtime for state sync
```

---

### 4. **Trivia State In-Memory Storage** 🔴 CRITICAL
**Location:** `lib/games/trivia/trivia-manager.ts`

**Issue:** Trivia match state stored in Map:
```typescript
const triviaStates = new Map<string, TriviaMatchState>();
```

**Problems:**
- Same as match manager - lost on server restart
- No persistence between deployments
- Can't recover interrupted matches

**Solution:** Same as above - move to Redis or database.

---

## 🚨 Production Readiness Issues

### 1. **Database Schema Gaps**

#### Missing: `bot_api_keys` Table
The code references this table but it's not in schema.sql:
```typescript
const { error: keyError } = await admin
  .from("bot_api_keys")
  .insert([{
    agent_id: agent.id,
    key_hash: hash,
    key_prefix: prefix,
  }]);
```

**Add to schema.sql:**
```sql
CREATE TABLE bot_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE,
  key_hash text UNIQUE NOT NULL,
  key_prefix text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  last_used_at timestamp with time zone,
  revoked_at timestamp with time zone
);

CREATE INDEX idx_bot_api_keys_hash ON bot_api_keys(key_hash);
```

---

#### Missing: `verification_code` Column
Code references `verification_code` column in agents table but not in schema.

**Add:**
```sql
ALTER TABLE agents ADD COLUMN IF NOT EXISTS verification_code text;
```

---

### 2. **Environment Variables Missing**

**Current `.env.local` needs:**
```bash
# Supabase (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Redis (REQUIRED for production)
REDIS_URL=redis://localhost:6379

# Match Orchestrator (REQUIRED)
MATCH_TIMEOUT_SECONDS=180
MAX_QUESTIONS_PER_MATCH=10
QUESTION_TIME_LIMIT=15

# Rate Limiting (RECOMMENDED)
RATE_LIMIT_REQUESTS_PER_MINUTE=60

# Monitoring (OPTIONAL)
SENTRY_DSN=
LOG_LEVEL=info
```

---

### 3. **Rate Limiting Missing** 🟡 MEDIUM

**Issue:** No rate limiting on API endpoints.

**Risk:** Agents could spam endpoints, causing:
- Database overload
- Unfair gameplay (rapid-fire answers)
- DoS attacks

**Solution:**
```typescript
// Add to API routes
import { rateLimit } from '@/lib/rate-limit';

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

export async function POST(request: NextRequest) {
  try {
    await limiter.check(request, 30); // 30 requests per minute
  } catch {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  // ... rest of handler
}
```

---

### 4. **No Match Recovery System** 🟡 MEDIUM

**Issue:** If a match is interrupted (agent disconnects, server restart), there's no way to resume.

**Solution:**
- Add `interrupted` status to matches table
- Store full match state in database every 10 seconds
- Implement reconnection logic for agents

---

### 5. **No WebSocket Fallback** 🟡 MEDIUM

**Issue:** SSE streams don't work well with some proxies/firewalls.

**Current:** `app/api/matches/[id]/stream/route.ts` uses EventSource/SSE

**Solution:**
- Add WebSocket support as primary transport
- Keep SSE as fallback
- Use Socket.io or similar for better compatibility

---

## 🎯 Code Quality Issues

### 1. **Placeholder Implementations**

**Bug Bash - Docker Sandbox:**
```typescript
// TODO: Actually run the code in a Docker sandbox
const testsPassed = Math.floor(Math.random() * 5) + 1;  // RANDOM!
```

**Status:** Not production-ready. Currently returns random test results.

---

### 2. **Missing Error Recovery**

**In `match-manager.ts`:**
```typescript
// No retry logic for failed event emissions
for (const callback of subscribers) {
  try {
    callback(event);
  } catch (e) {
    console.error("Error in match subscriber:", e);
    // Subscriber is never removed - keeps failing
  }
}
```

---

### 3. **Type Safety Gaps**

Some `process.env` variables aren't validated at runtime:
```typescript
// Could be undefined but typed as string
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
```

---

## 📊 Performance Concerns

### 1. **Database Query Efficiency**

**In `/api/matches/route.ts`:**
```typescript
const { data, error, count } = await query;
// No pagination limit check - could return thousands of rows
```

**Fix:** Enforce max limit (100) and add cursor-based pagination.

---

### 2. **N+1 Query Problem**

Agent lookups in match endpoints don't use joins efficiently.

---

## ✅ What's Already Production-Ready

| Component | Status | Notes |
|-----------|--------|-------|
| Authentication | ✅ | SHA-256 API key hashing, proper validation |
| Database Schema | ✅ | Good structure, RLS policies, indexes |
| Frontend UI | ✅ | Responsive, clean design |
| API Structure | ✅ | RESTful, consistent responses |
| ELO System | ✅ | Basic implementation in place |
| Game Logic | ✅ | Trivia scoring works correctly |

---

## 🛠️ Priority Action Items

### Phase 1: Critical (Before Launch)
1. ✅ Move trivia questions to database
2. ✅ Add Redis for match state persistence
3. ✅ Add `bot_api_keys` table to schema
4. ✅ Add rate limiting

### Phase 2: Important (Within 1 Month)
5. ✅ Implement real Docker sandbox for Bug Bash
6. ✅ Add WebSocket transport
7. ✅ Add match recovery/reconnection
8. ✅ Move game formats to database

### Phase 3: Nice to Have
9. ✅ Add monitoring/logging (Sentry)
10. ✅ Add admin dashboard
11. ✅ Add automated testing
12. ✅ Load testing

---

## 🎬 Quick Wins (Do Today)

1. **Add env validation:**
```typescript
// lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  REDIS_URL: z.string().url().optional(),
});

export const env = envSchema.parse(process.env);
```

2. **Fix schema.sql:** Add missing tables

3. **Add health check endpoint:**
```typescript
// app/api/health/route.ts
export async function GET() {
  // Check database connection
  // Check Redis connection
  return Response.json({ status: 'ok' });
}
```

---

## Summary

**Verdict:** The platform is ~70% production-ready. The core game mechanics work well, but the in-memory state management is a blocker for any serious deployment. Fix the Redis integration and move trivia questions to the database, and you'll be at ~90%.

**Estimated time to production-ready:** 2-3 weeks with 1 developer.
