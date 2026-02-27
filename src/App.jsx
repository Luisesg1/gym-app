import { useState, useEffect, useRef, createContext, useContext } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

// ─── Firebase Config ──────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyAh3pfGv0vEpKmGtNKKRvAhma1pGtA7Alc",
  authDomain: "gymtracker-app-2c603.firebaseapp.com",
  projectId: "gymtracker-app-2c603",
  storageBucket: "gymtracker-app-2c603.firebasestorage.app",
  messagingSenderId: "1006490404310",
  appId: "1:1006490404310:web:015b3d4817304032aed077",
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

// ─── Contexts ─────────────────────────────────────────────────────
const ThemeCtx = createContext();
const useTheme = () => useContext(ThemeCtx);
const AuthCtx = createContext();
const useAuth = () => useContext(AuthCtx);

// ─── Helpers ──────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const fmtDate = (d) => { if (!d) return ""; const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; };
const todayStr = () => new Date().toISOString().slice(0, 10);
const lettersOnly = (v) => v.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "");
const numDot = (v) => v.replace(/[^0-9.]/g, "");
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const load = (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } };
const DAYS_ES = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

// ─── Password Validation ──────────────────────────────────────────
function validatePassword(pass) {
  const errors = [];
  if (pass.length < 8) errors.push("Mínimo 8 caracteres");
  if (!/[A-Z]/.test(pass)) errors.push("Al menos una mayúscula");
  if (!/[0-9]/.test(pass)) errors.push("Al menos un número");
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass)) errors.push("Al menos un símbolo");
  return errors;
}

