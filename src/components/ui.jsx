// Shared UI building blocks: page frame, tabs, toasts, sheets, rings, bars, rich text.
import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore, Fragment } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Icon } from './Icon.jsx';
import { subscribe, getVersion, examState } from '../lib/store.js';

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
      <header className="topbar">
        {back
          ? <Link className="iconbtn" to={back} aria-label="Back"><Icon name="back" /></Link>
          : <span className="iconbtn" aria-hidden="true"><Icon name="wave" /></span>}
        <div className="title"><h1>{title}</h1>{sub && <span>{sub}</span>}</div>
        {right}
      </header>
      <main className={full ? 'full' : ''}>{children}</main>
      {tabs && base && (
        <nav className="tabbar" aria-label="Sections">
          {TABS.map(([v, l, i]) => (
            <NavLink key={v} to={base + v} className={current === v ? 'on' : ''} aria-current={current === v ? 'page' : undefined}>
              <Icon name={i} /><span>{l}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </>
  );
}

// ---------- toasts ----------
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(null);
  const show = useCallback((m, ms = 2200) => {
    const id = Math.random();
    setMsg({ m, id });
    setTimeout(() => setMsg((cur) => (cur && cur.id === id ? null : cur)), ms);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && <div className="toast" role="status">{msg.m}</div>}
    </ToastCtx.Provider>
  );
}

// ---------- bottom sheet ----------
export function Sheet({ open, onClose, children, label }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label}>{children}</div>
    </div>
  );
}

/** Promise-style confirm dialog. Usage: const [confirm, dialog] = useConfirm(); ... {dialog} ... if (await confirm({...})) */
export function useConfirm() {
  const [state, setState] = useState(null);
  const confirm = useCallback((o) => new Promise((resolve) => setState({ ...o, resolve })), []);
  const close = (v) => { state?.resolve(v); setState(null); };
  const dialog = (
    <Sheet open={!!state} onClose={() => close(false)} label={state?.title}>
      {state && (
        <>
          <h2>{state.title}</h2>
          <p className="muted">{state.body}</p>
          <div className="row">
            <button className="btn block" onClick={() => close(false)}>{state.cancel || 'Cancel'}</button>
            <button className={`btn block ${state.danger ? 'danger' : 'primary'}`} onClick={() => close(true)}>{state.ok || 'Confirm'}</button>
          </div>
        </>
      )}
    </Sheet>
  );
  return [confirm, dialog];
}

// ---------- visuals ----------
export function Ring({ value, label, size = 116 }) {
  const r = size / 2 - 8, c = 2 * Math.PI * r;
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={`${label} ${value}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth="12" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth="12" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
      </svg>
      <div className="lbl"><div><b>{value}%</b><small className="muted">{label}</small></div></div>
    </div>
  );
}
export function Bar({ value, tone }) {
  const t = tone ?? (value == null ? '' : value >= 75 ? 'good' : value >= 55 ? 'warn' : 'bad');
  return <div className={`bar ${t}`}><i style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} /></div>;
}
export function Chips({ items, value, onChange, multi = false }) {
  return (
    <div className="chips">
      {items.map(([k, label, extra]) => {
        const on = multi ? value.includes(k) : value === k;
        return (
          <button key={k} type="button" className={`chip ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => onChange(k)}>
            {label}{extra != null && <small className="chip-count">{extra}</small>}
          </button>
        );
      })}
    </div>
  );
}
export const Empty = ({ children }) => <div className="card empty">{children}</div>;
