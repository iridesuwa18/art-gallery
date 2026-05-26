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

    // Sample image brightness under the caption zone once loaded,
    // then set --flood-bg / --flood-fg on wrap accordingly.
    img.addEventListener('load', () => applyFloodTheme(img, wrap, focalX), { once: true });

    wrap.appendChild(img);
    wrap.appendChild(caption);
    el.appendChild(wrap);
  }

  // ── Brightness sampling ──────────────────────────────────────
  // Draws the image into an offscreen canvas, samples the bottom-30%
  // strip (where the caption sits), and picks white-on-dark or
  // black-on-light accordingly.
  function applyFloodTheme(img, wrap, focalX) {
    try {
      const SAMPLE_W = 120;
      const SAMPLE_H = 80;
      const canvas = document.createElement('canvas');
      canvas.width  = SAMPLE_W;
      canvas.height = SAMPLE_H;
      const ctx = canvas.getContext('2d');

      // Replicate object-fit:cover + object-position for the sample region.
      // We only sample the bottom 30% of the rendered image (caption zone).
      const natW = img.naturalWidth  || img.width  || 1;
      const natH = img.naturalHeight || img.height || 1;
      const dispW = img.offsetWidth  || wrap.offsetWidth  || 400;
      const dispH = img.offsetHeight || wrap.offsetHeight || 566;

      // Scale to cover
      const scale = Math.max(dispW / natW, dispH / natH);
      const scaledW = natW * scale;
      const scaledH = natH * scale;

      // object-position X offset
      const offsetX = ((focalX / 100) * (dispW - scaledW));
      const offsetY = (dispH - scaledH) / 2;  // vertically centred

      // We want the bottom 30% strip of the display
      const stripTop = dispH * 0.70;

      // Map strip back into source image coords
      const srcX = Math.max(0, (-offsetX / scale));
      const srcY = Math.max(0, (stripTop - offsetY) / scale);
      const srcW = Math.min(natW - srcX, dispW / scale);
      const srcH = Math.min(natH - srcY, (dispH * 0.30) / scale);

      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, SAMPLE_W, SAMPLE_H);

      const data = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data;
      let total = 0;
      const pixels = SAMPLE_W * SAMPLE_H;
      for (let i = 0; i < data.length; i += 4) {
        // Perceived luminance (ITU-R BT.709)
        total += 0.2126 * data[i] + 0.7152 * data[i+1] + 0.0722 * data[i+2];
      }
      const avgLuminance = total / pixels; // 0–255

      // Light background → dark box; dark background → light box
      if (avgLuminance > 140) {
        wrap.style.setProperty('--flood-bg', 'rgba(15,13,11,0.88)');
        wrap.style.setProperty('--flood-fg', '#f0ede6');
      } else {
        wrap.style.setProperty('--flood-bg', 'rgba(255,255,255,0.92)');
        wrap.style.setProperty('--flood-fg', '#1a1814');
      }
    } catch {
      // Cross-origin or canvas tainted — fall back to light box
      wrap.style.setProperty('--flood-bg', 'rgba(255,255,255,0.92)');
      wrap.style.setProperty('--flood-fg', '#1a1814');
    }
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

    const titleEl = document.createElement('div');
    titleEl.className = 'art-title';
    titleEl.textContent = art.title || '';
    caption.appendChild(titleEl);

    // Concept line — full words, sits just under title, above date
    const conceptEl = buildConceptLine(art.concept, 'full');
    if (conceptEl) caption.appendChild(conceptEl);

    if (art.date) {
      const metaEl = document.createElement('div');
      metaEl.className = 'art-meta';
      metaEl.textContent = formatDate(art.date);
      caption.appendChild(metaEl);
    }
    if (art.description) {
      const descEl = document.createElement('div');
      descEl.className = 'art-desc';
      descEl.textContent = art.description;
      caption.appendChild(descEl);
    }

    wrap.appendChild(shield);
    wrap.appendChild(caption);
    el.appendChild(wrap);
  }

  function buildMultiLayout(el, artworks, size) {
    // Each artwork gets its own grid row (image + text)
    artworks.forEach(art => {
      const textPos   = art.textPosition || 'right';
      const splitRatio = art.splitRatio !== undefined ? art.splitRatio : 50; // % for img col
      const row = document.createElement('div');
      row.className = `artwork-${size}${textPos === 'left' ? ' text-left' : ''}`;
      // Apply split ratio as CSS custom property (image col width as % of total)
      row.style.setProperty('--split-img', splitRatio + '%');
      row.style.setProperty('--split-txt', (100 - splitRatio) + '%');

      const imgCol = document.createElement('div');
      imgCol.className = 'img-col';
      imgCol.appendChild(makeImg(art.url, art.title));

      // Title + date below image — no concept here
      if (art.title || art.date) {
        const imgCaption = document.createElement('div');
        imgCaption.className = 'img-col-caption';
        imgCaption.innerHTML = `
          ${art.title ? `<div class="art-title art-title--small">${esc(art.title)}</div>` : ''}
          ${art.date  ? `<div class="art-meta">${esc(formatDate(art.date))}</div>` : ''}
        `;
        imgCol.appendChild(imgCaption);
      }

      // Text col: concept line first (abbreviated), then description
      const textCol = document.createElement('div');
      textCol.className = 'text-col';

      const conceptEl = buildConceptLine(art.concept, 'short');
      if (conceptEl) textCol.appendChild(conceptEl);

      if (art.description) {
        const descEl = document.createElement('div');
        descEl.className = 'art-desc';
        descEl.textContent = art.description;
        textCol.appendChild(descEl);
      }

      if (!conceptEl && !art.description) {
        textCol.style.display = 'none';
      }

      row.appendChild(imgCol);
      row.appendChild(textCol);
      el.appendChild(row);
    });
  }

  // ─── CONCEPT LINE ──────────────────────────────────────────
  // Returns a single comma-separated inline string of concept values.
  // mode: 'full' (large layout) — full words
  //       'short' (medium/small) — abbreviated where long
  const ABBREVS = {
    // Mediums
    'Graphite Pencil (H–HB)':         'Graphite H–HB',
    'Graphite Pencil (B–9B)':         'Graphite B–9B',
    'Mechanical Pencil':              'Mech. Pencil',
    'Charcoal Stick (Vine)':         'Vine Charcoal',
    'Charcoal Stick (Compressed)':   'Comp. Charcoal',
    'Charcoal Block / Conté Carré': 'Conté',
    'Conté Crayon':                   'Conté Crayon',
    'Coloured Pencil (wax-based)':   'Col. Pencil',
    'Coloured Pencil (oil-based)':   'Oil Col. Pencil',
    'Water-soluble Coloured Pencil': 'Watersoluble CP',
    'Graphite Powder / Stick':       'Graphite Powder',
    'Silver / Metalpoint':           'Metalpoint',
    'Felt Tip / Marker (thin)':      'Thin Marker',
    'Felt Tip / Marker (chisel)':    'Chisel Marker',
    'Fine Liner / Technical Pen':    'Fine Liner',
    'Brush Pen (soft)':              'Soft Brush Pen',
    'Brush Pen (hard)':              'Hard Brush Pen',
    'Dip Pen / Nib':                 'Dip Pen',
    'Reed Pen / Bamboo Pen':         'Reed Pen',
    'Indian Ink (brush applied)':    'Indian Ink',
    'Tempera (Egg)':                 'Egg Tempera',
    'Encaustic (Wax Paint)':         'Encaustic',
    'Fresco (wet plaster)':          'Fresco',
    // Colours — already short, no abbrev needed
    // Generic shortening rule: if >14 chars and no abbrev, trim trailing paren
  };

  function abbreviate(val) {
    if (ABBREVS[val]) return ABBREVS[val];
    if (val.length > 14) {
      // Strip trailing parenthetical e.g. "Oil Paint (heavy body)" -> "Oil Paint"
      return val.replace(/\s*\([^)]*\)\s*$/, '').trim();
    }
    return val;
  }

  function buildConceptLine(concept, mode) {
    if (!concept || typeof concept !== 'object') return null;
    const ORDER = ['medium','colour','theme','genre','style','timer'];
    // Each field becomes one segment; multiple values within a field join with ", "
    // Segments are then joined with " · " between fields
    const segments = [];
    ORDER.forEach(key => {
      const val = concept[key];
      if (!val) return;
      const vals = (Array.isArray(val) ? val : [val]).filter(Boolean);
      if (vals.length === 0) return;
      segments.push(vals.map(v => mode === 'short' ? abbreviate(v) : v).join(', '));
    });
    if (segments.length === 0) return null;
    const el = document.createElement('div');
    el.className = 'art-concept-line art-concept-line--' + mode;
    el.textContent = segments.join(' \u00b7 ');
    return el;
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