function PasswordStrengthBar({ password }) {
  if (!password) return null;
  const errors = validatePassword(password);
  const score = 4 - errors.length;
  const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e"];
  const labels = ["Muy débil", "Débil", "Buena", "Fuerte"];
  const color = score > 0 ? colors[score - 1] : "#ef4444";
  const label = score > 0 ? labels[score - 1] : "Muy débil";
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: i <= score ? color : "var(--border)",
            transition: "background 0.3s"
          }} />
        ))}
      </div>
      <div style={{ fontSize: 11, color }}>
        {label}
        {errors.length > 0 && (
          <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>
            · Falta: {errors.join(", ")}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Firebase Error Translator ────────────────────────────────────
function firebaseErrMsg(code) {
  const map = {
    "auth/email-already-in-use":   "Este email ya está registrado",
    "auth/invalid-email":          "Email inválido",
    "auth/weak-password":          "Contraseña muy débil",
    "auth/user-not-found":         "Email o contraseña incorrectos",
    "auth/wrong-password":         "Email o contraseña incorrectos",
    "auth/invalid-credential":     "Email o contraseña incorrectos",
    "auth/too-many-requests":      "Demasiados intentos. Resetea tu contraseña.",
    "auth/network-request-failed": "Sin conexión a internet",
    "auth/user-disabled":          "Esta cuenta ha sido deshabilitada",
  };
  return map[code] || "Ocurrió un error. Intenta de nuevo.";
}

const PLANS = {
  guest: { name: "Invitado", price: "Sin cuenta", color: "#f59e0b", features: ["3 sesiones", "Sin historial guardado", "Herramientas básicas"] },
  free:  { name: "GymTracker", price: "Gratis", color: "#3b82f6", features: ["Todo incluido"] },
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

function calc1RM(weight, reps) {
  if (!weight || !reps || reps <= 0) return 0;
  const w = parseFloat(weight), r = parseFloat(reps);
  if (r === 1) return w;
  return Math.round(w * (1 + r / 30));
}

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

// ─── window.storage helpers ───────────────────────────────────────────────────
async function storageGet(key) {
  try {
    const r = await window.storage.get(key, true);
    return r ? JSON.parse(r.value) : null;
  } catch { return null; }
}
async function storageSet(key, val) {
  try {
    await window.storage.set(key, JSON.stringify(val), true);
    return true;
  } catch { return false; }
}
async function storageDelete(key) {
  try { await window.storage.delete(key, true); } catch {}
}
const hasStorage = () => typeof window !== "undefined" && !!window.storage;

// ─── Active Workout Mode ──────────────────────────────────────────────────────
function ActiveWorkoutModal({ exercises, onClose, onSave, unit }) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const [restSecs, setRestSecs] = useState(0);
  const [restRunning, setRestRunning] = useState(false);
  const [currentEx, setCurrentEx] = useState(0);
  const [exData, setExData] = useState(
    exercises.map(ex => ({ ...ex, sets: ex.sets?.length ? ex.sets.map(s => ({...s})) : [{ id: uid(), weight: "", reps: "", done: false }] }))
  );
  const [notes, setNotes] = useState({});
  const mainRef = useRef();
  const restRef = useRef();

  useEffect(() => {
    if (running) { mainRef.current = setInterval(() => setElapsed(e => e + 1), 1000); }
    else clearInterval(mainRef.current);
    return () => clearInterval(mainRef.current);
  }, [running]);

  function playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.2, 0.4].forEach((t, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = i === 2 ? 880 : 660;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.4, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.18);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.18);
      });
    } catch(e) {}
  }

  useEffect(() => {
    if (restRunning && restSecs > 0) {
      restRef.current = setInterval(() => setRestSecs(s => {
        if (s <= 1) { clearInterval(restRef.current); setRestRunning(false); playBeep(); return 0; }
        return s - 1;
      }), 1000);
    } else clearInterval(restRef.current);
    return () => clearInterval(restRef.current);
  }, [restRunning, restSecs]);

  const fmt = s => `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;
  const totalSets = exData.reduce((a, e) => a + e.sets.length, 0);
  const doneSets = exData.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0);
  const pct = totalSets > 0 ? doneSets / totalSets : 0;

  function toggleSet(exIdx, setIdx) {
    setExData(prev => prev.map((ex, i) => i !== exIdx ? ex : {
      ...ex, sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, done: !s.done })
    }));
    if (!exData[exIdx].sets[setIdx].done) { setRestSecs(90); setRestRunning(true); }
  }
  function updateSet(exIdx, setIdx, field, val) {
    setExData(prev => prev.map((ex, i) => i !== exIdx ? ex : {
      ...ex, sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, [field]: val })
    }));
  }
  function addSet(exIdx) {
    setExData(prev => prev.map((ex, i) => i !== exIdx ? ex : {
      ...ex, sets: [...ex.sets, { id: uid(), weight: ex.sets[ex.sets.length-1]?.weight || "", reps: ex.sets[ex.sets.length-1]?.reps || "", done: false }]
    }));
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--bg)", zIndex: 2000, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "12px 20px", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: 1 }}>⚡ Entrenando</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{doneSets}/{totalSets} series completadas</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: 32, fontWeight: 800, color: running ? "var(--accent)" : "var(--text-muted)", letterSpacing: 2 }}>{fmt(elapsed)}</div>
          <button onClick={() => setRunning(r => !r)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 11, cursor: "pointer", fontFamily: "Barlow, sans-serif" }}>{running ? "⏸ Pausar" : "▶ Reanudar"}</button>
        </div>
        <button onClick={() => { setRunning(false); onSave(exData); }} style={{ background: "var(--accent)", border: "none", color: "white", borderRadius: 10, padding: "10px 16px", fontFamily: "Barlow Condensed, sans-serif", fontSize: 16, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>💾 Finalizar</button>
        <button onClick={onClose} style={{ background: "none", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 13 }}>✕</button>
      </div>
      <div style={{ height: 4, background: "var(--border)", flexShrink: 0 }}>
        <div style={{ height: "100%", background: "linear-gradient(90deg, var(--accent), #22c55e)", width: `${pct * 100}%`, transition: "width 0.4s ease", borderRadius: 2 }} />
      </div>
      {restRunning && restSecs > 0 && (
        <div style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", margin: "8px 16px 0", borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <span style={{ fontSize: 20 }}>⏱️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Descanso</div>
            <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: 24, fontWeight: 800, color: "#22c55e" }}>{fmt(restSecs)}</div>
          </div>
          <button onClick={() => { setRestRunning(false); setRestSecs(0); }} style={{ background: "none", border: "1px solid #22c55e", color: "#22c55e", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12 }}>Saltar</button>
        </div>
      )}
      <div style={{ display: "flex", gap: 6, padding: "10px 16px 0", overflowX: "auto", flexShrink: 0 }}>
        {exData.map((ex, i) => {
          const done = ex.sets.every(s => s.done) && ex.sets.length > 0;
          return (
            <button key={i} onClick={() => setCurrentEx(i)} style={{ background: currentEx === i ? "var(--accent)" : done ? "rgba(34,197,94,0.15)" : "var(--card)", border: `1px solid ${currentEx === i ? "var(--accent)" : done ? "#22c55e" : "var(--border)"}`, color: currentEx === i ? "white" : done ? "#22c55e" : "var(--text-muted)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "Barlow, sans-serif", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
              {done ? "✓ " : ""}{ex.name}
            </button>
          );
        })}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {exData[currentEx] && (
          <div>
            <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{exData[currentEx].name}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>{exData[currentEx].sets.filter(s=>s.done).length}/{exData[currentEx].sets.length} series</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8, padding: "0 4px" }}>
              <div style={{ width: 36, fontSize: 10, color: "var(--text-muted)", textAlign: "center" }}>Serie</div>
              <div style={{ flex: 1, fontSize: 10, color: "var(--text-muted)", textAlign: "center" }}>Peso ({unit})</div>
              <div style={{ flex: 1, fontSize: 10, color: "var(--text-muted)", textAlign: "center" }}>Reps</div>
              <div style={{ width: 64, fontSize: 10, color: "var(--text-muted)", textAlign: "center" }}>Hecho</div>
            </div>
            {exData[currentEx].sets.map((s, j) => (
              <div key={s.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, padding: "10px 4px", background: s.done ? "rgba(34,197,94,0.08)" : "var(--card)", border: `1px solid ${s.done ? "rgba(34,197,94,0.3)" : "var(--border)"}`, borderRadius: 10 }}>
                <div style={{ width: 36, textAlign: "center", fontWeight: 800, fontSize: 15, fontFamily: "Barlow Condensed, sans-serif", color: s.done ? "#22c55e" : "var(--text-muted)" }}>S{j+1}</div>
                <input value={s.weight} onChange={e => updateSet(currentEx, j, "weight", numDot(e.target.value))} style={{ flex: 1, background: "var(--input-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px", color: "var(--text)", fontFamily: "Barlow, sans-serif", fontSize: 15, fontWeight: 700, textAlign: "center", outline: "none" }} placeholder="0" />
                <input value={s.reps} onChange={e => updateSet(currentEx, j, "reps", numDot(e.target.value))} style={{ flex: 1, background: "var(--input-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px", color: "var(--text)", fontFamily: "Barlow, sans-serif", fontSize: 15, fontWeight: 700, textAlign: "center", outline: "none" }} placeholder="0" />
                <button onClick={() => toggleSet(currentEx, j)} style={{ width: 64, height: 40, background: s.done ? "#22c55e" : "var(--input-bg)", border: `2px solid ${s.done ? "#22c55e" : "var(--border)"}`, borderRadius: 10, cursor: "pointer", fontSize: 18, transition: "all 0.2s" }}>
                  {s.done ? "✓" : "○"}
                </button>
              </div>
            ))}
            <button onClick={() => addSet(currentEx)} style={{ width: "100%", background: "none", border: "1px dashed var(--border)", color: "var(--text-muted)", borderRadius: 10, padding: 10, cursor: "pointer", fontFamily: "Barlow, sans-serif", fontSize: 13, marginTop: 4 }}>+ Serie</button>
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>Nota del ejercicio</div>
              <textarea value={notes[exData[currentEx].name] || ""} onChange={e => setNotes(n => ({...n, [exData[currentEx].name]: e.target.value}))} style={{ width: "100%", background: "var(--input-bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", color: "var(--text)", fontFamily: "Barlow, sans-serif", fontSize: 13, resize: "none", minHeight: 60, outline: "none" }} placeholder="Observaciones, sensaciones, técnica..." />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              {currentEx > 0 && <button onClick={() => setCurrentEx(i => i-1)} style={{ flex: 1, background: "var(--card)", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 10, padding: "10px", cursor: "pointer", fontFamily: "Barlow, sans-serif", fontSize: 13 }}>← Anterior</button>}
              {currentEx < exData.length - 1 && <button onClick={() => setCurrentEx(i => i+1)} style={{ flex: 1, background: "var(--accent)", border: "none", color: "white", borderRadius: 10, padding: "10px", cursor: "pointer", fontFamily: "Barlow Condensed, sans-serif", fontSize: 16, fontWeight: 700 }}>Siguiente →</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Templates Modal ──────────────────────────────────────────────────────────
function TemplatesModal({ sessions, onLoad, onClose }) {
  const [templates, setTemplates] = useState(() => load("gym_templates", []));
  const [tab, setTab] = useState("mine");
  const [importErr, setImportErr] = useState("");
  const fileRef = useRef();

  function saveTemplates(t) { setTemplates(t); store("gym_templates", t); }
  function deleteTemplate(id) { saveTemplates(templates.filter(t => t.id !== id)); }
  function loadTemplate(t) { onLoad(t.workout, t.exercises); onClose(); }
  const recentWorkouts = [...new Map(sessions.map(s => [s.workout, s])).values()].slice(0, 5);
  function saveFromSession(s) {
    if (!s.workout) return;
    const t = { id: uid(), name: s.workout, workout: s.workout, exercises: (s.exercises||[]).map(e => ({ ...e, id: uid(), sets: [], weight: "", reps: "" })), createdAt: todayStr() };
    saveTemplates([...templates, t]);
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImportErr("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (Array.isArray(data)) { store("gym_import_pending", data); onClose(); alert(`✅ Importando ${data.length} sesiones.`); }
        else setImportErr("Formato no reconocido.");
      } catch { setImportErr("Archivo inválido."); }
    };
    reader.readAsText(file);
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()} style={{ maxHeight:"85vh", overflowY:"auto" }}>
        <div className="modal-header">
          <h3 className="modal-title">📋 Plantillas</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="tab-row" style={{ marginBottom: 20 }}>
          <button className={`tab-btn ${tab==="mine"?"active":""}`} onClick={() => setTab("mine")}>Mis plantillas</button>
          <button className={`tab-btn ${tab==="quick"?"active":""}`} onClick={() => setTab("quick")}>Desde historial</button>
          <button className={`tab-btn ${tab==="import"?"active":""}`} onClick={() => setTab("import")}>Importar JSON</button>
        </div>
        {tab === "mine" && (
          <div>
            {templates.length === 0 && <p style={{ color:"var(--text-muted)", fontSize:13, textAlign:"center", padding:"20px 0" }}>Aún no tienes plantillas.</p>}
            {templates.map(t => (
              <div key={t.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 14px", background:"var(--input-bg)", border:"1px solid var(--border)", borderRadius:10, marginBottom:8 }}>
                <div><div style={{ fontWeight:700, fontSize:14 }}>{t.name}</div><div style={{ fontSize:11, color:"var(--text-muted)" }}>{(t.exercises||[]).length} ejercicios · {fmtDate(t.createdAt)}</div></div>
                <div style={{ display:"flex", gap:8 }}>
                  <button className="btn-ghost small" onClick={() => loadTemplate(t)}>▶ Usar</button>
                  <button className="btn-ghost small danger" onClick={() => deleteTemplate(t.id)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === "quick" && (
          <div>
            {recentWorkouts.length === 0 && <p style={{ color:"var(--text-muted)", fontSize:13, textAlign:"center" }}>Sin sesiones aún.</p>}
            {recentWorkouts.map(s => (
              <div key={s.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 14px", background:"var(--input-bg)", border:"1px solid var(--border)", borderRadius:10, marginBottom:8 }}>
                <div><div style={{ fontWeight:700, fontSize:14 }}>{s.workout}</div><div style={{ fontSize:11, color:"var(--text-muted)" }}>{(s.exercises||[]).length} ejercicios · {fmtDate(s.date)}</div></div>
                <div style={{ display:"flex", gap:8 }}>
                  <button className="btn-ghost small" onClick={() => loadTemplate(s)}>▶ Usar</button>
                  <button className="btn-ghost small" onClick={() => saveFromSession(s)}>💾 Guardar</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === "import" && (
          <div>
            <div style={{ background:"rgba(59,130,246,0.06)", border:"1px solid rgba(59,130,246,0.2)", borderRadius:12, padding:"16px", marginBottom:16 }}>
              <div style={{ fontWeight:700, fontSize:14, marginBottom:6 }}>📦 Restaurar backup JSON</div>
              <input ref={fileRef} type="file" accept=".json" style={{ display:"none" }} onChange={handleImport} />
              <button className="btn-primary" style={{ fontSize:15, padding:"10px 20px" }} onClick={() => fileRef.current.click()}>📂 Seleccionar archivo</button>
              {importErr && <div className="err-msg" style={{ marginTop:10 }}>{importErr}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Weekly Chart ─────────────────────────────────────────────────────────────
function WeeklyChart({ sessions }) {
  const weeks = [];
  for (let i = 7; i >= 0; i--) {
    const start = new Date(); start.setDate(start.getDate() - (i+1)*7); start.setHours(0,0,0,0);
    const end = new Date(); end.setDate(end.getDate() - i*7); end.setHours(23,59,59,999);
    const wSessions = sessions.filter(s => { const d = new Date(s.date+"T00:00:00"); return d >= start && d <= end; });
    const vol = wSessions.reduce((acc,s) => acc + (s.exercises||[]).reduce((a,ex) => {
      const w = ex.sets?.length>0 ? ex.sets.reduce((sum,st)=>(parseFloat(st.weight)||0)*(parseFloat(st.reps)||1)+sum,0) : (parseFloat(ex.weight)||0)*(parseFloat(ex.reps)||1);
      return a+w;
    },0),0);
    const label = i === 0 ? "Esta sem." : i === 1 ? "Ant." : `S-${i}`;
    weeks.push({ label, count: wSessions.length, vol: Math.round(vol) });
  }
  const maxCount = Math.max(...weeks.map(w=>w.count), 1);
  const maxVol = Math.max(...weeks.map(w=>w.vol), 1);
  const [view, setView] = useState("count");
  return (
    <div className="card">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div className="card-label" style={{ margin:0 }}>📈 Progreso semanal</div>
        <div style={{ display:"flex", gap:6 }}>
          <button className={`muscle-chip ${view==="count"?"active":""}`} onClick={()=>setView("count")} style={{ padding:"4px 10px" }}>Sesiones</button>
          <button className={`muscle-chip ${view==="vol"?"active":""}`} onClick={()=>setView("vol")} style={{ padding:"4px 10px" }}>Volumen</button>
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:100 }}>
        {weeks.map((w,i) => {
          const val = view==="count" ? w.count : w.vol;
          const max = view==="count" ? maxCount : maxVol;
          const h = max > 0 ? Math.max((val/max)*90, val>0?6:0) : 0;
          const isLast = i === weeks.length-1;
          return (
            <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
              <div style={{ fontSize:10, color:"var(--text-muted)", fontWeight:700 }}>{val>0 ? (view==="vol" ? `${(val/1000).toFixed(1)}t` : val) : ""}</div>
              <div style={{ width:"100%", height:h, background: isLast ? "var(--accent)" : "var(--border)", borderRadius:"4px 4px 0 0", transition:"height 0.4s ease", minHeight: val>0?4:0 }} />
              <div style={{ fontSize:9, color: isLast?"var(--accent)":"var(--text-muted)", fontWeight: isLast?700:400, textAlign:"center" }}>{w.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Weekly Goal Modal ────────────────────────────────────────────────────────
function WeeklyGoalModal({ goal, onSave, onClose, sessions }) {
  const [target, setTarget] = useState(goal?.target || 4);
  const thisWeek = sessions.filter(s => (new Date() - new Date(s.date+"T00:00:00"))/86400000 <= 7).length;
  const pct = Math.min(thisWeek / target, 1);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth:360 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">🎯 Meta semanal</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div style={{ textAlign:"center", marginBottom:20 }}>
          <div style={{ fontSize:48, fontWeight:800, fontFamily:"Barlow Condensed, sans-serif", color: pct>=1?"#22c55e":"var(--accent)" }}>{thisWeek}<span style={{ fontSize:24, color:"var(--text-muted)" }}>/{target}</span></div>
          <div style={{ fontSize:13, color:"var(--text-muted)", marginBottom:12 }}>sesiones esta semana</div>
          <div style={{ background:"var(--border)", borderRadius:20, height:10, overflow:"hidden", marginBottom:8 }}>
            <div style={{ height:"100%", background: pct>=1?"#22c55e":"var(--accent)", width:`${pct*100}%`, borderRadius:20, transition:"width 0.5s ease" }} />
          </div>
          {pct>=1 && <div style={{ color:"#22c55e", fontWeight:700, fontSize:14 }}>🎉 ¡Meta cumplida!</div>}
        </div>
        <div className="field" style={{ marginBottom:20 }}>
          <label className="field-label">Sesiones por semana (meta)</label>
          <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap" }}>
            {[2,3,4,5,6,7].map(n => (
              <button key={n} className={`muscle-chip ${target===n?"active":""}`} onClick={() => setTarget(n)} style={{ width:40, justifyContent:"center" }}>{n}</button>
            ))}
          </div>
        </div>
        <button className="btn-primary" style={{ width:"100%" }} onClick={() => { onSave({ target }); onClose(); }}>💾 Guardar meta</button>
      </div>
    </div>
  );
}

// ─── Badges ───────────────────────────────────────────────────────────────────
const BADGE_DEFS = [
  { id: "first",      icon: "🏋️", name: "Primera sesión",   desc: "Completaste tu primera sesión",         check: (s) => s.length >= 1 },
  { id: "sessions5",  icon: "🔥", name: "En racha",         desc: "5 sesiones completadas",                check: (s) => s.length >= 5 },
  { id: "sessions10", icon: "💪", name: "Dedicado",         desc: "10 sesiones completadas",               check: (s) => s.length >= 10 },
  { id: "sessions25", icon: "🦾", name: "Consistente",      desc: "25 sesiones completadas",               check: (s) => s.length >= 25 },
  { id: "sessions50", icon: "🏆", name: "Veterano",         desc: "50 sesiones completadas",               check: (s) => s.length >= 50 },
  { id: "pr1",        icon: "⭐", name: "Primer PR",        desc: "Superaste un récord personal",          check: (s, prs) => Object.keys(prs).length >= 1 },
  { id: "pr5",        icon: "🌟", name: "Máquina de PRs",   desc: "5 récords personales distintos",        check: (s, prs) => Object.keys(prs).length >= 5 },
  { id: "variety",    icon: "🎯", name: "Variado",          desc: "10 ejercicios distintos registrados",   check: (s) => new Set(s.flatMap(x => (x.exercises||[]).map(e=>e.name))).size >= 10 },
  { id: "streak3",    icon: "🔑", name: "3 días seguidos",  desc: "Entrenaste 3 días consecutivos",        check: (s) => getStreak(s) >= 3 },
  { id: "streak7",    icon: "🗓️", name: "Semana perfecta", desc: "7 días consecutivos entrenando",        check: (s) => getStreak(s) >= 7 },
  { id: "heavy",      icon: "🏗️", name: "Pesado",          desc: "Registraste 100kg+ en un ejercicio",    check: (s) => s.some(x => (x.exercises||[]).some(e => parseFloat(e.weight) >= 100 || (e.sets||[]).some(st => parseFloat(st.weight) >= 100))) },
];

function getStreak(sessions) {
  const dates = [...new Set(sessions.map(s => s.date))].sort().reverse();
  let streak = 0;
  let check = new Date(); check.setHours(0,0,0,0);
  for (let d of dates) {
    const sd = new Date(d + "T00:00:00");
    const diff = Math.round((check - sd) / 86400000);
    if (diff <= 1) { streak++; check = sd; } else break;
  }
  return streak;
}

function getPRs(sessions) {
  const prs = {};
  sessions.forEach(s => (s.exercises||[]).forEach(ex => {
    const w = ex.sets?.length > 0 ? Math.max(...ex.sets.map(st => parseFloat(st.weight)||0)) : parseFloat(ex.weight)||0;
    const r = ex.sets?.length > 0 ? Math.max(...ex.sets.map(st => parseFloat(st.reps)||0)) : parseFloat(ex.reps)||0;
    const rm = calc1RM(w, r);
    if (!prs[ex.name] || rm > prs[ex.name].rm) prs[ex.name] = { rm, date: s.date };
  }));
  return prs;
}

function BadgesModal({ sessions, onClose }) {
  const prs = getPRs(sessions);
  const earned = BADGE_DEFS.filter(b => b.check(sessions, prs));
  const locked = BADGE_DEFS.filter(b => !b.check(sessions, prs));
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()} style={{ maxHeight: "85vh", overflowY: "auto" }}>
        <div className="modal-header">
          <h3 className="modal-title">🏅 Logros</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>{earned.length} de {BADGE_DEFS.length} logros desbloqueados</div>
        {earned.length > 0 && (<>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "#f59e0b", textTransform: "uppercase", marginBottom: 12 }}>Desbloqueados ✨</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 24 }}>
            {earned.map(b => (
              <div key={b.id} style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.35)", borderRadius: 12, padding: "14px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 6 }}>{b.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{b.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>{b.desc}</div>
              </div>
            ))}
          </div>
        </>)}
        {locked.length > 0 && (<>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 12 }}>Bloqueados 🔒</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
            {locked.map(b => (
              <div key={b.id} style={{ background: "var(--input-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 12px", textAlign: "center", opacity: 0.5 }}>
                <div style={{ fontSize: 32, marginBottom: 6, filter: "grayscale(1)" }}>{b.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{b.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>{b.desc}</div>
              </div>
            ))}
          </div>
        </>)}
      </div>
    </div>
  );
}

// ─── Muscle Map ───────────────────────────────────────────────────────────────
const MUSCLE_GROUPS = {
  "Pecho":        { fill: "#3b82f6", paths: ["M 120 110 Q 140 100 155 115 Q 145 135 125 140 Q 108 130 110 115 Z", "M 180 110 Q 160 100 145 115 Q 155 135 175 140 Q 192 130 190 115 Z"] },
  "Hombros":      { fill: "#8b5cf6", paths: ["M 105 100 Q 95 90 100 80 Q 115 75 120 90 Q 115 100 108 103 Z", "M 195 100 Q 205 90 200 80 Q 185 75 180 90 Q 185 100 192 103 Z"] },
  "Bíceps":       { fill: "#ec4899", paths: ["M 95 115 Q 85 125 86 140 Q 96 145 104 135 Q 108 120 100 112 Z", "M 205 115 Q 215 125 214 140 Q 204 145 196 135 Q 192 120 200 112 Z"] },
  "Tríceps":      { fill: "#f97316", paths: ["M 92 115 Q 80 125 82 142 Q 90 150 96 140 Q 98 125 96 113 Z", "M 208 115 Q 220 125 218 142 Q 210 150 204 140 Q 202 125 204 113 Z"] },
  "Espalda":      { fill: "#10b981", paths: ["M 115 110 Q 150 105 185 110 Q 185 145 150 155 Q 115 145 115 110 Z"] },
  "Core":         { fill: "#f59e0b", paths: ["M 128 150 Q 150 147 172 150 Q 172 175 150 178 Q 128 175 128 150 Z"] },
  "Cuádriceps":   { fill: "#06b6d4", paths: ["M 120 190 Q 112 200 114 225 Q 130 230 136 215 Q 138 198 128 190 Z", "M 180 190 Q 188 200 186 225 Q 170 230 164 215 Q 162 198 172 190 Z"] },
  "Femoral":      { fill: "#84cc16", paths: ["M 118 190 Q 108 205 112 228 Q 122 235 128 220 Q 130 205 122 192 Z", "M 182 190 Q 192 205 188 228 Q 178 235 172 220 Q 170 205 178 192 Z"] },
  "Glúteos":      { fill: "#a855f7", paths: ["M 125 178 Q 150 172 175 178 Q 178 195 150 198 Q 122 195 125 178 Z"] },
  "Pantorrillas": { fill: "#14b8a6", paths: ["M 116 240 Q 110 255 114 268 Q 124 270 128 258 Q 130 244 120 240 Z", "M 184 240 Q 190 255 186 268 Q 176 270 172 258 Q 170 244 180 240 Z"] },
  "Cardio":       { fill: "#ef4444", paths: ["M 140 108 Q 150 100 160 108 Q 162 120 150 128 Q 138 120 140 108 Z"] },
};

function MuscleMapModal({ sessions, onClose }) {
  const [period, setPeriod] = useState("week");
  const cutoff = new Date();
  if (period === "week") cutoff.setDate(cutoff.getDate() - 7);
  else if (period === "month") cutoff.setDate(cutoff.getDate() - 30);
  else cutoff.setFullYear(2000);
  const muscleCounts = {};
  sessions.filter(s => new Date(s.date + "T00:00:00") >= cutoff).forEach(s => (s.exercises||[]).forEach(ex => {
    const dbEx = EXERCISE_DB.find(e => e.name === ex.name);
    if (dbEx) muscleCounts[dbEx.muscle] = (muscleCounts[dbEx.muscle] || 0) + 1;
  }));
  const maxCount = Math.max(...Object.values(muscleCounts), 1);
  const sorted = Object.entries(muscleCounts).sort((a,b) => b[1]-a[1]);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()} style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <div className="modal-header">
          <h3 className="modal-title">💪 Mapa muscular</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="tab-row" style={{ marginBottom: 20 }}>
          {[["week","Esta semana"],["month","Este mes"],["all","Todo"]].map(([v,l]) => (
            <button key={v} className={`tab-btn ${period===v?"active":""}`} onClick={() => setPeriod(v)}>{l}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <div style={{ flex: "0 0 auto" }}>
            <svg width={300} height={340} viewBox="0 0 300 340" style={{ display: "block" }}>
              <ellipse cx={150} cy={72} rx={28} ry={28} fill="var(--border)" />
              <rect x={118} y={98} width={64} height={90} rx={10} fill="var(--border)" />
              <rect x={90} y={100} width={28} height={75} rx={8} fill="var(--border)" />
              <rect x={182} y={100} width={28} height={75} rx={8} fill="var(--border)" />
              <rect x={80} y={170} width={22} height={55} rx={7} fill="var(--border)" />
              <rect x={198} y={170} width={22} height={55} rx={7} fill="var(--border)" />
              <rect x={120} y={188} width={26} height={90} rx={8} fill="var(--border)" />
              <rect x={154} y={188} width={26} height={90} rx={8} fill="var(--border)" />
              <rect x={122} y={276} width={22} height={55} rx={7} fill="var(--border)" />
              <rect x={156} y={276} width={22} height={55} rx={7} fill="var(--border)" />
              {Object.entries(MUSCLE_GROUPS).map(([muscle, { fill, paths }]) => {
                const count = muscleCounts[muscle] || 0;
                const opacity = count > 0 ? 0.3 + (count / maxCount) * 0.65 : 0;
                return paths.map((d, i) => (
                  <path key={`${muscle}-${i}`} d={d} fill={fill} opacity={opacity} style={{ transition: "opacity 0.5s ease" }}>
                    <title>{muscle}: {count}</title>
                  </path>
                ));
              })}
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            {sorted.length === 0 ? <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Sin sesiones en este período.</p> : (<>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 12 }}>Músculos trabajados</div>
              {sorted.map(([muscle, count]) => {
                const color = MUSCLE_GROUPS[muscle]?.fill || "#64748b";
                return (
                  <div key={muscle} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{muscle}</div>
                    <div style={{ width: 80, height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", background: color, width: `${(count/maxCount)*100}%`, borderRadius: 3 }} />
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", width: 20, textAlign: "right" }}>{count}</div>
                  </div>
                );
              })}
            </>)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Rest Timer ───────────────────────────────────────────────────────────────
function CustomTimerInput({ onApply }) {
  const [val, setVal] = useState("");
  function apply() { const n = parseInt(val); if (n >= 5) { onApply(n); setVal(""); } }
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
      <input type="number" min={5} max={600} placeholder="ej: 150 seg" value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === "Enter" && apply()} style={{ width: 100, background: "var(--input-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", color: "var(--text)", fontFamily: "Barlow, sans-serif", fontSize: 14, textAlign: "center", outline: "none" }} />
      <button className="btn-ghost small" onClick={apply}>Aplicar</button>
    </div>
  );
}

function RestTimer({ onClose }) {
  const [seconds, setSeconds] = useState(90);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);
  function playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.2, 0.4].forEach((t, i) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = i === 2 ? 880 : 660; osc.type = "sine";
        gain.gain.setValueAtTime(0.4, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.18);
        osc.start(ctx.currentTime + t); osc.stop(ctx.currentTime + t + 0.18);
      });
    } catch(e) {}
  }
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed(e => {
          if (e + 1 >= seconds) { clearInterval(intervalRef.current); setRunning(false); playBeep(); return e + 1; }
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
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={done ? "#22c55e" : "var(--accent)"} strokeWidth={6} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - pct)} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: "stroke-dashoffset 1s linear" }} />
          <text x={cx} y={cy - 8} textAnchor="middle" fill="var(--text)" fontSize={22} fontWeight={800} fontFamily="Barlow Condensed, sans-serif">{done ? "✓" : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`}</text>
          <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--text-muted)" fontSize={10}>{done ? "Listo!" : "restante"}</text>
        </svg>
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 8, flexWrap: "wrap" }}>
          {[[60,"Cardio"],[90,"Hipertrofia ⭐"],[120,"Fuerza"],[180,"Pesado"]].map(([t, label]) => (
            <button key={t} className={`muscle-chip ${seconds === t ? "active" : ""}`} onClick={() => { setSeconds(t); setElapsed(0); setRunning(false); }} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2, padding:"6px 10px" }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{t < 60 ? `${t}s` : `${t/60}m`}</span>
              <span style={{ fontSize: 9, opacity: 0.75 }}>{label}</span>
            </button>
          ))}
        </div>
        <CustomTimerInput onApply={(v) => { setSeconds(v); setElapsed(0); setRunning(false); }} />
        <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginBottom: 14 }}>💡 60s cardio · 90s hipertrofia · 2-3m fuerza</div>
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
          <div className="field"><label className="field-label">Peso (kg)</label><input className="input" placeholder="0" value={weight} onChange={e => setWeight(numDot(e.target.value))} /></div>
          <div className="field"><label className="field-label">Repeticiones</label><input className="input" placeholder="0" value={reps} onChange={e => setReps(numDot(e.target.value))} /></div>
        </div>
        {result > 0 && (
          <div>
            <div style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)", borderRadius: 12, padding: "16px", textAlign: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>1RM Estimado</div>
              <div style={{ fontSize: 40, fontWeight: 800, fontFamily: "Barlow Condensed, sans-serif" }}>{result} kg</div>
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
  const bmi = stats.height && entries.length > 0 ? (entries[entries.length - 1].weight / Math.pow(stats.height / 100, 2)).toFixed(1) : null;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">⚖️ Peso & Estatura</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="form-row" style={{ marginBottom: 16 }}>
          <div className="field"><label className="field-label">Estatura (cm)</label><input className="input" placeholder="170" value={height} onChange={e => setHeight(numDot(e.target.value))} /></div>
          <div className="field"><label className="field-label">Peso hoy (kg)</label><input className="input" placeholder="70.5" value={weight} onChange={e => setWeight(numDot(e.target.value))} /></div>
          <button className="btn-primary" style={{ alignSelf: "flex-end", padding: "10px 18px", fontSize: 15 }} onClick={save}>Guardar</button>
        </div>
        {bmi && (
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            {[["Peso actual", `${entries[entries.length-1].weight} kg`], ["Estatura", `${stats.height} cm`], ["IMC", bmi]].map(([l, v]) => (
              <div key={l} style={{ flex: 1, background: "var(--input-bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "Barlow Condensed, sans-serif" }}>{v}</div>
              </div>
            ))}
          </div>
        )}
        {entries.length >= 2 && (<>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "var(--accent)", marginBottom: 8 }}>Evolución de peso</div>
          <svg width="100%" viewBox={`0 0 ${W + 4} ${H + 30}`} style={{ display: "block", marginBottom: 12 }}>
            {[0, 0.5, 1].map(t => { const y = H - t * H; return <g key={t}><line x1={36} y1={y} x2={W} y2={y} stroke="var(--border)" strokeWidth={1} /><text x={30} y={y + 4} textAnchor="end" fill="var(--text-muted)" fontSize={10}>{(min + t * range).toFixed(1)}</text></g>; })}
            <polyline points={entries.map((e, i) => `${36 + (i / (entries.length - 1)) * (W - 36)},${H - ((e.weight - min) / range) * H}`).join(" ")} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinecap="round" />
            {entries.map((e, i) => { const x = 36 + (i / (entries.length - 1)) * (W - 36); const y = H - ((e.weight - min) / range) * H; return <g key={i}><circle cx={x} cy={y} r={4} fill="var(--accent)" /><text x={x} y={H + 22} textAnchor="middle" fill="var(--text-muted)" fontSize={9}>{fmtDate(e.date)}</text></g>; })}
          </svg>
        </>)}
        {entries.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center" }}>Aún no hay registros de peso.</p>}
      </div>
    </div>
  );
}

