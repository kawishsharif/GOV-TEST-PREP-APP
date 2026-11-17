// Study notes: topic index and topic page (definitions, formulas, most-repeated facts, traps, solved examples).
import { Link, useParams } from 'react-router-dom';
import { Page, useExam, Rich, Empty } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
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
      <Link className="card row" to={base + 'strategy'} style={{ textDecoration: 'none', color: 'inherit', borderColor: 'var(--accent)' }}>
        <Icon name="target" /><div style={{ flex: 1 }}><b>Top-scorer strategy</b><br /><small className="muted">What to master first, time plan for the 120 minutes, high-yield list</small></div><Icon name="chev" className="chev" />
      </Link>
      <Link className="card row" to={base + 'formulas'} style={{ textDecoration: 'none', color: 'inherit' }}>
        <Icon name="printer" /><div style={{ flex: 1 }}><b>Formula sheet</b><br /><small className="muted">All Electrical formulas on one printable page</small></div><Icon name="chev" className="chev" />
      </Link>
      {activeSections(exam, st.settings).map((s) => (
        <div key={s.id}>
          <div className="sec-title">{s.name} · {s.weight}%</div>
          <section className="card"><ul className="list">
            {s.topics.filter((t) => exam.notes[t.id]).map((t) => (
              <li key={t.id}><Link className="list-link" to={`${base}notes/${t.id}`}>
                <div className="grow"><b>{t.name}</b><small className="muted">{rep[t.id]?.acc != null ? `${Math.round(rep[t.id].acc * 100)}% accuracy` : 'Not practised yet'}</small></div>
                <Icon name="chev" className="chev" />
              </Link></li>
            ))}
          </ul></section>
        </div>
      ))}
    </Page>
  );
}

function TopicNotes({ id }) {
  const { exam, base } = useExam();
  const n = exam.notes[id];
  if (!n) return <Page title="Notes" base={base} back={base + 'notes'}><Empty>No notes for this topic.</Empty></Page>;
  return (
    <Page title={n.title} sub="Study notes" back={base + 'notes'} base={base}>
      <section className="card notes">
        <p style={{ margin: 0 }}>{n.summary}</p>
        <div className="row" style={{ marginTop: 12 }}>
          <Link className="btn primary block" to={`${base}quiz/topic/${id}`}><Icon name="practice" /> Practise</Link>
          <Link className="btn block" to={`${base}flashcards/${id}`}><Icon name="cards" /> Flashcards</Link>
        </div>
      </section>
      {n.facts?.length > 0 && <section className="card notes"><h2>Most repeated facts</h2>{n.facts.map((f, i) => <div className="fact" key={i}><Rich text={f} /></div>)}</section>}
      {n.formulas?.length > 0 && <section className="card notes"><h2>Formulas</h2>{n.formulas.map(([k, v]) => <div className="formula" key={k}><b>{k}</b><Rich text={v} /></div>)}</section>}
      {n.definitions?.length > 0 && <section className="card notes"><h2>Key definitions</h2><ul>{n.definitions.map(([k, v]) => <li key={k}><b>{k}:</b> <Rich text={v} /></li>)}</ul></section>}
      {n.traps?.length > 0 && <section className="card notes"><h2>Common traps</h2>{n.traps.map((t, i) => <div className="trap" key={i}><Rich text={t} /></div>)}</section>}
      {n.examples?.length > 0 && (
        <section className="card notes"><h2>Solved examples</h2>
          {n.examples.map((e, i) => (
            <details className="example" key={i}>
              <summary><Rich text={e.q} /></summary>
              <ol>{e.steps.map((s, j) => <li key={j}><Rich text={s} /></li>)}</ol>
              <p style={{ margin: 0 }}><b>Answer:</b> <Rich text={e.answer} /></p>
            </details>
          ))}
        </section>
      )}
    </Page>
  );
}
