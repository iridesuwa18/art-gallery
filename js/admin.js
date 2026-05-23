/* ═══════════════════════════════════════════════════════════
   admin.js — Admin Panel  v2
   • Username + password login → auto-fills repo "art-gallery" / branch "main"
   • No Publish button — all changes autosave immediately
   • Direct GitHub upload (browser → GitHub API), no Vercel body limit
   • File viewer: browse/delete images in the repo
   • Page folders (accordion), duplicate filename detection
═══════════════════════════════════════════════════════════ */

'use strict';

// ─── STATE ───────────────────────────────────────────────────
let adminUnlocked = false;
let pendingPageId  = null;
let localConfig    = null;
let uploadFile     = null;
let autoSaveTimer  = null;
let fileViewerMode = 'browse'; // 'browse' | 'pick' (pick = select to replace/use)
let ghCredentials  = { owner: '', repo: 'art-gallery', branch: 'main', token: '' };
let pendingFocalX  = 50;       // flood layout horizontal focal point (0-100)

// ─── DOM REFS ────────────────────────────────────────────────
const settingsBtn  = document.getElementById('settingsBtn');
const adminOverlay    = document.getElementById('adminOverlay');
const adminAuth       = document.getElementById('adminAuth');
const adminEditor     = document.getElementById('adminEditor');
const adminClose      = document.getElementById('adminClose');
const editorClose     = document.getElementById('editorClose');

// Auth
const authUsername    = document.getElementById('authUsername');
const authPassword    = document.getElementById('authPassword');
const authEyeBtn      = document.getElementById('authEyeBtn');
const authSubmit      = document.getElementById('authSubmit');
const authError       = document.getElementById('authError');

// Editor
const autosaveDot     = document.getElementById('autosaveDot');
const autosaveLabel   = document.getElementById('autosaveLabel');
const addPageBtn      = document.getElementById('addPageBtn');
const pagesList       = document.getElementById('pagesList');
const openFileViewerBtn = document.getElementById('openFileViewerBtn');

// Upload modal
const uploadOverlay   = document.getElementById('uploadOverlay');
const uploadClose     = document.getElementById('uploadClose');
const uploadCancel    = document.getElementById('uploadCancel');
const dropZone        = document.getElementById('dropZone');
const fileInput       = document.getElementById('fileInput');
const browseBtn       = document.getElementById('browseBtn');
const dropInner       = document.getElementById('dropInner');
const uploadPreview   = document.getElementById('uploadPreview');
const artFilename     = document.getElementById('artFilename');
const filenameExt     = document.getElementById('filenameExt');
const artTitle        = document.getElementById('artTitle');
const artDate         = document.getElementById('artDate');
const artDesc         = document.getElementById('artDesc');
const artTextPos      = document.getElementById('artTextPos');
const uploadSubmit    = document.getElementById('uploadSubmit');
const uploadProgress  = document.getElementById('uploadProgress');
const progressFill    = document.getElementById('progressFill');
const progressLabel   = document.getElementById('progressLabel');
const openFileViewerUploadBtn = document.getElementById('openFileViewerUploadBtn');

// File viewer modal
const fileViewerOverlay = document.getElementById('fileViewerOverlay');
const fileViewerClose   = document.getElementById('fileViewerClose');
const fvGrid            = document.getElementById('fvGrid');
const fvCount           = document.getElementById('fvCount');
const fvRefreshBtn      = document.getElementById('fvRefreshBtn');

// Confirm replace modal
const replaceOverlay    = document.getElementById('replaceOverlay');
const replaceFilename   = document.getElementById('replaceFilename');
const replaceCancel     = document.getElementById('replaceCancel');
const replaceOk         = document.getElementById('replaceOk');

// Flood position modal
const floodPosOverlay      = document.getElementById('floodPosOverlay');
const floodPosClose        = document.getElementById('floodPosClose');
const floodPosCancel       = document.getElementById('floodPosCancel');
const floodPosConfirm      = document.getElementById('floodPosConfirm');
const floodPosA4           = document.getElementById('floodPosA4');
const floodPosImg          = document.getElementById('floodPosImg');
const floodPosHandle       = document.getElementById('floodPosHandle');
const floodPosFill         = document.getElementById('floodPosFill');
const floodPosKnob         = document.getElementById('floodPosKnob');
const floodPosPct          = document.getElementById('floodPosPct');
const floodPosCaptionTitle = document.getElementById('floodPosCaptionTitle');
const floodPosTrack        = document.getElementById('floodPosTrack');

