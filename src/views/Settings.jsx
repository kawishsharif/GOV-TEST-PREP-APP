// Settings: test date, daily target, test pattern, section weights, track, theme, backup.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Page, useExam, useToast, useConfirm, Chips } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
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
    <input type="number" inputMode="decimal" min={min} max={max} step={step} value={text} style={inline ? { width: 90 } : undefined}
      onChange={(e) => setText(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
  );
  if (inline) return <label className="field row" style={{ marginBottom: 8 }}><span style={{ flex: 1, margin: 0, fontSize: '.95rem', color: 'var(--text)' }}>{label}</span>{input}</label>;
  return <label className="field"><span>{label}</span>{input}</label>;
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
        <section className="card">
          <h2><Icon name="calendar" /> Test</h2>
          <label className="field"><span>Test date</span>
            <input type="date" value={s.testDate} min={dayKey()} onChange={(e) => { if (e.target.value) { set('testDate', e.target.value); if (st.plan) st.plan.stale = true; } }} /></label>
          <Num label="Daily question target" value={s.dailyTarget} min={5} max={500} onCommit={(v) => set('dailyTarget', Math.round(v))} />
        </section>

        <section className="card">
          <h2><Icon name="mock" /> Test pattern</h2>
          <p className="muted" style={{ fontSize: '.88rem' }}>{exam.pattern.note}</p>
          <div className="grid2">
            <Num label="Total questions" value={s.totalQuestions} min={10} max={200} onCommit={(v) => set('totalQuestions', Math.round(v))} />
            <Num label="Time (minutes)" value={s.minutes} min={5} max={300} onCommit={(v) => set('minutes', Math.round(v))} />
          </div>
          <label className="switch"><span>Negative marking</span><input type="checkbox" checked={s.negativeMarking} onChange={(e) => set('negativeMarking', e.target.checked)} /></label>
          <div className="grid2" style={{ marginTop: 8 }}>
            <Num label="Marks deducted per wrong" value={s.negativeValue} min={0} max={1} step={0.05} onCommit={(v) => set('negativeValue', v)} />
            <Num label="Pass mark (%)" value={s.passPercent} min={0} max={100} onCommit={(v) => set('passPercent', Math.round(v))} />
          </div>
        </section>

        <section className="card">
          <h2>Section weights</h2>
          <p className="muted" style={{ fontSize: '.88rem' }}>Used to draw mock-test questions and to prioritise the planner. They should add up to 100.</p>
          {exam.sections.map((sec) => (
            <Num key={sec.id} inline label={sec.name} value={s.sectionWeights[sec.id]} max={100}
              onCommit={(v) => { s.sectionWeights[sec.id] = Math.round(v); save(exam.id); }} />
          ))}
          <p className="muted">Total: <b style={{ color: sumW === 100 ? 'var(--good)' : 'var(--bad)' }}>{sumW}</b>{sumW === 100 ? ' ✓' : ' — mock tests scale weights proportionally.'}</p>
        </section>

        {ee && (
          <section className="card">
            <h2>Electrical topic shares</h2>
            <p className="muted" style={{ fontSize: '.88rem' }}>How the Electrical Engineering questions split between topics in a mock (relative shares).</p>
            {ee.topics.map((t) => (
              <Num key={t.id} inline label={t.name} value={s.topicWeights[t.id]} max={100}
                onCommit={(v) => { s.topicWeights[t.id] = Math.round(v); save(exam.id); }} />
            ))}
          </section>
        )}
      </div>

      <section className="card">
        <h2>Islamic Studies / Ethics</h2>
        <Chips value={s.track} onChange={(v) => set('track', v)} items={[['islamiat', 'Islamic Studies'], ['ethics', 'Ethics (non-Muslim candidates)']]} />
      </section>

      <section className="card">
        <h2>Display</h2>
        <Chips value={global.theme} onChange={(v) => { global.theme = v; saveGlobal(); }} items={[['system', 'System'], ['light', 'Light'], ['dark', 'Dark']]} />
        <label className="switch" style={{ marginTop: 8 }}><span>Shuffle answer options</span><input type="checkbox" checked={s.shuffleOptions} onChange={(e) => set('shuffleOptions', e.target.checked)} /></label>
      </section>

      <section className="card">
        <h2>Backup</h2>
        <p className="muted" style={{ fontSize: '.88rem' }}>Progress is saved on this device automatically. Export a backup to move it to another phone or browser.</p>
        <div className="stack">
          <button className="btn block" onClick={() => { saveNow(exam.id); download(`learn-and-lead-backup-${dayKey()}.json`, JSON.stringify(exportAll())); }}><Icon name="download" /> Export progress (JSON)</button>
          <button className="btn block" onClick={onImport}><Icon name="upload" /> Import progress backup</button>
          <Link className="btn block" to={base + 'import'}><Icon name="plus" /> Import questions (JSON)</Link>
        </div>
      </section>

      <section className="card">
        <h2>Reset</h2>
        <div className="stack">
          <button className="btn block" onClick={onDefaults}>Restore default pattern &amp; weights</button>
          <button className="btn block danger" onClick={onReset}>Erase all progress for this exam</button>
        </div>
      </section>
    </Page>
  );
}
