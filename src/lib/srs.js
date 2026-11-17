// Spaced-repetition flashcards (SM-2 style). Cards are generated from the study notes:
// every definition, formula and "fact — detail" line becomes a card, so notes and cards never drift apart.
import { dayKey } from './util.js';
import { activeTopics } from './bank.js';

const MIN = 60000, DAY = 86400000;

function splitFact(f) {
  for (const sep of [' — ', ': ']) {
    const i = f.indexOf(sep);
    if (i > 3 && i < f.length - 3) return [f.slice(0, i), f.slice(i + sep.length)];
  }
  return null;
}

/** All cards for the active topics of an exam. Card ids are stable (topic + kind + text). */
export function buildCards(exam, st) {
  if (exam._cards && exam._cardsTrack === st.settings.track) return exam._cards;
  const cards = [];
  for (const t of activeTopics(exam, st.settings)) {
    const n = exam.notes[t.id];
    if (!n) continue;
    for (const [term, def] of n.definitions || []) cards.push({ id: `${t.id}|d|${term}`, topic: t.id, kind: 'Definition', front: term, back: def });
    for (const [name, f] of n.formulas || []) cards.push({ id: `${t.id}|f|${name}`, topic: t.id, kind: 'Formula', front: name, back: f });
    for (const fact of n.facts || []) {
      const parts = splitFact(fact);
      if (parts) cards.push({ id: `${t.id}|x|${parts[0]}`, topic: t.id, kind: 'Fact', front: parts[0], back: parts[1] });
    }
  }
  exam._cards = cards;
  exam._cardsTrack = st.settings.track;
  return cards;
}

/** Next state for a rating: 0 Again, 1 Hard, 2 Good, 3 Easy. */
export function schedule(prev, rating, now = Date.now()) {
  const s = prev ? { ...prev } : { ivl: 0, ease: 2.5, reps: 0, lapses: 0 };
  if (rating === 0) {
    s.reps = 0; s.lapses++; s.ease = Math.max(1.3, s.ease - 0.2); s.ivl = 0; s.due = now + 10 * MIN;
    return s;
  }
  let ivl;
  if (rating === 1) { ivl = s.reps === 0 ? 1 : Math.max(1, s.ivl * 1.2); s.ease = Math.max(1.3, s.ease - 0.15); }
  else if (rating === 2) { ivl = s.reps === 0 ? 1 : s.reps === 1 ? 3 : s.ivl * s.ease; }
  else { ivl = s.reps === 0 ? 4 : s.ivl * s.ease * 1.3; s.ease += 0.15; }
  s.ivl = Math.round(ivl * 10) / 10;
  s.reps++;
  s.due = now + s.ivl * DAY;
  return s;
}

export const intervalLabel = (prev, rating) => {
  const s = schedule(prev, rating, 0);
  if (s.due < DAY) return `${Math.round(s.due / MIN)} min`;
  const d = s.due / DAY;
  return d >= 30 ? `${Math.round(d / 30)} mo` : `${Math.round(d)} d`;
};

/** Cards to study now: due reviews first, then new cards up to today's new-card limit. */
export function studyQueue(exam, st, topic, newLimit = 20) {
  const now = Date.now();
  const today = dayKey();
  const meta = st.srsMeta && st.srsMeta.day === today ? st.srsMeta : { day: today, newCount: 0 };
  const cards = buildCards(exam, st).filter((c) => !topic || c.topic === topic);
  const due = cards.filter((c) => st.srs[c.id] && st.srs[c.id].due <= now).sort((a, b) => st.srs[a.id].due - st.srs[b.id].due);
  const fresh = cards.filter((c) => !st.srs[c.id]).slice(0, Math.max(0, newLimit - meta.newCount));
  return { due, fresh, total: cards.length, learned: cards.filter((c) => st.srs[c.id]).length, meta };
}
