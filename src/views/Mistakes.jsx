// Mistake notebook: every wrong answer; leaves only after two correct answers on different days.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Page, useExam, Rich, Empty } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { questionById } from '../lib/bank.js';

export default function Mistakes() {
  const { exam, st, base } = useExam();
  const [open, setOpen] = useState(null);
  const items = Object.entries(st.mistakes).map(([id, m]) => ({ id, m, q: questionById(exam, st, id) })).filter((x) => x.q);
  const byTopic = {};
  for (const x of items) (byTopic[x.q.topic] ||= []).push(x);
  return (
    <Page title="Mistake notebook" sub={`${items.length} to fix · ${st.cleared || 0} cleared`} back={base + 'more'} base={base}>
      <section className="card">
        <p className="muted" style={{ marginTop: 0, fontSize: '.9rem' }}>Every question you get wrong lands here. It leaves only after you answer it correctly on <b>two different days</b>; a wrong answer in between resets the count.</p>
        {items.length > 0 && <Link className="btn primary block" to={base + 'quiz/mistakes'}><Icon name="repeat" /> Re-attempt my mistakes</Link>}
      </section>
      {!items.length && <Empty>No mistakes saved. Practise or take a mock — wrong answers are collected automatically.</Empty>}
      {Object.entries(byTopic).sort((a, b) => b[1].length - a[1].length).map(([t, list]) => (
        <div key={t}>
          <div className="row between" style={{ margin: '20px 4px 8px' }}>
            <span className="sec-title" style={{ margin: 0 }}>{exam.topicIndex[t]?.name} · {list.length}</span>
            <Link className="btn sm" to={`${base}quiz/mistakes/${t}`}>Retry topic</Link>
          </div>
          <section className="card"><ul className="list">
            {list.map(({ id, m, q }) => (
              <li key={id}>
                <button className="list-link" onClick={() => setOpen(open === id ? null : id)} aria-expanded={open === id}>
                  <div className="grow"><Rich text={q.q} /><small className="muted">Wrong {m.wrong}× · correct days {m.rights.length}/2</small></div>
                  <Icon name="chev" className="chev" />
                </button>
                {open === id && (
                  <div className="explain" style={{ marginTop: 0, marginBottom: 12 }}>
                    <p style={{ margin: '0 0 6px' }}>Answer: <b><Rich text={q.options[q.answer]} /></b></p>
                    {q.solution ? <ol>{q.solution.map((s, i) => <li key={i}><Rich text={s} /></li>)}</ol> : <p style={{ margin: 0 }}><Rich text={q.explanation} /></p>}
                  </div>
                )}
              </li>
            ))}
          </ul></section>
        </div>
      ))}
    </Page>
  );
}
