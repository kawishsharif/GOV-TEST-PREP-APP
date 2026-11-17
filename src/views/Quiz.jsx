// Practice session with instant feedback. Routes:
//   quiz/session            the active session
//   quiz/topic/<topicId>    quick 10-question session on one topic (new & weak first)
//   quiz/numerical[/topic]  numerical drill (bank numericals + generated variants)
//   quiz/mistakes[/topic]   re-attempt the mistake notebook
import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Page, useExam, useToast, Empty, Bar } from '../components/ui.jsx';
import { QuestionCard } from '../components/QuestionCard.jsx';
import { Icon } from '../components/Icon.jsx';
import { questionById, activeTopics } from '../lib/bank.js';
import { optionOrder, pickQuestions } from '../lib/quizcore.js';
import { recordAttempt, save } from '../lib/store.js';
import { pct, fmtDuration, shuffle } from '../lib/util.js';
import { newSession } from './Practice.jsx';

/** Build a session for the special routes, then hand over to quiz/session. */
function Starter({ mode, arg }) {
  const { exam, st, base } = useExam();
  const nav = useNavigate();
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    (async () => {
      if (mode === 'topic' && exam.topicIndex[arg]) {
        const qs = pickQuestions(exam, st, { topics: [arg], count: 10, order: 'smart' });
        if (!qs.length) return setMsg('No questions in this topic yet.');
        newSession(exam, st, qs, exam.topicIndex[arg].name);
      } else if (mode === 'numerical') {
        const topics = arg && exam.topicIndex[arg] ? [arg] : activeTopics(exam, st.settings).map((t) => t.id);
        const bank = pickQuestions(exam, st, { topics, type: 'numerical', count: 15, order: 'smart' });
        let extra = [];
        try { extra = (await import('../lib/generators.js')).generateSet(exam, 5, arg); } catch { /* generators optional */ }
        const all = shuffle([...bank, ...extra]);
        if (!all.length) return setMsg('No numerical questions available yet.');
        newSession(exam, st, all, 'Numerical drill', 'n', extra);
      } else if (mode === 'mistakes') {
        const ids = Object.keys(st.mistakes).filter((id) => { const q = questionById(exam, st, id); return q && (!arg || q.topic === arg); });
        if (!ids.length) return nav(base + 'mistakes', { replace: true });
        ids.sort((a, b) => st.mistakes[a].added - st.mistakes[b].added); // oldest first
        newSession(exam, st, ids.slice(0, 30).map((id) => questionById(exam, st, id)), 'Re-attempt my mistakes', 'r');
      } else return nav(base + 'practice', { replace: true });
      nav(base + 'quiz/session', { replace: true });
    })();
  }, [mode, arg]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Page title="Practice" sub={exam.title} base={base}>{msg ? <Empty>{msg}</Empty> : <p className="muted">Preparing…</p>}</Page>;
}

export default function Quiz() {
  const rest = (useParams()['*'] || '').split('/');
  if (rest[0] && rest[0] !== 'session') return <Starter key={rest.join('/')} mode={rest[0]} arg={rest[1]} />;
  return <Session />;
}

