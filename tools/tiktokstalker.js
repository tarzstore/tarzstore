export default async function handler(req, res) {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ status: false, message: 'Parameter username wajib diisi.' });
  }

  try {
    const target = 'https://api.nexadev.my.id/api/tiktokstalker?username=' + encodeURIComponent(username);
    const upstream = await fetch(target);

    if (!upstream.ok) {
      return res.status(502).json({ status: false, message: 'Server sumber sedang bermasalah.' });
    }

    const data = await upstream.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(502).json({ status: false, message: 'Tidak bisa menjangkau server sumber.' });
  }
}
