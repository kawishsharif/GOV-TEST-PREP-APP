// Dashboard: days left, readiness, today's target, streak, accuracy by section/topic, weakest topics.
import { esc, dayKey, pct, fmtDay } from '../util.js';
import { icon } from '../icons.js';
import { topicReport, sectionReport, readiness, streak, weakest, daysLeft } from '../stats.js';

const ring = (value, label) => {
  const r = 50, c = 2 * Math.PI * r, off = c * (1 - value / 100);
  return `<div class="ring" role="img" aria-label="${label} ${value}%">
    <svg width="116" height="116" viewBox="0 0 116 116"><circle cx="58" cy="58" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="12"/>
    <circle cx="58" cy="58" r="${r}" fill="none" stroke="var(--accent)" stroke-width="12" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"/></svg>
    <div class="lbl"><div><b>${value}%</b><small class="muted">${label}</small></div></div></div>`;
};
const accBar = (acc) => {
  if (acc == null) return '<div class="bar"><i style="width:0"></i></div>';
  const p = Math.round(acc * 100);
  return `<div class="bar ${p >= 75 ? 'good' : p >= 55 ? 'warn' : 'bad'}"><i style="width:${p}%"></i></div>`;
};
const accTxt = (t) => (t.acc == null ? '<small class="muted">not started</small>' : `<b>${Math.round(t.acc * 100)}%</b> <small class="muted">· ${t.n}</small>`);

export async function render(root, ctx) {
  const { exam, st } = ctx;
  ctx.setTop({ title: exam.title, sub: 'Learn & Lead', right: `<a class="iconbtn" href="${ctx.base}settings" aria-label="Settings">${icon('settings')}</a>` });
  const topics = topicReport(exam, st);
  const sections = sectionReport(exam, st, topics);
  const ready = readiness(topics);
  const today = st.daily[dayKey()] || { n: 0, c: 0 };
  const target = st.settings.dailyTarget;
  const dl = daysLeft(st);
  const weak = weakest(topics);
  const mistakes = Object.keys(st.mistakes).length;
  const lastMock = st.mocks[st.mocks.length - 1];
  const active = st.activeMock && !st.activeMock.submitted;

  root.innerHTML = `
    ${active ? `<a class="card row" href="${ctx.base}mock/run" style="text-decoration:none;color:inherit;border-color:var(--warn)">
        ${icon('mock')}<div style="flex:1"><b>Mock test in progress</b><br><small class="muted">Tap to resume — the timer keeps running.</small></div>${icon('chev', 'chev')}</a>` : ''}
    <section class="card">
      <div class="row">
        ${ring(ready, 'ready')}
        <div style="flex:1;min-width:0">
          <div class="muted" style="font-size:.85rem">Test date · ${esc(fmtDay(st.settings.testDate, { day: 'numeric', month: 'short', year: 'numeric' }))}</div>
          <div style="font-size:2rem;font-weight:800;line-height:1.1">${dl >= 0 ? dl : 0}<span style="font-size:1rem;font-weight:600" class="muted"> days left</span></div>
          <div class="row" style="margin-top:6px;gap:6px">${icon('fire')}<b>${streak(st)}</b><span class="muted">day streak</span></div>
        </div>
      </div>
      <p class="muted" style="font-size:.8rem;margin:10px 0 0">Readiness = share of each topic's core questions you currently answer correctly, weighted by exam weight.</p>
    </section>

    <section class="card">
      <div class="row between"><h2 style="margin:0">Today</h2><span class="muted">${today.n} / ${target} questions</span></div>
      <div class="bar" style="margin:10px 0 12px"><i style="width:${Math.min(100, pct(today.n, target))}%"></i></div>
      <div class="grid3">
        <div class="stat"><b>${today.n ? pct(today.c, today.n) + '%' : '—'}</b><span>accuracy today</span></div>
        <div class="stat"><b>${mistakes}</b><span>in mistake book</span></div>
        <div class="stat"><b>${lastMock ? lastMock.pct + '%' : '—'}</b><span>last mock</span></div>
      </div>
      <div class="row" style="margin-top:12px">
        <a class="btn primary block" href="${ctx.base}practice">${icon('practice')} Practise</a>
        <a class="btn block" href="${ctx.base}mock">${icon('mock')} Mock test</a>
      </div>
    </section>

    <section class="card">
      <h2>${icon('target')} Weakest topics</h2>
      ${weak.length ? `<ul class="list">${weak.map((t) => `<li><div class="list-link">
          <div class="grow"><b>${esc(t.name)}</b><small class="muted">${t.n >= 5 ? `${Math.round(t.acc * 100)}% accuracy over ${t.n} attempts` : 'Not practised enough yet — high exam weight'}</small></div>
          <a class="btn sm accent" href="${ctx.base}quiz/topic/${encodeURIComponent(t.id)}">Practise</a></div></li>`).join('')}</ul>`
        : '<p class="empty">Question bank is loading in the next stage.</p>'}
    </section>

    <div class="sec-title">Accuracy by section</div>
    <section class="card">
      ${sections.map((s) => `<div class="metric-row"><div><b>${esc(s.name)}</b> <small class="muted">· ${s.weight}%</small></div><div>${accTxt(s)}</div>${accBar(s.acc)}</div>`).join('')}
    </section>

    <div class="sec-title">Accuracy by topic</div>
    <section class="card">
      ${topics.map((t) => `<div class="metric-row"><div><a href="${ctx.base}quiz/topic/${encodeURIComponent(t.id)}" style="color:inherit;text-decoration:none"><b>${esc(t.name)}</b></a><br><small class="muted">${t.seen}/${t.bank} seen · ${t.mastered} mastered</small></div><div>${accTxt(t)}</div>${accBar(t.acc)}</div>`).join('')}
    </section>`;
}
