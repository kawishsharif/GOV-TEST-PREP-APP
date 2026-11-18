// Mistake notebook: every wrong answer; leaves only after two correct answers on different days.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Page, useExam, Rich, Empty, SectionTitle, List } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { questionById } from '../lib/bank.js';

export default function Mistakes() {
  const { exam, st, base } = useExam();
  const [open, setOpen] = useState(null);
  const items = Object.entries(st.mistakes).map(([id, m]) => ({ id, m, q: questionById(exam, st, id) })).filter((x) => x.q);
  const byTopic = {};
  for (const x of items) (byTopic[x.q.topic] ||= []).push(x);
  return (
    <Page title="Mistake notebook" sub={`${items.length} to fix · ${st.cleared || 0} cleared`} back={base + 'more'} base={base}>
      <Card>
        <CardDescription className="text-sm">Every question you get wrong lands here. It leaves only after you answer it correctly on <b className="text-foreground">two different days</b>; a wrong answer in between resets the count.</CardDescription>
        {items.length > 0 && <Button asChild variant="default" className="w-full"><Link to={base + 'quiz/mistakes'}><Icon name="repeat" /> Re-attempt my mistakes</Link></Button>}
      </Card>
      {!items.length && <Empty>No mistakes saved. Practise or take a mock — wrong answers are collected automatically.</Empty>}
      {Object.entries(byTopic).sort((a, b) => b[1].length - a[1].length).map(([t, list]) => (
        <div key={t}>
          <div className="mx-1 mt-6 mb-2 flex items-center justify-between gap-3">
            <SectionTitle className="m-0 min-w-0 truncate">{exam.topicIndex[t]?.name} · {list.length}</SectionTitle>
            <Button asChild size="sm"><Link to={`${base}quiz/mistakes/${t}`}>Retry topic</Link></Button>
          </div>
          <Card className="py-2"><List>
            {list.map(({ id, m, q }) => (
              <li key={id}>
                <button type="button" className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-lg px-1 py-2.5 text-left transition-colors hover:bg-accent/60"
                  onClick={() => setOpen(open === id ? null : id)} aria-expanded={open === id}>
                  <div className="min-w-0 flex-1 break-words"><Rich text={q.q} /><small className="block text-sm text-muted-foreground">Wrong {m.wrong}× · correct days {m.rights.length}/2</small></div>
                  <Icon name="chev" className={cn('text-muted-foreground transition-transform', open === id && 'rotate-90')} />
                </button>
                {open === id && (
                  <div className="explain mt-0 mb-3">
                    <p className="mb-1.5">Answer: <b><Rich text={q.options[q.answer]} /></b></p>
                    {q.solution ? <ol>{q.solution.map((s, i) => <li key={i}><Rich text={s} /></li>)}</ol> : <p className="m-0"><Rich text={q.explanation} /></p>}
                  </div>
                )}
              </li>
            ))}
          </List></Card>
        </div>
      ))}
    </Page>
  );
}
