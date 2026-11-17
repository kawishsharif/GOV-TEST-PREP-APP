// App shell: hash router, top bar, bottom tabs, theme, service worker.
import { esc, $ } from './util.js';
import { icon } from './icons.js';
import { global, saveGlobal, examState } from './store.js';
import { loadExam } from './bank.js';

const VIEWS = {
  home: () => import('./views/home.js'),
  dashboard: () => import('./views/dashboard.js'),
  settings: () => import('./views/settings.js'),
  practice: () => import('./views/practice.js'),
  quiz: () => import('./views/quiz.js'),
  mock: () => import('./views/mock.js'),
  result: () => import('./views/result.js'),
  notes: () => import('./views/notes.js'),
  formulas: () => import('./views/formulas.js'),
  flashcards: () => import('./views/flashcards.js'),
  mistakes: () => import('./views/mistakes.js'),
  planner: () => import('./views/planner.js'),
  progress: () => import('./views/progress.js'),
  ai: () => import('./views/ai.js'),
  import: () => import('./views/importq.js'),
  more: () => import('./views/more.js'),
};
const TABS = [
  ['dashboard', 'Home', 'dash'],
  ['practice', 'Practice', 'practice'],
  ['mock', 'Mock', 'mock'],
  ['notes', 'Notes', 'notes'],
  ['more', 'More', 'more'],
];
const TAB_OF = { quiz: 'practice', result: 'mock', formulas: 'notes', flashcards: 'more', mistakes: 'more', planner: 'more', progress: 'more', ai: 'more', import: 'more', settings: 'more' };

export function applyTheme() {
  const t = global.theme;
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
  const dark = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  $('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0f1f2a' : '#0b5675');
}

export const go = (path) => { location.hash = '#/' + path.replace(/^#?\/?/, ''); };

let leaveFns = [];
let renderSeq = 0;

async function route() {
  const seq = ++renderSeq;
  leaveFns.forEach((f) => { try { f(); } catch {} });
  leaveFns = [];
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const app = $('#app');
  let viewName = 'home', exam = null, st = null, params = [];
  try {
    if (parts[0] === 'x' && parts[1]) {
      exam = await loadExam(parts[1]);
      st = examState(exam);
      viewName = VIEWS[parts[2]] ? parts[2] : 'dashboard';
      params = parts.slice(3);
      if (global.lastExam !== exam.id) { global.lastExam = exam.id; saveGlobal(); }
    }
  } catch (e) {
    app.innerHTML = `<main><div class="card"><h2>Could not load this exam pack</h2><p class="muted">${esc(e.message)}</p><a class="btn" href="#/">Back to exams</a></div></main>`;
    return;
  }
  const mod = await VIEWS[viewName]();
  if (seq !== renderSeq) return;

  const top = { title: exam ? exam.title : 'Learn & Lead', sub: exam ? 'Learn & Lead' : 'Prepare. Practise. Lead the merit list.', back: null, right: '' };
  const layout = { tabs: !!exam, full: false };
  const tab = TAB_OF[viewName] || viewName;
  app.innerHTML = `
    <header class="topbar" id="topbar"></header>
    <main id="view"></main>
    ${exam ? `<nav class="tabbar" id="tabbar" aria-label="Sections">${TABS.map(([v, l, i]) =>
      `<a href="#/x/${exam.id}/${v}" class="${tab === v ? 'on' : ''}" ${tab === v ? 'aria-current="page"' : ''}>${icon(i)}<span>${l}</span></a>`).join('')}</nav>` : ''}`;

  const ctx = {
    exam, st, params, go,
    base: exam ? `#/x/${exam.id}/` : '#/',
    path: (p) => `x/${exam.id}/${p}`,
    onLeave: (fn) => leaveFns.push(fn),
    setTop(o) { Object.assign(top, o); paintTop(); },
    setLayout(o) {
      Object.assign(layout, o);
      $('#tabbar')?.toggleAttribute('hidden', !layout.tabs);
      $('#view').classList.toggle('full', !!layout.full);
    },
    rerender: () => route(),
  };
  function paintTop() {
    const backHref = top.back ?? (exam ? (viewName === 'dashboard' ? '#/' : null) : null);
    $('#topbar').innerHTML = `
      ${backHref ? `<a class="iconbtn" href="${esc(backHref)}" aria-label="${viewName === 'dashboard' ? 'All exams' : 'Back'}">${icon('back')}</a>` : `<span class="iconbtn" aria-hidden="true">${icon('wave')}</span>`}
      <div class="title"><b>${esc(top.title)}</b><span>${esc(top.sub)}</span></div>
      ${top.right || ''}`;
  }
  paintTop();
  window.scrollTo(0, 0);
  await mod.render($('#view'), ctx);
  document.title = top.title === 'Learn & Lead' ? 'Learn & Lead' : `${top.title} · Learn & Lead`;
}

applyTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
addEventListener('hashchange', route);
if (!location.hash && global.lastExam) location.replace(`#/x/${global.lastExam}/dashboard`);
route();

// Offline support: cache the app shell + exam packs after first load.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
