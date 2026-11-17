// One MCQ with options, instant feedback, per-option "why wrong" and worked solution.
import { Rich } from './ui.jsx';
import { DIFF, TYPE } from '../lib/bank.js';
import { KEYS } from '../lib/quizcore.js';

export function QuestionTags({ q, exam }) {
  return (
    <div className="qmeta">
      <span className="tag">{exam.topicIndex[q.topic]?.name || q.topic}</span>
      {q.sub && <span className="tag">{q.sub}</span>}
      <span className="tag">{DIFF[q.difficulty] || q.difficulty}</span>
      <span className="tag">{TYPE[q.type] || q.type}</span>
      {q.style && <span className="tag">{q.style}</span>}
      {q.source === 'ai' && <span className="tag ai">AI-generated</span>}
      {q.source === 'template' && <span className="tag gen">Generated variant</span>}
      {q.source === 'import' && <span className="tag">Imported</span>}
      {q.verifiedSource && <span className="tag">{q.verifiedSource}</span>}
      {q.asOf && <span className="tag asof">As of {q.asOf}</span>}
    </div>
  );
}

/**
 * props: q, exam, order (display→original index), chosen (original index | null),
 *        reveal (show answer), onChoose(originalIndex), num, total, flagged
 */
export function QuestionCard({ q, exam, order, chosen = null, reveal = false, onChoose, num, total, flagged }) {
  const ok = chosen === q.answer;
  return (
    <article className="card">
      {num != null && (
        <div className="row between muted" style={{ fontSize: '.85rem', marginBottom: 4 }}>
          <span>Question {num}{total ? ` of ${total}` : ''}</span>
          {flagged && <span style={{ color: 'var(--flag)', fontWeight: 700 }}>⚑ Flagged</span>}
        </div>
      )}
      <QuestionTags q={q} exam={exam} />
      <div className="qtext"><Rich text={q.q} /></div>
      <div className="opts">
        {order.map((orig, i) => {
          let cls = '';
          if (reveal) { if (orig === q.answer) cls = 'right'; else if (orig === chosen) cls = 'wrong'; }
          else if (orig === chosen) cls = 'sel';
          const why = reveal && q.why?.[orig];
          return (
            <button key={orig} type="button" className={`opt ${cls}`} disabled={reveal || !onChoose} aria-pressed={orig === chosen}
              onClick={() => onChoose?.(orig)}>
              <span className="k">{KEYS[i]}</span>
              <span className="t"><Rich text={q.options[orig]} />{why && <span className="why">✗ <Rich text={why} /></span>}</span>
            </button>
          );
        })}
      </div>
      {reveal && (
        <div className="explain" aria-live="polite">
          {chosen == null ? <div className="verdict bad">Not answered</div> : ok ? <div className="verdict good">Correct</div> : <div className="verdict bad">Incorrect</div>}
          <p style={{ margin: '.4rem 0 .6rem' }}>Answer: <b>{KEYS[order.indexOf(q.answer)]}. <Rich text={q.options[q.answer]} /></b></p>
          {q.solution
            ? <><h3>Worked solution</h3><ol>{q.solution.map((s, i) => <li key={i}><Rich text={s} /></li>)}</ol></>
            : <><h3>Explanation</h3><p style={{ margin: 0 }}><Rich text={q.explanation} /></p></>}
        </div>
      )}
    </article>
  );
}
