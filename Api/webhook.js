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

  const rawBody = await readRawBody(req);
  const signatureHeader = req.headers['x-buatqris-signature'] || '';

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
          await markOrderPaidAndUnlock(orderId, order);
        }
        break;
      }
      case 'payment.expired':
      case 'payment.failed': {
        const orderId = await kv.get(`txn:${event.transaction_id}`);
        if (orderId) {
          const order = await kv.get(`order:${orderId}`);
          if (order) {
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
