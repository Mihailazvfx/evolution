import React, { useState, useEffect, useMemo, useRef } from "react";
import { loadState, saveState, subscribe } from "./storage";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, BarChart, Bar, CartesianGrid, ReferenceLine
} from "recharts";
import {
  LayoutDashboard, Map, FlaskConical, Clapperboard, TrendingUp, Library, Trophy, BookOpen,
  Settings as SettingsIcon, Star, Plus, Search, X, ChevronDown, ChevronUp, Download, Upload,
  Printer, Check, Trash2, GripVertical, Pencil, ClipboardCheck, LogOut, Cloud, CloudOff
} from "lucide-react";

/* ───────────────────────── constants ───────────────────────── */
const TRACKS = [
  { key: "research", name: "Research", long: "AI, software, hardware, model research", color: "var(--cyan)" },
  { key: "creative", name: "Creative", long: "Creative roadmap and finished results", color: "var(--lime)" },
  { key: "growth",   name: "Growth",   long: "Social, website and jobs statistics",   color: "var(--amber)" },
  { key: "workflow", name: "Workflow", long: "AI workflow and IP library",            color: "var(--violet)" },
];
const SCORE_LABELS = ["Not touched", "Research only", "Test started", "Test completed", "Useful result", "Reusable / client-ready"];
const WEEK_STATUS = ["planned", "active", "done", "missed"];
const PROJECT_STAGES = ["idea", "experiment", "in progress", "finished", "portfolio"];
const PROJECT_TYPES = ["experiment", "study", "spec ad", "narrative test", "hybrid shoot", "client"];
const MODEL_CATS = ["video", "image", "audio", "3D", "compositing", "local", "automation", "editing"];
const MODEL_STATUS = ["Adopt", "Watch", "Discard"];
const LIB_SECTIONS = [
  "Models & Versions", "Benchmark Tests", "Prompt Modules", "Camera Motion Recipes", "Character/Product Consistency",
  "Image-to-Video", "Compositing & Repair", "Audio", "Local AI", "Automations", "Hybrid Production SOPs",
  "Cost & Time Benchmarks", "Case Studies", "Failures & Lessons", "References", "2027 Watchlist"
];
const DEFAULT_WEIGHTS = { realism: 25, motion: 20, adherence: 20, consistency: 20, camera: 15 };

const WEEK_DEFS = [
  ["2026-09-14", "2026-09-20", "Baseline and model map", "Score every model you already use on one identical prompt set", "One-page model map with honest scores"],
  ["2026-09-21", "2026-09-27", "Camera control", "Get a repeatable dolly, orbit and handheld feel from prompt alone", "Three camera motion recipes saved to the library"],
  ["2026-09-28", "2026-10-04", "Character consistency", "Same face, same wardrobe across five shots and two locations", "Consistency SOP with failure notes"],
  ["2026-10-05", "2026-10-11", "Image-to-video pipeline", "Still frame to 15s shot with locked lighting and WB", "I2V pipeline diagram plus one finished sequence"],
  ["2026-10-12", "2026-10-18", "Hybrid shoot: plate plus AI", "Shoot a real plate, extend it with AI, make the seam invisible", "One hybrid shot nobody can tell apart"],
  ["2026-10-19", "2026-10-25", "Compositing and repair", "Fix hands, faces and flicker in post instead of re-rolling", "Repair checklist with before/after"],
  ["2026-10-26", "2026-11-01", "Spec ad sprint", "Brief to finished 30s spec ad in seven days", "Spec ad, published"],
  ["2026-11-02", "2026-11-08", "Local AI setup", "Run at least one video or image model locally and time it", "Local vs cloud cost and time table"],
  ["2026-11-09", "2026-11-15", "Audio and sound design", "AI voice, foley and score on one existing piece", "Audio recipe and finished mix"],
  ["2026-11-16", "2026-11-22", "Automations with Claude Code", "Automate the boring part of one workflow end to end", "Working script or MCP flow, documented"],
  ["2026-11-23", "2026-11-29", "Narrative test", "Direct a 60s story with three characters and a turn", "Narrative short with lessons"],
  ["2026-11-30", "2026-12-06", "Product consistency campaign", "One product, ten angles, zero drift", "Product campaign set, client-ready"],
  ["2026-12-07", "2026-12-13", "Case study and proof", "Turn the best piece into a case study with numbers", "Case study page live on site"],
  ["2026-12-14", "2026-12-20", "Portfolio and website push", "Refresh reel and portfolio with the finished pieces", "Updated reel and portfolio"],
  ["2026-12-21", "2026-12-27", "Cost and time benchmarks", "Price a hybrid job with real numbers from your own logs", "Pricing sheet backed by benchmarks"],
  ["2026-12-28", "2026-12-31", "Year review and 2027 watchlist", "Decide what to keep, drop and watch", "Printed year review"],
];

const GOALS = [
  "Choose the right model faster: know each model's strengths from your own benchmarks, not from hype.",
  "Direct better work: finish consistently, with camera, character and light under control.",
  "Turn results into jobs: prove outcomes with numbers and convert AI/hybrid positioning into qualified opportunities.",
  "Build reusable IP: every test becomes a prompt module, recipe or SOP you can sell or reuse.",
];

