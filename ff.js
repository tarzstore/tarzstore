export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ status: false, message: 'Parameter id wajib diisi.' });
  }

  try {
    const target = 'https://api.nexadev.my.id/api/ff?id=' + encodeURIComponent(id);
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
