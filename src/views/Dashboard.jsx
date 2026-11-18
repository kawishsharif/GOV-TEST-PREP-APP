// Dashboard: days left, readiness, today's target, streak, accuracy by section/topic, weakest topics.
import { Link } from 'react-router-dom';
import { Page, Ring, Bar, useExam, TopbarButton, LinkCard, SectionTitle, Stat, List, ListRow } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { dayKey, pct, fmtDay } from '../lib/util.js';
import { topicReport, sectionReport, readiness, streak, weakest, daysLeft } from '../lib/stats.js';

const Acc = ({ t }) => (t.acc == null
  ? <small className="text-sm text-muted-foreground">not started</small>
  : <span className="whitespace-nowrap"><b className="tabular-nums">{Math.round(t.acc * 100)}%</b> <small className="text-muted-foreground">· {t.n}</small></span>);

/** Name + accuracy, with a full-width bar underneath. */
const MetricRow = ({ title, sub, t }) => (
  <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 py-2">
    <div className="min-w-0">{title}{sub}</div>
    <Acc t={t} />
    <Bar className="col-span-2 h-2" value={t.acc == null ? 0 : t.acc * 100} />
  </div>
);

export default function Dashboard() {
  const { exam, st, base } = useExam();
  const topics = topicReport(exam, st);
  const sections = sectionReport(exam, st, topics);
  const ready = readiness(topics);
  const today = st.daily[dayKey()] || { n: 0, c: 0 };
  const target = st.settings.dailyTarget;
  const dl = daysLeft(st);
  const weak = weakest(topics);
  const mistakes = Object.keys(st.mistakes).length;
  const lastMock = st.mocks[st.mocks.length - 1];
  const active = st.activeMock && !st.activeMock.submitted;

  return (
    <Page title={exam.title} sub="Learn & Lead" back="/exams" base={base}
      right={<TopbarButton to={base + 'settings'} label="Settings" icon="settings" />}>
      {active && <LinkCard to={base + 'mock/run'} icon="mock" tone="warning" title="Mock test in progress" sub="Tap to resume — the timer keeps running." />}
      <Card>
        <div className="flex items-center gap-4">
          <Ring value={ready} label="ready" />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="text-sm text-muted-foreground">Test date · {fmtDay(st.settings.testDate, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            <div className="text-3xl leading-tight font-extrabold tabular-nums">{Math.max(0, dl)}<span className="text-base font-semibold text-muted-foreground"> days left</span></div>
            <div className="flex items-center gap-1.5"><Icon name="fire" className="text-warning" /><b>{streak(st)}</b><span className="text-muted-foreground">day streak</span></div>
          </div>
        </div>
        <p className="m-0 text-xs text-muted-foreground">Readiness = share of each topic's core questions you currently answer correctly, weighted by exam weight.</p>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-4">
          <CardTitle>Today</CardTitle>
          <span className="text-sm text-muted-foreground tabular-nums">{today.n} / {target} questions</span>
        </div>
        <Bar value={pct(today.n, target)} tone="" />
        <div className="grid grid-cols-3 gap-2.5">
          <Stat value={today.n ? pct(today.c, today.n) + '%' : '—'} label="accuracy today" />
          <Stat value={mistakes} label="in mistake book" to={base + 'mistakes'} />
          <Stat value={lastMock ? lastMock.pct + '%' : '—'} label="last mock" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button asChild variant="default"><Link to={base + 'practice'}><Icon name="practice" /> Practise</Link></Button>
          <Button asChild><Link to={base + 'mock'}><Icon name="mock" /> Mock test</Link></Button>
        </div>
      </Card>

      <Card>
        <CardTitle><Icon name="target" /> Weakest topics</CardTitle>
        {weak.length ? (
          <List>
            {weak.map((t) => (
              <ListRow key={t.id} title={t.name}
                sub={t.n >= 5 ? `${Math.round(t.acc * 100)}% accuracy over ${t.n} attempts` : 'Not practised enough yet — high exam weight'}
                right={<Button asChild variant="brand" size="sm"><Link to={`${base}quiz/topic/${t.id}`}>Practise</Link></Button>} />
            ))}
          </List>
        ) : <p className="m-0 py-6 text-center text-muted-foreground">No questions loaded yet.</p>}
      </Card>

      <SectionTitle>Accuracy by section</SectionTitle>
      <Card className="gap-0 divide-y py-2">
        {sections.map((s) => (
          <MetricRow key={s.id} t={s} title={<b>{s.name}</b>} sub={<small className="text-muted-foreground"> · {s.weight}%</small>} />
        ))}
      </Card>

      <SectionTitle>Accuracy by topic</SectionTitle>
      <Card className="gap-0 divide-y py-2">
        {topics.map((t) => (
          <MetricRow key={t.id} t={t}
            title={<Link className="flex min-h-11 items-center font-bold text-inherit no-underline hover:underline" to={`${base}quiz/topic/${t.id}`}>{t.name}</Link>}
            sub={<small className="block text-sm text-muted-foreground">{t.seen}/{t.bank} seen · {t.mastered} mastered</small>} />
        ))}
      </Card>
    </Page>
  );
}
