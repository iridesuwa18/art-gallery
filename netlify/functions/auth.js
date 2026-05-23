// netlify/functions/auth.js
// Validates username + password against Netlify env vars.
// Returns { ok, githubToken, githubOwner } on success.
//
// Required Netlify env vars:
//   ADMIN_USERNAME    — admin username
//   ADMIN_PASSWORD    — admin password
//   GITHUB_TOKEN      — personal access token (repo scope)
//   GITHUB_OWNER      — your GitHub username (returned to frontend)

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { ok: false, error: 'Invalid JSON body' });
  }

  const { username, password } = body;

  if (!username || !password) {
    return json(400, { ok: false, error: 'Missing credentials' });
  }

  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    return json(500, {
      ok: false,
      error: 'ADMIN_USERNAME or ADMIN_PASSWORD not configured in Netlify env vars'
    });
  }

  const usernameMatch = timingSafeEqual(username, adminUsername);
  const passwordMatch = timingSafeEqual(password, adminPassword);

  if (usernameMatch && passwordMatch) {
    return json(200, {
      ok:          true,
      githubToken: process.env.GITHUB_TOKEN || '',
      githubOwner: process.env.GITHUB_OWNER || ''
    });
  }

  // Short delay to slow brute force
  await new Promise(r => setTimeout(r, 600));
  return json(401, { ok: false, error: 'Unauthorized' });
};

// ── helpers ───────────────────────────────────────────────────

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
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
