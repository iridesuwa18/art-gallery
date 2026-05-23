/* ═══════════════════════════════════════════════════════════
   admin.js — Admin Panel
   Hidden admin panel (double-click logo) with:
   - Password + GitHub credentials at login
   - GitHub image upload via /api/upload
   - Config save via /api/config (auto-save on upload + manual publish)
═══════════════════════════════════════════════════════════ */

'use strict';

// ─── STATE ───────────────────────────────────────────────────
let adminUnlocked = false;
let pendingPageId  = null; // which page we're adding an artwork to
let localConfig    = null; // working copy of artbook.json
let uploadFile     = null; // file staged for upload

// GitHub credentials captured at login
let ghCredentials = { owner: '', repo: '', branch: 'main', token: '' };

// ─── DOM ─────────────────────────────────────────────────────
const logo         = document.getElementById('siteLogo');
const adminOverlay = document.getElementById('adminOverlay');
const adminAuth    = document.getElementById('adminAuth');
const adminEditor  = document.getElementById('adminEditor');
const adminClose   = document.getElementById('adminClose');
const editorClose  = document.getElementById('editorClose');
const authPassword = document.getElementById('authPassword');
const authGhOwner  = document.getElementById('authGhOwner');
const authGhRepo   = document.getElementById('authGhRepo');
const authGhBranch = document.getElementById('authGhBranch');
const authSubmit   = document.getElementById('authSubmit');
const authError    = document.getElementById('authError');

const saveConfigBtn = document.getElementById('saveConfigBtn');
const addPageBtn    = document.getElementById('addPageBtn');
const pagesList     = document.getElementById('pagesList');

// Upload modal
const uploadOverlay = document.getElementById('uploadOverlay');
const uploadClose   = document.getElementById('uploadClose');
const dropZone      = document.getElementById('dropZone');
const fileInput     = document.getElementById('fileInput');
const browseBtn     = document.getElementById('browseBtn');
const dropInner     = document.getElementById('dropInner');
const uploadPreview = document.getElementById('uploadPreview');
const artFilename   = document.getElementById('artFilename');
const filenameExt   = document.getElementById('filenameExt');
const artTitle      = document.getElementById('artTitle');
const artDate       = document.getElementById('artDate');
const artDesc       = document.getElementById('artDesc');
const artTextPos    = document.getElementById('artTextPos');
const uploadSubmit  = document.getElementById('uploadSubmit');
const uploadProgress = document.getElementById('uploadProgress');
const progressFill  = document.getElementById('progressFill');
const progressLabel = document.getElementById('progressLabel');

// ─── OPEN / CLOSE ADMIN ───────────────────────────────────────
let clickCount = 0, clickTimer = null;

logo.addEventListener('click', () => {
  clickCount++;
  if (clickTimer) clearTimeout(clickTimer);
  clickTimer = setTimeout(() => {
    if (clickCount >= 2) openAdmin();
    clickCount = 0;
  }, 400);
});

function openAdmin() {
  adminOverlay.classList.add('open');
  if (!adminUnlocked) {
    adminAuth.style.display = 'block';
    adminEditor.style.display = 'none';
    authPassword.value = '';
    authError.textContent = '';
    setTimeout(() => authPassword.focus(), 100);
  } else {
    showEditor();
  }
}

function closeAdmin() {
  adminOverlay.classList.remove('open');
}

adminClose.addEventListener('click', closeAdmin);
editorClose.addEventListener('click', closeAdmin);

adminOverlay.addEventListener('click', (e) => {
  if (e.target === adminOverlay) closeAdmin();
});

// ─── AUTH ─────────────────────────────────────────────────────
authSubmit.addEventListener('click', attemptAuth);
[authPassword, authGhOwner, authGhRepo, authGhBranch].forEach(el => {
  el.addEventListener('keydown', e => { if (e.key === 'Enter') attemptAuth(); });
});

async function attemptAuth() {
  const pw    = authPassword.value.trim();
  const owner = authGhOwner.value.trim();
  const repo  = authGhRepo.value.trim();

  if (!pw) { authError.textContent = 'Please enter your password.'; return; }
  if (!owner || !repo) { authError.textContent = 'GitHub Owner and Repository are required.'; return; }

  authSubmit.textContent = '…';
  authSubmit.disabled = true;
  authError.textContent = '';

  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw })
    });

    const data = await res.json();

    if (data.ok) {
      // Store credentials for use in upload/save
      ghCredentials = {
        owner,
        repo,
        branch: authGhBranch.value.trim() || 'main',
        token:  data.githubToken || ''
      };
      adminUnlocked = true;
      showEditor();
    } else {
      authError.textContent = 'Incorrect password.';
    }
  } catch(e) {
    authError.textContent = 'Could not reach server. Check your Vercel deployment.';
  }

  authSubmit.textContent = 'Unlock';
  authSubmit.disabled = false;
}

