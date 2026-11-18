// Google account card: sign in / out and cloud-sync status.
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { useToast, GoogleG } from './ui.jsx';
import { Icon } from './Icon.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

let mod = null; // sync module, loaded lazily so Firebase never slows the first paint
const load = () => (mod ? Promise.resolve(mod) : import('../lib/sync.js').then((m) => (mod = m)));
const EMPTY = { status: 'loading' };
const noop = () => () => {};

export function useSync() {
  const [m, setM] = useState(mod);
  useEffect(() => { if (!m) load().then(setM); }, [m]);
  return useSyncExternalStore(m ? m.subscribeSync : noop, m ? m.getSyncState : () => EMPTY);
}

const ago = (t) => {
  if (!t) return '';
  const s = Math.round((Date.now() - t) / 1000);
  return s < 60 ? 'just now' : s < 3600 ? `${Math.round(s / 60)} min ago` : new Date(t).toLocaleString();
};

/** compact: one-line banner variant for the dashboard. */
export function AccountCard({ compact = false, onDismiss }) {
  const s = useSync();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 30000); return () => clearInterval(t); }, []);

  if (s.status === 'unavailable' || s.status === 'loading') {
    if (compact) return null;
    return (
      <Card>
        <CardTitle>Account &amp; sync</CardTitle>
        {s.status === 'loading'
          ? <div className="flex items-center gap-3" aria-label="Loading sign-in"><Skeleton className="size-11 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-1/3" /></div></div>
          : <CardDescription>{s.error || 'Sign-in is available on the installed web app.'}</CardDescription>}
      </Card>
    );
  }
  const doSignIn = async () => {
    setBusy(true);
    try { await (await load()).signIn(); } catch (e) { toast(e.message, 5000); } finally { setBusy(false); }
  };
  const doSignOut = async () => {
    setBusy(true);
    try { await (await load()).signOutUser(); toast('Signed out. Your progress is saved in your account.'); }
    catch (e) { toast(e.message, 6000); }
    finally { setBusy(false); }
  };
  const doSync = async () => { await (await load()).syncNow(); };

  if (s.status === 'signedOut' && s.blocked) {
    return (
      <Card className="border-destructive">
        {!compact && <CardTitle>Account &amp; sync</CardTitle>}
        <p className="m-0"><b className="text-destructive">This account has been blocked by the administrator.</b> You were signed out and your progress is no longer synced. Your progress on this device is still available. Contact the administrator if you think this is a mistake.</p>
      </Card>
    );
  }
  if (s.status === 'signedOut') {
    return (
      <Card>
        {!compact && <CardTitle>Account &amp; sync</CardTitle>}
        <p className="m-0">
          {compact ? <b>Keep your progress safe. </b> : null}
          Sign in with Google to back up your progress and continue on any phone or laptop.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="google" disabled={busy} onClick={doSignIn}><GoogleG /> {busy ? 'Opening Google…' : 'Sign in with Google'}</Button>
          {compact && onDismiss && <Button variant="ghost" size="sm" onClick={onDismiss}>Not now</Button>}
        </div>
      </Card>
    );
  }
  const u = s.user;
  return (
    <Card>
      {!compact && <CardTitle>Account &amp; sync</CardTitle>}
      <div className="flex items-center gap-3">
        <Avatar photo={u.photo} name={u.name} />
        <div className="min-w-0 flex-1">
          <b className="block truncate">{u.name}</b>
          <small className={s.error ? 'block text-sm text-destructive' : 'block text-sm text-muted-foreground'}>{s.syncing ? 'Syncing…' : s.error ? s.error : s.lastSync ? `Progress synced ${ago(s.lastSync)}` : 'Signed in'}</small>
        </div>
      </div>
      {!compact && (
        <div className="flex flex-wrap gap-3">
          <Button disabled={s.syncing} onClick={doSync}><Icon name={s.syncing ? 'loader' : 'refresh'} /> Sync now</Button>
          <Button variant="ghost" disabled={busy} onClick={doSignOut}><Icon name="logout" /> Sign out</Button>
        </div>
      )}
      {!compact && (u.email || '').toLowerCase() === 'engrkawish22@gmail.com' && (
        <Button asChild className="w-full"><Link to="/admin"><Icon name="users" /> User management (admin)</Link></Button>
      )}
      {!compact && <p className="m-0 text-xs text-muted-foreground">Synced: attempts, mistakes, flashcards, mocks, plan and settings. Your AI API keys stay on this device only. Signing out saves your progress to your account and removes it (and your AI keys) from this device.</p>}
    </Card>
  );
}

/** Round profile picture, or the first letter of the name. */
export function Avatar({ photo, name, className = 'size-11' }) {
  return photo
    ? <img className={`${className} shrink-0 rounded-full object-cover`} src={photo} alt="" referrerPolicy="no-referrer" />
    : <span className={`${className} grid shrink-0 place-items-center rounded-full bg-secondary font-bold`} aria-hidden="true">{(name || '?')[0].toUpperCase()}</span>;
}
