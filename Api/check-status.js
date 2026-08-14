// /api/check-status.js
// Dipanggil berulang (polling) oleh frontend tiap beberapa detik selagi user
// melihat layar QRIS, untuk tahu kapan pembayaran sukses.
// Ini JARING KEDUA selain webhook — supaya tetap update walau webhook telat.

import { kv } from './_kv.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { orderId } = req.query;
  if (!orderId) {
    return res.status(400).json({ ok: false, error: 'orderId wajib diisi' });
  }

  try {
    const order = await kv.get(`order:${orderId}`);
    if (!order) {
      return res.status(404).json({ ok: false, error: 'Order tidak ditemukan atau kedaluwarsa' });
    }

    // Kalau sudah sukses/gagal dari webhook, langsung balikin — tidak perlu tanya BuatQris lagi.
    if (order.status === 'success' || order.status === 'failed' || order.status === 'expired') {
      return res.status(200).json({ ok: true, status: order.status, vipToken: order.vipToken || null });
    }

    // Masih pending -> tanya langsung ke BuatQris (jaga-jaga webhook belum sampai)
    const payload = {
      action: 'api_check_transaction',
      account_id: process.env.BUATQRIS_ACCOUNT_ID,
      secret_token: process.env.BUATQRIS_SECRET_TOKEN,
      transaction_id: order.transactionId
    };

    const resp = await fetch('https://api.buatqris.site', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      body: JSON.stringify(payload)
    });
    const data = await resp.json();
    if (!resp.ok || !data || data.success !== true) {
      console.error('BuatQris check-status error:', data);
      return res.status(200).json({ ok: true, status: 'pending' }); // jangan hentikan polling hanya karena 1x gagal cek
    }
    // sesuaikan lagi field ini kalau log Vercel menunjukkan nama berbeda
    const remoteStatus = data.data?.status || data.data?.transaction_status;

    if (remoteStatus === 'success') {
      const vipToken = await markOrderPaidAndUnlock(orderId, order);
      return res.status(200).json({ ok: true, status: 'success', vipToken });
    }
    if (remoteStatus === 'expired' || remoteStatus === 'failed') {
      await kv.set(`order:${orderId}`, { ...order, status: remoteStatus }, { ex: 1800 });
      return res.status(200).json({ ok: true, status: remoteStatus });
    }

    return res.status(200).json({ ok: true, status: 'pending' });
  } catch (err) {
    console.error('check-status error:', err);
    return res.status(500).json({ ok: false, error: 'Terjadi kesalahan server.' });
  }
}

// Dipakai juga oleh webhook.js — ditaruh di sini supaya logikanya satu tempat.
export async function markOrderPaidAndUnlock(orderId, order) {
  // Bikin token VIP acak yang akan disimpan di browser user (bukti sudah bayar,
  // dicek ulang ke server tiap kali, jadi tidak bisa dipalsu lewat localStorage biasa)
  const vipToken = 'vip_' + Buffer.from(orderId + ':' + Date.now()).toString('base64url');

  await kv.set(`order:${orderId}`, { ...order, status: 'success', vipToken }, { ex: 60 * 60 * 24 * 30 });
  // Token VIP ini yang dicek endpoint verify-vip.js — berlaku permanen (30 hari TTL, diperpanjang tiap dicek)
  await kv.set(`vip:${vipToken}`, { orderId, unlockedAt: Date.now() }, { ex: 60 * 60 * 24 * 365 });

  return vipToken;
}