// ─── OPEN / CLOSE ADMIN (double-click logo) ───────────────────
settingsBtn.addEventListener('click', () => openAdmin());

function openAdmin() {
  adminOverlay.classList.add('open');
  if (!adminUnlocked) {
    adminAuth.style.display = 'flex';
    adminEditor.style.display = 'none';
    authUsername.value = '';
    authPassword.value = '';
    authError.textContent = '';
    setTimeout(() => authUsername.focus(), 80);
  } else {
    showEditor();
  }
}

function closeAdmin() { adminOverlay.classList.remove('open'); }

adminClose.addEventListener('click', closeAdmin);
editorClose.addEventListener('click', closeAdmin);
adminOverlay.addEventListener('click', e => { if (e.target === adminOverlay) closeAdmin(); });

// ─── PASSWORD EYE TOGGLE ──────────────────────────────────────
authEyeBtn.addEventListener('click', () => {
  const isPass = authPassword.type === 'password';
  authPassword.type = isPass ? 'text' : 'password';
  authEyeBtn.setAttribute('aria-label', isPass ? 'Hide password' : 'Show password');
});

// ─── AUTH ─────────────────────────────────────────────────────
authSubmit.addEventListener('click', attemptAuth);
[authUsername, authPassword].forEach(el => {
  el.addEventListener('keydown', e => { if (e.key === 'Enter') attemptAuth(); });
});

async function attemptAuth() {
  const username = authUsername.value.trim();
  const pw       = authPassword.value.trim();

  if (!username || !pw) {
    authError.textContent = 'Please enter username and password.';
    return;
  }

  authSubmit.textContent = '…';
  authSubmit.disabled = true;
  authError.textContent = '';

  try {
    // Send username + password to /api/auth
    // The server validates and returns { ok, githubToken, githubOwner }
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: pw })
    });

    const data = await res.json();

    if (data.ok) {
      ghCredentials = {
        owner:  data.githubOwner || '',
        repo:   'art-gallery',
        branch: 'main',
        token:  data.githubToken || ''
      };
      adminUnlocked = true;
      showEditor();
    } else {
      authError.textContent = 'Incorrect login.';
    }
  } catch {
    authError.textContent = 'Could not reach server. Check your Vercel deployment.';
  }

  authSubmit.textContent = 'Sign In';
  authSubmit.disabled = false;
}

function showEditor() {
  adminAuth.style.display = 'none';
  adminEditor.style.display = 'flex';

  const viewer = window._artbookViewer;
  localConfig = JSON.parse(JSON.stringify(viewer.getArtbook() || { pages: [] }));
  if (!localConfig.pages) localConfig.pages = [];

  // Embed credentials in config (kept for /api/config server-side use)
  localConfig.githubOwner  = ghCredentials.owner;
  localConfig.githubRepo   = ghCredentials.repo;
  localConfig.githubBranch = ghCredentials.branch;

  renderPagesList();
  setAutosaveState('idle');
}

// ─── AUTOSAVE ─────────────────────────────────────────────────
function setAutosaveState(state, message) {
  autosaveDot.className = 'autosave-dot';
  switch(state) {
    case 'saving':
      autosaveDot.classList.add('saving');
      autosaveLabel.textContent = 'Saving…';
      break;
    case 'saved':
      autosaveDot.classList.add('saved');
      autosaveLabel.textContent = message || 'All changes saved';
      break;
    case 'error':
      autosaveDot.classList.add('error');
      autosaveLabel.textContent = message || 'Save failed';
      break;
    default:
      autosaveLabel.textContent = 'All changes saved';
  }
}

function scheduleAutosave(immediate = false) {
  clearTimeout(autoSaveTimer);
  const delay = immediate ? 0 : 1200;
  autoSaveTimer = setTimeout(() => doAutosave(), delay);
}

async function doAutosave() {
  setAutosaveState('saving');
  const saved = await saveConfig(true);
  if (saved) {
    setAutosaveState('saved');
  } else {
    setAutosaveState('error', 'Save failed — retry later');
  }
}

