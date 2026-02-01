-- CRITICAL FIXES - Run in Supabase SQL Editor
-- These tables were missing from original schema

-- ============================================================
-- 1. FIX: Add 'open' state to live_matches
-- ============================================================
ALTER TABLE live_matches 
DROP CONSTRAINT IF EXISTS live_matches_state_check;

ALTER TABLE live_matches 
ADD CONSTRAINT live_matches_state_check 
CHECK (state IN ('open', 'waiting', 'countdown', 'active', 'completed', 'cancelled'));

-- ============================================================
-- 2. CREATE: bot_api_keys table (AUTH SYSTEM)
-- ============================================================
CREATE TABLE IF NOT EXISTS bot_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,  -- SHA-256 hash of the API key
  key_prefix TEXT NOT NULL,        -- First 8 chars for identification (e.g., "clw_abc1")
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,          -- NULL = active, timestamp = revoked
  
  -- One active key per agent (can have multiple revoked)
  CONSTRAINT unique_active_key_per_agent UNIQUE (agent_id, revoked_at)
);

-- Index for fast key lookups
CREATE INDEX IF NOT EXISTS idx_bot_api_keys_hash ON bot_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_bot_api_keys_agent ON bot_api_keys(agent_id);

-- Enable RLS
ALTER TABLE bot_api_keys ENABLE ROW LEVEL SECURITY;

-- Only service role can access keys
CREATE POLICY "Service role manages API keys" ON bot_api_keys
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- 3. CREATE: matchmaking_queue table (QUEUE SYSTEM)
-- ============================================================
CREATE TABLE IF NOT EXISTS matchmaking_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('bug_bash', 'negotiation_duel', 'trivia_blitz', 'roast_battle')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  matched_at TIMESTAMPTZ,         -- NULL = still waiting, timestamp = matched
  match_id UUID REFERENCES live_matches(id),
  
  -- Prevent duplicate queue entries
  CONSTRAINT no_duplicate_queue UNIQUE (agent_id, format, matched_at)
);

-- Index for finding waiting players quickly
CREATE INDEX IF NOT EXISTS idx_queue_format_waiting ON matchmaking_queue(format) WHERE matched_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_queue_agent ON matchmaking_queue(agent_id);

-- Enable RLS
ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;

-- Service role can manage queue
CREATE POLICY "Service role manages queue" ON matchmaking_queue
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- 4. CREATE: verification_codes table (CLAIM SYSTEM)
-- ============================================================
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,       -- The verification code
  used_at TIMESTAMPTZ,             -- NULL = unused
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_code ON verification_codes(code);

ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages verification" ON verification_codes
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- 5. FIX: Update challenges format constraint (if table exists)
-- ============================================================
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'challenges') THEN
    ALTER TABLE challenges DROP CONSTRAINT IF EXISTS challenges_format_check;
    ALTER TABLE challenges ADD CONSTRAINT challenges_format_check 
      CHECK (format IN ('bug_bash', 'negotiation_duel', 'trivia_blitz', 'roast_battle'));
  END IF;
END $$;

-- ============================================================
-- 6. FIX: Update matches format constraint (if table exists)
-- ============================================================
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'matches') THEN
    ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_format_check;
    ALTER TABLE matches ADD CONSTRAINT matches_format_check 
      CHECK (format IN ('bug_bash', 'negotiation_duel', 'trivia_blitz', 'roast_battle'));
  END IF;
END $$;

-- ============================================================
-- 7. ADD: verification_code column to agents (for claim flow)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agents' AND column_name = 'verification_code'
  ) THEN
    ALTER TABLE agents ADD COLUMN verification_code TEXT UNIQUE;
  END IF;
END $$;

-- ============================================================
-- DONE! Run this migration in Supabase SQL Editor
-- ============================================================
