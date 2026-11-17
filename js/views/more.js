// "More" tab: everything that is not on the bottom bar.
import { esc } from '../util.js';
import { icon } from '../icons.js';

export async function render(root, ctx) {
  const { exam, st } = ctx;
  ctx.setTop({ title: 'More', sub: exam.title });
  const mistakes = Object.keys(st.mistakes).length;
  const item = (href, ic, title, sub) => `<li><a class="list-link" href="${ctx.base}${href}">${icon(ic)}<div class="grow"><b>${esc(title)}</b><small class="muted">${esc(sub)}</small></div>${icon('chev', 'chev')}</a></li>`;
  root.innerHTML = `
    <section class="card"><ul class="list">
      ${item('mistakes', 'repeat', 'Mistake notebook', `${mistakes} question${mistakes === 1 ? '' : 's'} to fix`)}
      ${item('flashcards', 'cards', 'Flashcards', 'Spaced repetition: formulas, facts, definitions')}
      ${item('quiz/numerical', 'calc', 'Numerical drill', 'Fresh calculation variants with worked steps')}
      ${item('planner', 'calendar', 'Study planner', 'Day-by-day plan to your test date')}
      ${item('progress', 'chart', 'Progress history', 'Mock scores and daily accuracy over time')}
      ${item('formulas', 'printer', 'Formula sheet', 'Every Electrical formula on one printable page')}
      ${item('ai', 'sparkle', 'AI question generator', 'Practise against fresh AI-written questions')}
    </ul></section>
    <section class="card"><ul class="list">
      ${item('import', 'upload', 'Import questions (JSON)', 'Add your own questions to the bank')}
      ${item('settings', 'settings', 'Settings & backup', 'Test date, pattern, weights, theme, export')}
      <li><a class="list-link" href="#/">${icon('home')}<div class="grow"><b>All exams</b><small class="muted">Switch to another test prep</small></div>${icon('chev', 'chev')}</a></li>
    </ul></section>
    <p class="muted" style="font-size:.8rem;text-align:center">Learn &amp; Lead is an independent study tool. It is not affiliated with WAPDA or CTS, and questions are practice items, not official past papers unless a question says otherwise.</p>`;
}
