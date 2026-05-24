// api/config.js
// Reads and writes artbook.json to your GitHub repo.
// POST /api/config  { config: object }  → { ok: boolean }
// GET  /api/config                      → artbook.json contents
//
// Required Vercel env vars:
//   GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH

export default async function handler(req, res) {
  const token  = process.env.GITHUB_TOKEN;
  const owner  = process.env.GITHUB_OWNER;
  const repo   = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!token || !owner || !repo) {
    return res.status(500).json({
      ok: false,
      error: 'GitHub env vars not configured. Set GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO in Vercel.'
    });
  }

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/artbook.json`;
  const ghHeaders = {
    'Authorization':        `Bearer ${token}`,
    'Accept':               'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  // ─── GET config ──────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const getRes = await fetch(`${apiUrl}?ref=${branch}`, { headers: ghHeaders });
      if (!getRes.ok) return res.status(404).json({ ok: false, error: 'artbook.json not found' });
      const fileData = await getRes.json();
      const content = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf8'));
      return res.status(200).json({ ok: true, config: content });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  // ─── POST config ─────────────────────────────────────────────
  if (req.method === 'POST') {
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      return res.status(400).json({ ok: false, error: 'Invalid JSON body' });
    }

    const { config } = body || {};
    if (!config) return res.status(400).json({ ok: false, error: 'Missing config' });

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
        return res.status(500).json({ ok: false, error: err.message || 'GitHub write failed' });
      }

      return res.status(200).json({ ok: true });

    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
