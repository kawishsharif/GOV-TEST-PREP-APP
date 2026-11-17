// Routes. Each exam pack lives under /x/:examId/... so more exams can be added later.
import { lazy, Suspense, useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet, useParams } from 'react-router-dom';
import { loadExam } from './lib/bank.js';
import { global, saveGlobal } from './lib/store.js';
import { ExamContext, ToastProvider, useStoreVersion } from './components/ui.jsx';

const Home = lazy(() => import('./views/Home.jsx'));
const Dashboard = lazy(() => import('./views/Dashboard.jsx'));
const Settings = lazy(() => import('./views/Settings.jsx'));
const Practice = lazy(() => import('./views/Practice.jsx'));
const Quiz = lazy(() => import('./views/Quiz.jsx'));
const More = lazy(() => import('./views/More.jsx'));
const Mock = lazy(() => import('./views/Mock.jsx'));
const MockRun = lazy(() => import('./views/MockRun.jsx'));
const Result = lazy(() => import('./views/Result.jsx'));
const Placeholder = lazy(() => import('./views/Placeholder.jsx'));

const Loading = () => <main><p className="muted" style={{ textAlign: 'center', paddingTop: '30vh' }}>Loading…</p></main>;

function applyTheme() {
  const t = global.theme;
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
  const dark = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0f1f2a' : '#0b5675');
}

function ExamShell() {
  const { examId } = useParams();
  const [state, setState] = useState({ exam: null, error: null });
  useEffect(() => {
    let live = true;
    setState({ exam: null, error: null });
    loadExam(examId)
      .then((exam) => {
        if (!live) return;
        if (global.lastExam !== exam.id) { global.lastExam = exam.id; saveGlobal(); }
        setState({ exam, error: null });
      })
      .catch((error) => live && setState({ exam: null, error }));
    return () => { live = false; };
  }, [examId]);
  if (state.error) return <main><div className="card"><h2>Could not load this exam pack</h2><p className="muted">{state.error.message}</p><a className="btn" href="#/">Back to exams</a></div></main>;
  if (!state.exam) return <Loading />;
  return (
    <ExamContext.Provider value={{ exam: state.exam, base: `/x/${state.exam.id}/` }}>
      <Suspense fallback={<Loading />}><Outlet /></Suspense>
    </ExamContext.Provider>
  );
}

function StartRedirect() {
  return global.lastExam ? <Navigate to={`/x/${global.lastExam}/dashboard`} replace /> : <Home />;
}

export default function App() {
  useStoreVersion();
  useEffect(() => {
    applyTheme();
    const mq = matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener?.('change', applyTheme);
    return () => mq.removeEventListener?.('change', applyTheme);
  });
  return (
    <ToastProvider>
      <HashRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<StartRedirect />} />
            <Route path="/exams" element={<Home />} />
            <Route path="/x/:examId" element={<ExamShell />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="settings" element={<Settings />} />
              <Route path="practice" element={<Practice />} />
              <Route path="quiz/*" element={<Quiz />} />
              <Route path="more" element={<More />} />
              <Route path="mock" element={<Mock />} />
              <Route path="mock/run" element={<MockRun />} />
              <Route path="result/:id" element={<Result />} />
              <Route path="*" element={<Placeholder />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </ToastProvider>
  );
}
