// Home: one card per exam pack. Add an exam by dropping a folder in public/exams and listing it in exams/index.json.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Page } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { AccountCard } from '../components/Account.jsx';
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
      <section className="hero">
        <svg className="wave" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"><path d="M2 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0" /><path d="M2 17c2-2 4-2 6 0s4 2 6 0 4-2 6 0" /><path d="M2 7c2-2 4-2 6 0s4 2 6 0 4-2 6 0" /></svg>
        <h1>Learn &amp; Lead</h1>
        <p>Aim for the top of the merit list, not just a pass.</p>
      </section>
      <AccountCard />
      <div className="sec-title">Your exams</div>
      {!cards && <p className="muted">Loading…</p>}
      {cards?.map(({ e, n, ready, left, broken }) => (
        <Link key={e.id} className="card exam-card" to={`/x/${e.id}/dashboard`}>
          <span className="band" style={{ background: e.accent || 'var(--accent)' }} />
          <div className="row">
            <div style={{ flex: 1, minWidth: 0 }}>
              <small className="muted">{e.tag}</small>
              <h2>{e.title}</h2>
              <p className="muted" style={{ margin: 0 }}>{e.subtitle}</p>
              {broken ? <p className="muted">Pack could not be loaded.</p> : (
                <div className="row wrap" style={{ marginTop: 10, gap: 0 }}>
                  <span className="tag">{n} questions</span>
                  <span className="tag">{ready}% ready</span>
                  <span className="tag">{left >= 0 ? `${left} days left` : 'Test date passed'}</span>
                </div>
              )}
            </div>
            <Icon name="chev" className="chev" />
          </div>
        </Link>
      ))}
      <div className="card exam-card add flat">
        <Icon name="plus" />
        <p style={{ margin: '6px 0 0' }}><b>More test preps coming</b></p>
        <small>Each exam is a self-contained pack (syllabus, weights, questions, notes) with its own progress.</small>
      </div>
    </Page>
  );
}
