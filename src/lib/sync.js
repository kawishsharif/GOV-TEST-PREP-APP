// Google sign-in (Firebase Auth) + cloud sync of study progress (Cloud Firestore).
// Data lives at users/{uid}/exams/{examId}; Firestore security rules allow each user only their own documents.
// The app keeps working offline and without an account: localStorage stays the working copy, the cloud is the backup
// that is merged in on sign-in, when the app is opened or brought back, and uploaded a few seconds after changes.
import { savedListeners, loadedExamIds, getLoadedState, applyState } from './store.js';
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

// ---------- observable state for the UI ----------
let state = { status: SYNC_AVAILABLE ? 'loading' : 'unavailable', user: null, syncing: false, lastSync: null, error: null };
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
    return { auth: authMod.getAuth(app), db: fsMod.getFirestore(app), A: authMod, F: fsMod };
  })();
  return fbPromise;
}

const lastHash = {}; // examId -> hash of the last copy known to be in the cloud
const docRef = (fb, uid, examId) => fb.F.doc(fb.db, 'users', uid, 'exams', examId);

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
}

async function run(task) {
  if (!navigator.onLine) { set({ error: 'Offline — changes will sync when you are back online.' }); return; }
  set({ syncing: true, error: null });
  try {
    await task();
    set({ syncing: false, lastSync: Date.now() });
  } catch (e) {
    const code = e?.code || '';
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
        set({ status: 'signedIn', user: { uid: u.uid, name: u.displayName || u.email, email: u.email, photo: u.photoURL } });
        syncNow();
      } else {
        for (const k of Object.keys(lastHash)) delete lastHash[k];
        set({ status: 'signedOut', user: null, lastSync: null });
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
    set({ status: 'unavailable', error: 'Sign-in could not load. Check your connection and reload.' });
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
  // Upload the latest changes first so nothing is lost; data on this device is kept.
  await run(async () => { for (const id of loadedExamIds()) await push(id); });
  const fb = await firebase();
  await fb.A.signOut(fb.auth);
}
