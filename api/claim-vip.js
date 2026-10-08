// /api/claim-vip.js
// Memulihkan VIP dari token bukti-bayar (tarz_vip_token) ke akun yang sedang login.
// Dipakai untuk pembelian lama / VIP yang belum tercatat di Firestore.
// Satu token hanya bisa diklaim SATU akun.

import { kv } from './_kv.js';
import { verifyRequestUser } from './_firebase.js';
import { grantVip } from './_vip.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const user = await verifyRequestUser(req);
  if (!user) return res.status(401).json({ ok: false, error: 'Login dulu.' });

  let body = req.body || {};
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const token = body.token;
  if (typeof token !== 'string' || !token.startsWith('vip_') || token.length > 200) {
    return res.status(400).json({ ok: false, error: 'Token tidak valid.' });
  }

  try {
    const record = await kv.get(`vip:${token}`);
    if (!record) return res.status(404).json({ ok: false, error: 'Token tidak ditemukan.' });

    const expiresAt = typeof record.expiresAt === 'number' ? record.expiresAt : null;
    if (expiresAt !== null && Date.now() >= expiresAt) {
      return res.status(410).json({ ok: false, expired: true });
    }

    // Order baru menyimpan uid pembeli: hanya pembeli itu yang boleh mengklaim.
    const order = record.orderId ? await kv.get(`order:${record.orderId}`) : null;
    if (order && order.uid && order.uid !== user.uid) {
      return res.status(403).json({ ok: false, error: 'Token milik akun lain.' });
    }

    const ttl = expiresAt !== null ? Math.ceil((expiresAt - Date.now()) / 1000) + 86400 : undefined;
    const claimed = await kv.setnx(`vipclaim:${token}`, user.uid, ttl ? { ex: ttl } : undefined);
    if (!claimed) {
      const owner = await kv.get(`vipclaim:${token}`);
      if (owner !== user.uid) {
        return res.status(403).json({ ok: false, error: 'Token sudah dipakai akun lain.' });
      }
    }

    const r = await grantVip(user.uid, {
      expiresAt, email: user.email, orderId: record.orderId, respectRevoked: true, source: 'claim'
    });
    if (!r.ok) return res.status(403).json({ ok: false, error: 'VIP akun ini dicabut admin.' });
    return res.status(200).json({ ok: true, vipExpiry: r.expiresAt });
  } catch (err) {
    console.error('claim-vip error:', err);
    return res.status(500).json({ ok: false, error: 'Terjadi kesalahan server.' });
  }
}
