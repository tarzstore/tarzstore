// /api/notify-vip.js
//
// Endpoint TUNGGAL untuk notifikasi Telegram "VIP baru" -- dipanggil dari
// FRONTEND (index.html), untuk KEDUA jalur (QRIS maupun Key), persis di
// titik yang sama saat akses VIP berhasil terbuka (fungsi success() /
// markVipUnlocked() di index.html).
//
// Aman dipanggil dari frontend karena file ini TIDAK menyimpan token bot di
// sisi client -- token tetap hanya ada di Environment Variable Vercel,
// endpoint ini cuma "jembatan" yang menerima method+detail lalu meneruskan
// ke Telegram dari sisi server.
//
// ── SETUP WAJIB DI VERCEL ──
// Settings -> Environment Variables:
//   TELEGRAM_BOT_TOKEN = (token dari @BotFather)
//   TELEGRAM_CHAT_ID   = 8620265239
// Lalu redeploy.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error('[notify-vip] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID belum di-set.');
    return res.status(200).json({ ok: false }); // tidak boleh gagalkan alur VIP user hanya karena ini
  }

  try {
    const { method, isTrial, trialHours } = req.body || {};
    const waktu = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    const lines = ['🎉 <b>VIP BARU!</b> — Tarz Store', ''];
    if (method === 'qris') {
      lines.push('💳 Metode: QRIS');
    } else if (method === 'key') {
      lines.push(isTrial ? `🔑 Metode: Key Trial (${trialHours || '?'} jam)` : '🔑 Metode: Key VIP');
    } else {
      lines.push('❓ Metode: tidak diketahui');
    }
    lines.push(`🕒 Waktu: ${waktu} WIB`);

    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: lines.join('\n'),
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    const data = await tgRes.json();
    if (!data.ok) console.error('[notify-vip] Telegram menolak pesan:', data.description);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[notify-vip] error:', err);
    return res.status(200).json({ ok: false }); // selalu 200 -> jangan pernah ganggu alur VIP di frontend
  }
}
