// Shared UI building blocks: page frame, toasts, dialogs, rings, bars, chips, list rows, stat tiles, rich text.
// Built on the shadcn/ui primitives in ./ui/ and Tailwind tokens (see src/index.css).
import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore, Fragment } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { toast as sonner } from 'sonner';
import { Icon } from './Icon.jsx';
import { subscribe, getVersion, examState } from '../lib/store.js';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster } from '@/components/ui/sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// ---------- store hook ----------
/** Re-render whenever any progress/settings change is saved. */
export const useStoreVersion = () => useSyncExternalStore(subscribe, getVersion);

export const ExamContext = createContext(null);
/** Current exam pack + its (live) progress state. */
export function useExam() {
  const ctx = useContext(ExamContext);
  useStoreVersion();
  return { ...ctx, st: examState(ctx.exam) };
}

// ---------- rich text: ^{sup} and _{sub} ----------
export function Rich({ text }) {
  const parts = String(text ?? '').split(/(\^\{[^}]*\}|_\{[^}]*\})/g);
  return parts.map((p, i) => {
    if (p.startsWith('^{')) return <sup key={i}>{p.slice(2, -1)}</sup>;
    if (p.startsWith('_{')) return <sub key={i}>{p.slice(2, -1)}</sub>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}

// ---------- page frame ----------
const TABS = [
  ['dashboard', 'Home', 'dash'],
  ['practice', 'Practice', 'practice'],
  ['mock', 'Mock', 'mock'],
  ['notes', 'Notes', 'notes'],
  ['more', 'More', 'more'],
];
const TAB_OF = { strategy: 'notes', quiz: 'practice', result: 'mock', formulas: 'notes', flashcards: 'more', mistakes: 'more', planner: 'more', progress: 'more', ai: 'more', import: 'more', settings: 'more' };

/** Icon button for the coloured top bar (links or buttons). */
export function TopbarButton({ to, label, icon, className, ...props }) {
  const cls = cn('grid size-12 shrink-0 cursor-pointer place-items-center rounded-xl text-topbar-foreground no-underline transition hover:bg-white/10 active:bg-white/15 focus-visible:outline-topbar-foreground', className);
  const inner = <Icon name={icon} className="size-6" />;
  return to
    ? <Link className={cls} to={to} aria-label={label} {...props}>{inner}</Link>
    : <button type="button" className={cls} aria-label={label} {...props}>{inner}</button>;
}

export function Page({ title, sub, back, right, tabs = true, full = false, base, children }) {
  const loc = useLocation();
  useEffect(() => {
    document.title = title && title !== 'Learn & Lead' ? `${title} · Learn & Lead` : 'Learn & Lead';
  }, [title]);
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  const seg = loc.pathname.split('/')[3] || 'dashboard';
  const current = TAB_OF[seg] || seg;
  return (
    <>
      <header className="topbar sticky top-0 z-20 bg-topbar text-topbar-foreground pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex min-h-16 max-w-3xl items-center gap-2 px-2 sm:px-4">
          {back
            ? <TopbarButton to={back} label="Back" icon="back" />
            : <span className="grid size-12 shrink-0 place-items-center" aria-hidden="true"><Icon name="wave" className="size-6" /></span>}
          <div className="min-w-0 flex-1">
            <h1 className="m-0 truncate text-base font-bold tracking-tight">{title}</h1>
            {sub && <span className="block truncate text-xs opacity-85">{sub}</span>}
          </div>
          {right}
        </div>
      </header>
      <main className={cn('mx-auto w-full max-w-3xl px-4 pt-4', full ? 'pb-[calc(140px+env(safe-area-inset-bottom))]' : 'pb-[calc(96px+env(safe-area-inset-bottom))]')}>{children}</main>
      {tabs && base && (
        <nav className="tabbar fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:mx-auto lg:max-w-3xl lg:rounded-t-2xl lg:border-x" aria-label="Sections">
          {TABS.map(([v, l, i]) => {
            const on = current === v;
            return (
              <NavLink key={v} to={base + v} aria-current={on ? 'page' : undefined}
                className={cn('flex min-h-15 flex-col items-center justify-center gap-0.5 text-xs font-semibold no-underline transition-colors', on ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}>
                <Icon name={i} className="size-6" /><span>{l}</span>
              </NavLink>
            );
          })}
        </nav>
      )}
    </>
  );
}

/** Fixed bar at the bottom of the screen for the page's main actions. `aboveTabs` lifts it over the tab bar. */
export function ActionBar({ aboveTabs = false, className, children }) {
  return (
    <div className={cn('actionbar fixed inset-x-0 z-25 border-t bg-card px-4 pt-2.5 pb-[calc(10px+env(safe-area-inset-bottom))]', aboveTabs ? 'bottom-[calc(60px+env(safe-area-inset-bottom))]' : 'bottom-0')}>
      <div className={cn('mx-auto flex max-w-3xl items-center gap-2.5 [&>*]:flex-1', className)}>{children}</div>
    </div>
  );
}

// ---------- page sections ----------
export const SectionTitle = ({ children, className }) => (
  <h2 className={cn('mx-1 mt-6 mb-2 text-xs font-bold tracking-wider text-muted-foreground uppercase', className)}>{children}</h2>
);

/** Brand banner (home + sign-in). */
export function Hero({ title = 'Learn & Lead', text, center = false, children }) {
  return (
    <section className={cn('relative mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-[#0b5675] via-[#0e7490] to-[#0e9488] p-5 text-white sm:p-6', center && 'text-center')}>
      <Icon name="wave" className="pointer-events-none absolute -right-5 -bottom-2.5 size-44 opacity-20" />
      {children}
      <h1 className="relative mb-1 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      {text && <p className="relative m-0 opacity-90">{text}</p>}
    </section>
  );
}

const STAT_TONE = { success: 'text-success', destructive: 'text-destructive', warning: 'text-warning' };
/** Small figure tile: big number + caption. Pass `to` to make it a link. */
export function Stat({ value, label, to, tone, className }) {
  const cls = cn('block min-w-0 rounded-xl bg-secondary p-3 text-inherit no-underline', to && 'transition-colors hover:bg-accent', className);
  const body = (
    <>
      <b className={cn('block text-2xl leading-tight tabular-nums', STAT_TONE[tone])}>{value}</b>
      <span className="mt-1 block text-xs leading-snug text-muted-foreground">{label}</span>
    </>
  );
  return to ? <Link to={to} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}

/** Divided list inside a card. */
export const List = ({ className, children }) => <ul className={cn('m-0 list-none divide-y p-0', className)}>{children}</ul>;

/** One row of a list: optional icon, title + subtitle, and a trailing element (chevron for links). */
export function ListRow({ to, onClick, icon, title, sub, right, className }) {
  const inner = (
    <>
      {icon && <Icon name={icon} className="text-primary" />}
      <div className="min-w-0 flex-1">
        <b className="block break-words">{title}</b>
        {sub != null && <small className="block text-sm text-muted-foreground">{sub}</small>}
      </div>
      {right ?? ((to || onClick) && <Icon name="chev" className="text-muted-foreground" />)}
    </>
  );
  const cls = cn('flex min-h-14 w-full items-center gap-3 px-1 py-2.5 text-left text-inherit no-underline', (to || onClick) && 'cursor-pointer rounded-lg transition-colors hover:bg-accent/60', className);
  return (
    <li>
      {to ? <Link className={cls} to={to}>{inner}</Link>
        : onClick ? <button type="button" className={cls} onClick={onClick}>{inner}</button>
          : <div className={cls}>{inner}</div>}
    </li>
  );
}

/** Highlighted card that links somewhere (resume banners). */
export function LinkCard({ to, icon, title, sub, tone, className }) {
  return (
    <Link to={to} className={cn('mb-4 flex min-h-16 items-center gap-3 rounded-xl border bg-card p-4 text-inherit no-underline shadow-card transition-colors hover:bg-accent/40', tone === 'warning' && 'border-warning', className)}>
      <Icon name={icon} className="text-primary" />
      <div className="min-w-0 flex-1"><b className="block">{title}</b>{sub && <small className="block text-sm text-muted-foreground">{sub}</small>}</div>
      <Icon name="chev" className="text-muted-foreground" />
    </Link>
  );
}

// ---------- toasts (sonner) ----------
const ToastCtx = createContext(() => {});
/** toast(message, durationMs?) — same call signature as before, rendered by sonner. */
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const show = useCallback((m, ms = 2200) => { sonner(m, { duration: ms }); }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <Toaster />
    </ToastCtx.Provider>
  );
}

// ---------- dialogs ----------
/** Bottom sheet on phones / centred dialog on wide screens. */
export function Sheet({ open, onClose, children, label, description }) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent {...(description ? {} : { 'aria-describedby': undefined })}>
        <DialogHeader className="sr-only"><DialogTitle>{label}</DialogTitle>{description && <DialogDescription>{description}</DialogDescription>}</DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

/** Promise-style confirm dialog. Usage: const [confirm, dialog] = useConfirm(); ... {dialog} ... if (await confirm({...})) */
export function useConfirm() {
  const [state, setState] = useState(null);
  const confirm = useCallback((o) => new Promise((resolve) => setState({ ...o, resolve })), []);
  const close = (v) => { state?.resolve(v); setState(null); };
  const dialog = (
    <Dialog open={!!state} onOpenChange={(o) => { if (!o) close(false); }}>
      {state && (
        <DialogContent showCloseButton={false}>
          <DialogHeader className="pr-0">
            <DialogTitle>{state.title}</DialogTitle>
            <DialogDescription>{state.body}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => close(false)}>{state.cancel || 'Cancel'}</Button>
            <Button variant={state.danger ? 'destructive' : 'default'} onClick={() => close(true)}>{state.ok || 'Confirm'}</Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
  return [confirm, dialog];
}

// ---------- visuals ----------
export function Ring({ value, label, size = 116 }) {
  const r = size / 2 - 8, c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${label} ${value}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--secondary)" strokeWidth="12" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--brand)" strokeWidth="12" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div><b className="block text-2xl leading-none tabular-nums">{value}%</b><small className="text-xs text-muted-foreground">{label}</small></div>
      </div>
    </div>
  );
}

const BAR_TONE = { good: 'bg-success', warn: 'bg-warning', bad: 'bg-destructive', '': 'bg-brand' };
export function Bar({ value, tone, className }) {
  const t = tone ?? (value == null ? '' : value >= 75 ? 'good' : value >= 55 ? 'warn' : 'bad');
  return (
    <div className={cn('h-2.5 overflow-hidden rounded-full bg-secondary', className)}>
      <i className={cn('block h-full rounded-full', BAR_TONE[t] ?? 'bg-brand')} style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} />
    </div>
  );
}

