// Proxy gabungan untuk semua downloader NexaDev.
// Dipanggil sebagai: /api/dl/capcut, /api/dl/spotify, /api/dl/spotifyplay,
//                     /api/dl/fb, /api/dl/ig, /api/dl/fakeffduo
//
// Tiap "type" punya base URL upstream + daftar parameter wajib yang beda,
// jadi didefinisikan di satu tabel config di bawah biar gampang nambah baru.

const CONFIGS = {
  capcut: {
    base: "https://api.nexadev.my.id/api/capcut",
    params: ["url"],
  },
  spotify: {
    base: "https://api.nexadev.my.id/api/spotify",
    params: ["url"],
  },
  spotifyplay: {
    base: "https://api.nexadev.my.id/api/spotifyplay",
    params: ["q"],
  },
  fb: {
    base: "https://api.nexadev.my.id/api/fb",
    params: ["url"],
  },
  ig: {
    base: "https://api.nexadev.my.id/api/ig",
    params: ["url"],
  },
  fakeffduo: {
    // Endpoint ini pakai domain apii.nexadev.my.id (dobel i), beda dari yang lain.
    base: "https://apii.nexadev.my.id/fakeffduo",
    params: ["nickname1", "nickname2"],
  },
  tiktokstalker: {
    base: "https://api.nexadev.my.id/api/tiktokstalker",
    params: ["username"],
  },
  ttdl: {
    // TikTok downloader upstream-nya pakai endpoint "aio" (all-in-one), bukan "ttdl".
    base: "https://api.nexadev.my.id/api/aio",
    params: ["url"],
  },
  ff: {
    base: "https://api.nexadev.my.id/api/ff",
    params: ["id"],
  },
};

export default async function handler(req, res) {
  const { type } = req.query;
  const config = CONFIGS[type];

  if (!config) {
    return res.status(404).json({
      status: false,
      message: `Tipe downloader "${type}" tidak dikenal. Pilihan: ${Object.keys(CONFIGS).join(", ")}`,
    });
  }

  // Validasi semua parameter wajib untuk tipe ini ada & tidak kosong.
  const missing = config.params.filter((p) => !req.query[p]);
  if (missing.length) {
    return res.status(400).json({
      status: false,
      message: `Parameter ${missing.join(", ")} wajib diisi`,
    });
  }

  const qs = config.params
    .map((p) => `${p}=${encodeURIComponent(req.query[p])}`)
    .join("&");
  const upstreamUrl = `${config.base}?${qs}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const upstream = await fetch(upstreamUrl, { signal: controller.signal });
    clearTimeout(timeout);

    const text = await upstream.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // Upstream tidak balas JSON (downtime, halaman error HTML, dsb).
      console.error(`[api/dl/${type}] Upstream non-JSON response:`, upstream.status, text.slice(0, 300));
      return res.status(502).json({
        status: false,
        message: `Server upstream mengembalikan respons tidak valid (HTTP ${upstream.status}).`,
      });
    }

    return res.status(upstream.status).json(data);
  } catch (err) {
    console.error(`[api/dl/${type}] Fetch error:`, err.name, err.message);
    const message =
      err.name === "AbortError"
        ? "Server upstream terlalu lama merespons (timeout)."
        : "Gagal menghubungi server upstream: " + err.message;
    return res.status(502).json({ status: false, message });
  }
}
