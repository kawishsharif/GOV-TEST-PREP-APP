// Progress history: mock scores and daily practice accuracy over time, plus a table view.
import { Page, useExam, Empty, Stat } from '../components/ui.jsx';
import { LineChart } from '../components/LineChart.jsx';
import { Card, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { history } from '../lib/stats.js';
import { fmtDay } from '../lib/util.js';

export default function Progress() {
  const { exam, st, base } = useExam();
  const h = history(st);
  const mockByDay = {};
  for (const m of h.mocks) mockByDay[m.d] = m.pct; // last mock of a day
  const series = [
    { name: 'Mock score', color: 'var(--series-1)', points: Object.entries(mockByDay).map(([d, v]) => ({ d, v })) },
    { name: 'Daily practice accuracy', color: 'var(--series-2)', dashed: true, points: h.practice.map((p) => ({ d: p.d, v: p.pct, note: `${p.n} Qs` })) },
  ].filter((s) => s.points.length);
  const totalQs = h.practice.reduce((a, p) => a + p.n, 0);
  return (
    <Page title="Progress history" sub={exam.title} back={base + 'more'} base={base}>
      {series.length ? (
        <>
          <Card>
            <CardTitle>Scores over time</CardTitle>
            <LineChart series={series} refLine={st.settings.passPercent} refLabel="pass" />
          </Card>
          <div className="mb-4 grid grid-cols-3 gap-2.5">
            <Stat value={totalQs} label="questions answered" />
            <Stat value={h.practice.length} label="study days" />
            <Stat value={h.mocks.length ? Math.max(...h.mocks.map((m) => m.pct)) + '%' : '—'} label="best mock" />
          </div>
          <Card>
            <CardTitle>Table view</CardTitle>
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead className="text-right">Questions</TableHead><TableHead className="text-right">Practice</TableHead><TableHead className="text-right">Mock</TableHead></TableRow></TableHeader>
              <TableBody>{[...new Set([...h.practice.map((p) => p.d), ...Object.keys(mockByDay)])].sort().reverse().map((d) => {
                const p = h.practice.find((x) => x.d === d);
                return (
                  <TableRow key={d}>
                    <TableCell className="whitespace-nowrap">{fmtDay(d, { day: 'numeric', month: 'short' })}</TableCell>
                    <TableCell className="text-right tabular-nums">{p?.n ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{p ? p.pct + '%' : '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{mockByDay[d] != null ? <b>{mockByDay[d]}%</b> : '—'}</TableCell>
                  </TableRow>
                );
              })}</TableBody>
            </Table>
          </Card>
        </>
      ) : <Empty>No history yet. Practise or take a mock and your progress will appear here.</Empty>}
    </Page>
  );
}
