// api/upload.js — Vercel Serverless Function
// Uploads an image to your GitHub repo via the GitHub Contents API
// POST /api/upload  { filename, base64Content, mimeType }
//   → { ok: boolean, url: string }

// Required Vercel env vars:
//   ADMIN_PASSWORD  — for implicit check (caller already authed)
//   GITHUB_TOKEN    — Personal Access Token with repo write scope
//   GITHUB_OWNER    — your GitHub username
//   GITHUB_REPO     — repository name
//   GITHUB_BRANCH   — branch (default: main)

// Tell Vercel to allow up to 6MB request bodies
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '6mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { filename, base64Content, mimeType } = req.body || {};

  if (!filename || !base64Content) {
    return res.status(400).json({ ok: false, error: 'Missing filename or content' });
  }

  const token  = process.env.GITHUB_TOKEN;
  const owner  = process.env.GITHUB_OWNER;
  const repo   = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!token || !owner || !repo) {
    return res.status(500).json({
      ok: false,
      error: 'GitHub env vars not set. Add GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO to Vercel env.'
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

  try {
    // Check if file already exists (need SHA to update)
    let sha = null;
    const checkRes = await fetch(apiUrl + `?ref=${branch}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    if (checkRes.ok) {
      const existing = await checkRes.json();
      sha = existing.sha;
    }

    // Create or update file
    const body = {
      message: `[artbook] Upload ${safeName}`,
      content: base64Content,
      branch
    };
    if (sha) body.sha = sha;

    const uploadRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      body: JSON.stringify(body)
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.json();
      return res.status(500).json({ ok: false, error: err.message || 'GitHub upload failed' });
    }

    // Return the proxy URL — hides GitHub repo from the frontend
    const rawUrl = `/api/img?f=${encodeURIComponent(safeName)}`;

    return res.status(200).json({ ok: true, url: rawUrl });

  } catch(e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
