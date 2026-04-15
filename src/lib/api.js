import { supabase } from './supabase';

export async function createGame(settings, adminPassword) {
  const passwordHash = btoa(adminPassword);
  
  const { data: game, error } = await supabase
    .from('games')
    .insert({
      admin_password_hash: passwordHash,
      settings: JSON.stringify(settings),
      is_active: true
    })
    .select()
    .single();
    
  if (error) {
    console.error("Failed to create game:", error.message);
    throw new Error("Failed to create game: " + error.message);
  }
  return game;
}

export async function getGame(gameId) {
  const { data: game, error } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();
    
  if (error) {
    console.error("Failed to get game:", error.message);
    return null;
  }
  return {
    ...game,
    settings: typeof game.settings === 'string' ? JSON.parse(game.settings) : game.settings
  };
}

export async function verifyAdminPassword(gameId, password) {
  try {
    const game = await getGame(gameId);
    if (!game) return false;
    return game.admin_password_hash === btoa(password);
  } catch (err) {
    console.error("verifyAdminPassword error:", err);
    return false;
  }
}

export async function updateGameSettings(gameId, settings) {
  const { error } = await supabase
    .from('games')
    .update({ settings: JSON.stringify(settings) })
    .eq('id', gameId);
    
  if (error) throw error;
}

export async function getTeams(gameId) {
  const { data: teams, error } = await supabase
    .from('teams')
    .select('*')
    .eq('game_id', gameId)
    .order('created_at');
    
  if (error) throw error;
  return teams.map(t => ({
    ...t,
    board: typeof t.board === 'string' ? JSON.parse(t.board) : t.board,
    bosses: typeof t.bosses === 'string' ? JSON.parse(t.bosses) : t.bosses,
    log: typeof t.log === 'string' ? JSON.parse(t.log) : (t.log || []),
    history: typeof t.history === 'string' ? JSON.parse(t.history) : (t.history || []),
  }));
}

export async function createTeam(gameId, teamData) {
  const { data: team, error } = await supabase
    .from('teams')
    .insert({
      game_id: gameId,
      name: teamData.name,
      board: JSON.stringify(teamData.board),
      exhausted_tasks: teamData.exhausted_tasks,
      completed_positions: teamData.completed_positions,
      line_completed_positions: teamData.line_completed_positions,
      replaced_positions: teamData.replaced_positions,
      bosses: JSON.stringify(teamData.bosses),
      active_boss_index: teamData.active_boss_index,
      log: JSON.stringify(teamData.log || []),
      history: JSON.stringify(teamData.history || []),
    })
    .select()
    .single();
    
  if (error) throw error;
  return team;
}

export async function updateTeam(teamId, updates) {
  const dbUpdates = {
    ...updates,
    board: updates.board ? JSON.stringify(updates.board) : undefined,
    bosses: updates.bosses ? JSON.stringify(updates.bosses) : undefined,
    log: updates.log ? JSON.stringify(updates.log) : undefined,
    history: updates.history ? JSON.stringify(updates.history) : undefined,
  };
  
  const { error } = await supabase
    .from('teams')
    .update(dbUpdates)
    .eq('id', teamId);
    
  if (error) throw error;
}

