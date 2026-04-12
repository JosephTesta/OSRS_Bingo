export const uid = () => Math.random().toString(36).slice(2, 9);

export const randInt = (mn, mx) => Math.floor(Math.random() * (mx - mn + 1)) + mn;

export const fmtTime = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export const shuffle = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const makeTile = (task, dMin, dMax, isNew = false) => ({
  id: uid(),
  task,
  damage: randInt(dMin, dMax),
  flipped: false,
  completed: false,
  isNew,
});

export const makeBoard = (pool, dMin, dMax) => {
  const picked = shuffle(pool).slice(0, 25);
  const board = Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: 5 }, (_, c) => ({
      id: uid(),
      task: picked[r * 5 + c],
      damage: randInt(dMin, dMax),
      flipped: false,
      completed: false,
      isNew: false,
    }))
  );
  return {
    board,
    exhaustedTasks: [...picked],
    completedPositions: Array(25).fill(false),
    lineCompletedPositions: Array(25).fill(false),
  };
};

export const makeBosses = selectedBosses =>
  selectedBosses.map(b => ({ ...b, currentHp: b.maxHp, defeated: false }));

export const snapshotTeam = t => ({
  bosses: t.bosses.map(b => ({ ...b })),
  activeBossIndex: t.activeBossIndex,
  board: t.board.map(row => row.map(tile => ({ ...tile }))),
  exhaustedTasks: [...t.exhaustedTasks],
  completedPositions: [...(t.completedPositions || Array(25).fill(false))],
  lineCompletedPositions: [...(t.lineCompletedPositions || Array(25).fill(false))],
});

export const hpPct = (cur, max) => Math.max(0, Math.min(100, (cur / max) * 100));

export const hpColor = (cur, max) => {
  const p = cur / max;
  return p > 0.5 ? "#22c55e" : p > 0.25 ? "#f59e0b" : "#ef4444";
};

export const checkLinesCompleted = (board, r, c) => {
  const testBoard = board.map((row, ri) =>
    row.map((tl, ci) => ({ ...tl, flipped: tl.flipped || tl.completed }))
  );
  testBoard[r][c] = { ...testBoard[r][c], flipped: true };

  let completedLines = 0;

  if (testBoard[r].every(t => t.flipped)) completedLines++;
  if (testBoard.every(row => row[c].flipped)) completedLines++;
  if (r === c && testBoard.every((row, i) => row[i].flipped)) completedLines++;
  if (r + c === 4 && testBoard.every((row, i) => row[4 - i].flipped)) completedLines++;

  return completedLines;
};

export const getLinePositions = (board, r, c) => {
  const testBoard = board.map((row, ri) =>
    row.map((tl, ci) => ({ ...tl, flipped: tl.flipped || tl.completed }))
  );
  testBoard[r][c] = { ...testBoard[r][c], flipped: true };

  const linePositions = Array(25).fill(false);

  for (let ri = 0; ri < 5; ri++) {
    if (testBoard[ri].every(t => t.flipped)) {
      for (let ci = 0; ci < 5; ci++) linePositions[ri * 5 + ci] = true;
    }
  }
  for (let ci = 0; ci < 5; ci++) {
    if (testBoard.every(row => row[ci].flipped)) {
      for (let ri = 0; ri < 5; ri++) linePositions[ri * 5 + ci] = true;
    }
  }
  if (testBoard.every((row, i) => row[i].flipped)) {
    for (let i = 0; i < 5; i++) linePositions[i * 5 + i] = true;
  }
  if (testBoard.every((row, i) => row[4 - i].flipped)) {
    for (let i = 0; i < 5; i++) linePositions[i * 5 + (4 - i)] = true;
  }

  return linePositions;
};