// Study notes: topic index and topic page (definitions, formulas, most-repeated facts, traps, solved examples).
import { Link, useParams } from 'react-router-dom';
import { Page, useExam, Rich, Empty, LinkCard, SectionTitle, List, ListRow } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { activeSections } from '../lib/bank.js';
import { topicReport } from '../lib/stats.js';

export default function Notes() {
  const { topic } = useParams();
  return topic ? <TopicNotes id={topic} /> : <NotesIndex />;
}

function NotesIndex() {
  const { exam, st, base } = useExam();
  const rep = Object.fromEntries(topicReport(exam, st).map((t) => [t.id, t]));
  return (
    <Page title="Study notes" sub={exam.title} base={base}>
      <LinkCard to={base + 'strategy'} icon="target" className="border-brand" title="Top-scorer strategy" sub="What to master first, time plan for the 120 minutes, high-yield list" />
      <LinkCard to={base + 'formulas'} icon="printer" title="Formula sheet" sub="All Electrical formulas on one printable page" />
      {activeSections(exam, st.settings).map((s) => (
        <div key={s.id}>
          <SectionTitle>{s.name} · {s.weight}%</SectionTitle>
          <Card className="py-2"><List>
            {s.topics.filter((t) => exam.notes[t.id]).map((t) => (
              <ListRow key={t.id} to={`${base}notes/${t.id}`} title={t.name}
                sub={rep[t.id]?.acc != null ? `${Math.round(rep[t.id].acc * 100)}% accuracy` : 'Not practised yet'} />
            ))}
          </List></Card>
        </div>
      ))}
    </Page>
  );
}

const NoteCard = ({ title, children }) => <Card className="notes"><CardTitle>{title}</CardTitle><div className="min-w-0">{children}</div></Card>;

function TopicNotes({ id }) {
  const { exam, base } = useExam();
  const n = exam.notes[id];
  if (!n) return <Page title="Notes" base={base} back={base + 'notes'}><Empty>No notes for this topic.</Empty></Page>;
  return (
    <Page title={n.title} sub="Study notes" back={base + 'notes'} base={base}>
      <Card className="notes">
        <p className="m-0">{n.summary}</p>
        <div className="grid grid-cols-2 gap-3">
          <Button asChild variant="default"><Link to={`${base}quiz/topic/${id}`}><Icon name="practice" /> Practise</Link></Button>
          <Button asChild><Link to={`${base}flashcards/${id}`}><Icon name="cards" /> Flashcards</Link></Button>
        </div>
      </Card>
      {n.facts?.length > 0 && <NoteCard title="Most repeated facts">{n.facts.map((f, i) => <div className="fact" key={i}><Rich text={f} /></div>)}</NoteCard>}
      {n.formulas?.length > 0 && <NoteCard title="Formulas">{n.formulas.map(([k, v]) => <div className="formula" key={k}><b>{k}</b><Rich text={v} /></div>)}</NoteCard>}
      {n.definitions?.length > 0 && <NoteCard title="Key definitions"><ul>{n.definitions.map(([k, v]) => <li key={k}><b>{k}:</b> <Rich text={v} /></li>)}</ul></NoteCard>}
      {n.traps?.length > 0 && <NoteCard title="Common traps">{n.traps.map((t, i) => <div className="trap" key={i}><Rich text={t} /></div>)}</NoteCard>}
      {n.examples?.length > 0 && (
        <NoteCard title="Solved examples">
          {n.examples.map((e, i) => (
            <details className="example" key={i}>
              <summary><Rich text={e.q} /></summary>
              <ol>{e.steps.map((s, j) => <li key={j}><Rich text={s} /></li>)}</ol>
              <p className="m-0"><b>Answer:</b> <Rich text={e.answer} /></p>
            </details>
          ))}
        </NoteCard>
      )}
    </Page>
  );
}
