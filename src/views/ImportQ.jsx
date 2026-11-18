// Import questions (JSON) into this exam's bank, with a sample and validation report.
import { useState } from 'react';
import { Page, useExam, useToast, useConfirm } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { validateQuestion } from '../lib/bank.js';
import { save } from '../lib/store.js';
import { download, pickFile } from '../lib/util.js';

const SAMPLE = [
  {
    id: 'my-001', topic: 'machines', difficulty: 'medium', type: 'numerical', style: 'WAPDA-style',
    q: 'A 4-pole, 50 Hz induction motor runs at 1440 rpm. Its slip is:',
    options: ['2%', '4%', '6%', '96%'], answer: 1,
    explanation: 'N_s = 1500 rpm, s = (1500 − 1440)/1500 = 0.04.',
    solution: ['N_s = 120 × 50/4 = 1500 rpm', 's = (1500 − 1440)/1500 = 0.04 = 4%'],
    why: ['Uses 1470 rpm.', null, 'No basis.', 'That is N/N_s.'],
  },
  {
    id: 'my-002', topic: 'english', difficulty: 'easy', type: 'conceptual', sub: 'Synonyms',
    q: 'Choose the synonym of CANDID:', options: ['Frank', 'Secretive', 'Hesitant', 'Deceitful'], answer: 0,
    explanation: 'Candid means open and honest.',
  },
];

export default function ImportQ() {
  const { exam, st, base } = useExam();
  const toast = useToast();
  const [confirm, dialog] = useConfirm();
  const [text, setText] = useState('');
  const [report, setReport] = useState(null);

  const run = (raw) => {
    let data;
    try { data = JSON.parse(raw); } catch (e) { setReport({ error: 'Not valid JSON: ' + e.message }); return; }
    const list = Array.isArray(data) ? data : data.questions;
    if (!Array.isArray(list)) { setReport({ error: 'Expected an array of questions (or {"questions": [...]})' }); return; }
    const ok = [], bad = [];
    const bankIds = new Set(exam.questions.map((q) => q.id));
    list.forEach((q, i) => {
      const err = validateQuestion(q, exam) || (bankIds.has(q.id) ? 'id clashes with a built-in question' : null);
      if (err) bad.push(`#${i + 1} (${q?.id ?? 'no id'}): ${err}`);
      else ok.push({ ...q, source: 'import' });
    });
    const byId = new Map(st.custom.map((q) => [q.id, q]));
    ok.forEach((q) => byId.set(q.id, q));
    st.custom = [...byId.values()];
    save(exam.id);
    setReport({ ok: ok.length, bad });
    if (ok.length) toast(`${ok.length} question${ok.length === 1 ? '' : 's'} imported`);
  };

  return (
    <Page title="Import questions" sub={`${st.custom.length} imported so far`} back={base + 'more'} base={base}>
      {dialog}
      <Card>
        <p className="m-0 [&_code]:rounded [&_code]:bg-secondary [&_code]:px-1 [&_code]:font-mono [&_code]:text-sm">Add your own questions (e.g. from notes or a teacher). Each needs exactly 4 options, one correct <code>answer</code> (0–3), an explanation, a <code>topic</code> id, <code>difficulty</code> (easy/medium/hard) and <code>type</code> (conceptual/numerical/factual/past-paper-style). Optional: <code>solution</code> steps, <code>why</code> (4 entries, null for the correct one), <code>sub</code>, <code>style</code>, <code>asOf</code>. Re-importing the same <code>id</code> updates it.</p>
        <CardDescription className="break-words">Topic ids: {exam.sections.flatMap((s) => s.topics.map((t) => t.id)).join(', ')}</CardDescription>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button onClick={() => download('learn-and-lead-sample-questions.json', JSON.stringify(SAMPLE, null, 2))}><Icon name="download" /> Sample file</Button>
          <Button variant="default" onClick={async () => { const t = await pickFile(); if (t) run(t); }}><Icon name="upload" /> Choose JSON file</Button>
        </div>
      </Card>
      <Card>
        <Field label="…or paste JSON here" className="mb-0">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={JSON.stringify(SAMPLE.slice(0, 1), null, 2)} />
        </Field>
        <Button className="w-full" disabled={!text.trim()} onClick={() => run(text)}>Validate &amp; import</Button>
      </Card>
      {report && (
        <Card className={cn(report.error || report.bad?.length ? 'border-warning' : 'border-success')} role="status">
          {report.error ? <p className="m-0 break-words">{report.error}</p> : <div>
            <b>{report.ok} imported</b>{report.bad.length > 0 && <>, {report.bad.length} skipped:</>}
            {report.bad.length > 0 && <ul className="mt-2 mb-0 text-sm break-words">{report.bad.slice(0, 30).map((b) => <li key={b}>{b}</li>)}</ul>}
          </div>}
        </Card>
      )}
      {st.custom.length > 0 && (
        <Button variant="destructive" className="w-full" onClick={async () => {
          if (await confirm({ title: 'Remove imported questions?', body: `All ${st.custom.length} imported questions will be removed. Built-in and AI questions stay.`, ok: 'Remove', danger: true })) { st.custom = []; save(exam.id); toast('Removed'); }
        }}>Remove all imported questions</Button>
      )}
    </Page>
  );
}
