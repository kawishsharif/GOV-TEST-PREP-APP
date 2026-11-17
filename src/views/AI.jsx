// AI question generator + offline numerical variants.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Page, useExam, Chips, useToast } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { activeTopics, questionsForTopic } from '../lib/bank.js';
import { global, saveGlobal, save } from '../lib/store.js';
import { generatorTopics } from '../lib/generators.js';
import { PROVIDERS } from '../lib/ai.js';
import { newSession } from './Practice.jsx';

export default function AI() {
  const { exam, st, base } = useExam();
  const toast = useToast();
  const nav = useNavigate();
  const topics = activeTopics(exam, st.settings);
  const [topic, setTopic] = useState(topics[0].id);
  const [diff, setDiff] = useState('mixed');
  const [provider, setProvider] = useState(PROVIDERS[global.aiProvider] ? global.aiProvider : 'claude');
  const P = PROVIDERS[provider];
  const [keys, setKeys] = useState(() => ({ ...global.aiKeys }));
  const [models, setModels] = useState(() => ({ ...global.aiModels }));
  const key = keys[provider] || '';
  const model = models[provider] || P.defaultModel;
  const choose = (p) => { setProvider(p); global.aiProvider = p; saveGlobal(); setResult(null); };
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const aiCount = st.ai.filter((q) => q.topic === topic).length;

  const generate = async () => {
    if (!key.trim()) { toast(`Add your ${P.name} API key first`); return; }
    global.aiKeys = { ...global.aiKeys, [provider]: key.trim() };
    global.aiModels = { ...global.aiModels, [provider]: model };
    saveGlobal();
    setBusy(true); setResult(null);
    try {
      const { generateAIQuestions } = await import('../lib/ai.js');
      const n = exam.notes[topic];
      const notes = n ? [...(n.facts || []), ...(n.formulas || []).map(([a, b]) => `${a}: ${b}`)].join('\n') : '';
      const r = await generateAIQuestions({ provider, exam, topicId: topic, count: 10, difficulty: diff, apiKey: key.trim(), model, notes });
      st.ai.push(...r.valid); save(exam.id);
      setResult(r);
    } catch (e) {
      setResult({ error: e?.message || 'Request failed. Check your connection and try again.' });
    } finally { setBusy(false); }
  };
  const practise = (qs) => { newSession(exam, st, qs, `AI questions · ${exam.topicIndex[topic].name}`); nav(base + 'quiz/session'); };

  return (
    <Page title="AI question generator" sub="Fresh questions in examiner style" back={base + 'more'} base={base}>
      <section className="card">
        <h2><Icon name="calc" /> Offline numerical variants</h2>
        <p className="muted" style={{ fontSize: '.9rem' }}>Unlimited fresh calculation questions with new values every time, worked steps, and wrong options built from the usual slips. No internet or key needed.</p>
        <div className="chips">{generatorTopics.filter((t) => exam.topicIndex[t]).map((t) => (
          <Link key={t} className="chip" to={`${base}quiz/numerical/${t}`}>{exam.topicIndex[t].name}</Link>
        ))}</div>
      </section>

      <section className="card">
        <h2><Icon name="sparkle" /> Generate 10 AI questions</h2>
        <p className="muted" style={{ fontSize: '.9rem' }}>Uses Claude or Gemini through your own API key, so you practise against wording an examiner's AI might produce. Every question is labelled <span className="tag ai">AI-generated</span>, comes with explanations, and is checked for format before it's saved. AI questions can still contain mistakes: if one looks wrong, trust your notes.</p>
        <label className="field"><span>Topic</span>
          <select value={topic} onChange={(e) => { setTopic(e.target.value); setResult(null); }}>
            {topics.map((t) => <option key={t.id} value={t.id}>{t.name} ({questionsForTopic(exam, st, t.id).length})</option>)}
          </select>
        </label>
        <div style={{ marginBottom: 12 }}><Chips value={diff} onChange={setDiff} items={[['mixed', 'Mixed'], ['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']]} /></div>
        <div className="field"><span style={{ display: 'block', fontSize: '.85rem', fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>AI provider</span>
          <Chips value={provider} onChange={choose} items={Object.entries(PROVIDERS).map(([id, p]) => [id, p.name, keys[id] ? '✓ key saved' : null])} />
        </div>
        <label className="field"><span>{P.name} model</span>
          <select id="ai-model" value={model} onChange={(e) => setModels((m) => ({ ...m, [provider]: e.target.value }))}>
            {P.models.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label className="field"><span>{P.name} API key (stored only on this device, never in backups)</span>
          <input id={`ai-key-${provider}`} type="password" autoComplete="off" placeholder={P.keyHint} value={key}
            onChange={(e) => setKeys((k) => ({ ...k, [provider]: e.target.value }))} /></label>
        <button className="btn primary block" disabled={busy} onClick={generate}>{busy ? `Generating with ${P.name}… (up to 2 minutes)` : `Generate 10 questions with ${P.name}`}</button>
        <p className="muted" style={{ fontSize: '.78rem', margin: '10px 0 0' }}>{P.keyHelp} Usage is billed to (or counted against the free tier of) your own account.{provider === 'claude' ? ' If Claude declines a request it automatically retries on a fallback model.' : ''}</p>
        {aiCount > 0 && !result && <button className="btn block" style={{ marginTop: 10 }} onClick={() => practise(st.ai.filter((q) => q.topic === topic))}>Practise saved AI questions ({aiCount})</button>}
      </section>

      {result?.error && <section className="card" style={{ borderColor: 'var(--bad)' }}><b style={{ color: 'var(--bad)' }}>Could not generate</b><p style={{ margin: '6px 0 0' }}>{result.error}</p></section>}
      {result?.valid && (
        <section className="card">
          <h2>{result.valid.length} questions added</h2>
          {result.rejected.length > 0 && <p className="muted" style={{ fontSize: '.85rem' }}>{result.rejected.length} rejected by the format check.</p>}
          <button className="btn primary block" disabled={!result.valid.length} onClick={() => practise(result.valid)}><Icon name="bolt" /> Practise them now</button>
        </section>
      )}
    </Page>
  );
}
