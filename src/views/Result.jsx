// Mock result: score, rank band, timing, section/topic breakdown, full review with explanations.
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Page, useExam, Empty, Bar, Chips, SectionTitle, Stat } from '../components/ui.jsx';
import { QuestionCard } from '../components/QuestionCard.jsx';
import { Icon } from '../components/Icon.jsx';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { questionById } from '../lib/bank.js';
import { optionOrder } from '../lib/quizcore.js';
import { rankBand } from '../lib/mock.js';
import { fmtDuration, fmtDay, pct } from '../lib/util.js';

const PAGE = 10;
const BAND = { good: 'bg-success-soft text-success', warn: 'bg-warning-soft text-warning', bad: 'bg-destructive-soft text-destructive' };

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
      <Card className="items-center gap-2 text-center">
        <div className="text-sm text-muted-foreground">Score</div>
        <div className="text-5xl leading-none font-extrabold tabular-nums">{r.score}<span className="text-xl text-muted-foreground"> / {r.total}</span></div>
        <div className="text-xl font-bold tabular-nums">{r.pct}%{prev && <small className="ml-2 text-sm text-muted-foreground">{r.pct >= prev.pct ? '▲' : '▼'} {Math.abs(Math.round((r.pct - prev.pct) * 10) / 10)} vs last</small>}</div>
        <div className={cn('mt-1 w-full max-w-md rounded-xl px-4 py-2.5', BAND[band.tone] || BAND.warn)}>
          <b className="block">{band.label}</b><span className="text-foreground">{band.detail}</span>
        </div>
        <p className="m-0 text-xs text-muted-foreground">Rank band is a rough estimate from typical score spreads, not official CTS data.</p>
        {r.auto && <p className="m-0 font-semibold text-warning">Auto-submitted at time-up.</p>}
      </Card>

      <Card>
        <div className="grid grid-cols-3 gap-2.5">
          <Stat value={r.correct} tone="success" label="correct" />
          <Stat value={r.wrong} tone="destructive" label={`wrong${r.rules.negativeMarking ? ` (−${Math.round(r.wrong * r.rules.negativeValue * 100) / 100})` : ''}`} />
          <Stat value={r.skipped} label="unanswered" />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Stat value={fmtDuration(r.timeUsed)} label={`time used of ${r.rules.minutes} min`} />
          <Stat value={`${Math.round(avg / 1000)}s`} label="average per question" />
        </div>
        {r.skipped > 0 && !r.rules.negativeMarking && <p className="m-0 flex gap-2 text-sm text-muted-foreground"><Icon name="tip" className="size-4 text-warning" /> Tip: with no negative marking, never leave a question blank — an educated guess can only gain marks.</p>}
      </Card>

      <SectionTitle>By section</SectionTitle>
      <Card className="gap-0 divide-y py-2">
        {Object.entries(r.sections).map(([sid, v]) => (
          <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 py-2" key={sid}>
            <div className="min-w-0"><b>{exam.sectionIndex[sid]?.name || sid}</b><small className="block text-sm text-muted-foreground">{v.c} correct · {v.w} wrong · {v.s} blank</small></div>
            <b className="tabular-nums">{pct(v.c, v.n)}%</b>
            <Bar className="col-span-2 h-2" value={pct(v.c, v.n)} />
          </div>
        ))}
      </Card>

      <SectionTitle>By topic</SectionTitle>
      <Card>
        <Table><TableBody>
          {Object.entries(r.topics).sort((a, b) => a[1].c / a[1].n - b[1].c / b[1].n).map(([tid, v]) => (
            <TableRow key={tid}>
              <TableCell><Link to={`${base}quiz/topic/${tid}`} className="flex min-h-10 items-center text-inherit hover:underline">{exam.topicIndex[tid]?.name || tid}</Link></TableCell>
              <TableCell className="text-right tabular-nums">{v.c}/{v.n}</TableCell>
              <TableCell className="text-right tabular-nums"><b>{pct(v.c, v.n)}%</b></TableCell>
            </TableRow>
          ))}
        </TableBody></Table>
        <p className="m-0 text-xs text-muted-foreground">Weakest first. Tap a topic to practise it.</p>
      </Card>

      <SectionTitle>Slowest questions</SectionTitle>
      <Card>
        <Table><TableBody>
          {slow.map((x) => (
            <TableRow key={x.id}>
              <TableCell>Q{x.n} · <small className="text-muted-foreground">{exam.topicIndex[x.q.topic]?.name}</small></TableCell>
              <TableCell className="text-right tabular-nums">{fmtDuration(x.ms)}</TableCell>
              <TableCell className="w-10 text-right">{x.a == null ? '—' : x.a === x.q.answer
                ? <Icon name="ok" className="ml-auto size-4 text-success" label="Correct" />
                : <Icon name="wrong" className="ml-auto size-4 text-destructive" label="Wrong" />}</TableCell>
            </TableRow>
          ))}
        </TableBody></Table>
      </Card>

      <SectionTitle>Review</SectionTitle>
      <Chips className="mb-3" value={filter} onChange={(v) => { setFilter(v); setShown(PAGE); }} items={[
        ['wrong', 'Wrong', r.wrong], ['skipped', 'Unanswered', r.skipped], ['flagged', 'Flagged', r.qs.filter((x) => x.f).length], ['right', 'Correct', r.correct], ['all', 'All', r.total],
      ]} />
      {list.length ? list.slice(0, shown).map((x) => (
        <QuestionCard key={x.id} q={x.q} exam={exam} order={optionOrder(x.q, r.seed, r.rules.shuffleOptions)} chosen={x.a} reveal num={x.n} total={r.total} flagged={x.f} />
      )) : <Empty>Nothing here.</Empty>}
      {shown < list.length && <Button className="w-full" onClick={() => setShown((n) => n + PAGE)}>Show more ({list.length - shown} left)</Button>}
      <div className="mt-4 space-y-3">
        {r.wrong > 0 && <Button asChild variant="default" className="w-full"><Link to={base + 'quiz/mistakes'}><Icon name="repeat" /> Re-attempt my mistakes</Link></Button>}
        <Button asChild className="w-full"><Link to={base + 'mock'}>Back to mock tests</Link></Button>
      </div>
    </Page>
  );
}
