// /api/_plans.js
// Sumber kebenaran TUNGGAL untuk paket VIP (harga & durasi).
// Dipakai oleh create-payment.js, check-status.js dan verify-vip.js.
//
// ID paket ('3d', '7d', ...) sengaja tidak diganti karena sudah dipakai
// frontend (index.html) dan bisa tersimpan di localStorage pembeli.
// Yang berubah hanya isinya:  '3d' = 7 hari,  '7d' = 15 hari.
// `days: null` = permanen.

export const VIP_PLANS = {
  '3d':        { label: '7 Days',    days: 7,    price: 10000 },
  '7d':        { label: '15 Days',   days: 15,   price: 15000 },
  '30d':       { label: '30 Days',   days: 30,   price: 25000 },
  'permanent': { label: 'Permanent', days: null, price: 1000 }
};

export const DAY_MS = 86400000;

export function getPlan(planId) {
  if (typeof planId !== 'string') return null;
  return Object.prototype.hasOwnProperty.call(VIP_PLANS, planId) ? VIP_PLANS[planId] : null;
}
