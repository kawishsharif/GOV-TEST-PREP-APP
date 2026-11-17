// Derived numbers for the dashboard, planner and charts.
import { dayKey, addDays, daysBetween } from './util.js';
import { activeSections, questionsForTopic } from './bank.js';

const TARGET_PER_TOPIC = 30; // questions you should have "mastered" per topic to count as fully ready

export function topicReport(exam, st) {
  const out = [];
  for (const s of activeSections(exam, st.settings)) {
    const tw = s.topics.reduce((a, t) => a + (t.weight || 0), 0) || 1;
    for (const t of s.topics) {
      const qs = questionsForTopic(exam, st, t.id);
      let seen = 0, mastered = 0;
      for (const q of qs) { const x = st.qstats[q.id]; if (x) { seen++; if (x.ok) mastered++; } }
      const ts = st.tstats[t.id] || { n: 0, c: 0 };
      const target = Math.min(qs.length || 1, TARGET_PER_TOPIC);
      out.push({
        id: t.id, name: t.name, section: s.id, sectionName: s.name,
        weight: s.weight * ((t.weight || 0) / tw),
        bank: qs.length, seen, mastered, n: ts.n, c: ts.c,
        acc: ts.n ? ts.c / ts.n : null,
        ready: Math.min(1, mastered / target),
      });
    }
  }
  return out;
}

export function sectionReport(exam, st, topics = topicReport(exam, st)) {
  return activeSections(exam, st.settings).map((s) => {
    const ts = topics.filter((t) => t.section === s.id);
    const n = ts.reduce((a, t) => a + t.n, 0), c = ts.reduce((a, t) => a + t.c, 0);
    const w = ts.reduce((a, t) => a + t.weight, 0) || 1;
    return { id: s.id, name: s.name, weight: s.weight, n, c, acc: n ? c / n : null, ready: ts.reduce((a, t) => a + t.ready * t.weight, 0) / w };
  });
}

/** Overall readiness 0–100: share of core questions currently answered correctly, weighted by exam weight. */
export function readiness(topics) {
  const w = topics.reduce((a, t) => a + t.weight, 0) || 1;
  return Math.round((topics.reduce((a, t) => a + t.ready * t.weight, 0) / w) * 100);
}

export function streak(st) {
  let d = dayKey();
  if (!st.daily[d]?.n) d = addDays(d, -1); // today not started yet: count up to yesterday
  let n = 0;
  while (st.daily[d]?.n) { n++; d = addDays(d, -1); }
  return n;
}

/** Weakest topics: lowest accuracy among practiced topics (≥5 attempts), then untouched high-weight topics. */
export function weakest(topics, k = 3) {
  const practiced = topics.filter((t) => t.n >= 5 && t.bank > 0).sort((a, b) => a.acc - b.acc || b.weight - a.weight);
  const untouched = topics.filter((t) => t.n < 5 && t.bank > 0).sort((a, b) => b.weight - a.weight);
  return [...practiced.filter((t) => t.acc < 0.85), ...untouched, ...practiced.filter((t) => t.acc >= 0.85)].slice(0, k);
}

export const daysLeft = (st) => daysBetween(dayKey(), st.settings.testDate);

/** Daily practice accuracy series and mock score series for the progress chart. */
export function history(st) {
  const practice = Object.entries(st.daily)
    .filter(([, v]) => v.n > 0)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([d, v]) => ({ d, n: v.n, pct: Math.round((v.c / v.n) * 100) }));
  const mocks = st.mocks.map((m) => ({ d: dayKey(m.finished), pct: m.pct, id: m.id }));
  return { practice, mocks };
}
