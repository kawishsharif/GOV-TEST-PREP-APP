// Merge two copies of one exam's progress (this device + the cloud copy) without losing work done on either.
// Pure functions: no storage, no network. Used by sync.js.

const LOG_SYNC_CAP = 3000; // attempt-log entries kept in the cloud copy (stats are kept in full)

const newer = (a, b) => ((a?.updatedAt || 0) >= (b?.updatedAt || 0) ? a : b);
const byId = (lists) => {
  const m = new Map();
  for (const list of lists) for (const x of list || []) if (x && x.id && !m.has(x.id)) m.set(x.id, x);
  return [...m.values()];
};

/** Per-key merge of two plain objects using `pick(a, b)` when both sides have the key. */
function mergeMap(a = {}, b = {}, pick) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = k in a ? pick(a[k], v) : v;
  return out;
}

export function mergeState(local, remote) {
  if (!remote) return local;
  if (!local) return remote;
  const recent = newer(local, remote);
  const qstats = mergeMap(local.qstats, remote.qstats, (x, y) => (y.n > x.n || (y.n === x.n && (y.last || 0) > (x.last || 0)) ? y : x));

  // Mistakes: keep a mistake unless the side without it has more recent activity on that question
  // (meaning it was cleared there).
  const mistakes = {};
  const ids = new Set([...Object.keys(local.mistakes || {}), ...Object.keys(remote.mistakes || {})]);
  const lastOn = (side, id) => side.qstats?.[id]?.last || 0;
  for (const id of ids) {
    const a = local.mistakes?.[id], b = remote.mistakes?.[id];
    if (a && b) mistakes[id] = lastOn(remote, id) > lastOn(local, id) ? b : a;
    else if (a) { if (!(lastOn(remote, id) > lastOn(local, id))) mistakes[id] = a; }
    else if (b) { if (!(lastOn(local, id) > lastOn(remote, id))) mistakes[id] = b; }
  }

  const logKey = (e) => `${e.t}|${e.q}`;
  const seen = new Set();
  const log = [...(local.log || []), ...(remote.log || [])]
    .filter((e) => e && !seen.has(logKey(e)) && seen.add(logKey(e)))
    .sort((x, y) => x.t - y.t);

  const plan = local.plan || remote.plan
    ? { ...(newer(local, remote).plan || local.plan || remote.plan), done: { ...(remote.plan?.done || {}), ...(local.plan?.done || {}) } }
    : null;

  return {
    ...recent,
    v: 1,
    settings: { ...(recent === local ? remote.settings : local.settings), ...recent.settings },
    qstats,
    tstats: mergeMap(local.tstats, remote.tstats, (x, y) => (y.n > x.n ? y : x)),
    daily: mergeMap(local.daily, remote.daily, (x, y) => (y.n > x.n ? y : x)),
    mistakes,
    cleared: Math.max(local.cleared || 0, remote.cleared || 0),
    srs: mergeMap(local.srs, remote.srs, (x, y) => ((y.reps || 0) > (x.reps || 0) || ((y.reps || 0) === (x.reps || 0) && (y.due || 0) > (x.due || 0)) ? y : x)),
    srsMeta: local.srsMeta?.day === remote.srsMeta?.day
      ? { day: local.srsMeta?.day, newCount: Math.max(local.srsMeta?.newCount || 0, remote.srsMeta?.newCount || 0) }
      : [local.srsMeta, remote.srsMeta].filter(Boolean).sort((x, y) => (x.day < y.day ? 1 : -1))[0] || null,
    mocks: byId([local.mocks, remote.mocks]).sort((x, y) => (x.finished || 0) - (y.finished || 0)),
    plan,
    custom: byId([local.custom, remote.custom]),
    ai: byId([local.ai, remote.ai]),
    log: log.slice(-25000),
    // Unfinished sessions stay on the device they were started on.
    activeMock: local.activeMock ?? null,
    activePractice: local.activePractice ?? null,
    updatedAt: Math.max(local.updatedAt || 0, remote.updatedAt || 0),
  };
}

/** The copy that goes to the cloud: no unfinished sessions, a capped attempt log, and kept under ~900 KB. */
export function cloudCopy(st) {
  // eslint-disable-next-line no-unused-vars
  const { activeMock, activePractice, ...rest } = st;
  let out = { ...rest, log: (st.log || []).slice(-LOG_SYNC_CAP) };
  let json = JSON.stringify(out);
  if (json.length > 900000) { out = { ...out, log: out.log.slice(-300), ai: (out.ai || []).slice(-300) }; json = JSON.stringify(out); }
  if (json.length > 900000) { out = { ...out, mocks: out.mocks.map((m, i, a) => (i < a.length - 15 ? { ...m, qs: [] } : m)) }; json = JSON.stringify(out); }
  return { data: out, json };
}
