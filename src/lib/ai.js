// AI question generation with the user's own API key (stored only in this browser).
// Two providers share one prompt and one validator:
//   - Claude (Anthropic SDK, structured outputs, refusal fallbacks)
//   - Gemini (Google Generative Language REST API, JSON schema output)
import { uid } from './util.js';
import { validateQuestion } from './bank.js';

export const PROVIDERS = {
  claude: {
    name: 'Claude',
    keyHint: 'sk-ant-…',
    keyHelp: 'Create a key at console.anthropic.com → API keys.',
    models: [['claude-opus-5-5', 'Claude Opus 5.5 (best quality)'], ['claude-sonnet-5-5', 'Claude Sonnet 5.5 (faster, cheaper)']],
    defaultModel: 'claude-opus-5-5',
  },
  gemini: {
    name: 'Gemini',
    keyHint: 'AIza… or AQ.…',
    keyHelp: 'Create a key at aistudio.google.com → Get API key.',
    // "-latest" aliases follow Google's current model, so they keep working when a version is retired.
    models: [['gemini-flash-latest', 'Gemini Flash (free, recommended)'], ['gemini-flash-lite-latest', 'Gemini Flash-Lite (free, fastest)'], ['gemini-pro-latest', 'Gemini Pro (needs billing on your Google account)']],
    // Free models tried in order when the chosen one is overloaded or not free on this key.
    fallbacks: ['gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-3.1-flash-lite', 'gemini-3.5-flash'],
    defaultModel: 'gemini-flash-latest',
  },
};

function buildPrompt({ exam, topic, count, difficulty, notes }) {
  return [
    `Write ${count} new multiple-choice questions for the topic "${topic.name}" for this exam: ${exam.subtitle}.`,
    'They should read like questions a modern examiner (or an AI the examiner uses) would write: fresh wording and concept-based or numerical variants of the classic, repeatedly tested ideas, not copies of well-known past-paper questions.',
    `Difficulty: ${difficulty === 'mixed' ? 'mix easy, medium and hard, weighted towards medium/hard' : difficulty}. About one third numerical where the topic allows.`,
    'Rules for every question:',
    '- exactly 4 options, exactly one unambiguously correct; `answer` is the 0-based index of the correct option;',
    '- no "all of the above"/"none of the above"/"both A and B" options;',
    '- `why` has 4 entries in option order: an empty string for the correct option, otherwise one sentence on why that option is wrong (for numericals, name the slip that produces it);',
    '- `solution` is the step-by-step working for numericals (each step one short line, last step states the answer); an empty array for non-numerical questions;',
    '- `explanation` is 1–3 sentences on why the answer is correct;',
    '- double-check every calculation and fact; never claim a question comes from a specific real past paper;',
    '- use plain text; write superscripts as ^{2} and subscripts as _{th} if needed.',
    notes ? `Reference notes for this topic (stay consistent with them):\n${notes}` : '',
  ].join('\n');
}

// Plain JSON Schema (used by Gemini's responseJsonSchema).
const QUESTION_SCHEMA = {
  type: 'object',
  properties: {
    q: { type: 'string' },
    options: { type: 'array', items: { type: 'string' }, minItems: 4, maxItems: 4 },
    answer: { type: 'integer' },
    difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
    type: { type: 'string', enum: ['conceptual', 'numerical', 'factual'] },
    explanation: { type: 'string' },
    solution: { type: 'array', items: { type: 'string' } },
    why: { type: 'array', items: { type: 'string' } },
  },
  required: ['q', 'options', 'answer', 'difficulty', 'type', 'explanation', 'solution', 'why'],
};
const BATCH_SCHEMA = { type: 'object', properties: { questions: { type: 'array', items: QUESTION_SCHEMA } }, required: ['questions'] };

async function callClaude({ apiKey, model, prompt }) {
  const [{ default: Anthropic }, { betaZodOutputFormat }, { z }] = await Promise.all([
    import('@anthropic-ai/sdk'), import('@anthropic-ai/sdk/helpers/beta/zod'), import('zod'),
  ]);
  const Question = z.object({
    q: z.string(), options: z.array(z.string()), answer: z.number().int(),
    difficulty: z.enum(['easy', 'medium', 'hard']), type: z.enum(['conceptual', 'numerical', 'factual']),
    explanation: z.string(), solution: z.array(z.string()), why: z.array(z.string()),
  });
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  let response;
  try {
    response = await client.beta.messages.parse({
      model,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'high', format: betaZodOutputFormat(z.object({ questions: z.array(Question) })) },
      messages: [{ role: 'user', content: prompt }],
    });
  } catch (e) {
    if (e?.status === 401) throw new Error('Claude rejected the API key. Check it in the key field.');
    if (e?.status === 429) throw new Error('Claude rate limit reached — wait a minute and try again.');
    throw new Error(e?.message || 'Could not reach Claude. Check your connection.');
  }
  if (response.stop_reason === 'refusal') throw new Error('The model declined this request. Try a different topic or wording.');
  if (response.stop_reason === 'max_tokens') throw new Error('The response was cut off. Try again.');
  return { questions: response.parsed_output?.questions || [], model: response.model };
}

