// User management (admin only): list signed-in users, block or re-activate them.
// The database rules allow only the admin's verified account to read profiles or change a status.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Page, useToast, useConfirm, Empty, Chips, Stat, List, LoadingCards } from '../components/ui.jsx';
import { useSync, Avatar } from '../components/Account.jsx';
import { Icon } from '../components/Icon.jsx';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/label';

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
  if (!mod || s.status === 'loading') body = <LoadingCards count={2} />;
  else if (s.status !== 'signedIn') body = <Empty>Sign in with the administrator's Google account to manage users. <Link to="/exams">Go to sign-in</Link></Empty>;
  else if (!admin) body = <Empty>This page is only for the administrator.</Empty>;
  else body = (
    <>
      <div className="mb-4 grid grid-cols-3 gap-2.5">
        <Stat value={counts.all} label="users" />
        <Stat value={counts.active} tone="success" label="active" />
        <Stat value={counts.blocked} tone="destructive" label="blocked" />
      </div>
      <Card>
        <Field label="Search by name or email" className="mb-0">
          <div className="relative">
            <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="admin-search" type="search" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. ali or @gmail.com" />
          </div>
        </Field>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Chips value={filter} onChange={setFilter} items={[['all', 'All', counts.all], ['active', 'Active', counts.active], ['blocked', 'Blocked', counts.blocked]]} />
          <Button size="sm" variant="ghost" onClick={load}><Icon name="refresh" /> Refresh</Button>
        </div>
      </Card>
      {error && <Card className="border-destructive" role="alert"><p className="m-0 flex items-center gap-2"><Icon name="alert" className="text-destructive" />{error}</p></Card>}
      {users && !shown.length && <Empty>No users match.</Empty>}
      {!users && !error && <LoadingCards count={1} />}
      {shown.length > 0 && (
        <Card className="py-1">
          <List>
            {shown.map((u) => {
              const blocked = u.status === 'blocked';
              const self = u.id === s.user.uid;
              return (
                <li key={u.id} className="user-row flex items-center gap-3 py-3">
                  <Avatar photo={u.photo} name={u.name || u.email} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <b className="min-w-0 break-words">{u.name || '(no name)'}</b>
                      <Badge variant={blocked ? 'destructive' : 'success'}>{blocked ? 'Blocked' : 'Active'}</Badge>
                      {self && <Badge>You (admin)</Badge>}
                    </div>
                    <small className="block text-sm break-all text-muted-foreground">{u.email}</small>
                    <small className="block text-xs text-muted-foreground">
                      Joined {fmt(u.createdAt)} · Active {ago(u.lastSeen)}{u.answered != null ? ` · ${u.answered} questions` : ''}{u.mocks ? ` · ${u.mocks} mocks` : ''}
                    </small>
                  </div>
                  {!self && (
                    <Button size="sm" variant={blocked ? 'default' : 'destructive'} disabled={busy === u.id} onClick={() => change(u, blocked ? 'active' : 'blocked')}>
                      {busy === u.id ? <Icon name="loader" /> : blocked ? 'Activate' : 'Block'}
                    </Button>
                  )}
                </li>
              );
            })}
          </List>
        </Card>
      )}
      <p className="px-1 text-xs text-muted-foreground">Users appear here after they sign in with Google. A blocked user is signed out at their next sync and cannot sign in or sync again until activated.</p>
    </>
  );

  return (
    <Page title="User management" sub="Admin" back="/exams" tabs={false}>
      {dialog}
      {body}
    </Page>
  );
}
