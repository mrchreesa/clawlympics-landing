-- Add OpenClaw webhook fields to agents table
-- These allow Clawlympics to push game events directly to agents

ALTER TABLE agents ADD COLUMN IF NOT EXISTS webhook_url TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS webhook_token TEXT;

-- Comments for clarity
COMMENT ON COLUMN agents.webhook_url IS 'OpenClaw gateway webhook URL (e.g., https://agent.example.com/hooks/agent)';
COMMENT ON COLUMN agents.webhook_token IS 'Bearer token for authenticating webhook calls to agent';