export async function getTeam(teamId) {
  const { data: team, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single();
    
  if (error) throw error;
  return {
    ...team,
    board: typeof team.board === 'string' ? JSON.parse(team.board) : team.board,
    bosses: typeof team.bosses === 'string' ? JSON.parse(team.bosses) : team.bosses,
    log: typeof team.log === 'string' ? JSON.parse(team.log) : (team.log || []),
    history: typeof team.history === 'string' ? JSON.parse(team.history) : (team.history || []),
  };
}

export async function saveTeamState(teamId, teamData) {
  console.log('saveTeamState called', teamId);
  try {
    const { data, error } = await supabase.rpc('save_team_state', {
      p_team_id: teamId,
      p_board: JSON.stringify(teamData.board),
      p_bosses: JSON.stringify(teamData.bosses),
      p_active_boss_index: teamData.active_boss_index,
      p_log: JSON.stringify(teamData.log),
      p_history: JSON.stringify(teamData.history),
      p_completed_positions: teamData.completed_positions,
      p_exhausted_tasks: teamData.exhausted_tasks,
    });
    
    if (error) {
      console.error('saveTeamState RPC error:', error);
      await saveTeamStateFallback(teamId, teamData);
    } else {
      console.log('saveTeamState result:', data);
    }
  } catch (e) {
    console.error('saveTeamState exception:', e);
    await saveTeamStateFallback(teamId, teamData);
  }
}

async function saveTeamStateFallback(teamId, teamData) {
  const latest = await getTeam(teamId);
  
  const mergedLog = [...(latest.log || []), ...(teamData.log || [])].slice(-100);
  const mergedHistory = [...(latest.history || []), ...(teamData.history || [])].slice(-50);
  const mergedExhausted = teamData.exhausted_tasks || latest.exhaustedTasks;
  
  const mergedCompleted = [...(teamData.completed_positions || latest.completedPositions || Array(25).fill(false))];
  const mergedLineCompleted = [...(teamData.line_completed_positions || latest.lineCompletedPositions || Array(25).fill(false))];
  const mergedReplaced = [...(teamData.replaced_positions || latest.replacedPositions || Array(25).fill(false))];

  const dbUpdates = {
    completed_positions: mergedCompleted,
    line_completed_positions: mergedLineCompleted,
    replaced_positions: mergedReplaced,
    exhausted_tasks: mergedExhausted,
    log: JSON.stringify(mergedLog),
    history: JSON.stringify(mergedHistory),
    board: JSON.stringify(teamData.board || latest.board),
    bosses: JSON.stringify(teamData.bosses || latest.bosses),
    active_boss_index: teamData.active_boss_index ?? latest.activeBossIndex,
  };
  
  const { error } = await supabase
    .from('teams')
    .update(dbUpdates)
    .eq('id', teamId);
    
  if (error) throw error;
}

export async function markTileComplete(teamId, tileIndex, tileData) {
  console.log('markTileComplete called', teamId, tileIndex);
  try {
    const { data, error } = await supabase.rpc('complete_tile', {
      p_team_id: teamId,
      p_tile_index: tileIndex,
      p_board: JSON.stringify(tileData.board),
      p_bosses: JSON.stringify(tileData.bosses),
      p_active_boss_index: tileData.activeBossIndex,
      p_log: JSON.stringify(tileData.log),
      p_history: JSON.stringify(tileData.history),
      p_completed_positions: tileData.completedPositions,
      p_exhausted_tasks: tileData.exhaustedTasks,
    });
    
    if (error) {
      console.error('markTileComplete RPC error:', error);
      await markTileCompleteFallback(teamId, tileIndex, tileData);
    } else {
      console.log('markTileComplete result:', data);
    }
  } catch (e) {
    console.error('markTileComplete exception:', e);
    await markTileCompleteFallback(teamId, tileIndex, tileData);
  }
}

async function markTileCompleteFallback(teamId, tileIndex, tileData) {
  const latest = await getTeam(teamId);
  
  const currentCompleted = latest.completedPositions || Array(25).fill(false);
  const currentReplaced = latest.replacedPositions || Array(25).fill(false);
  const currentLineCompleted = latest.lineCompletedPositions || Array(25).fill(false);
  
  currentCompleted[tileIndex] = tileData.completedPositions?.[tileIndex] ?? true;
  
  if (tileData.replacedPositions) {
    for (let i = 0; i < 25; i++) {
      if (tileData.replacedPositions[i]) currentReplaced[i] = true;
    }
  }
  
  if (tileData.lineCompletedPositions) {
    for (let i = 0; i < 25; i++) {
      if (tileData.lineCompletedPositions[i]) currentLineCompleted[i] = true;
    }
  }
  
  const mergedLog = [...(latest.log || []), ...(tileData.log || [])].slice(-100);
  const mergedHistory = [...(latest.history || []), ...(tileData.history || [])].slice(-50);
  
  const dbUpdates = {
    completed_positions: currentCompleted,
    replaced_positions: currentReplaced,
    line_completed_positions: currentLineCompleted,
    exhausted_tasks: tileData.exhaustedTasks || latest.exhaustedTasks,
    log: JSON.stringify(mergedLog),
    history: JSON.stringify(mergedHistory),
    board: JSON.stringify(tileData.board || latest.board),
    bosses: JSON.stringify(tileData.bosses || latest.bosses),
    active_boss_index: tileData.activeBossIndex ?? latest.activeBossIndex,
  };
  
  const { error } = await supabase
    .from('teams')
    .update(dbUpdates)
    .eq('id', teamId);
    
  if (error) throw error;
}
