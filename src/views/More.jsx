// "More" tab: everything that is not on the bottom bar.
import { Link } from 'react-router-dom';
import { Page, useExam } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';

const Item = ({ to, icon, title, sub }) => (
  <li><Link className="list-link" to={to}><Icon name={icon} /><div className="grow"><b>{title}</b><small className="muted">{sub}</small></div><Icon name="chev" className="chev" /></Link></li>
);

export default function More() {
  const { exam, st, base } = useExam();
  const m = Object.keys(st.mistakes).length;
  return (
    <Page title="More" sub={exam.title} base={base}>
      <section className="card"><ul className="list">
        <Item to={base + 'mistakes'} icon="repeat" title="Mistake notebook" sub={`${m} question${m === 1 ? '' : 's'} to fix`} />
        <Item to={base + 'flashcards'} icon="cards" title="Flashcards" sub="Spaced repetition: formulas, facts, definitions" />
        <Item to={base + 'quiz/numerical'} icon="calc" title="Numerical drill" sub="Calculation practice with worked steps" />
        <Item to={base + 'planner'} icon="calendar" title="Study planner" sub="Day-by-day plan to your test date" />
        <Item to={base + 'progress'} icon="chart" title="Progress history" sub="Mock scores and daily accuracy over time" />
        <Item to={base + 'formulas'} icon="printer" title="Formula sheet" sub="Every Electrical formula on one printable page" />
        <Item to={base + 'ai'} icon="sparkle" title="AI question generator" sub="Practise against fresh AI-written questions" />
      </ul></section>
      <section className="card"><ul className="list">
        <Item to={base + 'import'} icon="upload" title="Import questions (JSON)" sub="Add your own questions to the bank" />
        <Item to={base + 'settings'} icon="settings" title="Settings & backup" sub="Test date, pattern, weights, theme, export" />
        <Item to="/exams" icon="home" title="All exams" sub="Switch to another test prep" />
      </ul></section>
      <p className="muted" style={{ fontSize: '.8rem', textAlign: 'center' }}>Learn &amp; Lead is an independent study tool, not affiliated with WAPDA or CTS. Questions are practice items written in the style of past papers; none is claimed to be from a specific real paper unless it says so.</p>
    </Page>
  );
}