function showEditor() {
  adminAuth.style.display = 'none';
  adminEditor.style.display = 'block';

  // Deep clone current artbook config
  const viewer = window._artbookViewer;
  localConfig = JSON.parse(JSON.stringify(viewer.getArtbook() || { pages: [] }));
  if (!localConfig.pages) localConfig.pages = [];

  // Seed config with credentials from login
  localConfig.githubOwner  = ghCredentials.owner;
  localConfig.githubRepo   = ghCredentials.repo;
  localConfig.githubBranch = ghCredentials.branch;

  renderPagesList();
}

// ─── PAGES LIST ───────────────────────────────────────────────
function renderPagesList() {
  pagesList.innerHTML = '';
  localConfig.pages.forEach((page, i) => {
    const card = buildPageCard(page, i);
    pagesList.appendChild(card);
  });
}

function buildPageCard(page, index) {
  const template = document.getElementById('pageCardTemplate');
  const card = template.content.cloneNode(true).querySelector('.page-card');

  card.dataset.pageId = page.id;

  // Page number label
  card.querySelector('.page-card-num').textContent = `Page ${index + 1}`;

  // Layout select
  const layoutSelect = card.querySelector('.layout-select');
  layoutSelect.value = page.layout || 'large';
  layoutSelect.addEventListener('change', () => {
    page.layout = layoutSelect.value;
  });

  // Delete page
  card.querySelector('.delete-page-btn').addEventListener('click', () => {
    if (!confirm(`Delete Page ${index + 1} and all its artworks?`)) return;
    localConfig.pages.splice(index, 1);
    renderPagesList();
  });

  // Artwork rows
  const artworksList = card.querySelector('.page-artworks-list');
  (page.artworks || []).forEach((art, ai) => {
    artworksList.appendChild(buildArtworkRow(art, page, ai));
  });

  // Add artwork
  card.querySelector('.add-artwork-btn').addEventListener('click', () => {
    openUploadModal(page.id);
  });

  return card;
}

function buildArtworkRow(art, page, artIndex) {
  const row = document.createElement('div');
  row.className = 'artwork-row';

  const thumb = document.createElement('img');
  thumb.className = 'artwork-row-thumb';
  thumb.src = art.url || '';
  thumb.alt = art.title || '';
  thumb.draggable = false;

  const info = document.createElement('div');
  info.className = 'artwork-row-info';
  info.innerHTML = `
    <div class="artwork-row-title">${esc(art.title || 'Untitled')}</div>
    <div class="artwork-row-sub">${esc(art.date || '')} · ${esc(art.textPosition === 'left' ? 'Text L' : 'Text R')}</div>
  `;

  const del = document.createElement('button');
  del.className = 'icon-btn';
  del.title = 'Remove artwork';
  del.textContent = '✕';
  del.addEventListener('click', () => {
    page.artworks.splice(artIndex, 1);
    renderPagesList();
  });

  row.appendChild(thumb);
  row.appendChild(info);
  row.appendChild(del);
  return row;
}

// ─── ADD PAGE ─────────────────────────────────────────────────
addPageBtn.addEventListener('click', () => {
  const newPage = {
    id: 'page_' + Date.now(),
    layout: 'large',
    artworks: []
  };
  localConfig.pages.push(newPage);
  renderPagesList();
  pagesList.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ─── SAVE / PUBLISH CONFIG ────────────────────────────────────
saveConfigBtn.addEventListener('click', saveConfig);

async function saveConfig(silent = false) {
  // Ensure credentials are always current
  localConfig.githubOwner  = ghCredentials.owner;
  localConfig.githubRepo   = ghCredentials.repo;
  localConfig.githubBranch = ghCredentials.branch;

  if (!silent) {
    saveConfigBtn.textContent = 'Publishing…';
    saveConfigBtn.disabled = true;
  }

  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: localConfig })
    });

    const data = await res.json();

    if (data.ok) {
      window._artbookViewer.setArtbook(localConfig);
      window._artbookViewer.rerender();
      if (!silent) {
        saveConfigBtn.textContent = '✓ Published';
        setTimeout(() => { saveConfigBtn.textContent = 'Publish'; }, 2000);
      }
      return true;
    } else {
      if (!silent) alert('Publish failed: ' + (data.error || 'unknown error'));
      return false;
    }
  } catch(e) {
    if (!silent) alert('Publish failed: ' + e.message);
    return false;
  } finally {
    if (!silent) saveConfigBtn.disabled = false;
  }
}

// ─── UPLOAD MODAL ─────────────────────────────────────────────
function openUploadModal(pageId) {
  pendingPageId = pageId;
  uploadFile    = null;

  // Reset form
  artFilename.value = '';
  filenameExt.textContent = '.jpg';
  artTitle.value = '';
  artDate.value  = new Date().toISOString().slice(0, 10);
  artDesc.value  = '';
  artTextPos.value = 'right';
  uploadPreview.style.display = 'none';
  uploadPreview.src = '';
  dropInner.style.display = 'flex';
  uploadProgress.style.display = 'none';
  progressFill.style.width = '0%';
  uploadSubmit.disabled = false;
  uploadSubmit.textContent = 'Upload & Add';

  uploadOverlay.style.display = 'flex';
}

