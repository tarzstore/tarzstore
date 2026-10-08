// /api/_vip.js
// Satu-satunya tempat yang menulis status VIP ke Firestore vip_users/{uid}.
// Memakai Firestore REST API (HTTPS biasa) dengan timeout 10 detik, sehingga kalau
// ada masalah (izin, jaringan) langsung muncul sebagai error yang jelas di Logs,
// bukan menggantung 5 menit.

import { getFirestoreAccess } from './_firebase.js';

const TIMEOUT_MS = 10000;

function docUrl(projectId, uid) {
  return 'https://firestore.googleapis.com/v1/projects/' + projectId +
    '/databases/(default)/documents/vip_users/' + encodeURIComponent(uid);
}

async function fsFetch(url, method, access, body) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      method,
      headers: { 'Authorization': 'Bearer ' + access.token, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal
    });
  } catch (e) {
    if (e && e.name === 'AbortError') throw new Error('Firestore timeout (>' + TIMEOUT_MS / 1000 + 's) ' + method);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// Nilai bertipe Firestore REST -> nilai JS biasa.
function val(f) {
  if (!f) return undefined;
  if ('booleanValue' in f) return f.booleanValue;
  if ('stringValue' in f) return f.stringValue;
  if ('timestampValue' in f) return f.timestampValue;
  if ('integerValue' in f) return Number(f.integerValue);
  if ('nullValue' in f) return null;
  return undefined;
}

function toMs(v) {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  const t = new Date(v).getTime();
  return isNaN(t) ? 0 : t;
}

async function readDoc(access, uid) {
  const r = await fsFetch(docUrl(access.projectId, uid), 'GET', access);
  if (r.status === 404) return {};
  if (!r.ok) throw new Error('Firestore GET ' + r.status + ': ' + (await r.text()).slice(0, 300));
  const j = await r.json();
  const out = {};
  for (const k of Object.keys(j.fields || {})) out[k] = val(j.fields[k]);
  return out;
}

// expiresAt: angka ms (berjangka) atau null (permanen).
// opts.orderId        -> idempoten: order yang sama tidak diproses dua kali
// opts.respectRevoked -> true = jangan pulihkan akun yang dicabut admin (dipakai claim)
export async function grantVip(uid, { expiresAt, email, orderId, respectRevoked, source } = {}) {
  const access = await getFirestoreAccess();
  const d = await readDoc(access, uid);

  if (respectRevoked && d.vip_revoked === true) return { ok: false, reason: 'revoked' };
  if (orderId && d.vip_order_id === orderId) {
    return { ok: true, already: true, expiresAt: d.vip_expiry ? toMs(d.vip_expiry) : null };
  }

  const curActive = d.is_vip === true && d.vip_revoked !== true;
  const curExp = d.vip_expiry ? toMs(d.vip_expiry) : null; // null = permanen
  const curLive = curActive && (curExp === null || curExp > Date.now());

  // Jangan menurunkan VIP yang masih berlaku (mis. permanen dibeli lagi 7 hari).
  let finalExp = expiresAt === undefined ? null : expiresAt;
  if (curLive) {
    if (curExp === null) finalExp = null;
    else if (finalExp !== null) finalExp = Math.max(curExp, finalExp);
  }

  const nowIso = new Date().toISOString();
  const fields = {
    is_vip: { booleanValue: true },
    vip_revoked: { booleanValue: false },
    vip_expiry: finalExp ? { stringValue: new Date(finalExp).toISOString() } : { nullValue: null },
    email: (email || d.email) ? { stringValue: email || d.email } : { nullValue: null },
    vip_source: { stringValue: source || 'server' },
    updated_at: { timestampValue: nowIso }
  };
  if (orderId) fields.vip_order_id = { stringValue: orderId };
  if (!curLive) fields.vip_since = { timestampValue: nowIso };

  // updateMask = hanya field yang kita tulis (setara set merge:true).
  const mask = Object.keys(fields).map(k => 'updateMask.fieldPaths=' + encodeURIComponent(k)).join('&');
  const r = await fsFetch(docUrl(access.projectId, uid) + '?' + mask, 'PATCH', access, { fields });
  if (!r.ok) throw new Error('Firestore PATCH ' + r.status + ': ' + (await r.text()).slice(0, 300));

  return { ok: true, expiresAt: finalExp };
}
