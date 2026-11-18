// Exam-specific strategy guide (from the exam pack's strategy.json).
import { Page, useExam, Rich, Empty } from '../components/ui.jsx';
import { Card, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export default function Strategy() {
  const { exam, base } = useExam();
  const s = exam.strategy;
  if (!s) return <Page title="Strategy" base={base} back={base + 'notes'}><Empty>No strategy guide in this exam pack.</Empty></Page>;
  return (
    <Page title={s.title} sub={exam.title} back={base + 'notes'} base={base}>
      <Card><p className="m-0">{s.intro}</p></Card>
      {s.sections.map((sec) => (
        <Card className="notes" key={sec.heading}>
          <CardTitle>{sec.heading}</CardTitle>
          {sec.table && (
            <Table>
              <TableHeader><TableRow>{sec.table[0].map((h, i) => <TableHead key={h} className={cn(i && 'text-right')}>{h}</TableHead>)}</TableRow></TableHeader>
              <TableBody>{sec.table.slice(1).map((r) => (
                <TableRow key={r[0]}>{r.map((c, i) => <TableCell key={i} className={cn(i && 'text-right tabular-nums')}>{i === 2 ? <b>{c}</b> : c}</TableCell>)}</TableRow>
              ))}</TableBody>
            </Table>
          )}
          <ul className="m-0">{sec.items.map((it, i) => <li key={i}><Rich text={it} /></li>)}</ul>
        </Card>
      ))}
    </Page>
  );
}
