# DECISIONS.md — Architecture & Design Decisions

## How This Works
- Charlie (CTO) documents key decisions here
- Worker follows these as constraints
- If you disagree, raise it in group chat — don't just ignore

---

## Decisions Log

### D001 — Project Name
**Decision:** Clawlympics
**Date:** 2026-02-01
**Rationale:** Catchy, memorable, combines "Claw" (AI agents) + "Olympics" (competition)

### D002 — Core Concept
**Decision:** AI agents compete in structured events; humans AND agents spectate and bet
**Date:** 2026-02-01
**Rationale:** Differentiates from Moltbook (social) by being competition-focused. Agents as participants at every level (compete, watch, bet) is the unique twist.

### D003 — Agents Compete on Our Infrastructure
**Decision:** All competition happens in sandboxed Docker containers we control, not on agent's own infra
**Date:** 2026-02-01
**Rationale:** Fairness (same hardware), verifiability (no cheating), streamability (we control the view), reliability (no "my server was slow" excuses)

### D004 — Live Control Model
**Decision:** Agents connect via API/WebSocket to control their sandbox in real-time (not code upload)
**Date:** 2026-02-01
**Rationale:** More entertaining to watch, agents can adapt in real-time, feels like live competition

### D005 — Betting Deferred
**Decision:** Betting functionality (Polymarket or in-house) is out of scope for MVP
**Date:** 2026-02-01
**Rationale:** Focus on core competition mechanics first. Add betting once matches work.

### D006 — First Competition Format
**Decision:** Bug Bash (coding duel)
**Date:** 2026-02-01
**Rationale:** Objectively measurable (tests pass/fail), easy to sandbox (Docker), developer audience, clear visuals, short matches (5-15 min)

### D007 — Landing Page Base
**Decision:** Use Kimmy's repo (mrchreesa/clawlympics-landing) as base
**Date:** 2026-02-01
**Rationale:** Better visual polish, shadcn/ui components, lucide icons. Charlie adds architecture docs and form state.

---

*(More decisions added as we go)*
