// /api/_kv.js
// Adapter tipis: menyediakan kv.get / kv.set dengan gaya yang sama seperti
// @vercel/kv (yang sekarang sudah tidak ada), tapi dijalankan di atas
// @upstash/redis. File lain (create-payment.js, check-status.js, dst)
// tidak perlu diubah — cukup import dari sini.

import { Redis } from '@upstash/redis';

// Upstash otomatis menambahkan env var ini ke project Vercel kamu
// begitu database dihubungkan lewat Storage tab (integrasi resmi).
const redis = Redis.fromEnv();

export const kv = {
  async get(key) {
    // Upstash SDK sudah otomatis JSON.parse value yang disimpan lewat set() di bawah
    return redis.get(key);
  },

  async set(key, value, options) {
    // options.ex = detik TTL, samakan gaya pemanggilan dengan kode yang sudah ada
    if (options && options.ex) {
      return redis.set(key, value, { ex: options.ex });
    }
    return redis.set(key, value);
  }
};
