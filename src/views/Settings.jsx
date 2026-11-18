// Settings: test date, daily target, test pattern, section weights, track, theme, backup.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Page, useExam, useToast, useConfirm, Chips } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { SwitchRow } from '@/components/ui/switch';
import { AccountCard } from '../components/Account.jsx';
import { dayKey, download, pickFile } from '../lib/util.js';
import { global, saveGlobal, save, saveNow, defaultSettings, exportAll, importAll, resetExam } from '../lib/store.js';

function Num({ label, value, onCommit, min = 0, max = 1000, step = 1, inline }) {
  const [text, setText] = useState(String(value));
  const commit = () => {
    const v = Number(text);
    if (text.trim() === '' || !Number.isFinite(v)) { setText(String(value)); return; }
    const c = Math.min(max, Math.max(min, v));
    setText(String(c));
    if (c !== value) onCommit(c);
  };
  const input = (
    <Input type="number" inputMode="decimal" min={min} max={max} step={step} value={text} className={inline ? 'w-24 shrink-0' : undefined}
      onChange={(e) => setText(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
  );
  if (inline) return <label className="mb-2 flex items-center gap-3"><span className="min-w-0 flex-1">{label}</span>{input}</label>;
  return <Field label={label}>{input}</Field>;
}

export default function Settings() {
  const { exam, st, base } = useExam();
  const s = st.settings;
  const toast = useToast();
  const nav = useNavigate();
  const [confirm, dialog] = useConfirm();
  const [rev, force] = useState(0); // bump to remount number inputs after restoring defaults
  const set = (k, v) => { s[k] = v; save(exam.id); };
  const sumW = Object.values(s.sectionWeights).reduce((a, v) => a + Number(v || 0), 0);
  const ee = exam.sections.find((x) => x.id === 'EE');

  const onImport = async () => {
    const text = await pickFile();
    if (!text) return;
    try { const n = importAll(JSON.parse(text)); toast(`Restored ${n} exam${n === 1 ? '' : 's'}`); }
    catch (e) { toast(e.message || 'Invalid file', 3500); }
  };
  const onDefaults = async () => {
    if (!await confirm({ title: 'Restore defaults?', body: 'Test pattern, section weights and topic shares go back to the exam pack defaults. Your test date, target and progress are kept.', ok: 'Restore' })) return;
    const d = defaultSettings(exam);
    Object.assign(s, { totalQuestions: d.totalQuestions, minutes: d.minutes, negativeMarking: d.negativeMarking, negativeValue: d.negativeValue, passPercent: d.passPercent, sectionWeights: d.sectionWeights, topicWeights: d.topicWeights });
    save(exam.id); force((x) => x + 1); toast('Defaults restored');
  };
  const onReset = async () => {
    if (!await confirm({ title: 'Erase all progress?', body: 'Attempts, mistakes, flashcard schedule, mock results and plan for this exam will be deleted. Export a backup first if unsure.', ok: 'Erase', danger: true })) return;
    resetExam(exam); toast('Progress erased'); nav(base + 'dashboard');
  };

  return (
    <Page title="Settings" sub={exam.title} back={base + 'more'} base={base}>
      {dialog}
      <AccountCard />
      <div key={rev}>
        <Card>
          <CardTitle><Icon name="calendar" /> Test</CardTitle>
          <div>
            <Field label="Test date">
              <Input type="date" value={s.testDate} min={dayKey()} onChange={(e) => { if (e.target.value) { set('testDate', e.target.value); if (st.plan) st.plan.stale = true; } }} />
            </Field>
            <Num label="Daily question target" value={s.dailyTarget} min={5} max={500} onCommit={(v) => set('dailyTarget', Math.round(v))} />
          </div>
        </Card>

        <Card>
          <CardTitle><Icon name="mock" /> Test pattern</CardTitle>
          <CardDescription>{exam.pattern.note}</CardDescription>
          <div className="grid grid-cols-2 gap-3 [&>label]:mb-0">
            <Num label="Total questions" value={s.totalQuestions} min={10} max={200} onCommit={(v) => set('totalQuestions', Math.round(v))} />
            <Num label="Time (minutes)" value={s.minutes} min={5} max={300} onCommit={(v) => set('minutes', Math.round(v))} />
          </div>
          <SwitchRow id="neg-marking" label="Negative marking" checked={s.negativeMarking} onCheckedChange={(v) => set('negativeMarking', v)} />
          <div className="grid grid-cols-2 gap-3 [&>label]:mb-0">
            <Num label="Marks deducted per wrong" value={s.negativeValue} min={0} max={1} step={0.05} onCommit={(v) => set('negativeValue', v)} />
            <Num label="Pass mark (%)" value={s.passPercent} min={0} max={100} onCommit={(v) => set('passPercent', Math.round(v))} />
          </div>
        </Card>

        <Card>
          <CardTitle>Section weights</CardTitle>
          <CardDescription>Used to draw mock-test questions and to prioritise the planner. They should add up to 100.</CardDescription>
          <div>
            {exam.sections.map((sec) => (
              <Num key={sec.id} inline label={sec.name} value={s.sectionWeights[sec.id]} max={100}
                onCommit={(v) => { s.sectionWeights[sec.id] = Math.round(v); save(exam.id); }} />
            ))}
          </div>
          <p className="m-0 text-sm text-muted-foreground">Total: <b className={sumW === 100 ? 'text-success' : 'text-destructive'}>{sumW}</b>{sumW === 100 ? ' ✓' : ' — mock tests scale weights proportionally.'}</p>
        </Card>

        {ee && (
          <Card>
            <CardTitle>Electrical topic shares</CardTitle>
            <CardDescription>How the Electrical Engineering questions split between topics in a mock (relative shares).</CardDescription>
            <div>
              {ee.topics.map((t) => (
                <Num key={t.id} inline label={t.name} value={s.topicWeights[t.id]} max={100}
                  onCommit={(v) => { s.topicWeights[t.id] = Math.round(v); save(exam.id); }} />
              ))}
            </div>
          </Card>
        )}
      </div>

      <Card>
        <CardTitle>Islamic Studies / Ethics</CardTitle>
        <Chips value={s.track} onChange={(v) => set('track', v)} items={[['islamiat', 'Islamic Studies'], ['ethics', 'Ethics (non-Muslim candidates)']]} />
      </Card>

      <Card>
        <CardTitle>Display</CardTitle>
        <Chips value={global.theme} onChange={(v) => { global.theme = v; saveGlobal(); }} items={[['system', 'System'], ['light', 'Light'], ['dark', 'Dark']]} />
        <SwitchRow id="shuffle-opts" label="Shuffle answer options" checked={s.shuffleOptions} onCheckedChange={(v) => set('shuffleOptions', v)} />
      </Card>

      <Card>
        <CardTitle>Backup</CardTitle>
        <CardDescription>Progress is saved on this device automatically. Export a backup to move it to another phone or browser.</CardDescription>
        <div className="space-y-3">
          <Button className="w-full" onClick={() => { saveNow(exam.id); download(`learn-and-lead-backup-${dayKey()}.json`, JSON.stringify(exportAll())); }}><Icon name="download" /> Export progress (JSON)</Button>
          <Button className="w-full" onClick={onImport}><Icon name="upload" /> Import progress backup</Button>
          <Button asChild className="w-full"><Link to={base + 'import'}><Icon name="plus" /> Import questions (JSON)</Link></Button>
        </div>
      </Card>

      <Card>
        <CardTitle>Reset</CardTitle>
        <div className="space-y-3">
          <Button className="w-full" onClick={onDefaults}><Icon name="reset" /> Restore default pattern &amp; weights</Button>
          <Button variant="destructive" className="w-full" onClick={onReset}>Erase all progress for this exam</Button>
        </div>
      </Card>
    </Page>
  );
}
