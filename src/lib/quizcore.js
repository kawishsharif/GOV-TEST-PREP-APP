// Question selection + option ordering shared by practice, mistakes, numerical drill and mocks.
import { shuffle, seeded, hash } from './util.js';
import { questionsForTopic } from './bank.js';

export const KEYS = ['A', 'B', 'C', 'D'];

/** Display order of options (array of original indices). Deterministic per question + session seed. */
export function optionOrder(q, seed, on = true) {
  if (!on || q.fixedOrder) return [0, 1, 2, 3];
  return shuffle([0, 1, 2, 3], seeded(hash(q.id) ^ seed));
}

/**
 * Pick questions for practice.
 * f: { topics: [ids], difficulty: 'any'|'easy'|..., type: 'any'|..., count, order: 'smart'|'random' }
 * Smart order: never-seen first, then ones last answered wrong, then oldest-seen.
 */
export function pickQuestions(exam, st, f) {
  let pool = f.topics.flatMap((t) => questionsForTopic(exam, st, t));
  if (f.difficulty && f.difficulty !== 'any') pool = pool.filter((q) => q.difficulty === f.difficulty);
  if (f.type && f.type !== 'any') pool = pool.filter((q) => q.type === f.type);
  if (f.order === 'random') return shuffle(pool).slice(0, f.count);
  const rank = (q) => { const s = st.qstats[q.id]; return !s ? 0 : !s.ok ? 1 : 2; };
  return shuffle(pool)
    .sort((a, b) => rank(a) - rank(b) || (st.qstats[a.id]?.last || 0) - (st.qstats[b.id]?.last || 0))
    .slice(0, f.count);
}

export function filterPool(exam, st, topics, difficulty = 'any', type = 'any') {
  let pool = topics.flatMap((t) => questionsForTopic(exam, st, t));
  if (difficulty !== 'any') pool = pool.filter((q) => q.difficulty === difficulty);
  if (type !== 'any') pool = pool.filter((q) => q.type === type);
  return pool;
}
