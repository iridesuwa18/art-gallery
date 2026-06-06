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

// Edit artwork modal
const editArtOverlay    = document.getElementById('editArtOverlay');
const editArtClose      = document.getElementById('editArtClose');
const editArtCancel     = document.getElementById('editArtCancel');
const editArtSave       = document.getElementById('editArtSave');
const editArtTitle      = document.getElementById('editArtTitle');
const editArtDate       = document.getElementById('editArtDate');
const editArtDesc       = document.getElementById('editArtDesc');
const editArtTextPos    = document.getElementById('editArtTextPos');
const editArtTextPosLabel = document.getElementById('editArtTextPosLabel');


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
  if (!localConfig.sections) localConfig.sections = [];

  // Embed credentials in config (kept for /api/config server-side use)
  localConfig.githubOwner  = ghCredentials.owner;
  localConfig.githubRepo   = ghCredentials.repo;
  localConfig.githubBranch = ghCredentials.branch;

  renderSectionsList();
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

// ─── SECTIONS LIST ────────────────────────────────────────────
const sectionsList = document.getElementById('sectionsList');
const addSectionBtn = document.getElementById('addSectionBtn');

if (addSectionBtn) {
  addSectionBtn.addEventListener('click', () => {
    if (!localConfig.sections) localConfig.sections = [];
    localConfig.sections.push({
      id: 'sec_' + Date.now(),
      name: 'New Section',
      description: '',
      subsections: []
    });
    renderSectionsList();
    renderPagesList();   // refresh page section dropdowns
    scheduleAutosave();
  });
}

function renderSectionsList() {
  if (!sectionsList) return;
  sectionsList.innerHTML = '';
  const sections = localConfig.sections || [];
  sections.forEach((sec, i) => {
    sectionsList.appendChild(buildSectionFolder(sec, i));
  });
}

function buildSectionFolder(sec, index) {
  if (!sec.subsections) sec.subsections = [];

  const folder = document.createElement('div');
  folder.className = 'section-folder';
  folder.dataset.secId = sec.id;

  folder.innerHTML = `
    <div class="section-folder-header">
      <div class="sf-left">
        <svg class="sf-chevron" width="12" height="12" viewBox="0 0 14 14" fill="none">
          <path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="sf-name">${esc(sec.name || `Section ${index + 1}`)}</span>
      </div>
      <div class="sf-right">
        <button class="icon-btn delete-section-btn" title="Delete section">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="section-folder-body">
      <label class="field-label" style="font-size:10.5px">Name
        <input type="text" class="panel-input sec-name-input" value="${esc(sec.name || '')}" placeholder="Section name">
      </label>
      <label class="field-label" style="font-size:10.5px">Description <span style="color:var(--text-faint);font-weight:300">(shown in info tooltip)</span>
        <textarea class="panel-input textarea sec-desc-input" rows="2" placeholder="Brief description of this section…">${esc(sec.description || '')}</textarea>
      </label>
      <div class="sf-subsections-wrap">
        <div class="sf-subsections-header">
          <span class="sf-subsections-label">Subsections</span>
          <button class="panel-btn sm add-subsection-btn" type="button">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
            Add
          </button>
        </div>
        <div class="sf-subsections-list"></div>
      </div>
    </div>
  `;

  // Toggle open/close
  const header = folder.querySelector('.section-folder-header');
  header.addEventListener('click', e => {
    if (e.target.closest('.sf-right')) return;
    folder.classList.toggle('open');
  });

  // Name input
  const nameInput = folder.querySelector('.sec-name-input');
  nameInput.addEventListener('input', () => {
    sec.name = nameInput.value;
    folder.querySelector('.sf-name').textContent = sec.name || `Section ${index + 1}`;
    scheduleAutosave();
  });

  // Description input
  const descInput = folder.querySelector('.sec-desc-input');
  descInput.addEventListener('input', () => {
    sec.description = descInput.value;
    scheduleAutosave();
  });

  // Delete section
  folder.querySelector('.delete-section-btn').addEventListener('click', e => {
    e.stopPropagation();
    (localConfig.pages || []).forEach(p => {
      if (p.sectionId === sec.id) { p.sectionId = null; p.subsectionId = null; }
    });
    localConfig.sections = (localConfig.sections || []).filter(s => s.id !== sec.id);
    renderSectionsList();
    renderPagesList();
    scheduleAutosave();
  });

  // Add subsection
  folder.querySelector('.add-subsection-btn').addEventListener('click', e => {
    e.stopPropagation();
    sec.subsections.push({ id: 'sub_' + Date.now(), name: 'New Subsection' });
    renderSubsectionsList(folder, sec);
    renderPagesList();
    scheduleAutosave();
  });

  renderSubsectionsList(folder, sec);
  return folder;
}

