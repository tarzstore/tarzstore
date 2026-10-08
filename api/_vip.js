// /api/_vip.js
// Satu-satunya tempat yang menulis status VIP ke Firestore vip_users/{uid}.

import { adminDb, FieldValue } from './_firebase.js';

function toMs(v) {
  if (v == null) return null;
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (typeof v === 'number') return v;
  const t = new Date(v).getTime();
  return isNaN(t) ? 0 : t;
}

// expiresAt: angka ms (berjangka) atau null (permanen).
// opts.orderId        -> idempoten: order yang sama tidak diproses dua kali
// opts.respectRevoked -> true = jangan pulihkan akun yang dicabut admin (dipakai claim)
export async function grantVip(uid, { expiresAt, email, orderId, respectRevoked, source } = {}) {
  const db = adminDb();
  const ref = db.collection('vip_users').doc(uid);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const d = snap.exists ? snap.data() : {};

    if (respectRevoked && d.vip_revoked === true) return { ok: false, reason: 'revoked' };
    if (orderId && d.vip_order_id === orderId) {
      return { ok: true, already: true, expiresAt: d.vip_expiry ? toMs(d.vip_expiry) : null };
    }

    const curActive = d.is_vip === true && d.vip_revoked !== true;
    const curExp = d.vip_expiry ? toMs(d.vip_expiry) : null; // null = permanen
    const curLive = curActive && (curExp === null || curExp > Date.now());

    // Jangan menurunkan VIP yang masih berlaku (mis. permanen dibeli lagi 7 hari).
    let finalExp = expiresAt;
    if (curLive) {
      if (curExp === null) finalExp = null;
      else if (expiresAt !== null) finalExp = Math.max(curExp, expiresAt);
    }

    const payload = {
      is_vip: true,
      vip_revoked: false,
      vip_expiry: finalExp ? new Date(finalExp).toISOString() : null,
      email: email || d.email || null,
      vip_source: source || 'server',
      updated_at: FieldValue.serverTimestamp()
    };
    if (orderId) payload.vip_order_id = orderId;
    if (!curLive) payload.vip_since = FieldValue.serverTimestamp();

    tx.set(ref, payload, { merge: true });
    return { ok: true, expiresAt: finalExp };
  });
}
