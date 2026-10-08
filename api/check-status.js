// /api/check-status.js
// Dipanggil berulang (polling) oleh frontend selagi user melihat layar QRIS.
// JARING KEDUA selain webhook — supaya tetap update walau webhook telat.

import { kv } from './_kv.js';
import { getPlan, DAY_MS } from './_plans.js';
import { grantVip } from './_vip.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { orderId } = req.query;
  if (!orderId || typeof orderId !== 'string') {
    return res.status(400).json({ ok: false, error: 'orderId wajib diisi' });
  }

  try {
    const order = await kv.get(`order:${orderId}`);
    if (!order) {
      return res.status(404).json({ ok: false, error: 'Order tidak ditemukan atau kedaluwarsa' });
    }

    // Sudah final (dari webhook / polling sebelumnya) -> langsung balikin.
    if (order.status === 'success' || order.status === 'failed' || order.status === 'expired') {
      return res.status(200).json({
        ok: true,
        status: order.status,
        vipToken: order.vipToken || null,
        plan: order.plan || null,
        vipExpiry: order.vipExpiry || null
      });
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

    // Beberapa kemungkinan nama field status (BuatQris tidak selalu konsisten)
    const rawStatus =
      data.data?.status ??
      data.data?.transaction_status ??
      data.data?.qris_status ??
      data.data?.payment_status ??
      data.status ??
      data.transaction_status;

    const normalized = String(rawStatus || '').toLowerCase().trim();
    const isSuccess = ['success', 'paid', 'settlement', 'completed', 'sukses'].includes(normalized);
    const isExpired = ['expired', 'expire', 'timeout'].includes(normalized);
    const isFailed = ['failed', 'failure', 'cancel', 'cancelled', 'canceled'].includes(normalized);

    const remoteStatus = isSuccess ? 'success' : isExpired ? 'expired' : isFailed ? 'failed' : null;

    if (remoteStatus === 'success') {
      const unlocked = await markOrderPaidAndUnlock(orderId, order);
      return res.status(200).json({
        ok: true,
        status: 'success',
        vipToken: unlocked.vipToken,
        plan: unlocked.plan,
        vipExpiry: unlocked.vipExpiry
      });
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
// Signature (orderId, order) TIDAK berubah, jadi webhook.js tidak perlu diedit.
//
// RETURN: object { vipToken, plan, vipExpiry }.
// (Dulu hanya string vipToken. Kalau webhook.js memakai hasilnya sebagai string,
//  pakai `(await markOrderPaidAndUnlock(...)).vipToken`.)
export async function markOrderPaidAndUnlock(orderId, order) {
  // Webhook & polling bisa memanggil fungsi ini bersamaan untuk order yang sama.
  // Token DETERMINISTIK dari orderId; penulisan `vip:` memakai SET NX (atomik),
  // jadi tidak pernah ada dua token / dua masa aktif untuk satu order.
  const vipToken = 'vip_' + Buffer.from(orderId).toString('base64url');

  // Order lama (dibuat sebelum update ini) tidak punya `plan` -> perilaku lama: permanen.
  const planId = getPlan(order && order.plan) ? order.plan : 'permanent';
  const plan = getPlan(planId);

  const now = Date.now();
  const expiresAt = plan.days ? now + plan.days * DAY_MS : null;
  const record = { orderId, plan: planId, unlockedAt: now, expiresAt };

  // Timed: TTL = durasi + 1 hari cadangan (Redis membersihkan sendiri).
  // Permanen: tanpa TTL.
  const ttl = plan.days ? Math.ceil(plan.days * 86400 + 86400) : undefined;
  await kv.setnx(`vip:${vipToken}`, record, ttl ? { ex: ttl } : undefined);

  // Kalau pemanggil lain sudah menulis duluan, pakai masa aktif yang tersimpan
  // supaya semua pemanggil mendapat tanggal berakhir yang SAMA.
  let stored = null;
  try { stored = await kv.get(`vip:${vipToken}`); } catch (e) { console.error('read vip record error:', e); }
  const finalExpiry = stored && Object.prototype.hasOwnProperty.call(stored, 'expiresAt')
    ? stored.expiresAt
    : expiresAt;

  // Catat VIP ke akun pembeli di Firestore (server-side, kebal rules). Dilakukan
  // SEBELUM order ditandai sukses: kalau gagal, error dilempar -> order tetap
  // pending, dan polling/webhook berikutnya mencoba lagi. Idempoten per orderId.
  if (order && order.uid) {
    await grantVip(order.uid, { expiresAt: finalExpiry, email: order.email, orderId, source: 'qris' });
  }

  // Tandai order sukses SETELAH token tersimpan.
  await kv.set(
    `order:${orderId}`,
    { ...order, plan: planId, status: 'success', vipToken, vipExpiry: finalExpiry },
    { ex: 60 * 60 * 24 * 30 }
  );

  return { vipToken, plan: planId, vipExpiry: finalExpiry };
}
