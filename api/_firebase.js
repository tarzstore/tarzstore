// /api/_firebase.js
// Firebase Admin SDK (server). Dipakai untuk:
//  - memverifikasi ID token login pembeli (siapa yang membeli)
//  - mengambil access token service account untuk menulis Firestore lewat REST
//    (lihat _vip.js). REST dipakai, bukan gRPC, karena koneksi gRPC Firestore di
//    serverless Vercel bisa menggantung sampai fungsi timeout.
//
// ENV WAJIB di Vercel:
//   FIREBASE_SERVICE_ACCOUNT = isi file JSON service account (satu baris penuh)
// Dependency: npm i firebase-admin

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let _sa = null;
let _cred = null;

function loadServiceAccount() {
  if (_sa) return _sa;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT belum di-set');
  const sa = JSON.parse(raw);
  if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, '\n');
  _sa = sa;
  return _sa;
}

function init() {
  if (getApps().length) return;
  _cred = cert(loadServiceAccount());
  initializeApp({ credential: _cred });
}

// Access token + project id untuk memanggil Firestore REST API.
export async function getFirestoreAccess() {
  const sa = loadServiceAccount();
  if (!_cred) _cred = cert(sa);
  const t = await _cred.getAccessToken();
  return { token: t.access_token, projectId: sa.project_id };
}

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
