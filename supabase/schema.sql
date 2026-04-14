-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Games table
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_password_hash TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  board JSONB NOT NULL,
  exhausted_tasks TEXT[] DEFAULT '{}',
  completed_positions BOOLEAN[] DEFAULT ARRAY[false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
  line_completed_positions BOOLEAN[] DEFAULT ARRAY[false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
  replaced_positions BOOLEAN[] DEFAULT ARRAY[false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
  bosses JSONB NOT NULL,
  active_boss_index INTEGER DEFAULT 0,
  log JSONB DEFAULT '[]',
  history JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Allow full access for now (we handle admin auth in the app)
CREATE POLICY "Public access for games" ON games FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for teams" ON teams FOR ALL USING (true) WITH CHECK (true);

-- Create index for faster team lookups
CREATE INDEX idx_teams_game_id ON teams(game_id);
