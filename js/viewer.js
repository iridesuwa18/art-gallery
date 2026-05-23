/* ═══════════════════════════════════════════════════════════
   viewer.js — Public Artbook Viewer  v2
   • Loads artbook.json from /api/config (GET)
   • Renders pages inside the A4 frame
   • Supports flood / large / medium / small layouts
   • Keyboard (←→) + swipe navigation
   • Theme toggle (light/dark)
   • Exposes window._artbookViewer for admin.js
═══════════════════════════════════════════════════════════ */

'use strict';

(function () {

  // ─── DOM ───────────────────────────────────────────────────
  const loadingState = document.getElementById('loadingState');
  const emptyState   = document.getElementById('emptyState');
  const pageArea     = document.getElementById('pageArea');
  const pageStage    = document.getElementById('pageStage');
  const pageLabelNum = document.getElementById('pageLabelNum');
  const bookNav      = document.getElementById('bookNav');
  const prevBtn      = document.getElementById('prevBtn');
  const nextBtn      = document.getElementById('nextBtn');
  const currentPageEl= document.getElementById('currentPage');
  const totalPagesEl = document.getElementById('totalPages');
  const themeBtn     = document.getElementById('themeBtn');
  const sunIcon      = themeBtn.querySelector('.sun-icon');
  const moonIcon     = themeBtn.querySelector('.moon-icon');

  // ─── STATE ─────────────────────────────────────────────────
  let artbook    = null;
  let currentIdx = 0;
  let isAnimating = false;

  // ─── THEME ─────────────────────────────────────────────────
  const savedTheme = localStorage.getItem('theme') || 'light';
  setTheme(savedTheme);

  themeBtn.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
  });

  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    sunIcon.style.display  = t === 'dark'  ? 'none' : 'block';
    moonIcon.style.display = t === 'dark'  ? 'block' : 'none';
  }

  // ─── INIT: LOAD ARTBOOK ────────────────────────────────────
  async function init() {
    loadingState.style.display = 'flex';

    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      if (data.ok && data.config) {
        artbook = data.config;
      } else {
        throw new Error('No config');
      }
    } catch {
      artbook = { pages: [] };
    }

    loadingState.style.display = 'none';
    render();
  }

  // ─── RENDER ────────────────────────────────────────────────
  function render() {
    const pages = artbook?.pages || [];

    if (pages.length === 0) {
      emptyState.style.display = 'flex';
      pageArea.style.display   = 'none';
      bookNav.style.display    = 'none';
      return;
    }

    emptyState.style.display = 'none';
    pageArea.style.display   = 'flex';
    bookNav.style.display    = 'flex';

    // Clamp index
    currentIdx = Math.max(0, Math.min(currentIdx, pages.length - 1));

    renderPage(pages[currentIdx]);
    updateNav(pages.length);
  }

  function renderPage(page, direction) {
    // Remove any existing page
    const existing = pageStage.querySelector('.art-page');
    if (existing) {
      if (direction) {
        existing.classList.add(direction === 'forward' ? 'leaving-forward' : 'leaving-back');
        existing.addEventListener('animationend', () => existing.remove(), { once: true });
      } else {
        existing.remove();
      }
    }

    const el = buildPage(page);

    if (direction) {
      el.classList.add(direction === 'forward' ? 'entering-forward' : 'entering-back');
      el.addEventListener('animationend', () => {
        el.classList.remove('entering-forward', 'entering-back');
        isAnimating = false;
      }, { once: true });
    }

    pageStage.appendChild(el);
    pageLabelNum.textContent = currentIdx + 1;
  }

  function buildPage(page) {
    const layout = page.layout || 'large';
    const artworks = page.artworks || [];

    const el = document.createElement('div');
    el.className = `art-page layout-${layout}`;

    switch(layout) {
      case 'flood':  buildFloodLayout(el, artworks[0]); break;
      case 'large':  buildLargeLayout(el, artworks[0]); break;
      case 'medium': buildMultiLayout(el, artworks, 'medium'); break;
      case 'small':  buildMultiLayout(el, artworks, 'small'); break;
    }

    return el;
  }

  // ─── LAYOUT BUILDERS ───────────────────────────────────────

  function buildFloodLayout(el, art) {
    if (!art) { el.appendChild(makeEmptyPlaceholder()); return; }

    const wrap = document.createElement('div');
    wrap.className = 'artwork-flood';

    const img = makeImg(art.url, art.title);
    // Apply saved horizontal focal point (0–100); default 50 = centre
    const focalX = (art.focalX !== undefined) ? art.focalX : 50;
    img.style.objectPosition = `${focalX}% 50%`;
    const caption = document.createElement('div');
    caption.className = 'flood-caption';
    caption.innerHTML = `
      <div class="art-title">${esc(art.title || '')}</div>
      ${art.date ? `<div class="art-meta">${esc(formatDate(art.date))}</div>` : ''}
    `;

    wrap.appendChild(img);
    wrap.appendChild(caption);
    el.appendChild(wrap);
  }

  function buildLargeLayout(el, art) {
    if (!art) { el.appendChild(makeEmptyPlaceholder()); return; }

    const wrap = document.createElement('div');
    wrap.className = 'artwork-large';

    const shield = document.createElement('div');
    shield.className = 'img-shield';
    shield.appendChild(makeImg(art.url, art.title));

    const caption = document.createElement('div');
    caption.className = 'art-caption-block';
    caption.innerHTML = `
      <div class="art-title">${esc(art.title || '')}</div>
      ${art.date ? `<div class="art-meta">${esc(formatDate(art.date))}</div>` : ''}
      ${art.description ? `<div class="art-desc">${esc(art.description)}</div>` : ''}
    `;

    wrap.appendChild(shield);
    wrap.appendChild(caption);
    el.appendChild(wrap);
  }

  function buildMultiLayout(el, artworks, size) {
    // Each artwork gets its own grid row (image + text)
    artworks.forEach(art => {
      const textPos = art.textPosition || 'right'; // 'right' = img left, text right; 'left' = text left, img right
      const row = document.createElement('div');
      row.className = `artwork-${size}${textPos === 'left' ? ' text-left' : ''}`;

      const imgCol = document.createElement('div');
      imgCol.className = 'img-col';
      imgCol.appendChild(makeImg(art.url, art.title));

      const textCol = document.createElement('div');
      textCol.className = 'text-col';
      textCol.innerHTML = `
        <div class="art-title">${esc(art.title || '')}</div>
        ${art.date ? `<div class="art-meta">${esc(formatDate(art.date))}</div>` : ''}
        ${art.description ? `<div class="art-desc">${esc(art.description)}</div>` : ''}
      `;

      row.appendChild(imgCol);
      row.appendChild(textCol);
      el.appendChild(row);
    });
  }

  function makeImg(url, alt) {
    const img = document.createElement('img');
    img.src = url || '';
    img.alt = alt || '';
    img.draggable = false;
    img.loading = 'eager';
    img.decoding = 'async';
    img.onerror = () => {
      // Replace broken image with inline placeholder
      const ph = makeEmptyPlaceholder('Image not found');
      img.parentNode?.replaceChild(ph, img);
    };
    return img;
  }

  function makeEmptyPlaceholder(label = 'No image added') {
    const ph = document.createElement('div');
    ph.className = 'page-placeholder';
    ph.innerHTML = `
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <rect x="2" y="2" width="32" height="32" rx="2" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 3"/>
        <path d="M2 26l9-9 6 6 5-5 12 12" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="25" cy="12" r="3.5" stroke="currentColor" stroke-width="1.2"/>
      </svg>
      <span>${esc(label)}</span>
    `;
    return ph;
  }

  // ─── NAVIGATION ────────────────────────────────────────────
  function updateNav(total) {
    const pages = total || artbook?.pages?.length || 0;
    currentPageEl.textContent = currentIdx + 1;
    totalPagesEl.textContent  = pages;
    prevBtn.disabled = currentIdx === 0;
    nextBtn.disabled = currentIdx >= pages - 1;
  }

  function goTo(idx, direction) {
    if (isAnimating) return;
    const pages = artbook?.pages || [];
    if (idx < 0 || idx >= pages.length) return;
    isAnimating = true;

    const oldIdx = currentIdx;
    currentIdx = idx;

    const existing = pageStage.querySelector('.art-page');
    if (existing) {
      existing.classList.add(direction === 'forward' ? 'leaving-forward' : 'leaving-back');
      existing.addEventListener('animationend', () => existing.remove(), { once: true });
    }

    const el = buildPage(pages[currentIdx]);
    el.classList.add(direction === 'forward' ? 'entering-forward' : 'entering-back');
    el.addEventListener('animationend', () => {
      el.classList.remove('entering-forward', 'entering-back');
      isAnimating = false;
    }, { once: true });

    pageStage.appendChild(el);
    pageLabelNum.textContent = currentIdx + 1;
    updateNav(pages.length);
  }

  prevBtn.addEventListener('click', () => goTo(currentIdx - 1, 'back'));
  nextBtn.addEventListener('click', () => goTo(currentIdx + 1, 'forward'));

  // Keyboard
  document.addEventListener('keydown', e => {
    if (document.querySelector('.admin-overlay.open') ||
        document.querySelector('.modal-overlay[style*="flex"]')) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goTo(currentIdx + 1, 'forward');
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   goTo(currentIdx - 1, 'back');
  });

  // Swipe
  let touchStartX = 0, touchStartY = 0;
  document.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 48) {
      dx < 0 ? goTo(currentIdx + 1, 'forward') : goTo(currentIdx - 1, 'back');
    }
  }, { passive: true });

  // ─── UTILS ─────────────────────────────────────────────────
  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    } catch { return dateStr; }
  }

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ─── PUBLIC API (for admin.js) ─────────────────────────────
  window._artbookViewer = {
    getArtbook: () => artbook,
    setArtbook: (cfg) => { artbook = cfg; },
    rerender:   () => { render(); }
  };

  // ─── START ─────────────────────────────────────────────────
  init();

})();
