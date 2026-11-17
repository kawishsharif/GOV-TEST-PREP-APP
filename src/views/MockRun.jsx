// Live mock test: countdown, palette, flag-for-review, auto-submit, keyboard shortcuts.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Sheet, useExam, useConfirm } from '../components/ui.jsx';
import { QuestionCard } from '../components/QuestionCard.jsx';
import { Icon } from '../components/Icon.jsx';
import { questionById } from '../lib/bank.js';
import { optionOrder } from '../lib/quizcore.js';
import { submitMock } from '../lib/mock.js';
import { save, saveNow } from '../lib/store.js';
import { fmtDuration } from '../lib/util.js';

/** Isolated so only the clock re-renders every second. */
function Timer({ deadline, onExpire }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= deadline) onExpire();
    }, 500);
    return () => clearInterval(t);
  }, [deadline, onExpire]);
  const left = Math.max(0, deadline - now);
  return <span className={`timer ${left < 5 * 60000 ? 'low' : ''}`} role="timer" aria-label="Time left">{fmtDuration(left)}</span>;
}

export default function MockRun() {
  const { exam, st, base } = useExam();
  const nav = useNavigate();
  const m = st.activeMock;
  const [palette, setPalette] = useState(false);
  const [confirm, dialog] = useConfirm();
  const shownAt = useRef(Date.now());
  const submittedId = useRef(null); // result id (same as mock id) once submitted
  const getQ = useCallback((id) => questionById(exam, st, id), [exam, st]);

  // Accumulate time spent on the current question when leaving it.
  const bank = useCallback(() => {
    if (!m) return;
    const id = m.qids[m.i];
    m.ms[id] = (m.ms[id] || 0) + (Date.now() - shownAt.current);
    shownAt.current = Date.now();
  }, [m]);

  const finish = useCallback((auto) => {
    if (!st.activeMock) return;
    bank();
    submittedId.current = st.activeMock.id;
    const r = submitMock(exam, st, getQ, auto);
    saveNow(exam.id);
    if (r) nav(`${base}result/${r.id}`, { replace: true });
  }, [st, exam, getQ, nav, base, bank]);
  const expire = useCallback(() => finish(true), [finish]);

  const goTo = useCallback((i) => {
    if (!m) return;
    bank();
    m.i = Math.max(0, Math.min(m.qids.length - 1, i));
    save(exam.id);
    window.scrollTo(0, 0);
  }, [m, bank, exam.id]);

  const q = m ? getQ(m.qids[m.i]) : null;
  const order = q ? optionOrder(q, m.seed, m.rules.shuffleOptions) : null;

  const choose = useCallback((orig) => {
    if (!q) return;
    m.answers[q.id] = m.answers[q.id] === orig ? null : orig; // tap again to clear
    save(exam.id);
  }, [q, m, exam.id]);
  const toggleFlag = useCallback(() => { if (q) { m.flags[q.id] = !m.flags[q.id]; save(exam.id); } }, [q, m, exam.id]);

  const askSubmit = useCallback(async () => {
    const answered = m.qids.filter((id) => m.answers[id] != null).length;
    const flagged = m.qids.filter((id) => m.flags[id]).length;
    setPalette(false);
    if (await confirm({
      title: 'Submit test?',
      body: `${answered} answered, ${m.qids.length - answered} unanswered, ${flagged} flagged. After submitting you cannot change any answer.`,
      ok: 'Submit', danger: true, cancel: 'Keep working',
    })) finish(false);
  }, [m, confirm, finish]);

  useEffect(() => {
    if (!m) return;
    const onKey = (e) => {
      if (e.target.matches?.('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey || document.querySelector('.scrim')) return;
      const k = e.key.toLowerCase();
      if (['1', '2', '3', '4'].includes(k)) choose(order[Number(k) - 1]);
      else if (k === 'f') toggleFlag();
      else if (k === 'n' || k === 'arrowright') goTo(m.i + 1);
      else if (k === 'p' || k === 'arrowleft') goTo(m.i - 1);
    };
    document.addEventListener('keydown', onKey);
    const onHide = () => { if (document.visibilityState === 'hidden') { bank(); saveNow(exam.id); } };
    document.addEventListener('visibilitychange', onHide);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onHide); };
  }, [m, order, choose, toggleFlag, goTo, bank, exam.id]);

  // Time already up when reopening the app → submit immediately.
  useEffect(() => { if (m && Date.now() >= m.deadline) finish(true); }, [m, finish]);

  if (!m) return <Navigate to={submittedId.current ? `${base}result/${submittedId.current}` : base + 'mock'} replace />;
  if (!q) return null;
  const answered = m.qids.filter((id) => m.answers[id] != null).length;
  const chosen = m.answers[q.id] ?? null;
  const flagged = !!m.flags[q.id];

  return (
    <>
      <header className="topbar">
        <button className="iconbtn" onClick={() => setPalette(true)} aria-label="Question palette"><Icon name="grid" /></button>
        <div className="title"><b>Mock test</b><span>{answered}/{m.qids.length} answered</span></div>
        <Timer deadline={m.deadline} onExpire={expire} />
        <button className="btn sm" style={{ marginLeft: 8, background: 'transparent', color: 'inherit', borderColor: 'rgba(255,255,255,.5)' }} onClick={askSubmit}>Submit</button>
      </header>
      <main className="full">
        {dialog}
        <QuestionCard key={q.id} q={q} exam={exam} order={order} chosen={chosen} onChoose={choose} num={m.i + 1} total={m.qids.length} flagged={flagged} hideTags />
        <p className="muted hide-mobile" style={{ fontSize: '.8rem', textAlign: 'center' }}><span className="kbd">1</span>–<span className="kbd">4</span> answer · <span className="kbd">F</span> flag · <span className="kbd">N</span>/<span className="kbd">P</span> next/previous · tap a chosen option again to clear it</p>
      </main>
      <div className="actionbar"><div className="inner">
        <button className="btn sq" aria-label="Previous question" disabled={m.i === 0} onClick={() => goTo(m.i - 1)}><Icon name="prev" /></button>
        <button className="btn sq" aria-label={flagged ? 'Remove flag' : 'Flag for review'} aria-pressed={flagged} onClick={toggleFlag}
          style={flagged ? { background: 'var(--flag)', borderColor: 'var(--flag)', color: '#fff' } : undefined}><Icon name="flag" /></button>
        <button className="btn sq" aria-label="Question palette" onClick={() => setPalette(true)}><Icon name="grid" /></button>
        {m.i + 1 < m.qids.length
          ? <button className="btn primary" onClick={() => goTo(m.i + 1)}>Next <Icon name="next" /></button>
          : <button className="btn accent" onClick={askSubmit}>Review &amp; submit</button>}
      </div></div>

      <Sheet open={palette} onClose={() => setPalette(false)} label="Question palette">
        <div className="row between" style={{ marginBottom: 10 }}><h2 style={{ margin: 0 }}>Questions</h2>
          <button className="iconbtn" aria-label="Close" onClick={() => setPalette(false)}><Icon name="x" /></button></div>
        <div className="legend" style={{ marginBottom: 12 }}>
          <span><i className="a" />Answered ({answered})</span><span><i />Unanswered ({m.qids.length - answered})</span>
          <span><i className="f" />Flagged ({m.qids.filter((id) => m.flags[id]).length})</span>
        </div>
        <div className="palette">
          {m.qids.map((id, i) => (
            <button key={id} className={`${m.answers[id] != null ? 'ans' : ''} ${m.flags[id] ? 'flag' : ''} ${i === m.i ? 'cur' : ''}`}
              aria-label={`Question ${i + 1}${m.answers[id] != null ? ', answered' : ''}${m.flags[id] ? ', flagged' : ''}`}
              onClick={() => { goTo(i); setPalette(false); }}>{i + 1}</button>
          ))}
        </div>
        <button className="btn danger block" style={{ marginTop: 16 }} onClick={askSubmit}>Submit test</button>
      </Sheet>
    </>
  );
}