/* ───────────────────────── utils ───────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 10);
const fmtD = (iso) => { const d = new Date(iso + "T00:00:00"); return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }); };
const todayISO = () => new Date().toISOString().slice(0, 10);
const sum = (a) => a.reduce((x, y) => x + (Number(y) || 0), 0);
const total = (w) => sum(w.scores);
const money = (n) => (Number(n) || 0).toLocaleString("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const monthOf = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { month: "short" });
const weightedScore = (m, w = DEFAULT_WEIGHTS) => {
  const keys = ["realism", "motion", "adherence", "consistency", "camera"];
  const tw = sum(keys.map(k => w[k]));
  if (!tw) return 0;
  return sum(keys.map(k => (Number(m[k]) || 0) * w[k])) / tw;
};

function seed() {
  const weeks = WEEK_DEFS.map(([start, end, theme, challenge, deliverable], i) => ({
    id: "w" + (i + 1), n: i + 1, start, end, theme, challenge, deliverable,
    scores: [0, 0, 0, 0], status: i === 0 ? "active" : "planned", notes: "", links: "", evidence: ""
  }));
  const models = [
    { id: uid(), name: "Seedance 2.5", company: "ByteDance", category: "video", version: "2.5", useCase: "Cinematic shots, timecoded multi-shot prompts", cloud: "cloud", status: "Adopt", favorite: true },
    { id: uid(), name: "Kling", company: "Kuaishou", category: "video", version: "", useCase: "Motion, image-to-video, MCP connector", cloud: "cloud", status: "Watch", favorite: false },
    { id: uid(), name: "Soul Cinematic", company: "Higgsfield", category: "video", version: "", useCase: "Stylised cinematic shots", cloud: "cloud", status: "Watch", favorite: false },
    { id: uid(), name: "Nano Banana Pro", company: "Google (via Higgsfield)", category: "image", version: "", useCase: "Keyframes, character sheets", cloud: "cloud", status: "Watch", favorite: false },
  ].map(m => ({ realism: 0, motion: 0, adherence: 0, consistency: 0, camera: 0, speed: "", cost: "", failureRate: "", vram: "", dateTested: "", notes: "Not benchmarked yet. Score it in week 1.", links: "", screenshots: "", ...m }));
  const projects = [
    { id: uid(), title: "VIGGO suit ad", type: "spec ad", stage: "experiment", brief: "1:30 story-driven AI-generated ad set at Reggia di Venaria." },
    { id: uid(), title: "LAN TZU music video", type: "narrative test", stage: "experiment", brief: "Crime-thriller music video across nine chapters." },
    { id: uid(), title: "AI evolution documentary", type: "narrative test", stage: "experiment", brief: "5-minute cinematic doc: ANI → AGI → ASI, built from Seedance prompts." },
    { id: uid(), title: "VALE short", type: "hybrid shoot", stage: "idea", brief: "Romanian psychological sci-fi thriller short." },
  ].map(p => ({ references: "", shotList: "", stack: "", estCost: 0, actCost: 0, hours: 0, video: "", lessons: "", portfolio: false, ...p }));
  const library = [
    { id: uid(), section: "Prompt Modules", title: "Style 60:30:10 colour block", tags: "style,colour", body: "Dominant 60 / secondary 30 / accent 10 colour ratio stated explicitly in the STYLE line; set WB value with it.", result: "Consistent palette across shots", failure: "", rating: 4, reusable: true, screenshots: "" },
    { id: uid(), section: "Character/Product Consistency", title: "LOCK constraint block + @character tags", tags: "consistency,prompting", body: "Define @character once with wardrobe, face and light; repeat a LOCK block in every prompt listing what must not change.", result: "Reduces drift between shots", failure: "Still drifts on wide shots with small faces", rating: 4, reusable: true, screenshots: "" },
  ];
  return { v: 1, weeks, models, projects, library, metrics: {}, reviews: {}, weights: { ...DEFAULT_WEIGHTS }, goals: GOALS, owner: "Laz" };
}

/* ───────────────────────── styles ───────────────────────── */
export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400;0,500;0,600;1,400&family=Instrument+Serif:ital@0;1&display=swap');
.afes{--bg:#151719;--panel:#1B1E22;--panel2:#22262B;--line:rgba(255,255,255,.07);--line2:rgba(255,255,255,.14);--text:#E9EAEA;--muted:#8A9199;--dim:#5C636B;
--cyan:#5FE3E8;--lime:#C6F04C;--amber:#F2C56B;--violet:#B9A6FF;--red:#FF6E6E;
font-family:'Instrument Sans',ui-sans-serif,system-ui,-apple-system,sans-serif;color:var(--text);background:var(--bg);min-height:100vh;display:flex;font-size:14px;line-height:1.45;-webkit-font-smoothing:antialiased}
.afes *{box-sizing:border-box}
.afes h1,.afes h2,.afes h3{margin:0;font-weight:500;letter-spacing:-.01em}
.afes h1{font-size:26px} .afes h2{font-size:18px} .afes h3{font-size:15px}
.serif{font-family:'Instrument Serif',Georgia,serif;font-weight:400;letter-spacing:0}
.side{width:212px;flex:none;border-right:1px solid var(--line);padding:22px 14px;display:flex;flex-direction:column;gap:2px;position:sticky;top:0;height:100vh;background:linear-gradient(180deg,#191C1F,#151719)}
.brand{padding:0 8px 18px;border-bottom:1px solid var(--line);margin-bottom:12px}
.brand .t{font-size:15px;font-weight:600} .brand .s{color:var(--muted);font-size:12px;margin-top:2px}
.nav{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:8px;color:var(--muted);cursor:pointer;border:none;background:none;font:inherit;text-align:left;width:100%}
.nav:hover{color:var(--text);background:rgba(255,255,255,.04)} .nav.on{color:var(--text);background:rgba(95,227,232,.09)} .nav.on svg{color:var(--cyan)}
.nav:focus-visible,.btn:focus-visible,.in:focus-visible{outline:2px solid var(--cyan);outline-offset:2px}
.main{flex:1;min-width:0;display:flex;flex-direction:column}
.top{display:flex;align-items:center;gap:26px;padding:14px 28px;border-bottom:1px solid var(--line);background:rgba(21,23,25,.85);backdrop-filter:blur(10px);position:sticky;top:0;z-index:5;flex-wrap:wrap}
.top .k{color:var(--muted);font-size:12px} .top .v{font-size:15px;font-weight:500}
.content{padding:26px 28px 60px;max-width:1440px;width:100%}
.panel{background:linear-gradient(160deg,rgba(255,255,255,.035),rgba(255,255,255,.012)),var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px 20px;box-shadow:inset 0 1px 0 rgba(255,255,255,.05)}
.panel.flat{background:var(--panel)}
.grid{display:grid;gap:14px}
.muted{color:var(--muted)} .dim{color:var(--dim)} .small{font-size:12px} .big{font-size:30px;font-weight:500;letter-spacing:-.02em;line-height:1}
.row{display:flex;align-items:center;gap:10px} .between{justify-content:space-between} .wrap{flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:8px;border:1px solid var(--line2);background:rgba(255,255,255,.03);color:var(--text);cursor:pointer;font:inherit;font-size:13px}
.btn:hover{background:rgba(255,255,255,.07)} .btn.pri{background:var(--cyan);color:#0E1B1C;border-color:transparent;font-weight:600} .btn.pri:hover{background:#7CEAEE}
.btn.sm{padding:4px 9px;font-size:12px} .btn.ghost{border-color:transparent;background:none;color:var(--muted)} .btn.ghost:hover{color:var(--text)} .btn.danger{color:var(--red)}
.in{width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--line2);background:#111315;color:var(--text);font:inherit;font-size:13px}
textarea.in{min-height:76px;resize:vertical} select.in{appearance:auto}
.lab{display:block;font-size:12px;color:var(--muted);margin-bottom:4px}
.f{display:flex;flex-direction:column}
.tag{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;border:1px solid var(--line2);color:var(--muted)}
.tag.cyan{color:var(--cyan);border-color:rgba(95,227,232,.35)} .tag.lime{color:var(--lime);border-color:rgba(198,240,76,.35)} .tag.red{color:var(--red);border-color:rgba(255,110,110,.4)} .tag.amber{color:var(--amber);border-color:rgba(242,197,107,.4)}
.pill{padding:3px 9px;border-radius:999px;font-size:12px;font-weight:600}
.pill.good{background:rgba(198,240,76,.15);color:var(--lime)} .pill.bad{background:rgba(255,110,110,.15);color:var(--red)} .pill.mid{background:rgba(255,255,255,.08);color:var(--text)}
.steps{display:inline-flex;gap:3px} .steps button{width:26px;height:26px;border-radius:6px;border:1px solid var(--line2);background:none;color:var(--muted);cursor:pointer;font:inherit;font-size:12px}
.steps button.on{background:var(--c);color:#111;border-color:transparent;font-weight:600}
.wcard{border:1px solid var(--line);border-radius:12px;padding:14px 16px;background:var(--panel)} .wcard.active{border-color:rgba(95,227,232,.45)} .wcard.done{border-color:rgba(198,240,76,.35)} .wcard.missed{border-color:rgba(255,110,110,.35)}
.wcard.warn{box-shadow:inset 3px 0 0 var(--red)} .wcard.hit{box-shadow:inset 3px 0 0 var(--lime)}
.lane{background:rgba(255,255,255,.02);border:1px dashed var(--line2);border-radius:12px;padding:10px;min-height:140px}
.lane.over{border-color:var(--cyan);background:rgba(95,227,232,.05)}
.dragc{cursor:grab} .dragc:active{cursor:grabbing}
table.tb{width:100%;border-collapse:collapse;font-size:13px} .tb th{text-align:left;color:var(--muted);font-weight:500;font-size:12px;padding:8px 10px;border-bottom:1px solid var(--line2)} .tb td{padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:middle}
.tb tr:hover td{background:rgba(255,255,255,.02)}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:50;padding:20px}
.modal{background:#1A1D21;border:1px solid var(--line2);border-radius:16px;width:min(880px,100%);max-height:92vh;overflow:auto;padding:24px;box-shadow:0 30px 80px rgba(0,0,0,.6)}
.bar{height:6px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden} .bar i{display:block;height:100%;background:var(--cyan);border-radius:3px;transition:width .5s ease}
.ring text{fill:var(--text)}
.kv{display:grid;grid-template-columns:1fr auto;gap:6px 14px;font-size:13px} .kv span:nth-child(odd){color:var(--muted)}
.section-btn{display:block;width:100%;text-align:left;padding:7px 10px;border-radius:7px;border:none;background:none;color:var(--muted);cursor:pointer;font:inherit;font-size:13px} .section-btn.on,.section-btn:hover{color:var(--text);background:rgba(255,255,255,.05)}
.delta{font-size:12px} .delta.up{color:var(--lime)} .delta.dn{color:var(--red)}
.thumb{aspect-ratio:16/9;border-radius:8px;background:linear-gradient(135deg,#25292E,#181B1E);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;color:var(--dim);font-size:12px;overflow:hidden}
.thumb video,.thumb img{width:100%;height:100%;object-fit:cover}
.star{color:var(--dim);cursor:pointer} .star.on{color:var(--amber);fill:var(--amber)}
@media (max-width:900px){.afes{flex-direction:column}.side{width:100%;height:auto;position:static;flex-direction:row;overflow-x:auto;padding:10px;gap:4px;border-right:none;border-bottom:1px solid var(--line)}.brand{display:none}.nav{white-space:nowrap;width:auto}.side>div[style]{display:none}.nav span{display:none}.top{gap:14px;padding:12px 16px}.content{padding:16px}}
@media print{.side,.top,.noprint{display:none!important}.afes{background:#fff;color:#111}.panel{border-color:#ccc;background:#fff;box-shadow:none;break-inside:avoid}.muted{color:#555}}
@media (prefers-reduced-motion:reduce){.afes *{transition:none!important}}
`;

/* ───────────────────────── primitives ───────────────────────── */
function Ring({ value, max, label, sub, color, size = 128 }) {
  const r = (size - 14) / 2, c = 2 * Math.PI * r, p = Math.min(1, Math.max(0, max ? value / max : 0));
  return (
    <svg className="ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label} ${value} of ${max}`}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,.07)" strokeWidth="7" fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="7" fill="none" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - p)} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset .7s cubic-bezier(.2,.8,.2,1)" }} />
      <text x="50%" y="46%" textAnchor="middle" fontSize="24" fontWeight="500">{value}<tspan fontSize="12" fill="#8A9199">/{max}</tspan></text>
      <text x="50%" y="62%" textAnchor="middle" fontSize="11" fill="#8A9199">{label}</text>
      {sub && <text x="50%" y="74%" textAnchor="middle" fontSize="10" fill="#5C636B">{sub}</text>}
    </svg>
  );
}
const Panel = ({ title, right, children, style, className = "" }) => (
  <div className={"panel " + className} style={style}>
    {(title || right) && <div className="row between" style={{ marginBottom: 12 }}><h3>{title}</h3>{right}</div>}
    {children}
  </div>
);
function Steps({ value, onChange, color }) {
  return (
    <div className="steps" style={{ "--c": color }}>
      {[0, 1, 2, 3, 4, 5].map(n => <button key={n} className={n <= value && value > 0 ? "on" : ""} title={SCORE_LABELS[n]} onClick={() => onChange(n === value ? 0 : n)}>{n}</button>)}
    </div>
  );
}
const ScorePill = ({ t }) => <span className={"pill " + (t >= 15 ? "good" : t < 10 ? "bad" : "mid")}>{t}/20</span>;
function Modal({ title, onClose, children, width }) {
  useEffect(() => { const h = e => e.key === "Escape" && onClose(); window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [onClose]);
  return (
    <div className="overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={width ? { width } : undefined} role="dialog" aria-label={title}>
        <div className="row between" style={{ marginBottom: 16 }}><h2>{title}</h2><button className="btn ghost" onClick={onClose} aria-label="Close"><X size={16} /></button></div>
        {children}
      </div>
    </div>
  );
}
function Field({ label, children, span }) { return <div className="f" style={span ? { gridColumn: "1 / -1" } : undefined}><label className="lab">{label}</label>{children}</div>; }
/* schema-driven editor: fields [{k,label,type,options,span}] */
function Editor({ title, fields, value, onSave, onDelete, onClose }) {
  const [v, setV] = useState(value);
  const set = (k, x) => setV(s => ({ ...s, [k]: x }));
  return (
    <Modal title={title} onClose={onClose}>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
        {fields.map(f => (
          <Field key={f.k} label={f.label} span={f.span}>
            {f.type === "textarea" ? <textarea className="in" value={v[f.k] ?? ""} onChange={e => set(f.k, e.target.value)} />
              : f.type === "select" ? <select className="in" value={v[f.k] ?? ""} onChange={e => set(f.k, e.target.value)}>{f.options.map(o => <option key={o} value={o}>{o}</option>)}</select>
              : f.type === "toggle" ? <button className={"btn " + (v[f.k] ? "pri" : "")} onClick={() => set(f.k, !v[f.k])}>{v[f.k] ? <Check size={14} /> : null}{v[f.k] ? "Yes" : "No"}</button>
              : <input className="in" type={f.type || "text"} step={f.step} min={f.min} max={f.max} value={v[f.k] ?? ""} onChange={e => set(f.k, f.type === "number" ? Number(e.target.value) : e.target.value)} />}
          </Field>
        ))}
      </div>
      <div className="row between" style={{ marginTop: 20 }}>
        <div>{onDelete && <button className="btn ghost danger" onClick={() => { onDelete(); onClose(); }}><Trash2 size={14} />Delete</button>}</div>
        <div className="row"><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" onClick={() => { onSave(v); onClose(); }}>Save</button></div>
      </div>
    </Modal>
  );
}
const tip = { contentStyle: { background: "#1A1D21", border: "1px solid rgba(255,255,255,.14)", borderRadius: 8, fontSize: 12 }, labelStyle: { color: "#8A9199" } };
const Empty = ({ children }) => <div className="dim" style={{ padding: "18px 0", fontSize: 13 }}>{children}</div>;

/* ───────────────────────── dashboard ───────────────────────── */
function Dashboard({ S, cur, update, openReview, go }) {
  const w = S.weeks[cur];
  const scored = S.weeks.filter(x => total(x) > 0);
  const trend = S.weeks.map(x => ({ n: "W" + x.n, total: total(x), ...Object.fromEntries(TRACKS.map((t, i) => [t.key, x.scores[i]])) }));
  const radar = TRACKS.map((t, i) => ({ track: t.name, v: scored.length ? sum(scored.map(x => x.scores[i])) / scored.length : 0 }));
  const latestModel = [...S.models].filter(m => m.dateTested).sort((a, b) => b.dateTested.localeCompare(a.dateTested))[0];
  const active = S.projects.find(p => p.stage === "in progress") || S.projects.find(p => p.stage === "experiment");
  const mWeeks = S.weeks.filter(x => S.metrics[x.id]);
  const gm = mWeeks.length ? S.metrics[mWeeks[mWeeks.length - 1].id] : null;
  const gprev = mWeeks.length > 1 ? S.metrics[mWeeks[mWeeks.length - 2].id] : null;
  const pipeline = sum(Object.values(S.metrics).map(m => m.pipelineValue));
  const booked = sum(Object.values(S.metrics).map(m => m.bookedRevenue));
  const qualified = sum(Object.values(S.metrics).map(m => m.qualifiedLeads));
  const D = ({ k }) => { if (!gm || !gprev) return null; const d = (Number(gm[k]) || 0) - (Number(gprev[k]) || 0); return <span className={"delta " + (d > 0 ? "up" : d < 0 ? "dn" : "")}>{d > 0 ? "+" : ""}{d}</span>; };
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="row between wrap">
        <div><h1 className="serif" style={{ fontSize: 34 }}>Week {w.n}: {w.theme}</h1><div className="muted">{fmtD(w.start)} – {fmtD(w.end)} · by December: direct better work, choose the right model faster, finish, prove it, turn it into jobs.</div></div>
        <button className="btn pri" onClick={() => openReview(w.id)}><ClipboardCheck size={15} />Sunday review</button>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
        {TRACKS.map((t, i) => (
          <Panel key={t.key} className="flat" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <Ring value={w.scores[i]} max={5} label={t.name} sub={SCORE_LABELS[w.scores[i]]} color={t.color} />
            <Steps value={w.scores[i]} color={t.color} onChange={n => update(s => { s.weeks[cur].scores[i] = n; })} />
          </Panel>
        ))}
        <Panel className="flat" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <div className="big" style={{ color: total(w) >= 15 ? "var(--lime)" : total(w) < 10 ? "var(--red)" : "var(--text)" }}>{total(w)}<span className="muted" style={{ fontSize: 14 }}>/20</span></div>
          <div className="muted small">{total(w) >= 15 ? "On target" : total(w) < 10 ? "Below 10: warning" : "Target is 15+"}</div>
          <div className="bar" style={{ width: "100%" }}><i style={{ width: (total(w) / 20) * 100 + "%", background: total(w) >= 15 ? "var(--lime)" : total(w) < 10 ? "var(--red)" : "var(--cyan)" }} /></div>
        </Panel>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "2fr 1fr" }}>
        <Panel title="Weekly trend" right={<span className="muted small">target line at 15</span>}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} />
              <XAxis dataKey="n" tick={{ fill: "#8A9199", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 20]} tick={{ fill: "#8A9199", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...tip} />
              <ReferenceLine y={15} stroke="rgba(198,240,76,.4)" strokeDasharray="4 4" />
              <ReferenceLine y={10} stroke="rgba(255,110,110,.35)" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="total" stroke="#5FE3E8" strokeWidth={2.5} dot={{ r: 3, fill: "#5FE3E8" }} name="Total /20" />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Skill radar" right={<span className="muted small">avg of scored weeks</span>}>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radar} outerRadius={80}>
              <PolarGrid stroke="rgba(255,255,255,.1)" />
              <PolarAngleAxis dataKey="track" tick={{ fill: "#8A9199", fontSize: 11 }} />
              <Radar dataKey="v" stroke="#C6F04C" fill="#C6F04C" fillOpacity={0.2} />
              <Tooltip {...tip} formatter={v => v.toFixed(1)} />
            </RadarChart>
          </ResponsiveContainer>
        </Panel>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
        <Panel title="Current challenge" right={<span className="tag cyan">week {w.n}</span>}>
          <div style={{ fontSize: 15, marginBottom: 8 }}>{w.challenge}</div>
          <div className="muted small">Deliverable: {w.deliverable}</div>
        </Panel>
        <Panel title="Latest test" right={<button className="btn sm ghost" onClick={() => go("lab")}>Research lab</button>}>
          {latestModel ? <>
            <div style={{ fontSize: 15 }}>{latestModel.name} <span className="muted small">{latestModel.company}</span></div>
            <div className="row" style={{ marginTop: 6 }}><span className={"tag " + (latestModel.status === "Adopt" ? "lime" : latestModel.status === "Discard" ? "red" : "amber")}>{latestModel.status}</span><span className="muted small">weighted {weightedScore(latestModel, S.weights).toFixed(1)}/10 · tested {fmtD(latestModel.dateTested)}</span></div>
            <div className="muted small" style={{ marginTop: 6 }}>{latestModel.notes}</div>
          </> : <Empty>No model tested yet. Log the first benchmark in the Research lab and it shows up here.</Empty>}
        </Panel>
        <Panel title="Current creative output" right={<button className="btn sm ghost" onClick={() => go("roadmap")}>Roadmap</button>}>
          {active ? <>
            <div className="thumb" style={{ marginBottom: 10 }}>{active.video ? <video src={active.video} muted controls /> : "no video yet"}</div>
            <div style={{ fontSize: 15 }}>{active.title}</div>
            <div className="muted small">{active.type} · {active.stage} · {active.hours || 0}h · {money(active.actCost)}</div>
          </> : <Empty>Nothing in progress. Move a project into "in progress" on the roadmap.</Empty>}
        </Panel>
        <Panel title="Growth snapshot" right={<button className="btn sm ghost" onClick={() => go("growth")}>Growth &amp; jobs</button>}>
          {gm ? <div className="kv">
            <span>Reach</span><span>{gm.reach || 0} <D k="reach" /></span>
            <span>Views</span><span>{gm.views || 0} <D k="views" /></span>
            <span>Follows</span><span>{gm.follows || 0} <D k="follows" /></span>
            <span>Qualified DMs</span><span>{gm.qualifiedDMs || 0} <D k="qualifiedDMs" /></span>
            <span>Inquiries</span><span>{gm.inquiries || 0} <D k="inquiries" /></span>
          </div> : <Empty>No metrics logged. Add this week's numbers under Growth &amp; jobs.</Empty>}
        </Panel>
        <Panel title="Pipeline">
          <div className="big" style={{ color: "var(--lime)" }}>{money(pipeline)}</div>
          <div className="muted small" style={{ marginTop: 6 }}>Booked {money(booked)} · North star: <b style={{ color: "var(--text)" }}>{qualified}</b> qualified opportunities from AI/hybrid positioning</div>
        </Panel>
      </div>
      <Panel title="What changed this week?" right={<span className="muted small">saved automatically</span>}>
        <textarea className="in" placeholder="Three lines: what moved, what broke, what you decided." value={w.notes} onChange={e => update(s => { s.weeks[cur].notes = e.target.value; })} />
        {S.reviews[w.id] && <div className="muted small" style={{ marginTop: 10 }}>Review done: {S.reviews[w.id].summary}</div>}
      </Panel>
    </div>
  );
}

/* ───────────────────────── weekly map ───────────────────────── */
function WeeklyMap({ S, cur, update, openReview }) {
  const [mode, setMode] = useState("grid");
  const [open, setOpen] = useState(null);
  const [over, setOver] = useState(null);
  const drop = (status) => (e) => { const id = e.dataTransfer.getData("id"); update(s => { const w = s.weeks.find(x => x.id === id); if (w) w.status = status; }); setOver(null); };
  const Card = ({ w }) => {
    const t = total(w), i = S.weeks.indexOf(w);
    return (
      <div className={`wcard ${w.status} ${t > 0 && t < 10 ? "warn" : t >= 15 ? "hit" : ""} dragc`} draggable onDragStart={e => e.dataTransfer.setData("id", w.id)}>
        <div className="row between" style={{ marginBottom: 6 }}>
          <div className="row"><GripVertical size={14} className="dim" /><span className="muted small">Week {w.n} · {fmtD(w.start)}–{fmtD(w.end)}</span></div>
          <ScorePill t={t} />
        </div>
        <div style={{ fontSize: 15, marginBottom: 8 }}>{w.theme}</div>
        <div className="row wrap" style={{ gap: 6, marginBottom: 8 }}>
          {TRACKS.map((tr, k) => <span key={tr.key} className="tag" style={{ color: w.scores[k] ? tr.color : undefined }}>{tr.name} {w.scores[k]}</span>)}
          <select className="in" style={{ width: "auto", padding: "2px 6px", fontSize: 11 }} value={w.status} onChange={e => update(s => { s.weeks[i].status = e.target.value; })}>{WEEK_STATUS.map(x => <option key={x}>{x}</option>)}</select>
        </div>
        <div className="row between">
          <button className="btn sm ghost" onClick={() => setOpen(open === w.id ? null : w.id)}>{open === w.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}details</button>
          <button className="btn sm" onClick={() => openReview(w.id)}>Review</button>
        </div>
        {open === w.id && (
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
            <Field label="Challenge"><textarea className="in" value={w.challenge} onChange={e => update(s => { s.weeks[i].challenge = e.target.value; })} /></Field>
            <Field label="Deliverable"><textarea className="in" value={w.deliverable} onChange={e => update(s => { s.weeks[i].deliverable = e.target.value; })} /></Field>
            <Field label="Scores">{TRACKS.map((tr, k) => <div key={tr.key} className="row between" style={{ marginBottom: 4 }}><span className="muted small">{tr.name}</span><Steps value={w.scores[k]} color={tr.color} onChange={n => update(s => { s.weeks[i].scores[k] = n; })} /></div>)}</Field>
            <Field label="Notes"><textarea className="in" value={w.notes} onChange={e => update(s => { s.weeks[i].notes = e.target.value; })} /></Field>
            <Field label="Evidence links (one per line)" span><textarea className="in" placeholder="https://…" value={w.links} onChange={e => update(s => { s.weeks[i].links = e.target.value; })} /></Field>
            {w.links && <div className="row wrap" style={{ gridColumn: "1/-1" }}>{w.links.split("\n").filter(Boolean).map((l, k) => <a key={k} className="tag cyan" href={l} target="_blank" rel="noreferrer">{l.replace(/^https?:\/\//, "").slice(0, 40)}</a>)}</div>}
            {S.reviews[w.id] && <div className="muted small" style={{ gridColumn: "1/-1" }}>Review: {S.reviews[w.id].summary}</div>}
          </div>
        )}
      </div>
    );
  };
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="row between wrap">
        <div><h1>Weekly map</h1><div className="muted">16 weeks, Sep 14 to Dec 31. Drag cards between lanes in board view.</div></div>
        <div className="row"><button className={"btn " + (mode === "grid" ? "pri" : "")} onClick={() => setMode("grid")}>Grid</button><button className={"btn " + (mode === "board" ? "pri" : "")} onClick={() => setMode("board")}>Board</button></div>
      </div>
      {mode === "grid" ? (
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))" }}>{S.weeks.map(w => <React.Fragment key={w.id}>{Card({ w })}</React.Fragment>)}</div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: "repeat(4,1fr)", alignItems: "start" }}>
          {WEEK_STATUS.map(st => (
            <div key={st} className={"lane " + (over === st ? "over" : "")} onDragOver={e => { e.preventDefault(); setOver(st); }} onDragLeave={() => setOver(null)} onDrop={drop(st)}>
              <div className="row between" style={{ padding: "2px 6px 10px" }}><span style={{ textTransform: "capitalize" }}>{st}</span><span className="muted small">{S.weeks.filter(w => w.status === st).length}</span></div>
              <div className="grid" style={{ gap: 10 }}>{S.weeks.filter(w => w.status === st).map(w => <React.Fragment key={w.id}>{Card({ w })}</React.Fragment>)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── research lab + benchmarks ───────────────────────── */
const MODEL_FIELDS = [
  { k: "name", label: "Name" }, { k: "company", label: "Company" }, { k: "category", label: "Category", type: "select", options: MODEL_CATS }, { k: "version", label: "Version" },
  { k: "dateTested", label: "Date tested", type: "date" }, { k: "status", label: "Status", type: "select", options: MODEL_STATUS }, { k: "cloud", label: "Local / cloud", type: "select", options: ["cloud", "local", "both"] }, { k: "vram", label: "VRAM if local (GB)" },
  { k: "useCase", label: "Use case", span: true },
  { k: "realism", label: "Realism 0-10", type: "number", min: 0, max: 10 }, { k: "motion", label: "Motion 0-10", type: "number", min: 0, max: 10 }, { k: "adherence", label: "Prompt adherence 0-10", type: "number", min: 0, max: 10 }, { k: "consistency", label: "Character consistency 0-10", type: "number", min: 0, max: 10 }, { k: "camera", label: "Camera control 0-10", type: "number", min: 0, max: 10 },
  { k: "speed", label: "Speed (e.g. 90s / 10s clip)" }, { k: "cost", label: "Cost (per clip or per hour)" }, { k: "failureRate", label: "Failure rate (%)" },
  { k: "links", label: "Links" }, { k: "screenshots", label: "Screenshot / video URL" }, { k: "notes", label: "Notes", type: "textarea", span: true }, { k: "favorite", label: "Favorite", type: "toggle" },
];
const blankModel = () => ({ id: uid(), name: "", company: "", category: "video", version: "", dateTested: todayISO(), status: "Watch", cloud: "cloud", vram: "", useCase: "", realism: 0, motion: 0, adherence: 0, consistency: 0, camera: 0, speed: "", cost: "", failureRate: "", links: "", screenshots: "", notes: "", favorite: false });

function ResearchLab({ S, update }) {
  const [q, setQ] = useState(""); const [cat, setCat] = useState("all"); const [st, setSt] = useState("all");
  const [edit, setEdit] = useState(null); const [cmp, setCmp] = useState([]);
  const list = S.models.filter(m => (cat === "all" || m.category === cat) && (st === "all" || m.status === st) && (m.name + m.company + m.useCase + m.notes).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => weightedScore(b, S.weights) - weightedScore(a, S.weights));
  const cmpModels = cmp.map(id => S.models.find(m => m.id === id)).filter(Boolean);
  const rows = [["Weighted", m => weightedScore(m, S.weights).toFixed(1)], ["Realism", m => m.realism], ["Motion", m => m.motion], ["Prompt adherence", m => m.adherence], ["Consistency", m => m.consistency], ["Camera control", m => m.camera], ["Speed", m => m.speed || "–"], ["Cost", m => m.cost || "–"], ["Failure rate", m => m.failureRate ? m.failureRate + "%" : "–"], ["Runs", m => m.cloud + (m.vram ? ` · ${m.vram} GB` : "")], ["Status", m => m.status]];
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="row between wrap">
        <div><h1>Research lab</h1><div className="muted">Every model and tool, scored on your own tests. Ranked by weighted score.</div></div>
        <button className="btn pri" onClick={() => setEdit(blankModel())}><Plus size={15} />Add model</button>
      </div>
      <div className="row wrap">
        <div className="row" style={{ flex: 1, minWidth: 220 }}><Search size={15} className="muted" /><input className="in" placeholder="Search name, company, use case, notes" value={q} onChange={e => setQ(e.target.value)} /></div>
        <select className="in" style={{ width: "auto" }} value={cat} onChange={e => setCat(e.target.value)}><option value="all">all categories</option>{MODEL_CATS.map(c => <option key={c}>{c}</option>)}</select>
        <select className="in" style={{ width: "auto" }} value={st} onChange={e => setSt(e.target.value)}><option value="all">all statuses</option>{MODEL_STATUS.map(c => <option key={c}>{c}</option>)}</select>
      </div>
      <Panel className="flat" style={{ padding: 0, overflowX: "auto" }}>
        <table className="tb">
          <thead><tr><th style={{ width: 36 }}>cmp</th><th></th><th>Model</th><th>Category</th><th>Weighted</th><th>Real</th><th>Mot</th><th>Adh</th><th>Cons</th><th>Cam</th><th>Speed</th><th>Cost</th><th>Fail</th><th>Runs</th><th>Tested</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {list.map(m => { const ws = weightedScore(m, S.weights); return (
              <tr key={m.id}>
                <td><input type="checkbox" checked={cmp.includes(m.id)} onChange={e => setCmp(c => e.target.checked ? [...c, m.id].slice(-3) : c.filter(x => x !== m.id))} /></td>
                <td><Star size={15} className={"star " + (m.favorite ? "on" : "")} onClick={() => update(s => { const x = s.models.find(y => y.id === m.id); x.favorite = !x.favorite; })} /></td>
                <td><div>{m.name} <span className="muted small">{m.version}</span></div><div className="muted small">{m.company} · {m.useCase}</div></td>
                <td><span className="tag">{m.category}</span></td>
                <td><b style={{ color: ws >= 7 ? "var(--lime)" : ws > 0 ? "var(--text)" : "var(--dim)" }}>{ws ? ws.toFixed(1) : "–"}</b></td>
                <td>{m.realism}</td><td>{m.motion}</td><td>{m.adherence}</td><td>{m.consistency}</td><td>{m.camera}</td>
                <td className="muted">{m.speed || "–"}</td><td className="muted">{m.cost || "–"}</td><td className="muted">{m.failureRate ? m.failureRate + "%" : "–"}</td>
                <td className="muted">{m.cloud}{m.vram ? ` ${m.vram}GB` : ""}</td><td className="muted">{m.dateTested ? fmtD(m.dateTested) : "–"}</td>
                <td><span className={"tag " + (m.status === "Adopt" ? "lime" : m.status === "Discard" ? "red" : "amber")}>{m.status}</span></td>
                <td><button className="btn sm ghost" onClick={() => setEdit(m)}><Pencil size={13} /></button></td>
              </tr>); })}
            {!list.length && <tr><td colSpan={17}><Empty>No models match. Add one or clear the filters.</Empty></td></tr>}
          </tbody>
        </table>
      </Panel>
      {cmpModels.length >= 2 && (
        <Panel title="Side-by-side" right={<button className="btn sm ghost" onClick={() => setCmp([])}>Clear</button>}>
          <table className="tb"><thead><tr><th></th>{cmpModels.map(m => <th key={m.id}>{m.name}</th>)}</tr></thead>
            <tbody>{rows.map(([label, fn]) => <tr key={label}><td className="muted">{label}</td>{cmpModels.map(m => <td key={m.id}>{fn(m)}</td>)}</tr>)}</tbody></table>
        </Panel>
      )}
      {cmpModels.length < 2 && <div className="muted small">Tick two or three models to compare them side by side.</div>}
      {edit && <Editor title={edit.name ? "Edit model" : "Add model"} fields={MODEL_FIELDS} value={edit}
        onSave={v => update(s => { const i = s.models.findIndex(m => m.id === v.id); i >= 0 ? s.models[i] = v : s.models.push(v); })}
        onDelete={S.models.some(m => m.id === edit.id) ? () => update(s => { s.models = s.models.filter(m => m.id !== edit.id); }) : null}
        onClose={() => setEdit(null)} />}
    </div>
  );
}

function Benchmarks({ S, update }) {
  const scored = S.models.filter(m => weightedScore(m, S.weights) > 0).sort((a, b) => weightedScore(b, S.weights) - weightedScore(a, S.weights));
  const data = scored.map(m => ({ name: m.name, score: +weightedScore(m, S.weights).toFixed(2) }));
  const keys = [["realism", "Realism"], ["motion", "Motion"], ["adherence", "Prompt adherence"], ["consistency", "Consistency"], ["camera", "Camera control"]];
  const tw = sum(Object.values(S.weights));
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div><h1>Benchmarks</h1><div className="muted">Weighted ranking of everything you've tested. Move the weights to match what the next job needs.</div></div>
      <div className="grid" style={{ gridTemplateColumns: "1fr 2fr" }}>
        <Panel title="Weights" right={<span className="muted small">sum {tw}</span>}>
          {keys.map(([k, l]) => <div key={k} style={{ marginBottom: 10 }}><div className="row between small"><span>{l}</span><span className="muted">{S.weights[k]}</span></div><input type="range" min="0" max="50" style={{ width: "100%", accentColor: "#5FE3E8" }} value={S.weights[k]} onChange={e => update(s => { s.weights[k] = Number(e.target.value); })} /></div>)}
          <button className="btn sm" onClick={() => update(s => { s.weights = { ...DEFAULT_WEIGHTS }; })}>Reset weights</button>
        </Panel>
        <Panel title="Ranking">
          {data.length ? <ResponsiveContainer width="100%" height={Math.max(160, data.length * 38)}>
            <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30 }}>
              <XAxis type="number" domain={[0, 10]} tick={{ fill: "#8A9199", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={130} tick={{ fill: "#E9EAEA", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip {...tip} cursor={{ fill: "rgba(255,255,255,.04)" }} />
              <Bar dataKey="score" fill="#5FE3E8" radius={[0, 4, 4, 0]} barSize={16} label={{ position: "right", fill: "#8A9199", fontSize: 11 }} />
            </BarChart>
          </ResponsiveContainer> : <Empty>Nothing scored yet. Give at least one model realism, motion, adherence, consistency and camera scores in the Research lab.</Empty>}
        </Panel>
      </div>
      <Panel title="Decision board">
        <div className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
          {MODEL_STATUS.map(st => <div key={st}><div className={"tag " + (st === "Adopt" ? "lime" : st === "Discard" ? "red" : "amber")} style={{ marginBottom: 8 }}>{st}</div>
            {S.models.filter(m => m.status === st).map(m => <div key={m.id} className="row between" style={{ padding: "6px 0", borderBottom: "1px solid var(--line)" }}><span>{m.name}</span><span className="muted small">{weightedScore(m, S.weights) ? weightedScore(m, S.weights).toFixed(1) : "–"}</span></div>)}
            {!S.models.filter(m => m.status === st).length && <div className="dim small">none</div>}</div>)}
        </div>
      </Panel>
    </div>
  );
}

/* ───────────────────────── creative roadmap ───────────────────────── */
const PROJECT_FIELDS = [
  { k: "title", label: "Title" }, { k: "type", label: "Type", type: "select", options: PROJECT_TYPES }, { k: "stage", label: "Stage", type: "select", options: PROJECT_STAGES }, { k: "due", label: "Deadline", type: "date" },
  { k: "brief", label: "Brief", type: "textarea", span: true }, { k: "references", label: "References (links)", type: "textarea" }, { k: "shotList", label: "Shot list", type: "textarea" },
  { k: "stack", label: "Model / tool stack" }, { k: "hours", label: "Time spent (h)", type: "number" }, { k: "estCost", label: "Estimated cost (€)", type: "number" }, { k: "actCost", label: "Actual cost (€)", type: "number" },
  { k: "video", label: "Final video URL", span: true }, { k: "lessons", label: "Lessons", type: "textarea", span: true }, { k: "portfolio", label: "Portfolio-ready", type: "toggle" },
];
const blankProject = () => ({ id: uid(), title: "", type: "experiment", stage: "idea", due: "", brief: "", references: "", shotList: "", stack: "", hours: 0, estCost: 0, actCost: 0, video: "", lessons: "", portfolio: false });

function Roadmap({ S, update }) {
  const [edit, setEdit] = useState(null); const [over, setOver] = useState(null); const [mode, setMode] = useState("kanban");
  const drop = (stage) => (e) => { const id = e.dataTransfer.getData("id"); update(s => { const p = s.projects.find(x => x.id === id); if (p) { p.stage = stage; if (stage === "portfolio") p.portfolio = true; } }); setOver(null); };
  const n = (st) => S.projects.filter(p => p.stage === st).length;
  const funnel = [["Experiments", S.projects.length], ["Finished pieces", n("finished") + n("portfolio")], ["Portfolio pieces", S.projects.filter(p => p.portfolio || p.stage === "portfolio").length]];
  const timeline = [...S.projects].filter(p => p.due).sort((a, b) => a.due.localeCompare(b.due));
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="row between wrap">
        <div><h1>Creative roadmap</h1><div className="muted">Experiments, studies, spec ads, narrative tests and hybrid shoots. Drag between stages.</div></div>
        <div className="row"><button className={"btn " + (mode === "kanban" ? "pri" : "")} onClick={() => setMode("kanban")}>Kanban</button><button className={"btn " + (mode === "timeline" ? "pri" : "")} onClick={() => setMode("timeline")}>Timeline</button><button className="btn pri" onClick={() => setEdit(blankProject())}><Plus size={15} />New project</button></div>
      </div>
      <Panel title="Funnel">
        <div className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
          {funnel.map(([l, v], i) => <div key={l}><div className="big" style={{ color: i === 2 ? "var(--lime)" : "var(--text)" }}>{v}</div><div className="muted small" style={{ marginTop: 4 }}>{l}</div><div className="bar" style={{ marginTop: 8 }}><i style={{ width: (funnel[0][1] ? (v / funnel[0][1]) * 100 : 0) + "%", background: i === 2 ? "var(--lime)" : "var(--cyan)" }} /></div></div>)}
        </div>
      </Panel>
      {mode === "kanban" ? (
        <div className="grid" style={{ gridTemplateColumns: "repeat(5,1fr)", alignItems: "start" }}>
          {PROJECT_STAGES.map(st => (
            <div key={st} className={"lane " + (over === st ? "over" : "")} onDragOver={e => { e.preventDefault(); setOver(st); }} onDragLeave={() => setOver(null)} onDrop={drop(st)}>
              <div className="row between" style={{ padding: "2px 6px 10px" }}><span style={{ textTransform: "capitalize" }}>{st}</span><span className="muted small">{n(st)}</span></div>
              <div className="grid" style={{ gap: 10 }}>
                {S.projects.filter(p => p.stage === st).map(p => (
                  <div key={p.id} className="wcard dragc" style={{ padding: 12 }} draggable onDragStart={e => e.dataTransfer.setData("id", p.id)} onDoubleClick={() => setEdit(p)}>
                    <div className="thumb" style={{ marginBottom: 8 }}>{p.video ? <video src={p.video} muted /> : p.type}</div>
                    <div className="row between"><span>{p.title}</span>{p.portfolio && <Star size={13} className="star on" />}</div>
                    <div className="muted small">{p.hours || 0}h · {money(p.actCost)}{p.estCost ? ` of ${money(p.estCost)}` : ""}{p.due ? ` · due ${fmtD(p.due)}` : ""}</div>
                    <button className="btn sm ghost" style={{ marginTop: 4 }} onClick={() => setEdit(p)}><Pencil size={12} />edit</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Panel title="Timeline" right={<span className="muted small">projects with a deadline</span>}>
          {timeline.length ? timeline.map(p => {
            const a = new Date("2026-09-14"), b = new Date("2026-12-31"), d = new Date(p.due + "T00:00:00");
            const x = Math.min(100, Math.max(0, ((d - a) / (b - a)) * 100));
            return <div key={p.id} className="row" style={{ gap: 14, padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
              <div style={{ width: 200 }}>{p.title}<div className="muted small">{p.stage} · {fmtD(p.due)}</div></div>
              <div style={{ flex: 1, position: "relative", height: 10, background: "rgba(255,255,255,.05)", borderRadius: 5 }}><div style={{ position: "absolute", left: x + "%", top: -3, width: 16, height: 16, borderRadius: 8, background: p.stage === "finished" || p.stage === "portfolio" ? "var(--lime)" : "var(--cyan)", transform: "translateX(-8px)" }} /></div>
            </div>;
          }) : <Empty>Add a deadline to a project and it appears here on the Sep–Dec line.</Empty>}
        </Panel>
      )}
      {edit && <Editor title={edit.title ? "Edit project" : "New project"} fields={PROJECT_FIELDS} value={edit}
        onSave={v => update(s => { const i = s.projects.findIndex(m => m.id === v.id); i >= 0 ? s.projects[i] = v : s.projects.push(v); })}
        onDelete={S.projects.some(m => m.id === edit.id) ? () => update(s => { s.projects = s.projects.filter(m => m.id !== edit.id); }) : null}
        onClose={() => setEdit(null)} />}
    </div>
  );
}

/* ───────────────────────── growth + jobs ───────────────────────── */
const METRIC_GROUPS = [
  ["Social", [["posts", "Posts"], ["reach", "Reach"], ["views", "Views"], ["watchTime", "Avg watch time (s)"], ["completion", "Completion rate (%)"], ["saves", "Saves"], ["shares", "Shares"], ["profileVisits", "Profile visits"], ["follows", "Follows"], ["qualifiedDMs", "Qualified DMs"]]],
  ["Website", [["visitors", "Visitors"], ["portfolioPlays", "Portfolio plays"], ["caseStudyViews", "Case-study views"], ["contactClicks", "Contact clicks"], ["inquiries", "Inquiries"]]],
  ["Jobs", [["leads", "Leads"], ["qualifiedLeads", "Qualified leads"], ["calls", "Calls"], ["proposals", "Proposals"], ["wins", "Wins"], ["losses", "Losses"], ["pipelineValue", "Pipeline value (€)"], ["bookedRevenue", "Booked revenue (€)"]]],
];
function Growth({ S, cur, update }) {
  const [wk, setWk] = useState(S.weeks[cur].id);
  const m = S.metrics[wk] || {};
  const set = (k, v) => update(s => { s.metrics[wk] = { ...(s.metrics[wk] || {}), [k]: v }; });
  const idx = S.weeks.findIndex(w => w.id === wk);
  const prev = idx > 0 ? S.metrics[S.weeks[idx - 1].id] : null;
  const conv = m.visitors ? ((Number(m.inquiries) || 0) / Number(m.visitors) * 100).toFixed(1) + "%" : "–";
  const avgProj = m.wins ? money((Number(m.bookedRevenue) || 0) / Number(m.wins)) : "–";
  const series = S.weeks.map(w => ({ n: "W" + w.n, ...(S.metrics[w.id] || {}) }));
  const months = ["Sep", "Oct", "Nov", "Dec"].map(mo => { const ws = S.weeks.filter(w => monthOf(w.start) === mo); const g = k => sum(ws.map(w => (S.metrics[w.id] || {})[k])); return { mo, reach: g("reach"), qualified: g("qualifiedLeads"), wins: g("wins"), booked: g("bookedRevenue") }; });
  const D = ({ k }) => { if (!prev) return null; const d = (Number(m[k]) || 0) - (Number(prev[k]) || 0); if (!d) return <span className="dim delta">±0</span>; return <span className={"delta " + (d > 0 ? "up" : "dn")}>{d > 0 ? "+" : ""}{d}</span>; };
  const northStar = sum(Object.values(S.metrics).map(x => x.qualifiedLeads)) + sum(Object.values(S.metrics).map(x => x.qualifiedDMs));
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="row between wrap">
        <div><h1>Growth &amp; jobs</h1><div className="muted">North star: qualified opportunities generated from AI/hybrid positioning.</div></div>
        <div className="row"><span className="muted small">week</span><select className="in" style={{ width: "auto" }} value={wk} onChange={e => setWk(e.target.value)}>{S.weeks.map(w => <option key={w.id} value={w.id}>W{w.n} · {fmtD(w.start)}–{fmtD(w.end)}</option>)}</select></div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
        <Panel className="flat"><div className="big" style={{ color: "var(--lime)" }}>{northStar}</div><div className="muted small" style={{ marginTop: 4 }}>qualified opportunities, Sep–Dec</div></Panel>
        <Panel className="flat"><div className="big">{conv}</div><div className="muted small" style={{ marginTop: 4 }}>site conversion this week</div></Panel>
        <Panel className="flat"><div className="big">{avgProj}</div><div className="muted small" style={{ marginTop: 4 }}>average project value this week</div></Panel>
        <Panel className="flat"><div className="big">{money(sum(Object.values(S.metrics).map(x => x.pipelineValue)))}</div><div className="muted small" style={{ marginTop: 4 }}>pipeline, all weeks</div></Panel>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        {METRIC_GROUPS.map(([g, fields]) => (
          <Panel key={g} title={g} right={<span className="muted small">vs previous week</span>}>
            {fields.map(([k, l]) => <div key={k} className="row between" style={{ marginBottom: 6 }}><span className="muted small" style={{ flex: 1 }}>{l}</span><D k={k} /><input className="in" type="number" style={{ width: 96 }} value={m[k] ?? ""} onChange={e => set(k, Number(e.target.value))} /></div>)}
            {g === "Jobs" && <div className="row between" style={{ marginTop: 6 }}><span className="muted small" style={{ flex: 1 }}>Main source</span><input className="in" style={{ width: 160 }} placeholder="Instagram, referral…" value={m.source ?? ""} onChange={e => set("source", e.target.value)} /></div>}
          </Panel>
        ))}
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Panel title="Week over week" right={<span className="muted small">reach, views, qualified leads</span>}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={series} margin={{ left: -10, right: 8, top: 8 }}>
              <CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} />
              <XAxis dataKey="n" tick={{ fill: "#8A9199", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#8A9199", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...tip} />
              <Line type="monotone" dataKey="reach" stroke="#5FE3E8" strokeWidth={2} dot={false} name="Reach" />
              <Line type="monotone" dataKey="views" stroke="#B9A6FF" strokeWidth={2} dot={false} name="Views" />
              <Line type="monotone" dataKey="qualifiedLeads" stroke="#C6F04C" strokeWidth={2} dot={{ r: 3 }} name="Qualified leads" />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Month over month" right={<span className="muted small">qualified leads, wins, booked €</span>}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={months} margin={{ left: -10, right: 8, top: 8 }}>
              <CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} />
              <XAxis dataKey="mo" tick={{ fill: "#8A9199", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="l" tick={{ fill: "#8A9199", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="r" orientation="right" tick={{ fill: "#8A9199", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...tip} cursor={{ fill: "rgba(255,255,255,.04)" }} />
              <Bar yAxisId="l" dataKey="qualified" fill="#C6F04C" name="Qualified leads" radius={[3, 3, 0, 0]} />
              <Bar yAxisId="l" dataKey="wins" fill="#5FE3E8" name="Wins" radius={[3, 3, 0, 0]} />
              <Bar yAxisId="r" dataKey="booked" fill="#F2C56B" name="Booked €" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </div>
  );
}

/* ───────────────────────── workflow & IP library ───────────────────────── */
const LIB_FIELDS = [
  { k: "title", label: "Title" }, { k: "section", label: "Section", type: "select", options: LIB_SECTIONS }, { k: "tags", label: "Tags (comma separated)" }, { k: "rating", label: "Rating 0-5", type: "number", min: 0, max: 5 },
  { k: "body", label: "Prompt / settings / how-to", type: "textarea", span: true }, { k: "result", label: "Result", type: "textarea" }, { k: "failure", label: "Failure notes", type: "textarea" },
  { k: "screenshots", label: "Screenshot / video URL", span: true }, { k: "reusable", label: "Reusable", type: "toggle" },
];
const blankLib = (section) => ({ id: uid(), title: "", section, tags: "", rating: 0, body: "", result: "", failure: "", screenshots: "", reusable: false });
function LibraryView({ S, update }) {
  const [sec, setSec] = useState("all"); const [q, setQ] = useState(""); const [tag, setTag] = useState(""); const [edit, setEdit] = useState(null); const [reusableOnly, setRO] = useState(false);
  const tags = [...new Set(S.library.flatMap(i => i.tags.split(",").map(t => t.trim()).filter(Boolean)))];
  const items = S.library.filter(i => (sec === "all" || i.section === sec) && (!tag || i.tags.includes(tag)) && (!reusableOnly || i.reusable) && (i.title + i.body + i.result + i.tags).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="row between wrap">
        <div><h1>Workflow &amp; IP library</h1><div className="muted">{S.library.length} entries · {S.library.filter(i => i.reusable).length} reusable. This is the asset you're building.</div></div>
        <button className="btn pri" onClick={() => setEdit(blankLib(sec === "all" ? LIB_SECTIONS[0] : sec))}><Plus size={15} />Add entry</button>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "220px 1fr", alignItems: "start" }}>
        <Panel className="flat" style={{ padding: 8 }}>
          <button className={"section-btn " + (sec === "all" ? "on" : "")} onClick={() => setSec("all")}>All sections</button>
          {LIB_SECTIONS.map(s => <button key={s} className={"section-btn " + (sec === s ? "on" : "")} onClick={() => setSec(s)}><span className="row between">{s}<span className="dim small">{S.library.filter(i => i.section === s).length || ""}</span></span></button>)}
        </Panel>
        <div className="grid" style={{ gap: 12 }}>
          <div className="row wrap">
            <div className="row" style={{ flex: 1, minWidth: 200 }}><Search size={15} className="muted" /><input className="in" placeholder="Search prompts, results, tags" value={q} onChange={e => setQ(e.target.value)} /></div>
            <button className={"btn " + (reusableOnly ? "pri" : "")} onClick={() => setRO(!reusableOnly)}>Reusable only</button>
          </div>
          {tags.length > 0 && <div className="row wrap" style={{ gap: 6 }}>{tags.map(t => <button key={t} className={"tag " + (tag === t ? "cyan" : "")} style={{ cursor: "pointer", background: "none" }} onClick={() => setTag(tag === t ? "" : t)}>{t}</button>)}</div>}
          {items.map(i => (
            <Panel key={i.id} className="flat">
              <div className="row between wrap">
                <div><span style={{ fontSize: 15 }}>{i.title}</span> <span className="muted small">· {i.section}</span></div>
                <div className="row"><span className="muted small">{"★".repeat(i.rating)}{"☆".repeat(5 - i.rating)}</span>{i.reusable && <span className="tag lime">reusable</span>}<button className="btn sm ghost" onClick={() => setEdit(i)}><Pencil size={13} /></button></div>
              </div>
              {i.body && <pre style={{ whiteSpace: "pre-wrap", font: "inherit", margin: "10px 0 0", padding: 10, background: "#111315", borderRadius: 8, fontSize: 13 }}>{i.body}</pre>}
              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 8 }}>
                {i.result && <div className="small"><span className="muted">Result: </span>{i.result}</div>}
                {i.failure && <div className="small"><span className="muted">Fails: </span>{i.failure}</div>}
              </div>
              {i.screenshots && <a className="tag cyan" style={{ marginTop: 8, display: "inline-block" }} href={i.screenshots} target="_blank" rel="noreferrer">open media</a>}
              {i.tags && <div className="row wrap" style={{ gap: 4, marginTop: 8 }}>{i.tags.split(",").map(t => t.trim()).filter(Boolean).map(t => <span key={t} className="tag">{t}</span>)}</div>}
            </Panel>
          ))}
          {!items.length && <Empty>Nothing here yet. Every test that works, or fails usefully, becomes an entry.</Empty>}
        </div>
      </div>
      {edit && <Editor title={edit.title ? "Edit entry" : "Add entry"} fields={LIB_FIELDS} value={edit}
        onSave={v => update(s => { const i = s.library.findIndex(m => m.id === v.id); i >= 0 ? s.library[i] = v : s.library.push(v); })}
        onDelete={S.library.some(m => m.id === edit.id) ? () => update(s => { s.library = s.library.filter(m => m.id !== edit.id); }) : null}
        onClose={() => setEdit(null)} />}
    </div>
  );
}

/* ───────────────────────── weekly review ───────────────────────── */
function ReviewModal({ S, weekId, update, onClose }) {
  const w = S.weeks.find(x => x.id === weekId);
  const [r, setR] = useState(() => ({ scores: [...w.scores], win: "", fail: "", learned: "", stop: "", artifact: "", hours: 0, spent: 0, decision: "Watch", decisionOn: "", bottleneck: "", ...(S.reviews[weekId] || {}) }));
  const set = (k, v) => setR(s => ({ ...s, [k]: v }));
  const t = total(r);
  const save = () => {
    const summary = `W${w.n} ${t}/20 · win: ${r.win || "–"} · learned: ${r.learned || "–"} · ${r.decision}${r.decisionOn ? " " + r.decisionOn : ""} · next bottleneck: ${r.bottleneck || "–"}`;
    update(s => { const x = s.weeks.find(y => y.id === weekId); x.scores = [...r.scores]; if (t > 0) x.status = "done"; s.reviews[weekId] = { ...r, summary, savedAt: todayISO() }; });
    onClose();
  };
  return (
    <Modal title={`Sunday review · week ${w.n}: ${w.theme}`} onClose={onClose}>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", marginBottom: 14 }}>
        {TRACKS.map((tr, i) => <div key={tr.key} className="panel flat" style={{ padding: 12 }}><div className="row between" style={{ marginBottom: 6 }}><span>{tr.name}</span><span className="muted small">{SCORE_LABELS[r.scores[i]]}</span></div><Steps value={r.scores[i]} color={tr.color} onChange={n => set("scores", r.scores.map((v, k) => k === i ? n : v))} /></div>)}
      </div>
      <div className="row between" style={{ marginBottom: 14 }}><span className="muted">Week total</span><ScorePill t={t} /></div>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Field label="Biggest win"><textarea className="in" value={r.win} onChange={e => set("win", e.target.value)} /></Field>
        <Field label="Biggest failure"><textarea className="in" value={r.fail} onChange={e => set("fail", e.target.value)} /></Field>
        <Field label="What I learned"><textarea className="in" value={r.learned} onChange={e => set("learned", e.target.value)} /></Field>
        <Field label="What I will stop doing"><textarea className="in" value={r.stop} onChange={e => set("stop", e.target.value)} /></Field>
        <Field label="Best artifact (link or name)"><input className="in" value={r.artifact} onChange={e => set("artifact", e.target.value)} /></Field>
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <Field label="Time spent (h)"><input className="in" type="number" value={r.hours} onChange={e => set("hours", Number(e.target.value))} /></Field>
          <Field label="Money spent (€)"><input className="in" type="number" value={r.spent} onChange={e => set("spent", Number(e.target.value))} /></Field>
        </div>
        <Field label="One decision"><div className="row"><select className="in" style={{ width: 120 }} value={r.decision} onChange={e => set("decision", e.target.value)}>{MODEL_STATUS.map(x => <option key={x}>{x}</option>)}</select><input className="in" placeholder="what, exactly" value={r.decisionOn} onChange={e => set("decisionOn", e.target.value)} /></div></Field>
        <Field label="Next week's bottleneck"><input className="in" value={r.bottleneck} onChange={e => set("bottleneck", e.target.value)} /></Field>
      </div>
      <div className="row between" style={{ marginTop: 18 }}><span className="muted small">Saving marks the week done and writes the summary card.</span><div className="row"><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" onClick={save}><Check size={14} />Save review</button></div></div>
    </Modal>
  );
}

/* ───────────────────────── year review ───────────────────────── */
function YearReview({ S }) {
  const scored = S.weeks.filter(w => total(w) > 0);
  const avg = scored.length ? sum(scored.map(total)) / scored.length : 0;
  const best = [...scored].sort((a, b) => total(b) - total(a)).slice(0, 3);
  const reviews = Object.values(S.reviews);
  const adopted = S.models.filter(m => m.status === "Adopt"), dropped = S.models.filter(m => m.status === "Discard");
  const portfolio = S.projects.filter(p => p.portfolio || p.stage === "portfolio");
  const hours = sum(reviews.map(r => r.hours)) + sum(S.projects.map(p => p.hours)), spent = sum(reviews.map(r => r.spent)) + sum(S.projects.map(p => p.actCost));
  const booked = sum(Object.values(S.metrics).map(m => m.bookedRevenue)), qualified = sum(Object.values(S.metrics).map(m => m.qualifiedLeads)) + sum(Object.values(S.metrics).map(m => m.qualifiedDMs));
  const trackAvg = TRACKS.map((t, i) => scored.length ? (sum(scored.map(w => w.scores[i])) / scored.length).toFixed(1) : "–");
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="row between wrap noprint"><div><h1>Year review</h1><div className="muted">Sep 14 – Dec 31, 2026. Print it, keep it.</div></div><button className="btn pri" onClick={() => window.print()}><Printer size={15} />Print</button></div>
      <Panel>
        <h1 className="serif" style={{ fontSize: 36 }}>AI Filmmaker Evolution, autumn 2026</h1>
        <div className="muted" style={{ marginTop: 6 }}>{S.owner} · {scored.length} of 16 weeks scored · average {avg.toFixed(1)}/20 · {scored.filter(w => total(w) >= 15).length} weeks on target</div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginTop: 18 }}>
          {TRACKS.map((t, i) => <div key={t.key}><div className="big" style={{ color: t.color }}>{trackAvg[i]}</div><div className="muted small">{t.name} avg /5</div></div>)}
        </div>
      </Panel>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Panel title="Did learning turn into capability?">
          <div className="kv">
            <span>Portfolio-ready pieces</span><span>{portfolio.length}</span>
            <span>Finished pieces</span><span>{S.projects.filter(p => ["finished", "portfolio"].includes(p.stage)).length} of {S.projects.length}</span>
            <span>Reusable library entries</span><span>{S.library.filter(i => i.reusable).length} of {S.library.length}</span>
            <span>Models adopted</span><span>{adopted.map(m => m.name).join(", ") || "–"}</span>
            <span>Models dropped</span><span>{dropped.map(m => m.name).join(", ") || "–"}</span>
          </div>
        </Panel>
        <Panel title="Did it improve the business?">
          <div className="kv">
            <span>Qualified opportunities</span><span>{qualified}</span>
            <span>Booked revenue</span><span>{money(booked)}</span>
            <span>Hours invested</span><span>{hours}</span>
            <span>Money invested</span><span>{money(spent)}</span>
            <span>Return per hour</span><span>{hours ? money(booked / hours) : "–"}</span>
          </div>
        </Panel>
      </div>
      <Panel title="Best weeks">{best.length ? best.map(w => <div key={w.id} className="row between" style={{ padding: "6px 0", borderBottom: "1px solid var(--line)" }}><span>W{w.n} · {w.theme}</span><ScorePill t={total(w)} /></div>) : <Empty>Score some weeks first.</Empty>}</Panel>
      <Panel title="Lessons, week by week">{reviews.length ? S.weeks.filter(w => S.reviews[w.id]).map(w => { const r = S.reviews[w.id]; return <div key={w.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}><div>W{w.n} · {w.theme} <span className="muted small">{total(w)}/20 · {r.decision}{r.decisionOn ? " " + r.decisionOn : ""}</span></div>{r.learned && <div className="small">Learned: {r.learned}</div>}{r.stop && <div className="small muted">Stopped: {r.stop}</div>}</div>; }) : <Empty>Weekly reviews collect here.</Empty>}</Panel>
      <Panel title="2027 watchlist">{S.library.filter(i => i.section === "2027 Watchlist").map(i => <div key={i.id} style={{ padding: "4px 0" }}>{i.title}<span className="muted small"> · {i.body.slice(0, 120)}</span></div>)}{!S.library.some(i => i.section === "2027 Watchlist") && <Empty>Add entries to the "2027 Watchlist" section of the library.</Empty>}</Panel>
    </div>
  );
}

/* ───────────────────────── settings ───────────────────────── */
function toCSV(rows) { if (!rows.length) return ""; const keys = [...new Set(rows.flatMap(r => Object.keys(r)))]; const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`; return [keys.join(","), ...rows.map(r => keys.map(k => esc(Array.isArray(r[k]) ? r[k].join("|") : r[k])).join(","))].join("\n"); }
function dl(name, text, type = "text/plain") { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); URL.revokeObjectURL(a.href); }
function SettingsView({ S, update, setS }) {
  const fileRef = useRef(); const [msg, setMsg] = useState("");
  const importJSON = (e) => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { try { const d = JSON.parse(rd.result); if (!d.weeks) throw new Error("no weeks"); setS({ ...seed(), ...d }); setMsg("Imported " + f.name); } catch { setMsg("That file isn't an export from this dashboard."); } }; rd.readAsText(f); e.target.value = ""; };
  const metricsRows = S.weeks.map(w => ({ week: w.n, start: w.start, ...(S.metrics[w.id] || {}) }));
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div><h1>Settings</h1><div className="muted">Goals, weights, data in and out.</div></div>
      <Panel title="Four-track goals for December">
        {S.goals.map((g, i) => <div key={i} className="row" style={{ marginBottom: 8, alignItems: "flex-start" }}><span className="tag" style={{ color: TRACKS[i].color, marginTop: 6 }}>{TRACKS[i].name}</span><textarea className="in" style={{ minHeight: 48 }} value={g} onChange={e => update(s => { s.goals[i] = e.target.value; })} /></div>)}
        <Field label="Owner"><input className="in" style={{ width: 200 }} value={S.owner} onChange={e => update(s => { s.owner = e.target.value; })} /></Field>
      </Panel>
      <Panel title="Export">
        <div className="row wrap">
          <button className="btn" onClick={() => dl("afes-backup.json", JSON.stringify(S, null, 2), "application/json")}><Download size={14} />Full backup (JSON)</button>
          <button className="btn" onClick={() => dl("weeks.csv", toCSV(S.weeks.map(w => ({ ...w, research: w.scores[0], creative: w.scores[1], growth: w.scores[2], workflow: w.scores[3], total: total(w) }))), "text/csv")}><Download size={14} />Weeks CSV</button>
          <button className="btn" onClick={() => dl("models.csv", toCSV(S.models.map(m => ({ ...m, weighted: weightedScore(m, S.weights).toFixed(2) }))), "text/csv")}><Download size={14} />Models CSV</button>
          <button className="btn" onClick={() => dl("projects.csv", toCSV(S.projects), "text/csv")}><Download size={14} />Projects CSV</button>
          <button className="btn" onClick={() => dl("metrics.csv", toCSV(metricsRows), "text/csv")}><Download size={14} />Metrics CSV</button>
          <button className="btn" onClick={() => dl("library.csv", toCSV(S.library), "text/csv")}><Download size={14} />Library CSV</button>
        </div>
      </Panel>
      <Panel title="Import">
        <div className="row wrap"><button className="btn" onClick={() => fileRef.current.click()}><Upload size={14} />Import JSON backup</button><input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }} onChange={importJSON} /><span className="muted small">{msg || "Replaces everything with the backup's contents."}</span></div>
      </Panel>
      <Panel title="Reset">
        <div className="row wrap"><button className="btn danger" onClick={() => { if (window.confirm("Reset everything to the seed data? Export a backup first if you want to keep anything.")) setS(seed()); }}><Trash2 size={14} />Reset to seed data</button><span className="muted small">Data lives in this app's storage; a backup is the only copy outside it.</span></div>
      </Panel>
    </div>
  );
}

/* ───────────────────────── app ───────────────────────── */
const NAV = [["dash", "Dashboard", LayoutDashboard], ["map", "Weekly map", Map], ["lab", "Research lab", FlaskConical], ["roadmap", "Creative roadmap", Clapperboard], ["growth", "Growth & jobs", TrendingUp], ["library", "Workflow library", Library], ["bench", "Benchmarks", Trophy], ["year", "Year review", BookOpen], ["settings", "Settings", SettingsIcon]];

export default function App({ user, onSignOut }) {
  const [S, setS] = useState(null);
  const [sync, setSync] = useState("idle"); // idle | saving | saved | error
  const remote = useRef(null);
  const [view, setView] = useState("dash");
  const [review, setReview] = useState(null);
  const timer = useRef();
  useEffect(() => {
    let off = () => {};
    loadState(user.id).then(d => { const st = d && d.weeks ? { ...seed(), ...d } : seed(); remote.current = JSON.stringify(st); setS(st); })
      .catch(() => { remote.current = null; setS(seed()); setSync("error"); });
    off = subscribe(user.id, d => { const j = JSON.stringify(d); if (j !== remote.current) { remote.current = j; setS(d); } });
    const onVis = () => document.visibilityState === "visible" && loadState(user.id).then(d => { if (d) { const j = JSON.stringify(d); if (j !== remote.current) { remote.current = j; setS(d); } } }).catch(() => {});
    document.addEventListener("visibilitychange", onVis);
    return () => { off(); document.removeEventListener("visibilitychange", onVis); };
  }, [user.id]);
  useEffect(() => {
    if (!S) return; const j = JSON.stringify(S); if (j === remote.current) return;
    clearTimeout(timer.current); setSync("saving");
    timer.current = setTimeout(() => saveState(user.id, S).then(() => { remote.current = j; setSync("saved"); }).catch(() => setSync("error")), 500);
  }, [S, user.id]);
  const update = (fn) => setS(prev => { const next = JSON.parse(JSON.stringify(prev)); fn(next); return next; });
  const today = todayISO();
  const cur = useMemo(() => { if (!S) return 0; const i = S.weeks.findIndex(w => w.end >= today); return i < 0 ? S.weeks.length - 1 : i; }, [S, today]);
  if (!S) return <div className="afes" style={{ alignItems: "center", justifyContent: "center" }}><style>{CSS}</style><span className="muted">Loading your system…</span></div>;
  const w = S.weeks[cur];
  const streak = (() => { let n = 0; for (let i = cur - (total(w) > 0 ? 0 : 1); i >= 0; i--) { if (total(S.weeks[i]) >= 15) n++; else break; } return n; })();
  const daysToStart = Math.ceil((new Date(w.start) - new Date(today)) / 86400000);
  const nextDeadline = S.projects.filter(p => p.due && p.due >= today && !["finished", "portfolio"].includes(p.stage)).sort((a, b) => a.due.localeCompare(b.due))[0];
  const props = { S, cur, update, setS, openReview: setReview, go: setView };
  const V = { dash: Dashboard, map: WeeklyMap, lab: ResearchLab, roadmap: Roadmap, growth: Growth, library: LibraryView, bench: Benchmarks, year: YearReview, settings: SettingsView }[view];
  return (
    <div className="afes">
      <style>{CSS}</style>
      <aside className="side">
        <div className="brand"><div className="t">AI Filmmaker Evolution</div><div className="s">Sep – Dec 2026 · {S.owner}</div></div>
        {NAV.map(([id, label, Icon]) => <button key={id} className={"nav " + (view === id ? "on" : "")} onClick={() => setView(id)}><Icon size={16} /><span>{label}</span></button>)}
        <div style={{ flex: 1 }} />
        <div className="nav" style={{ cursor: "default", fontSize: 12 }} title={user.email}>{sync === "error" ? <CloudOff size={15} style={{ color: "var(--red)" }} /> : <Cloud size={15} style={{ color: sync === "saving" ? "var(--amber)" : "var(--lime)" }} />}<span>{sync === "saving" ? "Saving…" : sync === "error" ? "Not synced" : "Synced"}</span></div>
        <button className="nav" onClick={onSignOut}><LogOut size={16} /><span>Sign out</span></button>
      </aside>
      <div className="main">
        <header className="top">
          <div><div className="k">current week</div><div className="v">W{w.n} · {fmtD(w.start)}–{fmtD(w.end)}{daysToStart > 0 && <span className="muted small"> · starts in {daysToStart}d</span>}</div></div>
          <div><div className="k">4-track score</div><div className="v"><ScorePill t={total(w)} /></div></div>
          <div><div className="k">streak at 15+</div><div className="v">{streak} {streak === 1 ? "week" : "weeks"}</div></div>
          <div style={{ flex: 1, minWidth: 200 }}><div className="k">active challenge</div><div className="v" style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.challenge}</div></div>
          <div><div className="k">next deadline</div><div className="v">{nextDeadline ? `${fmtD(nextDeadline.due)} · ${nextDeadline.title}` : `${fmtD(w.end)} · week ${w.n} review`}</div></div>
        </header>
        <main className="content"><V {...props} /></main>
      </div>
      {review && <ReviewModal S={S} weekId={review} update={update} onClose={() => setReview(null)} />}
    </div>
  );
}
