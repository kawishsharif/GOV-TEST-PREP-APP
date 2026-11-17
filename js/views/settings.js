// Settings: test date, daily target, test pattern, section weights, track, theme, backup.
import { esc, $, $$, toast, download, pickFile, confirmSheet, dayKey } from '../util.js';
import { icon } from '../icons.js';
import { global, saveGlobal, save, saveNow, defaultSettings, exportAll, importAll, resetExam } from '../store.js';
import { applyTheme } from '../app.js';

export async function render(root, ctx) {
  const { exam, st } = ctx;
  const s = st.settings;
  ctx.setTop({ title: 'Settings', sub: exam.title, back: ctx.base + 'more' });
  const sumW = () => Object.entries(s.sectionWeights).reduce((a, [, v]) => a + Number(v || 0), 0);
  const ee = exam.sections.find((x) => x.id === 'EE');

  root.innerHTML = `
    <section class="card">
      <h2>${icon('calendar')} Test</h2>
      <label class="field"><span>Test date</span><input type="date" data-k="testDate" value="${esc(s.testDate)}" min="${dayKey()}"></label>
      <label class="field"><span>Daily question target</span><input type="number" inputmode="numeric" min="5" max="500" data-k="dailyTarget" value="${s.dailyTarget}"></label>
    </section>

    <section class="card">
      <h2>${icon('mock')} Test pattern</h2>
      <p class="muted" style="font-size:.88rem">${esc(exam.pattern.note)}</p>
      <div class="grid2">
        <label class="field"><span>Total questions</span><input type="number" inputmode="numeric" min="10" max="200" data-k="totalQuestions" value="${s.totalQuestions}"></label>
        <label class="field"><span>Time (minutes)</span><input type="number" inputmode="numeric" min="5" max="300" data-k="minutes" value="${s.minutes}"></label>
      </div>
      <label class="switch"><span>Negative marking</span><input type="checkbox" data-k="negativeMarking" ${s.negativeMarking ? 'checked' : ''}></label>
      <div class="grid2" style="margin-top:8px">
        <label class="field"><span>Marks deducted per wrong</span><input type="number" step="0.05" min="0" max="1" data-k="negativeValue" value="${s.negativeValue}"></label>
        <label class="field"><span>Pass mark (%)</span><input type="number" min="0" max="100" data-k="passPercent" value="${s.passPercent}"></label>
      </div>
    </section>

    <section class="card">
      <h2>Section weights</h2>
      <p class="muted" style="font-size:.88rem">Used to draw mock-test questions and to prioritise the planner. They should add up to 100.</p>
      ${exam.sections.map((sec) => `<label class="field row" style="margin-bottom:8px"><span style="flex:1;margin:0;font-size:.95rem;color:var(--text)">${esc(sec.name)}</span>
        <input style="width:90px" type="number" inputmode="numeric" min="0" max="100" data-sw="${sec.id}" value="${s.sectionWeights[sec.id]}"></label>`).join('')}
      <p id="sumw" class="muted"></p>
    </section>

    ${ee ? `<section class="card">
      <h2>Electrical topic shares</h2>
      <p class="muted" style="font-size:.88rem">How the Electrical Engineering questions split between topics in a mock (relative shares).</p>
      ${ee.topics.map((t) => `<label class="field row" style="margin-bottom:8px"><span style="flex:1;margin:0;font-size:.95rem;color:var(--text)">${esc(t.name)}</span>
        <input style="width:90px" type="number" inputmode="numeric" min="0" max="100" data-tw="${t.id}" value="${s.topicWeights[t.id]}"></label>`).join('')}
    </section>` : ''}

    <section class="card">
      <h2>Islamic Studies / Ethics</h2>
      <div class="chips" role="radiogroup">
        <button class="chip ${s.track === 'islamiat' ? 'on' : ''}" data-track="islamiat" role="radio" aria-checked="${s.track === 'islamiat'}">Islamic Studies</button>
        <button class="chip ${s.track === 'ethics' ? 'on' : ''}" data-track="ethics" role="radio" aria-checked="${s.track === 'ethics'}">Ethics (non-Muslim candidates)</button>
      </div>
    </section>

    <section class="card">
      <h2>Display</h2>
      <div class="chips" role="radiogroup" aria-label="Theme">
        ${['system', 'light', 'dark'].map((t) => `<button class="chip ${global.theme === t ? 'on' : ''}" data-theme="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}
      </div>
      <label class="switch" style="margin-top:8px"><span>Shuffle answer options</span><input type="checkbox" data-k="shuffleOptions" ${s.shuffleOptions ? 'checked' : ''}></label>
    </section>

    <section class="card">
      <h2>Backup</h2>
      <p class="muted" style="font-size:.88rem">Progress is saved on this device automatically. Export a backup to move it to another phone or browser.</p>
      <div class="stack">
        <button class="btn block" id="exp">${icon('download')} Export progress (JSON)</button>
        <button class="btn block" id="imp">${icon('upload')} Import progress backup</button>
        <a class="btn block" href="${ctx.base}import">${icon('plus')} Import questions (JSON)</a>
      </div>
    </section>

    <section class="card">
      <h2>Reset</h2>
      <div class="stack">
        <button class="btn block" id="defaults">Restore default pattern & weights</button>
        <button class="btn block danger" id="reset">Erase all progress for this exam</button>
      </div>
    </section>`;

  const showSum = () => {
    const n = sumW();
    $('#sumw').innerHTML = n === 100 ? `Total: <b>100</b> ✓` : `Total: <b style="color:var(--bad)">${n}</b> — mock tests scale weights proportionally.`;
  };
  showSum();

  root.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.k) {
      const k = el.dataset.k;
      if (el.type === 'checkbox') s[k] = el.checked;
      else if (el.type === 'number') {
        const v = Number(el.value);
        if (!Number.isFinite(v)) return;
        s[k] = k === 'negativeValue' ? Math.max(0, v) : Math.max(0, Math.round(v));
      } else s[k] = el.value;
      if (k === 'testDate') st.plan = st.plan ? { ...st.plan, stale: true } : null;
    }
    if (el.dataset.sw) { s.sectionWeights[el.dataset.sw] = Math.max(0, Number(el.value) || 0); showSum(); }
    if (el.dataset.tw) s.topicWeights[el.dataset.tw] = Math.max(0, Number(el.value) || 0);
    save(exam.id);
    toast('Saved');
  });
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.track) {
      s.track = b.dataset.track; save(exam.id);
      $$('[data-track]', root).forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); });
      toast('Saved');
    }
    if (b.dataset.theme) {
      global.theme = b.dataset.theme; saveGlobal(); applyTheme();
      $$('[data-theme]', root).forEach((x) => x.classList.toggle('on', x === b));
    }
    if (b.id === 'exp') { saveNow(exam.id); download(`learn-and-lead-backup-${dayKey()}.json`, JSON.stringify(exportAll())); }
    if (b.id === 'imp') {
      const text = await pickFile();
      if (!text) return;
      try {
        const n = importAll(JSON.parse(text));
        toast(`Restored ${n} exam${n === 1 ? '' : 's'}`);
        ctx.rerender();
      } catch (err) { toast(err.message || 'Invalid file', 3500); }
    }
    if (b.id === 'defaults' && await confirmSheet('Restore defaults?', 'Test pattern, section weights and topic shares go back to the exam pack defaults. Your test date, target and progress are kept.')) {
      const d = defaultSettings(exam);
      Object.assign(s, { totalQuestions: d.totalQuestions, minutes: d.minutes, negativeMarking: d.negativeMarking, negativeValue: d.negativeValue, passPercent: d.passPercent, sectionWeights: d.sectionWeights, topicWeights: d.topicWeights });
      save(exam.id); ctx.rerender();
    }
    if (b.id === 'reset' && await confirmSheet('Erase all progress?', 'Attempts, mistakes, flashcard schedule, mock results and plan for this exam will be deleted. Export a backup first if unsure.', 'Erase', true)) {
      resetExam(exam); toast('Progress erased'); ctx.go(ctx.path('dashboard'));
    }
  });
}