/** Toggle pills (single or multi select). */
export function Chips({ items, value, onChange, multi = false, className }) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {items.map(([k, label, extra]) => {
        const on = multi ? value.includes(k) : value === k;
        return (
          <button key={k} type="button" aria-pressed={on} onClick={() => onChange(k)}
            className={cn('inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors focus-visible:outline-offset-3',
              on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:bg-accent')}>
            {label}{extra != null && <small className="font-medium opacity-80">{extra}</small>}
          </button>
        );
      })}
    </div>
  );
}

export const Empty = ({ children, className }) => (
  <Card className={cn('items-center px-3 py-7 text-center text-muted-foreground', className)}><div>{children}</div></Card>
);

/** Placeholder while something loads. */
export function LoadingCards({ count = 2 }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-3 rounded-xl border bg-card p-4">
          <Skeleton className="h-4 w-1/3" /><Skeleton className="h-6 w-2/3" /><Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}

export const GoogleG = ({ size = 20 }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" className="shrink-0">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6C44.1 38 46.5 31.8 46.5 24.5z" />
    <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.7l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.2 1.5-4.9 2.3-8.2 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
  </svg>
);

/** Keyboard key hint. */
export const Kbd = ({ children }) => (
  <kbd className="inline-block rounded-md border border-b-2 px-1.5 font-mono text-xs leading-5 text-foreground">{children}</kbd>
);

/** Keyboard shortcut line, shown on wide screens only. */
export const KeyHints = ({ children, className }) => (
  <p className={cn('hidden text-xs text-muted-foreground lg:block', className)}>{children}</p>
);
