/* ═══════════════════════════════════════════════════════════
   viewer.js — Artbook Viewer
   Loads artbook.json, renders pages, handles navigation
═══════════════════════════════════════════════════════════ */

'use strict';

// ─── CONFIG (set your GitHub details in artbook.json) ───────
// We load artbook.json at runtime from your GitHub raw URL
// so changes appear instantly without Vercel redeploy

let ARTBOOK = null;
let currentPageIndex = 0;
let pages = [];
let isAnimating = false;

// ─── DOM REFS ────────────────────────────────────────────────
const loadingState  = document.getElementById('loadingState');
const emptyState    = document.getElementById('emptyState');
const book          = document.getElementById('book');
const bookNav       = document.getElementById('bookNav');
const pageStage     = document.getElementById('pageStage');
const prevBtn       = document.getElementById('prevBtn');
const nextBtn       = document.getElementById('nextBtn');
const currentPageEl = document.getElementById('currentPage');
const totalPagesEl  = document.getElementById('totalPages');
const themeBtn      = document.getElementById('themeBtn');
const siteLogo      = document.getElementById('siteLogo');

// ─── INIT ─────────────────────────────────────────────────────
async function init() {
  loadTheme();
  setupProtection();
  setupKeyboard();
  await loadArtbook();
}

// ─── LOAD ARTBOOK.JSON ────────────────────────────────────────
async function loadArtbook() {
  try {
    // Try local artbook.json first (works in dev / Vercel static serve)
    let res = await fetch('./artbook.json?t=' + Date.now());
    if (!res.ok) throw new Error('not found');
    ARTBOOK = await res.json();
  } catch(e) {
    // Fallback: try GitHub raw URL if configured
    if (window.GITHUB_RAW_URL) {
      try {
        const res = await fetch(window.GITHUB_RAW_URL + '/artbook.json?t=' + Date.now());
        ARTBOOK = await res.json();
      } catch(e2) {
        ARTBOOK = { pages: [] };
      }
    } else {
      ARTBOOK = { pages: [] };
    }
  }

  pages = (ARTBOOK.pages || []);
  renderBook();
}

// ─── RENDER BOOK ─────────────────────────────────────────────
function renderBook() {
  loadingState.style.display = 'none';

  if (!pages.length) {
    emptyState.style.display = 'flex';
    return;
  }

  book.style.display = 'block';
  bookNav.style.display = 'flex';
  totalPagesEl.textContent = pages.length;
  goToPage(0, 'none');
}

// ─── NAVIGATE ─────────────────────────────────────────────────
function goToPage(index, direction = 'forward') {
  if (index < 0 || index >= pages.length) return;
  if (isAnimating) return;

  const oldPage = pageStage.querySelector('.art-page');
  const newPage = buildPage(pages[index], index);

  if (oldPage) {
    isAnimating = true;
    const leaveClass = direction === 'forward' ? 'leaving-forward' : 'leaving-back';
    const enterClass = direction === 'forward' ? 'entering-forward' : 'entering-back';

    oldPage.classList.add(leaveClass);
    pageStage.appendChild(newPage);
    newPage.classList.add(enterClass);

    oldPage.addEventListener('animationend', () => {
      oldPage.remove();
      newPage.classList.remove(enterClass);
      isAnimating = false;
    }, { once: true });
  } else {
    pageStage.appendChild(newPage);
    if (direction !== 'none') newPage.classList.add('entering-forward');
    newPage.addEventListener('animationend', () => {
      newPage.classList.remove('entering-forward');
    }, { once: true });
  }

  currentPageIndex = index;
  currentPageEl.textContent = index + 1;
  prevBtn.disabled = index === 0;
  nextBtn.disabled = index === pages.length - 1;
}

prevBtn.addEventListener('click', () => {
  if (currentPageIndex > 0) goToPage(currentPageIndex - 1, 'back');
});
nextBtn.addEventListener('click', () => {
  if (currentPageIndex < pages.length - 1) goToPage(currentPageIndex + 1, 'forward');
});

// ─── BUILD PAGE ───────────────────────────────────────────────
function buildPage(pageData, index) {
  const page = document.createElement('div');
  page.className = 'art-page';
  page.dataset.pageId = pageData.id || index;

  const layout = pageData.layout || 'large';
  page.classList.add('layout-' + layout);

  const artworks = pageData.artworks || [];

  if (layout === 'flood') {
    page.innerHTML = buildFloodLayout(artworks[0]);
  } else if (layout === 'large') {
    page.innerHTML = buildLargeLayout(artworks[0]);
  } else if (layout === 'medium') {
    const items = artworks.slice(0, 2).map(buildMediumItem).join('');
    page.innerHTML = items;
  } else if (layout === 'small') {
    const items = artworks.slice(0, 4).map(buildSmallItem).join('');
    page.innerHTML = items;
  }

  // Museum mat border (not on flood)
  if (layout !== 'flood') {
    const mat = document.createElement('div');
    mat.className = 'page-border';
    page.appendChild(mat);
  }

  return page;
}

