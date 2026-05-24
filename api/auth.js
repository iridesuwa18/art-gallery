// api/auth.js
// Validates username + password against Vercel env vars.
// Returns { ok, githubToken, githubOwner } on success.
//
// Required Vercel env vars:
//   ADMIN_USERNAME    — admin username
//   ADMIN_PASSWORD    — admin password
//   GITHUB_TOKEN      — personal access token (repo scope)
//   GITHUB_OWNER      — your GitHub username (returned to frontend)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid JSON body' });
  }

  const { username, password } = body || {};

  if (!username || !password) {
    return res.status(400).json({ ok: false, error: 'Missing credentials' });
  }

  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    return res.status(500).json({
      ok: false,
      error: 'ADMIN_USERNAME or ADMIN_PASSWORD not configured in Vercel env vars'
    });
  }

  const usernameMatch = timingSafeEqual(username, adminUsername);
  const passwordMatch = timingSafeEqual(password, adminPassword);

  if (usernameMatch && passwordMatch) {
    return res.status(200).json({
      ok:          true,
      githubToken: process.env.GITHUB_TOKEN || '',
      githubOwner: process.env.GITHUB_OWNER || ''
    });
  }

  // Short delay to slow brute force
  await new Promise(r => setTimeout(r, 600));
  return res.status(401).json({ ok: false, error: 'Unauthorized' });
}

// Constant-time string comparison (prevents timing attacks)
function timingSafeEqual(a, b) {
  const maxLen = Math.max(a.length, b.length);
  let diff = a.length !== b.length ? 1 : 0;
  for (let i = 0; i < maxLen; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}
