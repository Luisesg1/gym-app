import { useState, useEffect, useRef, createContext, useContext } from "react";

// ─── Theme Context ────────────────────────────────────────────────────────────
const ThemeCtx = createContext();
const useTheme = () => useContext(ThemeCtx);

// ─── Auth Context ─────────────────────────────────────────────────────────────
const AuthCtx = createContext();
const useAuth = () => useContext(AuthCtx);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const fmtDate = (d) => { if (!d) return ""; const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; };
const todayStr = () => new Date().toISOString().slice(0, 10);
const lettersOnly = (v) => v.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "");
const numDot = (v) => v.replace(/[^0-9.]/g, "");
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const load = (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } };

// ─── Data ─────────────────────────────────────────────────────────────────────
const PLANS = {
  free:  { name: "Free",  price: "$0/mes",   color: "#64748b", features: ["5 sesiones máx.", "Sin gráficos", "Sin exportar", "Sin rutinas"] },
  pro:   { name: "Pro",   price: "$4.99/mes", color: "#3b82f6", features: ["Sesiones ilimitadas", "Gráficos de progreso", "Exportar JSON/CSV", "Rutinas predefinidas"] },
  elite: { name: "Elite", price: "$9.99/mes", color: "#f59e0b", features: ["Todo Pro", "Planes personalizados", "IA recomendaciones", "Soporte prioritario"] },
};

const PRESETS = {
  "Push Day":  ["Press Banca", "Press Hombro", "Fondos", "Tríceps Polea", "Elevaciones Laterales"],
  "Pull Day":  ["Dominadas", "Remo con Barra", "Curl Bíceps", "Face Pull", "Pullover"],
  "Leg Day":   ["Sentadilla", "Peso Muerto", "Prensa de Pierna", "Extensión Cuádriceps", "Curl Femoral"],
  "Full Body": ["Sentadilla", "Press Banca", "Dominadas", "Peso Muerto Rumano", "Press Hombro"],
};

const EXERCISE_DB = [
  { name: "Press Banca", muscle: "Pecho", machine: false, equipment: "Barra" },
  { name: "Press Banca Inclinado", muscle: "Pecho", machine: false, equipment: "Barra" },
  { name: "Press Mancuernas", muscle: "Pecho", machine: false, equipment: "Mancuernas" },
  { name: "Aperturas Mancuernas", muscle: "Pecho", machine: false, equipment: "Mancuernas" },
  { name: "Fondos", muscle: "Pecho", machine: false, equipment: "Cuerpo" },
  { name: "Crossover Polea", muscle: "Pecho", machine: true, equipment: "Polea" },
  { name: "Press Pecho Máquina", muscle: "Pecho", machine: true, equipment: "Máquina" },
  { name: "Dominadas", muscle: "Espalda", machine: false, equipment: "Barra" },
  { name: "Remo con Barra", muscle: "Espalda", machine: false, equipment: "Barra" },
  { name: "Remo Mancuerna", muscle: "Espalda", machine: false, equipment: "Mancuernas" },
  { name: "Peso Muerto", muscle: "Espalda", machine: false, equipment: "Barra" },
  { name: "Pullover", muscle: "Espalda", machine: false, equipment: "Mancuernas" },
  { name: "Jalón al Pecho", muscle: "Espalda", machine: true, equipment: "Polea" },
  { name: "Remo Polea Baja", muscle: "Espalda", machine: true, equipment: "Polea" },
  { name: "Face Pull", muscle: "Espalda", machine: true, equipment: "Polea" },
  { name: "Press Hombro Barra", muscle: "Hombros", machine: false, equipment: "Barra" },
  { name: "Press Arnold", muscle: "Hombros", machine: false, equipment: "Mancuernas" },
  { name: "Elevaciones Laterales", muscle: "Hombros", machine: false, equipment: "Mancuernas" },
  { name: "Elevaciones Frontales", muscle: "Hombros", machine: false, equipment: "Mancuernas" },
  { name: "Pájaros", muscle: "Hombros", machine: false, equipment: "Mancuernas" },
  { name: "Press Hombro Máquina", muscle: "Hombros", machine: true, equipment: "Máquina" },
  { name: "Curl Bíceps Barra", muscle: "Bíceps", machine: false, equipment: "Barra" },
  { name: "Curl Mancuernas", muscle: "Bíceps", machine: false, equipment: "Mancuernas" },
  { name: "Curl Martillo", muscle: "Bíceps", machine: false, equipment: "Mancuernas" },
  { name: "Curl Concentrado", muscle: "Bíceps", machine: false, equipment: "Mancuernas" },
  { name: "Curl Polea", muscle: "Bíceps", machine: true, equipment: "Polea" },
  { name: "Press Francés", muscle: "Tríceps", machine: false, equipment: "Barra" },
  { name: "Extensión Tríceps Mancuerna", muscle: "Tríceps", machine: false, equipment: "Mancuernas" },
  { name: "Fondos Tríceps", muscle: "Tríceps", machine: false, equipment: "Cuerpo" },
  { name: "Tríceps Polea", muscle: "Tríceps", machine: true, equipment: "Polea" },
  { name: "Sentadilla", muscle: "Cuádriceps", machine: false, equipment: "Barra" },
  { name: "Sentadilla Goblet", muscle: "Cuádriceps", machine: false, equipment: "Mancuernas" },
  { name: "Zancadas", muscle: "Cuádriceps", machine: false, equipment: "Mancuernas" },
  { name: "Prensa de Pierna", muscle: "Cuádriceps", machine: true, equipment: "Máquina" },
  { name: "Extensión Cuádriceps", muscle: "Cuádriceps", machine: true, equipment: "Máquina" },
  { name: "Peso Muerto Rumano", muscle: "Femoral", machine: false, equipment: "Barra" },
  { name: "Curl Femoral Tumbado", muscle: "Femoral", machine: true, equipment: "Máquina" },
  { name: "Hip Thrust", muscle: "Glúteos", machine: false, equipment: "Barra" },
  { name: "Abductores", muscle: "Glúteos", machine: true, equipment: "Máquina" },
  { name: "Pantorrillas Máquina", muscle: "Pantorrillas", machine: true, equipment: "Máquina" },
  { name: "Elevación de Talones", muscle: "Pantorrillas", machine: false, equipment: "Cuerpo" },
  { name: "Plancha", muscle: "Core", machine: false, equipment: "Cuerpo" },
  { name: "Crunch", muscle: "Core", machine: false, equipment: "Cuerpo" },
  { name: "Elevación de Piernas", muscle: "Core", machine: false, equipment: "Cuerpo" },
  { name: "Crunch Polea", muscle: "Core", machine: true, equipment: "Polea" },
  { name: "Rueda Abdominal", muscle: "Core", machine: false, equipment: "Accesorio" },
  { name: "Cinta Correr", muscle: "Cardio", machine: true, equipment: "Máquina" },
  { name: "Bicicleta Estática", muscle: "Cardio", machine: true, equipment: "Máquina" },
  { name: "Elíptica", muscle: "Cardio", machine: true, equipment: "Máquina" },
  { name: "Burpees", muscle: "Cardio", machine: false, equipment: "Cuerpo" },
  { name: "Saltar Cuerda", muscle: "Cardio", machine: false, equipment: "Accesorio" },
];