// ─── SAVE CONFIG ──────────────────────────────────────────────
async function saveConfig(silent = false) {
  localConfig.githubOwner  = ghCredentials.owner;
  localConfig.githubRepo   = ghCredentials.repo;
  localConfig.githubBranch = ghCredentials.branch;

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
      return true;
    }
    return false;
  } catch { return false; }
}

// ─── PAGES LIST ───────────────────────────────────────────────
function renderPagesList() {
  pagesList.innerHTML = '';
  localConfig.pages.forEach((page, i) => {
    pagesList.appendChild(buildPageFolder(page, i));
  });
}

function buildPageFolder(page, index) {
  const template = document.getElementById('pageCardTemplate');
  const folder = template.content.cloneNode(true).querySelector('.page-folder');

  folder.dataset.pageId = page.id;

  // Page number
  folder.querySelector('.pf-num').textContent = `Page ${index + 1}`;

  // Fold/unfold — clicking anywhere on the header except the right-side controls toggles open/closed
  const header = folder.querySelector('.page-folder-header');
  header.addEventListener('click', e => {
    if (e.target.closest('.pf-right')) return;
    folder.classList.toggle('open');
  });

  // Layout select
  const layoutSelect = folder.querySelector('.layout-select');
  layoutSelect.value = page.layout || 'large';
  layoutSelect.addEventListener('change', () => {
    page.layout = layoutSelect.value;
    scheduleAutosave();
  });

  // Delete page
  folder.querySelector('.delete-page-btn').addEventListener('click', e => {
    if (!confirm(`Delete Page ${index + 1} and all its artworks?`)) return;
    localConfig.pages.splice(index, 1);
    renderPagesList();
    scheduleAutosave();
  });

  // Artwork rows
  const artworksList = folder.querySelector('.page-artworks-list');
  (page.artworks || []).forEach((art, ai) => {
    artworksList.appendChild(buildArtworkRow(art, page, ai));
  });

  // Add artwork button
  folder.querySelector('.add-artwork-btn').addEventListener('click', () => {
    const maxImages = maxImagesForLayout(page.layout || 'large');
    if ((page.artworks || []).length >= maxImages) {
      alert(`This layout allows a maximum of ${maxImages} image${maxImages > 1 ? 's' : ''}. Change the layout to add more.`);
      return;
    }
    openUploadModal(page.id);
  });

  return folder;
}

function maxImagesForLayout(layout) {
  switch(layout) {
    case 'flood':  return 1;
    case 'large':  return 1;
    case 'medium': return 2;
    case 'small':  return 4;
    default:       return 1;
  }
}

