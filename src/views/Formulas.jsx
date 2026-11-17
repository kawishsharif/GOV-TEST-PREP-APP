// Printable formula sheet built from every Electrical topic's notes.
import { Page, useExam, Rich } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';

export default function Formulas() {
  const { exam, base } = useExam();
  const ee = exam.sections.find((s) => s.id === 'EE') || exam.sections[0];
  return (
    <Page title="Formula sheet" sub="Electrical Engineering" back={base + 'notes'} base={base}>
      <button className="btn block no-print" style={{ marginBottom: 14 }} onClick={() => window.print()}><Icon name="printer" /> Print / save as PDF</button>
      <div className="sheet-print">
        <h1 style={{ fontSize: '1.2rem', margin: 0 }}>{exam.title} — Electrical formula sheet</h1>
        <small style={{ color: '#556' }}>Learn &amp; Lead</small>
        {ee.topics.map((t) => {
          const n = exam.notes[t.id];
          if (!n?.formulas?.length) return null;
          return (
            <div key={t.id}>
              <h2>{n.title}</h2>
              <table><tbody>{n.formulas.map(([k, v]) => <tr key={k}><td>{k}</td><td><Rich text={v} /></td></tr>)}</tbody></table>
            </div>
          );
        })}
      </div>
    </Page>
  );
}
