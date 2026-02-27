import { useState, useEffect, useRef, createContext, useContext } from "react";

const ThemeCtx = createContext();
const useTheme = () => useContext(ThemeCtx);
const AuthCtx = createContext();
const useAuth = () => useContext(AuthCtx);

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const fmtDate = (d) => { if (!d) return ""; const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; };
const todayStr = () => new Date().toISOString().slice(0, 10);
const lettersOnly = (v) => v.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "");
const numDot = (v) => v.replace(/[^0-9.]/g, "");
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const load = (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } };
const DAYS_ES = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

const PLANS = {
  guest: { name: "Invitado", price: "Sin cuenta", color: "#f59e0b", features: ["3 sesiones", "Sin historial guardado", "Herramientas básicas", "Sin exportar"] },
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

// ─── 1RM Calculator ───────────────────────────────────────────────────────────
function calc1RM(weight, reps) {
  if (!weight || !reps || reps <= 0) return 0;
  const w = parseFloat(weight), r = parseFloat(reps);
  if (r === 1) return w;
  return Math.round(w * (1 + r / 30));
}

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

// ─── Rest Timer ───────────────────────────────────────────────────────────────
function RestTimer({ onClose }) {
  const [seconds, setSeconds] = useState(90);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed(e => {
          if (e + 1 >= seconds) { clearInterval(intervalRef.current); setRunning(false); return e + 1; }
          return e + 1;
        });
      }, 1000);
    } else clearInterval(intervalRef.current);
    return () => clearInterval(intervalRef.current);
  }, [running, seconds]);

  const remaining = Math.max(0, seconds - elapsed);
  const pct = elapsed / seconds;
  const r = 52, cx = 60, cy = 60;
  const circumference = 2 * Math.PI * r;
  const done = elapsed >= seconds;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 300, textAlign: "center" }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">⏱️ Descanso</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <svg width={120} height={120} style={{ margin: "0 auto 16px", display: "block" }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={6} />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={done ? "#22c55e" : "var(--accent)"} strokeWidth={6}
            strokeDasharray={circumference} strokeDashoffset={circumference * (1 - pct)}
            strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: "stroke-dashoffset 1s linear" }} />
          <text x={cx} y={cy - 8} textAnchor="middle" fill="var(--text)" fontSize={22} fontWeight={800} fontFamily="Barlow Condensed, sans-serif">
            {done ? "✓" : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`}
          </text>
          <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--text-muted)" fontSize={10}>{done ? "Listo!" : "restante"}</text>
        </svg>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 14 }}>
          {[60, 90, 120, 180].map(t => (
            <button key={t} className={`muscle-chip ${seconds === t ? "active" : ""}`} onClick={() => { setSeconds(t); setElapsed(0); setRunning(false); }}>
              {t < 60 ? `${t}s` : `${t / 60}m`}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button className="btn-primary" style={{ fontSize: 15, padding: "10px 28px" }} onClick={() => { if (done) { setElapsed(0); setRunning(true); } else setRunning(r => !r); }}>
            {done ? "↺ Reiniciar" : running ? "⏸ Pausar" : "▶ Iniciar"}
          </button>
          {!done && elapsed > 0 && <button className="btn-ghost" onClick={() => { setElapsed(0); setRunning(false); }}>↺</button>}
        </div>
      </div>
    </div>
  );
}

// ─── 1RM Modal ────────────────────────────────────────────────────────────────
function OneRMModal({ onClose }) {
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const result = calc1RM(weight, reps);
  const percentages = [100, 95, 90, 85, 80, 75, 70, 65, 60];
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">🧮 Calculadora 1RM</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>Fórmula de Epley: peso × (1 + reps / 30)</p>
        <div className="form-row">
          <div className="field">
            <label className="field-label">Peso (kg)</label>
            <input className="input" placeholder="0" value={weight} onChange={e => setWeight(numDot(e.target.value))} />
          </div>
          <div className="field">
            <label className="field-label">Repeticiones</label>
            <input className="input" placeholder="0" value={reps} onChange={e => setReps(numDot(e.target.value))} />
          </div>
        </div>
        {result > 0 && (
          <div>
            <div style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)", borderRadius: 12, padding: "16px", textAlign: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>1RM Estimado</div>
              <div style={{ fontSize: 40, fontWeight: 800, fontFamily: "Barlow Condensed, sans-serif", color: "var(--text)" }}>{result} kg</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              {percentages.map(p => (
                <div key={p} style={{ background: "var(--input-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px", textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{p}%</div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{Math.round(result * p / 100)} kg</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Body Stats Modal ─────────────────────────────────────────────────────────
function BodyStatsModal({ stats, onSave, onClose }) {
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState(stats.height || "");

  function save() {
    if (!weight && !height) return;
    const newEntry = { date: todayStr(), weight: parseFloat(weight) || null };
    const newHeight = parseFloat(height) || stats.height;
    onSave({ height: newHeight, entries: [...(stats.entries || []), ...(weight ? [newEntry] : [])] });
    onClose();
  }

  const entries = [...(stats.entries || [])].sort((a, b) => a.date.localeCompare(b.date));
  const vals = entries.map(e => e.weight).filter(Boolean);
  const min = Math.min(...vals, 0), max = Math.max(...vals, 1), range = max - min || 1;
  const W = 400, H = 100;
  const bmi = stats.height && entries.length > 0
    ? (entries[entries.length - 1].weight / Math.pow(stats.height / 100, 2)).toFixed(1)
    : null;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">⚖️ Peso & Estatura</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="form-row" style={{ marginBottom: 16 }}>
          <div className="field">
            <label className="field-label">Estatura (cm)</label>
            <input className="input" placeholder="170" value={height} onChange={e => setHeight(numDot(e.target.value))} />
          </div>
          <div className="field">
            <label className="field-label">Peso hoy (kg)</label>
            <input className="input" placeholder="70.5" value={weight} onChange={e => setWeight(numDot(e.target.value))} />
          </div>
          <button className="btn-primary" style={{ alignSelf: "flex-end", padding: "10px 18px", fontSize: 15 }} onClick={save}>Guardar</button>
        </div>

        {bmi && (
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            {[
              ["Peso actual", `${entries[entries.length-1].weight} kg`],
              ["Estatura", `${stats.height} cm`],
              ["IMC", bmi],
            ].map(([l, v]) => (
              <div key={l} style={{ flex: 1, background: "var(--input-bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "Barlow Condensed, sans-serif" }}>{v}</div>
              </div>
            ))}
          </div>
        )}

        {entries.length >= 2 && (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "var(--accent)", marginBottom: 8 }}>Evolución de peso</div>
            <svg width="100%" viewBox={`0 0 ${W + 4} ${H + 30}`} style={{ display: "block", marginBottom: 12 }}>
              {[0, 0.5, 1].map(t => {
                const y = H - t * H;
                return <g key={t}>
                  <line x1={36} y1={y} x2={W} y2={y} stroke="var(--border)" strokeWidth={1} />
                  <text x={30} y={y + 4} textAnchor="end" fill="var(--text-muted)" fontSize={10}>{(min + t * range).toFixed(1)}</text>
                </g>;
              })}
              <polyline
                points={entries.map((e, i) => `${36 + (i / (entries.length - 1)) * (W - 36)},${H - ((e.weight - min) / range) * H}`).join(" ")}
                fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinecap="round" />
              {entries.map((e, i) => {
                const x = 36 + (i / (entries.length - 1)) * (W - 36);
                const y = H - ((e.weight - min) / range) * H;
                return <g key={i}>
                  <circle cx={x} cy={y} r={4} fill="var(--accent)" />
                  <text x={x} y={H + 22} textAnchor="middle" fill="var(--text-muted)" fontSize={9}>{fmtDate(e.date)}</text>
                </g>;
              })}
            </svg>
          </>
        )}

        {entries.length > 0 && (
          <div style={{ maxHeight: 140, overflowY: "auto" }}>
            {[...entries].reverse().map((e, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                <span style={{ color: "var(--text-muted)" }}>{fmtDate(e.date)}</span>
                <span style={{ fontWeight: 700 }}>{e.weight} kg</span>
              </div>
            ))}
          </div>
        )}
        {entries.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center" }}>Aún no hay registros de peso.</p>}
      </div>
    </div>
  );
}

// ─── Weekly Planner Modal ─────────────────────────────────────────────────────
function WeeklyPlannerModal({ plan, onSave, onClose, sessions }) {
  const [mode, setMode] = useState(plan.mode || "weekly");
  const [weekly, setWeekly] = useState(plan.weekly || { 0:"",1:"",2:"",3:"",4:"",5:"",6:"" });
  const [cycle, setCycle] = useState(plan.cycle || [{ id: uid(), name: "", label: "" }]);
  const [cyclePos, setCyclePos] = useState(plan.cyclePos || 0);

  const workoutNames = [...new Set(sessions.map(s => s.workout).filter(Boolean))];

  function saveCycle() { onSave({ mode, weekly, cycle, cyclePos }); onClose(); }

  const todayDow = (new Date().getDay() + 6) % 7;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">📅 Planificador</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="tab-row" style={{ marginBottom: 20 }}>
          <button className={`tab-btn ${mode === "weekly" ? "active" : ""}`} onClick={() => setMode("weekly")}>7 días fijos</button>
          <button className={`tab-btn ${mode === "cycle" ? "active" : ""}`} onClick={() => setMode("cycle")}>Ciclo personalizado</button>
        </div>

        {mode === "weekly" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {DAYS_ES.map((day, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: todayDow === i ? "var(--accent-dim)" : "var(--input-bg)", border: `1px solid ${todayDow === i ? "var(--accent)" : "var(--border)"}`, borderRadius: 10 }}>
                <span style={{ width: 90, fontSize: 13, fontWeight: 600, color: todayDow === i ? "var(--accent)" : "var(--text-muted)", flexShrink: 0 }}>{day}{todayDow === i ? " 📍" : ""}</span>
                <input className="input" style={{ flex: 1, padding: "7px 12px" }} placeholder="Descanso / Push Day / Piernas…" value={weekly[i] || ""} onChange={e => setWeekly(w => ({ ...w, [i]: e.target.value }))} list={`wk-dl-${i}`} />
                <datalist id={`wk-dl-${i}`}>{workoutNames.map(n => <option key={n} value={n} />)}</datalist>
              </div>
            ))}
          </div>
        )}

        {mode === "cycle" && (
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {cycle.map((d, i) => (
                <div key={d.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ width: 28, height: 28, borderRadius: "50%", background: cyclePos === i ? "var(--accent)" : "var(--border)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                  <input className="input" style={{ flex: 1, padding: "7px 12px" }} placeholder={`Día ${i+1} (ej: Push Day)`} value={d.name} onChange={e => setCycle(c => c.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} list={`cy-dl-${i}`} />
                  <datalist id={`cy-dl-${i}`}>{workoutNames.map(n => <option key={n} value={n} />)}</datalist>
                  {cycle.length > 1 && <button className="chip-del" style={{ fontSize: 18 }} onClick={() => setCycle(c => c.filter((_, j) => j !== i))}>✕</button>}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button className="btn-ghost small" onClick={() => setCycle(c => [...c, { id: uid(), name: "" }])}>+ Agregar día</button>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 12, color: "var(--text-muted)", alignSelf: "center" }}>Posición actual:</span>
              <input className="input" style={{ width: 60, padding: "6px 10px" }} type="number" min={1} max={cycle.length} value={cyclePos + 1} onChange={e => setCyclePos(Math.max(0, Math.min(cycle.length - 1, parseInt(e.target.value) - 1 || 0)))} />
            </div>
          </div>
        )}

        <button className="btn-primary" style={{ width: "100%", marginTop: 12 }} onClick={saveCycle}>💾 Guardar planificador</button>
      </div>
    </div>
  );
}

// ─── Progress Modal ───────────────────────────────────────────────────────────
function ProgressModal({ exName, sessions, onClose }) {
  const history = [];
  sessions.forEach(s => (s.exercises || []).forEach(ex => {
    if (ex.name.toLowerCase() === exName.toLowerCase()) {
      const weight = ex.sets?.length > 0 ? Math.max(...ex.sets.map(st => parseFloat(st.weight) || 0)) : parseFloat(ex.weight) || 0;
      history.push({ date: s.date, weight, reps: ex.sets?.length > 0 ? Math.max(...ex.sets.map(st => parseFloat(st.reps) || 0)) : parseFloat(ex.reps) || 0 });
    }
  }));
  history.sort((a, b) => a.date.localeCompare(b.date));
  const vals = history.map(h => h.weight);
  const min = Math.min(...vals, 0), max = Math.max(...vals, 1), range = max - min || 1;
  const W = 400, H = 130;
  const prEntry = history.reduce((best, h) => calc1RM(h.weight, h.reps) > calc1RM(best.weight, best.reps) ? h : best, history[0] || { weight: 0, reps: 0 });

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
            {prEntry && <div style={{ background: "linear-gradient(135deg, rgba(251,191,36,0.12), rgba(251,191,36,0.04))", border: "1px solid rgba(251,191,36,0.4)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, display: "flex", gap: 16, alignItems: "center" }}>
              <span style={{ fontSize: 20 }}>🏆</span>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "#f59e0b", textTransform: "uppercase" }}>Récord personal</div>
                <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "Barlow Condensed, sans-serif" }}>{prEntry.weight} kg × {prEntry.reps} reps → 1RM ≈ {calc1RM(prEntry.weight, prEntry.reps)} kg</div>
              </div>
            </div>}
            <svg width="100%" viewBox={`0 0 ${W + 4} ${H + 30}`} style={{ display: "block", margin: "8px 0 12px" }}>
              {[0, 0.5, 1].map(t => {
                const y = H - t * H;
                return <g key={t}>
                  <line x1={36} y1={y} x2={W} y2={y} stroke="var(--border)" strokeWidth={1} />
                  <text x={30} y={y + 4} textAnchor="end" fill="var(--text-muted)" fontSize={10}>{(min + t * range).toFixed(1)}</text>
                </g>;
              })}
              <polyline points={history.map((h, i) => `${36 + (i / (history.length - 1)) * (W - 36)},${H - ((h.weight - min) / range) * H}`).join(" ")} fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeLinecap="round" />
              {history.map((h, i) => {
                const x = 36 + (i / (history.length - 1)) * (W - 36);
                const y = H - ((h.weight - min) / range) * H;
                const isPR = h === prEntry;
                return <g key={i}>
                  <circle cx={x} cy={y} r={isPR ? 6 : 4} fill={isPR ? "#f59e0b" : "#3b82f6"} />
                  <text x={x} y={H + 22} textAnchor="middle" fill="var(--text-muted)" fontSize={9}>{fmtDate(h.date)}</text>
                </g>;
              })}
            </svg>
            <div style={{ display: "flex", gap: 20, fontSize: 13 }}>
              {[["Máx", `${max}kg`], ["Mín", `${min}kg`], ["Registros", history.length], ["1RM est.", `${calc1RM(prEntry.weight, prEntry.reps)}kg`]].map(([l, v]) =>
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
  const { login, register, loginAsGuest } = useAuth();
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
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0 16px" }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, letterSpacing: 1 }}>O</span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>
        <button className="btn-guest" onClick={loginAsGuest}>
          <span style={{ fontSize: 18 }}>👤</span>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Entrar como invitado</div>
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 1 }}>3 sesiones · Sin historial guardado · Herramientas básicas</div>
          </div>
        </button>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ sessions, bodyStats }) {
  const total = sessions.length;
  const thisWeek = sessions.filter(s => (new Date() - new Date(s.date + "T00:00:00")) / 86400000 <= 7).length;
  const exCount = {};
  sessions.forEach(s => (s.exercises || []).forEach(ex => { exCount[ex.name] = (exCount[ex.name] || 0) + 1; }));
  const topEx = Object.entries(exCount).sort((a, b) => b[1] - a[1])[0];
  const wCount = {};
  sessions.forEach(s => { wCount[s.workout] = (wCount[s.workout] || 0) + 1; });
  const topW = Object.entries(wCount).sort((a, b) => b[1] - a[1])[0];
  const totalVol = sessions.reduce((acc, s) => acc + (s.exercises || []).reduce((a, ex) => a + (parseFloat(ex.weight) || 0) * (parseFloat(ex.reps) || 1), 0), 0);

  // Streak
  const sortedDates = [...new Set(sessions.map(s => s.date))].sort().reverse();
  let streak = 0;
  let checkDate = new Date(); checkDate.setHours(0,0,0,0);
  for (let d of sortedDates) {
    const sd = new Date(d + "T00:00:00");
    const diff = Math.round((checkDate - sd) / 86400000);
    if (diff <= 1) { streak++; checkDate = sd; } else break;
  }

  // All PRs
  const prs = {};
  sessions.forEach(s => (s.exercises || []).forEach(ex => {
    const rm = calc1RM(
      ex.sets?.length > 0 ? Math.max(...ex.sets.map(st => parseFloat(st.weight) || 0)) : parseFloat(ex.weight) || 0,
      ex.sets?.length > 0 ? Math.max(...ex.sets.map(st => parseFloat(st.reps) || 0)) : parseFloat(ex.reps) || 0
    );
    if (!prs[ex.name] || rm > prs[ex.name].rm) prs[ex.name] = { rm, date: s.date };
  }));
  const topPRs = Object.entries(prs).sort((a, b) => b[1].rm - a[1].rm).slice(0, 5);

  const stats = [
    { icon: "🏋️", label: "Sesiones totales", value: total },
    { icon: "🔥", label: "Esta semana", value: thisWeek },
    { icon: "🔑", label: "Racha actual", value: `${streak} días` },
    { icon: "⭐", label: "Ejercicio top", value: topEx ? topEx[0] : "—" },
    { icon: "💪", label: "Rutina favorita", value: topW ? topW[0] : "—" },
    { icon: "⚖️", label: "Volumen total", value: totalVol > 0 ? `${(totalVol / 1000).toFixed(1)}t` : "—" },
  ];

  return (
    <div>
      <div className="section-title">Dashboard</div>
      <div className="stats-grid" style={{ marginBottom: 28 }}>
        {stats.map((s, i) => (
          <div key={s.label} className="stat-card" style={{ animationDelay: `${i * 0.07}s` }}>
            <span style={{ fontSize: 26 }}>{s.icon}</span>
            <span className="stat-value">{s.value}</span>
            <span className="text-muted" style={{ fontSize: 11 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {topPRs.length > 0 && (
        <div className="card">
          <div className="card-label">🏆 Top Récords Personales (1RM estimado)</div>
          {topPRs.map(([name, data], i) => (
            <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < topPRs.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", background: i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : i === 2 ? "#b45309" : "var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "white", flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{name}</span>
              </div>
              <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: 18, fontWeight: 800, color: "var(--accent)" }}>{data.rm} kg</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Session Card ─────────────────────────────────────────────────────────────
function SessionCard({ s, unit, onDelete, onEdit, onDuplicate, onProgress, getProgressData, expanded, onToggle, allSessions }) {
  const u = s.unit || unit;

  // Detect PRs in this session
  const prs = new Set();
  (s.exercises || []).forEach(ex => {
    const sessWeight = ex.sets?.length > 0 ? Math.max(...ex.sets.map(st => parseFloat(st.weight) || 0)) : parseFloat(ex.weight) || 0;
    const sessReps = ex.sets?.length > 0 ? Math.max(...ex.sets.map(st => parseFloat(st.reps) || 0)) : parseFloat(ex.reps) || 0;
    const sess1RM = calc1RM(sessWeight, sessReps);
    const prevBest = allSessions
      .filter(ps => ps.date < s.date)
      .flatMap(ps => (ps.exercises || []).filter(pe => pe.name === ex.name))
      .reduce((best, pe) => {
        const pw = pe.sets?.length > 0 ? Math.max(...pe.sets.map(st => parseFloat(st.weight) || 0)) : parseFloat(pe.weight) || 0;
        const pr = pe.sets?.length > 0 ? Math.max(...pe.sets.map(st => parseFloat(st.reps) || 0)) : parseFloat(pe.reps) || 0;
        return Math.max(best, calc1RM(pw, pr));
      }, 0);
    if (sess1RM > prevBest && sessWeight > 0) prs.add(ex.name);
  });

  return (
    <div className="card session-card">
      <div className="session-header" onClick={onToggle}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span className="session-date">{fmtDate(s.date)}</span>
          <span className="session-workout">{s.workout}</span>
          {prs.size > 0 && <span style={{ fontSize: 10, background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.5)", color: "#f59e0b", borderRadius: 6, padding: "2px 7px", fontWeight: 700 }}>🏆 {prs.size} PR</span>}
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
                {prs.has(ex.name) && <span style={{ fontSize: 9, background: "rgba(251,191,36,0.15)", color: "#f59e0b", borderRadius: 4, padding: "1px 5px", marginLeft: 6, fontWeight: 800 }}>PR</span>}
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Body stats
  const bodyKey = `gym_body_${user.email}`;
  const [bodyStats, setBodyStats] = useState(() => load(bodyKey, { height: null, entries: [] }));
  const [showBodyStats, setShowBodyStats] = useState(false);

  // Planner
  const plannerKey = `gym_planner_${user.email}`;
  const [weeklyPlan, setWeeklyPlan] = useState(() => load(plannerKey, { mode: "weekly", weekly: {}, cycle: [], cyclePos: 0 }));
  const [showPlanner, setShowPlanner] = useState(false);

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
  const [showTimer, setShowTimer] = useState(false);
  const [showOneRM, setShowOneRM] = useState(false);
  const [toast, setToast] = useState(null);
  const presetRef = useRef();

  useEffect(() => { store(storageKey, sessions); }, [sessions]);
  useEffect(() => { store("gym_unit", unit); }, [unit]);
  useEffect(() => { store(bodyKey, bodyStats); }, [bodyStats]);
  useEffect(() => { store(plannerKey, weeklyPlan); }, [weeklyPlan]);
  useEffect(() => {
    const handle = (e) => { if (presetRef.current && !presetRef.current.contains(e.target)) setShowPresets(false); };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const allExNames = [...new Set(sessions.flatMap(s => (s.exercises || []).map(e => e.name)))];
  const isGuest = user.isGuest;
  const canAdd = isGuest ? sessions.length < 3 : (user.plan !== "free" || sessions.length < 5);
  const canExport = !isGuest && user.plan !== "free";
  const canCharts = !isGuest && user.plan !== "free";

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2600); }

  // Today's planned workout
  const todayDow = (new Date().getDay() + 6) % 7;
  const todayPlanned = weeklyPlan.mode === "weekly"
    ? weeklyPlan.weekly?.[todayDow] || ""
    : weeklyPlan.cycle?.[weeklyPlan.cyclePos]?.name || "";

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
      // advance cycle
      if (weeklyPlan.mode === "cycle" && weeklyPlan.cycle?.length > 0) {
        const nextPos = (weeklyPlan.cyclePos + 1) % weeklyPlan.cycle.length;
        setWeeklyPlan(p => ({ ...p, cyclePos: nextPos }));
      }
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

  const navClick = (id) => { setActiveTab(id); setMobileNavOpen(false); };

  return (
    <div className="app-layout">
      {/* Desktop Sidebar */}
      <aside className="sidebar desktop-only">
        <div className="sidebar-top">
          <div className="sidebar-logo">
            <span style={{ fontSize: 20, flexShrink: 0 }}>⚡</span>
            <span className="logo-text">GymTracker</span>
          </div>
        </div>

        {/* Today's plan banner */}
        {todayPlanned && (
          <div style={{ margin: "0 12px 12px", padding: "10px 12px", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 10 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: "var(--accent)", textTransform: "uppercase", marginBottom: 3 }}>Hoy toca</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{todayPlanned}</div>
          </div>
        )}

        <nav className="sidebar-nav">
          {NAV.map(item => (
            <button key={item.id} className={`nav-item ${activeTab === item.id ? "active" : ""}`} onClick={() => navClick(item.id)}>
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
          <div style={{ height: 1, background: "var(--border)", margin: "8px 12px" }} />
          <button className="nav-item" onClick={() => setShowPlanner(true)}>
            <span className="nav-icon">📅</span>
            <span className="nav-label">Planificador</span>
          </button>
          <button className="nav-item" onClick={() => setShowBodyStats(true)}>
            <span className="nav-icon">⚖️</span>
            <span className="nav-label">Peso & Estatura</span>
          </button>
          <button className="nav-item" onClick={() => setShowTimer(true)}>
            <span className="nav-icon">⏱️</span>
            <span className="nav-label">Timer descanso</span>
          </button>
          <button className="nav-item" onClick={() => setShowOneRM(true)}>
            <span className="nav-icon">🧮</span>
            <span className="nav-label">Calc. 1RM</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="user-card">
            <div className="user-avatar">{user.name?.[0]?.toUpperCase() || "U"}</div>
            <div style={{ minWidth: 0 }}>
              <div className="user-name">{user.name}</div>
              <button className="plan-badge" style={{ "--pc": PLANS[user.plan]?.color || "#f59e0b" }} onClick={() => isGuest ? logout() : setShowPlans(true)}>{PLANS[user.plan]?.name || "Invitado"}</button>
            </div>
          </div>
          <button className="nav-item" onClick={logout}>
            <span className="nav-icon">🚪</span>
            <span className="nav-label">Salir</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        {/* Topbar */}
        <div className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Hamburger mobile */}
            <button className="hamburger mobile-only" onClick={() => setMobileNavOpen(v => !v)}>
              <span /><span /><span />
            </button>
            <h1 className="page-title">
              {activeTab === "new" ? (editingId ? "✏️ Editar" : "Nueva sesión") : activeTab === "history" ? "Historial" : "Dashboard"}
            </h1>
          </div>
          <div className="topbar-actions">
            <button className="topbar-btn" onClick={toggleDark}>
              <span className="topbar-btn-icon">{dark ? "☀️" : "🌙"}</span>
              <span className="topbar-btn-label">{dark ? "Claro" : "Oscuro"}</span>
            </button>
            <button className="topbar-btn" onClick={() => setUnit(u => u === "kg" ? "lbs" : "kg")}>
              <span className="topbar-btn-icon">⚖️</span>
              <span className="topbar-btn-label">{unit}</span>
            </button>
            <button className="topbar-btn desktop-only" onClick={exportJSON}>
              <span className="topbar-btn-icon">📦</span>
              <span className="topbar-btn-label">JSON</span>
            </button>
            <button className="topbar-btn desktop-only" onClick={exportCSV}>
              <span className="topbar-btn-icon">📊</span>
              <span className="topbar-btn-label">CSV</span>
            </button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileNavOpen && (
          <div className="mobile-drawer-overlay" onClick={() => setMobileNavOpen(false)}>
            <div className="mobile-drawer" onClick={e => e.stopPropagation()}>
              <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 20 }}>⚡</span>
                  <span className="logo-text">GymTracker</span>
                </div>
                <button className="close-btn" onClick={() => setMobileNavOpen(false)}>✕</button>
              </div>

              {todayPlanned && (
                <div style={{ margin: "12px 12px 0", padding: "10px 12px", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 10 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: "var(--accent)", textTransform: "uppercase", marginBottom: 3 }}>Hoy toca</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{todayPlanned}</div>
                </div>
              )}

              <nav style={{ padding: "12px 8px", flex: 1 }}>
                {NAV.map(item => (
                  <button key={item.id} className={`nav-item ${activeTab === item.id ? "active" : ""}`} style={{ marginBottom: 2 }} onClick={() => navClick(item.id)}>
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                  </button>
                ))}
                <div style={{ height: 1, background: "var(--border)", margin: "8px 12px" }} />
                {[
                  { icon: "📅", label: "Planificador", action: () => { setShowPlanner(true); setMobileNavOpen(false); } },
                  { icon: "⚖️", label: "Peso & Estatura", action: () => { setShowBodyStats(true); setMobileNavOpen(false); } },
                  { icon: "⏱️", label: "Timer descanso", action: () => { setShowTimer(true); setMobileNavOpen(false); } },
                  { icon: "🧮", label: "Calc. 1RM", action: () => { setShowOneRM(true); setMobileNavOpen(false); } },
                  { icon: "📦", label: "Exportar JSON", action: () => { exportJSON(); setMobileNavOpen(false); } },
                  { icon: "📊", label: "Exportar CSV", action: () => { exportCSV(); setMobileNavOpen(false); } },
                ].map(({ icon, label, action }) => (
                  <button key={label} className="nav-item" style={{ marginBottom: 2 }} onClick={action}>
                    <span className="nav-icon">{icon}</span>
                    <span className="nav-label">{label}</span>
                  </button>
                ))}
              </nav>

              <div style={{ padding: "12px 8px", borderTop: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 4 }}>
                  <div className="user-avatar">{user.name?.[0]?.toUpperCase() || "U"}</div>
                  <div>
                    <div className="user-name">{user.name}</div>
                    <button className="plan-badge" style={{ "--pc": PLANS[user.plan]?.color || "#f59e0b" }} onClick={() => { if(isGuest){ logout(); } else { setShowPlans(true); setMobileNavOpen(false); } }}>{PLANS[user.plan]?.name || "Invitado"}</button>
                  </div>
                </div>
                <button className="nav-item" onClick={logout}>
                  <span className="nav-icon">🚪</span>
                  <span className="nav-label">Salir</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Nueva sesión */}
        {activeTab === "new" && (
          <div className="content-area fade-in">
            {todayPlanned && !editingId && (
              <div style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 12, padding: "12px 18px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <span style={{ fontSize: 14, color: "var(--text)" }}>📅 Hoy toca: <b>{todayPlanned}</b></span>
                <button className="btn-ghost small" onClick={() => setWorkout(todayPlanned)}>Usar esta rutina →</button>
              </div>
            )}
            {isGuest && (
              <div className="guest-banner">
                <span>👤 Modo invitado — máx. 3 sesiones, sin guardado permanente.</span>
                <button className="link-btn" onClick={logout} style={{ color: "#f59e0b", marginLeft: 8 }}>Crear cuenta gratis →</button>
              </div>
            )}
            {!canAdd && !editingId && (
              <div className="upgrade-banner">⚠️ {isGuest ? "Límite de 3 sesiones en modo invitado." : "Límite de 5 sesiones en plan Free."} <button className="link-btn" onClick={isGuest ? logout : () => setShowPlans(true)}>{isGuest ? "Crear cuenta →" : "Mejorar plan →"}</button></div>
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 8 }}>
                <div className="card-label" style={{ margin: 0 }}>Ejercicios</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-ghost small" onClick={() => setShowTimer(true)}>⏱️ Timer</button>
                  <button className="btn-ghost small" onClick={() => setShowOneRM(true)}>🧮 1RM</button>
                  <button className="btn-ghost small" onClick={() => setShowLibrary(true)}>📚 Ejercicios</button>
                </div>
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

              {exName && exWeight && exReps && (
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: -8, marginBottom: 8 }}>
                  1RM estimado: <b style={{ color: "var(--accent)" }}>{calc1RM(exWeight, exReps)} kg</b>
                </div>
              )}

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
                  allSessions={sessions}
                />
              ))
            }
          </div>
        )}

        {/* Dashboard */}
        {activeTab === "dashboard" && (
          <div className="content-area fade-in"><Dashboard sessions={sessions} bodyStats={bodyStats} /></div>
        )}
      </main>

      {/* Mobile bottom nav */}
      <nav className="mobile-bottom-nav mobile-only">
        {NAV.map(item => (
          <button key={item.id} className={`mobile-nav-btn ${activeTab === item.id ? "active" : ""}`} onClick={() => navClick(item.id)}>
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 600 }}>{item.label}</span>
          </button>
        ))}
        <button className="mobile-nav-btn" onClick={() => setMobileNavOpen(true)}>
          <span style={{ fontSize: 20 }}>☰</span>
          <span style={{ fontSize: 10, fontWeight: 600 }}>Más</span>
        </button>
      </nav>

      {progressEx && <ProgressModal exName={progressEx} sessions={sessions} onClose={() => setProgressEx(null)} />}
      {showPlans && <PlansModal currentPlan={user.plan} onSelect={updatePlan} onClose={() => setShowPlans(false)} />}
      {showLibrary && <ExerciseLibrary onSelect={name => setExName(name)} onClose={() => setShowLibrary(false)} />}
      {showTimer && <RestTimer onClose={() => setShowTimer(false)} />}
      {showOneRM && <OneRMModal onClose={() => setShowOneRM(false)} />}
      {showBodyStats && <BodyStatsModal stats={bodyStats} onSave={setBodyStats} onClose={() => setShowBodyStats(false)} />}
      {showPlanner && <WeeklyPlannerModal plan={weeklyPlan} onSave={setWeeklyPlan} onClose={() => setShowPlanner(false)} sessions={sessions} />}
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
  function loginAsGuest() {
    setCurrentUser({ id: "guest", name: "Invitado", email: "__guest__", plan: "guest", isGuest: true });
  }
  function loginAsGuest() {
    setCurrentUser({ id: "guest", name: "Invitado", email: "__guest__", plan: "guest", isGuest: true });
  }
  function logout() { setCurrentUser(null); }
  function updatePlan(plan) {
    const updated = { ...currentUser, plan };
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updated : u));
    setCurrentUser(updated);
  }

  return (
    <ThemeCtx.Provider value={{ dark, toggleDark }}>
      <AuthCtx.Provider value={{ user: currentUser, login, register, logout, updatePlan, loginAsGuest }}>
        <style>{CSS}</style>
        {!currentUser ? <LoginScreen /> : <GymApp />}
      </AuthCtx.Provider>
    </ThemeCtx.Provider>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@300;400;500;600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body[data-theme="dark"] {
  --bg: #080f1a; --surface: #0c1524; --card: #0f1c2e; --border: #1a2d45;
  --accent: #3b82f6; --accent-dim: #1a2f52; --text: #e2e8f0; --text-muted: #4a6080;
  --danger: #ef4444; --sidebar-bg: #060d18; --input-bg: #070e1a; --shadow: 0 4px 24px rgba(0,0,0,0.5);
}
body[data-theme="light"] {
  --bg: #f0f4f8; --surface: #ffffff; --card: #ffffff; --border: #d1dce8;
  --accent: #2563eb; --accent-dim: #dbeafe; --text: #0f172a; --text-muted: #64748b;
  --danger: #dc2626; --sidebar-bg: #0f172a; --input-bg: #f8fafc; --shadow: 0 4px 24px rgba(0,0,0,0.08);
}

body { font-family: 'Barlow', sans-serif; background: var(--bg); color: var(--text); transition: background 0.3s, color 0.3s; }

/* ── Layout ── */
.app-layout { display: flex; min-height: 100vh; }
.main-content { flex: 1; display: flex; flex-direction: column; min-height: 100vh; background: var(--bg); min-width: 0; margin-left: 240px; }

/* ── Sidebar (desktop only) ── */
.sidebar {
  position: fixed; top: 0; left: 0; height: 100vh; width: 240px;
  background: var(--sidebar-bg); border-right: 1px solid #0f2040;
  display: flex; flex-direction: column; padding: 20px 0; z-index: 100; overflow-y: auto; overflow-x: hidden;
}
.sidebar-top { display: flex; align-items: center; justify-content: space-between; padding: 0 14px 20px; border-bottom: 1px solid #0f2040; margin-bottom: 12px; }
.sidebar-logo { display: flex; align-items: center; gap: 10px; }
.logo-text { font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 22px; letter-spacing: 2px; color: #e2e8f0; }
.sidebar-nav { flex: 1; padding: 0 8px; display: flex; flex-direction: column; gap: 3px; }
.sidebar-bottom { padding: 12px 8px 0; border-top: 1px solid #0f2040; margin-top: auto; }
.user-card { display: flex; align-items: center; gap: 10px; padding: 10px 12px; margin-bottom: 4px; }
.user-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--accent); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; color: white; flex-shrink: 0; }
.user-name { font-size: 13px; font-weight: 600; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 3px; }

/* ── Nav items ── */
.nav-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px; background: none; border: none; color: #4a6080; font-family: 'Barlow', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; text-align: left; width: 100%; transition: background 0.15s, color 0.15s; white-space: nowrap; }
.nav-item:hover { background: #0f2040; color: #94a3b8; }
.nav-item.active { background: #1a2f52; color: #3b82f6; }
.nav-icon { font-size: 16px; flex-shrink: 0; }
.plan-badge { background: none; border: 1px solid var(--pc, #3b82f6); color: var(--pc, #3b82f6); border-radius: 5px; padding: 1px 7px; font-size: 10px; font-weight: 700; cursor: pointer; font-family: 'Barlow', sans-serif; transition: background 0.2s; }
.plan-badge:hover { background: var(--pc, #3b82f6); color: white; }

/* ── Topbar ── */
.topbar { display: flex; justify-content: space-between; align-items: center; padding: 14px 24px; border-bottom: 1px solid var(--border); background: var(--surface); position: sticky; top: 0; z-index: 10; }
.page-title { font-family: 'Barlow Condensed', sans-serif; font-size: 22px; font-weight: 700; letter-spacing: 1px; }
.topbar-actions { display: flex; gap: 6px; align-items: center; }
.topbar-btn { display: flex; flex-direction: column; align-items: center; gap: 2px; background: var(--card); border: 1px solid var(--border); color: var(--text-muted); border-radius: 10px; padding: 6px 10px; cursor: pointer; min-width: 46px; transition: all 0.2s; }
.topbar-btn:hover { border-color: var(--accent); color: var(--accent); }
.topbar-btn-icon { font-size: 14px; line-height: 1; }
.topbar-btn-label { font-size: 9px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; }

/* ── Hamburger ── */
.hamburger { background: none; border: none; cursor: pointer; display: flex; flex-direction: column; gap: 4px; padding: 4px; }
.hamburger span { display: block; width: 20px; height: 2px; background: var(--text); border-radius: 2px; }

/* ── Mobile drawer ── */
.mobile-drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 200; backdrop-filter: blur(4px); }
.mobile-drawer { position: absolute; top: 0; left: 0; width: 280px; height: 100vh; background: var(--sidebar-bg); display: flex; flex-direction: column; overflow-y: auto; animation: slideRight 0.25s ease; }
@keyframes slideRight { from { transform: translateX(-100%); } to { transform: translateX(0); } }

/* ── Mobile bottom nav ── */
.mobile-bottom-nav {
  position: fixed; bottom: 0; left: 0; right: 0; height: 60px; z-index: 100;
  background: var(--surface); border-top: 1px solid var(--border);
  display: flex; align-items: stretch;
}
.mobile-nav-btn { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; background: none; border: none; color: var(--text-muted); cursor: pointer; font-family: 'Barlow', sans-serif; transition: color 0.15s; padding: 0; }
.mobile-nav-btn.active { color: var(--accent); }
.mobile-nav-btn:hover { color: var(--text); }

/* ── Responsive ── */
.desktop-only { display: flex !important; }
.mobile-only { display: none !important; }
@media (max-width: 768px) {
  .desktop-only { display: none !important; }
  .mobile-only { display: flex !important; }
  .main-content { margin-left: 0 !important; padding-bottom: 60px; }
  .sidebar { display: none !important; }
  .content-area { padding: 16px; }
  .topbar { padding: 12px 16px; }
  .form-row { flex-direction: column; }
  .topbar-actions .topbar-btn { min-width: 38px; padding: 5px 8px; }
}

/* ── Content ── */
.content-area { padding: 24px 28px; max-width: 900px; width: 100%; margin: 0 auto; flex: 1; }
.card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 22px; margin-bottom: 18px; box-shadow: var(--shadow); transition: border-color 0.2s, background 0.3s; }
.card-label { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--accent); margin-bottom: 18px; }
.form-row { display: flex; gap: 12px; margin-bottom: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 0; }
.field-label { font-size: 10px; font-weight: 600; color: var(--text-muted); letter-spacing: 1px; text-transform: uppercase; }
.input { background: var(--input-bg); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; color: var(--text); font-family: 'Barlow', sans-serif; font-size: 14px; outline: none; width: 100%; transition: border-color 0.2s, box-shadow 0.2s, background 0.3s; }
.input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
input[type="date"].input { color-scheme: dark; }
.textarea { resize: vertical; min-height: 70px; }

/* ── Dropdowns ── */
.dropdown { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; z-index: 200; overflow: hidden; box-shadow: var(--shadow); }
.dropdown-item { display: block; width: 100%; background: none; border: none; color: var(--text); padding: 10px 16px; text-align: left; font-family: 'Barlow', sans-serif; font-size: 14px; cursor: pointer; transition: background 0.15s; }
.dropdown-item:hover { background: var(--accent-dim); }

/* ── Sets & exercises ── */
.sets-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; }
.set-chip { background: var(--accent-dim); border: 1px solid var(--accent); color: var(--text); border-radius: 7px; padding: 4px 10px; font-size: 12px; display: flex; align-items: center; gap: 6px; }
.sets-badge { display: inline-block; background: var(--accent-dim); border: 1px solid var(--accent); color: var(--accent); border-radius: 5px; padding: 1px 7px; font-size: 10px; font-weight: 700; margin-left: 8px; vertical-align: middle; }
.chip-del { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 13px; padding: 0 2px; transition: color 0.2s; }
.chip-del:hover { color: var(--danger); }
.ex-list { margin-top: 14px; display: flex; flex-direction: column; gap: 6px; }
.ex-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--input-bg); border-radius: 10px; border: 1px solid var(--border); animation: slideIn 0.2s ease; }
.ex-name { font-weight: 600; font-size: 14px; }
.ex-detail { color: var(--text-muted); font-size: 12px; }

/* ── Buttons ── */
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

/* ── Session cards ── */
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

/* ── Dashboard ── */
.section-title { font-family: 'Barlow Condensed', sans-serif; font-size: 22px; font-weight: 700; letter-spacing: 1px; margin-bottom: 20px; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
.stat-card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 18px 16px; display: flex; flex-direction: column; gap: 6px; animation: slideIn 0.3s ease both; transition: border-color 0.2s, transform 0.2s; }
.stat-card:hover { border-color: var(--accent); transform: translateY(-2px); }
.stat-value { font-family: 'Barlow Condensed', sans-serif; font-size: 22px; font-weight: 800; }

/* ── Login ── */
.login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; background: var(--bg); }
.login-box { background: var(--card); border: 1px solid var(--border); border-radius: 20px; padding: 40px 36px; width: 100%; max-width: 420px; box-shadow: var(--shadow); animation: fadeIn 0.4s ease; }
.login-logo { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
.tab-row { display: flex; border: 1px solid var(--border); border-radius: 10px; overflow: hidden; margin-bottom: 22px; }
.tab-btn { flex: 1; background: none; border: none; color: var(--text-muted); padding: 10px; font-family: 'Barlow', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; transition: background 0.2s, color 0.2s; }
.tab-btn.active { background: var(--accent); color: white; }
.err-msg { background: rgba(239,68,68,0.1); border: 1px solid #ef4444; color: #f87171; border-radius: 8px; padding: 9px 12px; font-size: 13px; margin-bottom: 10px; }

/* ── Plans ── */
.plans-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-top: 8px; }
.plan-card { border: 1px solid var(--border); border-radius: 14px; padding: 20px 16px; display: flex; flex-direction: column; gap: 8px; }
.plan-card.plan-active { border-color: var(--pc); background: color-mix(in srgb, var(--pc) 8%, var(--card)); }
.plan-name { font-family: 'Barlow Condensed', sans-serif; font-size: 20px; font-weight: 800; }
.plan-price { font-size: 16px; font-weight: 700; }
.plan-features { list-style: none; display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--text-muted); flex: 1; margin: 4px 0; }
.plan-btn { border-radius: 8px; padding: 8px; font-family: 'Barlow', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; margin-top: auto; }
.plan-btn:hover { opacity: 0.8; }

/* ── Library ── */
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

/* ── Modals ── */
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.65); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; animation: fadeIn 0.2s ease; backdrop-filter: blur(4px); }
.modal { background: var(--card); border: 1px solid var(--border); border-radius: 20px; padding: 28px; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow); animation: slideUp 0.25s ease; }
.modal-wide { max-width: 680px; }
.modal-library { max-width: 520px; max-height: 85vh; display: flex; flex-direction: column; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.modal-title { font-family: 'Barlow Condensed', sans-serif; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
.close-btn { background: none; border: none; color: var(--text-muted); font-size: 18px; cursor: pointer; padding: 4px; transition: color 0.2s; flex-shrink: 0; }
.close-btn:hover { color: var(--text); }

/* ── Misc ── */
.text-muted { color: var(--text-muted); }
.empty-state { text-align: center; padding: 60px 20px; color: var(--text-muted); }
.upgrade-banner { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.3); color: #f87171; border-radius: 12px; padding: 12px 18px; font-size: 13px; margin-bottom: 16px; }
.toast { position: fixed; bottom: 76px; left: 50%; transform: translateX(-50%); background: var(--card); border: 1px solid var(--border); color: var(--text); padding: 12px 22px; border-radius: 12px; font-size: 14px; font-weight: 500; z-index: 9999; white-space: nowrap; box-shadow: var(--shadow); animation: toastIn 0.3s ease; }
@media (min-width: 769px) { .toast { bottom: 28px; } }

@keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
.fade-in { animation: fadeIn 0.3s ease; }
.btn-guest { width: 100%; background: var(--input-bg); border: 1px solid var(--border); color: var(--text); border-radius: 12px; padding: 12px 16px; display: flex; align-items: center; gap: 14px; cursor: pointer; transition: border-color 0.2s, background 0.2s; font-family: 'Barlow', sans-serif; }
.btn-guest:hover { border-color: #f59e0b; background: rgba(245,158,11,0.06); }
.guest-banner { background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.3); color: #fbbf24; border-radius: 12px; padding: 10px 16px; font-size: 13px; margin-bottom: 16px; display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
`;