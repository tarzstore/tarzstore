// /api/create-payment.js
// Dipanggil dari frontend saat user klik "Bayar VIP" (body: { plan }).
// Harga ditentukan SERVER dari paket yang dipilih (lihat _plans.js), bukan dari
// angka yang dikirim browser. Order disimpan di KV dengan status "pending",
// lalu QRIS diminta ke BuatQris. Secret Token HANYA ada di sini (server).

import { kv } from './_kv.js';
import { getPlan } from './_plans.js';
import { randomUUID } from 'crypto';

function readBody(req) {
  const b = req.body;
  if (!b) return {};
  if (typeof b === 'string') {
    try { return JSON.parse(b); } catch { return {}; }
  }
  return b;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const planId = readBody(req).plan;
    const plan = getPlan(planId);
    if (!plan) {
      return res.status(400).json({ ok: false, error: 'Paket tidak valid.' });
    }

    if (!process.env.BUATQRIS_ACCOUNT_ID || !process.env.BUATQRIS_SECRET_TOKEN) {
      console.error('create-payment: BUATQRIS_ACCOUNT_ID / BUATQRIS_SECRET_TOKEN belum di-set.');
      return res.status(500).json({ ok: false, error: 'Pembayaran belum dikonfigurasi.' });
    }

    const orderId = 'VIP-' + randomUUID().slice(0, 8) + '-' + Date.now();

    const payload = {
      action: 'api_create_qris',
      account_id: process.env.BUATQRIS_ACCOUNT_ID,
      secret_token: process.env.BUATQRIS_SECRET_TOKEN,
      amount: plan.price,
      description: 'VIP ' + plan.label + ' - ' + orderId,
      qris_method: 'qris_two'
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
      console.error('BuatQris create error:', data);
      return res.status(502).json({ ok: false, error: 'Gagal membuat QRIS. Coba lagi.' });
    }

    // BuatQris mengirim QR sebagai gambar base64 langsung di data.qris_image
    const transactionId = data.data?.transaction_id;
    const qrImageUrl = data.data?.qris_image; // "data:image/png;base64,..."

    if (!transactionId || !qrImageUrl) {
      console.error('Missing transaction_id/qris_image in BuatQris response:', data);
      return res.status(502).json({ ok: false, error: 'Respons BuatQris tidak lengkap.' });
    }

    // Simpan paket & nominal di order supaya check-status DAN webhook tahu paket
    // apa yang dibeli (durasi VIP dihitung dari sini). TTL 30 menit.
    await kv.set(
      `order:${orderId}`,
      { transactionId, plan: planId, amount: plan.price, status: 'pending', createdAt: Date.now() },
      { ex: 1800 }
    );
    // Mapping sebaliknya supaya webhook (yang cuma tahu transactionId) bisa cari orderId
    await kv.set(`txn:${transactionId}`, orderId, { ex: 1800 });

    return res.status(200).json({
      ok: true,
      orderId,
      plan: planId,
      amount: plan.price,
      qrImageUrl
    });
  } catch (err) {
    console.error('create-payment error:', err);
    return res.status(500).json({ ok: false, error: 'Terjadi kesalahan server.' });
  }
}
