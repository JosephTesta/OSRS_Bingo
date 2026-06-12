import { supabase } from './supabase';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = value => typeof value === "string" && uuidPattern.test(value);

export async function createGame(settings, adminPassword) {
  const passwordHash = adminPassword ? btoa(adminPassword) : "";
  
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
  if (!isUuid(gameId)) return null;

  const { data: game, error } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .maybeSingle();
  console.log("[api.getGame] response:", { gameId, game, error });
    
  if (error) {
    console.error("Failed to get game:", error.message);
    return null;
  }
  if (!game) return null;
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
  if (!isUuid(gameId)) return [];

  const { data: teams, error } = await supabase
    .from('teams')
    .select('*')
    .eq('game_id', gameId)
    .order('created_at');
    
  if (error) throw error;
  console.log('[api.getTeams] fetched teams for gameId:', { gameId, count: teams.length, teams: teams.map(t => ({ id: t.id, gameId: t.game_id, name: t.name })) });
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
      board: teamData.board,
      exhausted_tasks: teamData.exhausted_tasks,
      completed_positions: teamData.completed_positions,
      line_completed_positions: teamData.line_completed_positions,
      replaced_positions: teamData.replaced_positions,
      bosses: teamData.bosses,
      active_boss_index: teamData.active_boss_index,
      log: teamData.log || [],
      history: teamData.history || [],
    })
    .select()
    .single();
    
  if (error) throw error;
  console.log('[api.createTeam] created team:', { teamId: team.id, gameId, teamName: team.name, gameIdInDb: team.game_id });
  
  // Verify the team was actually created with the correct game_id
  const verification = await getTeam(team.id);
  if (verification && verification.id === team.id) {
    console.log('[api.createTeam] verification passed - team is in database with game_id:', verification.id, team.game_id);
  } else {
    console.warn('[api.createTeam] verification failed - team might not be properly saved');
  }
  
  return team;
}

export async function updateTeam(teamId, updates) {
  const dbUpdates = {
    ...updates,
    board: updates.board,
    bosses: updates.bosses,
    log: updates.log,
    history: updates.history,
  };
  
  const { error } = await supabase
    .from('teams')
    .update(dbUpdates)
    .eq('id', teamId);
    
  if (error) throw error;
}

