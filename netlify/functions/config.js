// netlify/functions/config.js
// Reads and writes artbook.json to your GitHub repo.
// POST /api/config  { config: object }  → { ok: boolean }
// GET  /api/config                      → artbook.json contents
//
// Required Netlify env vars:
//   GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH

exports.handler = async function (event) {
  const token  = process.env.GITHUB_TOKEN;
  const owner  = process.env.GITHUB_OWNER;
  const repo   = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!token || !owner || !repo) {
    return json(500, {
      ok: false,
      error: 'GitHub env vars not configured. Set GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO in Netlify.'
    });
  }

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/artbook.json`;
  const ghHeaders = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  // ─── GET config ──────────────────────────────────────────────
  if (event.httpMethod === 'GET') {
    try {
      const getRes = await fetch(`${apiUrl}?ref=${branch}`, { headers: ghHeaders });
      if (!getRes.ok) return json(404, { ok: false, error: 'artbook.json not found' });
      const fileData = await getRes.json();
      const content = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf8'));
      return json(200, { ok: true, config: content });
    } catch (e) {
      return json(500, { ok: false, error: e.message });
    }
  }

  // ─── POST config ─────────────────────────────────────────────
  if (event.httpMethod === 'POST') {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return json(400, { ok: false, error: 'Invalid JSON body' });
    }

    const { config } = body;
    if (!config) return json(400, { ok: false, error: 'Missing config' });

    try {
      // Get current SHA (needed for update)
      let sha = null;
      const checkRes = await fetch(`${apiUrl}?ref=${branch}`, { headers: ghHeaders });
      if (checkRes.ok) {
        const existing = await checkRes.json();
        sha = existing.sha;
      }

      const newContent = Buffer.from(JSON.stringify(config, null, 2), 'utf8').toString('base64');

      const putBody = {
        message: '[artbook] Update artbook configuration',
        content: newContent,
        branch
      };
      if (sha) putBody.sha = sha;

      const putRes = await fetch(apiUrl, {
        method: 'PUT',
        headers: { ...ghHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(putBody)
      });

      if (!putRes.ok) {
        const err = await putRes.json();
        return json(500, { ok: false, error: err.message || 'GitHub write failed' });
      }

      return json(200, { ok: true });

    } catch (e) {
      return json(500, { ok: false, error: e.message });
    }
  }

  return json(405, { ok: false, error: 'Method not allowed' });
};

// ── helpers ───────────────────────────────────────────────────

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}
