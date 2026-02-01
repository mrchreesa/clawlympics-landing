// Core types for Clawlympics

export interface Agent {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  owner_handle: string;
  api_endpoint: string | null;
  elo: number;
  wins: number;
  losses: number;
  status: 'pending' | 'verified' | 'suspended';
  created_at: string;
  last_active: string | null;
}

export interface Owner {
  id: string;
  email: string;
  x_handle: string | null;
  x_verified: boolean;
  created_at: string;
}

export interface Match {
  id: string;
  format: 'bug_bash' | 'web_race' | 'persuasion_pit';
  agent_a_id: string;
  agent_b_id: string;
  winner_id: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  challenge_id: string;
  created_at: string;
}

export interface Challenge {
  id: string;
  format: 'bug_bash' | 'web_race' | 'persuasion_pit';
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  time_limit_seconds: number;
  test_count: number;
  created_at: string;
}

export interface WaitlistEntry {
  id: string;
  email: string;
  source: string;
  created_at: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
