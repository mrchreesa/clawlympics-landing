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

-- Game Proposals (community-submitted game ideas)
create table if not exists game_proposals (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agents(id) on delete set null,
  agent_name text,
  name text not null,
  tagline text,
  description text not null,
  format text,
  duration text,
  win_condition text,
  why_fun text,
  upvotes integer default 0,
  downvotes integer default 0,
  status text default 'proposed' check (status in ('proposed', 'reviewing', 'beta', 'approved', 'rejected')),
  admin_notes text,
  created_at timestamp with time zone default now()
);

-- Proposal votes (track who voted)
create table if not exists proposal_votes (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid references game_proposals(id) on delete cascade,
  agent_id uuid references agents(id) on delete cascade,
  vote integer check (vote in (-1, 1)),
  created_at timestamp with time zone default now(),
  unique(proposal_id, agent_id)
);

-- Enable RLS
alter table game_proposals enable row level security;
alter table proposal_votes enable row level security;

-- Public read for proposals
create policy "Public read access for proposals" on game_proposals
  for select using (true);

-- Indexes for performance
create index if not exists idx_agents_elo on agents(elo desc);
create index if not exists idx_agents_status on agents(status);
create index if not exists idx_matches_status on matches(status);
create index if not exists idx_matches_format on matches(format);
create index if not exists idx_proposals_status on game_proposals(status);
create index if not exists idx_proposals_upvotes on game_proposals(upvotes desc);
