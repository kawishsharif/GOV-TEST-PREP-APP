// Google sign-in (Firebase Auth) + cloud sync of study progress (Cloud Firestore).
// Data lives at users/{uid}/exams/{examId}; Firestore security rules allow each user only their own documents.
// The app keeps working offline and without an account: localStorage stays the working copy, the cloud is the backup
// that is merged in on sign-in, when the app is opened or brought back, and uploaded a few seconds after changes.
import { savedListeners, loadedExamIds, getLoadedState, applyState, clearDeviceData } from './store.js';
import { mergeState, cloudCopy } from './merge.js';
import { hash, debounce } from './util.js';

// Public web config (identifies the Firebase project; access is controlled by the security rules).
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCTWXXm_jqUhief895Xmnj1x3ngjObflVM',
  authDomain: 'learn-and-lead-c90bb.firebaseapp.com',
  projectId: 'learn-and-lead-c90bb',
  storageBucket: 'learn-and-lead-c90bb.firebasestorage.app',
  messagingSenderId: '1012141503527',
  appId: '1:1012141503527:web:b48ed44a47bd4ec736ca02',
};

export const SYNC_AVAILABLE = import.meta.env.VITE_TARGET !== 'artifact';
// Shown the Admin page in the app. The real check is in firestore.rules (verified token email).
export const ADMIN_EMAIL = 'engrkawish22@gmail.com';
export const isAdminUser = (u) => !!u && (u.email || '').toLowerCase() === ADMIN_EMAIL;

// ---------- observable state for the UI ----------
let state = { status: SYNC_AVAILABLE ? 'loading' : 'unavailable', user: null, syncing: false, lastSync: null, error: null, blocked: false };
const listeners = new Set();
const set = (patch) => { state = { ...state, ...patch }; listeners.forEach((f) => f()); };
export const subscribeSync = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const getSyncState = () => state;

// ---------- Firebase (loaded lazily) ----------
let fbPromise = null;
function firebase() {
  fbPromise ||= (async () => {
    const [appMod, authMod, fsMod] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore/lite')]);
    const app = appMod.initializeApp(FIREBASE_CONFIG);
    const auth = authMod.getAuth(app), db = fsMod.getFirestore(app);
    if (import.meta.env.VITE_FIREBASE_EMULATOR) { // local test builds only
      authMod.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      fsMod.connectFirestoreEmulator(db, '127.0.0.1', 8085);
      window.__testSignIn = (email, name) => authMod.signInWithCredential(auth, authMod.GoogleAuthProvider.credential(
        JSON.stringify({ sub: email, email, name, email_verified: true })));
    }
    return { auth, db, A: authMod, F: fsMod };
  })();
  return fbPromise;
}

const lastHash = {}; // examId -> hash of the last copy known to be in the cloud
const docRef = (fb, uid, examId) => fb.F.doc(fb.db, 'users', uid, 'exams', examId);
const profileRef = (fb, uid) => fb.F.doc(fb.db, 'profiles', uid);

/** Activity summary shown to the admin (from the exams open on this device). */
function activity() {
  let answered = 0, mocks = 0;
  for (const id of loadedExamIds()) {
    const st = getLoadedState(id);
    answered += Object.values(st?.tstats || {}).reduce((a, t) => a + (t.n || 0), 0);
    mocks += (st?.mocks || []).length;
  }
  return loadedExamIds().length ? { answered, mocks } : {};
}

const ACCOUNT_KEY = 'learnlead:v1:account';
const rememberStatus = (uid, status) => { try { localStorage.setItem(ACCOUNT_KEY, JSON.stringify({ uid, status, at: Date.now() })); } catch { /* ignore */ } };
const knownStatus = (uid) => { try { const a = JSON.parse(localStorage.getItem(ACCOUNT_KEY) || 'null'); return a && a.uid === uid ? a.status : null; } catch { return null; } };

let profileTouched = 0;
/** Create or refresh this user's profile. Returns 'active' or 'blocked'. */
async function ensureProfile(fb, u, force = false) {
  const ref = profileRef(fb, u.uid);
  const snap = await fb.F.getDoc(ref);
  const now = Date.now();
  if (!snap.exists()) {
    await fb.F.setDoc(ref, { uid: u.uid, name: u.displayName || u.email, email: u.email, photo: u.photoURL || null, status: 'active', createdAt: now, lastSeen: now, ...activity() });
    profileTouched = now;
    rememberStatus(u.uid, 'active');
    return 'active';
  }
  if (snap.data().status === 'blocked') { rememberStatus(u.uid, 'blocked'); return 'blocked'; }
  rememberStatus(u.uid, 'active');
  if (force || now - profileTouched > 10 * 60000) {
    await fb.F.updateDoc(ref, { name: u.displayName || u.email, photo: u.photoURL || null, lastSeen: now, ...activity() });
    profileTouched = now;
  }
  return 'active';
}

/** Sign out a user the admin has blocked, and remember why for the account card. */
async function handleBlocked(fb) {
  blockedNow = true;
  await fb.A.signOut(fb.auth).catch(() => {});
}
let blockedNow = false;

async function pullAndMerge(examId) {
  const fb = await firebase();
  const user = fb.auth.currentUser;
  const local = getLoadedState(examId);
  if (!user || !local) return;
  const snap = await fb.F.getDoc(docRef(fb, user.uid, examId));
  if (snap.exists()) {
    const remoteJson = snap.data().data;
    lastHash[examId] = hash(remoteJson);
    const merged = mergeState(local, JSON.parse(remoteJson));
    if (hash(JSON.stringify(cloudCopy(merged).data)) !== hash(JSON.stringify(cloudCopy(local).data))) applyState(examId, merged);
  }
  await push(examId);
}

