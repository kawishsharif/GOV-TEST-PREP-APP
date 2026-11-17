// Small helpers shared by every view.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Escape text for safe insertion into HTML. Every piece of question/notes text goes through this. */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

/** Light formatting for content text: escape, then allow ^{...} superscript and _{...} subscript. */
export function rich(s) {
  return esc(s)
    .replace(/\^\{([^}]*)\}/g, '<sup>$1</sup>')
    .replace(/_\{([^}]*)\}/g, '<sub>$1</sub>');
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Local calendar date as YYYY-MM-DD (the user's own day boundary). */
export function dayKey(d = new Date()) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}
export function parseDay(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(key, n) {
  const d = parseDay(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}
export function daysBetween(a, b) {
  return Math.round((parseDay(b) - parseDay(a)) / 86400000);
}
export function fmtDay(key, opts = { day: 'numeric', month: 'short' }) {
  return parseDay(key).toLocaleDateString(undefined, opts);
}
export function fmtDuration(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
}
export const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

export function shuffle(arr, rnd = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
/** Deterministic PRNG so a saved session re-renders the same option order. */
export function seeded(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/** Largest-remainder apportionment: split `total` into integers proportional to `weights`. */
export function apportion(total, weights) {
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const raw = weights.map((w) => (w / sum) * total);
  const out = raw.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { out[i]++; left--; } });
  return out;
}

export function toast(msg, ms = 2200) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

/** Bottom sheet dialog. Returns a close function. `bind(root, close)` wires up handlers. */
export function sheet(html, bind) {
  const scrim = document.createElement('div');
  scrim.className = 'scrim';
  scrim.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  const close = () => { scrim.remove(); document.removeEventListener('keydown', onKey, true); };
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  scrim.addEventListener('click', (e) => { if (e.target === scrim) close(); });
  document.addEventListener('keydown', onKey, true);
  document.body.appendChild(scrim);
  bind?.(scrim.firstElementChild, close);
  return close;
}
export function confirmSheet(title, body, okLabel = 'Confirm', danger = false) {
  return new Promise((resolve) => {
    let done = false;
    const close = sheet(
      `<h2>${esc(title)}</h2><p class="muted">${esc(body)}</p>
       <div class="row"><button class="btn block" data-no>Cancel</button>
       <button class="btn block ${danger ? 'danger' : 'primary'}" data-yes>${esc(okLabel)}</button></div>`,
      (root, close) => {
        root.querySelector('[data-no]').onclick = () => { done = true; close(); resolve(false); };
        root.querySelector('[data-yes]').onclick = () => { done = true; close(); resolve(true); };
      }
    );
    // Resolve false if dismissed by scrim/Escape.
    const obs = new MutationObserver(() => { if (!document.querySelector('.scrim') && !done) { resolve(false); obs.disconnect(); } });
    obs.observe(document.body, { childList: true });
    void close;
  });
}

export function download(filename, text, type = 'application/json') {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
export function pickFile(accept = '.json,application/json') {
  return new Promise((resolve) => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = accept;
    inp.onchange = async () => resolve(inp.files[0] ? await inp.files[0].text() : null);
    inp.click();
  });
}
