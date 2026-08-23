// Proxy untuk NexaDev Spotify Play API.
// Menjaga API key/asal request tetap di server, sekaligus menghindari CORS.
export default async function handler(req, res) {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ status: false, message: "Parameter q wajib diisi" });
  }

  try {
    const upstream = await fetch(
      `https://api.nexadev.my.id/api/spotifyplay?q=${encodeURIComponent(q)}`
    );
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(502).json({ status: false, message: "Gagal menghubungi server upstream" });
  }
}