function renderSubsectionsList(folder, sec) {
  const list = folder.querySelector('.sf-subsections-list');
  if (!list) return;
  list.innerHTML = '';
  (sec.subsections || []).forEach((sub, si) => {
    const row = document.createElement('div');
    row.className = 'sf-subsection-row';
    row.innerHTML = `
      <input type="text" class="panel-input sub-name-input" value="${esc(sub.name || '')}" placeholder="Subsection name" style="font-size:10.5px;flex:1">
      <button class="icon-btn delete-subsection-btn" title="Delete subsection" style="flex-shrink:0">
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
      </button>
    `;
    row.querySelector('.sub-name-input').addEventListener('input', function() {
      sub.name = this.value;
      scheduleAutosave();
      renderPagesList();
    });
    row.querySelector('.delete-subsection-btn').addEventListener('click', e => {
      e.stopPropagation();
      (localConfig.pages || []).forEach(p => {
        if (p.subsectionId === sub.id) p.subsectionId = null;
      });
      sec.subsections.splice(si, 1);
      renderSubsectionsList(folder, sec);
      renderPagesList();
      scheduleAutosave();
    });
    list.appendChild(row);
  });
}


// ─── PAGES LIST ───────────────────────────────────────────────
// Helper: build a letter label for section index (0→A, 1→B, …, 25→Z, 26→AA…)
function sectionLetter(idx) {
  let label = '';
  idx += 1; // 1-based
  while (idx > 0) {
    idx--;
    label = String.fromCharCode(65 + (idx % 26)) + label;
    idx = Math.floor(idx / 26);
  }
  return label;
}

// Lowercase version for subsections (0→a, 1→b, …, 25→z, 26→aa…)
function subsectionLetter(idx) {
  let label = '';
  idx += 1;
  while (idx > 0) {
    idx--;
    label = String.fromCharCode(97 + (idx % 26)) + label;
    idx = Math.floor(idx / 26);
  }
  return label;
}

