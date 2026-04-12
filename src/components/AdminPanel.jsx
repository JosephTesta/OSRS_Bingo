import { useState, useEffect } from "react";
import { DEFAULT_TASKS } from "../data/tasks";
import { DEFAULT_BOSSES } from "../data/bosses";

const BOSSES_DATA = DEFAULT_BOSSES.map(b => ({
  id: b.id,
  name: b.name,
  maxHp: b.maxHp,
  img: `/bosses/${b.id}.png`,
}));

export function AdminPanel({ onStart }) {
  const [tab, setTab] = useState("bosses");
  const [selBosses, setSelBosses] = useState(["b035", "b018"]);
  const [teamCount, setTeamCount] = useState(2);
  const [teamNames, setTeamNames] = useState(["Team Alpha", "Team Bravo", "Team Charlie", "Team Delta", "Team Echo", "Team Foxtrot"]);
  const [dMin, setDMin] = useState(50);
  const [dMax, setDMax] = useState(200);
  const [dMinRaw, setDMinRaw] = useState("50");
  const [dMaxRaw, setDMaxRaw] = useState("200");
  const [rowBonusDamage, setRowBonusDamage] = useState(50);
  const [enableRowBonus, setEnableRowBonus] = useState(true);
  const dRangeValid = dMin > 0 && dMax > 0 && dMin < dMax;
  const [replacement, setReplacement] = useState(true);
  const [sequential, setSequential] = useState(true);
  const [taskDifficulties, setTaskDifficulties] = useState(new Set());
  const [taskCategories, setTaskCategories] = useState(new Set());
  const filteredTasks =
    taskDifficulties.size === 0 && taskCategories.size === 0
      ? DEFAULT_TASKS.filter(t => t.isDefault)
      : DEFAULT_TASKS.filter(
          t =>
            (taskDifficulties.size === 0 || taskDifficulties.has(t.difficulty)) &&
            (taskCategories.size === 0 || taskCategories.has(t.category))
        );
  const [taskText, setTaskText] = useState(filteredTasks.map(t => t.description).join("\n"));
  const [tasks, setTasks] = useState(filteredTasks.map(t => t.description));

  const toggleBoss = id => setSelBosses(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));

  const toggleTaskDifficulty = difficulty => {
    const newSet = new Set(taskDifficulties);
    if (newSet.has(difficulty)) {
      newSet.delete(difficulty);
    } else {
      newSet.add(difficulty);
    }
    setTaskDifficulties(newSet);
  };

  const toggleTaskCategory = category => {
    const newSet = new Set(taskCategories);
    if (newSet.has(category)) {
      newSet.delete(category);
    } else {
      newSet.add(category);
    }
    setTaskCategories(newSet);
  };

  useEffect(() => {
    const newFilteredTasks =
      taskDifficulties.size === 0 && taskCategories.size === 0
        ? DEFAULT_TASKS.filter(t => t.isDefault)
        : DEFAULT_TASKS.filter(
            t =>
              (taskDifficulties.size === 0 || taskDifficulties.has(t.difficulty)) &&
              (taskCategories.size === 0 || taskCategories.has(t.category))
          );
    const newTaskDescriptions = newFilteredTasks.map(t => t.description);
    setTasks(newTaskDescriptions);
    setTaskText(newTaskDescriptions.join("\n"));
  }, [taskDifficulties, taskCategories]);

  const handleTaskChange = val => {
    setTaskText(val);
    setTasks(val.split("\n").map(t => t.trim()).filter(Boolean));
  };

  const canStart = selBosses.length > 0 && tasks.length >= 25 && dRangeValid;

  const handleStart = () => {
    if (!canStart) return;
    onStart({
      selectedBosses: BOSSES_DATA.filter(b => selBosses.includes(b.id)),
      teamNames: teamNames.slice(0, teamCount).map((n, i) => n.trim() || `Team ${i + 1}`),
      settings: { dMin, dMax, replacement, sequential, rowBonusDamage, enableRowBonus, tasks },
    });
  };

  const tabs = [
    { id: "bosses", label: "⚔ Bosses" },
    { id: "teams", label: "🛡 Teams" },
    { id: "settings", label: "⚙ Settings" },
    { id: "tasks", label: "📜 Tasks" },
  ];

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 14px" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h1
          className="cf"
          style={{
            fontSize: "clamp(22px,4.5vw,42px)",
            fontWeight: 900,
            color: "#c8a951",
            textShadow: "0 0 40px rgba(200,169,81,.35),2px 2px 0 #000",
            letterSpacing: ".07em",
            marginBottom: 8,
          }}
        >
          ⚔ OSRS BINGO BOSS EVENT ⚔
        </h1>
        <p style={{ color: "#5a4020", fontSize: 14, fontStyle: "italic" }}>Configure your teams, select your prey, and let the chaos begin.</p>
      </div>

      <div style={{ display: "flex", gap: 2, borderBottom: "1px solid #3a2800" }}>
        {tabs.map(t => (
          <button key={t.id} className={`tab-btn${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="panel" style={{ padding: 18, borderRadius: "0 3px 3px 3px", minHeight: 320 }}>
        {tab === "bosses" && (
          <div>
            <p style={{ fontSize: 13, color: "#6a5030", marginBottom: 14 }}>
              Select bosses — each team must defeat all of them to win. ({selBosses.length} selected)
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(168px,1fr))", gap: 8 }}>
              {BOSSES_DATA.map(b => {
                const sel = selBosses.includes(b.id);
                return (
                  <div
                    key={b.id}
                    onClick={() => toggleBoss(b.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      borderRadius: 3,
                      border: "1px solid",
                      cursor: "pointer",
                      transition: "all .15s",
                      borderColor: sel ? "#c8a951" : "#3a2800",
                      background: sel
                        ? "linear-gradient(135deg,rgba(200,169,81,.1),rgba(61,34,0,.5))"
                        : "linear-gradient(135deg,#130900,#080400)",
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        flexShrink: 0,
                        background: "#0d0800",
                        border: "1px solid #2a1800",
                        borderRadius: 2,
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <img
                        src={b.img}
                        alt={b.name}
                        style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated" }}
                        onError={e => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        className="cf"
                        style={{
                          fontSize: 10,
                          color: sel ? "#c8a951" : "#6a5030",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {b.name}
                      </div>
                      <div style={{ fontSize: 10, color: sel ? "#c8a951" : "#6a5030" }}>❤ {b.maxHp.toLocaleString()}</div>
                    </div>
                    {sel && <span style={{ color: "#c8a951", fontSize: 13, flexShrink: 0 }}>✓</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "teams" && (
          <div>
            <p style={{ fontSize: 13, color: "#6a5030", marginBottom: 12 }}>Number of teams</p>
            <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
              {[2, 3, 4, 5, 6].map(n => (
                <button
                  key={n}
                  className="btn"
                  style={{
                    padding: "6px 16px",
                    borderColor: teamCount === n ? "#c8a951" : "#6b4a18",
                    background: teamCount === n ? "linear-gradient(180deg,#4a2d00,#2d1a00)" : undefined,
                    color: teamCount === n ? "#f0d080" : "#c8a951",
                  }}
                  onClick={() => setTeamCount(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {Array.from({ length: teamCount }, (_, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="cf" style={{ color: "#5a4020", fontSize: 11, width: 55, textAlign: "right" }}>
                    Team {i + 1}
                  </span>
                  <input
                    type="text"
                    value={teamNames[i] || ""}
                    style={{ width: 220 }}
                    placeholder={`Team ${i + 1}`}
                    onChange={e => {
                      const n = [...teamNames];
                      n[i] = e.target.value;
                      setTeamNames(n);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "settings" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div>
              <p style={{ fontSize: 13, color: "#6a5030", marginBottom: 10 }}>
                Tile Damage Range
                {dRangeValid && <span style={{ color: "#c8a951" }}> — {dMin} to {dMax}</span>}
              </p>
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                {[
                  { lbl: "Min", raw: dMinRaw, other: dMax, setRaw: setDMinRaw, setVal: setDMin, isMin: true },
                  { lbl: "Max", raw: dMaxRaw, other: dMin, setRaw: setDMaxRaw, setVal: setDMax, isMin: false },
                ].map(({ lbl, raw, other, setRaw, setVal, isMin }) => {
                  const parsed = parseInt(raw, 10);
                  const isEmpty = raw.trim() === "";
                  const isInvalid = !isEmpty && (isNaN(parsed) || parsed < 1 || (isMin ? parsed >= other : parsed <= other));
                  return (
                    <div key={lbl}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                        <span style={{ color: "#5a4020", width: 28 }}>{lbl}</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={raw}
                          onChange={e => {
                            const v = e.target.value.replace(/[^0-9]/g, "");
                            setRaw(v);
                            const n = parseInt(v, 10);
                            if (!isNaN(n) && n >= 1) setVal(n);
                          }}
                          style={{ width: 90, borderColor: isInvalid ? "#7a2020" : isEmpty ? "#5a3808" : "#3a2800" }}
                          placeholder="e.g. 50"
                        />
                      </label>
                      {isInvalid && (
                        <p style={{ fontSize: 11, color: "#ef4444", marginTop: 4, marginLeft: 36 }}>
                          {isMin ? (parsed >= other ? "Must be less than max" : "Must be at least 1") : parsed <= other ? "Must be greater than min" : "Must be at least 1"}
                        </p>
                      )}
                      {isEmpty && <p style={{ fontSize: 11, color: "#7a5020", marginTop: 4, marginLeft: 36 }}>Enter a number</p>}
                    </div>
                  );
                })}
              </div>
              {!dRangeValid && !(dMinRaw.trim() === "" || dMaxRaw.trim() === "") && (
                <p style={{ fontSize: 11, color: "#ef4444", marginTop: 8 }}>⚠ Min must be lower than Max before you can start.</p>
              )}
            </div>

            {[
              {
                val: replacement,
                set: setReplacement,
                label: "Tile Replacement",
                desc: "Completed tiles are replaced with fresh random tasks (never repeating)",
              },
              { val: sequential, set: setSequential, label: "Sequential Bosses", desc: "Auto-advance to next boss when current is defeated" },
              {
                val: enableRowBonus,
                set: setEnableRowBonus,
                label: "Row Completion Bonus",
                desc: "Award bonus damage when completing rows, columns, or diagonals",
                hasInput: true,
              },
            ].map(item => (
              <div key={item.label}>
                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={item.val} onChange={e => item.set(e.target.checked)} style={{ marginTop: 3 }} />
                  <div>
                    <div style={{ fontSize: 14, color: "#c8a951" }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: "#5a4020" }}>{item.desc}</div>
                  </div>
                </label>
                {item.hasInput && enableRowBonus && (
                  <div style={{ marginLeft: 30, marginTop: 8, paddingLeft: 10, borderLeft: "2px solid rgba(200,168,75,0.2)" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                      <span style={{ color: "#5a4020", width: 60 }}>Bonus Damage:</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={rowBonusDamage}
                        onChange={e => {
                          const v = e.target.value.replace(/[^0-9]/g, "");
                          setRowBonusDamage(v === "" ? 0 : parseInt(v, 10));
                        }}
                        style={{ width: 80 }}
                        placeholder="e.g. 50"
                      />
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "tasks" && (
          <div>
            <p style={{ fontSize: 13, color: "#6a5030", marginBottom: 14 }}>
              Filter tasks by difficulty and category. ({filteredTasks.length} available)
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 12, color: "#5a4020", marginBottom: 6 }}>Difficulty</p>
                <div style={{ display: "flex", gap: 12 }}>
                  {["easy", "medium", "hard", "elite"].map(diff => (
                    <label key={diff} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                      <input type="checkbox" checked={taskDifficulties.has(diff)} onChange={() => toggleTaskDifficulty(diff)} />
                      <span style={{ fontSize: 12, color: "#c8a951", textTransform: "capitalize" }}>{diff}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p style={{ fontSize: 12, color: "#5a4020", marginBottom: 6 }}>Category</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  {["combat", "skilling", "achievement", "minigame"].map(cat => (
                    <label key={cat} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                      <input type="checkbox" checked={taskCategories.has(cat)} onChange={() => toggleTaskCategory(cat)} />
                      <span style={{ fontSize: 12, color: "#c8a951", textTransform: "capitalize" }}>{cat}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <p style={{ fontSize: 13, color: "#6a5030" }}>
                {tasks.length} tasks selected
                {tasks.length < 25 && <span style={{ color: "#ef4444" }}> — need at least 25!</span>}
              </p>
              <button
                className="btn"
                style={{ fontSize: 11 }}
                onClick={() => {
                  setTaskDifficulties(new Set());
                  setTaskCategories(new Set());
                }}
              >
                Restore Default
              </button>
            </div>

            <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid #3a2800", padding: 8, background: "#0d0800" }}>
              {filteredTasks.map(task => (
                <div key={task.id} style={{ fontSize: 11, color: "#6a5030", marginBottom: 4, padding: 2, borderBottom: "1px solid #1a1000" }}>
                  <span style={{ color: "#3a2800" }}>[{task.category}]</span> {task.description}
                  <span
                    style={{
                      float: "right",
                      color: task.difficulty === "easy" ? "#22c55e" : task.difficulty === "medium" ? "#f59e0b" : "#ef4444",
                      fontWeight: "bold",
                    }}
                  >
                    {task.difficulty}
                  </span>
                </div>
              ))}
            </div>

            <p style={{ fontSize: 11, color: "#5a4020", marginTop: 8 }}>Or edit manually below:</p>
            <textarea
              value={taskText}
              onChange={e => handleTaskChange(e.target.value)}
              style={{ width: "100%", height: 100, fontSize: 12, marginTop: 4 }}
              placeholder="One task per line (minimum 25)"
            />
          </div>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: 24 }}>
        <button className="btn btn-green" style={{ fontSize: 14, padding: "12px 48px" }} onClick={handleStart} disabled={!canStart}>
          ⚔ BEGIN THE EVENT ⚔
        </button>
        {!canStart && (
          <p style={{ color: "#7a2a2a", fontSize: 12, marginTop: 8 }}>
            {selBosses.length === 0 ? "Select at least one boss" : tasks.length < 25 ? "Need at least 25 tasks in pool" : "Fix damage range: Min must be a positive number less than Max"}
          </p>
        )}
      </div>
    </div>
  );
}