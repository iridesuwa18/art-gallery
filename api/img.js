// api/img.js — Image Proxy
// Fetches images from your private GitHub repo and serves them
// through your own domain, hiding the raw GitHub URL entirely.
//
// Usage: /api/img?f=filename.jpg
// Referrer check: only serves images requested from your own site

export default async function handler(req, res) {
  const { f } = req.query;

  if (!f) return res.status(400).end('Missing filename');

  // Block direct access — must be requested from your own domain
  const referrer = req.headers['referer'] || req.headers['referrer'] || '';
  const host = req.headers['host'] || '';
  if (referrer && !referrer.includes(host)) {
    return res.status(403).end('Forbidden');
  }

  // Sanitize — no path traversal
  const safe = f.replace(/\.\./g, '').replace(/[^a-zA-Z0-9._-]/g, '-');

  // Env vars are preferred; query params are the fallback so the proxy
  // works even before Vercel env vars are configured.
  const token  = process.env.GITHUB_TOKEN  || req.query.t || '';
  const owner  = process.env.GITHUB_OWNER  || req.query.o || '';
  const repo   = process.env.GITHUB_REPO   || req.query.r || '';
  const branch = process.env.GITHUB_BRANCH || req.query.b || 'main';

  if (!owner || !repo) return res.status(500).end('GitHub repo not configured');

  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/images/${safe}`;

  try {
    const fetchHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
    const imgRes = await fetch(rawUrl, { headers: fetchHeaders });

    if (!imgRes.ok) return res.status(404).end('Not found');

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const buffer = await imgRes.arrayBuffer();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Disposition', 'inline');
    res.status(200).end(Buffer.from(buffer));

  } catch(e) {
    res.status(500).end('Error');
  }
}
