// AI question generation with the user's own Anthropic API key (stored only in this browser).
// Uses structured outputs so every question arrives in the bank's exact shape, then re-validates.
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { uid } from './util.js';
import { validateQuestion } from './bank.js';

const Question = z.object({
  q: z.string(),
  options: z.array(z.string()),
  answer: z.number().int(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  type: z.enum(['conceptual', 'numerical', 'factual']),
  explanation: z.string(),
  solution: z.array(z.string()),
  why: z.array(z.string()),
});
const Batch = z.object({ questions: z.array(Question) });

export async function generateAIQuestions({ exam, topicId, count = 10, difficulty = 'mixed', apiKey, model = 'claude-opus-5-5', notes }) {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const topic = exam.topicIndex[topicId];
  const prompt = [
    `Write ${count} new multiple-choice questions for the topic "${topic.name}" for this exam: ${exam.subtitle}.`,
    `They should read like questions a modern examiner (or an AI the examiner uses) would write: fresh wording and concept-based or numerical variants of the classic, repeatedly tested ideas, not copies of well-known past-paper questions.`,
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

  const response = await client.beta.messages.parse({
    model,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'high', format: betaZodOutputFormat(Batch) },
    messages: [{ role: 'user', content: prompt }],
  });
  if (response.stop_reason === 'refusal') throw new Error('The model declined this request. Try a different topic or wording.');
  if (response.stop_reason === 'max_tokens') throw new Error('The response was cut off. Try generating fewer questions at once.');
  const out = response.parsed_output?.questions || [];
  const now = new Date().toISOString().slice(0, 10);
  const valid = [], rejected = [];
  for (const g of out) {
    const q = {
      id: 'ai-' + uid(), topic: topicId, difficulty: g.difficulty, type: g.type, style: 'AI-generated variant', source: 'ai',
      q: g.q, options: g.options, answer: g.answer, explanation: g.explanation,
      ...(g.solution?.length ? { solution: g.solution } : {}),
      ...(g.why?.length === 4 ? { why: g.why.map((w, i) => (i === g.answer || !w ? null : w)) } : {}),
      generatedAt: now, model: response.model,
    };
    const err = validateQuestion(q, exam);
    (err ? rejected : valid).push(err ? `${g.q.slice(0, 60)}… — ${err}` : q);
  }
  return { valid, rejected };
}
