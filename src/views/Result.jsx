// Mock result: score, rank band, timing, section/topic breakdown, full review with explanations.
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Page, useExam, Empty, Bar, Chips } from '../components/ui.jsx';
import { QuestionCard } from '../components/QuestionCard.jsx';
import { Icon } from '../components/Icon.jsx';
import { questionById } from '../lib/bank.js';
import { optionOrder } from '../lib/quizcore.js';
import { rankBand } from '../lib/mock.js';
import { fmtDuration, fmtDay, pct } from '../lib/util.js';

const PAGE = 10;

export default function Result() {
  const { exam, st, base } = useExam();
  const { id } = useParams();
  const r = st.mocks.find((m) => m.id === id);
  const [filter, setFilter] = useState('wrong');
  const [shown, setShown] = useState(PAGE);
  const rows = useMemo(() => (r ? r.qs.map((x, i) => ({ ...x, n: i + 1, q: questionById(exam, st, x.id) })).filter((x) => x.q) : []), [r, exam, st]);
  if (!r) return <Page title="Result" base={base} back={base + 'mock'}><Empty>Result not found.</Empty></Page>;

  const band = rankBand(r.pct, r.rules.passPercent);
  const answered = r.correct + r.wrong;
  const avg = answered ? r.timeUsed / r.total : 0;
  const slow = [...rows].sort((a, b) => b.ms - a.ms).slice(0, 5);
  const list = rows.filter((x) => filter === 'all' || (filter === 'wrong' && x.a != null && x.a !== x.q.answer) || (filter === 'skipped' && x.a == null) || (filter === 'flagged' && x.f) || (filter === 'right' && x.a === x.q.answer));
  const prev = st.mocks[st.mocks.findIndex((m) => m.id === r.id) - 1];

  return (
    <Page title="Mock result" sub={fmtDay(r.day, { day: 'numeric', month: 'short', year: 'numeric' })} back={base + 'mock'} base={base}>
      <section className="card" style={{ textAlign: 'center' }}>
        <div className="muted" style={{ fontSize: '.85rem' }}>Score</div>
        <div style={{ fontSize: '3.2rem', fontWeight: 800, lineHeight: 1.05 }}>{r.score}<span className="muted" style={{ fontSize: '1.3rem' }}> / {r.total}</span></div>
        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{r.pct}%{prev && <small className="muted" style={{ marginLeft: 8 }}>{r.pct >= prev.pct ? '▲' : '▼'} {Math.abs(Math.round((r.pct - prev.pct) * 10) / 10)} vs last</small>}</div>
        <div style={{ margin: '12px auto 0', padding: '10px 14px', borderRadius: 12, background: `var(--${band.tone}-soft)`, maxWidth: 420 }}>
          <b style={{ color: `var(--${band.tone})` }}>{band.label}</b><br /><span>{band.detail}</span>
        </div>
        <p className="muted" style={{ fontSize: '.75rem', margin: '8px 0 0' }}>Rank band is a rough estimate from typical score spreads, not official CTS data.</p>
        {r.auto && <p style={{ color: 'var(--warn)', fontWeight: 600, margin: '8px 0 0' }}>Auto-submitted at time-up.</p>}
      </section>

      <section className="card">
        <div className="grid3">
          <div className="stat"><b style={{ color: 'var(--good)' }}>{r.correct}</b><span>correct</span></div>
          <div className="stat"><b style={{ color: 'var(--bad)' }}>{r.wrong}</b><span>wrong{r.rules.negativeMarking ? ` (−${Math.round(r.wrong * r.rules.negativeValue * 100) / 100})` : ''}</span></div>
          <div className="stat"><b>{r.skipped}</b><span>unanswered</span></div>
        </div>
        <div className="grid2" style={{ marginTop: 10 }}>
          <div className="stat"><b>{fmtDuration(r.timeUsed)}</b><span>time used of {r.rules.minutes} min</span></div>
          <div className="stat"><b>{Math.round(avg / 1000)}s</b><span>average per question</span></div>
        </div>
        {r.skipped > 0 && !r.rules.negativeMarking && <p className="muted" style={{ fontSize: '.85rem', margin: '10px 0 0' }}>Tip: with no negative marking, never leave a question blank — an educated guess can only gain marks.</p>}
      </section>

      <div className="sec-title">By section</div>
      <section className="card">
        {Object.entries(r.sections).map(([sid, v]) => (
          <div className="metric-row" key={sid}>
            <div><b>{exam.sectionIndex[sid]?.name || sid}</b><br /><small className="muted">{v.c} correct · {v.w} wrong · {v.s} blank</small></div>
            <b>{pct(v.c, v.n)}%</b>
            <Bar value={pct(v.c, v.n)} />
          </div>
        ))}
      </section>

      <div className="sec-title">By topic</div>
      <section className="card">
        <table className="simple"><tbody>
          {Object.entries(r.topics).sort((a, b) => a[1].c / a[1].n - b[1].c / b[1].n).map(([tid, v]) => (
            <tr key={tid}><td><Link to={`${base}quiz/topic/${tid}`} style={{ color: 'inherit' }}>{exam.topicIndex[tid]?.name || tid}</Link></td><td className="num">{v.c}/{v.n}</td><td className="num"><b>{pct(v.c, v.n)}%</b></td></tr>
          ))}
        </tbody></table>
        <p className="muted" style={{ fontSize: '.8rem', margin: '8px 0 0' }}>Weakest first. Tap a topic to practise it.</p>
      </section>

      <div className="sec-title">Slowest questions</div>
      <section className="card">
        <table className="simple"><tbody>
          {slow.map((x) => (
            <tr key={x.id}><td>Q{x.n} · <small className="muted">{exam.topicIndex[x.q.topic]?.name}</small></td><td className="num">{fmtDuration(x.ms)}</td><td className="num">{x.a == null ? '—' : x.a === x.q.answer ? '✓' : '✗'}</td></tr>
          ))}
        </tbody></table>
      </section>

      <div className="sec-title">Review</div>
      <div style={{ marginBottom: 12 }}>
        <Chips value={filter} onChange={(v) => { setFilter(v); setShown(PAGE); }} items={[
          ['wrong', 'Wrong', r.wrong], ['skipped', 'Unanswered', r.skipped], ['flagged', 'Flagged', r.qs.filter((x) => x.f).length], ['right', 'Correct', r.correct], ['all', 'All', r.total],
        ]} />
      </div>
      {list.length ? list.slice(0, shown).map((x) => (
        <QuestionCard key={x.id} q={x.q} exam={exam} order={optionOrder(x.q, r.seed, r.rules.shuffleOptions)} chosen={x.a} reveal num={x.n} total={r.total} flagged={x.f} />
      )) : <Empty>Nothing here.</Empty>}
      {shown < list.length && <button className="btn block" onClick={() => setShown((n) => n + PAGE)}>Show more ({list.length - shown} left)</button>}
      <div className="stack" style={{ marginTop: 16 }}>
        {r.wrong > 0 && <Link className="btn primary block" to={base + 'quiz/mistakes'}><Icon name="repeat" /> Re-attempt my mistakes</Link>}
        <Link className="btn block" to={base + 'mock'}>Back to mock tests</Link>
      </div>
    </Page>
  );
}
