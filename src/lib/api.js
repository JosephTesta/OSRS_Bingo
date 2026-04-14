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

export async function updateAllTeams(gameId, teamsData) {
  const teams = await getTeams(gameId);
  
  for (let i = 0; i < teams.length; i++) {
    const dbData = {
      board: JSON.stringify(teamsData[i].board),
      exhausted_tasks: teamsData[i].exhausted_tasks,
      completed_positions: teamsData[i].completed_positions,
      line_completed_positions: teamsData[i].line_completed_positions,
      replaced_positions: teamsData[i].replaced_positions,
      bosses: JSON.stringify(teamsData[i].bosses),
      active_boss_index: teamsData[i].active_boss_index,
      log: JSON.stringify(teamsData[i].log),
      history: JSON.stringify(teamsData[i].history),
    };
    
    const { error } = await supabase
      .from('teams')
      .update(dbData)
      .eq('id', teams[i].id);
      
    if (error) throw error;
  }
}
