// Loads exam packs (config, questions, notes, flashcards) and builds fast lookup indexes.
const BASE = import.meta.env.BASE_URL;
const examCache = new Map();
let registry = null;

async function getJSON(url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
}

export async function loadRegistry() {
  if (!registry) registry = await getJSON(BASE + 'exams/index.json');
  return registry;
}

/** Load an exam pack. Questions from the pack are merged with imported and AI questions at query time. */
export async function loadExam(id) {
  if (examCache.has(id)) return examCache.get(id);
  const reg = await loadRegistry();
  const entry = reg.exams.find((e) => e.id === id);
  if (!entry) throw new Error('Unknown exam: ' + id);
  const base = BASE + entry.path;
  const cfg = await getJSON(base + 'exam.json');
  const files = cfg.files || {};
  const [qsets, notes, strategy] = await Promise.all([
    Promise.all((files.questions || []).map((f) => getJSON(`${base}questions/${f}.json`).catch(() => []))),
    Promise.all((files.notes || []).map((f) => getJSON(`${base}notes/${f}.json`).catch(() => null))),
    files.strategy ? getJSON(base + files.strategy).catch(() => null) : null,
  ]);
  const exam = {
    ...cfg,
    entry,
    base,
    questions: qsets.flat(),
    notes: Object.fromEntries(notes.filter(Boolean).map((n) => [n.topic, n])),
    strategy,
  };
  exam.topicIndex = {};
  exam.sectionOfTopic = {};
  for (const s of exam.sections) for (const t of s.topics) { exam.topicIndex[t.id] = t; exam.sectionOfTopic[t.id] = s.id; }
  exam.sectionIndex = Object.fromEntries(exam.sections.map((s) => [s.id, s]));
  examCache.set(id, exam);
  return exam;
}

/** All questions available to this user: pack + imported + AI-generated. Cached per state revision. */
export function allQuestions(exam, st) {
  const key = `${exam.questions.length}|${st.custom.length}|${st.ai.length}`;
  if (exam._allKey !== key) {
    const seen = new Set();
    const list = [];
    for (const q of [...exam.questions, ...st.custom, ...st.ai]) {
      if (!q || seen.has(q.id) || !exam.topicIndex[q.topic]) continue;
      seen.add(q.id);
      list.push(q);
    }
    exam._all = list;
    exam._byId = new Map(list.map((q) => [q.id, q]));
    exam._byTopic = {};
    for (const q of list) (exam._byTopic[q.topic] ||= []).push(q);
    exam._allKey = key;
  }
  return exam._all;
}
export function questionById(exam, st, id) { allQuestions(exam, st); return exam._byId.get(id); }
export function questionsForTopic(exam, st, topic) { allQuestions(exam, st); return exam._byTopic[topic] || []; }

/** Sections/topics after applying the Islamic Studies ↔ Ethics track choice. */
export function activeSections(exam, settings) {
  return exam.sections.map((s) => ({
    ...s,
    weight: settings.sectionWeights[s.id] ?? s.weight,
    topics: s.topics
      .filter((t) => !t.track || t.track === settings.track)
      .map((t) => ({ ...t, weight: settings.topicWeights[t.id] ?? t.weight })),
  }));
}
export function activeTopics(exam, settings) {
  return activeSections(exam, settings).flatMap((s) => s.topics.map((t) => ({ ...t, section: s.id })));
}

export const DIFF = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
export const TYPE = { conceptual: 'Conceptual', numerical: 'Numerical', factual: 'Factual', 'past-paper-style': 'Past-paper style' };

/** Validate a question object (used by JSON import and AI generation). Returns an error string or null. */
export function validateQuestion(q, exam) {
  if (!q || typeof q !== 'object') return 'not an object';
  if (!q.id || typeof q.id !== 'string') return 'missing id';
  if (!exam.topicIndex[q.topic]) return `unknown topic "${q.topic}"`;
  if (typeof q.q !== 'string' || q.q.trim().length < 5) return 'missing question text';
  if (!Array.isArray(q.options) || q.options.length !== 4) return 'needs exactly 4 options';
  if (q.options.some((o) => typeof o !== 'string' || !o.trim())) return 'empty option';
  if (new Set(q.options.map((o) => o.trim().toLowerCase())).size !== 4) return 'duplicate options';
  if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) return 'answer must be 0–3';
  if (typeof q.explanation !== 'string' || !q.explanation.trim()) return 'missing explanation';
  if (!DIFF[q.difficulty]) return 'difficulty must be easy | medium | hard';
  if (!TYPE[q.type]) return 'type must be conceptual | numerical | factual | past-paper-style';
  if (q.why && (!Array.isArray(q.why) || q.why.length !== 4)) return '"why" must be an array of 4 (null for the correct option)';
  if (q.solution && !Array.isArray(q.solution)) return '"solution" must be an array of steps';
  return null;
}
