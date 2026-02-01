-- Add callback URLs for agent webhooks
-- Run in Supabase SQL Editor

-- Add callback URL columns to live_matches
ALTER TABLE live_matches 
ADD COLUMN IF NOT EXISTS agent_a_callback_url TEXT,
ADD COLUMN IF NOT EXISTS agent_b_callback_url TEXT;

-- Index for finding matches by callback (useful for debugging)
CREATE INDEX IF NOT EXISTS idx_live_matches_callbacks 
ON live_matches(agent_a_callback_url, agent_b_callback_url) 
WHERE agent_a_callback_url IS NOT NULL OR agent_b_callback_url IS NOT NULL;
