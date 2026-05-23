// netlify/functions/img.js
// Fetches images from your GitHub repo and serves them through your
// own domain, hiding the raw GitHub URL entirely.
//
// Usage (via redirect): /api/img?f=filename.jpg

exports.handler = async function (event) {
  const params = event.queryStringParameters || {};
  const f = params.f;

  if (!f) {
    return { statusCode: 400, body: 'Missing filename' };
  }

  // Only block requests that explicitly come from a different domain.
  // Don't block requests with no referrer — browsers often omit it.
  const referrer = event.headers['referer'] || event.headers['referrer'] || '';
  const host     = event.headers['host'] || '';
  if (referrer && !referrer.includes(host)) {
    return { statusCode: 403, body: 'Forbidden' };
  }

  // Sanitize — no path traversal
  const safe = f.replace(/\.\./g, '').replace(/[^a-zA-Z0-9._-]/g, '-');

  // Env vars are preferred; query params are the fallback so the proxy
  // works even before Netlify env vars are configured.
  const token  = process.env.GITHUB_TOKEN  || params.t || '';
  const owner  = process.env.GITHUB_OWNER  || params.o || '';
  const repo   = process.env.GITHUB_REPO   || params.r || '';
  const branch = process.env.GITHUB_BRANCH || params.b || 'main';

  if (!owner || !repo) {
    return { statusCode: 500, body: 'GitHub repo not configured' };
  }

  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/images/${safe}`;

  try {
    const fetchHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
    const imgRes = await fetch(rawUrl, { headers: fetchHeaders });

    if (!imgRes.ok) return { statusCode: 404, body: 'Not found' };

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const buffer = await imgRes.arrayBuffer();

    return {
      statusCode: 200,
      headers: {
        'Content-Type':        contentType,
        'Cache-Control':       'public, max-age=31536000, immutable',
        'Content-Disposition': 'inline'
      },
      // Netlify requires base64 for binary responses
      body:            Buffer.from(buffer).toString('base64'),
      isBase64Encoded: true
    };

  } catch {
    return { statusCode: 500, body: 'Error' };
  }
};
