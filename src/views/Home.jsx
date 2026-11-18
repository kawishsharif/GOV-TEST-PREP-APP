// Home: one card per exam pack. Add an exam by dropping a folder in public/exams and listing it in exams/index.json.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Page, Hero, SectionTitle, LoadingCards } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { AccountCard } from '../components/Account.jsx';
import { Badge } from '@/components/ui/badge';
import { loadRegistry, loadExam } from '../lib/bank.js';
import { examState } from '../lib/store.js';
import { topicReport, readiness, daysLeft } from '../lib/stats.js';

export default function Home() {
  const [cards, setCards] = useState(null);
  useEffect(() => {
    loadRegistry().then((reg) => Promise.all(reg.exams.map(async (e) => {
      try {
        const exam = await loadExam(e.id);
        const st = examState(exam);
        return { e, n: exam.questions.length, ready: readiness(topicReport(exam, st)), left: daysLeft(st) };
      } catch { return { e, broken: true }; }
    }))).then(setCards);
  }, []);
  return (
    <Page title="Learn & Lead" sub="Prepare. Practise. Lead the merit list." tabs={false}>
      <Hero text="Aim for the top of the merit list, not just a pass." />
      <AccountCard />
      <SectionTitle>Your exams</SectionTitle>
      {!cards && <LoadingCards count={1} />}
      {cards?.map(({ e, n, ready, left, broken }) => (
        <Link key={e.id} to={`/x/${e.id}/dashboard`}
          className="relative mb-4 flex items-center gap-3 overflow-hidden rounded-xl border bg-card p-4 pl-5 text-inherit no-underline shadow-card transition-colors hover:bg-accent/40 sm:p-5 sm:pl-6">
          <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: e.accent || 'var(--brand)' }} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <small className="text-sm text-muted-foreground">{e.tag}</small>
            <h2 className="mt-0.5 mb-1 text-lg font-semibold tracking-tight">{e.title}</h2>
            <p className="m-0 text-sm text-muted-foreground">{e.subtitle}</p>
            {broken ? <p className="mt-2 mb-0 text-sm text-destructive">Pack could not be loaded.</p> : (
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge>{n} questions</Badge>
                <Badge>{ready}% ready</Badge>
                <Badge>{left >= 0 ? `${left} days left` : 'Test date passed'}</Badge>
              </div>
            )}
          </div>
          <Icon name="chev" className="text-muted-foreground" />
        </Link>
      ))}
      <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed p-5 text-center text-muted-foreground">
        <Icon name="plus" className="size-7" />
        <b className="text-foreground">More test preps coming</b>
        <small className="text-sm">Each exam is a self-contained pack (syllabus, weights, questions, notes) with its own progress.</small>
      </div>
    </Page>
  );
}
