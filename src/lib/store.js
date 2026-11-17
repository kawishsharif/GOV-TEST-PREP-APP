// Persistent state. Everything is namespaced per exam so new exam packs can be added later
// without touching existing progress. Storage: localStorage (works offline, survives restarts).
import { dayKey, addDays, debounce } from './util.js';

const PREFIX = 'learnlead:v1:';
const GLOBAL_KEY = PREFIX + 'global';
const examKey = (id) => PREFIX + 'exam:' + id;
const LOG_CAP = 25000; // attempt log entries kept (older ones are summarised in stats already)

const safeGet = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const safeSet = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); return true; }
  catch (e) { console.warn('Save failed', e); return false; }
};

// ---------------- global (app-wide) ----------------
const GLOBAL_DEFAULTS = { theme: 'system', lastExam: null, aiProvider: 'claude', aiKeys: {}, aiModels: {}, installedAt: Date.now() };
export const global = Object.assign({}, GLOBAL_DEFAULTS, safeGet(GLOBAL_KEY) || {});
// Migrate the single Claude key stored by earlier versions.
if (global.aiKey) { global.aiKeys = { ...global.aiKeys, claude: global.aiKeys?.claude || global.aiKey }; delete global.aiKey; delete global.aiModel; }
export const saveGlobal = () => { safeSet(GLOBAL_KEY, global); notify(); };

// ---------------- per exam ----------------
export function defaultSettings(exam) {
  const sectionWeights = {}, topicWeights = {};
  for (const s of exam.sections) {
    sectionWeights[s.id] = s.weight;
    for (const t of s.topics) topicWeights[t.id] = t.weight;
  }
  return {
    testDate: addDays(dayKey(), 45),
    dailyTarget: 50,
    totalQuestions: exam.pattern.totalQuestions,
    minutes: exam.pattern.minutes,
    negativeMarking: exam.pattern.negativeMarking,
    negativeValue: exam.pattern.negativeValue,
    passPercent: exam.pattern.passPercent ?? 50,
    sectionWeights,
    topicWeights,
    track: 'islamiat',
    shuffleOptions: true,
  };
}

function freshExamState(exam) {
  return {
    v: 1,
    settings: defaultSettings(exam),
    qstats: {},   // qid -> {n, c, last, ok}
    tstats: {},   // topicId -> {n, c}
    daily: {},    // YYYY-MM-DD -> {n, c, ms}
    log: [],      // [{t, q, ok, ms, m}] m: p=practice, m=mock, r=mistake retry, n=numerical
    mistakes: {}, // qid -> {added, wrong, rights: [day,...]}
    cleared: 0,
    srs: {},      // cardId -> {due, ivl, ease, reps, lapses}
    mocks: [],    // finished mock results
    activeMock: null,
    activePractice: null,
    plan: null,
    custom: [],   // imported questions
    ai: [],       // AI-generated questions
  };
}

const cache = new Map();

// ---------------- change notifications (React subscribes via useSyncExternalStore) ----------------
let version = 0;
const listeners = new Set();
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const getVersion = () => version;
export function notify() { version++; listeners.forEach((f) => f()); }

export function examState(exam) {
  if (cache.has(exam.id)) return cache.get(exam.id);
  const stored = safeGet(examKey(exam.id));
  const st = Object.assign(freshExamState(exam), stored || {});
  // Merge in any settings keys added in newer versions of the exam pack.
  const def = defaultSettings(exam);
  st.settings = Object.assign({}, def, st.settings || {});
  st.settings.sectionWeights = Object.assign({}, def.sectionWeights, st.settings.sectionWeights);
  st.settings.topicWeights = Object.assign({}, def.topicWeights, st.settings.topicWeights);
  cache.set(exam.id, st);
  return st;
}

const pending = new Set();
const flushNow = () => {
  for (const id of pending) {
    const st = cache.get(id);
    if (st) {
      if (st.log.length > LOG_CAP) st.log = st.log.slice(-LOG_CAP);
      if (!safeSet(examKey(id), st)) {
        // Storage full: trim the attempt log first, then retry once.
        st.log = st.log.slice(-Math.floor(st.log.length / 2));
        safeSet(examKey(id), st);
      }
    }
  }
  pending.clear();
};
const flushSoon = debounce(flushNow, 250);
export function save(examId) { pending.add(examId); flushSoon(); notify(); }
export function saveNow(examId) { pending.add(examId); flushNow(); notify(); }
addEventListener('pagehide', flushNow);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushNow(); });

export function resetExam(exam) {
  cache.delete(exam.id);
  localStorage.removeItem(examKey(exam.id));
  notify();
}

// ---------------- recording attempts ----------------
/**
 * Record one answered question. Handles stats, daily totals and the mistake notebook rule:
 * a question leaves the notebook only after two correct answers on two different days
 * (a wrong answer in between resets that count).
 */
export function recordAttempt(exam, q, ok, ms = 0, mode = 'p') {
  const st = examState(exam);
  const now = Date.now();
  const today = dayKey();
  const qs = (st.qstats[q.id] ||= { n: 0, c: 0, last: 0, ok: false });
  qs.n++; if (ok) qs.c++; qs.last = now; qs.ok = ok;
  const ts = (st.tstats[q.topic] ||= { n: 0, c: 0 });
  ts.n++; if (ok) ts.c++;
  const dd = (st.daily[today] ||= { n: 0, c: 0, ms: 0 });
  dd.n++; if (ok) dd.c++; dd.ms += Math.min(ms, 10 * 60000);
  st.log.push({ t: now, q: q.id, ok: ok ? 1 : 0, ms: Math.round(ms), m: mode });

  let mistakeEvent = null;
  if (q.source === 'template') { save(exam.id); return null; } // generated variants are one-off
  if (!ok) {
    const m = st.mistakes[q.id];
    st.mistakes[q.id] = { added: m?.added || now, wrong: (m?.wrong || 0) + 1, rights: [] };
    mistakeEvent = m ? 'again' : 'added';
  } else if (st.mistakes[q.id]) {
    const m = st.mistakes[q.id];
    if (!m.rights.includes(today)) m.rights.push(today);
    if (m.rights.length >= 2) { delete st.mistakes[q.id]; st.cleared = (st.cleared || 0) + 1; mistakeEvent = 'cleared'; }
    else mistakeEvent = 'progress';
  }
  save(exam.id);
  return mistakeEvent;
}

// ---------------- backup ----------------
export function exportAll() {
  const out = { app: 'learn-and-lead', format: 1, exportedAt: new Date().toISOString(), global: { ...global, aiKeys: {} }, exams: {} }; // API keys never leave the device
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith(PREFIX + 'exam:')) {
      const id = k.slice((PREFIX + 'exam:').length);
      out.exams[id] = cache.get(id) || safeGet(k);
    }
  }
  return out;
}
export function importAll(data) {
  if (!data || data.app !== 'learn-and-lead' || typeof data.exams !== 'object') throw new Error('This is not a Learn & Lead backup file.');
  for (const [id, st] of Object.entries(data.exams)) {
    if (!st || typeof st !== 'object') continue;
    cache.delete(id);
    safeSet(examKey(id), st);
  }
  if (data.global) {
    const keys = global.aiKeys; // keys are never in backups; keep the ones on this device
    const { aiKey: _old, ...rest } = data.global;
    Object.assign(global, rest, { aiKeys: keys });
    saveGlobal();
  }
  notify();
  return Object.keys(data.exams).length;
}
