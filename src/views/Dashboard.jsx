// Dashboard: days left, readiness, today's target, streak, accuracy by section/topic, weakest topics.
import { Link } from 'react-router-dom';
import { Page, Ring, Bar, useExam } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';

import { dayKey, pct, fmtDay } from '../lib/util.js';
import { topicReport, sectionReport, readiness, streak, weakest, daysLeft } from '../lib/stats.js';

const Acc = ({ t }) => (t.acc == null ? <small className="muted">not started</small> : <span><b>{Math.round(t.acc * 100)}%</b> <small className="muted">· {t.n}</small></span>);

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
      right={<Link className="iconbtn" to={base + 'settings'} aria-label="Settings"><Icon name="settings" /></Link>}>
      {active && (
        <Link className="card row" to={base + 'mock/run'} style={{ textDecoration: 'none', color: 'inherit', borderColor: 'var(--warn)' }}>
          <Icon name="mock" /><div style={{ flex: 1 }}><b>Mock test in progress</b><br /><small className="muted">Tap to resume — the timer keeps running.</small></div><Icon name="chev" className="chev" />
        </Link>
      )}
      <section className="card">
        <div className="row">
          <Ring value={ready} label="ready" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="muted" style={{ fontSize: '.85rem' }}>Test date · {fmtDay(st.settings.testDate, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.1 }}>{Math.max(0, dl)}<span className="muted" style={{ fontSize: '1rem', fontWeight: 600 }}> days left</span></div>
            <div className="row" style={{ marginTop: 6, gap: 6 }}><Icon name="fire" /><b>{streak(st)}</b><span className="muted">day streak</span></div>
          </div>
        </div>
        <p className="muted" style={{ fontSize: '.8rem', margin: '10px 0 0' }}>Readiness = share of each topic's core questions you currently answer correctly, weighted by exam weight.</p>
      </section>

      <section className="card">
        <div className="row between"><h2 style={{ margin: 0 }}>Today</h2><span className="muted">{today.n} / {target} questions</span></div>
        <div style={{ margin: '10px 0 12px' }}><Bar value={pct(today.n, target)} tone="" /></div>
        <div className="grid3">
          <div className="stat"><b>{today.n ? pct(today.c, today.n) + '%' : '—'}</b><span>accuracy today</span></div>
          <Link className="stat" to={base + 'mistakes'} style={{ color: 'inherit', textDecoration: 'none' }}><b>{mistakes}</b><span>in mistake book</span></Link>
          <div className="stat"><b>{lastMock ? lastMock.pct + '%' : '—'}</b><span>last mock</span></div>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <Link className="btn primary block" to={base + 'practice'}><Icon name="practice" /> Practise</Link>
          <Link className="btn block" to={base + 'mock'}><Icon name="mock" /> Mock test</Link>
        </div>
      </section>

      <section className="card">
        <h2><Icon name="target" /> Weakest topics</h2>
        {weak.length ? (
          <ul className="list">
            {weak.map((t) => (
              <li key={t.id}><div className="list-link">
                <div className="grow"><b>{t.name}</b><small className="muted">{t.n >= 5 ? `${Math.round(t.acc * 100)}% accuracy over ${t.n} attempts` : 'Not practised enough yet — high exam weight'}</small></div>
                <Link className="btn sm accent" to={`${base}quiz/topic/${t.id}`}>Practise</Link>
              </div></li>
            ))}
          </ul>
        ) : <p className="empty">No questions loaded yet.</p>}
      </section>

      <div className="sec-title">Accuracy by section</div>
      <section className="card">
        {sections.map((s) => (
          <div className="metric-row" key={s.id}>
            <div><b>{s.name}</b> <small className="muted">· {s.weight}%</small></div><Acc t={s} />
            <Bar value={s.acc == null ? 0 : s.acc * 100} />
          </div>
        ))}
      </section>

      <div className="sec-title">Accuracy by topic</div>
      <section className="card">
        {topics.map((t) => (
          <div className="metric-row" key={t.id}>
            <div><Link className="topic-link" to={`${base}quiz/topic/${t.id}`}><b>{t.name}</b></Link><br /><small className="muted">{t.seen}/{t.bank} seen · {t.mastered} mastered</small></div>
            <Acc t={t} />
            <Bar value={t.acc == null ? 0 : t.acc * 100} />
          </div>
        ))}
      </section>
    </Page>
  );
}
