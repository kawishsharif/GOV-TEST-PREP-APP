// Live mock test: countdown, palette, flag-for-review, auto-submit, keyboard shortcuts.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Sheet, useExam, useConfirm, ActionBar, Kbd, KeyHints, TopbarButton } from '../components/ui.jsx';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
  return <span className={cn('shrink-0 rounded-lg px-2.5 py-1 font-mono text-base font-bold tabular-nums', left < 5 * 60000 ? 'bg-[#c2410c] text-white' : 'bg-white/15')} role="timer" aria-label="Time left">{fmtDuration(left)}</span>;
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
      if (e.target.matches?.('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey || document.querySelector('[role="dialog"]')) return;
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
      <header className="topbar sticky top-0 z-20 bg-topbar text-topbar-foreground pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex min-h-16 max-w-3xl items-center gap-2 px-2 sm:px-4">
          <TopbarButton icon="grid" label="Question palette" onClick={() => setPalette(true)} />
          <div className="min-w-0 flex-1">
            <h1 className="m-0 truncate text-base font-bold tracking-tight">Mock test</h1>
            <span className="block truncate text-xs opacity-85">{answered}/{m.qids.length} answered</span>
          </div>
          <Timer deadline={m.deadline} onExpire={expire} />
          <Button size="sm" variant="ghost" className="ml-1 border border-white/50 text-topbar-foreground hover:bg-white/10 hover:text-topbar-foreground" onClick={askSubmit}>Submit</Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 pt-4 pb-[calc(140px+env(safe-area-inset-bottom))]">
        {dialog}
        <QuestionCard key={q.id} q={q} exam={exam} order={order} chosen={chosen} onChoose={choose} num={m.i + 1} total={m.qids.length} flagged={flagged} hideTags />
        <KeyHints className="text-center"><Kbd>1</Kbd>–<Kbd>4</Kbd> answer · <Kbd>F</Kbd> flag · <Kbd>N</Kbd>/<Kbd>P</Kbd> next/previous · tap a chosen option again to clear it</KeyHints>
      </main>
      <ActionBar>
        <Button size="icon" className="flex-none" aria-label="Previous question" disabled={m.i === 0} onClick={() => goTo(m.i - 1)}><Icon name="prev" /></Button>
        <Button size="icon" className={cn('flex-none', flagged && 'border-flag bg-flag text-white hover:bg-flag/90 hover:text-white')}
          aria-label={flagged ? 'Remove flag' : 'Flag for review'} aria-pressed={flagged} onClick={toggleFlag}><Icon name="flag" /></Button>
        <Button size="icon" className="flex-none" aria-label="Question palette" onClick={() => setPalette(true)}><Icon name="grid" /></Button>
        {m.i + 1 < m.qids.length
          ? <Button variant="default" onClick={() => goTo(m.i + 1)}>Next <Icon name="next" /></Button>
          : <Button variant="brand" onClick={askSubmit}>Review &amp; submit</Button>}
      </ActionBar>

      <Sheet open={palette} onClose={() => setPalette(false)} label="Question palette">
        <h2 className="m-0 pr-10 text-lg font-semibold tracking-tight">Questions</h2>
        <div className="legend">
          <span><i className="a" />Answered ({answered})</span><span><i />Unanswered ({m.qids.length - answered})</span>
          <span><i className="f" />Flagged ({m.qids.filter((id) => m.flags[id]).length})</span>
        </div>
        <div className="palette">
          {m.qids.map((id, i) => (
            <button key={id} type="button" className={cn(m.answers[id] != null && 'ans', m.flags[id] && 'flag', i === m.i && 'cur')}
              aria-label={`Question ${i + 1}${m.answers[id] != null ? ', answered' : ''}${m.flags[id] ? ', flagged' : ''}`}
              onClick={() => { goTo(i); setPalette(false); }}>{i + 1}</button>
          ))}
        </div>
        <div className="space-y-2">
          <Button variant="destructive" className="w-full" onClick={askSubmit}>Submit test</Button>
          <Button variant="ghost" className="w-full" onClick={() => { bank(); saveNow(exam.id); nav(base + 'dashboard'); }}>Leave for now (timer keeps running)</Button>
        </div>
      </Sheet>
    </>
  );
}
