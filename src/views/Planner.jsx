// Study planner view: today first, mark days done, regenerate when weak topics change.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Page, useExam, Empty, Bar, useToast } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { generatePlan } from '../lib/planner.js';
import { save } from '../lib/store.js';
import { dayKey, fmtDay, pct } from '../lib/util.js';

const LINK = { practice: (t) => `quiz/topic/${t}`, notes: (t) => `notes/${t}`, mock: () => 'mock', mistakes: () => 'mistakes', cards: () => 'flashcards', formulas: () => 'formulas' };

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
        <section className="card">
          <p>A day-by-day plan from today to your test date ({fmtDay(st.settings.testDate, { day: 'numeric', month: 'short', year: 'numeric' })}). Topics are weighted by exam weight and your weakness; a full mock every 7th day; the final week is revision and mocks.</p>
          <button className="btn primary block" onClick={make}><Icon name="calendar" /> Generate my plan</button>
        </section>
      </Page>
    );
  }
  const { days, done } = st.plan;
  const doneCount = days.filter((d) => done[d.d]).length;
  const visible = days.filter((d) => showPast || d.d >= today);
  return (
    <Page title="Study planner" sub={`${doneCount}/${days.length} days done`} back={base + 'more'} base={base}>
      <section className="card">
        <Bar value={pct(doneCount, days.length)} tone="" />
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn block" onClick={make}><Icon name="repeat" /> Regenerate{stale ? ' (test date changed)' : ''}</button>
          <button className="btn block ghost" onClick={() => setShowPast((v) => !v)}>{showPast ? 'Hide past days' : 'Show past days'}</button>
        </div>
        <p className="muted" style={{ fontSize: '.8rem', margin: '10px 0 0' }}>Regenerate weekly: the plan re-weights towards topics where your accuracy is lowest. Ticked days are kept.</p>
      </section>
      {!visible.length && <Empty>No days left in the plan. Update your test date in Settings and regenerate.</Empty>}
      <section className="card" style={{ paddingTop: 4, paddingBottom: 4 }}>
        {visible.map((day) => {
          const isToday = day.d === today;
          return (
            <div key={day.d} className={`day ${isToday ? 'today' : ''} ${done[day.d] ? 'done' : ''}`}>
              <div className="date"><b>{fmtDay(day.d, { day: 'numeric' })}</b>{fmtDay(day.d, { month: 'short' })}</div>
              <div className="tasks">
                {day.tasks.map((t, i) => <div key={i}>{LINK[t.k] ? <Link to={base + LINK[t.k](t.topic)} style={{ color: 'inherit' }}>{t.text}</Link> : <span className="task">{t.text}</span>}</div>)}
              </div>
              <label className="switch toggle" aria-label={`Mark ${fmtDay(day.d, { day: 'numeric', month: 'long' })} done`}>
                <input type="checkbox" checked={!!done[day.d]} onChange={(e) => { done[day.d] = e.target.checked; save(exam.id); }} />
              </label>
            </div>
          );
        })}
      </section>
    </Page>
  );
}
