// /api/verify-vip.js
// Dipanggil frontend tiap kali halaman dimuat untuk cek "apakah vipToken yang
// tersimpan di browser ini masih valid?". Ini menggantikan localStorage-only
// check yang lama (localStorage.tarz_vip='true') supaya status VIP tidak bisa
// dipalsukan cuma dengan mengetik di DevTools console.

import { kv } from './_kv.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false });
  }

  const { token } = req.query;
  if (!token) {
    return res.status(200).json({ ok: true, vip: false });
  }

  try {
    const record = await kv.get(`vip:${token}`);
    return res.status(200).json({ ok: true, vip: !!record });
  } catch (err) {
    console.error('verify-vip error:', err);
    // Kalau server error, jangan langsung kunci user yang sudah bayar — biarkan
    // frontend fallback ke status localStorage yang sudah ada sebelumnya.
    return res.status(200).json({ ok: true, vip: null });
  }
}
