// api/auth.js — Vercel Serverless Function
// Verifies the admin password against the ADMIN_PASSWORD env variable
// POST /api/auth  { password: string }  → { ok: boolean }

export default function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { password } = req.body || {};

  if (!password) {
    return res.status(400).json({ ok: false, error: 'Missing password' });
  }

  // Compare against env variable (set in Vercel dashboard)
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return res.status(500).json({ ok: false, error: 'ADMIN_PASSWORD not configured in Vercel env vars' });
  }

  // Constant-time comparison to prevent timing attacks
  const match = timingSafeEqual(password, adminPassword);

  if (match) {
    // Return the GitHub token so the browser can upload directly to GitHub,
    // bypassing Vercel's request body size limit entirely.
    return res.status(200).json({
      ok: true,
      githubToken: process.env.GITHUB_TOKEN || ''
    });
  } else {
    // Short delay to slow brute force
    setTimeout(() => {
      res.status(401).json({ ok: false, error: 'Unauthorized' });
    }, 500);
  }
}

// Simple constant-time string comparison
function timingSafeEqual(a, b) {
  if (a.length !== b.length) {
    // Still iterate to avoid timing leak from length check
    let diff = 0;
    for (let i = 0; i < Math.max(a.length, b.length); i++) diff++;
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
