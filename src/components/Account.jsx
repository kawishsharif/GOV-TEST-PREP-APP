// Google account card: sign in / out and cloud-sync status.
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useToast } from './ui.jsx';
import { Icon } from './Icon.jsx';

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

const GoogleG = () => (
  <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6C44.1 38 46.5 31.8 46.5 24.5z" />
    <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.7l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.2 1.5-4.9 2.3-8.2 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
  </svg>
);

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
      <section className="card">
        <h2>Account &amp; sync</h2>
        <p className="muted" style={{ margin: 0 }}>{s.status === 'loading' ? 'Loading sign-in…' : (s.error || 'Sign-in is available on the installed web app.')}</p>
      </section>
    );
  }
  const doSignIn = async () => {
    setBusy(true);
    try { await (await load()).signIn(); } catch (e) { toast(e.message, 5000); } finally { setBusy(false); }
  };
  const doSignOut = async () => {
    setBusy(true);
    try { await (await load()).signOutUser(); toast('Signed out. Your progress stays on this device.'); } finally { setBusy(false); }
  };
  const doSync = async () => { await (await load()).syncNow(); };

  if (s.status === 'signedOut') {
    return (
      <section className="card account">
        {!compact && <h2>Account &amp; sync</h2>}
        <p style={{ marginTop: compact ? 0 : undefined }}>
          {compact ? <b>Keep your progress safe. </b> : null}
          Sign in with Google to back up your progress and continue on any phone or laptop.
        </p>
        <div className="row wrap">
          <button className="btn google" disabled={busy} onClick={doSignIn}><GoogleG /> {busy ? 'Opening Google…' : 'Sign in with Google'}</button>
          {compact && onDismiss && <button className="btn ghost sm" onClick={onDismiss}>Not now</button>}
        </div>
      </section>
    );
  }
  const u = s.user;
  return (
    <section className="card account">
      {!compact && <h2>Account &amp; sync</h2>}
      <div className="row">
        {u.photo ? <img className="avatar" src={u.photo} alt="" referrerPolicy="no-referrer" /> : <span className="avatar">{(u.name || '?')[0]}</span>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <b style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</b>
          <small className="muted">{s.syncing ? 'Syncing…' : s.error ? s.error : s.lastSync ? `Progress synced ${ago(s.lastSync)}` : 'Signed in'}</small>
        </div>
      </div>
      {!compact && (
        <div className="row wrap" style={{ marginTop: 12 }}>
          <button className="btn" disabled={s.syncing} onClick={doSync}><Icon name="repeat" /> Sync now</button>
          <button className="btn ghost" disabled={busy} onClick={doSignOut}>Sign out</button>
        </div>
      )}
      {!compact && <p className="muted" style={{ fontSize: '.8rem', margin: '10px 0 0' }}>Synced: attempts, mistakes, flashcards, mocks, plan and settings. Your AI API keys stay on this device only.</p>}
    </section>
  );
}
