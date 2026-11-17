// Progress history: mock scores and daily practice accuracy over time, plus a table view.
import { Page, useExam, Empty } from '../components/ui.jsx';
import { LineChart } from '../components/LineChart.jsx';
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
          <section className="card">
            <h2>Scores over time</h2>
            <LineChart series={series} refLine={st.settings.passPercent} refLabel="pass" />
          </section>
          <div className="grid3" style={{ marginBottom: 14 }}>
            <div className="stat"><b>{totalQs}</b><span>questions answered</span></div>
            <div className="stat"><b>{h.practice.length}</b><span>study days</span></div>
            <div className="stat"><b>{h.mocks.length ? Math.max(...h.mocks.map((m) => m.pct)) + '%' : '—'}</b><span>best mock</span></div>
          </div>
          <section className="card">
            <h2>Table view</h2>
            <table className="simple">
              <thead><tr><th>Date</th><th className="num">Questions</th><th className="num">Practice</th><th className="num">Mock</th></tr></thead>
              <tbody>{[...new Set([...h.practice.map((p) => p.d), ...Object.keys(mockByDay)])].sort().reverse().map((d) => {
                const p = h.practice.find((x) => x.d === d);
                return <tr key={d}><td>{fmtDay(d, { day: 'numeric', month: 'short' })}</td><td className="num">{p?.n ?? '—'}</td><td className="num">{p ? p.pct + '%' : '—'}</td><td className="num">{mockByDay[d] != null ? <b>{mockByDay[d]}%</b> : '—'}</td></tr>;
              })}</tbody>
            </table>
          </section>
        </>
      ) : <Empty>No history yet. Practise or take a mock and your progress will appear here.</Empty>}
    </Page>
  );
}
