/* ═══════════════════════════════════════════════════════════
   viewer.js — Public Artbook Viewer  v3
   • All sizes anchored to A4 frame pixel dimensions via
     CSS custom properties --a4-w / --a4-h (set by ResizeObserver)
   • Flood: adjustable height ratio, corner position (TL/TR/BL/BR),
     text-box size, info icon popup with art details
   • Large: text-align option, text height ratio, image auto-shrinks
     when text is tall
   • Medium/Small: heights equalised across rows so the tallest
     text column dictates all image heights on that page
═══════════════════════════════════════════════════════════ */

'use strict';

(function () {

  // ─── DOM ───────────────────────────────────────────────────
  const loadingState  = document.getElementById('loadingState');
  const emptyState    = document.getElementById('emptyState');
  const pageArea      = document.getElementById('pageArea');
  const pageStage     = document.getElementById('pageStage');
  const a4Frame       = document.getElementById('a4Frame');
  const pageLabelNum  = document.getElementById('pageLabelNum');
  const bookNav       = document.getElementById('bookNav');
  const prevBtn       = document.getElementById('prevBtn');
  const nextBtn       = document.getElementById('nextBtn');
  const currentPageEl = document.getElementById('currentPage');
  const totalPagesEl  = document.getElementById('totalPages');
  const themeBtn      = document.getElementById('themeBtn');
  const sunIcon       = themeBtn.querySelector('.sun-icon');
  const moonIcon      = themeBtn.querySelector('.moon-icon');

  // ─── STATE ─────────────────────────────────────────────────
  let artbook     = null;
  let currentIdx  = 0;
  let isAnimating = false;

  // ─── A4 DIMENSION TRACKING ─────────────────────────────────
  // Sets --a4-w and --a4-h on the a4Frame element whenever it resizes.
  // All layout CSS uses calc(var(--a4-w) * ratio) for consistent sizing.
  function updateA4Vars() {
    if (!a4Frame) return;
    const w = a4Frame.offsetWidth;
    const h = a4Frame.offsetHeight;
    a4Frame.style.setProperty('--a4-w', w + 'px');
    a4Frame.style.setProperty('--a4-h', h + 'px');
  }

  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(updateA4Vars).observe(a4Frame);
  }
  window.addEventListener('resize', updateA4Vars);
  // Call immediately and after fonts load
  updateA4Vars();
  document.fonts?.ready?.then(updateA4Vars);

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
    sunIcon.style.display  = t === 'dark' ? 'none' : 'block';
    moonIcon.style.display = t === 'dark' ? 'block' : 'none';
  }

  // ─── INIT ──────────────────────────────────────────────────
  async function init() {
    loadingState.style.display = 'flex';
    try {
      const res  = await fetch('/api/config');
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
    currentIdx = Math.max(0, Math.min(currentIdx, pages.length - 1));
    renderPage(pages[currentIdx]);
    updateNav(pages.length);
  }

  function renderPage(page, direction) {
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
    const layout   = page.layout || 'large';
    const artworks = page.artworks || [];
    const el       = document.createElement('div');
    el.className   = `art-page layout-${layout}`;
    // Per-page background colour
    if (page.bgColour) {
      el.style.background = page.bgColour;
    }
    switch (layout) {
      case 'flood':  buildFloodLayout(el, artworks[0], page);  break;
      case 'large':  buildLargeLayout(el, artworks[0], page);  break;
      case 'medium': buildMultiLayout(el, artworks, 'medium'); break;
      case 'small':  buildMultiLayout(el, artworks, 'small');  break;
    }
    return el;
  }

  // ─── LAYOUT: FLOOD ─────────────────────────────────────────
  // Page settings consumed here:
  //   page.floodCorner    : 'tl'|'tr'|'bl'|'br'  (default 'bl')
  //   page.floodHeightRatio: 0.0–1.0             (default 0.18, fraction of A4 height)
  //   page.floodTextScale : 0.5–2.0              (default 1.0)
  //   art.focalX          : 0–100                (default 50)

  function buildFloodLayout(el, art, page) {
    if (!art) { el.appendChild(makeEmptyPlaceholder()); return; }

    const corner      = page.floodCorner      || 'bl';
    const heightRatio = page.floodHeightRatio !== undefined ? page.floodHeightRatio : 0.18;
    const textScale   = page.floodTextScale   !== undefined ? page.floodTextScale   : 1.0;
    const focalX      = art.focalX !== undefined ? art.focalX : 50;

    const wrap = document.createElement('div');
    wrap.className = 'artwork-flood';

    const img = makeImg(art.url, art.title);
    img.style.objectPosition = `${focalX}% 50%`;
    img.addEventListener('load', () => applyFloodTheme(img, wrap, focalX), { once: true });

    // Caption box — anchored by corner setting
    const caption = document.createElement('div');
    caption.className = `flood-caption flood-caption--${corner}`;
    // Height ratio → CSS var on the caption itself
    caption.style.setProperty('--flood-h-ratio', heightRatio);
    caption.style.setProperty('--flood-text-scale', textScale);

    const titleEl = document.createElement('div');
    titleEl.className = 'art-title flood-title';
    titleEl.textContent = art.title || '';

    const metaEl = art.date ? document.createElement('div') : null;
    if (metaEl) {
      metaEl.className = 'art-meta flood-meta';
      metaEl.textContent = formatDate(art.date);
    }

    // Info icon — right of text for left corners, left of text for right corners
    const infoBtn = document.createElement('button');
    infoBtn.className = 'flood-info-btn';
    infoBtn.setAttribute('aria-label', 'Art details');
    infoBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.3"/>
      <path d="M8 7v5M8 5.5v.01" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`;

    // Info popup
    const infoPopup = document.createElement('div');
    infoPopup.className = `flood-info-popup flood-info-popup--${corner}`;
    infoPopup.style.display = 'none';

    const fields = [];
    if (art.description) fields.push({ label: 'About', value: art.description });
    if (art.concept) {
      const ORDER = ['medium','colour','theme','genre','style','timer'];
      ORDER.forEach(k => {
        const v = art.concept[k];
        if (!v) return;
        const vals = (Array.isArray(v) ? v : [v]).filter(Boolean);
        if (vals.length) fields.push({ label: k.charAt(0).toUpperCase() + k.slice(1), value: vals.join(', ') });
      });
    }
    if (art.date) fields.push({ label: 'Date', value: formatDate(art.date) });

    fields.forEach(f => {
      const row = document.createElement('div');
      row.className = 'flood-info-row';
      row.innerHTML = `<span class="flood-info-label">${esc(f.label)}</span><span class="flood-info-value">${esc(f.value)}</span>`;
      infoPopup.appendChild(row);
    });

    if (fields.length === 0) {
      infoPopup.innerHTML = '<span class="flood-info-empty">No details added.</span>';
    }

    // Toggle popup
    let popupOpen = false;
    infoBtn.addEventListener('click', e => {
      e.stopPropagation();
      popupOpen = !popupOpen;
      infoPopup.style.display = popupOpen ? 'flex' : 'none';
      infoBtn.classList.toggle('active', popupOpen);
    });
    el.addEventListener('click', () => {
      if (popupOpen) { popupOpen = false; infoPopup.style.display = 'none'; infoBtn.classList.remove('active'); }
    });

    // Arrange: left corners → [text | info], right corners → [info | text]
    const isRight = corner === 'tr' || corner === 'br';
    const textGroup = document.createElement('div');
    textGroup.className = 'flood-caption-text';
    titleEl && textGroup.appendChild(titleEl);
    metaEl  && textGroup.appendChild(metaEl);

    if (isRight) {
      caption.appendChild(infoBtn);
      caption.appendChild(textGroup);
    } else {
      caption.appendChild(textGroup);
      caption.appendChild(infoBtn);
    }

    wrap.appendChild(img);
    wrap.appendChild(caption);
    wrap.appendChild(infoPopup);
    el.appendChild(wrap);
  }

  // ── Brightness sampling for flood caption colour ──────────────
  function applyFloodTheme(img, wrap, focalX) {
    try {
      const SAMPLE_W = 120, SAMPLE_H = 80;
      const canvas   = document.createElement('canvas');
      canvas.width   = SAMPLE_W;
      canvas.height  = SAMPLE_H;
      const ctx      = canvas.getContext('2d');
      const natW     = img.naturalWidth  || 1;
      const natH     = img.naturalHeight || 1;
      const dispW    = img.offsetWidth   || wrap.offsetWidth   || 400;
      const dispH    = img.offsetHeight  || wrap.offsetHeight  || 566;
      const scale    = Math.max(dispW / natW, dispH / natH);
      const scaledW  = natW * scale;
      const scaledH  = natH * scale;
      const offsetX  = (focalX / 100) * (dispW - scaledW);
      const offsetY  = (dispH - scaledH) / 2;
      const stripTop = dispH * 0.70;
      const srcX     = Math.max(0, -offsetX / scale);
      const srcY     = Math.max(0, (stripTop - offsetY) / scale);
      const srcW     = Math.min(natW - srcX, dispW / scale);
      const srcH     = Math.min(natH - srcY, (dispH * 0.30) / scale);
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, SAMPLE_W, SAMPLE_H);
      const data   = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data;
      let total    = 0;
      const pixels = SAMPLE_W * SAMPLE_H;
      for (let i = 0; i < data.length; i += 4) {
        total += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      }
      const avg = total / pixels;
      if (avg > 140) {
        wrap.style.setProperty('--flood-bg', 'rgba(15,13,11,0.88)');
        wrap.style.setProperty('--flood-fg', '#f0ede6');
      } else {
        wrap.style.setProperty('--flood-bg', 'rgba(255,255,255,0.92)');
        wrap.style.setProperty('--flood-fg', '#1a1814');
      }
    } catch {
      wrap.style.setProperty('--flood-bg', 'rgba(255,255,255,0.92)');
      wrap.style.setProperty('--flood-fg', '#1a1814');
    }
  }

  // ─── LAYOUT: LARGE ─────────────────────────────────────────
  // Page settings consumed:
  //   page.largeTextAlign  : 'left'|'center'|'right'  (default 'center')
  //   page.largeTextRatio  : 0.0–0.6                  (fraction of A4 height for text block, default 0.22)

  function buildLargeLayout(el, art, page) {
    if (!art) { el.appendChild(makeEmptyPlaceholder()); return; }

    const textAlign = page.largeTextAlign || 'center';
    const textRatio = page.largeTextRatio !== undefined ? page.largeTextRatio : 0.22;

    const wrap = document.createElement('div');
    wrap.className = 'artwork-large';
    wrap.dataset.textAlign = textAlign;

    const shield = document.createElement('div');
    shield.className = 'img-shield';
    shield.appendChild(makeImg(art.url, art.title));

    const caption = document.createElement('div');
    caption.className = 'art-caption-block';
    caption.style.setProperty('--large-text-ratio', textRatio);
    caption.style.textAlign = textAlign;
    // Width matches image — enforced via flex column + align-self stretch

    const titleEl = document.createElement('div');
    titleEl.className = 'art-title large-title';
    titleEl.textContent = art.title || '';
    caption.appendChild(titleEl);

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

  // ─── LAYOUT: MEDIUM / SMALL ────────────────────────────────
  // Heights are equalised: after rendering, if any text column is taller
  // than its paired image, we expand all image heights equally so that the
  // total heights are balanced across all artworks on the page.

  function buildMultiLayout(el, artworks, size) {
    artworks.forEach(art => {
      const textPos    = art.textPosition || 'right';
      const splitRatio = art.splitRatio !== undefined ? art.splitRatio : 50;
      const row        = document.createElement('div');
      row.className    = `artwork-${size}${textPos === 'left' ? ' text-left' : ''}`;
      row.style.setProperty('--split-img', splitRatio + '%');
      row.style.setProperty('--split-txt', (100 - splitRatio) + '%');

      const imgCol = document.createElement('div');
      imgCol.className = 'img-col';
      imgCol.appendChild(makeImg(art.url, art.title));

      if (art.title || art.date) {
        const imgCaption = document.createElement('div');
        imgCaption.className = 'img-col-caption';
        imgCaption.innerHTML = `
          ${art.title ? `<div class="art-title art-title--small">${esc(art.title)}</div>` : ''}
          ${art.date  ? `<div class="art-meta">${esc(formatDate(art.date))}</div>` : ''}
        `;
        imgCol.appendChild(imgCaption);
      }

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

    // Equalise row heights after paint
    // We wait one frame so images/text have rendered dimensions
    requestAnimationFrame(() => equaliseMultiHeights(el, size));
  }

  // Equalise heights: for each row, measure the text column natural height.
  // If the tallest text column across all rows is taller than any image,
  // set a shared image height so no row overflows.
  function equaliseMultiHeights(pageEl, size) {
    const rows = Array.from(pageEl.querySelectorAll(`.artwork-${size}`));
    if (rows.length === 0) return;

    // Reset any previously set heights
    rows.forEach(row => {
      const img = row.querySelector('.img-col img');
      if (img) img.style.height = '';
    });

    if (rows.length === 1) return; // nothing to equalise

    // Measure intrinsic heights of each pair (after clearing forced heights)
    const a4H = a4Frame.offsetHeight || 1;

    // Find the tallest text-column height
    let maxTextH = 0;
    rows.forEach(row => {
      const textCol = row.querySelector('.text-col');
      if (textCol) maxTextH = Math.max(maxTextH, textCol.scrollHeight);
    });

    // Find the tallest img-col height
    let maxImgH = 0;
    rows.forEach(row => {
      const img = row.querySelector('.img-col img');
      if (img) maxImgH = Math.max(maxImgH, img.naturalHeight > 0 ? img.offsetHeight : 0);
    });

    // The height each row should occupy = max(maxTextH, default_img_h)
    // Divide available A4 height equally among rows
    // Available = A4 height minus padding (approx 8% each side)
    const padding = size === 'medium' ? 0.08 : 0.06;
    const availH  = a4H * (1 - padding * 2);
    const gap      = size === 'medium' ? 20 : 12;
    const rowCount = rows.length;
    const targetH  = (availH - gap * (rowCount - 1)) / rowCount;

    // If text is taller than targetH, we need to shrink proportionally —
    // in that case just let each row flex; only set explicit heights when
    // images would otherwise dominate.
    if (maxTextH > targetH) return; // let CSS flex handle it naturally

    // Set img height to the target row height minus caption text below image
    rows.forEach(row => {
      const img     = row.querySelector('.img-col img');
      const caption = row.querySelector('.img-col-caption');
      const captionH = caption ? caption.offsetHeight + 6 : 0;
      if (img) {
        const h = Math.max(40, targetH - captionH);
        img.style.height = h + 'px';
        img.style.maxHeight = h + 'px';
      }
    });
  }

  // ─── CONCEPT LINE ──────────────────────────────────────────
  const ABBREVS = {
    'Graphite Pencil (H–HB)':        'Graphite H–HB',
    'Graphite Pencil (B–9B)':        'Graphite B–9B',
    'Mechanical Pencil':             'Mech. Pencil',
    'Charcoal Stick (Vine)':         'Vine Charcoal',
    'Charcoal Stick (Compressed)':   'Comp. Charcoal',
    'Charcoal Block / Conté Carré': 'Conté',
    'Conté Crayon':                  'Conté Crayon',
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
    'Tempera (Egg)':                 'Egg Tempera',
  };

  function abbreviate(val) {
    if (ABBREVS[val]) return ABBREVS[val];
    if (val.length > 14) return val.replace(/\s*\([^)]*\)\s*$/, '').trim();
    return val;
  }

  function buildConceptLine(concept, mode) {
    if (!concept || typeof concept !== 'object') return null;
    const ORDER    = ['medium', 'colour', 'theme', 'genre', 'style', 'timer'];
    const segments = [];
    ORDER.forEach(key => {
      const val  = concept[key];
      if (!val) return;
      const vals = (Array.isArray(val) ? val : [val]).filter(Boolean);
      if (vals.length === 0) return;
      segments.push(vals.map(v => mode === 'short' ? abbreviate(v) : v).join(', '));
    });
    if (segments.length === 0) return null;
    const el = document.createElement('div');
    el.className = 'art-concept-line art-concept-line--' + mode;
    // Use innerHTML with <wbr> after each · so long lines wrap naturally
    el.innerHTML = segments.map(s => esc(s)).join(' \u00b7<wbr> ');
    return el;
  }

  // ─── HELPERS ───────────────────────────────────────────────
  function makeImg(url, alt) {
    const img      = document.createElement('img');
    img.src        = url || '';
    img.alt        = alt || '';
    img.draggable  = false;
    img.loading    = 'eager';
    img.decoding   = 'async';
    img.onerror    = () => {
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
    const pages     = total || artbook?.pages?.length || 0;
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
    currentIdx  = idx;

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

  document.addEventListener('keydown', e => {
    if (document.querySelector('.admin-overlay.open') ||
        document.querySelector('.modal-overlay[style*="flex"]')) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goTo(currentIdx + 1, 'forward');
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   goTo(currentIdx - 1, 'back');
  });

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
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ─── ZOOM & PAN ────────────────────────────────────────────
  (function initZoomPan() {
    const zoomSlider = document.getElementById('zoomSlider');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const zoomInBtn  = document.getElementById('zoomInBtn');
    const zoomPct    = document.getElementById('zoomPct');
    if (!zoomSlider || !a4Frame) return;

    let zoomLevel = 1.0;
    let panX = 0, panY = 0;
    const MIN_ZOOM = 1.0, MAX_ZOOM = 2.0, STEP = 0.05;

    function clampPan(zoom) {
      const frameW = a4Frame.offsetWidth;
      const frameH = a4Frame.offsetHeight;
      const maxPanX = ((zoom - 1) * frameW) / 2;
      const maxPanY = ((zoom - 1) * frameH) / 2;
      panX = Math.max(-maxPanX, Math.min(maxPanX, panX));
      panY = Math.max(-maxPanY, Math.min(maxPanY, panY));
    }

    function applyTransform() {
      a4Frame.style.transform = `scale(${zoomLevel}) translate(${panX / zoomLevel}px, ${panY / zoomLevel}px)`;
      const canPan = zoomLevel > MIN_ZOOM;
      a4Frame.classList.toggle('can-pan', canPan);
      zoomOutBtn.disabled = zoomLevel <= MIN_ZOOM;
      zoomInBtn.disabled  = zoomLevel >= MAX_ZOOM;
    }

    function setZoom(z) {
      zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
      if (zoomLevel === MIN_ZOOM) { panX = 0; panY = 0; }
      else clampPan(zoomLevel);
      zoomSlider.value = Math.round(zoomLevel * 100);
      zoomPct.textContent = Math.round(zoomLevel * 100) + '%';
      applyTransform();
    }

    zoomSlider.addEventListener('input', () => setZoom(parseInt(zoomSlider.value, 10) / 100));
    zoomOutBtn.addEventListener('click', () => setZoom(zoomLevel - STEP));
    zoomInBtn.addEventListener('click',  () => setZoom(zoomLevel + STEP));

    // Mouse pan
    let dragging = false, dragStartX = 0, dragStartY = 0, panStartX = 0, panStartY = 0;

    a4Frame.addEventListener('mousedown', e => {
      if (zoomLevel <= MIN_ZOOM) return;
      if (e.target.closest('button,a,select,input')) return;
      dragging = true;
      dragStartX = e.clientX; dragStartY = e.clientY;
      panStartX = panX; panStartY = panY;
      a4Frame.classList.add('is-panning');
      e.preventDefault();
    });
    window.addEventListener('mousemove', e => {
      if (!dragging) return;
      panX = panStartX + (e.clientX - dragStartX);
      panY = panStartY + (e.clientY - dragStartY);
      clampPan(zoomLevel);
      applyTransform();
    });
    window.addEventListener('mouseup', () => {
      dragging = false;
      a4Frame.classList.remove('is-panning');
    });

    // Touch pan
    let tStartX = 0, tStartY = 0, tPanStartX = 0, tPanStartY = 0, tPanning = false;
    a4Frame.addEventListener('touchstart', e => {
      if (e.touches.length === 1 && zoomLevel > MIN_ZOOM) {
        tPanning = true;
        tStartX = e.touches[0].clientX; tStartY = e.touches[0].clientY;
        tPanStartX = panX; tPanStartY = panY;
      } else { tPanning = false; }
    }, { passive: true });
    a4Frame.addEventListener('touchmove', e => {
      if (!tPanning || e.touches.length !== 1 || zoomLevel <= MIN_ZOOM) return;
      panX = tPanStartX + (e.touches[0].clientX - tStartX);
      panY = tPanStartY + (e.touches[0].clientY - tStartY);
      clampPan(zoomLevel);
      applyTransform();
    }, { passive: true });

    // Reset pan on page change
    const resetPan = () => { panX = 0; panY = 0; applyTransform(); };
    if (prevBtn) prevBtn.addEventListener('click', resetPan);
    if (nextBtn) nextBtn.addEventListener('click', resetPan);

    setZoom(1.0);
  })();

  // ─── PUBLIC API ────────────────────────────────────────────
  window._artbookViewer = {
    getArtbook: () => artbook,
    setArtbook: (cfg) => { artbook = cfg; },
    rerender:   () => { render(); }
  };

  init();

})();
