// Exam-specific strategy guide (from the exam pack's strategy.json).
import { Page, useExam, Rich, Empty } from '../components/ui.jsx';

export default function Strategy() {
  const { exam, base } = useExam();
  const s = exam.strategy;
  if (!s) return <Page title="Strategy" base={base} back={base + 'notes'}><Empty>No strategy guide in this exam pack.</Empty></Page>;
  return (
    <Page title={s.title} sub={exam.title} back={base + 'notes'} base={base}>
      <section className="card"><p style={{ margin: 0 }}>{s.intro}</p></section>
      {s.sections.map((sec) => (
        <section className="card notes" key={sec.heading}>
          <h2>{sec.heading}</h2>
          {sec.table && (
            <table className="simple" style={{ marginBottom: 10 }}>
              <thead><tr>{sec.table[0].map((h, i) => <th key={h} className={i ? 'num' : ''}>{h}</th>)}</tr></thead>
              <tbody>{sec.table.slice(1).map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i} className={i ? 'num' : ''}>{i === 2 ? <b>{c}</b> : c}</td>)}</tr>)}</tbody>
            </table>
          )}
          <ul>{sec.items.map((it, i) => <li key={i}><Rich text={it} /></li>)}</ul>
        </section>
      ))}
    </Page>
  );
}
