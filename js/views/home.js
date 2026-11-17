// Home: one card per exam pack. New exams are added by dropping a folder in /exams and listing it in exams/index.json.
import { esc } from '../util.js';
import { icon } from '../icons.js';
import { loadRegistry, loadExam } from '../bank.js';
import { examState } from '../store.js';
import { topicReport, readiness, daysLeft } from '../stats.js';

export async function render(root, ctx) {
  ctx.setTop({ title: 'Learn & Lead', sub: 'Prepare. Practise. Lead the merit list.' });
  ctx.setLayout({ tabs: false });
  const reg = await loadRegistry();
  const cards = await Promise.all(reg.exams.map(async (e) => {
    let line = '';
    try {
      const exam = await loadExam(e.id);
      const st = examState(exam);
      const r = readiness(topicReport(exam, st));
      const dl = daysLeft(st);
      line = `<div class="row wrap" style="margin-top:10px">
        <span class="tag">${exam.questions.length} questions</span>
        <span class="tag">${r}% ready</span>
        <span class="tag">${dl >= 0 ? `${dl} days left` : 'Test date passed'}</span></div>`;
    } catch { line = '<p class="muted">Pack could not be loaded.</p>'; }
    return `<a class="card exam-card" href="#/x/${esc(e.id)}/dashboard">
      <span class="band" style="background:${esc(e.accent || 'var(--accent)')}"></span>
      <div class="row"><div class="grow" style="flex:1;min-width:0">
        <small class="muted">${esc(e.tag || '')}</small>
        <h2>${esc(e.title)}</h2>
        <p class="muted" style="margin:0">${esc(e.subtitle || '')}</p>
        ${line}
      </div>${icon('chev', 'chev')}</div></a>`;
  }));
  root.innerHTML = `
    <section class="hero">
      <svg class="wave" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5">${'<path d="M2 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M2 17c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M2 7c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>'}</svg>
      <h1>Learn &amp; Lead</h1>
      <p>Aim for the top of the merit list, not just a pass.</p>
    </section>
    <div class="sec-title">Your exams</div>
    ${cards.join('')}
    <div class="card exam-card add flat">
      ${icon('plus')}<p style="margin:6px 0 0"><b>More test preps coming</b></p>
      <small>Each exam is a self-contained pack (syllabus, weights, questions, notes) with its own progress.</small>
    </div>`;
}
