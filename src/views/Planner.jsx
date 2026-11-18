// Study planner view: today first, mark days done, regenerate when weak topics change.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Page, useExam, Empty, Bar, useToast } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { generatePlan } from '../lib/planner.js';
import { save } from '../lib/store.js';
import { dayKey, fmtDay, pct } from '../lib/util.js';

const LINK = { practice: (t) => `quiz/topic/${t}`, notes: (t) => `notes/${t}`, mock: () => 'mock', mistakes: () => 'mistakes', cards: () => 'flashcards', formulas: () => 'formulas' };
const TASK = "flex min-h-10 items-center gap-2 text-inherit no-underline before:text-muted-foreground before:content-['•']";

export default function Planner() {
  const { exam, st, base } = useExam();
  const toast = useToast();
  const [showPast, setShowPast] = useState(false);
  const today = dayKey();
  const stale = !st.plan || st.plan.stale || st.plan.testDate !== st.settings.testDate;
  const make = () => { st.plan = generatePlan(exam, st); save(exam.id); toast('Plan generated from your current weak topics'); };
  if (!st.plan) {
    return (
      <Page title="Study planner" sub={exam.title} back={base + 'more'} base={base}>
        <Card>
          <p className="m-0">A day-by-day plan from today to your test date ({fmtDay(st.settings.testDate, { day: 'numeric', month: 'short', year: 'numeric' })}). Topics are weighted by exam weight and your weakness; a full mock every 7th day; the final week is revision and mocks.</p>
          <Button variant="default" className="w-full" onClick={make}><Icon name="calendar" /> Generate my plan</Button>
        </Card>
      </Page>
    );
  }
  const { days, done } = st.plan;
  const doneCount = days.filter((d) => done[d.d]).length;
  const visible = days.filter((d) => showPast || d.d >= today);
  return (
    <Page title="Study planner" sub={`${doneCount}/${days.length} days done`} back={base + 'more'} base={base}>
      <Card>
        <Bar value={pct(doneCount, days.length)} tone="" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button onClick={make}><Icon name="repeat" /> Regenerate{stale ? ' (test date changed)' : ''}</Button>
          <Button variant="ghost" onClick={() => setShowPast((v) => !v)}>{showPast ? 'Hide past days' : 'Show past days'}</Button>
        </div>
        <p className="m-0 text-xs text-muted-foreground">Regenerate weekly: the plan re-weights towards topics where your accuracy is lowest. Ticked days are kept.</p>
      </Card>
      {!visible.length && <Empty>No days left in the plan. Update your test date in Settings and regenerate.</Empty>}
      {visible.length > 0 && (
        <Card className="gap-0 divide-y py-1">
          {visible.map((day) => {
            const isToday = day.d === today, isDone = !!done[day.d];
            return (
              <div key={day.d} className="flex items-start gap-3 py-3">
                <div className={cn('w-14 shrink-0 rounded-lg py-1.5 text-center text-xs', isToday ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground')}>
                  <b className={cn('block text-xl leading-tight', !isToday && 'text-foreground')}>{fmtDay(day.d, { day: 'numeric' })}</b>{fmtDay(day.d, { month: 'short' })}
                </div>
                <div className={cn('min-w-0 flex-1 text-sm', isDone && 'line-through opacity-55')}>
                  {day.tasks.map((t, i) => (
                    <div key={i}>{LINK[t.k] ? <Link to={base + LINK[t.k](t.topic)} className={cn(TASK, 'hover:underline')}>{t.text}</Link> : <span className={TASK}>{t.text}</span>}</div>
                  ))}
                </div>
                <div className="grid min-h-12 min-w-12 place-items-center">
                  <Switch checked={isDone} aria-label={`Mark ${fmtDay(day.d, { day: 'numeric', month: 'long' })} done`}
                    onCheckedChange={(v) => { done[day.d] = v; save(exam.id); }} />
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </Page>
  );
}
