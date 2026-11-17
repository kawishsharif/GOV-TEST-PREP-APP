// Builds clean question JSON from the compact authoring files in content/<exam>/ and validates the whole bank.
//
//   node tools/build-bank.mjs          build + validate
//   node tools/build-bank.mjs --check  validate only (no writes)
//
// Authoring tuple:  [code, question, [A, B, C, D], answerIndex, explanation, [whyWrong x3]?, extra?]
//   code = difficulty (e|m|h) + type (c conceptual | n numerical | f factual | p past-paper-style) + optional style
//          (W WAPDA, P PPSC, F FPSC, N NTS, T PTS, C CTS, V concept variant). Example: "mnC".
//   Numerical explanations are written as steps separated by " | " and become a `solution` array.
//   whyWrong lists the reason for each WRONG option, in option order (it becomes `why`, null at the answer).
import { readdir, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = new URL('..', import.meta.url).pathname;
const CHECK = process.argv.includes('--check');
const DIFF = { e: 'easy', m: 'medium', h: 'hard' };
const TYPE = { c: 'conceptual', n: 'numerical', f: 'factual', p: 'past-paper-style' };
const STYLE = { W: 'WAPDA-style', P: 'PPSC-style', F: 'FPSC-style', N: 'NTS-style', T: 'PTS-style', C: 'CTS-style', V: 'Concept variant' };
const DEFAULT_STYLE = { c: 'V', n: 'C', f: 'N', p: 'W' };

let errors = 0, warnings = 0;
const num = (x) => { const m = String(x).replace(/,/g, '').match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : NaN; };
/** Replace placeholder distractor notes ("No basis.") with a specific comparison to the correct value. */
function explainDistractor(opt, correct) {
  const a = num(opt), b = num(correct);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0 || a === 0) return 'Does not follow from the correct working — compare with the solution steps.';
  const r = a / b;
  for (const f of [10, 100, 1000, 2, 3, 4, Math.SQRT2, Math.sqrt(3)]) {
    const name = f === Math.SQRT2 ? '√2' : f === Math.sqrt(3) ? '√3' : String(f);
    if (Math.abs(r - f) / f < 0.02) return `${name} times too large — a typical ${f >= 10 ? 'unit/power-of-ten' : 'formula'} slip.`;
    if (Math.abs(1 / r - f) / f < 0.02) return `${name} times too small — a typical ${f >= 10 ? 'unit/power-of-ten' : 'formula'} slip.`;
  }
  const d = Math.round(Math.abs(r - 1) * 100);
  return `${d}% ${r > 1 ? 'higher' : 'lower'} than the correct result — does not follow from the correct working.`;
}
const hashStr = (x) => [...x].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const err = (m) => { errors++; console.error('  ✗ ' + m); };
const warn = (m) => { warnings++; console.warn('  ! ' + m); };

for (const examId of await readdir(join(ROOT, 'content'))) {
  const srcDir = join(ROOT, 'content', examId);
  const outDir = join(ROOT, 'public', 'exams', examId, 'questions');
  await mkdir(outDir, { recursive: true });
  const seenText = new Map();
  const summary = [];
  const files = (await readdir(srcDir)).filter((f) => f.endsWith('.mjs')).sort();
  for (const f of files) {
    const mod = (await import(pathToFileURL(join(srcDir, f)).href)).default;
    const { topic, prefix, items, asOf, sub } = mod;
    const out = [];
    const ansPos = [0, 0, 0, 0];
    items.forEach((it, i) => {
      const [code, q, options, answer, explanation, whyWrong, extra = {}] = it;
      const id = `${prefix}-${String(i + 1).padStart(3, '0')}`;
      const where = `${f} #${i + 1} (${id})`;
      const d = DIFF[code[0]], t = TYPE[code[1]], s = STYLE[code[2] || DEFAULT_STYLE[code[1]]];
      if (!d || !t || !s) err(`${where}: bad code "${code}"`);
      if (typeof q !== 'string' || q.length < 8) err(`${where}: question text`);
      if (!Array.isArray(options) || options.length !== 4) err(`${where}: needs 4 options`);
      else {
        if (options.some((o) => typeof o !== 'string' || !o.trim())) err(`${where}: empty option`);
        if (new Set(options.map((o) => String(o).trim().toLowerCase())).size !== 4) err(`${where}: duplicate options`);
        if (options.some((o) => /all of (the )?above|none of (the )?above|both \(?[a-d]\)? and/i.test(o))) warn(`${where}: positional option text ("all/none of the above") breaks shuffling`);
      }
      if (!Number.isInteger(answer) || answer < 0 || answer > 3) err(`${where}: answer index`);

      if (typeof explanation !== 'string' || explanation.length < 10) err(`${where}: explanation`);
      if (whyWrong != null && (!Array.isArray(whyWrong) || whyWrong.length !== 3)) err(`${where}: whyWrong must list 3 reasons`);
      const norm = (String(q) + ' ' + [...(options || [])].sort().join(' ')).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      if (seenText.has(norm)) err(`${where}: duplicate of ${seenText.get(norm)}`);
      seenText.set(norm, id);

      // Spread correct answers evenly over A–D in the stored JSON (authors tend to favour one position).
      // Options are rotated together with their "why" notes, so nothing is lost.
      const target = (hashStr(id) + i) % 4;
      const shift = (target - answer + 4) % 4;
      const rot = (arr) => arr.map((_, j) => arr[(j - shift + 4) % 4]);
      const whyFull = whyWrong ? (() => {
        const w = []; let k = 0;
        for (let j = 0; j < 4; j++) {
          if (j === answer) { w.push(null); continue; }
          const note = whyWrong[k++];
          w.push(/^no basis\.?$/i.test(note.trim()) ? explainDistractor(options[j], options[answer]) : note);
        }
        return w;
      })() : null;
      const obj = { id, topic, difficulty: d, type: t, style: s, q, options: rot(options), answer: target };
      if (t === 'numerical' && explanation.includes(' | ')) {
        obj.solution = explanation.split(' | ').map((x) => x.trim());
        obj.explanation = obj.solution[obj.solution.length - 1];
      } else obj.explanation = explanation;
      if (whyFull) obj.why = rot(whyFull);
      if (sub || extra.sub) obj.sub = extra.sub || sub;
      if (asOf || extra.asOf) obj.asOf = extra.asOf || asOf;
      if (extra.tags) obj.tags = extra.tags;
      obj.source = 'bank';
      ansPos[obj.answer]++;
      out.push(obj);
    });
    const num = out.filter((q) => q.type === 'numerical').length;
    summary.push({ file: f, topic, n: out.length, numerical: num, easy: out.filter((q) => q.difficulty === 'easy').length, medium: out.filter((q) => q.difficulty === 'medium').length, hard: out.filter((q) => q.difficulty === 'hard').length, ansPos: ansPos.join('/') });
    if (!CHECK) await writeFile(join(outDir, `${topic}.json`), JSON.stringify(out, null, 1) + '\n');
  }
  console.log(`\n${examId}`);
  console.table(summary);
  const total = summary.reduce((a, s) => a + s.n, 0);
  console.log(`Total questions: ${total}`);
}
console.log(errors ? `\n${errors} error(s), ${warnings} warning(s)` : `\nOK — ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