// ─── Weekly Planner ───────────────────────────────────────────────────────────
function WeeklyPlannerModal({ plan, onSave, onClose, sessions }) {
  const [mode, setMode] = useState(plan.mode || "weekly");
  const [weekly, setWeekly] = useState(plan.weekly || {});
  const [cycle, setCycle] = useState(plan.cycle || [{ id: uid(), name: "" }]);
  const [cyclePos, setCyclePos] = useState(plan.cyclePos || 0);
  const workoutNames = [...new Set(sessions.map(s => s.workout).filter(Boolean))];
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
                <input className="input" style={{ flex: 1, padding: "7px 12px" }} placeholder="Descanso / Push Day…" value={weekly[i] || ""} onChange={e => setWeekly(w => ({ ...w, [i]: e.target.value }))} list={`wk-dl-${i}`} />
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
                  <input className="input" style={{ flex: 1, padding: "7px 12px" }} placeholder={`Día ${i+1}`} value={d.name} onChange={e => setCycle(c => c.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                  {cycle.length > 1 && <button className="chip-del" onClick={() => setCycle(c => c.filter((_, j) => j !== i))}>✕</button>}
                </div>
              ))}
            </div>
            <button className="btn-ghost small" onClick={() => setCycle(c => [...c, { id: uid(), name: "" }])}>+ Agregar día</button>
          </div>
        )}
        <button className="btn-primary" style={{ width: "100%", marginTop: 16 }} onClick={() => { onSave({ mode, weekly, cycle, cyclePos }); onClose(); }}>💾 Guardar</button>
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
        {history.length < 2 ? <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Necesitas al menos 2 registros para ver progreso.</p> : (<>
          {prEntry && <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.4)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, display: "flex", gap: 16, alignItems: "center" }}>
            <span style={{ fontSize: 20 }}>🏆</span>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "#f59e0b", textTransform: "uppercase" }}>Récord personal</div>
              <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "Barlow Condensed, sans-serif" }}>{prEntry.weight} kg × {prEntry.reps} reps → 1RM ≈ {calc1RM(prEntry.weight, prEntry.reps)} kg</div>
            </div>
          </div>}
          <svg width="100%" viewBox={`0 0 ${W + 4} ${H + 30}`} style={{ display: "block", margin: "8px 0 12px" }}>
            {[0, 0.5, 1].map(t => { const y = H - t * H; return <g key={t}><line x1={36} y1={y} x2={W} y2={y} stroke="var(--border)" strokeWidth={1} /><text x={30} y={y + 4} textAnchor="end" fill="var(--text-muted)" fontSize={10}>{(min + t * range).toFixed(1)}</text></g>; })}
            <polyline points={history.map((h, i) => `${36 + (i / (history.length - 1)) * (W - 36)},${H - ((h.weight - min) / range) * H}`).join(" ")} fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeLinecap="round" />
            {history.map((h, i) => { const x = 36 + (i / (history.length - 1)) * (W - 36); const y = H - ((h.weight - min) / range) * H; const isPR = h === prEntry; return <g key={i}><circle cx={x} cy={y} r={isPR ? 6 : 4} fill={isPR ? "#f59e0b" : "#3b82f6"} /><text x={x} y={H + 22} textAnchor="middle" fill="var(--text-muted)" fontSize={9}>{fmtDate(h.date)}</text></g>; })}
          </svg>
        </>)}
      </div>
    </div>
  );
}

