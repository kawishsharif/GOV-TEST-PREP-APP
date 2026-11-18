// Sign-in is required: nothing in the app is shown until a Google account is signed in and not blocked.
import { useState } from 'react';
import { useSync } from './Account.jsx';
import { useToast, Hero, GoogleG } from './ui.jsx';
import { Icon } from './Icon.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';

function Screen({ children }) {
  return (
    <main className="mx-auto w-full max-w-lg px-4 pt-[calc(24px+env(safe-area-inset-top))] pb-10">
      <Hero center text="Aim for the top of the merit list, not just a pass.">
        <img src="icon.svg" alt="" width="64" height="64" className="relative mx-auto mb-3 block size-16 rounded-2xl" />
      </Hero>
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
    return (
      <Screen>
        <p className="flex items-center justify-center gap-2 text-muted-foreground" role="status">
          <Icon name="loader" /> {s.status === 'checking' ? 'Checking your account…' : 'Loading…'}
        </p>
      </Screen>
    );
  }
  if (s.status === 'unavailable') {
    return (
      <Screen>
        <Card className="text-center">
          <p className="m-0">{s.error}</p>
          <Button variant="default" className="w-full" onClick={() => location.reload()}><Icon name="refresh" /> Try again</Button>
        </Card>
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
        <Card className="border-destructive" role="alert">
          <CardTitle as="h2" className="text-destructive"><Icon name="alert" /> This account has been blocked by the administrator.</CardTitle>
          <p className="m-0">You can't use Learn &amp; Lead with this account. Contact the administrator if you think this is a mistake.</p>
        </Card>
      )}
      <Card className="items-center text-center">
        <CardTitle className="justify-center">Sign in to continue</CardTitle>
        <CardDescription className="text-base">Your progress — practice, mistakes, flashcards, mock tests and study plan — is saved to your Google account and follows you to every device.</CardDescription>
        <Button variant="google" className="w-full" disabled={busy} onClick={signIn}>
          {busy ? <Icon name="loader" /> : <GoogleG size={22} />} {busy ? 'Opening Google…' : 'Sign in with Google'}
        </Button>
      </Card>
      <p className="text-center text-xs text-muted-foreground">Independent study tool for the WAPDA AEE (Electrical) test and more. Not affiliated with WAPDA or CTS.</p>
    </Screen>
  );
}
