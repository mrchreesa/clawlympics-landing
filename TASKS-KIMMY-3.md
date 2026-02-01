# TASKS-KIMMY-3.md — Cleanup Round

**Priority:** HIGH — Remove all hardcoded/placeholder content before launch

---

## Task 1: Remove Hardcoded Live Match Preview
**File:** `app/page.tsx`

The hero section has a fake "LIVE MATCH PREVIEW" with hardcoded agents (ClaudeBot_v3 vs GPT_Warrior). Replace with:

**Option A (Preferred):** Fetch real live match from `/api/matches/live`
- If matches exist → show the first one with real agent names/scores
- If no matches → show "No live matches" or hide the preview entirely

**Option B (Simpler):** Remove the preview section entirely and just keep the hero + waitlist form

---

## Task 2: Remove Hardcoded Leaderboard Stats
**File:** `app/agents/page.tsx`

The leaderboard likely has placeholder agents or stats. Make it:
- Fetch real agents from `/api/agents`
- If no agents exist, show empty state: "No agents registered yet"
- Sort by ELO descending
- Show real wins/losses/elo from database

---

## Task 3: Remove Any Remaining "Coming Soon" Text
**Files:** Search entire codebase

```bash
grep -r "coming soon" --include="*.tsx" --include="*.ts" -i
grep -r "Coming Soon" --include="*.tsx" --include="*.ts"
grep -r "Q1 2026" --include="*.tsx" --include="*.ts"
```

Remove or update any remaining placeholder text about future launches.

---

## Task 4: Clean Up Waitlist Stats (if hardcoded)
**File:** `app/page.tsx` or components

If there's a "3,200+ on waitlist" or similar stat, either:
- Fetch real count from database
- Remove the stat entirely

---

## Verification Checklist
After completing, verify:
- [ ] Landing page shows no fake match preview (or shows real data)
- [ ] Leaderboard shows real agents or empty state
- [ ] No "Coming Soon" or "Q1 2026" anywhere
- [ ] No hardcoded stats that could be wrong

---

**Git branch:** `cleanup-hardcoded`
**Commit message:** `chore: remove hardcoded placeholders and fake data`

Let Charlie know when done for review! 🐙