function Session() {
  const { exam, st, base } = useExam();
  const toast = useToast();
  const nav = useNavigate();
  const s = st.activePractice;
  const shownAt = useRef(Date.now());
  const [done, setDone] = useState(null); // summary snapshot after finishing

  const extraById = new Map((s?.extra || []).map((q) => [q.id, q]));
  const getQ = (id) => extraById.get(id) || questionById(exam, st, id);
  const ids = s ? s.ids.filter((id) => getQ(id)) : [];
  const q = s && s.i < ids.length ? getQ(ids[s.i]) : null;
  const order = q ? optionOrder(q, s.seed, st.settings.shuffleOptions) : null;

  useEffect(() => { shownAt.current = Date.now(); }, [q?.id]);

  const answer = useCallback((orig) => {
    if (!q || s.answers[q.id] !== undefined) return;
    const ms = Date.now() - shownAt.current;
    s.answers[q.id] = orig;
    s.ms[q.id] = ms;
    const ev = recordAttempt(exam, q, orig === q.answer, ms, s.mode);
    if (ev === 'added') toast('Saved to mistake notebook');
    else if (ev === 'cleared') toast('Cleared from mistake notebook ✓');
    else if (ev === 'progress') toast('Correct — get it right on another day to clear it');
    setTimeout(() => document.querySelector('.explain')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 30);
  }, [q, s, exam, toast]);

  const finish = useCallback(() => {
    setDone({ ...s, ids, qs: ids.map(getQ) });
    st.activePractice = null;
    save(exam.id);
  }, [s, ids]); // eslint-disable-line react-hooks/exhaustive-deps

  const next = useCallback(() => {
    if (!s) return;
    if (s.i + 1 >= ids.length) return finish();
    s.i++; save(exam.id); window.scrollTo(0, 0);
  }, [s, ids.length, finish, exam.id]);
  const prev = useCallback(() => { if (s && s.i > 0) { s.i--; save(exam.id); } }, [s, exam.id]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.matches?.('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey || !q) return;
      const k = e.key.toLowerCase();
      if (['1', '2', '3', '4'].includes(k)) answer(order[Number(k) - 1]);
      else if (k === 'n' || k === 'enter' || k === 'arrowright') { e.preventDefault(); next(); }
      else if (k === 'p' || k === 'arrowleft') prev();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [q, order, answer, next, prev]);

  useEffect(() => { if (s && ids.length && !q && !done) finish(); }, [s, ids.length, q, done, finish]);

  if (done) return <Summary d={done} onAgain={() => setDone(null)} />;
  if (!s || !ids.length) {
    return <Page title="Practice" sub={exam.title} base={base}><Empty>No active session. <Link to={base + 'practice'}>Start one</Link>.</Empty></Page>;
  }
  if (!q) return null;

  const chosen = s.answers[q.id];
  const answered = chosen !== undefined;
  const nAns = ids.filter((id) => s.answers[id] !== undefined).length;
  const nOk = ids.filter((id) => s.answers[id] !== undefined && s.answers[id] === getQ(id).answer).length;

  return (
    <Page title={s.label} sub="Practice · instant feedback" back={base + (s.mode === 'r' ? 'mistakes' : 'practice')} tabs={false} full>
      <div className="row between" style={{ marginBottom: 8 }}>
        <span className="muted" style={{ fontSize: '.85rem' }}>{nAns} answered · {nOk} correct</span>
        <span className="hide-mobile muted" style={{ fontSize: '.8rem' }}><span className="kbd">1</span>–<span className="kbd">4</span> answer · <span className="kbd">N</span> next · <span className="kbd">P</span> previous</span>
      </div>
      <div style={{ marginBottom: 14 }}><Bar value={pct(s.i, ids.length)} tone="" /></div>
      <QuestionCard key={q.id} q={q} exam={exam} order={order} chosen={answered ? chosen : null} reveal={answered} onChoose={answer} num={s.i + 1} total={ids.length} />
      <div className="actionbar"><div className="inner">
        <button className="btn sq" aria-label="Previous question" disabled={s.i === 0} onClick={prev}><Icon name="prev" /></button>
        <button className={`btn ${answered ? 'primary' : ''}`} onClick={next}>{answered ? (s.i + 1 === ids.length ? 'Finish' : 'Next') : 'Skip'} <Icon name="next" /></button>
      </div></div>
    </Page>
  );
}

function Summary({ d, onAgain }) {
  const { exam, st, base } = useExam();
  const answered = d.qs.filter((q) => d.answers[q.id] !== undefined);
  const right = answered.filter((q) => d.answers[q.id] === q.answer);
  const wrong = answered.filter((q) => d.answers[q.id] !== q.answer);
  const time = Object.values(d.ms).reduce((a, b) => a + b, 0);
  const byTopic = {};
  for (const q of answered) { const t = (byTopic[q.topic] ||= { n: 0, c: 0 }); t.n++; if (d.answers[q.id] === q.answer) t.c++; }
  const again = () => {
    const topics = [...new Set(d.qs.map((q) => q.topic))];
    const fresh = pickQuestions(exam, st, { topics, count: d.qs.length, order: 'smart', type: d.mode === 'n' ? 'numerical' : 'any' });
    newSession(exam, st, fresh, d.label, d.mode === 'r' ? 'p' : d.mode);
    window.scrollTo(0, 0);
    onAgain();
  };
  return (
    <Page title="Session complete" sub={d.label} back={base + 'practice'} base={base}>
      <section className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1 }}>{pct(right.length, answered.length)}%</div>
        <p className="muted">{right.length} of {answered.length} correct · {d.qs.length - answered.length} skipped · {fmtDuration(time)} ({answered.length ? Math.round(time / answered.length / 1000) : 0}s per question)</p>
      </section>
      <section className="card"><h2>By topic</h2>
        <table className="simple"><tbody>{Object.entries(byTopic).map(([t, v]) => (
          <tr key={t}><td>{exam.topicIndex[t]?.name || t}</td><td className="num">{v.c}/{v.n}</td><td className="num"><b>{pct(v.c, v.n)}%</b></td></tr>
        ))}</tbody></table>
      </section>
      {wrong.length > 0 && (
        <section className="card"><h2>Missed ({wrong.length}) — saved to your mistake notebook</h2>
          <ul className="list">{wrong.map((q) => <li key={q.id} style={{ padding: '10px 0' }}><b>{q.q}</b><br /><small className="muted">Answer: {q.options[q.answer]}</small></li>)}</ul>
        </section>
      )}
      <div className="stack">
        <button className="btn primary block" onClick={again}><Icon name="repeat" /> New session, same topics</button>
        {wrong.length > 0 && <Link className="btn block" to={base + 'quiz/mistakes'}>Re-attempt mistakes</Link>}
        <Link className="btn block" to={base + 'dashboard'}>Back to dashboard</Link>
      </div>
    </Page>
  );
}