function buildArtworkRow(art, page, artIndex) {
  const row = document.createElement('div');
  row.className = 'artwork-row';

  const thumb = document.createElement('img');
  thumb.className = 'artwork-row-thumb';
  // If URL is a proxy path without credentials, append them so thumbnail loads
  thumb.src = enrichProxyUrl(art.url || '');
  thumb.alt = art.title || '';
  thumb.onerror = () => { thumb.style.opacity = '0.3'; };

  const info = document.createElement('div');
  info.className = 'artwork-row-info';
  const isFloodPage = page.layout === 'flood';
  info.innerHTML = `
    <div class="artwork-row-title">${esc(art.title || 'Untitled')}</div>
    <div class="artwork-row-sub">${esc(art.date || '')}${art.date ? ' · ' : ''}${isFloodPage ? `Focus ${art.focalX !== undefined ? art.focalX : 50}%` : (art.textPosition === 'left' ? 'Text L' : 'Text R')}</div>
  `;

  // For flood pages, add an "Edit position" button
  if (isFloodPage) {
    const editPosBtn = document.createElement('button');
    editPosBtn.className = 'artwork-row-edit-pos';
    editPosBtn.textContent = 'Position';
    editPosBtn.title = 'Adjust horizontal crop position';
    editPosBtn.addEventListener('click', () => {
      const imgSrc = enrichProxyUrl(art.url);
      openFloodPosPicker(imgSrc, art.title || '', art.focalX !== undefined ? art.focalX : 50, (chosen) => {
        art.focalX = chosen;
        renderPagesList();
        scheduleAutosave();
      });
    });
    row.appendChild(thumb);
    row.appendChild(info);
    row.appendChild(editPosBtn);
  } else {
    row.appendChild(thumb);
    row.appendChild(info);
  }

  const del = document.createElement('button');
  del.className = 'icon-btn';
  del.title = 'Remove artwork';
  del.innerHTML = `<svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1 1l9 9M10 1L1 10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;
  del.addEventListener('click', () => {
    page.artworks.splice(artIndex, 1);
    renderPagesList();
    scheduleAutosave();
  });

  row.appendChild(del);
  return row;
}

// ─── ADD PAGE ─────────────────────────────────────────────────
addPageBtn.addEventListener('click', () => {
  const newPage = { id: 'page_' + Date.now(), layout: 'large', artworks: [] };
  localConfig.pages.push(newPage);
  renderPagesList();
  // Auto-open the newly added folder
  const folders = pagesList.querySelectorAll('.page-folder');
  folders[folders.length - 1]?.classList.add('open');
  folders[folders.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  scheduleAutosave();
});

// ─── UPLOAD MODAL ─────────────────────────────────────────────
function openUploadModal(pageId) {
  pendingPageId = pageId;
  uploadFile    = null;
  pendingFocalX = 50;

  // Detect if this page uses flood layout (hides text-position field)
  const page = localConfig.pages.find(p => p.id === pageId);
  const isFlood = page?.layout === 'flood';
  const textPosLabel = artTextPos.closest('.field-label');
  if (textPosLabel) textPosLabel.style.display = isFlood ? 'none' : '';

  artFilename.value    = '';
  filenameExt.textContent = '.jpg';
  artTitle.value       = '';
  artDate.value        = new Date().toISOString().slice(0, 10);
  artDesc.value        = '';
  artTextPos.value     = 'right';
  uploadPreview.style.display = 'none';
  uploadPreview.src    = '';
  dropInner.style.display = 'flex';
  uploadProgress.style.display = 'none';
  progressFill.style.width = '0%';
  uploadSubmit.disabled = false;
  uploadSubmit.textContent = isFlood ? 'Upload & Set Position…' : 'Upload & Add';

  uploadOverlay.style.display = 'flex';
}

function closeUploadModal() { uploadOverlay.style.display = 'none'; }

uploadClose.addEventListener('click', closeUploadModal);
uploadCancel.addEventListener('click', closeUploadModal);
uploadOverlay.addEventListener('click', e => { if (e.target === uploadOverlay) closeUploadModal(); });

// File picker
browseBtn.addEventListener('click', e => { e.stopPropagation(); fileInput.click(); });
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => { if (fileInput.files[0]) stageFile(fileInput.files[0]); });

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
  const ext = extMatch ? extMatch[0].toLowerCase() : '.jpg';
  filenameExt.textContent = ext;

  if (!artFilename.value) {
    artFilename.value = file.name
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }
  if (!artTitle.value) {
    artTitle.value = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
  }

  const reader = new FileReader();
  reader.onload = evt => {
    uploadPreview.src = evt.target.result;
    uploadPreview.style.display = 'block';
    dropInner.style.display = 'none';

    // For flood layout, auto-open the position picker once image is staged
    const page = localConfig.pages.find(p => p.id === pendingPageId);
    if (page?.layout === 'flood') {
      openFloodPosPicker(evt.target.result, artTitle.value || file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '), pendingFocalX, (chosen) => {
        pendingFocalX = chosen;
        uploadSubmit.textContent = 'Upload & Add';
      });
    }
  };
  reader.readAsDataURL(file);
}

// ─── UPLOAD SUBMIT ────────────────────────────────────────────
uploadSubmit.addEventListener('click', () => initiateUpload());

async function initiateUpload() {
  if (!uploadFile) { alert('Please select an image first.'); return; }

  const baseName = artFilename.value.trim()
    .toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'artwork';
  const filename  = baseName + '.jpg';

  // Check if file exists in repo
  const { owner, repo, branch, token } = ghCredentials;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/images/${filename}`;
  const ghHeaders = buildGhHeaders(token);

  try {
    const checkRes = await fetch(`${apiUrl}?ref=${branch}`, { headers: ghHeaders });
    if (checkRes.ok) {
      // File exists — ask to replace
      showReplaceConfirm(filename, () => doUpload(filename));
      return;
    }
  } catch { /* no file, proceed */ }

  doUpload(filename);
}

