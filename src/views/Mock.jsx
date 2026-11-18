// Mock test start screen: pattern, blueprint, history.
import { Link, useNavigate } from 'react-router-dom';
import { Page, useExam, useConfirm, Empty, LinkCard, SectionTitle, Stat, List, ListRow, Kbd, KeyHints } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { buildMock, mockBlueprint, rankBand } from '../lib/mock.js';
import { save } from '../lib/store.js';
import { fmtDay, fmtDuration } from '../lib/util.js';

export default function Mock() {
  const { exam, st, base } = useExam();
  const nav = useNavigate();
  const [confirm, dialog] = useConfirm();
  const s = st.settings;
  const bp = mockBlueprint(exam, st);
  const active = st.activeMock && !st.activeMock.submitted;

  const start = async () => {
    if (!await confirm({
      title: 'Start full mock test?',
      body: `${s.totalQuestions} questions · ${s.minutes} minutes · ${s.negativeMarking ? `−${s.negativeValue} per wrong answer` : 'no negative marking'}. The timer keeps running if you leave the app, and the test auto-submits at time-up. You cannot change answers after submitting.`,
      ok: 'Start now',
    })) return;
    st.activeMock = buildMock(exam, st);
    save(exam.id);
    nav(base + 'mock/run');
  };

  return (
    <Page title="Full mock test" sub="CTS-style simulation" base={base}>
      {dialog}
      {active && <LinkCard to={base + 'mock/run'} icon="mock" tone="warning" title="Resume mock in progress" sub="The timer is still running." />}
      <Card>
        <div className="grid grid-cols-3 gap-2.5">
          <Stat value={s.totalQuestions} label="questions" />
          <Stat value={s.minutes} label="minutes" />
          <Stat value={s.negativeMarking ? `−${s.negativeValue}` : 'None'} label="negative marking" />
        </div>
        <p className="m-0 text-sm text-muted-foreground">{exam.pattern.note} Change the pattern in <Link to={base + 'settings'}>Settings</Link>.</p>
        <Button variant="default" className="w-full" onClick={start} disabled={active}><Icon name="bolt" /> {active ? 'A mock is already running' : 'Start mock test'}</Button>
        <KeyHints className="m-0">Keyboard: <Kbd>1</Kbd>–<Kbd>4</Kbd> answer · <Kbd>F</Kbd> flag · <Kbd>N</Kbd>/<Kbd>P</Kbd> next/previous</KeyHints>
      </Card>

      <SectionTitle>Paper blueprint</SectionTitle>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Section</TableHead><TableHead className="text-right">Weight</TableHead><TableHead className="text-right">Qs</TableHead></TableRow></TableHeader>
          <TableBody>
            {bp.map((sec) => (
              <TableRow key={sec.id}>
                <TableCell className="min-w-0 whitespace-normal">{sec.name}<small className="block text-xs text-muted-foreground">{sec.topics.filter((t) => t.count).map((t) => `${t.name} ${t.count}`).join(' · ')}</small></TableCell>
                <TableCell className="text-right tabular-nums">{sec.weight}%</TableCell>
                <TableCell className="text-right tabular-nums"><b>{sec.count}</b></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <SectionTitle>Past mocks</SectionTitle>
      {st.mocks.length ? (
        <Card className="py-2"><List>
          {[...st.mocks].reverse().map((m) => {
            const band = rankBand(m.pct, m.rules.passPercent);
            return (
              <ListRow key={m.id} to={`${base}result/${m.id}`}
                icon={null}
                title={<span className="flex items-center gap-3"><span className="w-16 shrink-0 rounded-lg bg-secondary py-1.5 text-center text-lg tabular-nums">{m.pct}%</span><span className="min-w-0">{band.label}</span></span>}
                sub={<span className="block pl-19">{fmtDay(m.day, { day: 'numeric', month: 'short', year: 'numeric' })} · {m.correct}/{m.total} correct · {fmtDuration(m.timeUsed)}{m.auto ? ' · auto-submitted' : ''}</span>} />
            );
          })}
        </List></Card>
      ) : <Empty>No mock tests yet. Take your first one to get a baseline score.</Empty>}
    </Page>
  );
}
