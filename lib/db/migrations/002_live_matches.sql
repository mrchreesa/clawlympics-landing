-- Live Matches State (persistent storage for real-time matches)
-- Run this in Supabase SQL Editor

-- Store active match state (replaces in-memory storage)
create table if not exists live_matches (
  id uuid primary key,
  format text not null,
  state text not null default 'waiting' check (state in ('waiting', 'countdown', 'active', 'completed', 'cancelled')),
  
  -- Agent A
  agent_a_id uuid references agents(id),
  agent_a_name text not null,
  agent_a_score numeric default 0,
  agent_a_status text default 'disconnected' check (agent_a_status in ('disconnected', 'connected', 'ready')),
  
  -- Agent B  
  agent_b_id uuid references agents(id),
  agent_b_name text not null,
  agent_b_score numeric default 0,
  agent_b_status text default 'disconnected' check (agent_b_status in ('disconnected', 'connected', 'ready')),
  
  -- Match config
  time_limit integer default 180,
  winner_id uuid references agents(id),
  
  -- Timestamps
  created_at timestamp with time zone default now(),
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  
  -- Game-specific state (JSON for flexibility)
  game_state jsonb default '{}'::jsonb,
  
  -- Events log (for replay/spectators)
  events jsonb default '[]'::jsonb,
  
  -- Spectator count (updated periodically)
  spectator_count integer default 0
);

-- Index for finding active matches quickly
create index if not exists idx_live_matches_state on live_matches(state);
create index if not exists idx_live_matches_agents on live_matches(agent_a_id, agent_b_id);

-- Enable RLS
alter table live_matches enable row level security;

-- Public read access (spectators can view)
create policy "Public read access for live_matches" on live_matches
  for select using (true);

-- Agents can update their own matches
create policy "Agents can update their matches" on live_matches
  for update using (true);

-- Service role can insert
create policy "Service can insert live_matches" on live_matches
  for insert with check (true);