// ─── LAYOUT BUILDERS ─────────────────────────────────────────

function shield(url, alt) {
  return `<div class="img-shield"><img src="${esc(url)}" alt="${esc(alt || '')}" loading="lazy" draggable="false"></div>`;
}

function metaLine(art) {
  const parts = [];
  if (art.date) parts.push(formatDate(art.date));
  parts.push('iridesuwa');
  return parts.join('  ·  ');
}

function buildFloodLayout(art) {
  if (!art) return '';
  return `
    <div class="artwork-flood">
      ${shield(art.url, art.title)}
      <div class="flood-caption">
        <div class="art-title">${esc(art.title || 'Untitled')}</div>
        <div class="art-meta">${esc(metaLine(art))}</div>
      </div>
    </div>
  `;
}

function buildLargeLayout(art) {
  if (!art) return '';
  return `
    <div class="artwork-large">
      ${shield(art.url, art.title)}
      <div class="art-caption-block">
        <div class="art-title">${esc(art.title || 'Untitled')}</div>
        <div class="art-meta">${esc(metaLine(art))}</div>
      </div>
    </div>
  `;
}

function buildMediumItem(art) {
  const textSide = art.textPosition === 'left' ? 'text-left' : '';
  const hasDesc = art.description && art.description.trim();
  return `
    <div class="artwork-medium ${textSide}">
      <div class="img-col">${shield(art.url, art.title)}</div>
      <div class="text-col">
        <div class="art-title">${esc(art.title || 'Untitled')}</div>
        <div class="art-meta">${esc(metaLine(art))}</div>
        ${hasDesc ? `<div class="art-desc">${esc(art.description)}</div>` : ''}
      </div>
    </div>
  `;
}

function buildSmallItem(art) {
  const textSide = art.textPosition === 'left' ? 'text-left' : '';
  const hasDesc = art.description && art.description.trim();
  return `
    <div class="artwork-small ${textSide}">
      <div class="img-col">${shield(art.url, art.title)}</div>
      <div class="text-col">
        <div class="art-title">${esc(art.title || 'Untitled')}</div>
        <div class="art-meta">${esc(metaLine(art))}</div>
        ${hasDesc ? `<div class="art-desc">${esc(art.description)}</div>` : ''}
      </div>
    </div>
  `;
}

// ─── THEME ────────────────────────────────────────────────────
function loadTheme() {
  const saved = localStorage.getItem('iridesuwa-theme') || 'light';
  setTheme(saved);
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('themeLabel').textContent = theme === 'dark' ? '●' : '○';
  localStorage.setItem('iridesuwa-theme', theme);
}

themeBtn.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  setTheme(current === 'dark' ? 'light' : 'dark');
});

// ─── IMAGE PROTECTION ─────────────────────────────────────────
function setupProtection() {
  // Block right-click anywhere
  document.addEventListener('contextmenu', e => e.preventDefault());
  // Block drag
  document.addEventListener('dragstart', e => e.preventDefault());
  // Block print shortcut (soft block)
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
    }
    // Also block Ctrl+S / Ctrl+U
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S' || e.key === 'u' || e.key === 'U')) {
      e.preventDefault();
    }
  });
}

// ─── KEYBOARD NAV ─────────────────────────────────────────────
function setupKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentPageIndex < pages.length - 1) goToPage(currentPageIndex + 1, 'forward');
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentPageIndex > 0) goToPage(currentPageIndex - 1, 'back');
    }
  });
}

// ─── UTIL ─────────────────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return dateStr; }
}

// ─── EXPOSE FOR ADMIN ─────────────────────────────────────────
window._artbookViewer = {
  getArtbook: () => ARTBOOK,
  setArtbook: (data) => { ARTBOOK = data; pages = data.pages || []; },
  rerender: () => {
    pages = (ARTBOOK?.pages || []);
    pageStage.innerHTML = '';
    if (!pages.length) {
      book.style.display = 'none';
      emptyState.style.display = 'flex';
      bookNav.style.display = 'none';
      return;
    }
    book.style.display = 'block';
    bookNav.style.display = 'flex';
    emptyState.style.display = 'none';
    totalPagesEl.textContent = pages.length;
    const idx = Math.min(currentPageIndex, pages.length - 1);
    goToPage(idx, 'none');
  }
};

// ─── BOOT ─────────────────────────────────────────────────────
init();
