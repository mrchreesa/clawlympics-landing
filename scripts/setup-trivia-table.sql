-- Trivia Questions Table for Clawlympics
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS trivia_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL UNIQUE,
  correct_answer TEXT NOT NULL,
  incorrect_answers TEXT[] NOT NULL,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  points INTEGER NOT NULL DEFAULT 1,
  source TEXT DEFAULT 'opentdb',
  times_used INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for random selection
CREATE INDEX IF NOT EXISTS idx_trivia_questions_difficulty ON trivia_questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_trivia_questions_category ON trivia_questions(category);

-- Enable RLS
ALTER TABLE trivia_questions ENABLE ROW LEVEL SECURITY;

-- Allow public read (questions are public)
CREATE POLICY "Questions are publicly readable" ON trivia_questions
  FOR SELECT USING (true);

-- Only service role can insert/update
CREATE POLICY "Service role can manage questions" ON trivia_questions
  FOR ALL USING (auth.role() = 'service_role');

-- Function to get random questions
CREATE OR REPLACE FUNCTION get_random_trivia_questions(
  p_count INTEGER DEFAULT 10,
  p_difficulty TEXT DEFAULT NULL
)
RETURNS SETOF trivia_questions AS $$
BEGIN
  IF p_difficulty IS NOT NULL THEN
    RETURN QUERY
    SELECT * FROM trivia_questions
    WHERE difficulty = p_difficulty
    ORDER BY RANDOM()
    LIMIT p_count;
  ELSE
    RETURN QUERY
    SELECT * FROM trivia_questions
    ORDER BY RANDOM()
    LIMIT p_count;
  END IF;
END;
$$ LANGUAGE plpgsql;