/** Turn a Google API error into a message that names the real cause and what to do. */
function geminiError(status, rawMsg, model) {
  const msg = String(rawMsg || '').trim();
  const short = msg.split('\n')[0].slice(0, 220);
  if (status === 429 && /limit:\s*0\b/.test(msg)) {
    return `"${model}" is not included in your Gemini free tier (Google allows 0 requests for it). Choose Gemini Flash, or set up billing for this key in Google AI Studio.`;
  }
  if (status === 503) return `Gemini is overloaded right now (Google says: high demand). Try again in a minute.`;
  if (status === 429) return `Gemini usage limit reached for now. Wait a minute (or until tomorrow for daily limits) and try again. Google says: ${short}`;
  if (status === 400 && /api key not valid|api_key_invalid/i.test(msg)) return `Google says this API key is not valid. Copy it again from Google AI Studio (no spaces). Google says: ${short}`;
  if (status === 401 || status === 403) return `Google refused this key for this request. Google says: ${short}`;
  if (status === 404) return `Model "${model}" is not available for this key. Pick another model. Google says: ${short}`;
  return `Gemini error ${status}. Google says: ${short || 'no details'}`;
}

async function callGemini({ apiKey, model, prompt }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 180000);
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', responseJsonSchema: BATCH_SCHEMA, maxOutputTokens: 32000 },
      }),
    });
  } catch (e) {
    throw new Error(e?.name === 'AbortError'
      ? 'Gemini did not answer within 3 minutes. Try again, or choose fewer/easier questions.'
      : 'Could not reach Gemini. Check your internet connection.');
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(geminiError(res.status, data?.error?.message || res.statusText, model));
    err.status = res.status;
    err.notFree = res.status === 429 && /limit:\s*0\b/.test(data?.error?.message || '');
    throw err;
  }
  const cand = data.candidates?.[0];
  if (!cand) throw new Error(`Gemini returned no answer${data.promptFeedback?.blockReason ? ` (blocked: ${data.promptFeedback.blockReason})` : ''}.`);
  if (cand.finishReason === 'MAX_TOKENS') throw new Error('The response was cut off. Try again.');
  if (cand.finishReason === 'SAFETY' || cand.finishReason === 'RECITATION') throw new Error('Gemini declined this request. Try a different topic.');
  const text = (cand.content?.parts || []).filter((p) => p.text && !p.thought).map((p) => p.text).join('');
  let parsed;
  try { parsed = JSON.parse(text); } catch { throw new Error('Gemini returned an unreadable answer. Try again.'); }
  return { questions: parsed.questions || [], model: data.modelVersion || model };
}

/** Try the chosen Gemini model, then free fallbacks when it is overloaded, unavailable or not free on this key. */
async function callGeminiWithFallback({ apiKey, model, prompt }) {
  const chain = [model, ...PROVIDERS.gemini.fallbacks.filter((m) => m !== model)];
  const skipped = new Set();
  let lastErr;
  // Two rounds: Google's "high demand" (503) spikes usually pass within seconds.
  for (let round = 0; round < 2; round++) {
    if (round) await new Promise((r) => setTimeout(r, 5000));
    for (const m of chain) {
      try {
        const r = await callGemini({ apiKey, model: m, prompt });
        skipped.delete(m);
        const list = [...skipped];
        return { ...r, note: list.length ? `${list.join(', ')} ${list.length > 1 ? 'were' : 'was'} busy or not free on your key, so ${m} was used.` : '' };
      } catch (e) {
        lastErr = e;
        const retryable = e.status === 503 || e.status === 404 || e.status === 500 || e.notFree || e.status === 429;
        if (!retryable) throw e;
        skipped.add(m);
        if (e.notFree || e.status === 404) chain.splice(chain.indexOf(m), 1); // never retry those in round 2
      }
    }
    if (!chain.length) break;
  }
  throw lastErr;
}

export async function generateAIQuestions({ provider = 'claude', exam, topicId, count = 10, difficulty = 'mixed', apiKey, model, notes }) {
  const topic = exam.topicIndex[topicId];
  const prompt = buildPrompt({ exam, topic, count, difficulty, notes });
  const p = PROVIDERS[provider] ? provider : 'claude';
  const call = p === 'gemini' ? callGeminiWithFallback : callClaude;
  const { questions, model: usedModel, note } = await call({ apiKey, model: model || PROVIDERS[p].defaultModel, prompt });

  const now = new Date().toISOString().slice(0, 10);
  const valid = [], rejected = [];
  for (const g of questions) {
    const q = {
      id: 'ai-' + uid(), topic: topicId, difficulty: g.difficulty, type: g.type, style: 'AI-generated variant', source: 'ai',
      q: g.q, options: g.options, answer: g.answer, explanation: g.explanation,
      ...(g.solution?.length ? { solution: g.solution } : {}),
      ...(g.why?.length === 4 ? { why: g.why.map((w, i) => (i === g.answer || !w ? null : w)) } : {}),
      generatedAt: now, model: usedModel, provider: PROVIDERS[p].name,
    };
    const err = validateQuestion(q, exam);
    (err ? rejected : valid).push(err ? `${String(g.q).slice(0, 60)}… — ${err}` : q);
  }
  return { valid, rejected, note, model: usedModel };
}