// ─── Progress Prediction ──────────────────────────────────────────────────────
function ProgressPrediction({ sessions }) {
  const [selected, setSelected] = useState("");
  const exMap = {};
  sessions.forEach(s => (s.exercises||[]).forEach(ex => {
    const w = ex.sets?.length>0 ? Math.max(...ex.sets.map(st=>parseFloat(st.weight)||0)) : parseFloat(ex.weight)||0;
    const r = ex.sets?.length>0 ? Math.max(...ex.sets.map(st=>parseFloat(st.reps)||0)) : parseFloat(ex.reps)||0;
    const rm = calc1RM(w, r);
    if (!exMap[ex.name]) exMap[ex.name] = [];
    if (rm > 0) exMap[ex.name].push({ date: s.date, rm });
  }));
  const validExercises = Object.entries(exMap).filter(([,v]) => v.length >= 2).map(([k]) => k);
  const ex = selected || validExercises[0] || "";
  const points = ex ? (exMap[ex] || []).sort((a,b) => a.date.localeCompare(b.date)) : [];
  let weeklyGain = 0, currentRM = 0, targets = [];
  if (points.length >= 2) {
    const t0 = new Date(points[0].date + "T00:00:00").getTime();
    const xs = points.map(p => (new Date(p.date+"T00:00:00").getTime() - t0) / 86400000);
    const ys = points.map(p => p.rm);
    const n = xs.length;
    const sumX = xs.reduce((a,b)=>a+b,0), sumY = ys.reduce((a,b)=>a+b,0);
    const sumXY = xs.reduce((s,x,i)=>s+x*ys[i],0), sumX2 = xs.reduce((s,x)=>s+x*x,0);
    const slope = (n*sumXY - sumX*sumY) / (n*sumX2 - sumX*sumX);
    const intercept = (sumY - slope*sumX) / n;
    currentRM = Math.round(points[points.length-1].rm);
    weeklyGain = Math.round(slope * 7 * 10) / 10;
    const lastX = xs[xs.length-1];
    if (slope > 0) {
      const roundTargets = [60,70,80,90,100,110,120,130,140,150,160,180,200].filter(t => t > currentRM);
      targets = roundTargets.slice(0,3).map(target => {
        const daysNeeded = (target - intercept) / slope - lastX;
        const weeksNeeded = Math.ceil(daysNeeded / 7);
        const eta = new Date(); eta.setDate(eta.getDate() + Math.round(daysNeeded));
        return { target, weeks: weeksNeeded, eta: eta.toLocaleDateString("es-CL", { month:"short", year:"numeric" }) };
      });
    }
  }
  if (validExercises.length === 0) return (
    <div className="card">
      <div className="card-label">📈 Predicción de progreso</div>
      <p style={{ fontSize:13, color:"var(--text-muted)", textAlign:"center", padding:"12px 0" }}>Necesitas al menos 2 sesiones con el mismo ejercicio.</p>
    </div>
  );
  return (
    <div className="card">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 }}>
        <div className="card-label" style={{ margin:0 }}>📈 Predicción de progreso</div>
        <select className="input" style={{ width:"auto", fontSize:12, padding:"5px 10px" }} value={ex} onChange={e => setSelected(e.target.value)}>
          {validExercises.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>
      <div style={{ display:"flex", gap:12, marginBottom:16 }}>
        <div style={{ flex:1, background:"var(--input-bg)", borderRadius:10, padding:"10px 14px", border:"1px solid var(--border)" }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:1, color:"var(--text-muted)", textTransform:"uppercase" }}>1RM actual</div>
          <div style={{ fontFamily:"Barlow Condensed, sans-serif", fontSize:28, fontWeight:800, color:"var(--accent)" }}>{currentRM} kg</div>
        </div>
        <div style={{ flex:1, background:"var(--input-bg)", borderRadius:10, padding:"10px 14px", border:"1px solid var(--border)" }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:1, color:"var(--text-muted)", textTransform:"uppercase" }}>Ganancia/semana</div>
          <div style={{ fontFamily:"Barlow Condensed, sans-serif", fontSize:28, fontWeight:800, color: weeklyGain>0?"#22c55e":"#f87171" }}>{weeklyGain > 0 ? "+" : ""}{weeklyGain} kg</div>
        </div>
      </div>
      {targets.length > 0 && targets.map(t => (
        <div key={t.target} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", background:"rgba(59,130,246,0.05)", border:"1px solid rgba(59,130,246,0.15)", borderRadius:10, marginBottom:6 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20 }}>🎯</span>
            <div><div style={{ fontWeight:700, fontSize:14 }}>Llegar a {t.target} kg</div><div style={{ fontSize:11, color:"var(--text-muted)" }}>~{t.eta}</div></div>
          </div>
          <div style={{ fontFamily:"Barlow Condensed, sans-serif", fontSize:18, fontWeight:800, color:"var(--accent)" }}>{t.weeks <= 0 ? "¡Ya!" : `${t.weeks} sem.`}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Muscle Balance ────────────────────────────────────────────────────────────
function MuscleBalance({ sessions }) {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
  const counts = {};
  sessions.filter(s => new Date(s.date+"T00:00:00") >= cutoff).forEach(s =>
    (s.exercises||[]).forEach(ex => {
      const db = EXERCISE_DB.find(e => e.name === ex.name);
      if (db) counts[db.muscle] = (counts[db.muscle]||0) + 1;
    })
  );
  const groups = { "Empuje 🔵": ["Pecho","Hombros","Tríceps"], "Tirón 🟢": ["Espalda","Bíceps"], "Piernas 🔴": ["Cuádriceps","Femoral","Glúteos","Pantorrillas"], "Core 🟡": ["Core"] };
  const groupTotals = Object.entries(groups).map(([gname, muscles]) => ({ name: gname, total: muscles.reduce((s,m)=>s+(counts[m]||0),0), muscles: muscles.map(m=>({ name:m, count:counts[m]||0 })).filter(m=>m.count>0) }));
  const maxTotal = Math.max(...groupTotals.map(g=>g.total), 1);
  const totalAll = groupTotals.reduce((s,g)=>s+g.total,0);
  const push = groupTotals.find(g=>g.name.startsWith("Empuje"))?.total||0;
  const pull = groupTotals.find(g=>g.name.startsWith("Tirón"))?.total||0;
  const legs = groupTotals.find(g=>g.name.startsWith("Piernas"))?.total||0;
  const warnings = [];
  if (push > 0 && pull > 0 && push / pull > 1.8) warnings.push("⚠️ Entrenas mucho más empuje que tirón.");
  if (totalAll > 0 && legs / totalAll < 0.15) warnings.push("🦵 Estás descuidando las piernas.");
  const colors = { "Empuje 🔵":"#3b82f6","Tirón 🟢":"#22c55e","Piernas 🔴":"#ef4444","Core 🟡":"#f59e0b" };
  return (
    <div className="card">
      <div className="card-label">⚖️ Balance muscular (últimos 30 días)</div>
      {totalAll === 0 ? <p style={{ fontSize:13, color:"var(--text-muted)", textAlign:"center" }}>Sin sesiones este mes.</p> : (<>
        <div style={{ display:"flex", height:14, borderRadius:8, overflow:"hidden", marginBottom:16, gap:2 }}>
          {groupTotals.filter(g=>g.total>0).map(g => <div key={g.name} style={{ flex:g.total, background:colors[g.name] }} />)}
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginBottom:16 }}>
          {groupTotals.map(g => (
            <div key={g.name} style={{ flex:"1 1 140px", background:"var(--input-bg)", border:`1px solid ${colors[g.name]}33`, borderRadius:10, padding:"10px 12px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:13, fontWeight:700 }}>{g.name}</span>
                <span style={{ fontFamily:"Barlow Condensed, sans-serif", fontSize:18, fontWeight:800, color:colors[g.name] }}>{g.total}</span>
              </div>
              <div style={{ background:"var(--border)", borderRadius:4, height:5, overflow:"hidden" }}>
                <div style={{ height:"100%", background:colors[g.name], width:`${(g.total/maxTotal)*100}%` }} />
              </div>
            </div>
          ))}
        </div>
        {warnings.map((w,i) => <div key={i} style={{ background:"rgba(245,158,11,0.07)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:8, padding:"9px 12px", fontSize:12, color:"#fbbf24", marginBottom:6 }}>{w}</div>)}
      </>)}
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
  const grouped = MUSCLES.reduce((acc, m) => { const exs = filtered.filter(e => e.muscle === m); if (exs.length > 0) acc[m] = exs; return acc; }, {});
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
            <option>Todos</option><option>Máquina</option><option>Sin máquina</option>
          </select>
        </div>
        <div className="muscle-chips">
          {["Todos", ...MUSCLES].map(m => <button key={m} className={`muscle-chip ${muscleFilter === m ? "active" : ""}`} onClick={() => setMuscleFilter(m)}>{m}</button>)}
        </div>
        <div className="lib-list">
          {Object.entries(grouped).map(([muscle, exs]) => (
            <div key={muscle} className="lib-group">
              <div className="lib-group-title">{muscle}</div>
              {exs.map(ex => (
                <button key={ex.name} className="lib-item" onClick={() => { onSelect(ex.name); onClose(); }}>
                  <div className="lib-info"><span className="lib-name">{ex.name}</span><span className="lib-meta">{ex.equipment} · {ex.machine ? "Máquina" : "Libre"}</span></div>
                  <span className="lib-add">+</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Share Card ───────────────────────────────────────────────────────────────
function ShareCardModal({ session, user, unit, onClose }) {
  const canvasRef = useRef();
  const [copied, setCopied] = useState(false);
  const totalVol = (session.exercises||[]).reduce((acc,ex) => acc+(ex.sets?.length>0?ex.sets.reduce((s,st)=>(parseFloat(st.weight)||0)*(parseFloat(st.reps)||1)+s,0):(parseFloat(ex.weight)||0)*(parseFloat(ex.reps)||1)),0);
  const totalSets = (session.exercises||[]).reduce((acc,ex)=>acc+(ex.sets?.length||1),0);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = 1080, H = 1080; canvas.width = W; canvas.height = H;
    const bg = ctx.createLinearGradient(0,0,W,H); bg.addColorStop(0,"#0f172a"); bg.addColorStop(0.5,"#1e1b4b"); bg.addColorStop(1,"#0f172a");
    ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
    const accent = ctx.createLinearGradient(0,0,W,0); accent.addColorStop(0,"#3b82f6"); accent.addColorStop(1,"#8b5cf6");
    ctx.fillStyle = accent; ctx.fillRect(0,0,W,8);
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 36px Arial"; ctx.fillText("⚡ GymTracker", 80, 90);
    ctx.fillStyle = "#94a3b8"; ctx.font = "28px Arial"; ctx.fillText(fmtDate(session.date), 80, 135);
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 72px Arial";
    const wname = session.workout || "Sesión"; ctx.fillText(wname.length > 18 ? wname.slice(0,18)+"…" : wname, 80, 240);
    const stats = [{ label: "Ejercicios", value: (session.exercises||[]).length }, { label: "Series", value: totalSets }, { label: "Volumen", value: `${Math.round(totalVol/100)/10}t` }];
    stats.forEach((st,i) => { const x = 80+i*320, y = 300; ctx.fillStyle="rgba(255,255,255,0.06)"; ctx.beginPath(); ctx.roundRect(x,y,290,150,20); ctx.fill(); ctx.fillStyle="#3b82f6"; ctx.font="bold 56px Arial"; ctx.fillText(String(st.value),x+30,y+90); ctx.fillStyle="#94a3b8"; ctx.font="26px Arial"; ctx.fillText(st.label,x+30,y+130); });
    ctx.fillStyle = "#3b82f6"; ctx.font = "bold 30px Arial"; ctx.fillText(`@${user.name}`, 80, H-80);
    ctx.fillStyle = accent; ctx.fillRect(0,H-8,W,8);
  }, []);
  async function download() {
    const link = document.createElement("a"); link.download = `gymtracker_${session.date}.png`; link.href = canvasRef.current.toDataURL("image/png"); link.click();
  }
  async function copyImage() {
    try { canvasRef.current.toBlob(async blob => { await navigator.clipboard.write([new ClipboardItem({"image/png": blob})]); setCopied(true); setTimeout(()=>setCopied(false),2000); }); } catch { download(); }
  }
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={e=>e.stopPropagation()} style={{ maxHeight:"90vh", overflowY:"auto" }}>
        <div className="modal-header"><h3 className="modal-title">📸 Compartir sesión</h3><button className="close-btn" onClick={onClose}>✕</button></div>
        <canvas ref={canvasRef} style={{ width:"100%", borderRadius:12, border:"1px solid var(--border)", display:"block", marginBottom:16 }} />
        <div style={{ display:"flex", gap:10 }}>
          <button className="btn-primary" style={{ flex:1 }} onClick={download}>⬇️ Descargar</button>
          <button className="btn-ghost" style={{ flex:1 }} onClick={copyImage}>{copied?"✅ Copiada!":"📋 Copiar"}</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ─── TEAMS MODAL (MEJORADO CON window.storage) ────────────────────
// ══════════════════════════════════════════════════════════════════
function TeamsModal({ user, sessions, onClose }) {
  const [tab, setTab] = useState("home");
  const [myTeams, setMyTeams] = useState(() => load(`gym_teams_${user.email}`, []));
  const [activeTeam, setActiveTeam] = useState(null);
  const [teamData, setTeamData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [createName, setCreateName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const [rankMetric, setRankMetric] = useState("volume");
  const storageOk = hasStorage();

  function saveMyTeams(t) { setMyTeams(t); store(`gym_teams_${user.email}`, t); }

  // Calcular mis stats actuales
  const myStats = {
    name: user.name,
    email: user.email,
    sessions: sessions.length,
    volume: Math.round(sessions.reduce((acc,s) => acc+(s.exercises||[]).reduce((a,ex) => {
      const w = ex.sets?.length>0 ? ex.sets.reduce((sum,st)=>(parseFloat(st.weight)||0)*(parseFloat(st.reps)||1)+sum,0) : (parseFloat(ex.weight)||0)*(parseFloat(ex.reps)||1);
      return a+w;
    },0),0)/1000 * 10)/10,
    prs: (() => {
      const p={}; sessions.forEach(s=>(s.exercises||[]).forEach(ex=>{
        const w=ex.sets?.length>0?Math.max(...ex.sets.map(st=>parseFloat(st.weight)||0)):parseFloat(ex.weight)||0;
        const r=ex.sets?.length>0?Math.max(...ex.sets.map(st=>parseFloat(st.reps)||0)):parseFloat(ex.reps)||0;
        const rm=calc1RM(w,r); if(!p[ex.name]||rm>p[ex.name])p[ex.name]=rm;
      })); return Object.keys(p).length;
    })(),
    streak: getStreak(sessions),
    lastUpdate: todayStr(),
  };

  // Semana actual
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);
  const weekSessions = sessions.filter(s => new Date(s.date+"T00:00:00") >= weekStart);
  const myWeekVol = Math.round(weekSessions.reduce((acc,s)=>acc+(s.exercises||[]).reduce((a,ex)=>{
    const w=ex.sets?.length>0?ex.sets.reduce((sum,st)=>(parseFloat(st.weight)||0)*(parseFloat(st.reps)||1)+sum,0):(parseFloat(ex.weight)||0)*(parseFloat(ex.reps)||1);
    return a+w;
  },0),0)/1000*10)/10;

  async function loadTeam(code) {
    setLoading(true);
    setErr("");
    try {
      const data = await storageGet(`team_${code}`);
      if (data) {
        setTeamData(data);
      } else {
        setErr("No se pudo cargar el equipo.");
        setTeamData(null);
      }
    } catch(e) {
      setErr("Error al cargar el equipo.");
    }
    setLoading(false);
  }

  async function createTeam() {
    if (!createName.trim()) { setErr("Ponle nombre al equipo"); return; }
    if (!storageOk) { setErr("Storage no disponible en este entorno."); return; }
    setLoading(true);
    setErr("");
    try {
      const code = Math.random().toString(36).slice(2,8).toUpperCase();
      const team = {
        code, name: createName.trim(), createdBy: user.name,
        members: { [user.email]: myStats },
        createdAt: todayStr()
      };
      const ok = await storageSet(`team_${code}`, team);
      if (!ok) throw new Error("Error guardando");
      const newTeam = { code, name: createName.trim() };
      saveMyTeams([...myTeams, newTeam]);
      setActiveTeam(newTeam);
      setTeamData(team);
      setCreateName("");
      setSuccess(`¡Equipo creado! Código: ${code}`);
      setTab("team");
    } catch(e) {
      setErr("Error al crear el equipo. Intenta de nuevo.");
    }
    setLoading(false);
  }

  async function joinTeam() {
    const code = joinCode.trim().toUpperCase();
    if (!code || code.length < 4) { setErr("Ingresa el código del equipo"); return; }
    if (!storageOk) { setErr("Storage no disponible."); return; }
    // Evitar unirse dos veces
    if (myTeams.find(t => t.code === code)) { setErr("Ya perteneces a este equipo"); return; }
    setLoading(true);
    setErr("");
    try {
      const data = await storageGet(`team_${code}`);
      if (!data) { setErr("Equipo no encontrado. Verifica el código."); setLoading(false); return; }
      // Añadir miembro
      const updated = { ...data, members: { ...data.members, [user.email]: myStats } };
      await storageSet(`team_${code}`, updated);
      const newTeam = { code, name: data.name };
      saveMyTeams([...myTeams, newTeam]);
      setActiveTeam(newTeam);
      setTeamData(updated);
      setJoinCode("");
      setSuccess(`✅ Te uniste a "${data.name}"`);
      setTab("team");
    } catch(e) {
      setErr("Error al unirse. Intenta de nuevo.");
    }
    setLoading(false);
  }

  async function syncStats() {
    if (!activeTeam || !storageOk) return;
    setSyncing(true);
    setErr("");
    try {
      const data = await storageGet(`team_${activeTeam.code}`);
      if (data) {
        const updated = { ...data, members: { ...data.members, [user.email]: myStats } };
        await storageSet(`team_${activeTeam.code}`, updated);
        setTeamData(updated);
        setSuccess("✅ Stats actualizados");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setErr("No se encontró el equipo en el servidor.");
      }
    } catch(e) {
      setErr("Error al sincronizar.");
    }
    setSyncing(false);
  }

  async function leaveTeam(code) {
    if (!storageOk) return;
    try {
      const data = await storageGet(`team_${code}`);
      if (data) {
        const updated = { ...data, members: { ...data.members } };
        delete updated.members[user.email];
        await storageSet(`team_${code}`, updated);
      }
    } catch {}
    saveMyTeams(myTeams.filter(t => t.code !== code));
    if (activeTeam?.code === code) { setActiveTeam(null); setTeamData(null); setTab("home"); }
  }

  async function openTeam(t) {
    setActiveTeam(t);
    setSuccess("");
    setErr("");
    await loadTeam(t.code);
    setTab("team");
  }

  // Auto-sync mis stats al abrir un equipo
  useEffect(() => {
    if (tab === "team" && activeTeam && storageOk && teamData) {
      // Silently update my stats
      storageGet(`team_${activeTeam.code}`).then(data => {
        if (data) {
          const updated = { ...data, members: { ...data.members, [user.email]: myStats } };
          storageSet(`team_${activeTeam.code}`, updated).then(() => setTeamData(updated));
        }
      });
    }
  }, [tab, activeTeam?.code]);

  const members = teamData ? Object.values(teamData.members) : [];
  const sorted = [...members].sort((a,b) => {
    if (rankMetric === "volume") return b.volume - a.volume;
    if (rankMetric === "sessions") return b.sessions - a.sessions;
    if (rankMetric === "prs") return b.prs - a.prs;
    return b.streak - a.streak;
  });
  const myRank = sorted.findIndex(m => m.email === user.email) + 1;
  const medals = ["🥇","🥈","🥉"];

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={e=>e.stopPropagation()} style={{ maxHeight:"88vh", overflowY:"auto" }}>
        <div className="modal-header">
          <h3 className="modal-title">👥 GymTeams</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Storage warning */}
        {!storageOk && (
          <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:10, padding:"12px 16px", marginBottom:16, fontSize:13, color:"#f87171" }}>
            ⚠️ El storage compartido no está disponible en este entorno. Los equipos solo funcionan en el artifact publicado en Claude.ai.
          </div>
        )}

        {/* Success */}
        {success && (
          <div style={{ background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.3)", borderRadius:10, padding:"12px 16px", marginBottom:16, fontSize:13, color:"#22c55e", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span>{success}</span>
            <button onClick={()=>setSuccess("")} style={{ background:"none",border:"none",color:"#22c55e",cursor:"pointer",fontSize:16 }}>✕</button>
          </div>
        )}

        {/* HOME TAB */}
        {tab === "home" && (
          <div>
            {myTeams.length > 0 && (
              <div style={{ marginBottom:24 }}>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, color:"var(--accent)", textTransform:"uppercase", marginBottom:12 }}>Mis Equipos</div>
                {myTeams.map(t => (
                  <div key={t.code} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 16px", background:"var(--input-bg)", border:"1px solid var(--border)", borderRadius:12, marginBottom:8 }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:15 }}>{t.name}</div>
                      <div style={{ fontSize:11, color:"var(--text-muted)", fontFamily:"monospace", marginTop:2 }}>
                        Código: <span style={{ color:"var(--accent)", letterSpacing:2, fontWeight:700 }}>{t.code}</span>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <button className="btn-ghost small" onClick={() => openTeam(t)}>Ver ranking →</button>
                      <button className="btn-ghost small danger" onClick={() => { if(window.confirm("¿Salir del equipo?")) leaveTeam(t.code); }}>Salir</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Instrucciones */}
            {storageOk && (
              <div style={{ background:"rgba(59,130,246,0.05)", border:"1px solid rgba(59,130,246,0.15)", borderRadius:12, padding:"14px 16px", marginBottom:16, fontSize:12, color:"var(--text-muted)", lineHeight:1.7 }}>
                <div style={{ fontWeight:700, color:"var(--accent)", marginBottom:6 }}>ℹ️ ¿Cómo funcionan los equipos?</div>
                <div>1. Crea un equipo y comparte el <b>código</b> con tus amigos</div>
                <div>2. Ellos abren este mismo artifact en Claude.ai</div>
                <div>3. Se registran, van a GymTeams y usan tu código</div>
                <div>4. ¡Compiten en el ranking en tiempo real! 🏆</div>
              </div>
            )}

            {/* Crear */}
            <div style={{ background:"var(--input-bg)", border:"1px solid var(--border)", borderRadius:12, padding:16, marginBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>🆕 Crear equipo</div>
              <div style={{ display:"flex", gap:8 }}>
                <input className="input" placeholder="Nombre del equipo..." value={createName} onChange={e=>setCreateName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&createTeam()} style={{ flex:1 }} />
                <button className="btn-primary" style={{ fontSize:14, padding:"10px 18px", whiteSpace:"nowrap" }} onClick={createTeam} disabled={loading}>{loading?"...":"Crear"}</button>
              </div>
            </div>

            {/* Unirse */}
            <div style={{ background:"var(--input-bg)", border:"1px solid var(--border)", borderRadius:12, padding:16 }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>🔗 Unirse a un equipo</div>
              <div style={{ display:"flex", gap:8 }}>
                <input className="input" placeholder="Código (ej: ABC123)" value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} onKeyDown={e=>e.key==="Enter"&&joinTeam()} style={{ flex:1, fontFamily:"monospace", letterSpacing:3, fontSize:16 }} maxLength={8} />
                <button className="btn-primary" style={{ fontSize:14, padding:"10px 18px", whiteSpace:"nowrap" }} onClick={joinTeam} disabled={loading}>{loading?"Buscando...":"Unirse"}</button>
              </div>
            </div>
            {err && <div className="err-msg" style={{ marginTop:10 }}>{err}</div>}
          </div>
        )}

        {/* TEAM RANKING TAB */}
        {tab === "team" && activeTeam && (
          <div>
            <button className="btn-ghost small" style={{ marginBottom:16 }} onClick={() => { setTab("home"); setErr(""); setSuccess(""); }}>← Volver</button>

            {/* Header del equipo */}
            <div style={{ background:"rgba(59,130,246,0.07)", border:"1px solid rgba(59,130,246,0.2)", borderRadius:14, padding:"16px 18px", marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
                <div>
                  <div style={{ fontFamily:"Barlow Condensed, sans-serif", fontSize:26, fontWeight:800 }}>{activeTeam.name}</div>
                  <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:2 }}>
                    Código para invitar: {" "}
                    <span style={{ background:"var(--accent-dim)", color:"var(--accent)", fontFamily:"monospace", fontWeight:800, letterSpacing:3, padding:"2px 10px", borderRadius:6, fontSize:14 }}>{activeTeam.code}</span>
                  </div>
                  <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:4 }}>{members.length} miembro{members.length !== 1 ? "s" : ""}</div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8, alignItems:"flex-end" }}>
                  <button className="btn-ghost small" onClick={syncStats} disabled={syncing} style={{ whiteSpace:"nowrap" }}>
                    {syncing ? "⏳ Sincronizando..." : "🔄 Actualizar mis stats"}
                  </button>
                  <button className="btn-ghost small" onClick={() => loadTeam(activeTeam.code)} disabled={loading} style={{ whiteSpace:"nowrap" }}>
                    {loading ? "⏳ Cargando..." : "↺ Refrescar ranking"}
                  </button>
                </div>
              </div>
            </div>

            {/* Mi semana snapshot */}
            <div style={{ display:"flex", gap:10, marginBottom:16 }}>
              {[
                { label:"Mis sesiones esta semana", value:weekSessions.length, icon:"📋" },
                { label:"Volumen esta semana", value:`${myWeekVol}t`, icon:"🏋️" },
                { label:"Mi posición", value: myRank > 0 ? `#${myRank}` : "—", icon:"🏆", color:"#f59e0b" },
              ].map(s => (
                <div key={s.label} style={{ flex:1, background:"var(--card)", border:"1px solid var(--border)", borderRadius:10, padding:"10px 12px", textAlign:"center" }}>
                  <div style={{ fontSize:16 }}>{s.icon}</div>
                  <div style={{ fontFamily:"Barlow Condensed, sans-serif", fontSize:22, fontWeight:800, color:s.color||"var(--text)" }}>{s.value}</div>
                  <div style={{ fontSize:10, color:"var(--text-muted)", marginTop:2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Selector métrica */}
            <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
              {[["volume","🏋️ Volumen"],["sessions","📋 Sesiones"],["prs","🏆 PRs"],["streak","🔥 Racha"]].map(([m,l])=>(
                <button key={m} className={`muscle-chip ${rankMetric===m?"active":""}`} onClick={()=>setRankMetric(m)}>{l}</button>
              ))}
            </div>

            {/* Ranking */}
            {loading && (
              <div style={{ textAlign:"center", padding:"30px 0" }}>
                <div style={{ fontSize:32, marginBottom:10 }}>⏳</div>
                <div style={{ color:"var(--text-muted)", fontSize:14 }}>Cargando ranking...</div>
              </div>
            )}

            {!loading && sorted.length === 0 && (
              <div style={{ textAlign:"center", padding:"30px 0", color:"var(--text-muted)" }}>
                <div style={{ fontSize:32, marginBottom:8 }}>👥</div>
                <p>Nadie en el equipo aún. Comparte el código <b style={{ color:"var(--accent)" }}>{activeTeam.code}</b></p>
              </div>
            )}

            {!loading && sorted.map((m, i) => {
              const isMe = m.email === user.email;
              const val = rankMetric==="volume"?`${m.volume}t`:rankMetric==="sessions"?`${m.sessions}`:rankMetric==="prs"?`${m.prs} PRs`:`${m.streak}d`;
              const valLabel = rankMetric==="volume"?"toneladas":rankMetric==="sessions"?"sesiones totales":rankMetric==="prs"?"récords":rankMetric==="streak"?"días racha":"";
              const maxVal = sorted[0] ? (rankMetric==="volume"?sorted[0].volume:rankMetric==="sessions"?sorted[0].sessions:rankMetric==="prs"?sorted[0].prs:sorted[0].streak) : 1;
              const myVal = rankMetric==="volume"?m.volume:rankMetric==="sessions"?m.sessions:rankMetric==="prs"?m.prs:m.streak;
              const pct = maxVal > 0 ? (myVal / maxVal) * 100 : 0;
              return (
                <div key={m.email} style={{ padding:"14px 16px", background: isMe?"rgba(59,130,246,0.08)":"var(--input-bg)", border:`2px solid ${isMe?"var(--accent)":"var(--border)"}`, borderRadius:14, marginBottom:10, transition:"all 0.2s" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:8 }}>
                    {/* Medalla/posición */}
                    <div style={{ width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", fontSize: i<3?26:15, fontWeight:800, flexShrink:0 }}>
                      {i < 3 ? medals[i] : <span style={{ color:"var(--text-muted)" }}>#{i+1}</span>}
                    </div>
                    {/* Avatar */}
                    <div style={{ width:38, height:38, borderRadius:"50%", background: isMe?"var(--accent)":"var(--border)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:16, color:"white", flexShrink:0 }}>
                      {m.name?.[0]?.toUpperCase()||"?"}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:14, display:"flex", alignItems:"center", gap:8 }}>
                        {m.name}
                        {isMe && <span style={{ fontSize:10, background:"var(--accent)", color:"white", borderRadius:5, padding:"1px 7px", fontWeight:700 }}>TÚ</span>}
                      </div>
                      <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:2 }}>
                        {m.sessions} ses · {m.volume}t · {m.prs} PRs · {m.streak}d racha
                      </div>
                      {m.lastUpdate && <div style={{ fontSize:10, color:"var(--text-muted)", marginTop:1 }}>Actualizado: {fmtDate(m.lastUpdate)}</div>}
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div style={{ fontFamily:"Barlow Condensed, sans-serif", fontSize:26, fontWeight:800, color: i===0?"#f59e0b":i===1?"#94a3b8":i===2?"#b45309":isMe?"var(--accent)":"var(--text)" }}>{val}</div>
                      <div style={{ fontSize:10, color:"var(--text-muted)" }}>{valLabel}</div>
                    </div>
                  </div>
                  {/* Barra de progreso */}
                  <div style={{ background:"var(--border)", borderRadius:4, height:4, overflow:"hidden" }}>
                    <div style={{ height:"100%", background: i===0?"#f59e0b":i===1?"#94a3b8":i===2?"#b45309":isMe?"var(--accent)":"#475569", width:`${pct}%`, borderRadius:4, transition:"width 0.6s ease" }} />
                  </div>
                </div>
              );
            })}

            {err && <div className="err-msg" style={{ marginTop:10 }}>{err}</div>}

            <p style={{ fontSize:11, color:"var(--text-muted)", textAlign:"center", marginTop:14, lineHeight:1.6 }}>
              💡 El ranking usa los stats del momento en que cada miembro sincronizó.<br/>
              Pulsa "Actualizar mis stats" para que tu posición se refleje.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────
function LoginScreen() {
  const { loginWithFirebase, registerWithFirebase, loginAsGuest, resetPassword } = useAuth();
  const [mode, setMode] = useState("login"); // login | register | forgot
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setErr(""); setMsg("");
    if (mode === "forgot") {
      if (!email) { setErr("Ingresa tu email"); return; }
      setLoading(true);
      const result = await resetPassword(email);
      setLoading(false);
      if (result.ok) setMsg("✅ Revisa tu correo para restablecer la contraseña.");
      else setErr(result.msg);
      return;
    }
    if (!email || !pass) { setErr("Completa todos los campos"); return; }
    if (mode === "register") {
      if (!name.trim()) { setErr("Ingresa tu nombre"); return; }
      const passErrors = validatePassword(pass);
      if (passErrors.length > 0) { setErr("La contraseña no cumple los requisitos"); return; }
      if (pass !== confirmPass) { setErr("Las contraseñas no coinciden"); return; }
      setLoading(true);
      const result = await registerWithFirebase(name.trim(), email, pass);
      setLoading(false);
      if (!result.ok) setErr(result.msg);
    } else {
      setLoading(true);
      const result = await loginWithFirebase(email, pass);
      setLoading(false);
      if (!result.ok) setErr(result.msg);
    }
  }

  function switchMode(m) { setMode(m); setErr(""); setMsg(""); }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">
          <span style={{ fontSize: 36 }}>⚡</span>
          <span className="logo-text">GymTracker</span>
        </div>
        <p className="text-muted" style={{ marginBottom: 20, fontSize: 14 }}>
          Tu entrenamiento. Tu progreso.
        </p>

        {mode !== "forgot" && (
          <div className="tab-row" style={{ marginBottom: 20 }}>
            <button className={`tab-btn ${mode === "login" ? "active" : ""}`} onClick={() => switchMode("login")}>Iniciar sesión</button>
            <button className={`tab-btn ${mode === "register" ? "active" : ""}`} onClick={() => switchMode("register")}>Registrarse</button>
          </div>
        )}

        {mode === "forgot" && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "Barlow Condensed,sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
              🔑 Recuperar contraseña
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Te enviaremos un enlace para restablecer tu contraseña.
            </p>
          </div>
        )}

        {mode === "register" && (
          <div className="field">
            <label className="field-label">Nombre</label>
            <input className="input" placeholder="Tu nombre" value={name} onChange={e => setName(e.target.value)} />
          </div>
        )}

        <div className="field">
          <label className="field-label">Email</label>
          <input className="input" type="email" placeholder="email@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
        </div>

        {mode !== "forgot" && (
          <div className="field">
            <label className="field-label">Contraseña</label>
            <div style={{ position: "relative" }}>
              <input
                className="input"
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={pass}
                onChange={e => setPass(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !confirmPass && submit()}
                style={{ paddingRight: 44 }}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
              <button onClick={() => setShowPass(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--text-muted)" }}>
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>
            {mode === "register" && <PasswordStrengthBar password={pass} />}
          </div>
        )}

        {mode === "register" && (
          <>
            <div className="field">
              <label className="field-label">Confirmar contraseña</label>
              <input
                className="input"
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submit()}
                autoComplete="new-password"
              />
              {confirmPass && pass !== confirmPass && (
                <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>Las contraseñas no coinciden</div>
              )}
            </div>
            <div style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 12, lineHeight: 1.8 }}>
              <div style={{ fontWeight: 700, color: "var(--accent)", marginBottom: 4 }}>🔒 Requisitos:</div>
              {[
                ["Mínimo 8 caracteres",        pass.length >= 8],
                ["Al menos una mayúscula (A-Z)", /[A-Z]/.test(pass)],
                ["Al menos un número (0-9)",    /[0-9]/.test(pass)],
                ["Al menos un símbolo (!@#$%...)", /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass)],
              ].map(([req, ok]) => (
                <div key={req} style={{ color: ok ? "#22c55e" : "var(--text-muted)", display: "flex", gap: 6 }}>
                  <span>{ok ? "✓" : "○"}</span> {req}
                </div>
              ))}
            </div>
          </>
        )}

        {err && <div className="err-msg">{err}</div>}
        {msg && (
          <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e", borderRadius: 8, padding: "9px 12px", fontSize: 13, marginBottom: 10 }}>
            {msg}
          </div>
        )}

        <button className="btn-primary" style={{ width: "100%", marginTop: 8 }} onClick={submit} disabled={loading}>
          {loading ? "⏳ Cargando..." : mode === "login" ? "Entrar" : mode === "register" ? "Crear cuenta" : "Enviar enlace"}
        </button>

        {mode === "login" && (
          <p style={{ textAlign: "center", marginTop: 10, fontSize: 13 }}>
            <button className="link-btn" onClick={() => switchMode("forgot")} style={{ color: "var(--text-muted)" }}>
              ¿Olvidaste tu contraseña?
            </button>
          </p>
        )}
        {mode === "forgot" && (
          <p style={{ textAlign: "center", marginTop: 10, fontSize: 13 }}>
            <button className="link-btn" onClick={() => switchMode("login")}>← Volver al inicio de sesión</button>
          </p>
        )}
        {mode !== "forgot" && (
          <p className="text-muted" style={{ fontSize: 13, textAlign: "center", marginTop: 14 }}>
            {mode === "login" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
            <button className="link-btn" onClick={() => switchMode(mode === "login" ? "register" : "login")}>
              {mode === "login" ? "Regístrate" : "Inicia sesión"}
            </button>
          </p>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0 16px" }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>O</span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>
        <button className="btn-guest" onClick={loginAsGuest}>
          <span style={{ fontSize: 18 }}>👤</span>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Entrar como invitado</div>
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 1 }}>3 sesiones · Sin historial guardado</div>
          </div>
        </button>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ sessions, bodyStats, weeklyGoal, onGoalClick, onBadgesClick }) {
  const total = sessions.length;
  const thisWeek = sessions.filter(s => (new Date() - new Date(s.date + "T00:00:00")) / 86400000 <= 7).length;
  const exCount = {};
  sessions.forEach(s => (s.exercises || []).forEach(ex => { exCount[ex.name] = (exCount[ex.name] || 0) + 1; }));
  const topEx = Object.entries(exCount).sort((a, b) => b[1] - a[1])[0];
  const wCount = {};
  sessions.forEach(s => { wCount[s.workout] = (wCount[s.workout] || 0) + 1; });
  const topW = Object.entries(wCount).sort((a, b) => b[1] - a[1])[0];
  const totalVol = sessions.reduce((acc, s) => acc + (s.exercises || []).reduce((a, ex) => a + (parseFloat(ex.weight) || 0) * (parseFloat(ex.reps) || 1), 0), 0);
  const streak = getStreak(sessions);
  const prs = getPRs(sessions);
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
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 20, flexWrap:"wrap", gap:8 }}>
        <div className="section-title" style={{ margin:0 }}>Dashboard</div>
        <div style={{ display:"flex", gap:8 }}>
          {weeklyGoal?.target > 0 && (() => { const tw = sessions.filter(s=>(new Date()-new Date(s.date+"T00:00:00"))/86400000<=7).length; const done=tw>=weeklyGoal.target; return <button onClick={onGoalClick} style={{ background:done?"rgba(34,197,94,0.1)":"rgba(59,130,246,0.08)", border:`1px solid ${done?"rgba(34,197,94,0.35)":"rgba(59,130,246,0.25)"}`, color:done?"#22c55e":"var(--accent)", borderRadius:10, padding:"6px 12px", fontFamily:"Barlow, sans-serif", fontSize:12, fontWeight:700, cursor:"pointer" }}>🎯 {tw}/{weeklyGoal.target}</button>; })()}
          <button onClick={onBadgesClick} style={{ background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.35)", color:"#f59e0b", borderRadius:10, padding:"6px 12px", fontFamily:"Barlow, sans-serif", fontSize:12, fontWeight:700, cursor:"pointer" }}>🏅 {BADGE_DEFS.filter(b=>b.check(sessions,getPRs(sessions))).length}/{BADGE_DEFS.length}</button>
        </div>
      </div>
      <div className="stats-grid" style={{ marginBottom: 28 }}>
        {stats.map((s, i) => (
          <div key={s.label} className="stat-card" style={{ animationDelay: `${i * 0.07}s` }}>
            <span style={{ fontSize: 26 }}>{s.icon}</span>
            <span className="stat-value">{s.value}</span>
            <span className="text-muted" style={{ fontSize: 11 }}>{s.label}</span>
          </div>
        ))}
      </div>
      <WeeklyChart sessions={sessions} />
      <ProgressPrediction sessions={sessions} />
      <MuscleBalance sessions={sessions} />
      {topPRs.length > 0 && (
        <div className="card">
          <div className="card-label">🏆 Top Récords Personales (1RM estimado)</div>
          {topPRs.map(([name, data], i) => (
            <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < topPRs.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", background: i===0?"#f59e0b":i===1?"#94a3b8":i===2?"#b45309":"var(--border)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color:"white", flexShrink:0 }}>{i+1}</span>
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
function SessionCard({ s, unit, onDelete, onEdit, onDuplicate, onShare, onProgress, getProgressData, expanded, onToggle, allSessions }) {
  const u = s.unit || unit;
  const prs = new Set();
  (s.exercises || []).forEach(ex => {
    const sessWeight = ex.sets?.length > 0 ? Math.max(...ex.sets.map(st => parseFloat(st.weight) || 0)) : parseFloat(ex.weight) || 0;
    const sessReps = ex.sets?.length > 0 ? Math.max(...ex.sets.map(st => parseFloat(st.reps) || 0)) : parseFloat(ex.reps) || 0;
    const sess1RM = calc1RM(sessWeight, sessReps);
    const prevBest = allSessions.filter(ps => ps.date < s.date).flatMap(ps => (ps.exercises || []).filter(pe => pe.name === ex.name)).reduce((best, pe) => {
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
            <button className="btn-ghost" onClick={() => onShare(s)}>📸 Compartir</button>
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
  const { user, logout } = useAuth();

  const [sessions, setSessions] = useState([]);
const [sessionsLoading, setSessionsLoading] = useState(true);

useEffect(() => {
  if (user.isGuest) {
    setSessions(load("gym_v3_guest", []));
    setSessionsLoading(false);
    return;
  }
  getDoc(doc(db, "sessions", user.uid)).then(snap => {
    setSessions(snap.exists() ? (snap.data().list || []) : []);
    setSessionsLoading(false);
  });
}, [user.uid]);

const [unit, setUnit] = useState(() => load("gym_unit", "kg"));
const [activeTab, setActiveTab] = useState("new");
const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const bodyKey = `gym_body_${user.email}`;
  const [bodyStats, setBodyStats] = useState(() => load(bodyKey, { height: null, entries: [] }));
  const [showBodyStats, setShowBodyStats] = useState(false);

  const plannerKey = `gym_planner_${user.email}`;
  const [weeklyPlan, setWeeklyPlan] = useState(() => load(plannerKey, { mode: "weekly", weekly: {}, cycle: [], cyclePos: 0 }));
  const [showPlanner, setShowPlanner] = useState(false);
  const goalKey = `gym_goal_${user.email}`;
  const [weeklyGoal, setWeeklyGoal] = useState(() => load(goalKey, { target: 4 }));

  const [date, setDate] = useState(todayStr());
  const [workout, setWorkout] = useState("");
  const [notes, setNotes] = useState("");
  const [currentExercises, setCurrentExercises] = useState([]);
  const [exName, setExName] = useState("");
  const [exMuscle, setExMuscle] = useState("Todos");
  const [exCustom, setExCustom] = useState("");
  const [exWeight, setExWeight] = useState("");
  const [exReps, setExReps] = useState("");
  const [exSets, setExSets] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [expanded, setExpanded] = useState(null);
  const [filterWorkout, setFilterWorkout] = useState("");
  const [showPresets, setShowPresets] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [progressEx, setProgressEx] = useState(null);
  const [showTimer, setShowTimer] = useState(false);
  const [showOneRM, setShowOneRM] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [showMuscleMap, setShowMuscleMap] = useState(false);
  const [showActiveWorkout, setShowActiveWorkout] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showWeeklyGoal, setShowWeeklyGoal] = useState(false);
  const [showTeams, setShowTeams] = useState(false);
  const [shareSession, setShareSession] = useState(null);
  const [toast, setToast] = useState(null);
  const presetRef = useRef();

  useEffect(() => {
  if (sessionsLoading) return;
  if (user.isGuest) { store("gym_v3_guest", sessions); return; }
  setDoc(doc(db, "sessions", user.uid), { list: sessions, updatedAt: serverTimestamp() });
}, [sessions]);
  useEffect(() => { store("gym_unit", unit); }, [unit]);
  useEffect(() => { store(bodyKey, bodyStats); }, [bodyStats]);
  useEffect(() => { store(plannerKey, weeklyPlan); }, [weeklyPlan]);
  useEffect(() => { store(goalKey, weeklyGoal); }, [weeklyGoal]);
  useEffect(() => {
    const handle = (e) => { if (presetRef.current && !presetRef.current.contains(e.target)) setShowPresets(false); };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const isGuest = user.isGuest;
  const canAdd = isGuest ? sessions.length < 3 : true;

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2600); }

  const todayDow = (new Date().getDay() + 6) % 7;
  const todayPlanned = weeklyPlan.mode === "weekly" ? weeklyPlan.weekly?.[todayDow] || "" : weeklyPlan.cycle?.[weeklyPlan.cyclePos]?.name || "";

  function addSet() {
    if (!exReps) return;
    setExSets(prev => [...prev, { id: uid(), weight: exWeight, reps: exReps }]);
    setExWeight(""); setExReps("");
  }

  function addExercise() {
    const finalName = exName === "__custom__" ? exCustom : exName;
    if (!finalName) return;
    const sets = exSets.length > 0 ? exSets : (exWeight || exReps ? [{ id: uid(), weight: exWeight, reps: exReps }] : []);
    setCurrentExercises(prev => [...prev, { id: uid(), name: finalName, sets, weight: exWeight, reps: exReps }]);
    setExName(""); setExCustom(""); setExWeight(""); setExReps(""); setExSets([]);
  }

  function applyPreset(name) {
    setWorkout(name);
    setCurrentExercises(PRESETS[name].map(n => ({ id: uid(), name: n, sets: [], weight: "", reps: "" })));
    setShowPresets(false);
    showToast(`Rutina "${name}" cargada`);
  }

  function saveSession() {
    if (!date || !workout) { showToast("⚠️ Faltan fecha o tipo de entrenamiento"); return; }
    if (currentExercises.length === 0) { showToast("⚠️ Agrega al menos un ejercicio"); return; }
    if (!canAdd && !editingId) { showToast("⚠️ Límite de sesiones alcanzado"); return; }
    if (editingId) {
      setSessions(prev => prev.map(s => s.id === editingId ? { ...s, date, workout, notes, exercises: currentExercises } : s));
      setEditingId(null); showToast("✅ Sesión actualizada");
    } else {
      setSessions(prev => [{ id: uid(), date, workout, notes, exercises: currentExercises, unit }, ...prev]);
      showToast("✅ Sesión guardada");
      if (weeklyPlan.mode === "cycle" && weeklyPlan.cycle?.length > 0) {
        setWeeklyPlan(p => ({ ...p, cyclePos: (p.cyclePos + 1) % p.cycle.length }));
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
    showToast("📋 Sesión duplicada");
  }

  function deleteSession(id) { setSessions(prev => prev.filter(s => s.id !== id)); showToast("🗑️ Eliminada"); }

  function exportJSON() {
    if (isGuest) { showToast("⚠️ No disponible en modo invitado"); return; }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(sessions, null, 2)], { type: "application/json" }));
    a.download = `gym_${todayStr()}.json`; a.click(); showToast("📦 JSON exportado");
  }

  function exportCSV() {
    if (isGuest) { showToast("⚠️ No disponible en modo invitado"); return; }
    const rows = [["Fecha","Entrenamiento","Ejercicio","Series","Peso","Reps","Notas"]];
    sessions.forEach(s => (s.exercises?.length ? s.exercises : [{ name:"", sets:[], weight:"", reps:"" }]).forEach(ex =>
      rows.push([s.date, s.workout, ex.name, ex.sets?.length||0, ex.weight||"", ex.reps||"", s.notes||""])
    ));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.map(r=>r.map(c=>`"${c}"`).join(",")).join("\n")], { type:"text/csv" }));
    a.download = `gym_${todayStr()}.csv`; a.click(); showToast("📊 CSV exportado");
  }

  function getProgressData(name) {
    return sessions.flatMap(s => (s.exercises||[]).filter(ex=>ex.name.toLowerCase()===name.toLowerCase()).map(ex=>({ date:s.date, weight:parseFloat(ex.weight)||0 }))).sort((a,b)=>a.date.localeCompare(b.date));
  }

  const filtered = sessions.filter(s => !filterWorkout || s.workout.toLowerCase().includes(filterWorkout.toLowerCase()));
  const prsForBadge = getPRs(sessions);
  const earnedBadges = BADGE_DEFS.filter(b => b.check(sessions, prsForBadge)).length;

  const NAV = [
    { id: "new", icon: "➕", label: "Nueva sesión" },
    { id: "history", icon: "📋", label: "Historial" },
    { id: "dashboard", icon: "📊", label: "Dashboard" },
  ];
  const navClick = (id) => { setActiveTab(id); setMobileNavOpen(false); };

  const sidebarTools = [
    { icon: "📅", label: "Planificador", action: () => setShowPlanner(true) },
    { icon: "⚖️", label: "Peso & Estatura", action: () => setShowBodyStats(true) },
    { icon: "⏱️", label: "Timer descanso", action: () => setShowTimer(true) },
    { icon: "🧮", label: "Calc. 1RM", action: () => setShowOneRM(true) },
    { icon: "🏅", label: `Logros (${earnedBadges})`, action: () => setShowBadges(true) },
    { icon: "💪", label: "Mapa muscular", action: () => setShowMuscleMap(true) },
    { icon: "📋", label: "Plantillas", action: () => setShowTemplates(true) },
    { icon: "🎯", label: "Meta semanal", action: () => setShowWeeklyGoal(true) },
    { icon: "👥", label: "GymTeams", action: () => setShowTeams(true) },
  ];

  return (
    <div className="app-layout">
      {/* Desktop Sidebar */}
      <aside className="sidebar desktop-only">
        <div className="sidebar-top">
          <div className="sidebar-logo"><span style={{ fontSize: 20 }}>⚡</span><span className="logo-text">GymTracker</span></div>
        </div>
        {todayPlanned && (
          <div style={{ margin: "0 12px 12px", padding: "10px 12px", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 10 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: "var(--accent)", textTransform: "uppercase", marginBottom: 3 }}>Hoy toca</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{todayPlanned}</div>
          </div>
        )}
        <nav className="sidebar-nav">
          {NAV.map(item => (
            <button key={item.id} className={`nav-item ${activeTab === item.id ? "active" : ""}`} onClick={() => navClick(item.id)}>
              <span className="nav-icon">{item.icon}</span><span className="nav-label">{item.label}</span>
            </button>
          ))}
          <div style={{ height: 1, background: "var(--border)", margin: "8px 12px" }} />
          {sidebarTools.map(t => (
            <button key={t.label} className="nav-item" onClick={t.action}>
              <span className="nav-icon">{t.icon}</span><span className="nav-label">{t.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="user-card">
            <div className="user-avatar">{user.name?.[0]?.toUpperCase() || "U"}</div>
            <div style={{ minWidth: 0 }}>
              <div className="user-name">{user.name}</div>
              {isGuest ? <span style={{ fontSize:11, color:"#f59e0b" }}>Invitado</span> : <span style={{ fontSize:11, color:"var(--accent)", fontWeight:700 }}>✓ Cuenta activa</span>}
            </div>
          </div>
          <button className="nav-item" onClick={logout}><span className="nav-icon">🚪</span><span className="nav-label">Salir</span></button>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        <div className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="hamburger mobile-only" onClick={() => setMobileNavOpen(v => !v)}><span /><span /><span /></button>
            <h1 className="page-title">{activeTab === "new" ? (editingId ? "✏️ Editar" : `👋 Hola, ${user.name.split(" ")[0]}!`) : activeTab === "history" ? "📋 Historial" : "📊 Dashboard"}</h1>
          </div>
          <div className="topbar-actions">
            <button className="topbar-btn" onClick={toggleDark}><span className="topbar-btn-icon">{dark ? "☀️" : "🌙"}</span><span className="topbar-btn-label">{dark ? "Claro" : "Oscuro"}</span></button>
            <button className="topbar-btn" onClick={() => setUnit(u => u === "kg" ? "lbs" : "kg")}><span className="topbar-btn-icon">⚖️</span><span className="topbar-btn-label">{unit}</span></button>
            <button className="topbar-btn desktop-only" onClick={exportJSON}><span className="topbar-btn-icon">📦</span><span className="topbar-btn-label">JSON</span></button>
            <button className="topbar-btn desktop-only" onClick={exportCSV}><span className="topbar-btn-icon">📊</span><span className="topbar-btn-label">CSV</span></button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileNavOpen && (
          <div className="mobile-drawer-overlay" onClick={() => setMobileNavOpen(false)}>
            <div className="mobile-drawer" onClick={e => e.stopPropagation()}>
              <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 20 }}>⚡</span><span className="logo-text">GymTracker</span></div>
                <button className="close-btn" onClick={() => setMobileNavOpen(false)}>✕</button>
              </div>
              <nav style={{ padding: "12px 8px", flex: 1, overflowY:"auto" }}>
                {NAV.map(item => <button key={item.id} className={`nav-item ${activeTab === item.id ? "active" : ""}`} style={{ marginBottom: 2 }} onClick={() => navClick(item.id)}><span className="nav-icon">{item.icon}</span><span className="nav-label">{item.label}</span></button>)}
                <div style={{ height: 1, background: "var(--border)", margin: "8px 12px" }} />
                {sidebarTools.map(t => <button key={t.label} className="nav-item" style={{ marginBottom: 2 }} onClick={() => { t.action(); setMobileNavOpen(false); }}><span className="nav-icon">{t.icon}</span><span className="nav-label">{t.label}</span></button>)}
                <button className="nav-item" style={{ marginBottom: 2 }} onClick={() => { exportJSON(); setMobileNavOpen(false); }}><span className="nav-icon">📦</span><span className="nav-label">Exportar JSON</span></button>
                <button className="nav-item" style={{ marginBottom: 2 }} onClick={() => { exportCSV(); setMobileNavOpen(false); }}><span className="nav-icon">📊</span><span className="nav-label">Exportar CSV</span></button>
              </nav>
              <div style={{ padding: "12px 8px", borderTop: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 4 }}>
                  <div className="user-avatar">{user.name?.[0]?.toUpperCase() || "U"}</div>
                  <div><div className="user-name">{user.name}</div>{isGuest ? <span style={{ fontSize:11,color:"#f59e0b" }}>Invitado</span> : <span style={{ fontSize:11,color:"var(--accent)",fontWeight:700 }}>✓ Cuenta activa</span>}</div>
                </div>
                <button className="nav-item" onClick={logout}><span className="nav-icon">🚪</span><span className="nav-label">Salir</span></button>
              </div>
            </div>
          </div>
        )}

        {/* Nueva sesión */}
        {activeTab === "new" && (
          <div className="content-area fade-in">
            {todayPlanned && !editingId && (
              <div style={{ background:"rgba(59,130,246,0.08)", border:"1px solid rgba(59,130,246,0.25)", borderRadius:12, padding:"12px 18px", marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
                <span style={{ fontSize:14 }}>📅 Hoy toca: <b>{todayPlanned}</b></span>
                <button className="btn-ghost small" onClick={() => setWorkout(todayPlanned)}>Usar →</button>
              </div>
            )}
            {currentExercises.length > 0 && !editingId && (
              <button onClick={() => setShowActiveWorkout(true)} style={{ width:"100%", background:"linear-gradient(135deg,#22c55e,#16a34a)", border:"none", color:"white", borderRadius:12, padding:"14px", fontFamily:"Barlow Condensed, sans-serif", fontSize:20, fontWeight:800, letterSpacing:1, cursor:"pointer", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
                ⚡ MODO ENTRENAMIENTO ACTIVO
              </button>
            )}
            {weeklyGoal?.target > 0 && !editingId && (() => {
              const tw = sessions.filter(s=>(new Date()-new Date(s.date+"T00:00:00"))/86400000<=7).length;
              const pct = Math.min(tw/weeklyGoal.target,1); const done=pct>=1;
              return (
                <div onClick={()=>setShowWeeklyGoal(true)} style={{ cursor:"pointer", background:done?"rgba(34,197,94,0.08)":"rgba(59,130,246,0.06)", border:`1px solid ${done?"rgba(34,197,94,0.3)":"rgba(59,130,246,0.2)"}`, borderRadius:12, padding:"10px 16px", marginBottom:16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:6 }}>
                    <span style={{ fontWeight:600 }}>🎯 Meta semanal {done?"✅":""}</span>
                    <span style={{ color:"var(--text-muted)" }}>{tw}/{weeklyGoal.target} sesiones</span>
                  </div>
                  <div style={{ background:"var(--border)", borderRadius:20, height:6, overflow:"hidden" }}>
                    <div style={{ height:"100%", background:done?"#22c55e":"var(--accent)", width:`${pct*100}%`, borderRadius:20, transition:"width 0.5s" }} />
                  </div>
                </div>
              );
            })()}
            {isGuest && <div className="guest-banner"><span>👤 Modo invitado — máx. 3 sesiones.</span><button className="link-btn" onClick={logout} style={{ color:"#f59e0b", marginLeft:8 }}>Crear cuenta gratis →</button></div>}

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
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18, flexWrap:"wrap", gap:8 }}>
                <div className="card-label" style={{ margin:0 }}>Ejercicios</div>
              </div>
              <div style={{ marginBottom:10 }}>
                <div className="field-label" style={{ marginBottom:6 }}>Músculo</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {["Todos",...MUSCLES].map(m=><button key={m} className={`muscle-chip ${exMuscle===m?"active":""}`} onClick={()=>{setExMuscle(m);setExName("");}}>{m}</button>)}
                </div>
              </div>
              <div className="form-row" style={{ alignItems:"flex-end" }}>
                <div className="field" style={{ flex:2 }}>
                  <label className="field-label">Ejercicio</label>
                  <select className="input" value={exName} onChange={e=>setExName(e.target.value)}>
                    <option value="">— Selecciona —</option>
                    {(exMuscle==="Todos"?EXERCISE_DB:EXERCISE_DB.filter(e=>e.muscle===exMuscle)).map(ex=><option key={ex.name} value={ex.name}>{ex.name}{ex.machine?" 🔧":""}</option>)}
                    <option value="__custom__">✏️ Personalizado...</option>
                  </select>
                  {exName==="__custom__" && <input className="input" style={{ marginTop:6 }} placeholder="Nombre..." value={exCustom} onChange={e=>setExCustom(lettersOnly(e.target.value))} autoFocus />}
                </div>
                <div className="field"><label className="field-label">Peso ({unit})</label><input placeholder="0" value={exWeight} onChange={e=>setExWeight(numDot(e.target.value))} className="input" /></div>
                <div className="field"><label className="field-label">Reps</label><input placeholder="0" value={exReps} onChange={e=>setExReps(numDot(e.target.value))} className="input" /></div>
                <button className="btn-ghost" style={{ alignSelf:"flex-end", padding:"10px 14px", whiteSpace:"nowrap" }} onClick={addSet}>+ Set</button>
              </div>
              {(exName && exName!=="__custom__" || exCustom) && exWeight && exReps && (
                <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:-8, marginBottom:8 }}>1RM estimado: <b style={{ color:"var(--accent)" }}>{calc1RM(exWeight,exReps)} kg</b></div>
              )}
              {exSets.length>0 && <div className="sets-row">{exSets.map((s,i)=><span key={s.id} className="set-chip">S{i+1}: {s.weight}{unit}×{s.reps}<button className="chip-del" onClick={()=>setExSets(prev=>prev.filter(x=>x.id!==s.id))}>×</button></span>)}</div>}
              <button className="btn-add-ex" onClick={addExercise}>+ Agregar ejercicio</button>
              {currentExercises.length>0 && (
                <div className="ex-list">
                  {currentExercises.map(ex=>(
                    <div key={ex.id} className="ex-row">
                      <div style={{ flex:1, minWidth:0 }}>
                        <span className="ex-name">{ex.name}</span>
                        {ex.sets?.length>0?<><span className="sets-badge">{ex.sets.length} series</span><span className="ex-detail"> {ex.sets.map((s,i)=>`S${i+1}: ${s.weight}${unit}×${s.reps}`).join(" · ")}</span></>:ex.weight?<span className="ex-detail"> — {ex.weight}{unit} × {ex.reps}</span>:null}
                      </div>
                      <button className="chip-del" style={{ fontSize:16, flexShrink:0 }} onClick={()=>setCurrentExercises(prev=>prev.filter(e=>e.id!==ex.id))}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display:"flex", gap:10 }}>
              <button className="btn-primary" style={{ flex:1 }} onClick={saveSession}>💾 {editingId?"Actualizar":"Guardar"}</button>
              {editingId && <button className="btn-ghost" onClick={()=>{setEditingId(null);setDate(todayStr());setWorkout("");setNotes("");setCurrentExercises([]);}}>Cancelar</button>}
            </div>
          </div>
        )}

        {/* Historial */}
        {activeTab === "history" && (
          <div className="content-area fade-in">
            <input className="input" style={{ marginBottom:20 }} placeholder="Filtrar por entrenamiento…" value={filterWorkout} onChange={e=>setFilterWorkout(e.target.value)} />
            {filtered.length===0
              ? <div className="empty-state"><div style={{ fontSize:48, marginBottom:12 }}>🏋️</div><p className="text-muted">Sin sesiones aún. ¡A entrenar!</p></div>
              : filtered.map(s=><SessionCard key={s.id} s={s} unit={unit} onDelete={deleteSession} onEdit={startEdit} onDuplicate={duplicate} onShare={setShareSession} onProgress={setProgressEx} getProgressData={getProgressData} expanded={expanded===s.id} onToggle={()=>setExpanded(expanded===s.id?null:s.id)} allSessions={sessions} />)
            }
          </div>
        )}

        {/* Dashboard */}
        {activeTab === "dashboard" && (
          <div className="content-area fade-in"><Dashboard sessions={sessions} bodyStats={bodyStats} weeklyGoal={weeklyGoal} onGoalClick={()=>setShowWeeklyGoal(true)} onBadgesClick={()=>setShowBadges(true)} /></div>
        )}
      </main>

      {/* Mobile bottom nav */}
      <nav className="mobile-bottom-nav mobile-only">
        {NAV.map(item=><button key={item.id} className={`mobile-nav-btn ${activeTab===item.id?"active":""}`} onClick={()=>navClick(item.id)}><span style={{ fontSize:20 }}>{item.icon}</span><span style={{ fontSize:10, fontWeight:600 }}>{item.label}</span></button>)}
        <button className="mobile-nav-btn" onClick={()=>setMobileNavOpen(true)}><span style={{ fontSize:20 }}>☰</span><span style={{ fontSize:10, fontWeight:600 }}>Más</span></button>
      </nav>

      {showActiveWorkout && currentExercises.length>0 && <ActiveWorkoutModal exercises={currentExercises} unit={unit} onClose={()=>setShowActiveWorkout(false)} onSave={(exData)=>{setCurrentExercises(exData.map(ex=>({...ex,sets:ex.sets.filter(s=>s.done||s.weight||s.reps)})));setShowActiveWorkout(false);showToast("✅ Datos actualizados");}} />}
      {showBadges && <BadgesModal sessions={sessions} onClose={()=>setShowBadges(false)} />}
      {showTemplates && <TemplatesModal sessions={sessions} onLoad={(workout,exercises)=>{setWorkout(workout);setCurrentExercises(exercises.map(e=>({...e,id:uid()})));setActiveTab("new");}} onClose={()=>setShowTemplates(false)} />}
      {showWeeklyGoal && <WeeklyGoalModal goal={weeklyGoal} onSave={setWeeklyGoal} onClose={()=>setShowWeeklyGoal(false)} sessions={sessions} />}
      {showTeams && <TeamsModal user={user} sessions={sessions} onClose={()=>setShowTeams(false)} />}
      {shareSession && <ShareCardModal session={shareSession} user={user} unit={unit} onClose={()=>setShareSession(null)} />}
      {showMuscleMap && <MuscleMapModal sessions={sessions} onClose={()=>setShowMuscleMap(false)} />}
      {progressEx && <ProgressModal exName={progressEx} sessions={sessions} onClose={()=>setProgressEx(null)} />}
      {showLibrary && <ExerciseLibrary onSelect={name=>{setExName(name);setExCustom("");}} onClose={()=>setShowLibrary(false)} />}
      {showTimer && <RestTimer onClose={()=>setShowTimer(false)} />}
      {showOneRM && <OneRMModal onClose={()=>setShowOneRM(false)} />}
      {showBodyStats && <BodyStatsModal stats={bodyStats} onSave={setBodyStats} onClose={()=>setShowBodyStats(false)} />}
      {showPlanner && <WeeklyPlannerModal plan={weeklyPlan} onSave={setWeeklyPlan} onClose={()=>setShowPlanner(false)} sessions={sessions} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [dark, setDark] = useState(() => load("gym_dark", true));
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("gym_dark");
    if (saved === null) setDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);
  useEffect(() => { document.body.setAttribute("data-theme", dark ? "dark" : "light"); }, [dark]);
  useEffect(() => { store("gym_dark", dark); }, [dark]);

  // Firebase escucha cambios de sesión automáticamente
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        let profile = null;
        try {
          const snap = await getDoc(doc(db, "users", firebaseUser.uid));
          profile = snap.exists() ? snap.data() : null;
        } catch {}
        if (!profile) {
          profile = { uid: firebaseUser.uid, name: firebaseUser.displayName || firebaseUser.email.split("@")[0], email: firebaseUser.email, plan: "free" };
          try { await setDoc(doc(db, "users", firebaseUser.uid), profile, { merge: true }); } catch {}
        }
        setCurrentUser({
          uid: firebaseUser.uid,
          name: profile.name || firebaseUser.displayName || firebaseUser.email.split("@")[0],
          email: firebaseUser.email,
          plan: "free",
        });
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  const toggleDark = () => setDark(d => !d);

  async function loginWithFirebase(email, pass) {
    try { await signInWithEmailAndPassword(auth, email, pass); return { ok: true }; }
    catch (e) { return { ok: false, msg: firebaseErrMsg(e.code) }; }
  }

  async function registerWithFirebase(name, email, pass) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(cred.user, { displayName: name });
      await setDoc(doc(db, "users", cred.user.uid), { uid: cred.user.uid, name, email, plan: "free" }, { merge: true });
      return { ok: true };
    } catch (e) { return { ok: false, msg: firebaseErrMsg(e.code) }; }
  }

  async function resetPassword(email) {
    try { await sendPasswordResetEmail(auth, email); return { ok: true }; }
    catch (e) { return { ok: false, msg: firebaseErrMsg(e.code) }; }
  }

  function loginAsGuest() {
    setCurrentUser({ uid: "guest", name: "Invitado", email: "__guest__", plan: "guest", isGuest: true });
    setAuthLoading(false);
  }

  async function logout() {
    if (currentUser?.isGuest) { setCurrentUser(null); return; }
    await signOut(auth);
    setCurrentUser(null);
  }

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#080f1a", flexDirection: "column", gap: 16 }}>
        <div style={{ fontFamily: "Barlow Condensed,sans-serif", fontSize: 32, fontWeight: 800, color: "#3b82f6", letterSpacing: 2 }}>⚡ GymTracker</div>
        <div style={{ color: "#4a6080", fontSize: 14 }}>Iniciando...</div>
      </div>
    );
  }

  return (
    <ThemeCtx.Provider value={{ dark, toggleDark }}>
      <AuthCtx.Provider value={{ user: currentUser, loginWithFirebase, registerWithFirebase, logout, loginAsGuest, resetPassword }}>
        <style>{CSS}</style>
        {!currentUser ? <LoginScreen /> : <GymApp />}
      </AuthCtx.Provider>
    </ThemeCtx.Provider>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@300;400;500;600&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body[data-theme="dark"] { --bg:#080f1a; --surface:#0c1524; --card:#0f1c2e; --border:#1a2d45; --accent:#3b82f6; --accent-dim:#1a2f52; --text:#e2e8f0; --text-muted:#4a6080; --danger:#ef4444; --sidebar-bg:#060d18; --input-bg:#070e1a; --shadow:0 4px 24px rgba(0,0,0,0.5); }
body[data-theme="light"] { --bg:#f0f4f8; --surface:#ffffff; --card:#ffffff; --border:#d1dce8; --accent:#2563eb; --accent-dim:#dbeafe; --text:#0f172a; --text-muted:#64748b; --danger:#dc2626; --sidebar-bg:#0f172a; --input-bg:#f8fafc; --shadow:0 4px 24px rgba(0,0,0,0.08); }
body { font-family:'Barlow',sans-serif; background:var(--bg); color:var(--text); transition:background 0.3s,color 0.3s; }
.app-layout { display:flex; min-height:100vh; }
.main-content { flex:1; display:flex; flex-direction:column; min-height:100vh; background:var(--bg); min-width:0; margin-left:240px; }
.sidebar { position:fixed; top:0; left:0; height:100vh; width:240px; background:var(--sidebar-bg); border-right:1px solid #0f2040; display:flex; flex-direction:column; padding:20px 0; z-index:100; overflow-y:auto; overflow-x:hidden; }
.sidebar-top { display:flex; align-items:center; padding:0 14px 20px; border-bottom:1px solid #0f2040; margin-bottom:12px; }
.sidebar-logo { display:flex; align-items:center; gap:10px; }
.logo-text { font-family:'Barlow Condensed',sans-serif; font-weight:800; font-size:22px; letter-spacing:2px; color:#e2e8f0; }
.sidebar-nav { flex:1; padding:0 8px; display:flex; flex-direction:column; gap:3px; }
.sidebar-bottom { padding:12px 8px 0; border-top:1px solid #0f2040; margin-top:auto; }
.user-card { display:flex; align-items:center; gap:10px; padding:10px 12px; margin-bottom:4px; }
.user-avatar { width:32px; height:32px; border-radius:50%; background:var(--accent); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:13px; color:white; flex-shrink:0; }
.user-name { font-size:13px; font-weight:600; color:#94a3b8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:3px; }
.nav-item { display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:10px; background:none; border:none; color:#4a6080; font-family:'Barlow',sans-serif; font-size:14px; font-weight:500; cursor:pointer; text-align:left; width:100%; transition:background 0.15s,color 0.15s; white-space:nowrap; }
.nav-item:hover { background:#0f2040; color:#94a3b8; }
.nav-item.active { background:#1a2f52; color:#3b82f6; }
.nav-icon { font-size:16px; flex-shrink:0; }
.topbar { display:flex; justify-content:space-between; align-items:center; padding:14px 24px; border-bottom:1px solid var(--border); background:var(--surface); position:sticky; top:0; z-index:10; }
.page-title { font-family:'Barlow Condensed',sans-serif; font-size:22px; font-weight:700; letter-spacing:1px; }
.topbar-actions { display:flex; gap:6px; align-items:center; }
.topbar-btn { display:flex; flex-direction:column; align-items:center; gap:2px; background:var(--card); border:1px solid var(--border); color:var(--text-muted); border-radius:10px; padding:6px 10px; cursor:pointer; min-width:46px; transition:all 0.2s; }
.topbar-btn:hover { border-color:var(--accent); color:var(--accent); }
.topbar-btn-icon { font-size:14px; line-height:1; }
.topbar-btn-label { font-size:9px; font-weight:700; letter-spacing:0.8px; text-transform:uppercase; }
.hamburger { background:none; border:none; cursor:pointer; display:flex; flex-direction:column; gap:4px; padding:4px; }
.hamburger span { display:block; width:20px; height:2px; background:var(--text); border-radius:2px; }
.mobile-drawer-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:200; backdrop-filter:blur(4px); }
.mobile-drawer { position:absolute; top:0; left:0; width:280px; height:100vh; background:var(--sidebar-bg); display:flex; flex-direction:column; overflow-y:auto; animation:slideRight 0.25s ease; }
@keyframes slideRight { from { transform:translateX(-100%); } to { transform:translateX(0); } }
.mobile-bottom-nav { position:fixed; bottom:0; left:0; right:0; height:60px; z-index:100; background:var(--surface); border-top:1px solid var(--border); display:flex; align-items:stretch; }
.mobile-nav-btn { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; background:none; border:none; color:var(--text-muted); cursor:pointer; font-family:'Barlow',sans-serif; transition:color 0.15s; padding:0; }
.mobile-nav-btn.active { color:var(--accent); }
.desktop-only { display:flex !important; }
.mobile-only { display:none !important; }
@media (max-width:768px) { .desktop-only{display:none!important} .mobile-only{display:flex!important} .main-content{margin-left:0!important;padding-bottom:60px} .sidebar{display:none!important} .content-area{padding:16px} .topbar{padding:12px 16px} .form-row{flex-direction:column} }
.content-area { padding:24px 28px; max-width:900px; width:100%; margin:0 auto; flex:1; }
.card { background:var(--card); border:1px solid var(--border); border-radius:16px; padding:22px; margin-bottom:18px; box-shadow:var(--shadow); transition:border-color 0.2s,background 0.3s; }
.card-label { font-size:10px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:var(--accent); margin-bottom:18px; }
.form-row { display:flex; gap:12px; margin-bottom:14px; }
.field { display:flex; flex-direction:column; gap:6px; flex:1; min-width:0; }
.field-label { font-size:10px; font-weight:600; color:var(--text-muted); letter-spacing:1px; text-transform:uppercase; }
.input { background:var(--input-bg); border:1px solid var(--border); border-radius:10px; padding:10px 14px; color:var(--text); font-family:'Barlow',sans-serif; font-size:14px; outline:none; width:100%; transition:border-color 0.2s,box-shadow 0.2s,background 0.3s; }
.input:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(59,130,246,0.15); }
input[type="date"].input { color-scheme:dark; }
.textarea { resize:vertical; min-height:70px; }
.dropdown { position:absolute; top:calc(100% + 4px); left:0; right:0; background:var(--surface); border:1px solid var(--border); border-radius:12px; z-index:200; overflow:hidden; box-shadow:var(--shadow); }
.dropdown-item { display:block; width:100%; background:none; border:none; color:var(--text); padding:10px 16px; text-align:left; font-family:'Barlow',sans-serif; font-size:14px; cursor:pointer; transition:background 0.15s; }
.dropdown-item:hover { background:var(--accent-dim); }
.sets-row { display:flex; flex-wrap:wrap; gap:8px; margin:10px 0; }
.set-chip { background:var(--accent-dim); border:1px solid var(--accent); color:var(--text); border-radius:7px; padding:4px 10px; font-size:12px; display:flex; align-items:center; gap:6px; }
.sets-badge { display:inline-block; background:var(--accent-dim); border:1px solid var(--accent); color:var(--accent); border-radius:5px; padding:1px 7px; font-size:10px; font-weight:700; margin-left:8px; vertical-align:middle; }
.chip-del { background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:13px; padding:0 2px; transition:color 0.2s; }
.chip-del:hover { color:var(--danger); }
.ex-list { margin-top:14px; display:flex; flex-direction:column; gap:6px; }
.ex-row { display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:var(--input-bg); border-radius:10px; border:1px solid var(--border); animation:slideIn 0.2s ease; }
.ex-name { font-weight:600; font-size:14px; }
.ex-detail { color:var(--text-muted); font-size:12px; }
.btn-primary { background:var(--accent); border:none; border-radius:12px; padding:13px 24px; color:white; font-family:'Barlow Condensed',sans-serif; font-size:18px; font-weight:700; letter-spacing:1px; cursor:pointer; transition:opacity 0.2s,transform 0.1s; }
.btn-primary:hover { opacity:0.88; }
.btn-primary:active { transform:scale(0.98); }
.btn-primary:disabled { opacity:0.5; cursor:not-allowed; }
.btn-ghost { background:var(--card); border:1px solid var(--border); color:var(--text-muted); border-radius:10px; padding:9px 16px; font-family:'Barlow',sans-serif; font-size:13px; font-weight:500; cursor:pointer; transition:all 0.2s; }
.btn-ghost:hover { border-color:var(--accent); color:var(--text); }
.btn-ghost.danger:hover { border-color:var(--danger); color:var(--danger); }
.btn-ghost.small { padding:6px 12px; font-size:12px; }
.btn-ghost:disabled { opacity:0.5; cursor:not-allowed; }
.btn-add-ex { width:100%; background:none; border:1px dashed var(--border); color:var(--text-muted); border-radius:10px; padding:9px; margin-top:12px; font-family:'Barlow',sans-serif; font-size:13px; cursor:pointer; transition:border-color 0.2s,color 0.2s; }
.btn-add-ex:hover { border-color:var(--accent); color:var(--text); }
.link-btn { background:none; border:none; color:var(--accent); cursor:pointer; font-family:'Barlow',sans-serif; font-size:inherit; }
.link-btn:hover { text-decoration:underline; }
.icon-action { background:none; border:none; cursor:pointer; font-size:15px; padding:4px; opacity:0.6; transition:opacity 0.2s; }
.icon-action:hover { opacity:1; }
.session-card { animation:slideIn 0.25s ease both; }
.session-header { display:flex; justify-content:space-between; align-items:center; cursor:pointer; user-select:none; flex-wrap:wrap; gap:8px; }
.session-date { font-size:12px; color:var(--text-muted); font-weight:500; }
.session-workout { font-weight:700; font-size:15px; font-family:'Barlow Condensed',sans-serif; letter-spacing:0.5px; }
.ex-count { font-size:11px; color:var(--text-muted); background:var(--input-bg); border:1px solid var(--border); border-radius:6px; padding:3px 8px; }
.chevron { color:var(--text-muted); font-size:10px; }
.session-body { margin-top:16px; border-top:1px solid var(--border); padding-top:16px; animation:fadeIn 0.2s ease; }
.session-notes { color:var(--text-muted); font-size:13px; margin-bottom:12px; font-style:italic; }
.ex-row-saved { display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border); gap:10px; flex-wrap:wrap; }
.session-actions { display:flex; gap:8px; margin-top:14px; flex-wrap:wrap; }
.section-title { font-family:'Barlow Condensed',sans-serif; font-size:22px; font-weight:700; letter-spacing:1px; margin-bottom:20px; }
.stats-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:12px; }
.stat-card { background:var(--card); border:1px solid var(--border); border-radius:14px; padding:18px 16px; display:flex; flex-direction:column; gap:6px; animation:slideIn 0.3s ease both; transition:border-color 0.2s,transform 0.2s; }
.stat-card:hover { border-color:var(--accent); transform:translateY(-2px); }
.stat-value { font-family:'Barlow Condensed',sans-serif; font-size:22px; font-weight:800; }
.login-page { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:20px; background:var(--bg); }
.login-box { background:var(--card); border:1px solid var(--border); border-radius:20px; padding:40px 36px; width:100%; max-width:420px; box-shadow:var(--shadow); animation:fadeIn 0.4s ease; }
.login-logo { display:flex; align-items:center; gap:12px; margin-bottom:6px; }
.tab-row { display:flex; border:1px solid var(--border); border-radius:10px; overflow:hidden; margin-bottom:22px; }
.tab-btn { flex:1; background:none; border:none; color:var(--text-muted); padding:10px; font-family:'Barlow',sans-serif; font-size:13px; font-weight:500; cursor:pointer; transition:background 0.2s,color 0.2s; }
.tab-btn.active { background:var(--accent); color:white; }
.err-msg { background:rgba(239,68,68,0.1); border:1px solid #ef4444; color:#f87171; border-radius:8px; padding:9px 12px; font-size:13px; margin-bottom:10px; }
.lib-filters { display:flex; gap:8px; margin-bottom:12px; }
.muscle-chips { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:14px; }
.muscle-chip { background:none; border:1px solid var(--border); color:var(--text-muted); border-radius:20px; padding:4px 12px; font-family:'Barlow',sans-serif; font-size:12px; font-weight:500; cursor:pointer; transition:all 0.15s; }
.muscle-chip:hover { border-color:var(--accent); color:var(--text); }
.muscle-chip.active { background:var(--accent); border-color:var(--accent); color:white; }
.lib-list { overflow-y:auto; flex:1; padding-right:4px; }
.lib-group { margin-bottom:16px; }
.lib-group-title { font-size:10px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:var(--accent); margin-bottom:6px; padding:0 4px; }
.lib-item { display:flex; align-items:center; gap:12px; width:100%; background:none; border:none; border-bottom:1px solid var(--border); padding:10px 6px; cursor:pointer; text-align:left; border-radius:8px; margin-bottom:2px; transition:background 0.15s; }
.lib-item:hover { background:var(--accent-dim); }
.lib-info { display:flex; flex-direction:column; gap:2px; flex:1; }
.lib-name { color:var(--text); font-family:'Barlow',sans-serif; font-size:14px; font-weight:500; }
.lib-meta { color:var(--text-muted); font-size:11px; }
.lib-add { color:var(--accent); font-size:20px; font-weight:300; flex-shrink:0; opacity:0.6; transition:opacity 0.2s; }
.lib-item:hover .lib-add { opacity:1; }
.overlay { position:fixed; inset:0; background:rgba(0,0,0,0.65); display:flex; align-items:center; justify-content:center; z-index:1000; padding:20px; animation:fadeIn 0.2s ease; backdrop-filter:blur(4px); }
.modal { background:var(--card); border:1px solid var(--border); border-radius:20px; padding:28px; width:100%; max-width:480px; max-height:90vh; overflow-y:auto; box-shadow:var(--shadow); animation:slideUp 0.25s ease; }
.modal-wide { max-width:680px; }
.modal-library { max-width:520px; max-height:85vh; display:flex; flex-direction:column; }
.modal-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
.modal-title { font-family:'Barlow Condensed',sans-serif; font-size:20px; font-weight:700; letter-spacing:0.5px; }
.close-btn { background:none; border:none; color:var(--text-muted); font-size:18px; cursor:pointer; padding:4px; transition:color 0.2s; flex-shrink:0; }
.close-btn:hover { color:var(--text); }
.text-muted { color:var(--text-muted); }
.empty-state { text-align:center; padding:60px 20px; color:var(--text-muted); }
.toast { position:fixed; bottom:76px; left:50%; transform:translateX(-50%); background:var(--card); border:1px solid var(--border); color:var(--text); padding:12px 22px; border-radius:12px; font-size:14px; font-weight:500; z-index:9999; white-space:nowrap; box-shadow:var(--shadow); animation:toastIn 0.3s ease; }
@media(min-width:769px){.toast{bottom:28px}}
@keyframes fadeIn { from{opacity:0}to{opacity:1} }
@keyframes slideIn { from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)} }
@keyframes slideUp { from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)} }
@keyframes toastIn { from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)} }
.fade-in { animation:fadeIn 0.3s ease; }
select.input { cursor:pointer; }
select.input option { background:var(--surface); color:var(--text); }
.btn-guest { width:100%; background:var(--input-bg); border:1px solid var(--border); color:var(--text); border-radius:12px; padding:12px 16px; display:flex; align-items:center; gap:14px; cursor:pointer; transition:border-color 0.2s,background 0.2s; font-family:'Barlow',sans-serif; }
.btn-guest:hover { border-color:#f59e0b; background:rgba(245,158,11,0.06); }
.guest-banner { background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.3); color:#fbbf24; border-radius:12px; padding:10px 16px; font-size:13px; margin-bottom:16px; display:flex; align-items:center; flex-wrap:wrap; gap:4px; }
`;