function showReplaceConfirm(filename, onOk) {
  replaceFilename.textContent = filename;
  replaceOverlay.style.display = 'flex';

  const cleanup = () => { replaceOverlay.style.display = 'none'; };

  replaceOk.onclick = () => { cleanup(); onOk(); };
  replaceCancel.onclick = cleanup;
  replaceOverlay.onclick = e => { if (e.target === replaceOverlay) cleanup(); };
}

async function doUpload(filename) {
  const title   = artTitle.value.trim() || 'Untitled';
  const date    = artDate.value;
  const desc    = artDesc.value.trim();
  const textPos = artTextPos.value;
  const page    = localConfig.pages.find(p => p.id === pendingPageId);
  const isFlood = page?.layout === 'flood';

  uploadSubmit.disabled = true;
  uploadSubmit.textContent = 'Uploading…';
  uploadProgress.style.display = 'flex';
  setProgress(10, 'Compressing…');

  try {
    const base64DataUrl = await compressImage(uploadFile, 2400, 0.88);
    const base64Content = base64DataUrl.split(',')[1];

    setProgress(30, 'Uploading to GitHub…');

    const { owner, repo, branch, token } = ghCredentials;
    const apiPath = `images/${filename}`;
    const apiUrl  = `https://api.github.com/repos/${owner}/${repo}/contents/${apiPath}`;
    const ghHeaders = buildGhHeaders(token);

    // Get SHA if exists (for update)
    let sha = null;
    try {
      const checkRes = await fetch(`${apiUrl}?ref=${branch}`, { headers: ghHeaders });
      if (checkRes.ok) sha = (await checkRes.json()).sha;
    } catch { /* new file */ }

    setProgress(50, 'Writing to repository…');

    const putBody = { message: `[artbook] Upload ${filename}`, content: base64Content, branch };
    if (sha) putBody.sha = sha;

    const uploadRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: { ...ghHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(putBody)
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}));
      throw new Error(err.message || `GitHub upload failed (${uploadRes.status})`);
    }

    setProgress(75, 'Adding to gallery…');

    // Build image URL — use proxy so GitHub token isn't exposed
    const proxyUrl = `/api/img?f=${encodeURIComponent(filename)}`;

    const targetPage = localConfig.pages.find(p => p.id === pendingPageId);
    if (targetPage) {
      if (!targetPage.artworks) targetPage.artworks = [];
      const artEntry = {
        id:           'art_' + Date.now(),
        url:          proxyUrl,
        title,
        date,
        description:  desc,
        textPosition: textPos
      };
      if (isFlood) artEntry.focalX = pendingFocalX;
      targetPage.artworks.push(artEntry);
    }

    setProgress(90, 'Saving config…');

    const saved = await saveConfig(true);
    if (!saved) throw new Error('Config save failed');

    setProgress(100, 'Done!');
    setAutosaveState('saved', 'Image uploaded and saved');

    setTimeout(() => {
      closeUploadModal();
      renderPagesList();
      // Re-open the page folder this artwork was added to
      const folders = pagesList.querySelectorAll('.page-folder');
      folders.forEach(f => {
        if (f.dataset.pageId === pendingPageId) f.classList.add('open');
      });
    }, 500);

  } catch(e) {
    alert('Upload failed: ' + e.message);
    uploadProgress.style.display = 'none';
    uploadSubmit.disabled = false;
    uploadSubmit.textContent = 'Upload & Add';
    setAutosaveState('error', 'Upload failed');
  }
}

function setProgress(pct, label) {
  progressFill.style.width = pct + '%';
  progressLabel.textContent = label;
}

// ─── FILE VIEWER ─────────────────────────────────────────────
openFileViewerBtn.addEventListener('click', () => openFileViewer('browse'));
openFileViewerUploadBtn.addEventListener('click', () => openFileViewer('browse'));
fileViewerClose.addEventListener('click', () => { fileViewerOverlay.style.display = 'none'; });
fileViewerOverlay.addEventListener('click', e => { if (e.target === fileViewerOverlay) fileViewerOverlay.style.display = 'none'; });
fvRefreshBtn.addEventListener('click', () => loadFileViewer());