function renderPagesList() {
  pagesList.innerHTML = '';
  const sections = localConfig.sections || [];
  const allPages  = localConfig.pages   || [];

  if (sections.length === 0) {
    // No sections — flat list, numbered Page 1, Page 2…
    allPages.forEach((page, i) => {
      pagesList.appendChild(buildPageFolder(page, i, `Page ${i + 1}`));
    });
    return;
  }

  // Build grouped view: sections first (with their pages underneath),
  // then unassigned pages at the bottom.

  sections.forEach((sec, secIdx) => {
    const secL = sectionLetter(secIdx);
    const secPages = allPages.filter(p => p.sectionId === sec.id);
    const subsections = sec.subsections || [];

    // Section header bar
    const secHeader = document.createElement('div');
    secHeader.className = 'pages-section-bar';
    secHeader.innerHTML = `
      <span class="pages-section-bar-letter">${esc(secL)}</span>
      <span class="pages-section-bar-name">${esc(sec.name || `Section ${secIdx + 1}`)}</span>
    `;
    pagesList.appendChild(secHeader);

    if (subsections.length > 0) {
      // Group pages by subsection — each subsection resets its own counter
      subsections.forEach((sub, subI) => {
        const subL = subsectionLetter(subI);
        const subPages = secPages.filter(p => p.subsectionId === sub.id);

        // Subsection bar
        const subBar = document.createElement('div');
        subBar.className = 'pages-subsection-bar';
        subBar.innerHTML = `<span class="pages-subsection-bar-name">${esc(sub.name || `Subsection ${subI + 1}`)}</span>`;
        pagesList.appendChild(subBar);

        if (subPages.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'pages-section-empty';
          empty.style.paddingLeft = '22px';
          empty.textContent = 'No pages in this subsection.';
          pagesList.appendChild(empty);
        } else {
          subPages.forEach((page, pi) => {
            const label = `${secL}\u00b7${subL}${pi + 1}`;
            const folder = buildPageFolder(page, allPages.indexOf(page), label);
            folder.classList.add('pages-section-child', 'pages-subsection-child');
            pagesList.appendChild(folder);
          });
        }
      });

      // Pages in section but not in any subsection — continuous, no subsection letter
      const unsubbed = secPages.filter(p => !p.subsectionId || !subsections.find(s => s.id === p.subsectionId));
      if (unsubbed.length > 0) {
        const subBar = document.createElement('div');
        subBar.className = 'pages-subsection-bar';
        subBar.innerHTML = `<span class="pages-subsection-bar-name" style="font-style:italic">No subsection</span>`;
        pagesList.appendChild(subBar);
        unsubbed.forEach((page, pi) => {
          const label = `${secL}${pi + 1}`;
          const folder = buildPageFolder(page, allPages.indexOf(page), label);
          folder.classList.add('pages-section-child', 'pages-subsection-child');
          pagesList.appendChild(folder);
        });
      }
    } else {
      // No subsections — flat continuous list under section
      secPages.forEach((page, pi) => {
        const label = `${secL}${pi + 1}`;
        const folder = buildPageFolder(page, allPages.indexOf(page), label);
        folder.classList.add('pages-section-child');
        pagesList.appendChild(folder);
      });

      // If section is empty, show a subtle placeholder
      if (secPages.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'pages-section-empty';
        empty.textContent = 'No pages assigned to this section.';
        pagesList.appendChild(empty);
      }
    }
  });

  // Unassigned pages
  const unassigned = allPages.filter(p => !p.sectionId);
  if (unassigned.length > 0) {
    const unassignedHeader = document.createElement('div');
    unassignedHeader.className = 'pages-section-bar pages-section-bar--unassigned';
    unassignedHeader.innerHTML = `<span class="pages-section-bar-name">Unassigned</span>`;
    pagesList.appendChild(unassignedHeader);

    unassigned.forEach((page, i) => {
      const folder = buildPageFolder(page, allPages.indexOf(page), `? ${i + 1}`);
      folder.classList.add('pages-section-child');
      pagesList.appendChild(folder);
    });
  }
}

