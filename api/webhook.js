// /api/webhook.js
// Didaftarkan sebagai "Webhook / Callback URL" di dashboard BuatQris:
//   https://situs-kamu.vercel.app/api/webhook
// BuatQris akan POST ke sini otomatis begitu QRIS dibayar — inilah bagian
// "otomatis jadi VIP" yang sesungguhnya (tidak tergantung user buka/tutup tab).

import crypto from 'crypto';
import { kv } from './_kv.js';
import { markOrderPaidAndUnlock } from './check-status.js';

// Vercel functions butuh raw body untuk verifikasi HMAC signature
export const config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  // Tanpa secret, createHmac melempar error dan function crash -> cek di awal.
  if (!process.env.BUATQRIS_WEBHOOK_SECRET) {
    console.error('Webhook: BUATQRIS_WEBHOOK_SECRET belum di-set di Environment Variables.');
    return res.status(500).json({ ok: false, error: 'Webhook belum dikonfigurasi' });
  }

  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch (e) {
    console.error('Webhook gagal membaca body:', e);
    return res.status(400).json({ ok: false, error: 'Invalid body' });
  }
  const sigHeaderRaw = req.headers['x-buatqris-signature'] || '';
  const signatureHeader = Array.isArray(sigHeaderRaw) ? sigHeaderRaw[0] : String(sigHeaderRaw);

  const expectedSig =
    'sha256=' +
    crypto.createHmac('sha256', process.env.BUATQRIS_WEBHOOK_SECRET).update(rawBody).digest('hex');

  const sigOk =
    signatureHeader.length === expectedSig.length &&
    crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expectedSig));

  if (!sigOk) {
    console.error('Webhook signature tidak valid');
    return res.status(401).json({ ok: false, error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid JSON' });
  }

  try {
    switch (event.event) {
      case 'payment.success': {
        const orderId = await kv.get(`txn:${event.transaction_id}`);
        if (!orderId) {
          // Transaksi bukan dari alur VIP kita (atau sudah kedaluwarsa) — abaikan saja
          break;
        }
        const order = await kv.get(`order:${orderId}`);
        if (order && order.status !== 'success') {
          // Paket (7/15/30 hari/permanen) dibaca dari order.plan yang disimpan
          // create-payment.js; masa aktif dihitung di markOrderPaidAndUnlock.
          // Hasilnya objek { vipToken, plan, vipExpiry } -- tidak dipakai di sini.
          await markOrderPaidAndUnlock(orderId, order);
        }
        break;
      }
      case 'payment.expired':
      case 'payment.failed': {
        const orderId = await kv.get(`txn:${event.transaction_id}`);
        if (orderId) {
          const order = await kv.get(`order:${orderId}`);
          // Jangan timpa order yang sudah sukses (event expired/failed bisa datang telat)
          if (order && order.status !== 'success') {
            const status = event.event === 'payment.expired' ? 'expired' : 'failed';
            await kv.set(`order:${orderId}`, { ...order, status }, { ex: 1800 });
          }
        }
        break;
      }
      default:
        // event lain (withdrawal.*) tidak relevan untuk fitur VIP, abaikan
        break;
    }

    // WAJIB balas 200 supaya BuatQris tidak retry terus
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('webhook handler error:', err);
    // Tetap 200 di sini opsional — tapi kalau error internal, biarkan BuatQris retry sekali:
    return res.status(500).json({ ok: false });
  }
}
