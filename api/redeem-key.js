// /api/redeem-key.js
// Redeem key VIP/trial lewat server. Key divalidasi & dihanguskan oleh Apps Script
// (seperti sebelumnya), lalu SERVER yang menulis VIP ke Firestore -- bukan browser.

import { verifyRequestUser } from './_firebase.js';
import { grantVip } from './_vip.js';

const KEY_API_URL = process.env.KEY_API_URL ||
  'https://script.google.com/macros/s/AKfycbw4bx5UZtkoCrr3JalSeYlxrdZ50lJmRt1XHlqkXc1BrnUR362ezDur6mPfApeii8ht/exec';
const DEFAULT_TRIAL_HOURS = 24;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const user = await verifyRequestUser(req);
  if (!user) return res.status(401).json({ ok: false, error: 'Login dulu untuk memakai key.' });

  let body = req.body || {};
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const key = typeof body.key === 'string' ? body.key.trim() : '';
  if (!key || key.length > 100) {
    return res.status(200).json({ ok: false, error: 'Key tidak boleh kosong.' });
  }

  let result;
  try {
    const resp = await fetch(KEY_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'redeemKey', key })
    });
    result = await resp.json();
  } catch (e) {
    console.error('redeem-key: gagal menghubungi Apps Script:', e);
    return res.status(502).json({ ok: false, error: 'Gagal menghubungi server key.' });
  }

  if (!result || !result.ok) {
    return res.status(200).json({ ok: false, error: (result && result.error) || 'Key salah, coba lagi.' });
  }

  const isTrial = !!result.isTrial;
  const hours = Number(result.trialHours) > 0 ? Number(result.trialHours) : DEFAULT_TRIAL_HOURS;
  const expiresAt = isTrial ? Date.now() + hours * 3600000 : null;

  try {
    const r = await grantVip(user.uid, { expiresAt, email: user.email, source: isTrial ? 'key-trial' : 'key' });
    return res.status(200).json({ ok: true, isTrial, trialHours: hours, expiresAt: r.expiresAt });
  } catch (e) {
    // Key sudah hangus di Apps Script tapi VIP gagal ditulis: admin bisa Gift manual.
    console.error('redeem-key: KEY HANGUS tapi grant gagal. uid=' + user.uid + ' trial=' + isTrial, e);
    return res.status(500).json({ ok: false, error: 'Key valid tapi gagal mengaktifkan VIP. Hubungi admin.' });
  }
}
