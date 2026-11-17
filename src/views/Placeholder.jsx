import { Page, useExam } from '../components/ui.jsx';
export default function Placeholder() {
  const { exam, base } = useExam();
  return <Page title="Coming soon" sub={exam.title} base={base} back={base + 'more'}><div className="card empty">This screen arrives in a later stage.</div></Page>;
}
