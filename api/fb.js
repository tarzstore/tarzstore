// Proxy untuk NexaDev Facebook Downloader API (video publik SD/HD).
export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ status: false, message: "Parameter url wajib diisi" });
  }

  try {
    const upstream = await fetch(
      `https://api.nexadev.my.id/api/fb?url=${encodeURIComponent(url)}`
    );
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(502).json({ status: false, message: "Gagal menghubungi server upstream" });
  }
}
