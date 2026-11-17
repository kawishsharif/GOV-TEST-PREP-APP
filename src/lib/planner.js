// Study planner: day-by-day plan from today to the test date, weighting weak and heavy topics more.
import { dayKey, addDays, daysBetween } from './util.js';
import { topicReport } from './stats.js';

export function generatePlan(exam, st) {
  const today = dayKey();
  const total = Math.min(180, daysBetween(today, st.settings.testDate));
  if (total <= 0) return { generated: today, days: [], done: st.plan?.done || {} };
  const topics = topicReport(exam, st).filter((t) => t.bank > 0);
  // Priority = exam weight × weakness (untested topics treated as 45% accuracy).
  const prio = topics.map((t) => ({ ...t, p: t.weight * (1.35 - (t.n >= 5 ? t.acc : 0.45)) }));
  const credit = Object.fromEntries(prio.map((t) => [t.id, 0]));
  const sumP = prio.reduce((a, t) => a + t.p, 0) || 1;
  const nextTopic = (filter) => {
    // weighted round-robin: accumulate credit by priority, pick the highest
    for (const t of prio) credit[t.id] += t.p / sumP;
    const pool = prio.filter(filter);
    const best = pool.sort((a, b) => credit[b.id] - credit[a.id])[0];
    if (best) credit[best.id] -= 1;
    return best;
  };
  const ee = (t) => t.section === 'EE';
  const nonEE = (t) => t.section !== 'EE';
  const days = [];
  const finalWeek = Math.min(7, total);
  for (let i = 0; i < total; i++) {
    const d = addDays(today, i);
    const left = total - i;
    const tasks = [];
    if (left <= finalWeek) {
      if (left === 1) tasks.push({ k: 'rest', text: 'Light revision only: formula sheet + flashcards. Check call letter, CNIC, test centre route. Sleep early.' });
      else if (left % 3 === 0 || left === 2) tasks.push({ k: 'mock', text: 'Full timed mock test, then review every wrong answer' });
      else tasks.push({ k: 'mistakes', text: 'Clear the mistake notebook' }, { k: 'formulas', text: 'Formula sheet + strategy page' });
      tasks.push({ k: 'cards', text: 'Flashcards: all due reviews' });
    } else if ((i + 1) % 7 === 0) {
      tasks.push({ k: 'mock', text: 'Weekly full mock test (120 min), then review' }, { k: 'mistakes', text: 'Re-attempt mistake notebook' });
    } else {
      const a = nextTopic(ee), b = nextTopic(i % 2 ? nonEE : ee);
      if (a) tasks.push({ k: 'notes', topic: a.id, text: `Read notes: ${a.name}` }, { k: 'practice', topic: a.id, text: `Practise 30 questions: ${a.name}` });
      if (b && b.id !== a?.id) tasks.push({ k: 'practice', topic: b.id, text: `Practise 20 questions: ${b.name}` });
      tasks.push({ k: 'cards', text: 'Flashcards: 20 reviews' });
      if (i % 3 === 2) tasks.push({ k: 'mistakes', text: 'Re-attempt mistake notebook' });
    }
    days.push({ d, tasks });
  }
  return { generated: today, testDate: st.settings.testDate, days, done: st.plan?.done || {} };
}
