// Topic practice setup: section → topics → difficulty → type → count → order.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Page, useExam, Chips } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { activeSections, questionsForTopic, DIFF, TYPE } from '../lib/bank.js';
import { pickQuestions, filterPool } from '../lib/quizcore.js';
import { save } from '../lib/store.js';
import { uid } from '../lib/util.js';

const COUNTS = [10, 20, 30, 50];
let remembered = null; // keep the last filter while the app is open

/** Create a practice session in state. `extra` holds generated questions that are not in the bank. */
export function newSession(exam, st, qs, label, mode = 'p', extra = []) {
  st.activePractice = { id: uid(), label, mode, ids: qs.map((q) => q.id), extra, i: 0, answers: {}, ms: {}, seed: (Math.random() * 1e9) | 0, started: Date.now() };
  save(exam.id);
}

export default function Practice() {
  const { exam, st, base } = useExam();
  const nav = useNavigate();
  const sections = activeSections(exam, st.settings).filter((s) => s.topics.length);
  const [f, setF] = useState(() => remembered || { section: sections[0].id, topics: [], difficulty: 'any', type: 'any', count: 20, order: 'smart' });
  const update = (patch) => setF((old) => (remembered = { ...old, ...patch }));

  const sec = sections.find((s) => s.id === f.section) || sections[0];
  const topics = f.topics.length ? f.topics : sec.topics.map((t) => t.id);
  const pool = filterPool(exam, st, topics, f.difficulty, f.type);
  const unseen = pool.filter((q) => !st.qstats[q.id]).length;
  const ap = st.activePractice;
  const resume = ap && ap.i < ap.ids.length;

  const start = () => {
    const qs = pickQuestions(exam, st, { ...f, topics });
    const names = f.topics.length ? f.topics.map((t) => exam.topicIndex[t].name).join(', ') : sec.name;
    newSession(exam, st, qs, `${names}${f.difficulty !== 'any' ? ' · ' + DIFF[f.difficulty] : ''}`);
    nav(base + 'quiz/session');
  };

  return (
    <Page title="Topic practice" sub={exam.title} base={base} full>
      {resume && (
        <Link className="card row" to={base + 'quiz/session'} style={{ textDecoration: 'none', color: 'inherit' }}>
          <Icon name="practice" />
          <div style={{ flex: 1 }}><b>Resume: {ap.label}</b><br /><small className="muted">Question {ap.i + 1} of {ap.ids.length}</small></div>
          <Icon name="chev" className="chev" />
        </Link>
      )}
      <section className="card">
        <h2>1 · Section</h2>
        <Chips value={sec.id} onChange={(v) => update({ section: v, topics: [] })} items={sections.map((s) => [s.id, s.name])} />
      </section>
      <section className="card">
        <h2>2 · Topic</h2>
        <Chips multi value={f.topics.length ? f.topics : ['*']}
          onChange={(v) => update({ topics: v === '*' ? [] : f.topics.includes(v) ? f.topics.filter((t) => t !== v) : [...f.topics, v] })}
          items={[['*', 'All topics'], ...sec.topics.map((t) => [t.id, t.name, questionsForTopic(exam, st, t.id).length])]} />
      </section>
      <section className="card">
        <h2>3 · Difficulty &amp; type</h2>
        <div style={{ marginBottom: 10 }}><Chips value={f.difficulty} onChange={(v) => update({ difficulty: v })} items={[['any', 'Any'], ...Object.entries(DIFF)]} /></div>
        <Chips value={f.type} onChange={(v) => update({ type: v })} items={[['any', 'Any type'], ...Object.entries(TYPE)]} />
      </section>
      <section className="card">
        <h2>4 · How many</h2>
        <div style={{ marginBottom: 10 }}><Chips value={f.count} onChange={(v) => update({ count: v })} items={COUNTS.map((n) => [n, String(n)])} /></div>
        <Chips value={f.order} onChange={(v) => update({ order: v })} items={[['smart', 'New & weak first'], ['random', 'Random']]} />
        <p className="muted" style={{ margin: '12px 0 0' }}>{pool.length} questions match · {unseen} not yet attempted</p>
      </section>
      <div className="actionbar" style={{ bottom: 'calc(60px + env(safe-area-inset-bottom))' }}><div className="inner">
        <button className="btn primary" disabled={!pool.length} onClick={start}><Icon name="bolt" /> Start {Math.min(f.count, pool.length)} questions</button>
      </div></div>
    </Page>
  );
}
