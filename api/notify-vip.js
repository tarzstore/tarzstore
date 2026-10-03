// /api/notify-vip.js
//
// Endpoint TUNGGAL notifikasi Telegram "VIP baru" -- dipanggil dari FRONTEND
// untuk jalur QRIS maupun Key. Token bot hanya ada di Environment Variable Vercel.
//
// ── SETUP WAJIB DI VERCEL ──
//   TELEGRAM_BOT_TOKEN = (token dari @BotFather)
//   TELEGRAM_CHAT_ID   = 8620265239
// Lalu redeploy.

import { getPlan } from './_plans.js';
import { kv } from './_kv.js';

const NOTIF_PHOTO_URL = 'https://pisylvcyumuygsytxmvg.supabase.co/storage/v1/object/public/Tr/tarzstore.png';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error('[notify-vip] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID belum di-set.');
    return res.status(200).json({ ok: false }); // jangan gagalkan alur VIP user
  }

  let claimKey = null;
  try {
    let body = req.body || {};
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const { method, isTrial, trialHours, orderId } = body;

    // ── QRIS: notifikasi dikirim SEKALI per order, paketnya dibaca dari ORDER di server ──
    // Sebelumnya frontend memanggil endpoint ini dari beberapa jalur (polling, kembali
    // dari app e-wallet, tab lain) dan paket diambil dari state browser yang bisa kosong
    // setelah reload -> muncul 2 notifikasi, satu tanpa "Paket". Sekarang dedupe di sini.
    let planInfo = null;
    let priceNum = null;
    if (method === 'qris') {
      if (!orderId || typeof orderId !== 'string') {
        return res.status(200).json({ ok: false });
      }
      const order = await kv.get(`order:${orderId}`);
      // Hanya order yang benar-benar sukses dibayar yang boleh memicu notifikasi.
      if (!order || order.status !== 'success') {
        return res.status(200).json({ ok: false });
      }
      planInfo = getPlan(order.plan) || null;
      // Harga yang benar-benar ditagih saat order dibuat (fallback: harga paket).
      priceNum = Number(order.amount) > 0 ? Number(order.amount) : (planInfo ? planInfo.price : null);

      claimKey = `notified:${orderId}`;
      const claimed = await kv.setnx(claimKey, 1, { ex: 60 * 60 * 24 * 7 });
      if (!claimed) {
        return res.status(200).json({ ok: true, duplicate: true }); // sudah pernah dikirim
      }
    }

    const waktu = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    // Input dari browser tidak dipercaya: trialHours dipaksa angka (kalau tidak,
    // karakter HTML bisa membuat Telegram menolak pesan), plan dicek ke daftar paket.
    const hoursNum = Number(trialHours);
    const hoursText = Number.isFinite(hoursNum) && hoursNum > 0 ? String(hoursNum) : '?';

    const lines = ['🟢 <b>VIP BARU!</b> — Tarz Store', ''];
    if (method === 'qris') {
      lines.push('💳 Metode: QRIS');
      if (planInfo) lines.push(`📦 Paket: ${planInfo.label}`);
      if (priceNum) lines.push(`💸 Price: Rp${String(Math.round(priceNum)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`);
    } else if (method === 'key') {
      lines.push(isTrial ? `🔑 Metode: Key Trial (${hoursText} jam)` : '🔑 Metode: Key VIP');
    } else {
      lines.push('❓ Metode: tidak diketahui');
    }
    lines.push(`🕒 Waktu: ${waktu} WIB`);

    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: NOTIF_PHOTO_URL,
        caption: lines.join('\n'),
        parse_mode: 'HTML'
      })
    });
    const data = await tgRes.json();
    if (!data.ok) {
      console.error('[notify-vip] Telegram menolak pesan:', data.description);
      // Lepas penanda supaya percobaan berikutnya masih bisa mengirim.
      if (claimKey) { try { await kv.del(claimKey); } catch (e) { console.error('[notify-vip] del claim error:', e); } }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[notify-vip] error:', err);
    if (claimKey) { try { await kv.del(claimKey); } catch (e) { /* abaikan */ } }
    return res.status(200).json({ ok: false });
  }
}
