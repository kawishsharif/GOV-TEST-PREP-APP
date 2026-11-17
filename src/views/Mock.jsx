// Mock test start screen: pattern, blueprint, history.
import { Link, useNavigate } from 'react-router-dom';
import { Page, useExam, useConfirm, Empty } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { buildMock, mockBlueprint, rankBand } from '../lib/mock.js';
import { save } from '../lib/store.js';
import { fmtDay, fmtDuration } from '../lib/util.js';

export default function Mock() {
  const { exam, st, base } = useExam();
  const nav = useNavigate();
  const [confirm, dialog] = useConfirm();
  const s = st.settings;
  const bp = mockBlueprint(exam, st);
  const active = st.activeMock && !st.activeMock.submitted;

  const start = async () => {
    if (!await confirm({
      title: 'Start full mock test?',
      body: `${s.totalQuestions} questions · ${s.minutes} minutes · ${s.negativeMarking ? `−${s.negativeValue} per wrong answer` : 'no negative marking'}. The timer keeps running if you leave the app, and the test auto-submits at time-up. You cannot change answers after submitting.`,
      ok: 'Start now',
    })) return;
    st.activeMock = buildMock(exam, st);
    save(exam.id);
    nav(base + 'mock/run');
  };

  return (
    <Page title="Full mock test" sub="CTS-style simulation" base={base}>
      {dialog}
      {active && (
        <Link className="card row" to={base + 'mock/run'} style={{ textDecoration: 'none', color: 'inherit', borderColor: 'var(--warn)' }}>
          <Icon name="mock" /><div style={{ flex: 1 }}><b>Resume mock in progress</b><br /><small className="muted">The timer is still running.</small></div><Icon name="chev" className="chev" />
        </Link>
      )}
      <section className="card">
        <div className="grid3">
          <div className="stat"><b>{s.totalQuestions}</b><span>questions</span></div>
          <div className="stat"><b>{s.minutes}</b><span>minutes</span></div>
          <div className="stat"><b>{s.negativeMarking ? `−${s.negativeValue}` : 'None'}</b><span>negative marking</span></div>
        </div>
        <p className="muted" style={{ fontSize: '.85rem', margin: '12px 0' }}>{exam.pattern.note} Change the pattern in <Link to={base + 'settings'}>Settings</Link>.</p>
        <button className="btn primary block" onClick={start} disabled={active}><Icon name="bolt" /> {active ? 'A mock is already running' : 'Start mock test'}</button>
        <p className="muted hide-mobile" style={{ fontSize: '.8rem', marginTop: 10 }}>Keyboard: <span className="kbd">1</span>–<span className="kbd">4</span> answer · <span className="kbd">F</span> flag · <span className="kbd">N</span>/<span className="kbd">P</span> next/previous</p>
      </section>

      <div className="sec-title">Paper blueprint</div>
      <section className="card">
        <table className="simple">
          <thead><tr><th>Section</th><th className="num">Weight</th><th className="num">Qs</th></tr></thead>
          <tbody>
            {bp.map((sec) => (
              <tr key={sec.id}><td>{sec.name}<br /><small className="muted">{sec.topics.filter((t) => t.count).map((t) => `${t.name} ${t.count}`).join(' · ')}</small></td><td className="num">{sec.weight}%</td><td className="num"><b>{sec.count}</b></td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="sec-title">Past mocks</div>
      {st.mocks.length ? (
        <section className="card"><ul className="list">
          {[...st.mocks].reverse().map((m) => {
            const band = rankBand(m.pct, m.rules.passPercent);
            return (
              <li key={m.id}><Link className="list-link" to={`${base}result/${m.id}`}>
                <div className="stat" style={{ minWidth: 72, textAlign: 'center', padding: 8 }}><b style={{ fontSize: '1.2rem' }}>{m.pct}%</b></div>
                <div className="grow"><b>{band.label}</b><small className="muted">{fmtDay(m.day, { day: 'numeric', month: 'short', year: 'numeric' })} · {m.correct}/{m.total} correct · {fmtDuration(m.timeUsed)}{m.auto ? ' · auto-submitted' : ''}</small></div>
                <Icon name="chev" className="chev" />
              </Link></li>
            );
          })}
        </ul></section>
      ) : <Empty>No mock tests yet. Take your first one to get a baseline score.</Empty>}
    </Page>
  );
}
