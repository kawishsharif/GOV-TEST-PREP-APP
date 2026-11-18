// AI question generator + offline numerical variants.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Page, useExam, Chips, useToast } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
      <Card>
        <CardTitle><Icon name="calc" /> Offline numerical variants</CardTitle>
        <CardDescription>Unlimited fresh calculation questions with new values every time, worked steps, and wrong options built from the usual slips. No internet or key needed.</CardDescription>
        <div className="flex flex-wrap gap-2">{generatorTopics.filter((t) => exam.topicIndex[t]).map((t) => (
          <Button key={t} asChild size="sm" className="rounded-full"><Link to={`${base}quiz/numerical/${t}`}>{exam.topicIndex[t].name}</Link></Button>
        ))}</div>
      </Card>

      <Card>
        <CardTitle><Icon name="sparkle" /> Generate 10 AI questions</CardTitle>
        <CardDescription>Uses Claude or Gemini through your own API key, so you practise against wording an examiner's AI might produce. Every question is labelled <Badge variant="ai">AI-generated</Badge>, comes with explanations, and is checked for format before it's saved. AI questions can still contain mistakes: if one looks wrong, trust your notes.</CardDescription>
        <div>
          <Field label="Topic">
            <Select value={topic} onValueChange={(v) => { setTopic(v); setResult(null); }}>
              <SelectTrigger id="ai-topic"><SelectValue /></SelectTrigger>
              <SelectContent>{topics.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} ({questionsForTopic(exam, st, t.id).length})</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <div className="mb-4 space-y-2">
            <span className="block text-sm font-semibold text-muted-foreground">Difficulty</span>
            <Chips value={diff} onChange={setDiff} items={[['mixed', 'Mixed'], ['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']]} />
          </div>
          <div className="mb-4 space-y-2">
            <span className="block text-sm font-semibold text-muted-foreground">AI provider</span>
            <Chips value={provider} onChange={choose} items={Object.entries(PROVIDERS).map(([id, p]) => [id, p.name, keys[id] ? '✓ key saved' : null])} />
          </div>
          <Field label={`${P.name} model`}>
            <Select value={model} onValueChange={(v) => setModels((m) => ({ ...m, [provider]: v }))}>
              <SelectTrigger id="ai-model"><SelectValue /></SelectTrigger>
              <SelectContent>{P.models.map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label={`${P.name} API key (stored only on this device, never in backups)`}>
            <Input id={`ai-key-${provider}`} type="password" autoComplete="off" placeholder={P.keyHint} value={key}
              onChange={(e) => setKeys((k) => ({ ...k, [provider]: e.target.value }))} />
          </Field>
        </div>
        <Button variant="default" className="w-full whitespace-normal" disabled={busy} onClick={generate}>
          {busy && <Icon name="loader" />}{busy ? `Generating with ${P.name}… (up to 2 minutes)` : `Generate 10 questions with ${P.name}`}
        </Button>
        <p className="m-0 text-xs text-muted-foreground">{P.keyHelp} Usage is billed to (or counted against the free tier of) your own account.{provider === 'claude' ? ' If Claude declines a request it automatically retries on a fallback model.' : ''}</p>
        {aiCount > 0 && !result && <Button className="w-full" onClick={() => practise(st.ai.filter((q) => q.topic === topic))}>Practise saved AI questions ({aiCount})</Button>}
      </Card>

      {result?.error && (
        <Card className="border-destructive" role="alert">
          <CardTitle className="text-destructive"><Icon name="alert" className="text-destructive" /> Could not generate</CardTitle>
          <p className="m-0 break-words">{result.error}</p>
        </Card>
      )}
      {result?.valid && (
        <Card>
          <CardTitle><Icon name="ok" className="text-success" /> {result.valid.length} questions added</CardTitle>
          <CardDescription>Made with {result.model}.{result.note ? ` ${result.note}` : ''}{result.rejected.length > 0 ? ` ${result.rejected.length} rejected by the format check.` : ''}</CardDescription>
          <Button variant="default" className="w-full" disabled={!result.valid.length} onClick={() => practise(result.valid)}><Icon name="bolt" /> Practise them now</Button>
        </Card>
      )}
    </Page>
  );
}
