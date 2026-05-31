// api/img.js
// Fetches images from your GitHub repo and serves them through your
// own domain, hiding the raw GitHub URL entirely.
//
// Usage: /api/img?f=filename.jpg

export default async function handler(req, res) {
  const { searchParams } = new URL(req.url, `https://${req.headers.host}`);
  const f = searchParams.get('f');

  if (!f) {
    return res.status(400).send('Missing filename');
  }

  // Only block requests that explicitly come from a different domain.
  const referrer = req.headers['referer'] || req.headers['referrer'] || '';
  const host     = req.headers['host'] || '';
  if (referrer && !referrer.includes(host)) {
    return res.status(403).send('Forbidden');
  }

  // Sanitize — no path traversal
  const safe = f.replace(/\.\./g, '').replace(/[^a-zA-Z0-9._-]/g, '-');

  // Optional sub-directory param (e.g. d=brushes)
  const dirParam = searchParams.get('d') || '';
  const safeDir = dirParam.replace(/\.\./g, '').replace(/[^a-zA-Z0-9_-]/g, '');

  // Env vars preferred; query params are fallback
  const token  = process.env.GITHUB_TOKEN  || searchParams.get('t') || '';
  const owner  = process.env.GITHUB_OWNER  || searchParams.get('o') || '';
  const repo   = process.env.GITHUB_REPO   || searchParams.get('r') || '';
  const branch = process.env.GITHUB_BRANCH || searchParams.get('b') || 'main';

  if (!owner || !repo) {
    return res.status(500).send('GitHub repo not configured');
  }

  const folder = safeDir ? `${safeDir}/` : 'images/';
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${folder}${safe}`;

  try {
    const fetchHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
    const imgRes = await fetch(rawUrl, { headers: fetchHeaders });

    if (!imgRes.ok) return res.status(404).send('Not found');

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await imgRes.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Disposition', 'inline');
    return res.status(200).send(buffer);

  } catch {
    return res.status(500).send('Error');
  }
}