function buildPageFolder(page, index, label) {
  const template = document.getElementById('pageCardTemplate');
  const folder = template.content.cloneNode(true).querySelector('.page-folder');

  folder.dataset.pageId = page.id;

  // Page number / label (e.g. "A1", "B3", "Page 2")
  folder.querySelector('.pf-num').textContent = label || `Page ${index + 1}`;

  // Fold/unfold — clicking anywhere on the header except the right-side controls toggles open/closed
  const header = folder.querySelector('.page-folder-header');
  header.addEventListener('click', e => {
    if (e.target.closest('.pf-right')) return;
    folder.classList.toggle('open');
  });

  // Layout select
  const layoutSelect = folder.querySelector('.layout-select');
  layoutSelect.value = page.layout || 'large';

  // Page-settings panel (injected into folder body, above artwork list)
  const pageSettingsWrap = document.createElement('div');
  pageSettingsWrap.className = 'page-settings-wrap';

  function rebuildPageSettings() {
    pageSettingsWrap.innerHTML = '';
    const layout = page.layout || 'large';

    if (layout === 'flood') {
      // ── Flood: corner, height ratio, text scale ──
      const cornerRow = makeSettingRow('Caption Corner', [
        makeSelect('flood-corner', [
          { value: 'bl', label: 'Bottom Left' },
          { value: 'br', label: 'Bottom Right' },
          { value: 'tl', label: 'Top Left' },
          { value: 'tr', label: 'Top Right' },
        ], page.floodCorner || 'bl', v => { page.floodCorner = v; scheduleAutosave(); })
      ]);

      const heightRow = makeSettingRow('Text Box Height', [
        makeSlider('flood-height', 5, 50, Math.round((page.floodHeightRatio !== undefined ? page.floodHeightRatio : 0.18) * 100),
          v => { page.floodHeightRatio = v / 100; scheduleAutosave(); }, '%')
      ]);

      const scaleRow = makeSettingRow('Text Size Scale', [
        makeSlider('flood-scale', 50, 200, Math.round((page.floodTextScale !== undefined ? page.floodTextScale : 1.0) * 100),
          v => { page.floodTextScale = v / 100; scheduleAutosave(); }, '%')
      ]);

      pageSettingsWrap.appendChild(cornerRow);
      pageSettingsWrap.appendChild(heightRow);
      pageSettingsWrap.appendChild(scaleRow);

    } else if (layout === 'large') {
      // ── Large: text alignment, text height ratio ──
      const alignRow = makeSettingRow('Text Align', [
        makeSelect('large-align', [
          { value: 'center', label: 'Center' },
          { value: 'left',   label: 'Left' },
          { value: 'right',  label: 'Right' },
        ], page.largeTextAlign || 'center', v => { page.largeTextAlign = v; scheduleAutosave(); })
      ]);

      const ratioRow = makeSettingRow('Text Height %', [
        makeSlider('large-text-ratio', 5, 60, Math.round((page.largeTextRatio !== undefined ? page.largeTextRatio : 0.22) * 100),
          v => { page.largeTextRatio = v / 100; scheduleAutosave(); }, '%')
      ]);

      pageSettingsWrap.appendChild(alignRow);
      pageSettingsWrap.appendChild(ratioRow);
    }
    // Medium / Small: no page-level settings (per-artwork split ratio handles it)

    // ── All layouts: background colour ──
    const bgRow = makeBgColourRow(page);
    pageSettingsWrap.appendChild(bgRow);
  }

  rebuildPageSettings();

  // ── Section assignment row ──────────────────────────────────
  const sectionAssignRow = buildSectionAssignRow(page);

  layoutSelect.addEventListener('change', () => {
    page.layout = layoutSelect.value;
    rebuildPageSettings();
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

  // Inject section assign + page settings before artwork list
  const folderBody = folder.querySelector('.page-folder-body');
  folderBody.insertBefore(sectionAssignRow, artworksList);
  folderBody.insertBefore(pageSettingsWrap, artworksList);

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

// ─── SECTION ASSIGNMENT ROW ───────────────────────────────────
// Builds compact "Section" + "Subsection" dropdown rows.
// Only rendered when at least one section exists.
function buildSectionAssignRow(page) {
  const wrap = document.createElement('div');
  wrap.className = 'section-assign-wrap';

  const sections = localConfig.sections || [];

  if (sections.length === 0) {
    wrap.style.display = 'none';
    return wrap;
  }

  // ── Section row ──────────────────────────────────────────
  const secRow = document.createElement('div');
  secRow.className = 'page-setting-row section-assign-row';

  const secLbl = document.createElement('span');
  secLbl.className = 'page-setting-label';
  secLbl.textContent = 'Section';

  const secSel = document.createElement('select');
  secSel.className = 'page-setting-select section-assign-select';

  const unassignedOpt = document.createElement('option');
  unassignedOpt.value = '';
  unassignedOpt.textContent = '— Unassigned —';
  secSel.appendChild(unassignedOpt);

  sections.forEach(sec => {
    const opt = document.createElement('option');
    opt.value = sec.id;
    opt.textContent = sec.name || sec.id;
    secSel.appendChild(opt);
  });

  secSel.value = page.sectionId || '';
  secRow.appendChild(secLbl);
  secRow.appendChild(secSel);
  wrap.appendChild(secRow);

  // ── Subsection row ───────────────────────────────────────
  const subRow = document.createElement('div');
  subRow.className = 'page-setting-row section-assign-row';

  const subLbl = document.createElement('span');
  subLbl.className = 'page-setting-label';
  subLbl.textContent = 'Subsection';

  const subSel = document.createElement('select');
  subSel.className = 'page-setting-select subsection-assign-select';

  subRow.appendChild(subLbl);
  subRow.appendChild(subSel);
  wrap.appendChild(subRow);

  function refreshSubSel() {
    subSel.innerHTML = '';
    const activeSec = sections.find(s => s.id === (page.sectionId || ''));
    const subs = activeSec?.subsections || [];
    if (subs.length === 0) {
      subRow.style.display = 'none';
      return;
    }
    subRow.style.display = '';
    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = '— None —';
    subSel.appendChild(noneOpt);
    subs.forEach(sub => {
      const o = document.createElement('option');
      o.value = sub.id;
      o.textContent = sub.name || sub.id;
      subSel.appendChild(o);
    });
    subSel.value = page.subsectionId || '';
  }

  refreshSubSel();

  secSel.addEventListener('change', () => {
    page.sectionId = secSel.value || null;
    page.subsectionId = null;
    refreshSubSel();
    renderPagesList();
    scheduleAutosave();
  });

  subSel.addEventListener('change', () => {
    page.subsectionId = subSel.value || null;
    renderPagesList();
    scheduleAutosave();
  });

  return wrap;
}

// ─── SETTING ROW HELPERS ──────────────────────────────────
function makeSettingRow(label, controls) {
  const wrap = document.createElement('div');
  wrap.className = 'page-setting-row';
  const lbl = document.createElement('span');
  lbl.className = 'page-setting-label';
  lbl.textContent = label;
  wrap.appendChild(lbl);
  controls.forEach(c => wrap.appendChild(c));
  return wrap;
}

function makeSelect(id, options, current, onChange) {
  const sel = document.createElement('select');
  sel.className = 'page-setting-select';
  sel.id = id + '_' + Date.now();
  options.forEach(opt => {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    if (opt.value === current) o.selected = true;
    sel.appendChild(o);
  });
  sel.addEventListener('change', () => onChange(sel.value));
  return sel;
}

function makeSlider(id, min, max, current, onChange, suffix = '') {
  const wrap = document.createElement('div');
  wrap.className = 'page-setting-slider-wrap';
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.className = 'page-setting-slider';
  slider.min = min;
  slider.max = max;
  slider.value = current;
  const readout = document.createElement('span');
  readout.className = 'page-setting-readout';
  readout.textContent = current + suffix;
  slider.addEventListener('input', () => {
    readout.textContent = slider.value + suffix;
    onChange(parseInt(slider.value, 10));
  });
  wrap.appendChild(slider);
  wrap.appendChild(readout);
  return wrap;
}

// ── Background colour picker for a page ──────────────────────
function makeBgColourRow(page) {
  const wrap = document.createElement('div');
  wrap.className = 'page-setting-row page-bg-row';

  const lbl = document.createElement('span');
  lbl.className = 'page-setting-label';
  lbl.textContent = 'Page Background';

  const controls = document.createElement('div');
  controls.className = 'page-bg-controls';

  // Colour swatches (preset palette + custom)
  const PRESETS = [
    { label: 'White',     value: '#ffffff' },
    { label: 'Off-white', value: '#faf8f5' },
    { label: 'Cream',     value: '#f5f0e8' },
    { label: 'Light grey',value: '#f0eeeb' },
    { label: 'Grey',      value: '#e0ddd8' },
    { label: 'Charcoal',  value: '#2a2826' },
    { label: 'Black',     value: '#111111' },
    { label: 'Clear',     value: ''        },
  ];

  const currentVal = page.bgColour || '';

  PRESETS.forEach(preset => {
    const swatch = document.createElement('button');
    swatch.className = 'page-bg-swatch' + (preset.value === currentVal ? ' active' : '');
    swatch.title = preset.label;
    swatch.type = 'button';
    if (preset.value) {
      swatch.style.background = preset.value;
    } else {
      // "Clear" swatch — shows a strikethrough indicator
      swatch.classList.add('page-bg-swatch--clear');
      swatch.innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`;
    }
    swatch.addEventListener('click', () => {
      page.bgColour = preset.value || undefined;
      // Update active state
      controls.querySelectorAll('.page-bg-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      // Keep custom input in sync
      customInput.value = preset.value || '#ffffff';
      scheduleAutosave();
    });
    controls.appendChild(swatch);
  });

  // Custom colour input
  const customInput = document.createElement('input');
  customInput.type = 'color';
  customInput.className = 'page-bg-custom';
  customInput.title = 'Custom colour';
  customInput.value = currentVal || '#ffffff';
  customInput.addEventListener('input', () => {
    page.bgColour = customInput.value;
    controls.querySelectorAll('.page-bg-swatch').forEach(s => s.classList.remove('active'));
    scheduleAutosave();
  });
  controls.appendChild(customInput);

  wrap.appendChild(lbl);
  wrap.appendChild(controls);
  return wrap;
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

  // Edit details button (all layouts)
  const editBtn = document.createElement('button');
  editBtn.className = 'artwork-row-edit-pos';
  editBtn.textContent = 'Edit';
  editBtn.title = 'Edit artwork details';
  editBtn.addEventListener('click', () => openEditArtModal(art, page));

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
        scheduleAutosave(true);
        renderPagesList();
      });
    });
    row.appendChild(thumb);
    row.appendChild(info);
    row.appendChild(editBtn);
    row.appendChild(editPosBtn);
  } else {
    row.appendChild(thumb);
    row.appendChild(info);
    row.appendChild(editBtn);
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

  // Detect layout for field visibility
  const page = localConfig.pages.find(p => p.id === pageId);
  const layout = page?.layout || 'large';
  const isFlood = layout === 'flood';
  const isSplit = layout === 'medium' || layout === 'small';

  const textPosLabel = artTextPos.closest('.field-label');
  if (textPosLabel) textPosLabel.style.display = isFlood ? 'none' : '';

  // Split ratio field
  const srField  = document.getElementById('uploadSplitRatioField');
  const srSlider = document.getElementById('uploadSplitRatio');
  const srReadout = document.getElementById('uploadSplitReadout');
  if (srField) srField.style.display = isSplit ? '' : 'none';
  if (srSlider) {
    srSlider.value = 50;
    if (srReadout) srReadout.textContent = '50 / 50';
    srSlider.oninput = () => {
      const v = parseInt(srSlider.value, 10);
      if (srReadout) srReadout.textContent = `${v} / ${100 - v}`;
    };
  }

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

      // Split ratio (medium/small layouts)
      if (page && (page.layout === 'medium' || page.layout === 'small')) {
        const srInput = document.getElementById('uploadSplitRatio');
        if (srInput) artEntry.splitRatio = parseInt(srInput.value, 10);
      }

      // Concept data captured by concept-settings.js
      if (window.__pendingUploadConceptData !== undefined) {
        artEntry.concept = window.__pendingUploadConceptData;
        window.__pendingUploadConceptData = undefined;
      }

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


// ─── EDIT ARTWORK MODAL ───────────────────────────────────────
let _editArtTarget = null; // { art, page } reference

function openEditArtModal(art, page) {
  _editArtTarget = { art, page };
  window.__editArtTarget = art; // expose for concept-settings.js
  editArtTitle.value   = art.title || '';
  editArtDate.value    = art.date  || '';
  editArtDesc.value    = art.description || '';
  editArtTextPos.value = art.textPosition || 'right';

  const layout = page.layout || 'large';
  const isFlood = layout === 'flood';
  const isSplit = layout === 'medium' || layout === 'small';

  // Hide text-position for flood; hide split ratio for non-split layouts
  editArtTextPosLabel.style.display = isFlood ? 'none' : '';

  const srField   = document.getElementById('editSplitRatioField');
  const srSlider  = document.getElementById('editArtSplitRatio');
  const srReadout = document.getElementById('editSplitReadout');
  if (srField) srField.style.display = isSplit ? '' : 'none';
  if (srSlider && isSplit) {
    const current = art.splitRatio !== undefined ? art.splitRatio : 50;
    srSlider.value = current;
    if (srReadout) srReadout.textContent = `${current} / ${100 - current}`;
    srSlider.oninput = () => {
      const v = parseInt(srSlider.value, 10);
      if (srReadout) srReadout.textContent = `${v} / ${100 - v}`;
    };
  }

  editArtOverlay.style.display = 'flex';
  setTimeout(() => editArtTitle.focus(), 60);
}

function closeEditArtModal() {
  editArtOverlay.style.display = 'none';
  _editArtTarget = null;
}

editArtClose.addEventListener('click', closeEditArtModal);
editArtCancel.addEventListener('click', closeEditArtModal);
editArtOverlay.addEventListener('click', e => { if (e.target === editArtOverlay) closeEditArtModal(); });

editArtSave.addEventListener('click', () => {
  if (!_editArtTarget) return;
  const { art, page } = _editArtTarget;
  art.title       = editArtTitle.value.trim() || 'Untitled';
  art.date        = editArtDate.value;
  art.description = editArtDesc.value.trim();
  if (page.layout !== 'flood') art.textPosition = editArtTextPos.value;

  // Split ratio (medium/small only)
  if (page.layout === 'medium' || page.layout === 'small') {
    const srInput = document.getElementById('editArtSplitRatio');
    if (srInput) art.splitRatio = parseInt(srInput.value, 10);
  }

  // Concept data captured in capture-phase listener by concept-settings.js
  if (window.__pendingConceptData !== undefined) {
    art.concept = window.__pendingConceptData;
    window.__pendingConceptData = undefined;
  }

  closeEditArtModal();
  scheduleAutosave(true);
  renderPagesList();
});

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
