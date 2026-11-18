// User management (admin only): list signed-in users, block or re-activate them.
// The database rules allow only the admin's verified account to read profiles or change a status.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Page, useToast, useConfirm, Empty, Chips } from '../components/ui.jsx';
import { useSync } from '../components/Account.jsx';
import { Icon } from '../components/Icon.jsx';

const fmt = (t) => (t ? new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const ago = (t) => {
  if (!t) return '—';
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d} d ago` : fmt(t);
};

export default function Admin() {
  const s = useSync();
  const toast = useToast();
  const [confirm, dialog] = useConfirm();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(null);
  const [mod, setMod] = useState(null);

  useEffect(() => { import('../lib/sync.js').then(setMod); }, []);
  const admin = mod && s.status === 'signedIn' && mod.isAdminUser(s.user);

  const load = async () => {
    setError(null);
    try { setUsers(await mod.listProfiles()); }
    catch (e) { setError((e?.code || '').includes('permission-denied') ? 'The database refused: this account is not the administrator.' : 'Could not load users. Check your connection and try again.'); }
  };
  useEffect(() => { if (admin) load(); }, [admin]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => ({
    all: users?.length || 0,
    active: users?.filter((u) => u.status !== 'blocked').length || 0,
    blocked: users?.filter((u) => u.status === 'blocked').length || 0,
  }), [users]);
  const shown = (users || []).filter((u) =>
    (filter === 'all' || (filter === 'blocked' ? u.status === 'blocked' : u.status !== 'blocked'))
    && (!q.trim() || `${u.name} ${u.email}`.toLowerCase().includes(q.trim().toLowerCase())));

  const change = async (u, status) => {
    if (status === 'blocked' && !await confirm({
      title: `Block ${u.name || u.email}?`,
      body: 'They will be signed out on their next sync and can no longer sign in or sync progress. You can activate them again at any time.',
      ok: 'Block', danger: true,
    })) return;
    setBusy(u.id);
    try {
      await mod.setUserStatus(u.id, status);
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, status, statusChangedAt: Date.now() } : x)));
      toast(status === 'blocked' ? `${u.name || u.email} blocked` : `${u.name || u.email} activated`);
    } catch (e) {
      toast((e?.code || '').includes('permission-denied') ? 'Not allowed by the database rules.' : 'Could not update. Try again.', 4000);
    } finally { setBusy(null); }
  };

  let body;
  if (!mod || s.status === 'loading') body = <p className="muted">Loading…</p>;
  else if (s.status !== 'signedIn') body = <Empty>Sign in with the administrator's Google account to manage users. <Link to="/exams">Go to sign-in</Link></Empty>;
  else if (!admin) body = <Empty>This page is only for the administrator.</Empty>;
  else body = (
    <>
      <div className="grid3" style={{ marginBottom: 14 }}>
        <div className="stat"><b>{counts.all}</b><span>users</span></div>
        <div className="stat"><b style={{ color: 'var(--good)' }}>{counts.active}</b><span>active</span></div>
        <div className="stat"><b style={{ color: 'var(--bad)' }}>{counts.blocked}</b><span>blocked</span></div>
      </div>
      <section className="card">
        <label className="field" style={{ marginBottom: 10 }}><span>Search by name or email</span>
          <input id="admin-search" type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. ali or @gmail.com" />
        </label>
        <div className="row between wrap">
          <Chips value={filter} onChange={setFilter} items={[['all', 'All', counts.all], ['active', 'Active', counts.active], ['blocked', 'Blocked', counts.blocked]]} />
          <button className="btn sm ghost" onClick={load}><Icon name="repeat" /> Refresh</button>
        </div>
      </section>
      {error && <section className="card" style={{ borderColor: 'var(--bad)' }}><p style={{ margin: 0 }}>{error}</p></section>}
      {users && !shown.length && <Empty>No users match.</Empty>}
      {!users && !error && <p className="muted">Loading users…</p>}
      {shown.length > 0 && (
        <section className="card" style={{ paddingTop: 4, paddingBottom: 4 }}>
          <ul className="list">
            {shown.map((u) => {
              const blocked = u.status === 'blocked';
              const self = u.id === s.user.uid;
              return (
                <li key={u.id} className="user-row">
                  {u.photo ? <img className="avatar" src={u.photo} alt="" referrerPolicy="no-referrer" /> : <span className="avatar">{(u.name || u.email || '?')[0].toUpperCase()}</span>}
                  <div className="grow">
                    <div className="row wrap" style={{ gap: 6 }}>
                      <b>{u.name || '(no name)'}</b>
                      <span className={`tag ${blocked ? 'blocked' : 'active'}`}>{blocked ? 'Blocked' : 'Active'}</span>
                      {self && <span className="tag">You (admin)</span>}
                    </div>
                    <small className="muted" style={{ display: 'block', wordBreak: 'break-all' }}>{u.email}</small>
                    <small className="muted" style={{ display: 'block' }}>
                      Joined {fmt(u.createdAt)} · Active {ago(u.lastSeen)}{u.answered != null ? ` · ${u.answered} questions` : ''}{u.mocks ? ` · ${u.mocks} mocks` : ''}
                    </small>
                  </div>
                  {!self && (
                    <button className={`btn sm ${blocked ? 'primary' : 'danger'}`} disabled={busy === u.id} onClick={() => change(u, blocked ? 'active' : 'blocked')}>
                      {busy === u.id ? '…' : blocked ? 'Activate' : 'Block'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <p className="muted" style={{ fontSize: '.8rem' }}>Users appear here after they sign in with Google. A blocked user is signed out at their next sync and cannot sign in or sync again until activated.</p>
    </>
  );

  return (
    <Page title="User management" sub="Admin" back="/exams" tabs={false}>
      {dialog}
      {body}
    </Page>
  );
}
