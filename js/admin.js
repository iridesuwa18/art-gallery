/* ═══════════════════════════════════════════════════════════
   admin.js — Admin Panel
   Hidden admin panel (double-click logo) with:
   - Password auth via /api/auth
   - GitHub image upload via /api/upload
   - Config save via /api/config
═══════════════════════════════════════════════════════════ */

'use strict';

// ─── STATE ───────────────────────────────────────────────────
let adminUnlocked = false;
let pendingPageId  = null; // which page we're adding an artwork to
let localConfig    = null; // working copy of artbook.json
let uploadFile     = null; // file staged for upload

// ─── DOM ─────────────────────────────────────────────────────
const logo         = document.getElementById('siteLogo');
const adminOverlay = document.getElementById('adminOverlay');
const adminAuth    = document.getElementById('adminAuth');
const adminEditor  = document.getElementById('adminEditor');
const adminClose   = document.getElementById('adminClose');
const editorClose  = document.getElementById('editorClose');
const authPassword = document.getElementById('authPassword');
const authSubmit   = document.getElementById('authSubmit');
const authError    = document.getElementById('authError');

const saveConfigBtn = document.getElementById('saveConfigBtn');
const addPageBtn    = document.getElementById('addPageBtn');
const pagesList     = document.getElementById('pagesList');

// GitHub settings fields
const ghOwner  = document.getElementById('ghOwner');
const ghRepo   = document.getElementById('ghRepo');
const ghBranch = document.getElementById('ghBranch');

// Upload modal
const uploadOverlay = document.getElementById('uploadOverlay');
const uploadClose   = document.getElementById('uploadClose');
const dropZone      = document.getElementById('dropZone');
const fileInput     = document.getElementById('fileInput');
const browseBtn     = document.getElementById('browseBtn');
const dropInner     = document.getElementById('dropInner');
const uploadPreview = document.getElementById('uploadPreview');
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
authPassword.addEventListener('keydown', e => {
  if (e.key === 'Enter') attemptAuth();
});

async function attemptAuth() {
  const pw = authPassword.value.trim();
  if (!pw) return;

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

// ─── EDITOR ──────────────────────────────────────────────────
function showEditor() {
  adminAuth.style.display = 'none';
  adminEditor.style.display = 'block';

  // Deep clone current artbook config
  const viewer = window._artbookViewer;
  localConfig = JSON.parse(JSON.stringify(viewer.getArtbook() || { pages: [] }));
  if (!localConfig.pages) localConfig.pages = [];

  // Populate GitHub settings
  ghOwner.value  = localConfig.githubOwner || '';
  ghRepo.value   = localConfig.githubRepo  || '';
  ghBranch.value = localConfig.githubBranch || 'main';

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
  // Scroll to bottom of pages list
  pagesList.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ─── SAVE CONFIG ─────────────────────────────────────────────
saveConfigBtn.addEventListener('click', saveConfig);

async function saveConfig() {
  // Update github settings from fields
  localConfig.githubOwner  = ghOwner.value.trim();
  localConfig.githubRepo   = ghRepo.value.trim();
  localConfig.githubBranch = ghBranch.value.trim() || 'main';

  saveConfigBtn.textContent = 'Saving…';
  saveConfigBtn.disabled = true;

  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: localConfig })
    });

    const data = await res.json();

    if (data.ok) {
      // Update the viewer in-memory
      window._artbookViewer.setArtbook(localConfig);
      window._artbookViewer.rerender();
      saveConfigBtn.textContent = '✓ Saved';
      setTimeout(() => { saveConfigBtn.textContent = 'Save All'; }, 2000);
    } else {
      alert('Save failed: ' + (data.error || 'unknown error'));
      saveConfigBtn.textContent = 'Save All';
    }
  } catch(e) {
    alert('Save failed: ' + e.message);
    saveConfigBtn.textContent = 'Save All';
  }

  saveConfigBtn.disabled = false;
}

// ─── UPLOAD MODAL ─────────────────────────────────────────────
function openUploadModal(pageId) {
  pendingPageId = pageId;
  uploadFile    = null;

  // Reset form
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
  const reader = new FileReader();
  reader.onload = evt => {
    uploadPreview.src = evt.target.result;
    uploadPreview.style.display = 'block';
    dropInner.style.display = 'none';
  };
  reader.readAsDataURL(file);

  // Auto-fill title from filename
  if (!artTitle.value) {
    artTitle.value = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
  }
}

// Upload submit
uploadSubmit.addEventListener('click', doUpload);

async function doUpload() {
  if (!uploadFile) { alert('Please select an image first.'); return; }

  const title      = artTitle.value.trim() || 'Untitled';
  const date       = artDate.value;
  const desc       = artDesc.value.trim();
  const textPos    = artTextPos.value;

  uploadSubmit.disabled = true;
  uploadSubmit.textContent = 'Uploading…';
  uploadProgress.style.display = 'flex';
  setProgress(10, 'Reading file…');

  try {
    // Convert file to base64
    const base64 = await fileToBase64(uploadFile);
    setProgress(30, 'Uploading to GitHub…');

    const filename = sanitizeFilename(uploadFile.name);

    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename,
        base64Content: base64.split(',')[1], // strip data:image/... prefix
        mimeType: uploadFile.type
      })
    });

    setProgress(70, 'Processing…');
    const data = await res.json();

    if (!data.ok) throw new Error(data.error || 'Upload failed');

    setProgress(90, 'Adding to artbook…');

    // Add artwork to the target page in localConfig
    const targetPage = localConfig.pages.find(p => p.id === pendingPageId);
    if (targetPage) {
      if (!targetPage.artworks) targetPage.artworks = [];
      targetPage.artworks.push({
        id: 'art_' + Date.now(),
        url: data.url,
        title,
        date,
        description: desc,
        textPosition: textPos
      });
    }

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

function sanitizeFilename(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-');
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