const MUSCLES = [...new Set(EXERCISE_DB.map(e => e.muscle))];

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data }) {
  if (!data || data.length < 2) return null;
  const vals = data.map(d => parseFloat(d.weight) || 0);
  const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1;
  const W = 70, H = 24;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * W},${H - ((v - min) / range) * (H - 4) - 2}`);
  const up = vals[vals.length - 1] >= vals[vals.length - 2];
  const color = up ? "#22c55e" : "#f87171";
  return (
    <svg width={W} height={H} style={{ display: "block", flexShrink: 0 }}>
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => { const [x, y] = p.split(","); return <circle key={i} cx={x} cy={y} r={i === vals.length - 1 ? 3 : 1.5} fill={color} />; })}
    </svg>
  );
}

// ─── Progress Modal ───────────────────────────────────────────────────────────
function ProgressModal({ exName, sessions, onClose }) {
  const { dark } = useTheme();
  const history = [];
  sessions.forEach(s => (s.exercises || []).forEach(ex => {
    if (ex.name.toLowerCase() === exName.toLowerCase())
      history.push({ date: s.date, weight: parseFloat(ex.weight) || 0 });
  }));
  history.sort((a, b) => a.date.localeCompare(b.date));
  const vals = history.map(h => h.weight);
  const min = Math.min(...vals, 0), max = Math.max(...vals, 1), range = max - min || 1;
  const W = 400, H = 130;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">📈 {exName}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        {history.length < 2
          ? <p className="text-muted" style={{ fontSize: 14 }}>Necesitas al menos 2 registros para ver progreso.</p>
          : <>
            <svg width="100%" viewBox={`0 0 ${W + 4} ${H + 30}`} style={{ display: "block", margin: "8px 0 12px" }}>
              {[0, 0.5, 1].map(t => {
                const y = H - t * H;
                return <g key={t}>
                  <line x1={36} y1={y} x2={W} y2={y} stroke={dark ? "#1e293b" : "#e2e8f0"} strokeWidth={1} />
                  <text x={30} y={y + 4} textAnchor="end" fill={dark ? "#475569" : "#94a3b8"} fontSize={10}>{(min + t * range).toFixed(1)}</text>
                </g>;
              })}
              <polyline points={history.map((h, i) => `${36 + (i / (history.length - 1)) * (W - 36)},${H - ((h.weight - min) / range) * H}`).join(" ")} fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeLinecap="round" />
              {history.map((h, i) => {
                const x = 36 + (i / (history.length - 1)) * (W - 36);
                const y = H - ((h.weight - min) / range) * H;
                return <g key={i}><circle cx={x} cy={y} r={4} fill="#3b82f6" /><text x={x} y={H + 22} textAnchor="middle" fill={dark ? "#475569" : "#94a3b8"} fontSize={9}>{fmtDate(h.date)}</text></g>;
              })}
            </svg>
            <div style={{ display: "flex", gap: 20, fontSize: 13 }}>
              {[["Máx", `${max}kg`], ["Mín", `${min}kg`], ["Registros", history.length]].map(([l, v]) =>
                <span key={l} className="text-muted">{l}: <b style={{ color: "var(--text)" }}>{v}</b></span>
              )}
            </div>
          </>
        }
      </div>
    </div>
  );
}

// ─── Plans Modal ──────────────────────────────────────────────────────────────
function PlansModal({ currentPlan, onSelect, onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">⚡ Elige tu plan</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="plans-grid">
          {Object.entries(PLANS).map(([key, plan]) => (
            <div key={key} className={`plan-card ${currentPlan === key ? "plan-active" : ""}`} style={{ "--pc": plan.color }}>
              <div className="plan-name">{plan.name}</div>
              <div className="plan-price" style={{ color: plan.color }}>{plan.price}</div>
              <ul className="plan-features">{plan.features.map(f => <li key={f}>✓ {f}</li>)}</ul>
              <button className="plan-btn" style={{ borderColor: plan.color, background: currentPlan === key ? plan.color : "transparent", color: currentPlan === key ? "white" : plan.color }} onClick={() => { onSelect(key); onClose(); }}>
                {currentPlan === key ? "Plan actual" : "Seleccionar"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Exercise Library ─────────────────────────────────────────────────────────
function ExerciseLibrary({ onSelect, onClose }) {
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("Todos");
  const [machineFilter, setMachineFilter] = useState("Todos");

  const filtered = EXERCISE_DB.filter(ex => {
    const matchSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    const matchMuscle = muscleFilter === "Todos" || ex.muscle === muscleFilter;
    const matchMachine = machineFilter === "Todos" || (machineFilter === "Máquina" ? ex.machine : !ex.machine);
    return matchSearch && matchMuscle && matchMachine;
  });

  const grouped = MUSCLES.reduce((acc, m) => {
    const exs = filtered.filter(e => e.muscle === m);
    if (exs.length > 0) acc[m] = exs;
    return acc;
  }, {});

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-library" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">📚 Ejercicios</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="lib-filters">
          <input className="input" placeholder="Buscar…" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
          <select className="input" value={machineFilter} onChange={e => setMachineFilter(e.target.value)} style={{ width: "auto" }}>
            <option>Todos</option>
            <option>Máquina</option>
            <option>Sin máquina</option>
          </select>
        </div>
        <div className="muscle-chips">
          {["Todos", ...MUSCLES].map(m => (
            <button key={m} className={`muscle-chip ${muscleFilter === m ? "active" : ""}`} onClick={() => setMuscleFilter(m)}>{m}</button>
          ))}
        </div>
        <div className="lib-list">
          {Object.entries(grouped).map(([muscle, exs]) => (
            <div key={muscle} className="lib-group">
              <div className="lib-group-title">{muscle}</div>
              {exs.map(ex => (
                <button key={ex.name} className="lib-item" onClick={() => { onSelect(ex.name); onClose(); }}>
                  <div className="lib-info">
                    <span className="lib-name">{ex.name}</span>
                    <span className="lib-meta">{ex.equipment} · {ex.machine ? "Requiere máquina" : "Sin máquina"}</span>
                  </div>
                  <span className="lib-add">+</span>
                </button>
              ))}
            </div>
          ))}
          {Object.keys(grouped).length === 0 && <p className="text-muted" style={{ padding: "20px 0", textAlign: "center" }}>Sin resultados</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────
function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  function submit() {
    setErr("");
    if (!email || !pass) { setErr("Completa todos los campos"); return; }
    if (mode === "register" && !name) { setErr("Ingresa tu nombre"); return; }
    const result = mode === "login" ? login(email, pass) : register(name, email, pass);
    if (!result.ok) setErr(result.msg);
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo"><span style={{ fontSize: 36 }}>⚡</span><span className="logo-text">GymTracker</span></div>
        <p className="text-muted" style={{ marginBottom: 28, fontSize: 14 }}>Tu entrenamiento. Tu progreso.</p>
        <div className="tab-row">
          <button className={`tab-btn ${mode === "login" ? "active" : ""}`} onClick={() => setMode("login")}>Iniciar sesión</button>
          <button className={`tab-btn ${mode === "register" ? "active" : ""}`} onClick={() => setMode("register")}>Registrarse</button>
        </div>
        {mode === "register" && <div className="field"><label className="field-label">Nombre</label><input className="input" placeholder="Tu nombre" value={name} onChange={e => setName(e.target.value)} /></div>}
        <div className="field"><label className="field-label">Email</label><input className="input" type="email" placeholder="email@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div className="field"><label className="field-label">Contraseña</label><input className="input" type="password" placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} /></div>
        {err && <div className="err-msg">{err}</div>}
        <button className="btn-primary" style={{ width: "100%", marginTop: 8 }} onClick={submit}>{mode === "login" ? "Entrar" : "Crear cuenta"}</button>
        <p className="text-muted" style={{ fontSize: 13, textAlign: "center", marginTop: 14 }}>
          {mode === "login" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
          <button className="link-btn" onClick={() => { setMode(mode === "login" ? "register" : "login"); setErr(""); }}>{mode === "login" ? "Regístrate" : "Inicia sesión"}</button>
        </p>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ sessions }) {
  const total = sessions.length;
  const thisWeek = sessions.filter(s => (new Date() - new Date(s.date + "T00:00:00")) / 86400000 <= 7).length;
  const exCount = {};
  sessions.forEach(s => (s.exercises || []).forEach(ex => { exCount[ex.name] = (exCount[ex.name] || 0) + 1; }));
  const topEx = Object.entries(exCount).sort((a, b) => b[1] - a[1])[0];
  const wCount = {};
  sessions.forEach(s => { wCount[s.workout] = (wCount[s.workout] || 0) + 1; });
  const topW = Object.entries(wCount).sort((a, b) => b[1] - a[1])[0];
  const totalVol = sessions.reduce((acc, s) => acc + (s.exercises || []).reduce((a, ex) => a + (parseFloat(ex.weight) || 0) * (parseFloat(ex.reps) || 1), 0), 0);

  const stats = [
    { icon: "🏋️", label: "Sesiones totales", value: total },
    { icon: "🔥", label: "Esta semana", value: thisWeek },
    { icon: "⭐", label: "Ejercicio top", value: topEx ? topEx[0] : "—" },
    { icon: "💪", label: "Rutina favorita", value: topW ? topW[0] : "—" },
    { icon: "⚖️", label: "Volumen total", value: totalVol > 0 ? `${(totalVol / 1000).toFixed(1)}t` : "—" },
  ];

  return (
    <div>
      <div className="section-title">Dashboard</div>
      <div className="stats-grid">
        {stats.map((s, i) => (
          <div key={s.label} className="stat-card" style={{ animationDelay: `${i * 0.07}s` }}>
            <span style={{ fontSize: 26 }}>{s.icon}</span>
            <span className="stat-value">{s.value}</span>
            <span className="text-muted" style={{ fontSize: 11 }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Session Card ─────────────────────────────────────────────────────────────
function SessionCard({ s, unit, onDelete, onEdit, onDuplicate, onProgress, getProgressData, expanded, onToggle }) {
  const u = s.unit || unit;
  return (
    <div className="card session-card">
      <div className="session-header" onClick={onToggle}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span className="session-date">{fmtDate(s.date)}</span>
          <span className="session-workout">{s.workout}</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="ex-count">{(s.exercises || []).length} ejerc.</span>
          <span className="chevron">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>
      {expanded && (
        <div className="session-body">
          {s.notes && <p className="session-notes">{s.notes}</p>}
          {(s.exercises || []).map(ex => (
            <div key={ex.id} className="ex-row-saved">
              <div style={{ flex: 1, minWidth: 0 }}>
                <span className="ex-name">{ex.name}</span>
                {ex.sets?.length > 0
                  ? <><span className="sets-badge">{ex.sets.length} series</span><span className="ex-detail"> {ex.sets.map((st, i) => `S${i+1}: ${st.weight}${u}×${st.reps}`).join(" · ")}</span></>
                  : ex.weight ? <span className="ex-detail"> — {ex.weight}{u} × {ex.reps}</span> : null}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <Sparkline data={getProgressData(ex.name)} />
                <button className="icon-action" onClick={() => onProgress(ex.name)}>📈</button>
              </div>
            </div>
          ))}
          <div className="session-actions">
            <button className="btn-ghost" onClick={() => onEdit(s)}>✏️ Editar</button>
            <button className="btn-ghost" onClick={() => onDuplicate(s)}>📋 Duplicar</button>
            <button className="btn-ghost danger" onClick={() => onDelete(s.id)}>🗑️ Eliminar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── GymApp ───────────────────────────────────────────────────────────────────
function GymApp() {
  const { dark, toggleDark } = useTheme();
  const { user, logout, updatePlan } = useAuth();

  const storageKey = `gym_v3_${user.email}`;
  const [sessions, setSessions] = useState(() => load(storageKey, []));
  const [unit, setUnit] = useState(() => load("gym_unit", "kg"));
  const [activeTab, setActiveTab] = useState("new");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [date, setDate] = useState(todayStr());
  const [workout, setWorkout] = useState("");
  const [notes, setNotes] = useState("");
  const [currentExercises, setCurrentExercises] = useState([]);
  const [exName, setExName] = useState("");
  const [exWeight, setExWeight] = useState("");
  const [exReps, setExReps] = useState("");
  const [exSets, setExSets] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [expanded, setExpanded] = useState(null);
  const [filterWorkout, setFilterWorkout] = useState("");
  const [showPresets, setShowPresets] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSugg, setShowSugg] = useState(false);
  const [progressEx, setProgressEx] = useState(null);
  const [showPlans, setShowPlans] = useState(false);
  const [toast, setToast] = useState(null);
  const presetRef = useRef();

  useEffect(() => { store(storageKey, sessions); }, [sessions]);
  useEffect(() => { store("gym_unit", unit); }, [unit]);
  useEffect(() => {
    const handle = (e) => { if (presetRef.current && !presetRef.current.contains(e.target)) setShowPresets(false); };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const allExNames = [...new Set(sessions.flatMap(s => (s.exercises || []).map(e => e.name)))];
  const canAdd = user.plan !== "free" || sessions.length < 5;
  const canExport = user.plan !== "free";
  const canCharts = user.plan !== "free";

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2600); }

  function handleExName(v) {
    const val = lettersOnly(v);
    setExName(val);
    if (val.length > 1) {
      const s = allExNames.filter(n => n.toLowerCase().startsWith(val.toLowerCase()));
      setSuggestions(s); setShowSugg(s.length > 0);
    } else setShowSugg(false);
  }

  function addSet() {
    if (!exReps) return;
    setExSets(prev => [...prev, { id: uid(), weight: exWeight, reps: exReps }]);
    setExWeight(""); setExReps("");
  }

  function addExercise() {
    if (!exName) return;
    const sets = exSets.length > 0 ? exSets : (exWeight || exReps ? [{ id: uid(), weight: exWeight, reps: exReps }] : []);
    setCurrentExercises(prev => [...prev, { id: uid(), name: exName, sets, weight: exWeight, reps: exReps }]);
    setExName(""); setExWeight(""); setExReps(""); setExSets([]); setShowSugg(false);
  }

  function applyPreset(name) {
    if (user.plan === "free") { showToast("⚠️ Rutinas requieren plan Pro"); setShowPlans(true); return; }
    setWorkout(name);
    setCurrentExercises(PRESETS[name].map(n => ({ id: uid(), name: n, sets: [], weight: "", reps: "" })));
    setShowPresets(false);
    showToast(`Rutina "${name}" cargada`);
  }

  function saveSession() {
    if (!date || !workout) { showToast("⚠️ Faltan fecha o tipo de entrenamiento"); return; }
    if (currentExercises.length === 0) { showToast("⚠️ Agrega al menos un ejercicio"); return; }
    if (!canAdd && !editingId) { showToast("⚠️ Límite de 5 sesiones en plan Free"); setShowPlans(true); return; }
    if (editingId) {
      setSessions(prev => prev.map(s => s.id === editingId ? { ...s, date, workout, notes, exercises: currentExercises } : s));
      setEditingId(null); showToast("✅ Sesión actualizada");
    } else {
      setSessions(prev => [{ id: uid(), date, workout, notes, exercises: currentExercises, unit }, ...prev]);
      showToast("✅ Sesión guardada");
    }
    setDate(todayStr()); setWorkout(""); setNotes(""); setCurrentExercises([]); setExSets([]);
    setActiveTab("history");
  }

  function startEdit(s) {
    setEditingId(s.id); setDate(s.date); setWorkout(s.workout); setNotes(s.notes || "");
    setCurrentExercises((s.exercises || []).map(e => ({ ...e })));
    setActiveTab("new"); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function duplicate(s) {
    setDate(todayStr()); setWorkout(s.workout); setNotes(s.notes || "");
    setCurrentExercises((s.exercises || []).map(e => ({ ...e, id: uid() })));
    setEditingId(null); setActiveTab("new");
    window.scrollTo({ top: 0, behavior: "smooth" }); showToast("📋 Sesión duplicada");
  }

  function deleteSession(id) { setSessions(prev => prev.filter(s => s.id !== id)); showToast("🗑️ Eliminada"); }

  function exportJSON() {
    if (!canExport) { showToast("⚠️ Exportar requiere plan Pro"); setShowPlans(true); return; }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(sessions, null, 2)], { type: "application/json" }));
    a.download = `gym_${todayStr()}.json`; a.click(); showToast("📦 JSON exportado");
  }

  function exportCSV() {
    if (!canExport) { showToast("⚠️ Exportar requiere plan Pro"); setShowPlans(true); return; }
    const rows = [["Fecha", "Entrenamiento", "Ejercicio", "Series", "Peso", "Reps", "Notas"]];
    sessions.forEach(s => (s.exercises?.length ? s.exercises : [{ name: "", sets: [], weight: "", reps: "" }]).forEach(ex =>
      rows.push([s.date, s.workout, ex.name, ex.sets?.length || 0, ex.weight || "", ex.reps || "", s.notes || ""])
    ));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n")], { type: "text/csv" }));
    a.download = `gym_${todayStr()}.csv`; a.click(); showToast("📊 CSV exportado");
  }

  function getProgressData(name) {
    return sessions.flatMap(s => (s.exercises || []).filter(ex => ex.name.toLowerCase() === name.toLowerCase()).map(ex => ({ date: s.date, weight: parseFloat(ex.weight) || 0 }))).sort((a, b) => a.date.localeCompare(b.date));
  }

  const filtered = sessions.filter(s => !filterWorkout || s.workout.toLowerCase().includes(filterWorkout.toLowerCase()));

  const NAV = [
    { id: "new", icon: "➕", label: "Nueva sesión" },
    { id: "history", icon: "📋", label: "Historial" },
    { id: "dashboard", icon: "📊", label: "Dashboard" },
  ];

  return (
    <div className={`app-layout ${sidebarOpen ? "sb-open" : "sb-closed"}`}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-logo">
            <span style={{ fontSize: 20, flexShrink: 0 }}>⚡</span>
            {sidebarOpen && <span className="logo-text">GymTracker</span>}
          </div>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(v => !v)}>{sidebarOpen ? "◀" : "▶"}</button>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(item => (
            <button key={item.id} className={`nav-item ${activeTab === item.id ? "active" : ""}`} onClick={() => setActiveTab(item.id)}>
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {sidebarOpen && (
            <div className="user-card">
              <div className="user-avatar">{user.name?.[0]?.toUpperCase() || "U"}</div>
              <div style={{ minWidth: 0 }}>
                <div className="user-name">{user.name}</div>
                <button className="plan-badge" style={{ "--pc": PLANS[user.plan].color }} onClick={() => setShowPlans(true)}>{PLANS[user.plan].name}</button>
              </div>
            </div>
          )}
          <button className="nav-item" onClick={logout}>
            <span className="nav-icon">🚪</span>
            {sidebarOpen && <span className="nav-label">Salir</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        <div className="topbar">
          <h1 className="page-title">
            {activeTab === "new" ? (editingId ? "✏️ Editar sesión" : "Nueva sesión") : activeTab === "history" ? "Historial" : "Dashboard"}
          </h1>
          <div className="topbar-actions">
            <button className="topbar-btn" onClick={toggleDark}>
              <span className="topbar-btn-icon">{dark ? "☀️" : "🌙"}</span>
              <span className="topbar-btn-label">{dark ? "Claro" : "Oscuro"}</span>
            </button>
            <button className="topbar-btn" onClick={() => setUnit(u => u === "kg" ? "lbs" : "kg")}>
              <span className="topbar-btn-icon">⚖️</span>
              <span className="topbar-btn-label">{unit}</span>
            </button>
            <button className="topbar-btn" onClick={exportJSON}>
              <span className="topbar-btn-icon">📦</span>
              <span className="topbar-btn-label">JSON</span>
            </button>
            <button className="topbar-btn" onClick={exportCSV}>
              <span className="topbar-btn-icon">📊</span>
              <span className="topbar-btn-label">CSV</span>
            </button>
          </div>
        </div>

        {/* Nueva sesión */}
        {activeTab === "new" && (
          <div className="content-area fade-in">
            {!canAdd && !editingId && (
              <div className="upgrade-banner">⚠️ Límite de 5 sesiones en plan Free. <button className="link-btn" onClick={() => setShowPlans(true)}>Mejorar plan →</button></div>
            )}
            <div className="card">
              <div className="card-label">Info de la sesión</div>
              <div className="form-row">
                <div className="field">
                  <label className="field-label">Fecha</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input" />
                </div>
                <div className="field" style={{ flex: 2, position: "relative" }} ref={presetRef}>
                  <label className="field-label">Entrenamiento</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input placeholder="Push Day, Piernas…" value={workout} onChange={e => setWorkout(lettersOnly(e.target.value))} className="input" />
                    <button className="btn-ghost" onClick={() => setShowPresets(v => !v)}>📋</button>
                  </div>
                  {showPresets && (
                    <div className="dropdown">
                      {Object.keys(PRESETS).map(r => <button key={r} className="dropdown-item" onClick={() => applyPreset(r)}>{r}</button>)}
                    </div>
                  )}
                </div>
              </div>
              <div className="field">
                <label className="field-label">Notas</label>
                <textarea className="input textarea" placeholder="Cómo te sentiste, PR, observaciones…" value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </div>

            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <div className="card-label" style={{ margin: 0 }}>Ejercicios</div>
                <button className="btn-ghost small" onClick={() => setShowLibrary(true)}>📚 Ver ejercicios</button>
              </div>
              <div className="form-row" style={{ alignItems: "flex-end" }}>
                <div className="field" style={{ flex: 2, position: "relative" }}>
                  <label className="field-label">Ejercicio</label>
                  <input placeholder="Nombre…" value={exName} onChange={e => handleExName(e.target.value)} onBlur={() => setTimeout(() => setShowSugg(false), 150)} className="input" autoComplete="off" />
                  {showSugg && (
                    <div className="dropdown">
                      {suggestions.map(s => <button key={s} className="dropdown-item" onMouseDown={() => { setExName(s); setShowSugg(false); }}>{s}</button>)}
                    </div>
                  )}
                </div>
                <div className="field">
                  <label className="field-label">Peso ({unit})</label>
                  <input placeholder="0" value={exWeight} onChange={e => setExWeight(numDot(e.target.value))} className="input" />
                </div>
                <div className="field">
                  <label className="field-label">Reps</label>
                  <input placeholder="0" value={exReps} onChange={e => setExReps(numDot(e.target.value))} className="input" />
                </div>
                <button className="btn-ghost" style={{ alignSelf: "flex-end", padding: "10px 14px", whiteSpace: "nowrap" }} onClick={addSet}>+ Set</button>
              </div>

              {exSets.length > 0 && (
                <div className="sets-row">
                  {exSets.map((s, i) => (
                    <span key={s.id} className="set-chip">
                      S{i + 1}: {s.weight}{unit}×{s.reps}
                      <button className="chip-del" onClick={() => setExSets(prev => prev.filter(x => x.id !== s.id))}>×</button>
                    </span>
                  ))}
                </div>
              )}

              <button className="btn-add-ex" onClick={addExercise}>+ Agregar ejercicio</button>

              {currentExercises.length > 0 && (
                <div className="ex-list">
                  {currentExercises.map(ex => (
                    <div key={ex.id} className="ex-row">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span className="ex-name">{ex.name}</span>
                        {ex.sets?.length > 0
                          ? <><span className="sets-badge">{ex.sets.length} series</span><span className="ex-detail"> {ex.sets.map((s, i) => `S${i+1}: ${s.weight}${unit}×${s.reps}`).join(" · ")}</span></>
                          : ex.weight ? <span className="ex-detail"> — {ex.weight}{unit} × {ex.reps}</span> : null}
                      </div>
                      <button className="chip-del" style={{ fontSize: 16, flexShrink: 0 }} onClick={() => setCurrentExercises(prev => prev.filter(e => e.id !== ex.id))}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-primary" style={{ flex: 1 }} onClick={saveSession}>💾 {editingId ? "Actualizar sesión" : "Guardar sesión"}</button>
              {editingId && <button className="btn-ghost" onClick={() => { setEditingId(null); setDate(todayStr()); setWorkout(""); setNotes(""); setCurrentExercises([]); }}>Cancelar</button>}
            </div>
          </div>
        )}

        {/* Historial */}
        {activeTab === "history" && (
          <div className="content-area fade-in">
            <input className="input" style={{ marginBottom: 20 }} placeholder="Filtrar por tipo de entrenamiento…" value={filterWorkout} onChange={e => setFilterWorkout(e.target.value)} />
            {filtered.length === 0
              ? <div className="empty-state"><div style={{ fontSize: 48, marginBottom: 12 }}>🏋️</div><p className="text-muted">Sin sesiones aún. ¡A entrenar!</p></div>
              : filtered.map(s => (
                <SessionCard key={s.id} s={s} unit={unit}
                  onDelete={deleteSession} onEdit={startEdit} onDuplicate={duplicate}
                  onProgress={canCharts ? setProgressEx : () => { showToast("⚠️ Gráficos requieren plan Pro"); setShowPlans(true); }}
                  getProgressData={getProgressData}
                  expanded={expanded === s.id} onToggle={() => setExpanded(expanded === s.id ? null : s.id)}
                />
              ))
            }
          </div>
        )}

        {/* Dashboard */}
        {activeTab === "dashboard" && (
          <div className="content-area fade-in"><Dashboard sessions={sessions} /></div>
        )}
      </main>

      {progressEx && <ProgressModal exName={progressEx} sessions={sessions} onClose={() => setProgressEx(null)} />}
      {showPlans && <PlansModal currentPlan={user.plan} onSelect={updatePlan} onClose={() => setShowPlans(false)} />}
      {showLibrary && <ExerciseLibrary onSelect={name => setExName(name)} onClose={() => setShowLibrary(false)} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [dark, setDark] = useState(() => load("gym_dark", true));
  const [users, setUsers] = useState(() => load("gym_users", []));
  const [currentUser, setCurrentUser] = useState(() => load("gym_current_user", null));

  useEffect(() => {
    document.body.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => { store("gym_dark", dark); }, [dark]);
  useEffect(() => { store("gym_users", users); }, [users]);
  useEffect(() => { store("gym_current_user", currentUser); }, [currentUser]);

  const toggleDark = () => setDark(d => !d);

  function login(email, pass) {
    const u = users.find(u => u.email === email && u.pass === pass);
    if (!u) return { ok: false, msg: "Email o contraseña incorrectos" };
    setCurrentUser(u); return { ok: true };
  }
  function register(name, email, pass) {
    if (users.find(u => u.email === email)) return { ok: false, msg: "Email ya registrado" };
    const u = { id: uid(), name, email, pass, plan: "free" };
    setUsers(prev => [...prev, u]); setCurrentUser(u); return { ok: true };
  }
  function logout() { setCurrentUser(null); }
  function updatePlan(plan) {
    const updated = { ...currentUser, plan };
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updated : u));
    setCurrentUser(updated);
  }

  return (
    <ThemeCtx.Provider value={{ dark, toggleDark }}>
      <AuthCtx.Provider value={{ user: currentUser, login, register, logout, updatePlan }}>
        <style>{CSS}</style>
        {!currentUser ? <LoginScreen /> : <GymApp />}
      </AuthCtx.Provider>
    </ThemeCtx.Provider>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@300;400;500;600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body[data-theme="dark"] {
  --bg: #080f1a;
  --surface: #0c1524;
  --card: #0f1c2e;
  --border: #1a2d45;
  --accent: #3b82f6;
  --accent-dim: #1a2f52;
  --text: #e2e8f0;
  --text-muted: #4a6080;
  --danger: #ef4444;
  --sidebar-bg: #060d18;
  --input-bg: #070e1a;
  --shadow: 0 4px 24px rgba(0,0,0,0.5);
}
body[data-theme="light"] {
  --bg: #f0f4f8;
  --surface: #ffffff;
  --card: #ffffff;
  --border: #d1dce8;
  --accent: #2563eb;
  --accent-dim: #dbeafe;
  --text: #0f172a;
  --text-muted: #64748b;
  --danger: #dc2626;
  --sidebar-bg: #0f172a;
  --input-bg: #f8fafc;
  --shadow: 0 4px 24px rgba(0,0,0,0.08);
}

body { font-family: 'Barlow', sans-serif; background: var(--bg); color: var(--text); transition: background 0.3s, color 0.3s; }

.app-layout { display: flex; min-height: 100vh; }
.sb-open  .main-content { margin-left: 240px; }
.sb-closed .main-content { margin-left: 64px; }
@media (max-width: 768px) {
  .sb-open .main-content, .sb-closed .main-content { margin-left: 0; }
  .sidebar { display: none; }
}

.sidebar {
  position: fixed; top: 0; left: 0; height: 100vh; width: 240px;
  background: var(--sidebar-bg); border-right: 1px solid #0f2040;
  display: flex; flex-direction: column; padding: 20px 0;
  z-index: 100; overflow: hidden; transition: width 0.3s ease;
}
.sb-closed .sidebar { width: 64px; }

.sidebar-top { display: flex; align-items: center; justify-content: space-between; padding: 0 14px 20px; border-bottom: 1px solid #0f2040; margin-bottom: 12px; }
.sidebar-logo { display: flex; align-items: center; gap: 10px; overflow: hidden; }
.logo-text { font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 22px; letter-spacing: 2px; color: #e2e8f0; white-space: nowrap; }
.sidebar-toggle { background: none; border: 1px solid #1a2d45; color: #4a6080; border-radius: 6px; width: 26px; height: 26px; cursor: pointer; font-size: 9px; flex-shrink: 0; transition: color 0.2s, border-color 0.2s; }
.sidebar-toggle:hover { color: #e2e8f0; border-color: #3b82f6; }

.sidebar-nav { flex: 1; padding: 0 8px; display: flex; flex-direction: column; gap: 3px; }
.nav-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px; background: none; border: none; color: #4a6080; font-family: 'Barlow', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; text-align: left; width: 100%; transition: background 0.15s, color 0.15s; white-space: nowrap; overflow: hidden; }
.nav-item:hover { background: #0f2040; color: #94a3b8; }
.nav-item.active { background: #1a2f52; color: #3b82f6; }
.nav-icon { font-size: 16px; flex-shrink: 0; }
.nav-label { overflow: hidden; text-overflow: ellipsis; }

.sidebar-bottom { padding: 12px 8px 0; border-top: 1px solid #0f2040; margin-top: auto; }
.user-card { display: flex; align-items: center; gap: 10px; padding: 10px 12px; margin-bottom: 4px; overflow: hidden; }
.user-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--accent); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; color: white; flex-shrink: 0; }
.user-name { font-size: 13px; font-weight: 600; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 3px; }
.plan-badge { background: none; border: 1px solid var(--pc, #3b82f6); color: var(--pc, #3b82f6); border-radius: 5px; padding: 1px 7px; font-size: 10px; font-weight: 700; cursor: pointer; font-family: 'Barlow', sans-serif; transition: background 0.2s; }
.plan-badge:hover { background: var(--pc, #3b82f6); color: white; }

.main-content { flex: 1; display: flex; flex-direction: column; min-height: 100vh; background: var(--bg); transition: margin-left 0.3s ease; min-width: 0; }

.topbar { display: flex; justify-content: space-between; align-items: center; padding: 16px 32px; border-bottom: 1px solid var(--border); background: var(--surface); position: sticky; top: 0; z-index: 10; transition: background 0.3s; }
.page-title { font-family: 'Barlow Condensed', sans-serif; font-size: 24px; font-weight: 700; letter-spacing: 1px; }
.topbar-actions { display: flex; gap: 8px; align-items: center; }
.topbar-btn { display: flex; flex-direction: column; align-items: center; gap: 2px; background: var(--card); border: 1px solid var(--border); color: var(--text-muted); border-radius: 10px; padding: 7px 12px; cursor: pointer; min-width: 52px; transition: all 0.2s; }
.topbar-btn:hover { border-color: var(--accent); color: var(--accent); }
.topbar-btn-icon { font-size: 15px; line-height: 1; }
.topbar-btn-label { font-size: 9px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; }

.content-area { padding: 28px 32px; max-width: 1000px; width: 100%; margin: 0 auto; flex: 1; }
@media (max-width: 768px) { .content-area { padding: 16px; } .topbar { padding: 12px 16px; } }

.card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 24px; margin-bottom: 18px; box-shadow: var(--shadow); transition: border-color 0.2s, background 0.3s; }
.card-label { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--accent); margin-bottom: 18px; }

.form-row { display: flex; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
.field { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 90px; }
.field-label { font-size: 10px; font-weight: 600; color: var(--text-muted); letter-spacing: 1px; text-transform: uppercase; }
.input { background: var(--input-bg); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; color: var(--text); font-family: 'Barlow', sans-serif; font-size: 14px; outline: none; width: 100%; transition: border-color 0.2s, box-shadow 0.2s, background 0.3s; }
.input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent); }
input[type="date"].input { color-scheme: dark; }
.textarea { resize: vertical; min-height: 70px; }

.dropdown { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; z-index: 200; overflow: hidden; box-shadow: var(--shadow); }
.dropdown-item { display: block; width: 100%; background: none; border: none; color: var(--text); padding: 10px 16px; text-align: left; font-family: 'Barlow', sans-serif; font-size: 14px; cursor: pointer; transition: background 0.15s; }
.dropdown-item:hover { background: var(--accent-dim); }

.sets-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; }
.set-chip { background: var(--accent-dim); border: 1px solid var(--accent); color: var(--text); border-radius: 7px; padding: 4px 10px; font-size: 12px; display: flex; align-items: center; gap: 6px; }
.sets-badge { display: inline-block; background: var(--accent-dim); border: 1px solid var(--accent); color: var(--accent); border-radius: 5px; padding: 1px 7px; font-size: 10px; font-weight: 700; margin-left: 8px; vertical-align: middle; }
.chip-del { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 13px; padding: 0 2px; transition: color 0.2s; }
.chip-del:hover { color: var(--danger); }

.btn-primary { background: var(--accent); border: none; border-radius: 12px; padding: 13px 24px; color: white; font-family: 'Barlow Condensed', sans-serif; font-size: 18px; font-weight: 700; letter-spacing: 1px; cursor: pointer; transition: opacity 0.2s, transform 0.1s; }
.btn-primary:hover { opacity: 0.88; }
.btn-primary:active { transform: scale(0.98); }
.btn-ghost { background: var(--card); border: 1px solid var(--border); color: var(--text-muted); border-radius: 10px; padding: 9px 16px; font-family: 'Barlow', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
.btn-ghost:hover { border-color: var(--accent); color: var(--text); }
.btn-ghost.danger:hover { border-color: var(--danger); color: var(--danger); }
.btn-ghost.small { padding: 6px 12px; font-size: 12px; }
.btn-add-ex { width: 100%; background: none; border: 1px dashed var(--border); color: var(--text-muted); border-radius: 10px; padding: 9px; margin-top: 12px; font-family: 'Barlow', sans-serif; font-size: 13px; cursor: pointer; transition: border-color 0.2s, color 0.2s; }
.btn-add-ex:hover { border-color: var(--accent); color: var(--text); }
.link-btn { background: none; border: none; color: var(--accent); cursor: pointer; font-family: 'Barlow', sans-serif; font-size: inherit; }
.link-btn:hover { text-decoration: underline; }
.icon-action { background: none; border: none; cursor: pointer; font-size: 15px; padding: 4px; opacity: 0.6; transition: opacity 0.2s; }
.icon-action:hover { opacity: 1; }

.ex-list { margin-top: 14px; display: flex; flex-direction: column; gap: 6px; }
.ex-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--input-bg); border-radius: 10px; border: 1px solid var(--border); animation: slideIn 0.2s ease; }
.ex-name { font-weight: 600; font-size: 14px; }
.ex-detail { color: var(--text-muted); font-size: 12px; }

.session-card { animation: slideIn 0.25s ease both; }
.session-header { display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; flex-wrap: wrap; gap: 8px; }
.session-date { font-size: 12px; color: var(--text-muted); font-weight: 500; }
.session-workout { font-weight: 700; font-size: 15px; font-family: 'Barlow Condensed', sans-serif; letter-spacing: 0.5px; }
.ex-count { font-size: 11px; color: var(--text-muted); background: var(--input-bg); border: 1px solid var(--border); border-radius: 6px; padding: 3px 8px; }
.chevron { color: var(--text-muted); font-size: 10px; }
.session-body { margin-top: 16px; border-top: 1px solid var(--border); padding-top: 16px; animation: fadeIn 0.2s ease; }
.session-notes { color: var(--text-muted); font-size: 13px; margin-bottom: 12px; font-style: italic; }
.ex-row-saved { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border); gap: 10px; flex-wrap: wrap; }
.session-actions { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }

.section-title { font-family: 'Barlow Condensed', sans-serif; font-size: 22px; font-weight: 700; letter-spacing: 1px; margin-bottom: 20px; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 14px; }
.stat-card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 20px 18px; display: flex; flex-direction: column; gap: 6px; animation: slideIn 0.3s ease both; transition: border-color 0.2s, transform 0.2s; }
.stat-card:hover { border-color: var(--accent); transform: translateY(-2px); }
.stat-value { font-family: 'Barlow Condensed', sans-serif; font-size: 24px; font-weight: 800; }

.login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; background: var(--bg); }
.login-box { background: var(--card); border: 1px solid var(--border); border-radius: 20px; padding: 40px 36px; width: 100%; max-width: 420px; box-shadow: var(--shadow); animation: fadeIn 0.4s ease; }
.login-logo { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
.tab-row { display: flex; border: 1px solid var(--border); border-radius: 10px; overflow: hidden; margin-bottom: 22px; }
.tab-btn { flex: 1; background: none; border: none; color: var(--text-muted); padding: 10px; font-family: 'Barlow', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; transition: background 0.2s, color 0.2s; }
.tab-btn.active { background: var(--accent); color: white; }
.err-msg { background: rgba(239,68,68,0.1); border: 1px solid #ef4444; color: #f87171; border-radius: 8px; padding: 9px 12px; font-size: 13px; margin-bottom: 10px; }

.plans-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-top: 8px; }
.plan-card { border: 1px solid var(--border); border-radius: 14px; padding: 20px 16px; display: flex; flex-direction: column; gap: 8px; }
.plan-card.plan-active { border-color: var(--pc); background: color-mix(in srgb, var(--pc) 8%, var(--card)); }
.plan-name { font-family: 'Barlow Condensed', sans-serif; font-size: 20px; font-weight: 800; }
.plan-price { font-size: 16px; font-weight: 700; }
.plan-features { list-style: none; display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--text-muted); flex: 1; margin: 4px 0; }
.plan-btn { border-radius: 8px; padding: 8px; font-family: 'Barlow', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; margin-top: auto; }
.plan-btn:hover { opacity: 0.8; }

.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.65); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; animation: fadeIn 0.2s ease; backdrop-filter: blur(4px); }
.modal { background: var(--card); border: 1px solid var(--border); border-radius: 20px; padding: 28px; width: 100%; max-width: 480px; box-shadow: var(--shadow); animation: slideUp 0.25s ease; }
.modal-wide { max-width: 680px; }
.modal-library { max-width: 520px; max-height: 85vh; display: flex; flex-direction: column; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.modal-title { font-family: 'Barlow Condensed', sans-serif; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
.close-btn { background: none; border: none; color: var(--text-muted); font-size: 18px; cursor: pointer; padding: 4px; transition: color 0.2s; }
.close-btn:hover { color: var(--text); }

.lib-filters { display: flex; gap: 8px; margin-bottom: 12px; }
.muscle-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
.muscle-chip { background: none; border: 1px solid var(--border); color: var(--text-muted); border-radius: 20px; padding: 4px 12px; font-family: 'Barlow', sans-serif; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.15s; }
.muscle-chip:hover { border-color: var(--accent); color: var(--text); }
.muscle-chip.active { background: var(--accent); border-color: var(--accent); color: white; }
.lib-list { overflow-y: auto; flex: 1; padding-right: 4px; }
.lib-list::-webkit-scrollbar { width: 4px; }
.lib-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
.lib-group { margin-bottom: 16px; }
.lib-group-title { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--accent); margin-bottom: 6px; padding: 0 4px; }
.lib-item { display: flex; align-items: center; gap: 12px; width: 100%; background: none; border: none; border-bottom: 1px solid var(--border); padding: 10px 6px; cursor: pointer; text-align: left; border-radius: 8px; margin-bottom: 2px; transition: background 0.15s; }
.lib-item:hover { background: var(--accent-dim); }
.lib-info { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.lib-name { color: var(--text); font-family: 'Barlow', sans-serif; font-size: 14px; font-weight: 500; }
.lib-meta { color: var(--text-muted); font-size: 11px; }
.lib-add { color: var(--accent); font-size: 20px; font-weight: 300; flex-shrink: 0; opacity: 0.6; transition: opacity 0.2s; }
.lib-item:hover .lib-add { opacity: 1; }

.text-muted { color: var(--text-muted); }
.empty-state { text-align: center; padding: 60px 20px; color: var(--text-muted); }
.upgrade-banner { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.3); color: #f87171; border-radius: 12px; padding: 12px 18px; font-size: 13px; margin-bottom: 16px; }
.toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); background: var(--card); border: 1px solid var(--border); color: var(--text); padding: 12px 22px; border-radius: 12px; font-size: 14px; font-weight: 500; z-index: 9999; white-space: nowrap; box-shadow: var(--shadow); animation: toastIn 0.3s ease; }

@keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
.fade-in { animation: fadeIn 0.3s ease; }
`;