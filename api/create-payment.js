// /api/create-payment.js
// Dipanggil dari frontend saat user klik "Bayar VIP".
// Membuat "order id" unik, menyimpannya di KV dengan status "pending",
// lalu meminta QRIS ke BuatQris. Secret Token HANYA ada di sini (server), aman.

import { kv } from './_kv.js';
import { randomUUID } from 'crypto';

const VIP_PRICE = 1000; // Rp10.000 — ubah di sini kalau harga VIP berubah

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const orderId = 'VIP-' + randomUUID().slice(0, 8) + '-' + Date.now();

    const payload = {
      action: 'api_create_qris',
      account_id: process.env.BUATQRIS_ACCOUNT_ID,
      secret_token: process.env.BUATQRIS_SECRET_TOKEN,
      amount: VIP_PRICE,
      description: 'VIP Access - ' + orderId,
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
    const qrImageUrl = data.data?.qris_image; // sudah berformat "data:image/png;base64,..."

    if (!transactionId || !qrImageUrl) {
      console.error('Missing transaction_id/qris_image in BuatQris response:', data);
      return res.status(502).json({ ok: false, error: 'Respons BuatQris tidak lengkap.' });
    }

    // Simpan mapping orderId <-> transactionId, status pending, TTL 30 menit
    await kv.set(
      `order:${orderId}`,
      { transactionId, status: 'pending', createdAt: Date.now() },
      { ex: 1800 }
    );
    // Simpan juga mapping sebaliknya supaya webhook (yang cuma tahu transactionId) bisa cari orderId
    await kv.set(`txn:${transactionId}`, orderId, { ex: 1800 });

    return res.status(200).json({
      ok: true,
      orderId,
      amount: VIP_PRICE,
      qrImageUrl
    });
  } catch (err) {
    console.error('create-payment error:', err);
    return res.status(500).json({ ok: false, error: 'Terjadi kesalahan server.' });
  }
}
