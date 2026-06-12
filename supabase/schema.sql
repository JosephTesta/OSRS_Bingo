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

CREATE TABLE game_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_actions ENABLE ROW LEVEL SECURITY;

-- Allow full access for now (we handle admin auth in the app)
CREATE POLICY "Public access for games" ON games FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for teams" ON teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for game actions" ON game_actions FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_teams_game_id ON teams(game_id);
CREATE INDEX idx_game_actions_game_created ON game_actions(game_id, created_at);
CREATE INDEX idx_game_actions_team_created ON game_actions(team_id, created_at);

CREATE OR REPLACE FUNCTION apply_tile_action(
  p_team_id UUID,
  p_game_id UUID,
  p_client_action_id TEXT,
  p_tile_index INTEGER,
  p_row INTEGER,
  p_col INTEGER,
  p_damage INTEGER,
  p_old_active_boss_index INTEGER,
  p_new_active_boss_index INTEGER,
  p_log_entry JSONB,
  p_history_snapshot JSONB,
  p_pending_replacement JSONB,
  p_completed_positions BOOLEAN[],
  p_replaced_positions BOOLEAN[],
  p_line_completed_positions BOOLEAN[],
  p_exhausted_tasks TEXT[]
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_team RECORD;
  v_tile JSONB;
  v_board JSONB;
  v_boss JSONB;
  v_bosses JSONB;
  v_new_hp NUMERIC;
  v_completed BOOLEAN[];
  v_replaced BOOLEAN[];
  v_line_completed BOOLEAN[];
  v_exhausted TEXT[];
  v_log JSONB;
  v_history JSONB;
  v_action_id UUID;
  v_payload JSONB;
  v_new_active INTEGER;
  v_has_replacement BOOLEAN;
BEGIN
  SELECT t.*, g.settings INTO v_team
  FROM teams t
  JOIN games g ON g.id = t.game_id
  WHERE t.id = p_team_id AND t.game_id = p_game_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'team_not_found');
  END IF;

  v_tile := v_team.board #> ARRAY[p_row::text, p_col::text];
  IF v_tile IS NULL THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'tile_not_found');
  END IF;

  IF COALESCE((v_tile->>'completed')::boolean, false)
     OR COALESCE((v_tile->>'flipped')::boolean, false)
     OR COALESCE(v_team.completed_positions[p_tile_index + 1], false)
     OR COALESCE(v_team.replaced_positions[p_tile_index + 1], false) THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'tile_already_completed');
  END IF;

  v_boss := v_team.bosses #> ARRAY[p_old_active_boss_index::text];
  IF v_boss IS NULL
     OR COALESCE((v_boss->>'defeated')::boolean, false)
     OR COALESCE((v_boss->>'currentHp')::numeric, 0) <= 0 THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'boss_not_available');
  END IF;

  v_new_hp := GREATEST(0, COALESCE((v_boss->>'currentHp')::numeric, 0) - COALESCE(p_damage, 0));
  v_boss := jsonb_set(v_boss, '{currentHp}'::text[], to_jsonb(v_new_hp), true);
  v_boss := jsonb_set(v_boss, '{defeated}'::text[], to_jsonb(v_new_hp = 0), true);
  v_bosses := jsonb_set(v_team.bosses, ARRAY[p_old_active_boss_index::text], v_boss, true);

  v_board := v_team.board;
  v_has_replacement := p_pending_replacement IS NOT NULL AND (p_pending_replacement ? 'id');

  IF v_has_replacement THEN
    v_board := jsonb_set(v_board, ARRAY[p_row::text, p_col::text], p_pending_replacement, true);
  ELSE
    v_tile := jsonb_set(v_tile, '{flipped}'::text[], 'false'::jsonb, true);
    v_tile := jsonb_set(v_tile, '{completed}'::text[], 'true'::jsonb, true);
    v_tile := jsonb_set(v_tile, '{pendingReplacement}'::text[], 'null'::jsonb, true);
    v_board := jsonb_set(v_board, ARRAY[p_row::text, p_col::text], v_tile, true);
  END IF;

  v_completed := COALESCE(v_team.completed_positions, ARRAY[false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]::boolean[]);
  v_replaced := COALESCE(v_team.replaced_positions, ARRAY[false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]::boolean[]);
  v_line_completed := COALESCE(v_team.line_completed_positions, ARRAY[false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]::boolean[]);
  v_completed[p_tile_index + 1] := NOT v_has_replacement;
  v_replaced[p_tile_index + 1] := v_has_replacement;

  IF p_line_completed_positions IS NOT NULL THEN
    FOR i IN 1..25 LOOP
      IF p_line_completed_positions[i] THEN
        v_line_completed[i] := true;
      END IF;
    END LOOP;
  END IF;

  v_exhausted := COALESCE(v_team.exhausted_tasks, ARRAY[]::text[]);
  IF p_exhausted_tasks IS NOT NULL THEN
    FOR i IN 1..cardinality(p_exhausted_tasks) LOOP
      IF NOT v_exhausted @> ARRAY[p_exhausted_tasks[i]] THEN
        v_exhausted := array_append(v_exhausted, p_exhausted_tasks[i]);
      END IF;
    END LOOP;
  END IF;

  v_log := COALESCE(v_team.log, '[]'::jsonb);
  IF p_log_entry IS NOT NULL AND p_log_entry <> '{}'::jsonb THEN
    v_log := v_log || jsonb_build_array(p_log_entry);
    IF jsonb_array_length(v_log) > 100 THEN
      v_log := (
        SELECT jsonb_agg(value ORDER BY ord)
        FROM jsonb_array_elements(v_log) WITH ORDINALITY AS e(value, ord)
        WHERE ord > jsonb_array_length(v_log) - 100
      );
    END IF;
  END IF;

  v_history := COALESCE(v_team.history, '[]'::jsonb);
  IF p_history_snapshot IS NOT NULL AND p_history_snapshot <> '{}'::jsonb THEN
    v_history := v_history || jsonb_build_array(p_history_snapshot);
    IF jsonb_array_length(v_history) > 50 THEN
      v_history := (
        SELECT jsonb_agg(value ORDER BY ord)
        FROM jsonb_array_elements(v_history) WITH ORDINALITY AS e(value, ord)
        WHERE ord > jsonb_array_length(v_history) - 50
      );
    END IF;
  END IF;

  v_new_active := COALESCE(p_new_active_boss_index, p_old_active_boss_index);
  IF v_new_active < 0 OR v_new_active >= jsonb_array_length(v_bosses) THEN
    v_new_active := p_old_active_boss_index;
  END IF;

  UPDATE teams
  SET board = v_board,
      exhausted_tasks = v_exhausted,
      completed_positions = v_completed,
      line_completed_positions = v_line_completed,
      replaced_positions = v_replaced,
      bosses = v_bosses,
      active_boss_index = v_new_active,
      log = v_log,
      history = v_history
  WHERE id = p_team_id
  RETURNING * INTO v_team;

  INSERT INTO game_actions (game_id, team_id, action_type, payload)
  VALUES (
    p_game_id,
    p_team_id,
    'TILE_CLICK',
    jsonb_build_object('client_action_id', p_client_action_id, 'action_type', 'TILE_CLICK')
  )
  RETURNING id INTO v_action_id;

  v_payload := jsonb_build_object(
    'client_action_id', p_client_action_id,
    'action_type', 'TILE_CLICK',
    'team', to_jsonb(v_team)
  );

  UPDATE game_actions
  SET payload = v_payload
  WHERE id = v_action_id;

  RETURN jsonb_build_object('applied', true, 'action_id', v_action_id, 'team', v_team);
END;
$$;

