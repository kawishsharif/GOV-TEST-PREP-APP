// "More" tab: everything that is not on the bottom bar.
import { Page, useExam, useToast, List, ListRow } from '../components/ui.jsx';
import { useSync } from '../components/Account.jsx';
import { Icon } from '../components/Icon.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';

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

export default function More() {
  const { exam, st, base } = useExam();
  const m = Object.keys(st.mistakes).length;
  const toast = useToast();
  const sync = useSync();
  const isAdmin = sync.status === 'signedIn' && (sync.user?.email || '').toLowerCase() === 'engrkawish22@gmail.com';
  const checkUpdate = async () => {
    if (!window.__checkForUpdate) { toast('Updates are checked automatically when the app opens'); return; }
    toast('Checking for updates…');
    try { await window.__checkForUpdate(); } catch { /* offline */ }
    // If a new version exists the app reloads itself within a few seconds.
    setTimeout(() => toast('You have the latest version'), 4000);
  };
  return (
    <Page title="More" sub={exam.title} base={base}>
      <Card className="py-2"><List>
        <ListRow to={base + 'mistakes'} icon="repeat" title="Mistake notebook" sub={`${m} question${m === 1 ? '' : 's'} to fix`} />
        <ListRow to={base + 'flashcards'} icon="cards" title="Flashcards" sub="Spaced repetition: formulas, facts, definitions" />
        <ListRow to={base + 'quiz/numerical'} icon="calc" title="Numerical drill" sub="Calculation practice with worked steps" />
        <ListRow to={base + 'planner'} icon="calendar" title="Study planner" sub="Day-by-day plan to your test date" />
        <ListRow to={base + 'progress'} icon="chart" title="Progress history" sub="Mock scores and daily accuracy over time" />
        <ListRow to={base + 'formulas'} icon="printer" title="Formula sheet" sub="Every Electrical formula on one printable page" />
        <ListRow to={base + 'ai'} icon="sparkle" title="AI question generator" sub="Practise against fresh AI-written questions" />
      </List></Card>
      <Card className="py-2"><List>
        <ListRow to={base + 'import'} icon="upload" title="Import questions (JSON)" sub="Add your own questions to the bank" />
        <ListRow to={base + 'settings'} icon="settings" title="Settings & backup" sub="Test date, pattern, weights, theme, export" />
        <ListRow to="/exams" icon="home" title="All exams" sub="Switch to another test prep" />
        {isAdmin && <ListRow to="/admin" icon="users" title="User management (admin)" sub="See users, block or activate them" />}
      </List></Card>
      <Card>
        <CardTitle>App version</CardTitle>
        <p className="m-0 text-sm text-muted-foreground">
          Version <b className="font-mono text-foreground">{VERSION}</b>{BUILT && <> · built {BUILT.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</>}.
          The app updates itself when opened; use these if a new feature doesn't show up.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={checkUpdate}><Icon name="refresh" /> Check for updates</Button>
          <Button variant="ghost" onClick={reloadLatest}>Reload latest version</Button>
        </div>
      </Card>
      <p className="px-2 text-center text-xs text-muted-foreground">Learn &amp; Lead is an independent study tool, not affiliated with WAPDA or CTS. Questions are practice items written in the style of past papers; none is claimed to be from a specific real paper unless it says so.</p>
    </Page>
  );
}