uploadClose.addEventListener('click', () => { uploadOverlay.style.display = 'none'; });
uploadOverlay.addEventListener('click', e => { if (e.target === uploadOverlay) uploadOverlay.style.display = 'none'; });

// File input
browseBtn.addEventListener('click', e => { e.stopPropagation(); fileInput.click(); });
dropZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) stageFile(fileInput.files[0]);
});

// Drag-drop
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) stageFile(file);
});

function stageFile(file) {
  uploadFile = file;

  const extMatch = file.name.match(/\.[^.]+$/);
  const ext = extMatch ? extMatch[0].toLowerCase() : '';
  filenameExt.textContent = ext;

  if (!artFilename.value) {
    artFilename.value = file.name
      .replace(/\.[^.]+$/, '')
      .replace(/[-_]/g, ' ')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }

  const reader = new FileReader();
  reader.onload = evt => {
    uploadPreview.src = evt.target.result;
    uploadPreview.style.display = 'block';
    dropInner.style.display = 'none';
  };
  reader.readAsDataURL(file);

  if (!artTitle.value) {
    artTitle.value = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
  }
}

// Upload submit
uploadSubmit.addEventListener('click', doUpload);

async function doUpload() {
  if (!uploadFile) { alert('Please select an image first.'); return; }

  const title   = artTitle.value.trim() || 'Untitled';
  const date    = artDate.value;
  const desc    = artDesc.value.trim();
  const textPos = artTextPos.value;

  uploadSubmit.disabled = true;
  uploadSubmit.textContent = 'Uploading…';
  uploadProgress.style.display = 'flex';
  setProgress(10, 'Reading file…');

  try {
    // Compress client-side: longest edge ≤ 2400px, JPEG 0.88
    // This keeps the payload reasonable but the real fix is going
    // directly to GitHub's API — no Vercel body size limit.
    const base64DataUrl = await compressImage(uploadFile, 2400, 0.88);
    const base64Content = base64DataUrl.split(',')[1];

    setProgress(30, 'Uploading to GitHub…');

    const { owner, repo, branch, token } = ghCredentials;

    const extMatch = uploadFile.name.match(/\.[^.]+$/);
    const ext = extMatch ? extMatch[0].toLowerCase() : '.jpg';
    const baseName = artFilename.value.trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'artwork';
    const filename  = baseName + '.jpg'; // compressImage always outputs JPEG
    const apiPath   = `images/${filename}`;
    const apiUrl    = `https://api.github.com/repos/${owner}/${repo}/contents/${apiPath}`;

    const ghHeaders = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28'
    };

    // Check if file already exists (need SHA to update)
    let sha = null;
    try {
      const checkRes = await fetch(`${apiUrl}?ref=${branch}`, { headers: ghHeaders });
      if (checkRes.ok) {
        const existing = await checkRes.json();
        sha = existing.sha;
      }
    } catch { /* new file, no SHA needed */ }

    setProgress(50, 'Writing to repo…');

    const putBody = { message: `[artbook] Upload ${filename}`, content: base64Content, branch };
    if (sha) putBody.sha = sha;

    const uploadRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: ghHeaders,
      body: JSON.stringify(putBody)
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}));
      throw new Error(err.message || `GitHub upload failed (${uploadRes.status})`);
    }

    setProgress(75, 'Adding to artbook…');

    // The image URL goes through our /api/img proxy to hide the raw GitHub URL
    const proxyUrl = `/api/img?f=${encodeURIComponent(filename)}`;

    const targetPage = localConfig.pages.find(p => p.id === pendingPageId);
    if (targetPage) {
      if (!targetPage.artworks) targetPage.artworks = [];
      targetPage.artworks.push({
        id:           'art_' + Date.now(),
        url:          proxyUrl,
        title,
        date,
        description:  desc,
        textPosition: textPos
      });
    }

    setProgress(90, 'Saving config…');

    const saved = await saveConfig(true);
    if (!saved) throw new Error('Config save failed after upload');

    setProgress(100, 'Done!');

    setTimeout(() => {
      uploadOverlay.style.display = 'none';
      renderPagesList();
    }, 600);

  } catch(e) {
    alert('Upload failed: ' + e.message);
    uploadProgress.style.display = 'none';
    uploadSubmit.disabled = false;
    uploadSubmit.textContent = 'Upload & Add';
  }
}

function setProgress(pct, label) {
  progressFill.style.width = pct + '%';
  progressLabel.textContent = label;
}

// ─── UTILS ───────────────────────────────────────────────────
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Compress + resize an image file to a data URL (always JPEG output).
// maxEdge: longest side in pixels. quality: 0–1 JPEG quality.
function compressImage(file, maxEdge = 2400, quality = 0.88) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = evt => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;

        // Scale down if needed
        if (width > maxEdge || height > maxEdge) {
          if (width >= height) {
            height = Math.round((height / width) * maxEdge);
            width  = maxEdge;
          } else {
            width  = Math.round((width / height) * maxEdge);
            height = maxEdge;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width  = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        // White background so transparent PNGs don't go black
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
