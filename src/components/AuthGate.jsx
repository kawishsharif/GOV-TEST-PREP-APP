// Sign-in is required: nothing in the app is shown until a Google account is signed in and not blocked.
// Signed-out visitors see the landing page: brand, what the platform offers, and Google sign-in.
import { useState } from 'react';
import { useSync } from './Account.jsx';
import { useToast, GoogleG, BrandLogo } from './ui.jsx';
import { Icon } from './Icon.jsx';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const FEATURES = [
  ['list', '850+ exam-style questions', 'Every section of the CTS syllabus — including 165 real past-paper questions — each with a clear explanation.'],
  ['mock', 'Full-length mock tests', 'Timed to the official pattern, with section scores and a rank-band estimate.'],
  ['repeat', 'Revision that sticks', 'A mistake notebook and spaced-repetition flashcards for formulas and facts.'],
  ['calendar', 'A plan to your test date', 'A day-by-day schedule weighted towards your weakest topics.'],
];

const ASSURANCES = [
  ['shield', 'Your name, email and photo are used only to identify your account.'],
  ['cloud', 'Practice, mistakes, mock results and your plan sync automatically.'],
  ['check', 'Free to use — no card, no subscription.'],
];

const YEAR = new Date().getFullYear();

function Footer() {
  return (
    <footer className="border-t bg-card/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-center text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6 sm:text-left">
        <p className="m-0">© {YEAR} Learn &amp; Lead · Independent preparation platform, not affiliated with WAPDA or CTS.</p>
        <p className="m-0">Designed &amp; developed by <span className="font-semibold text-foreground">Engr. M. Kawish Sharif</span></p>
      </div>
    </footer>
  );
}

/** Centred logo + message, for the short loading / error states. */
function Status({ children }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
        <BrandLogo className="w-full max-w-xs" />
        {children}
      </main>
      <Footer />
    </div>
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
      <Status>
        <p className="m-0 flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Icon name="loader" /> {s.status === 'checking' ? 'Checking your account…' : 'Loading…'}
        </p>
      </Status>
    );
  }
  if (s.status === 'unavailable') {
    return (
      <Status>
        <Card className="mb-0 w-full items-center text-center">
          <p className="m-0">{s.error}</p>
          <Button variant="default" className="w-full" onClick={() => location.reload()}><Icon name="refresh" /> Try again</Button>
        </Card>
      </Status>
    );
  }

  const signIn = async () => {
    setBusy(true);
    try { await (await import('../lib/sync.js')).signIn(); } catch (e) { toast(e.message, 6000); } finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background bg-[radial-gradient(70rem_40rem_at_100%_-10%,color-mix(in_srgb,var(--brand)_10%,transparent),transparent),radial-gradient(50rem_30rem_at_-10%_110%,color-mix(in_srgb,var(--primary)_10%,transparent),transparent)]">
      {/* Phones: brand → sign-in → features. Desktop: brand + features on the left, sign-in on the right. */}
      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-4 pt-[calc(2rem+env(safe-area-inset-top))] pb-12 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-x-16 lg:gap-y-8 lg:py-16">
        <section className="min-w-0 text-center lg:col-start-1 lg:row-start-1 lg:self-end lg:text-left">
          <BrandLogo className="mx-auto mb-8 w-full max-w-[19rem] sm:max-w-sm lg:mx-0" />
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground shadow-xs">
            <span className="size-1.5 shrink-0 rounded-full bg-gold" aria-hidden="true" />
            Now preparing: WAPDA AEE (Electrical) · BPS-17
          </p>
          <h1 className="mb-4 text-3xl leading-[1.15] font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            Prepare with purpose.{' '}
            <span className="bg-gradient-to-r from-primary to-brand bg-clip-text text-transparent">Finish at the top.</span>
          </h1>
          <p className="mx-auto mb-0 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg lg:mx-0">
            A structured preparation platform for Pakistan's competitive recruitment tests — exam-pattern practice,
            timed mock tests and a personal study plan, built around the real syllabus.
          </p>
        </section>

        <section className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center" aria-label="Sign in">
          <Card className="mx-auto mb-0 w-full max-w-md gap-5 p-6 shadow-lg sm:p-8">
            {s.blocked && (
              <div className="flex gap-3 rounded-xl border border-destructive bg-destructive-soft p-4" role="alert">
                <Icon name="alert" className="mt-0.5 text-destructive" />
                <div className="min-w-0 text-sm">
                  <b className="block text-destructive">This account has been blocked by the administrator.</b>
                  <span>You can't use Learn &amp; Lead with this account. Contact the administrator if you think this is a mistake.</span>
                </div>
              </div>
            )}
            <div className="space-y-2 text-center">
              <h2 className="m-0 text-2xl font-bold tracking-tight">Sign in to continue</h2>
              <p className="m-0 text-sm leading-relaxed text-muted-foreground">
                Use your Google account to open your dashboard. Your progress is saved securely and follows you to every device.
              </p>
            </div>
            <Button variant="google" size="lg" className="w-full text-base" disabled={busy} onClick={signIn}>
              {busy ? <Icon name="loader" /> : <GoogleG size={22} />} {busy ? 'Opening Google…' : 'Continue with Google'}
            </Button>
            <ul className="m-0 grid list-none gap-2.5 border-t p-0 pt-5 text-sm text-muted-foreground">
              {ASSURANCES.map(([icon, text]) => (
                <li key={icon} className="flex items-start gap-2.5"><Icon name={icon} className="mt-0.5 size-4 text-brand" /><span>{text}</span></li>
              ))}
            </ul>
          </Card>
        </section>

        <ul className="m-0 grid min-w-0 list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:col-start-1 lg:row-start-2 lg:self-start">
          {FEATURES.map(([icon, title, text]) => (
            <li key={title} className="flex gap-3 rounded-xl border bg-card/80 p-4 shadow-xs">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"><Icon name={icon} /></span>
              <div className="min-w-0">
                <b className="block text-sm leading-snug">{title}</b>
                <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">{text}</span>
              </div>
            </li>
          ))}
        </ul>
      </main>
      <Footer />
    </div>
  );
}
