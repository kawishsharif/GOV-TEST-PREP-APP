// Printable formula sheet built from every Electrical topic's notes.
import { Page, useExam, Rich } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { Button } from '@/components/ui/button';

export default function Formulas() {
  const { exam, base } = useExam();
  const ee = exam.sections.find((s) => s.id === 'EE') || exam.sections[0];
  return (
    <Page title="Formula sheet" sub="Electrical Engineering" back={base + 'notes'} base={base}>
      <Button className="no-print mb-4 w-full" onClick={() => window.print()}><Icon name="printer" /> Print / save as PDF</Button>
      <div className="sheet-print overflow-x-auto">
        <h1 className="m-0 text-xl">{exam.title} — Electrical formula sheet</h1>
        <small className="text-[#556]">Learn &amp; Lead</small>
        {ee.topics.map((t) => {
          const n = exam.notes[t.id];
          if (!n?.formulas?.length) return null;
          return (
            <div key={t.id}>
              <h2>{n.title}</h2>
              <table><tbody>{n.formulas.map(([k, v]) => <tr key={k}><td>{k}</td><td className="break-words"><Rich text={v} /></td></tr>)}</tbody></table>
            </div>
          );
        })}
      </div>
    </Page>
  );
}
