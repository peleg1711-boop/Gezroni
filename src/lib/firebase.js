// Gezroni — shared Firebase client (CDN ES modules, no bundler).
// Web API key is safe for browser use; Firestore security rules enforce access control.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut, onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, addDoc, deleteDoc,
  query, where, serverTimestamp, arrayUnion, arrayRemove,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBpTl5IKtEI9ZmZ00NwgmVDBIQaQ3kXMUI',
  authDomain: 'gezroni-farm-board.firebaseapp.com',
  projectId: 'gezroni-farm-board',
  storageBucket: 'gezroni-farm-board.firebasestorage.app',
  messagingSenderId: '1072169923731',
  appId: '1:1072169923731:web:cb0b34554b296c33904966',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ── Auth ─────────────────────────────────────────────────────────────────────

export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser() {
  return auth.currentUser;
}

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, new GoogleAuthProvider());
  await ensureUserProfile(result.user);
  return result.user;
}

export function signOut() {
  return fbSignOut(auth);
}

// ── User profiles & roles ────────────────────────────────────────────────────
// Every signed-in user has a users/{uid} doc. Role starts as 'customer';
// only admins can change it (enforced by Firestore rules).

export async function ensureUserProfile(user) {
  if (!user) return null;
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();
  const profile = {
    role: 'customer',
    displayName: user.displayName || '',
    email: user.email || '',
    photoURL: user.photoURL || '',
    favorites: [],
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, profile);
  return profile;
}

export async function getUserProfile(uid) {
  if (!uid) return null;
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

// ── Farms ────────────────────────────────────────────────────────────────────

export async function fetchFarms() {
  const snap = await getDocs(collection(db, 'farms'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function fetchFarmByOwner(uid) {
  const q = query(collection(db, 'farms'), where('ownerUid', '==', uid));
  const snap = await getDocs(q);
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function updateFarm(farmId, fields) {
  await updateDoc(doc(db, 'farms', farmId), fields);
}

export async function createFarm(farmId, data) {
  await setDoc(doc(db, 'farms', farmId), data);
}

// ── Applications ─────────────────────────────────────────────────────────────

export async function submitApplication(data) {
  const user = auth.currentUser;
  if (!user) throw new Error('not-signed-in');
  const ref = await addDoc(collection(db, 'applications'), {
    ...data,
    applicantUid: user.uid,
    applicant_email: user.email || data.applicant_email || '',
    status: 'pending',
    created_at: new Date().toISOString(),
  });
  return ref.id;
}

export async function fetchApplications() {
  const snap = await getDocs(collection(db, 'applications'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function fetchMyApplications(uid) {
  const q = query(collection(db, 'applications'), where('applicantUid', '==', uid));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function reviewApplication(appId, fields) {
  await updateDoc(doc(db, 'applications', appId), fields);
}

export async function setUserRole(uid, role) {
  await updateDoc(doc(db, 'users', uid), { role });
}

// ── Favorites ────────────────────────────────────────────────────────────────

export async function addFavorite(farmId) {
  const user = auth.currentUser;
  if (!user) throw new Error('not-signed-in');
  await updateDoc(doc(db, 'users', user.uid), { favorites: arrayUnion(farmId) });
}

export async function removeFavorite(farmId) {
  const user = auth.currentUser;
  if (!user) throw new Error('not-signed-in');
  await updateDoc(doc(db, 'users', user.uid), { favorites: arrayRemove(farmId) });
}

export { db, auth, doc, getDoc, deleteDoc };
