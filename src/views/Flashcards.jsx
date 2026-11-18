// Spaced-repetition flashcards: Again / Hard / Good / Easy.
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Page, useExam, Rich, Stat } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { studyQueue, schedule, intervalLabel } from '../lib/srs.js';
import { activeTopics } from '../lib/bank.js';
import { save } from '../lib/store.js';

const ALL = '__all'; // Select items cannot use an empty value

export default function Flashcards() {
  const { exam, st, base } = useExam();
  const { topic: routeTopic } = useParams();
  const [topic, setTopic] = useState(routeTopic || '');
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);
  const q = studyQueue(exam, st, topic || null);
  const card = q.due[0] || q.fresh[0];
  const topics = useMemo(() => activeTopics(exam, st.settings).filter((t) => exam.notes[t.id]), [exam, st.settings]);

  const rate = (r) => {
    const isNew = !st.srs[card.id];
    st.srs[card.id] = schedule(st.srs[card.id], r);
    if (isNew) st.srsMeta = { ...q.meta, newCount: q.meta.newCount + 1 };
    save(exam.id);
    setFlipped(false);
    setDone((d) => d + 1);
  };

  return (
    <Page title="Flashcards" sub={`${q.learned}/${q.total} cards started`} back={base + 'more'} base={base}>
      <Field label="Topic">
        <Select value={topic || ALL} onValueChange={(v) => { setTopic(v === ALL ? '' : v); setFlipped(false); }}>
          <SelectTrigger id="flash-topic" aria-label="Topic"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All topics</SelectItem>
            {topics.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <div className="mb-4 grid grid-cols-3 gap-2.5">
        <Stat value={q.due.length} label="due reviews" />
        <Stat value={q.fresh.length} label="new today" />
        <Stat value={done} label="done this session" />
      </div>
      {card ? (
        <div className="space-y-3">
          <button type="button" onClick={() => setFlipped(true)}
            className="flex min-h-60 w-full cursor-pointer flex-col justify-center rounded-xl border bg-card p-5 text-center text-lg shadow-card transition-colors hover:bg-accent/30">
            <small className="text-sm text-muted-foreground">{card.kind} · {exam.topicIndex[card.topic]?.name}{!st.srs[card.id] && ' · new'}</small>
            <div className="mt-2 font-bold break-words"><Rich text={card.front} /></div>
            {flipped
              ? <div className="mt-4 border-t border-dashed pt-4 font-semibold break-words whitespace-pre-wrap"><Rich text={card.back} /></div>
              : <small className="mt-4 text-sm text-muted-foreground">Recall the answer, then tap to reveal</small>}
          </button>
          {flipped ? (
            <div className="grid grid-cols-4 gap-2">
              {['Again', 'Hard', 'Good', 'Easy'].map((l, i) => (
                <Button key={l} variant={i === 2 ? 'default' : 'outline'} className="min-h-14 flex-col gap-0 px-1 text-sm" onClick={() => rate(i)}>
                  {l}<small className="text-xs font-medium opacity-85">{intervalLabel(st.srs[card.id], i)}</small>
                </Button>
              ))}
            </div>
          ) : <Button variant="default" className="w-full" onClick={() => setFlipped(true)}>Show answer</Button>}
        </div>
      ) : (
        <Card className="items-center text-center">
          <Icon name="ok" className="size-8 text-success" />
          <b>All caught up.</b>
          <p className="m-0 text-muted-foreground">No cards are due{topic ? ' in this topic' : ''}. New cards are limited to 20 per day so reviews stay manageable.</p>
          <Button asChild><Link to={base + 'practice'}><Icon name="practice" /> Practise questions instead</Link></Button>
        </Card>
      )}
    </Page>
  );
}
