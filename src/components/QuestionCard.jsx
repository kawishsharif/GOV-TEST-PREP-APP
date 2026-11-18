// One MCQ with options, instant feedback, per-option "why wrong" and worked solution.
import { Rich } from './ui.jsx';
import { Icon } from './Icon.jsx';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { DIFF, TYPE } from '../lib/bank.js';
import { KEYS } from '../lib/quizcore.js';

export function QuestionTags({ q, exam }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge>{exam.topicIndex[q.topic]?.name || q.topic}</Badge>
      {q.sub && <Badge>{q.sub}</Badge>}
      <Badge>{DIFF[q.difficulty] || q.difficulty}</Badge>
      {!q.reported && <Badge>{TYPE[q.type] || q.type}</Badge>}
      {q.style && <Badge variant={q.reported ? 'warning' : 'secondary'}>{q.style}</Badge>}
      {q.source === 'ai' && <Badge variant="ai">AI-generated</Badge>}
      {q.source === 'template' && <Badge variant="brand">Generated variant</Badge>}
      {q.source === 'import' && <Badge>Imported</Badge>}
      {q.verifiedSource && <Badge variant={q.reported ? 'brand' : 'secondary'}>{q.reported && <Icon name="check" />}{q.verifiedSource}</Badge>}
      {q.asOf && <Badge variant="warning">As of {q.asOf}</Badge>}
    </div>
  );
}

/** Where a real past-paper question came from, and any correction made to the source's answer key. */
function ReportedSource({ r }) {
  return (
    <div className="mt-3 space-y-1 border-t border-border/70 pt-3 text-xs text-muted-foreground">
      <p className="m-0"><b className="text-foreground">Reported in:</b> {r.paper} · collected from {r.via}. Not an official paper; answer checked by Learn &amp; Lead.</p>
      {r.note && <p className="m-0 font-medium text-warning">Answer-key correction: {r.note}</p>}
    </div>
  );
}

/**
 * props: q, exam, order (display→original index), chosen (original index | null),
 *        reveal (show answer), onChoose(originalIndex), num, total, flagged
 */
export function QuestionCard({ q, exam, order, chosen = null, reveal = false, onChoose, num, total, flagged, hideTags = false }) {
  const ok = chosen === q.answer;
  return (
    <Card as="article">
      {num != null && (
        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>Question {num}{total ? ` of ${total}` : ''}</span>
          {flagged && <span className="flex items-center gap-1 font-bold text-flag"><Icon name="flag" className="size-4" /> Flagged</span>}
        </div>
      )}
      {!hideTags && <QuestionTags q={q} exam={exam} />}
      <div className="qtext mb-1 break-words"><Rich text={q.q} /></div>
      <div className="opts">
        {order.map((orig, i) => {
          let cls = '';
          if (reveal) { if (orig === q.answer) cls = 'right'; else if (orig === chosen) cls = 'wrong'; }
          else if (orig === chosen) cls = 'sel';
          const why = reveal && q.why?.[orig];
          return (
            <button key={orig} type="button" className={cn('opt', cls)} disabled={reveal || !onChoose} aria-pressed={orig === chosen}
              onClick={() => onChoose?.(orig)}>
              <span className="k">{KEYS[i]}</span>
              <span className="t min-w-0 break-words"><Rich text={q.options[orig]} />{why && <span className="why">✗ <Rich text={why} /></span>}</span>
            </button>
          );
        })}
      </div>
      {reveal && (
        <div className="explain" aria-live="polite">
          {chosen == null
            ? <div className="verdict bad flex items-center gap-1.5"><Icon name="wrong" /> Not answered</div>
            : ok ? <div className="verdict good flex items-center gap-1.5"><Icon name="ok" /> Correct</div>
              : <div className="verdict bad flex items-center gap-1.5"><Icon name="wrong" /> Incorrect</div>}
          <p className="mt-1.5 mb-2.5">Answer: <b>{KEYS[order.indexOf(q.answer)]}. <Rich text={q.options[q.answer]} /></b></p>
          {q.solution
            ? <><h2>Worked solution</h2><ol>{q.solution.map((s, i) => <li key={i}><Rich text={s} /></li>)}</ol></>
            : <><h2>Explanation</h2><p className="m-0"><Rich text={q.explanation} /></p></>}
          {q.reported && <ReportedSource r={q.reported} />}
        </div>
      )}
    </Card>
  );
}
