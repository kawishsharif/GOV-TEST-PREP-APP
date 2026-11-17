// Spaced-repetition flashcards: Again / Hard / Good / Easy.
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Page, useExam, Rich, Chips } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { studyQueue, schedule, intervalLabel } from '../lib/srs.js';
import { activeTopics } from '../lib/bank.js';
import { save } from '../lib/store.js';

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
      <div style={{ marginBottom: 12 }}>
        <Chips value={topic} onChange={(v) => { setTopic(v); setFlipped(false); }} items={[['', 'All topics'], ...topics.map((t) => [t.id, t.name])]} />
      </div>
      <div className="grid3" style={{ marginBottom: 14 }}>
        <div className="stat"><b>{q.due.length}</b><span>due reviews</span></div>
        <div className="stat"><b>{q.fresh.length}</b><span>new today</span></div>
        <div className="stat"><b>{done}</b><span>done this session</span></div>
      </div>
      {card ? (
        <>
          <section className="card flash" onClick={() => setFlipped(true)} role="button" tabIndex={0} onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && setFlipped(true)}>
            <small className="muted">{card.kind} · {exam.topicIndex[card.topic]?.name}{!st.srs[card.id] && ' · new'}</small>
            <div style={{ fontWeight: 700, marginTop: 8 }}><Rich text={card.front} /></div>
            {flipped ? <div className="back"><Rich text={card.back} /></div> : <small className="muted" style={{ marginTop: 16 }}>Recall the answer, then tap to reveal</small>}
          </section>
          {flipped ? (
            <div className="rate">
              {['Again', 'Hard', 'Good', 'Easy'].map((l, i) => (
                <button key={l} className={`btn ${i === 2 ? 'primary' : ''}`} onClick={() => rate(i)}>{l}<small>{intervalLabel(st.srs[card.id], i)}</small></button>
              ))}
            </div>
          ) : <button className="btn primary block" onClick={() => setFlipped(true)}>Show answer</button>}
        </>
      ) : (
        <section className="card empty">
          <p><b>All caught up.</b></p>
          <p>No cards are due{topic ? ' in this topic' : ''}. New cards are limited to 20 per day so reviews stay manageable.</p>
          <Link className="btn" to={base + 'practice'}><Icon name="practice" /> Practise questions instead</Link>
        </section>
      )}
    </Page>
  );
}
