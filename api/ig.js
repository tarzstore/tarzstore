// Proxy untuk NexaDev Instagram Downloader API (foto/video/reels/carousel).
export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ status: false, message: "Parameter url wajib diisi" });
  }

  try {
    const upstream = await fetch(
      `https://api.nexadev.my.id/api/ig?url=${encodeURIComponent(url)}`
    );
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(502).json({ status: false, message: "Gagal menghubungi server upstream" });
  }
}