async function push(examId) {
  const fb = await firebase();
  const user = fb.auth.currentUser;
  const st = getLoadedState(examId);
  if (!user || !st) return;
  const { json } = cloudCopy(st);
  const h = hash(json);
  if (lastHash[examId] === h) return;
  await fb.F.setDoc(docRef(fb, user.uid, examId), { data: json, updatedAt: Date.now(), app: 'learn-and-lead', v: 1 });
  lastHash[examId] = h;
  ensureProfile(fb, user).catch(() => {});
}

async function run(task) {
  if (!navigator.onLine) { set({ error: 'Offline — changes will sync when you are back online.' }); return; }
  set({ syncing: true, error: null });
  try {
    await task();
    set({ syncing: false, lastSync: Date.now() });
  } catch (e) {
    const code = e?.code || '';
    if (code.includes('permission-denied')) {
      try {
        const fb = await firebase();
        if (fb.auth.currentUser && (await ensureProfile(fb, fb.auth.currentUser)) === 'blocked') { set({ syncing: false }); await handleBlocked(fb); return; }
      } catch { /* fall through to the message below */ }
    }
    set({
      syncing: false,
      error: code.includes('permission-denied')
        ? 'Sync was refused by the database rules. Publish the Firestore rules (see Settings → Account & sync).'
        : 'Could not sync right now. Your progress is safe on this device and will sync later.',
    });
    console.warn('sync failed', e);
  }
}

/** Download, merge and upload every exam that is open on this device. */
export const syncNow = () => run(async () => { for (const id of loadedExamIds()) await pullAndMerge(id); });

const pushSoon = debounce(() => {
  if (state.status === 'signedIn') run(async () => { for (const id of loadedExamIds()) await push(id); });
}, 4000);

// ---------- lifecycle ----------
let started = false;
export async function initSync() {
  if (!SYNC_AVAILABLE || started) return;
  started = true;
  try {
    const fb = await firebase();
    fb.A.getRedirectResult(fb.auth).catch(() => {});
    fb.A.onAuthStateChanged(fb.auth, (u) => {
      if (u) {
        const user = { uid: u.uid, name: u.displayName || u.email, email: u.email, photo: u.photoURL };
        const allow = () => { set({ status: 'signedIn', blocked: false, user }); syncNow(); };
        if (knownStatus(u.uid) === 'active') allow(); // returning user: open at once, re-check in the background
        else set({ status: 'checking', user });
        ensureProfile(fb, u, true)
          .then((s) => (s === 'blocked' ? handleBlocked(fb) : state.status !== 'signedIn' && allow()))
          .catch(() => { if (knownStatus(u.uid) === 'blocked') handleBlocked(fb); else if (state.status !== 'signedIn') allow(); });
      } else {
        for (const k of Object.keys(lastHash)) delete lastHash[k];
        set({ status: 'signedOut', user: null, lastSync: null, blocked: blockedNow });
        blockedNow = false;
      }
    });
    savedListeners.add(() => pushSoon());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && state.status === 'signedIn') syncNow();
      if (document.visibilityState === 'hidden' && state.status === 'signedIn') run(async () => { for (const id of loadedExamIds()) await push(id); });
    });
    addEventListener('online', () => { if (state.status === 'signedIn') syncNow(); });
  } catch (e) {
    console.warn('sign-in unavailable', e);
    set({ status: 'unavailable', error: 'Sign-in could not load. Check your internet connection and try again.' });
  }
}

/** Called when an exam's progress is loaded, so a newly opened exam is merged with its cloud copy. */
export function examOpened() {
  if (state.status === 'signedIn') syncNow();
}

export async function signIn() {
  const fb = await firebase();
  const provider = new fb.A.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await fb.A.signInWithPopup(fb.auth, provider);
  } catch (e) {
    const code = e?.code || '';
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      await fb.A.signInWithRedirect(fb.auth, provider);
      return;
    }
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
    if (code === 'auth/network-request-failed') throw new Error('Could not reach Google sign-in. Check your internet connection and try again.');
    if (code === 'auth/internal-error' && !navigator.onLine) throw new Error('You are offline. Connect to the internet to sign in.');
    if (code === 'auth/unauthorized-domain') throw new Error('This website address is not allowed to sign in yet. Add it under Firebase → Authentication → Settings → Authorized domains.');
    throw new Error(e?.message || 'Sign-in failed. Try again.');
  }
}

export async function signOutUser() {
  if (!navigator.onLine) throw new Error('Connect to the internet before signing out, so your latest progress is saved to your account first.');
  set({ syncing: true, error: null });
  try {
    for (const id of loadedExamIds()) await push(id);
  } catch {
    set({ syncing: false });
    throw new Error('Could not save your latest progress, so you were not signed out. Try again in a moment.');
  }
  set({ syncing: false });
  const fb = await firebase();
  await fb.A.signOut(fb.auth);
  try { localStorage.removeItem(ACCOUNT_KEY); } catch { /* ignore */ }
  clearDeviceData(); // progress is in the account; the next person on this device starts clean
}

// ---------- admin (user management) ----------
/** All user profiles, most recently active first. Only the admin account is allowed to read these. */
export async function listProfiles() {
  const fb = await firebase();
  const q = fb.F.query(fb.F.collection(fb.db, 'profiles'), fb.F.orderBy('lastSeen', 'desc'), fb.F.limit(1000));
  const snap = await fb.F.getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Block or re-activate a user (admin only; enforced by the database rules). */
export async function setUserStatus(uid, status) {
  const fb = await firebase();
  await fb.F.updateDoc(profileRef(fb, uid), { status, statusChangedAt: Date.now() });
}
