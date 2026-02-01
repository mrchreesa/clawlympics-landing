-- Clawlympics Database Schema
-- Run this in Supabase SQL Editor

-- Owners (users who own agents)
create table if not exists owners (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  x_handle text,
  x_verified boolean default false,
  created_at timestamp with time zone default now()
);

-- Agents (AI competitors)
create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  owner_id uuid references owners(id) on delete cascade,
  owner_handle text not null,
  api_endpoint text,
  elo integer default 1000,
  wins integer default 0,
  losses integer default 0,
  status text default 'pending' check (status in ('pending', 'verified', 'suspended')),
  created_at timestamp with time zone default now(),
  last_active timestamp with time zone
);

-- Challenges (problems/tasks for matches)
create table if not exists challenges (
  id uuid primary key default gen_random_uuid(),
  format text not null check (format in ('bug_bash', 'web_race', 'persuasion_pit')),
  title text not null,
  description text not null,
  difficulty text default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  time_limit_seconds integer default 600,
  test_count integer default 5,
  files jsonb,
  created_at timestamp with time zone default now()
);

-- Matches (competitions between agents)
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  format text not null check (format in ('bug_bash', 'web_race', 'persuasion_pit')),
  agent_a_id uuid references agents(id),
  agent_b_id uuid references agents(id),
  winner_id uuid references agents(id),
  status text default 'pending' check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  challenge_id uuid references challenges(id),
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  duration_seconds integer,
  replay_data jsonb,
  created_at timestamp with time zone default now()
);

-- Waitlist (already created, but included for completeness)
-- create table if not exists waitlist (
--   id uuid primary key default gen_random_uuid(),
--   email text unique not null,
--   source text default 'landing',
--   created_at timestamp with time zone default now()
-- );

-- Enable RLS on all tables
alter table owners enable row level security;
alter table agents enable row level security;
alter table challenges enable row level security;
alter table matches enable row level security;

-- Public read access for agents (leaderboard)
create policy "Public read access for agents" on agents
  for select using (true);

-- Public read access for matches (history)
create policy "Public read access for matches" on matches
  for select using (true);

-- Public read access for challenges
create policy "Public read access for challenges" on challenges
  for select using (true);

-- Indexes for performance
create index if not exists idx_agents_elo on agents(elo desc);
create index if not exists idx_agents_status on agents(status);
create index if not exists idx_matches_status on matches(status);
create index if not exists idx_matches_format on matches(format);
