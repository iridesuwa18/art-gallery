// netlify/functions/upload.js
// Uploads an image to your GitHub repo via the GitHub Contents API.
// POST /api/upload  { filename, base64Content, mimeType }
//   → { ok: boolean, url: string }
//
// Required Netlify env vars:
//   GITHUB_TOKEN    — Personal Access Token with repo write scope
//   GITHUB_OWNER    — your GitHub username
//   GITHUB_REPO     — repository name
//   GITHUB_BRANCH   — branch (default: main)

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return json(400, { ok: false, error: 'Invalid JSON body: ' + e.message });
  }

  const { filename, base64Content, mimeType } = body;

  if (!filename || !base64Content) {
    return json(400, { ok: false, error: 'Missing filename or content' });
  }

  const token  = process.env.GITHUB_TOKEN;
  const owner  = process.env.GITHUB_OWNER;
  const repo   = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!token || !owner || !repo) {
    return json(500, {
      ok: false,
      error: 'GitHub env vars not set. Add GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO to Netlify env.'
    });
  }

  // Sanitize filename — no path traversal
  const safeName = filename
    .replace(/\.\./g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 128);

  const apiPath = `images/${safeName}`;
  const apiUrl  = `https://api.github.com/repos/${owner}/${repo}/contents/${apiPath}`;
  const ghHeaders = {
    'Authorization':       `Bearer ${token}`,
    'Accept':              'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  try {
    // Check if file already exists (need SHA to update)
    let sha = null;
    const checkRes = await fetch(`${apiUrl}?ref=${branch}`, { headers: ghHeaders });
    if (checkRes.ok) {
      const existing = await checkRes.json();
      sha = existing.sha;
    }

    // Create or update file
    const putBody = {
      message: `[artbook] Upload ${safeName}`,
      content: base64Content,
      branch
    };
    if (sha) putBody.sha = sha;

    const uploadRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: { ...ghHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(putBody)
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.json();
      return json(500, { ok: false, error: err.message || 'GitHub upload failed' });
    }

    // Return the proxy URL — hides GitHub repo from the frontend
    const proxyUrl = `/api/img?f=${encodeURIComponent(safeName)}`;
    return json(200, { ok: true, url: proxyUrl });

  } catch (e) {
    return json(500, { ok: false, error: e.message });
  }
};

// ── helpers ───────────────────────────────────────────────────

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type':  'application/json',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(body)
  };
}
