// Mock test engine: build a paper from section/topic weights, score it, estimate rank band.
import { apportion, shuffle, uid, dayKey } from './util.js';
import { activeSections, questionsForTopic } from './bank.js';
import { recordAttempt, save } from './store.js';

/** Planned number of questions per section and per topic for the current settings. */
export function mockBlueprint(exam, st) {
  const s = st.settings;
  const sections = activeSections(exam, s).filter((x) => x.topics.length && x.weight > 0);
  const secCounts = apportion(s.totalQuestions, sections.map((x) => x.weight));
  return sections.map((sec, i) => {
    const tCounts = apportion(secCounts[i], sec.topics.map((t) => t.weight || 1));
    return { id: sec.id, name: sec.name, weight: sec.weight, count: secCounts[i], topics: sec.topics.map((t, j) => ({ id: t.id, name: t.name, count: tCounts[j] })) };
  });
}

/**
 * Draw questions. Questions not used in earlier mocks are preferred so repeated mocks feel fresh.
 * Shortfalls in a topic are filled from other topics of the same section, then from any section.
 */
export function buildMock(exam, st) {
  const bp = mockBlueprint(exam, st);
  const usedBefore = new Set(st.mocks.flatMap((m) => m.qs.map((q) => q.id)));
  const prefer = (list) => [...shuffle(list.filter((q) => !usedBefore.has(q.id))), ...shuffle(list.filter((q) => usedBefore.has(q.id)))];
  const taken = new Set();
  const ids = [];
  for (const sec of bp) {
    const secIds = [];
    let short = 0;
    for (const t of sec.topics) {
      const pool = prefer(questionsForTopic(exam, st, t.id).filter((q) => q.source !== 'template'));
      const pick = pool.slice(0, t.count);
      pick.forEach((q) => taken.add(q.id));
      secIds.push(...pick.map((q) => q.id));
      short += t.count - pick.length;
    }
    if (short > 0) {
      const extra = prefer(sec.topics.flatMap((t) => questionsForTopic(exam, st, t.id)).filter((q) => !taken.has(q.id) && q.source !== 'template')).slice(0, short);
      extra.forEach((q) => taken.add(q.id));
      secIds.push(...extra.map((q) => q.id));
    }
    ids.push(...shuffle(secIds)); // CTS-style: sections in order, questions shuffled within a section
  }
  const missing = st.settings.totalQuestions - ids.length;
  if (missing > 0) {
    const all = bp.flatMap((s) => s.topics.flatMap((t) => questionsForTopic(exam, st, t.id))).filter((q) => !taken.has(q.id));
    ids.push(...prefer(all).slice(0, missing).map((q) => q.id));
  }
  const now = Date.now();
  const s = st.settings;
  return {
    id: uid(), started: now, deadline: now + s.minutes * 60000, qids: ids, answers: {}, flags: {}, ms: {}, i: 0,
    seed: (Math.random() * 1e9) | 0,
    rules: { minutes: s.minutes, total: ids.length, negativeMarking: s.negativeMarking, negativeValue: s.negativeValue, passPercent: s.passPercent, shuffleOptions: s.shuffleOptions },
  };
}

/** Rough rank band from percentage score. Clearly an estimate, not official data. */
export function rankBand(pctScore, passPercent = 50) {
  if (pctScore >= 85) return { label: 'Topper band', detail: 'Likely within the top 1–3% of candidates', tone: 'good' };
  if (pctScore >= 75) return { label: 'Top merit band', detail: 'Likely within the top ~10%', tone: 'good' };
  if (pctScore >= 65) return { label: 'Strong', detail: 'Likely within the top ~25%', tone: 'good' };
  if (pctScore >= 55) return { label: 'Qualifying', detail: 'Likely to pass; mid-merit position', tone: 'warn' };
  if (pctScore >= passPercent) return { label: 'Borderline', detail: 'Around the pass mark — not safe for merit', tone: 'warn' };
  return { label: 'Below pass mark', detail: `Below the ${passPercent}% pass mark`, tone: 'bad' };
}

/** Score the active mock, record attempts, store the result, clear the active mock. Returns the result. */
export function submitMock(exam, st, getQ, auto = false) {
  const m = st.activeMock;
  if (!m || m.submitted) return null;
  m.submitted = true;
  const finished = Math.min(Date.now(), m.deadline);
  const r = m.rules;
  const sections = {}, topics = {};
  let correct = 0, wrong = 0, skipped = 0;
  const qs = [];
  for (const id of m.qids) {
    const q = getQ(id);
    if (!q) continue;
    const a = m.answers[id];
    const answered = a !== undefined && a !== null;
    const ok = answered && a === q.answer;
    if (!answered) skipped++; else if (ok) correct++; else wrong++;
    const secId = exam.sectionOfTopic[q.topic];
    const S = (sections[secId] ||= { n: 0, c: 0, w: 0, s: 0 });
    const T = (topics[q.topic] ||= { n: 0, c: 0, w: 0, s: 0 });
    for (const X of [S, T]) { X.n++; if (ok) X.c++; else if (answered) X.w++; else X.s++; }
    if (answered) recordAttempt(exam, q, ok, m.ms[id] || 0, 'm');
    qs.push({ id, a: answered ? a : null, ms: Math.round(m.ms[id] || 0), f: !!m.flags[id] });
  }
  const neg = r.negativeMarking ? r.negativeValue : 0;
  const score = Math.max(0, correct - neg * wrong);
  const result = {
    id: m.id, started: m.started, finished, day: dayKey(finished), auto,
    total: qs.length, correct, wrong, skipped, score: Math.round(score * 100) / 100,
    pct: qs.length ? Math.round((score / qs.length) * 1000) / 10 : 0,
    timeUsed: finished - m.started, rules: r, sections, topics, qs, seed: m.seed,
  };
  st.mocks.push(result);
  st.activeMock = null;
  save(exam.id);
  return result;
}
