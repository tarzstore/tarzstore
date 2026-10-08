// /api/_firebase.js
// Firebase Admin SDK (server). Dipakai untuk:
//  - memverifikasi ID token login pembeli (siapa yang membeli)
//  - menulis status VIP ke Firestore vip_users/{uid} (Admin SDK kebal rules,
//    sehingga rules bisa dibuat ketat: browser TIDAK boleh menulis VIP sendiri)
//
// ENV WAJIB di Vercel:
//   FIREBASE_SERVICE_ACCOUNT = isi file JSON service account (satu baris penuh)
//   (Firebase Console > Project settings > Service accounts > Generate new private key)
// Dependency: npm i firebase-admin

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

function init() {
  if (getApps().length) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT belum di-set');
  const sa = JSON.parse(raw);
  if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, '\n');
  initializeApp({ credential: cert(sa) });
}

export function adminDb() { init(); return getFirestore(); }

// Baca header "Authorization: Bearer <idToken>" -> { uid, email } atau null.
export async function verifyRequestUser(req) {
  try {
    init();
    const h = req.headers['authorization'] || '';
    const m = /^Bearer\s+(.+)$/i.exec(Array.isArray(h) ? h[0] : h);
    if (!m) return null;
    const decoded = await getAuth().verifyIdToken(m[1]);
    return { uid: decoded.uid, email: decoded.email || null };
  } catch (e) {
    console.error('verifyRequestUser gagal:', e && e.message);
    return null;
  }
}

export { FieldValue };