export async function getTeam(teamId) {
  if (!isUuid(teamId)) return null;

  const { data: team, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .maybeSingle();
    
  if (error) throw error;
  if (!team) return null;
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
    // Fetch latest server state and merge to avoid overwriting concurrent updates
    const latest = await getTeam(teamId);
    if (!latest) {
      console.warn('saveTeamState: latest state not found, falling back to RPC with provided data');
      const { data, error } = await supabase.rpc('save_team_state', {
        p_team_id: teamId,
        p_board: teamData.board,
        p_bosses: teamData.bosses,
        p_active_boss_index: teamData.active_boss_index,
        p_log: teamData.log || [],
        p_history: teamData.history || [],
        p_completed_positions: teamData.completed_positions,
        p_exhausted_tasks: teamData.exhausted_tasks,
      });
      if (error) {
        console.error('saveTeamState RPC error (no latest):', error);
        await saveTeamStateFallback(teamId, teamData);
      } else {
        console.log('saveTeamState result (no latest):', data);
      }
      return;
    }

    // Merge logs/history/exhausted
    const mergedLog = [...(latest.log || []), ...(teamData.log || [])].slice(-100);
    const mergedHistory = [...(latest.history || []), ...(teamData.history || [])].slice(-50);
    const mergedExhausted = Array.from(new Set([...(latest.exhaustedTasks || []), ...(teamData.exhausted_tasks || [])]));

    // Merge completed/replaced/lineCompleted - take OR to preserve others' progress
    const mergedCompleted = Array.from({ length: 25 }, (_, i) => Boolean((latest.completedPositions || [])[i]) || Boolean((teamData.completed_positions || [])[i]));
    const mergedReplaced = Array.from({ length: 25 }, (_, i) => Boolean((latest.replacedPositions || [])[i]) || Boolean((teamData.replaced_positions || [])[i]));
    const mergedLineCompleted = Array.from({ length: 25 }, (_, i) => Boolean((latest.lineCompletedPositions || [])[i]) || Boolean((teamData.line_completed_positions || [])[i]));

    // Merge bosses conservatively: prefer lower currentHp (preserve damage applied by others)
    const mergedBosses = (latest.bosses || []).map((lb, idx) => {
      const sb = (teamData.bosses || [])[idx] || {};
      const lbHp = typeof lb.currentHp === 'number' ? lb.currentHp : Number(lb.currentHp || 0);
      const sbHp = typeof sb.currentHp === 'number' ? sb.currentHp : Number(sb.currentHp || lbHp);
      const currentHp = Math.min(lbHp, sbHp);
      const defeated = Boolean(lb.defeated) || Boolean(sb.defeated) || currentHp <= 0;
      return { ...lb, ...sb, currentHp, defeated };
    });

    // Merge board conservatively: for each tile, if either side marks it completed/flipped, preserve true
    const mergedBoard = (latest.board || []).map((row, r) =>
      (row || []).map((tile, c) => {
        const idx = r * 5 + c;
        const serverTile = tile || {};
        const clientTile = (teamData.board && teamData.board[r] && teamData.board[r][c]) || {};
        const completed = Boolean((latest.completedPositions || [])[idx]) || Boolean((teamData.completed_positions || [])[idx]) || Boolean(serverTile.completed) || Boolean(clientTile.completed);
        const flipped = Boolean(serverTile.flipped) || Boolean(clientTile.flipped);
        const pendingReplacement = clientTile.pendingReplacement || serverTile.pendingReplacement || null;
        const damage = clientTile.damage ?? serverTile.damage;
        const id = serverTile.id || clientTile.id;
        const task = serverTile.task || clientTile.task;
        return { ...serverTile, ...clientTile, id, task, damage, flipped, completed, pendingReplacement };
      })
    );

    const payload = {
      p_team_id: teamId,
      p_board: mergedBoard,
      p_bosses: mergedBosses,
      p_active_boss_index: teamData.active_boss_index ?? latest.activeBossIndex,
      p_log: mergedLog,
      p_history: mergedHistory,
      p_completed_positions: mergedCompleted,
      p_exhausted_tasks: mergedExhausted,
      p_replaced_positions: mergedReplaced,
      p_line_completed_positions: mergedLineCompleted,
    };

    console.log('[saveTeamState] merged payload, calling RPC', payload);
    const { data, error } = await supabase.rpc('save_team_state', payload);
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
    log: mergedLog,
    history: mergedHistory,
    board: teamData.board || latest.board,
    bosses: teamData.bosses || latest.bosses,
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

export async function applyTileAction(gameId, teamId, action) {
  if (!isUuid(gameId) || !isUuid(teamId)) {
    throw new Error("Invalid game or team id");
  }

  const rpcPayload = {
    p_team_id: teamId,
    p_game_id: gameId,
    p_client_action_id: action.clientActionId,
    p_tile_index: action.tileIndex,
    p_row: action.row,
    p_col: action.col,
    p_damage: action.damage,
    p_old_active_boss_index: action.oldActiveBossIndex,
    p_new_active_boss_index: action.newActiveBossIndex,
    p_log_entry: action.logEntry || null,
    p_history_snapshot: action.historySnapshot || null,
    p_pending_replacement: action.pendingReplacement || null,
    p_completed_positions: action.completedPositions,
    p_replaced_positions: action.replacedPositions,
    p_line_completed_positions: action.lineCompletedPositions,
    p_exhausted_tasks: action.exhaustedTasks,
  };
  console.log("[api.applyTileAction] rpc payload:", rpcPayload);

  const { data, error } = await supabase.rpc('apply_tile_action', rpcPayload);
  console.log("[api.applyTileAction] rpc response:", { data, error });

  if (error) throw error;
  return data;
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
    log: mergedLog,
    history: mergedHistory,
    board: tileData.board || latest.board,
    bosses: tileData.bosses || latest.bosses,
    active_boss_index: tileData.activeBossIndex ?? latest.activeBossIndex,
  };
  
  const { error } = await supabase
    .from('teams')
    .update(dbUpdates)
    .eq('id', teamId);
    
  if (error) throw error;
}
