// /api/notify-vip.js
//
// Endpoint TUNGGAL notifikasi Telegram "VIP baru" -- dipanggil dari FRONTEND
// untuk jalur QRIS, Key, Gift, dan Code VIP. Token bot hanya ada di Environment Variable Vercel.
//
// ── SETUP WAJIB DI VERCEL ──
//   TELEGRAM_BOT_TOKEN = (token dari @BotFather)
//   TELEGRAM_CHAT_ID   = 8620265239
// Lalu redeploy.

import { getPlan } from './_plans.js';
// kv dimuat belakangan (lazy) supaya kalau Redis bermasalah (env Upstash hilang,
// kuota habis, dll) endpoint ini TIDAK ikut crash saat dimuat. Untuk notifikasi
// Code VIP, Redis hanya dipakai untuk anti-dobel dan boleh gagal tanpa menghentikan notifikasi.
let _kvMod = null;
async function loadKv() {
  if (_kvMod) return _kvMod;
  try {
    _kvMod = (await import('./_kv.js')).kv;
  } catch (e) {
    console.error('[notify-vip] gagal memuat _kv.js:', e && e.message ? e.message : e);
    const fail = async () => { throw new Error('kv_unavailable'); };
    _kvMod = { get: fail, set: fail, setnx: fail, del: async () => {}, persist: fail, expire: fail };
  }
  return _kvMod;
}

