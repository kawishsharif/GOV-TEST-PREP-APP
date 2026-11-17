// Offline cache: stale-while-revalidate for every same-origin GET.
// Bump VERSION when shipping changes so old caches are cleared.
const VERSION = 'll-v1';
const CORE = [
  './', 'index.html', 'css/app.css', 'manifest.webmanifest', 'assets/icon.svg',
  'js/app.js', 'js/util.js', 'js/icons.js', 'js/store.js', 'js/bank.js', 'js/stats.js', 'js/quizcore.js', 'js/srs.js', 'js/planner-core.js', 'js/generators.js', 'js/chart.js',
  'js/views/home.js', 'js/views/dashboard.js', 'js/views/settings.js', 'js/views/practice.js', 'js/views/quiz.js',
  'js/views/mock.js', 'js/views/result.js', 'js/views/notes.js', 'js/views/formulas.js', 'js/views/flashcards.js',
  'js/views/mistakes.js', 'js/views/planner.js', 'js/views/progress.js', 'js/views/ai.js', 'js/views/importq.js', 'js/views/more.js',
  'exams/index.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => Promise.allSettled(CORE.map((u) => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const hit = await cache.match(req, { ignoreSearch: true });
      const net = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })
  );
});