function openFileViewer(mode = 'browse') {
  fileViewerMode = mode;
  fileViewerOverlay.style.display = 'flex';
  loadFileViewer();
}

async function loadFileViewer() {
  fvGrid.innerHTML = '<div class="fv-loading"><div class="loading-ring"></div></div>';
  fvCount.textContent = 'Loading…';

  const { owner, repo, branch, token } = ghCredentials;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/images?ref=${branch}`;
  const ghHeaders = buildGhHeaders(token);

  try {
    const res = await fetch(apiUrl, { headers: ghHeaders });
    if (!res.ok) throw new Error('Could not list images');
    const files = await res.json();
    const images = files.filter(f => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.name));

    fvCount.textContent = `${images.length} image${images.length !== 1 ? 's' : ''}`;
    fvGrid.innerHTML = '';

    if (images.length === 0) {
      fvGrid.innerHTML = '<p style="color:var(--text-faint);font-size:13px;grid-column:1/-1;text-align:center;padding:40px;">No images in repository.</p>';
      return;
    }

    images.forEach(file => {
      const item = buildFvItem(file);
      fvGrid.appendChild(item);
    });

  } catch(e) {
    fvGrid.innerHTML = `<p style="color:var(--danger);font-size:12px;grid-column:1/-1;text-align:center;padding:32px;">Error: ${esc(e.message)}</p>`;
    fvCount.textContent = 'Error loading';
  }
}

function buildFvItem(file) {
  const item = document.createElement('div');
  item.className = 'fv-item';

  // Thumbnail via proxy
  const imgUrl = `/api/img?f=${encodeURIComponent(file.name)}&o=${encodeURIComponent(ghCredentials.owner)}&r=${encodeURIComponent(ghCredentials.repo)}&b=${encodeURIComponent(ghCredentials.branch)}&t=${encodeURIComponent(ghCredentials.token)}`;

  const img = document.createElement('img');
  img.className = 'fv-thumb';
  img.src = imgUrl;
  img.alt = file.name;

  const name = document.createElement('div');
  name.className = 'fv-name';
  name.textContent = file.name;
  name.title = file.name;

  const actions = document.createElement('div');
  actions.className = 'fv-actions';

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'fv-action-btn danger';
  deleteBtn.textContent = 'Delete';
  deleteBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (!confirm(`Delete "${file.name}" from the repository? This cannot be undone.`)) return;
    deleteRepoImage(file.name, file.sha).then(() => loadFileViewer());
  });

  actions.appendChild(deleteBtn);
  item.appendChild(img);
  item.appendChild(name);
  item.appendChild(actions);
  return item;
}

async function deleteRepoImage(filename, sha) {
  const { owner, repo, branch, token } = ghCredentials;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/images/${encodeURIComponent(filename)}`;
  const ghHeaders = { ...buildGhHeaders(token), 'Content-Type': 'application/json' };

  try {
    const res = await fetch(apiUrl, {
      method: 'DELETE',
      headers: ghHeaders,
      body: JSON.stringify({ message: `[artbook] Delete ${filename}`, sha, branch })
    });
    if (!res.ok) throw new Error('Delete failed');
  } catch(e) {
    alert('Delete failed: ' + e.message);
  }
}

// ─── UTILS ───────────────────────────────────────────────────
// Append GitHub credentials to a bare /api/img proxy URL so thumbnails load
// when the URL was saved without the o/r/b/t params (older saves).
function enrichProxyUrl(url) {
  if (!url) return '';
  if (!url.startsWith('/api/img')) return url;
  const { owner, repo, branch, token } = ghCredentials;
  // Already has params — return as-is
  if (url.includes('&o=') || url.includes('?o=')) return url;
  return url
    + `&o=${encodeURIComponent(owner)}`
    + `&r=${encodeURIComponent(repo)}`
    + `&b=${encodeURIComponent(branch)}`
    + `&t=${encodeURIComponent(token)}`;
}


// ─── FLOOD POSITION PICKER ───────────────────────────────────
// Opens a modal showing an A4-ratio preview of the image. User drags
// left/right to set the horizontal focal point (0–100%). On confirm,
// calls onConfirm(focalX).

let _floodPosOnConfirm = null;

