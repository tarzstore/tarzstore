// /api/verify-vip.js
// Dipanggil frontend tiap halaman dimuat: "apakah vipToken di browser ini masih valid?"
// Mendukung VIP berjangka (7/15/30 hari) dan permanen.

import { kv } from './_kv.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false });
  }

  const { token } = req.query;
  if (!token || typeof token !== 'string') {
    return res.status(200).json({ ok: true, vip: false });
  }

  try {
    const record = await kv.get(`vip:${token}`);
    if (!record) {
      return res.status(200).json({ ok: true, vip: false });
    }

    // expiresAt angka  -> VIP berjangka.
    // expiresAt null / tidak ada (token lama) -> permanen.
    const expiresAt = typeof record.expiresAt === 'number' ? record.expiresAt : null;

    if (expiresAt !== null) {
      if (Date.now() >= expiresAt) {
        return res.status(200).json({ ok: true, vip: false, expired: true, expiresAt });
      }
      // Jangan persist: token berjangka harus ikut hilang sesuai TTL.
      return res.status(200).json({ ok: true, vip: true, expiresAt });
    }

    // Permanen: pastikan tidak ada TTL. Gagal persist tidak boleh membatalkan verifikasi.
    try { await kv.persist(`vip:${token}`); } catch (e) { console.error('persist vip error:', e); }
    return res.status(200).json({ ok: true, vip: true, expiresAt: null });
  } catch (err) {
    console.error('verify-vip error:', err);
    // Jangan kunci user yang sudah bayar; frontend fallback ke status lokal.
    return res.status(200).json({ ok: true, vip: null });
  }
}
