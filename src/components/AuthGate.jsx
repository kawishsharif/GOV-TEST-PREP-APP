// Sign-in is required: nothing in the app is shown until a Google account is signed in and not blocked.
import { useState } from 'react';
import { useSync } from './Account.jsx';
import { useToast } from './ui.jsx';

const GoogleG = () => (
  <svg viewBox="0 0 48 48" width="22" height="22" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6C44.1 38 46.5 31.8 46.5 24.5z" />
    <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.7l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.2 1.5-4.9 2.3-8.2 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
  </svg>
);

function Screen({ children }) {
  return (
    <main className="gate">
      <section className="hero" style={{ textAlign: 'center' }}>
        <svg className="wave" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"><path d="M2 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0" /><path d="M2 17c2-2 4-2 6 0s4 2 6 0 4-2 6 0" /><path d="M2 7c2-2 4-2 6 0s4 2 6 0 4-2 6 0" /></svg>
        <img src="icon.svg" alt="" width="64" height="64" style={{ borderRadius: 16, marginBottom: 10 }} />
        <h1>Learn &amp; Lead</h1>
        <p>Aim for the top of the merit list, not just a pass.</p>
      </section>
      {children}
    </main>
  );
}

export function AuthGate({ children }) {
  const s = useSync();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  if (s.status === 'unavailable' && !s.error) return children; // sandboxed preview build: no accounts
  if (s.status === 'signedIn') return children;

  if (s.status === 'loading' || s.status === 'checking') {
    return <Screen><p className="muted" style={{ textAlign: 'center' }}>{s.status === 'checking' ? 'Checking your account…' : 'Loading…'}</p></Screen>;
  }
  if (s.status === 'unavailable') {
    return (
      <Screen>
        <section className="card" style={{ textAlign: 'center' }}>
          <p>{s.error}</p>
          <button className="btn primary block" onClick={() => location.reload()}>Try again</button>
        </section>
      </Screen>
    );
  }
  const signIn = async () => {
    setBusy(true);
    try { await (await import('../lib/sync.js')).signIn(); } catch (e) { toast(e.message, 6000); } finally { setBusy(false); }
  };
  return (
    <Screen>
      {s.blocked && (
        <section className="card" style={{ borderColor: 'var(--bad)' }} role="alert">
          <b style={{ color: 'var(--bad)' }}>This account has been blocked by the administrator.</b>
          <p style={{ margin: '6px 0 0' }}>You can't use Learn &amp; Lead with this account. Contact the administrator if you think this is a mistake.</p>
        </section>
      )}
      <section className="card" style={{ textAlign: 'center' }}>
        <h2 style={{ justifyContent: 'center' }}>Sign in to continue</h2>
        <p className="muted">Your progress — practice, mistakes, flashcards, mock tests and study plan — is saved to your Google account and follows you to every device.</p>
        <button className="btn google block" disabled={busy} onClick={signIn}><GoogleG /> {busy ? 'Opening Google…' : 'Sign in with Google'}</button>
      </section>
      <p className="muted" style={{ fontSize: '.8rem', textAlign: 'center' }}>Independent study tool for the WAPDA AEE (Electrical) test and more. Not affiliated with WAPDA or CTS.</p>
    </Screen>
  );
}