const NOTIF_PHOTO_URL = 'https://pisylvcyumuygsytxmvg.supabase.co/storage/v1/object/public/Tr/tarzstore.png';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error('[notify-vip] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID belum di-set.');
    return res.status(200).json({ ok: false, reason: 'env_missing' }); // jangan gagalkan alur VIP user
  }

  const kv = await loadKv();
  let claimKey = null;
  try {
    let body = req.body || {};
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const { method, isTrial, trialHours, orderId, buyerName, buyerEmail,
            plan, targetName, targetEmail, targetUid, adminName, adminEmail,
            code, durationLabel, expiryMs } = body;

    // ── QRIS: notifikasi dikirim SEKALI per order, paketnya dibaca dari ORDER di server ──
    // Sebelumnya frontend memanggil endpoint ini dari beberapa jalur (polling, kembali
    // dari app e-wallet, tab lain) dan paket diambil dari state browser yang bisa kosong
    // setelah reload -> muncul 2 notifikasi, satu tanpa "Paket". Sekarang dedupe di sini.
    let planInfo = null;
    let priceNum = null;
    let qrisExpiry; // ms | null (permanen) | undefined (tidak diketahui)
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
      // Tanggal berakhir yang disimpan server saat pembayaran dikonfirmasi
      // (order.vipExpiry). Order lama tanpa field ini dihitung dari paketnya.
      if (typeof order.vipExpiry === 'number') qrisExpiry = order.vipExpiry;
      else if (order.vipExpiry === null && planInfo && !planInfo.days) qrisExpiry = null;
      else if (planInfo && planInfo.days) qrisExpiry = Date.now() + planInfo.days * 86400000;
      // Harga yang benar-benar ditagih saat order dibuat (fallback: harga paket).
      priceNum = Number(order.amount) > 0 ? Number(order.amount) : (planInfo ? planInfo.price : null);

      claimKey = `notified:${orderId}`;
      const claimed = await kv.setnx(claimKey, 1, { ex: 60 * 60 * 24 * 7 });
      if (!claimed) {
        return res.status(200).json({ ok: true, duplicate: true }); // sudah pernah dikirim
      }
    }

    // ── GIFT: admin memberi VIP lewat menu Gift VIP / titik-tiga chat ──
    if (method === 'gift') {
      planInfo = getPlan(plan) || null;
      if (!planInfo) {
        console.error('[notify-vip] gift: paket tidak dikenal:', plan);
        return res.status(200).json({ ok: false, reason: 'plan_unknown:' + plan });
      }
      // Anti dobel: klik/panggilan ganda untuk penerima+paket yang sama dalam 20 detik.
      const who = String(targetUid || targetEmail || targetName || '').slice(0, 120);
      if (!who) return res.status(200).json({ ok: false, reason: 'no_target' });
      claimKey = `giftnotif:${who}:${plan}`;
      const claimed = await kv.setnx(claimKey, 1, { ex: 20 });
      if (!claimed) {
        claimKey = null; // bukan milik kita, jangan dilepas
        console.log('[notify-vip] gift duplikat diabaikan:', who, plan);
        return res.status(200).json({ ok: true, duplicate: true, reason: 'duplicate_20s' });
      }
    }

    // ── CODE VIP: pembeli menukar kode lewat menu "Input Code VIP" ──
    // Dedupe per kode (kode sekali pakai), jadi panggilan ganda tidak bikin notifikasi dobel.
    let codeText = '';
    if (method === 'code') {
      codeText = String(code == null ? '' : code).replace(/[^A-Za-z0-9-]/g, '').slice(0, 40);
      if (!codeText) return res.status(200).json({ ok: false, reason: 'no_code' });
      claimKey = `codenotif:${codeText}`;
      try {
        const claimed = await kv.setnx(claimKey, 1, { ex: 60 * 60 * 24 * 7 });
        if (!claimed) {
          claimKey = null; // bukan milik kita, jangan dilepas
          return res.status(200).json({ ok: true, duplicate: true });
        }
      } catch (e) {
        // Redis bermasalah: tetap kirim notifikasi (kode sekali pakai, risiko dobel kecil).
        console.error('[notify-vip] code: dedupe Redis gagal, lanjut kirim:', e && e.message ? e.message : e);
        claimKey = null;
      }
    }

    const waktu = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    // Input dari browser tidak dipercaya: trialHours dipaksa angka (kalau tidak,
    // karakter HTML bisa membuat Telegram menolak pesan), plan dicek ke daftar paket.
    const hoursNum = Number(trialHours);
    const hoursText = Number.isFinite(hoursNum) && hoursNum > 0 ? String(hoursNum) : '?';

    // Nama/email dikirim browser -> dianggap teks biasa: dipotong & di-escape HTML
    // supaya karakter seperti < > & tidak membuat Telegram menolak pesan.
    const esc = (v, max) => String(v == null ? '' : v).replace(/[\r\n]+/g, ' ').trim().slice(0, max)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const nameText = esc(buyerName, 60);
    const emailText = esc(buyerEmail, 80);

    const fmtUntil = (ms) => new Date(ms)
      .toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const lines = [method === 'gift' ? '🎁 <b>VIP GIFT!</b> — Tarz Store' : '🟢 <b>VIP BARU!</b> — Tarz Store', ''];
    if (method === 'gift') {
      lines.push('🎁 Metode: Gift Admin');
      lines.push(`📦 Paket: ${planInfo.label}`);
      if (planInfo.days) {
        lines.push(`⏳ Expried: ${fmtUntil(Date.now() + planInfo.days * 86400000)} WIB`);
      } else {
        lines.push('♾️ Berlaku: Selamanya');
      }
      const tName = esc(targetName, 60);
      const tEmail = esc(targetEmail, 80);
      lines.push(`👤 Penerima: ${tName || tEmail || '-'}`);
      if (tName && tEmail) lines.push(`📧 Email: ${tEmail}`);
      const aName = esc(adminName, 60);
      const aEmail = esc(adminEmail, 80);
      if (aName || aEmail) lines.push(`👑 Diberikan oleh: ${aName || aEmail}`);
    } else if (method === 'qris') {
      lines.push('💳 Metode: QRIS');
      if (planInfo) lines.push(`📦 Paket: ${planInfo.label}`);
      if (priceNum) lines.push(`💸 Price: Rp${String(Math.round(priceNum)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`);
      if (planInfo && typeof qrisExpiry === 'number') lines.push(`⏳ Expried: ${fmtUntil(qrisExpiry)} WIB`);
      else if (planInfo && qrisExpiry === null) lines.push('♾️ Berlaku: Selamanya');
    } else if (method === 'code') {
      lines.push('🎟️ Metode: Code VIP');
      lines.push(`🔖 Kode: <code>${esc(codeText, 40)}</code>`);
      const dLabel = esc(durationLabel, 30);
      if (dLabel) lines.push(`📦 Durasi: ${dLabel}`);
      if (typeof expiryMs === 'number' && Number.isFinite(expiryMs)) lines.push(`⏳ Expried: ${fmtUntil(expiryMs)} WIB`);
      else if (expiryMs === null) lines.push('♾️ Berlaku: Selamanya');
    } else if (method === 'key') {
      lines.push(isTrial ? `🔑 Metode: Key Trial (${hoursText} jam)` : '🔑 Metode: Key VIP');
    } else {
      lines.push('❓ Metode: tidak diketahui');
    }
    if (method !== 'gift') {
      if (nameText || emailText) {
        if (nameText) lines.push(`👤 Nama: ${nameText}`);
        if (emailText) lines.push(`📧 Email: ${emailText}`);
      } else {
        lines.push('👤 Akun: Belum login Google');
      }
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
      return res.status(200).json({ ok: false, reason: 'telegram: ' + data.description });
    }

    console.log('[notify-vip] terkirim ke Telegram, method =', method);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[notify-vip] error:', err);
    if (claimKey) { try { await kv.del(claimKey); } catch (e) { /* abaikan */ } }
    return res.status(200).json({ ok: false, reason: 'exception: ' + (err && err.message ? err.message : err) });
  }
}
