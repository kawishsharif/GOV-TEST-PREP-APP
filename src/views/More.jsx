// "More" tab: everything that is not on the bottom bar.
import { Link } from 'react-router-dom';
import { Page, useExam, useToast } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';

/* global __APP_VERSION__, __BUILD_TIME__ */
const VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
const BUILT = typeof __BUILD_TIME__ !== 'undefined' ? new Date(__BUILD_TIME__) : null;

/** Drop the offline copy of the app (not study progress, which lives in localStorage) and reload. */
async function reloadLatest() {
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations?.()) || [];
    await Promise.all(regs.map((r) => r.unregister()));
    if (window.caches) await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
  } catch { /* still reload */ }
  location.reload();
}

const Item = ({ to, icon, title, sub }) => (
  <li><Link className="list-link" to={to}><Icon name={icon} /><div className="grow"><b>{title}</b><small className="muted">{sub}</small></div><Icon name="chev" className="chev" /></Link></li>
);

export default function More() {
  const { exam, st, base } = useExam();
  const m = Object.keys(st.mistakes).length;
  const toast = useToast();
  const checkUpdate = async () => {
    if (!window.__checkForUpdate) { toast('Updates are checked automatically when the app opens'); return; }
    toast('Checking for updates…');
    try { await window.__checkForUpdate(); } catch { /* offline */ }
    // If a new version exists the app reloads itself within a few seconds.
    setTimeout(() => toast('You have the latest version'), 4000);
  };
  return (
    <Page title="More" sub={exam.title} base={base}>
      <section className="card"><ul className="list">
        <Item to={base + 'mistakes'} icon="repeat" title="Mistake notebook" sub={`${m} question${m === 1 ? '' : 's'} to fix`} />
        <Item to={base + 'flashcards'} icon="cards" title="Flashcards" sub="Spaced repetition: formulas, facts, definitions" />
        <Item to={base + 'quiz/numerical'} icon="calc" title="Numerical drill" sub="Calculation practice with worked steps" />
        <Item to={base + 'planner'} icon="calendar" title="Study planner" sub="Day-by-day plan to your test date" />
        <Item to={base + 'progress'} icon="chart" title="Progress history" sub="Mock scores and daily accuracy over time" />
        <Item to={base + 'formulas'} icon="printer" title="Formula sheet" sub="Every Electrical formula on one printable page" />
        <Item to={base + 'ai'} icon="sparkle" title="AI question generator" sub="Practise against fresh AI-written questions" />
      </ul></section>
      <section className="card"><ul className="list">
        <Item to={base + 'import'} icon="upload" title="Import questions (JSON)" sub="Add your own questions to the bank" />
        <Item to={base + 'settings'} icon="settings" title="Settings & backup" sub="Test date, pattern, weights, theme, export" />
        <Item to="/exams" icon="home" title="All exams" sub="Switch to another test prep" />
      </ul></section>
      <section className="card">
        <h2>App version</h2>
        <p className="muted" style={{ margin: '0 0 12px', fontSize: '.9rem' }}>
          Version <b className="mono">{VERSION}</b>{BUILT && <> · built {BUILT.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</>}.
          The app updates itself when opened; use these if a new feature doesn't show up.
        </p>
        <div className="row wrap">
          <button className="btn" onClick={checkUpdate}><Icon name="repeat" /> Check for updates</button>
          <button className="btn ghost" onClick={reloadLatest}>Reload latest version</button>
        </div>
      </section>
      <p className="muted" style={{ fontSize: '.8rem', textAlign: 'center' }}>Learn &amp; Lead is an independent study tool, not affiliated with WAPDA or CTS. Questions are practice items written in the style of past papers; none is claimed to be from a specific real paper unless it says so.</p>
    </Page>
  );
}