function openFloodPosPicker(imgSrc, title, initialFocalX, onConfirm) {
  _floodPosOnConfirm = onConfirm;
  pendingFocalX = (initialFocalX !== undefined) ? initialFocalX : 50;

  floodPosImg.src = imgSrc;
  floodPosCaptionTitle.textContent = title || '';
  floodPosOverlay.style.display = 'flex';
  _fpSetFocalX(pendingFocalX);
}

function closeFloodPosPicker() {
  floodPosOverlay.style.display = 'none';
  _floodPosOnConfirm = null;
}

floodPosClose.addEventListener('click', closeFloodPosPicker);
floodPosCancel.addEventListener('click', closeFloodPosPicker);
floodPosOverlay.addEventListener('click', e => { if (e.target === floodPosOverlay) closeFloodPosPicker(); });

floodPosConfirm.addEventListener('click', () => {
  if (_floodPosOnConfirm) _floodPosOnConfirm(Math.round(pendingFocalX));
  closeFloodPosPicker();
});

// ── Update the UI to reflect a focal X value (0–100) ──────────
function _fpSetFocalX(x) {
  x = Math.max(0, Math.min(100, x));
  pendingFocalX = x;
  floodPosImg.style.objectPosition = `${x}% 50%`;
  floodPosHandle.style.left = `${x}%`;
  floodPosFill.style.width = `${x}%`;
  floodPosKnob.style.left = `${x}%`;
  floodPosPct.textContent = `${Math.round(x)}%`;
}

// ── Dragging on the A4 preview ─────────────────────────────────
function _fpA4PosFromEvent(e) {
  const rect = floodPosA4.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const pct = ((clientX - rect.left) / rect.width) * 100;
  return Math.max(0, Math.min(100, pct));
}

let _fpDraggingA4 = false;
floodPosA4.addEventListener('mousedown', e => {
  _fpDraggingA4 = true;
  _fpSetFocalX(_fpA4PosFromEvent(e));
  e.preventDefault();
});
floodPosA4.addEventListener('touchstart', e => {
  _fpDraggingA4 = true;
  _fpSetFocalX(_fpA4PosFromEvent(e));
}, { passive: true });

window.addEventListener('mousemove', e => {
  if (!_fpDraggingA4) return;
  _fpSetFocalX(_fpA4PosFromEvent(e));
});
window.addEventListener('touchmove', e => {
  if (!_fpDraggingA4) return;
  _fpSetFocalX(_fpA4PosFromEvent(e));
}, { passive: true });

window.addEventListener('mouseup',   () => { _fpDraggingA4 = false; });
window.addEventListener('touchend',  () => { _fpDraggingA4 = false; });

// ── Dragging on the scrubber track ────────────────────────────
function _fpTrackPosFromEvent(e) {
  const rect = floodPosTrack.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const pct = ((clientX - rect.left) / rect.width) * 100;
  return Math.max(0, Math.min(100, pct));
}

let _fpDraggingTrack = false;
floodPosTrack.addEventListener('mousedown', e => {
  _fpDraggingTrack = true;
  _fpSetFocalX(_fpTrackPosFromEvent(e));
  e.preventDefault();
});
floodPosTrack.addEventListener('touchstart', e => {
  _fpDraggingTrack = true;
  _fpSetFocalX(_fpTrackPosFromEvent(e));
}, { passive: true });

window.addEventListener('mousemove', e => {
  if (!_fpDraggingTrack) return;
  _fpSetFocalX(_fpTrackPosFromEvent(e));
});
window.addEventListener('touchmove', e => {
  if (!_fpDraggingTrack) return;
  _fpSetFocalX(_fpTrackPosFromEvent(e));
}, { passive: true });

window.addEventListener('mouseup',   () => { _fpDraggingTrack = false; });
window.addEventListener('touchend',  () => { _fpDraggingTrack = false; });

function buildGhHeaders(token) {
  const h = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

function compressImage(file, maxEdge = 2400, quality = 0.88) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = evt => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxEdge || height > maxEdge) {
          if (width >= height) { height = Math.round((height / width) * maxEdge); width = maxEdge; }
          else { width = Math.round((width / height) * maxEdge); height = maxEdge; }
        }
        const canvas = document.createElement('canvas');
        canvas.width  = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
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
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
