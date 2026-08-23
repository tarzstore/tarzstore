// Proxy untuk NexaDev Fake FF Duo generator.
// Catatan: endpoint ini di subdomain "apii" (dobel i), beda dari endpoint lain
// yang pakai "api" — sesuai dokumentasi yang diberikan.
export default async function handler(req, res) {
  const { nickname1, nickname2 } = req.query;
  if (!nickname1 || !nickname2) {
    return res.status(400).json({ status: false, message: "Parameter nickname1 dan nickname2 wajib diisi" });
  }

  try {
    const upstream = await fetch(
      `https://apii.nexadev.my.id/fakeffduo?nickname1=${encodeURIComponent(nickname1)}&nickname2=${encodeURIComponent(nickname2)}`
    );
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(502).json({ status: false, message: "Gagal menghubungi server upstream" });
  }
}
