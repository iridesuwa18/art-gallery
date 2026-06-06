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
  const pageLabelRow  = pageLabelNum?.closest('.page-label-row') || null;
  const bookNav       = document.getElementById('bookNav');
  const prevBtn       = document.getElementById('prevBtn');
  const nextBtn       = document.getElementById('nextBtn');
  const currentPageEl = document.getElementById('currentPage');
  const totalPagesEl  = document.getElementById('totalPages');
  const themeBtn      = document.getElementById('themeBtn');
  const sunIcon       = themeBtn.querySelector('.sun-icon');
  const moonIcon      = themeBtn.querySelector('.moon-icon');
  const multiViewBtn  = document.getElementById('multiViewBtn');
  const singleViewWrap= document.getElementById('singleViewWrap');
  const multiViewWrap = document.getElementById('multiViewWrap');
  const multiPageGrid = document.getElementById('multiPageGrid');

  // ─── STATE ─────────────────────────────────────────────────
  let artbook          = null;
  let currentIdx       = 0;
  let isAnimating      = false;
  let multiMode        = false;   // multi-page view active
  let fsMode           = false;   // fullscreen overlay active
  const PAGES_PER_SPREAD = 4;     // pages shown per spread in multi-mode

  // ─── A4 DIMENSION TRACKING ─────────────────────────────────
  // Sets --a4-w and --a4-h on the a4Frame element whenever the *viewport*
  // (the fixed display box) resizes. We use the viewport size — not the
  // frame's current size — so that zoom doesn't corrupt the CSS vars used
  // for proportional font/spacing calculations inside the page.
  const a4Viewport = document.getElementById('a4Viewport');
  function updateA4Vars() {
    // Use the viewport element if available, else fall back to a4Frame
    const ref = a4Viewport || a4Frame;
    if (!ref) return;
    const w = ref.offsetWidth;
    const h = ref.offsetHeight;
    if (a4Frame) {
      a4Frame.style.setProperty('--a4-w', w + 'px');
      a4Frame.style.setProperty('--a4-h', h + 'px');
    }
  }

  if (typeof ResizeObserver !== 'undefined') {
    // Observe the viewport (stable size) not a4Frame (which changes with zoom)
    new ResizeObserver(updateA4Vars).observe(a4Viewport || a4Frame);
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

  // ─── SECTIONS ──────────────────────────────────────────────
  let activeSectionIdx = 0;
  let activeSubsectionId = null;  // null = show all pages in section

  const sectionBar           = document.getElementById('sectionBar');
  const sectionTabs          = document.getElementById('sectionTabs');
  const sectionOverflowBtn   = document.getElementById('sectionOverflowBtn');
  const sectionOverflowOverlay = document.getElementById('sectionOverflowOverlay');
  const sectionOverflowList  = document.getElementById('sectionOverflowList');
  const sectionOverflowClose = document.getElementById('sectionOverflowClose');

  // Subsection dropdown
  const subsecDropdown       = document.getElementById('subsecDropdown');
  const subsecDropdownList   = document.getElementById('subsecDropdownList');
  const subsecSearchOverlay  = document.getElementById('subsecSearchOverlay');
  const subsecSearchInput    = document.getElementById('subsecSearchInput');
  const subsecSearchList     = document.getElementById('subsecSearchList');
  const subsecSearchClose    = document.getElementById('subsecSearchClose');

  const SUBSEC_INLINE_MAX = 3; // max items shown before "More…"

  function renderSectionBar() {
    const sections = artbook?.sections || [];
    if (!sectionBar) return;

    if (sections.length === 0) {
      sectionBar.style.display = 'none';
      document.documentElement.style.setProperty('--section-bar-h', '0px');
      closeSubsecDropdown();
      return;
    }

    sectionBar.style.display = 'block';
    document.documentElement.style.setProperty('--section-bar-h', '39px');
    if (!sectionTabs) return;
    sectionTabs.innerHTML = '';

    sections.forEach((sec, i) => {
      const btn = document.createElement('button');
      btn.className = 'section-tab' + (i === activeSectionIdx ? ' active' : '');
      btn.dataset.idx = i;

      const nameSpan = document.createElement('span');
      nameSpan.textContent = sec.name || `Section ${i + 1}`;
      btn.appendChild(nameSpan);

      if (sec.description) {
        const infoWrap = document.createElement('span');
        infoWrap.className = 'section-tab-info';
        infoWrap.setAttribute('role', 'button');
        infoWrap.setAttribute('tabindex', '0');
        infoWrap.setAttribute('aria-label', 'Section info');
        infoWrap.innerHTML = `<svg width="7" height="7" viewBox="0 0 8 8" fill="none">
          <path d="M4 3.5v2.5M4 2.5v.01" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
        </svg>`;
        const tooltip = document.createElement('span');
        tooltip.className = 'section-tab-tooltip';
        tooltip.textContent = sec.description;
        infoWrap.appendChild(tooltip);
        infoWrap.addEventListener('click', e => e.stopPropagation());
        btn.appendChild(infoWrap);
      }

      // Subsection chevron — only on active tab when section has subsections
      if (i === activeSectionIdx && (sec.subsections || []).length > 0) {
        const chevWrap = document.createElement('span');
        chevWrap.className = 'section-tab-subsec-chevron';
        chevWrap.title = 'Browse subsections';
        chevWrap.setAttribute('role', 'button');
        chevWrap.setAttribute('tabindex', '0');
        chevWrap.innerHTML = `<svg width="9" height="9" viewBox="0 0 10 10" fill="none">
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
        chevWrap.addEventListener('click', e => {
          e.stopPropagation();
          if (subsecDropdown && subsecDropdown.style.display !== 'none') {
            closeSubsecDropdown();
          } else {
            openSubsecDropdown(btn, sec);
          }
        });
        btn.appendChild(chevWrap);
      }

      btn.addEventListener('click', () => {
        if (i === activeSectionIdx) return;
        activeSectionIdx = i;
        activeSubsectionId = null;
        closeSubsecDropdown();
        currentIdx = 0;
        renderSectionBar();
        render();
      });

      sectionTabs.appendChild(btn);
    });

    // Overflow list
    if (sectionOverflowList) {
      sectionOverflowList.innerHTML = '';
      sections.forEach((sec, i) => {
        const item = document.createElement('button');
        item.className = 'section-overflow-item' + (i === activeSectionIdx ? ' active' : '');
        item.innerHTML = `
          <span class="section-overflow-item-name">${esc(sec.name || `Section ${i + 1}`)}</span>
          ${sec.description ? `<span class="section-overflow-item-desc">${esc(sec.description)}</span>` : ''}
        `;
        item.addEventListener('click', () => {
          activeSectionIdx = i;
          activeSubsectionId = null;
          currentIdx = 0;
          closeOverflow();
          closeSubsecDropdown();
          renderSectionBar();
          render();
        });
        sectionOverflowList.appendChild(item);
      });
    }
  }

  // ─── SUBSECTION DROPDOWN ───────────────────────────────────
  function openSubsecDropdown(anchorBtn, sec) {
    if (!subsecDropdown || !subsecDropdownList) return;
    const subs = sec.subsections || [];
    subsecDropdownList.innerHTML = '';

    // "All" item
    const allItem = document.createElement('button');
    allItem.className = 'subsec-dropdown-item' + (!activeSubsectionId ? ' active' : '');
    allItem.textContent = 'All pages';
    allItem.addEventListener('click', () => {
      activeSubsectionId = null;
      closeSubsecDropdown();
      currentIdx = 0;
      renderSectionBar();
      render();
    });
    subsecDropdownList.appendChild(allItem);

    // Up to SUBSEC_INLINE_MAX subsection items
    subs.slice(0, SUBSEC_INLINE_MAX).forEach(sub => {
      const item = document.createElement('button');
      item.className = 'subsec-dropdown-item' + (activeSubsectionId === sub.id ? ' active' : '');
      item.textContent = sub.name || sub.id;
      item.addEventListener('click', () => {
        activeSubsectionId = sub.id;
        closeSubsecDropdown();
        currentIdx = 0;
        renderSectionBar();
        render();
      });
      subsecDropdownList.appendChild(item);
    });

    // "More…" if there are more than SUBSEC_INLINE_MAX
    if (subs.length > SUBSEC_INLINE_MAX) {
      const moreBtn = document.createElement('button');
      moreBtn.className = 'subsec-dropdown-item subsec-dropdown-more';
      moreBtn.textContent = `More… (${subs.length - SUBSEC_INLINE_MAX} more)`;
      moreBtn.addEventListener('click', () => {
        closeSubsecDropdown();
        openSubsecSearch(sec);
      });
      subsecDropdownList.appendChild(moreBtn);
    }

    // Position below anchor button
    const rect = anchorBtn.getBoundingClientRect();
    subsecDropdown.style.top  = (rect.bottom + 4) + 'px';
    subsecDropdown.style.left = rect.left + 'px';
    subsecDropdown.style.display = 'block';

    // Mark chevron open
    anchorBtn.querySelectorAll('.section-tab-subsec-chevron').forEach(c => c.classList.add('open'));

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', _outsideSubsecClick, { once: true });
    }, 0);
  }

  function _outsideSubsecClick(e) {
    if (subsecDropdown && !subsecDropdown.contains(e.target)) {
      closeSubsecDropdown();
    }
  }

  function closeSubsecDropdown() {
    if (subsecDropdown) subsecDropdown.style.display = 'none';
    document.querySelectorAll('.section-tab-subsec-chevron').forEach(c => c.classList.remove('open'));
  }

  function openSubsecSearch(sec) {
    if (!subsecSearchOverlay) return;
    const subs = sec.subsections || [];
    subsecSearchInput.value = '';
    renderSubsecSearchList(subs, '');
    subsecSearchOverlay.style.display = 'flex';
    setTimeout(() => subsecSearchInput.focus(), 80);

    function onInput() {
      renderSubsecSearchList(subs, subsecSearchInput.value.trim().toLowerCase());
    }
    subsecSearchInput.addEventListener('input', onInput);

    function close() {
      subsecSearchOverlay.style.display = 'none';
      subsecSearchInput.removeEventListener('input', onInput);
    }
    if (subsecSearchClose) subsecSearchClose.onclick = close;
    if (subsecSearchOverlay) {
      subsecSearchOverlay.onclick = e => { if (e.target === subsecSearchOverlay) close(); };
    }
  }

  function renderSubsecSearchList(subs, query) {
    if (!subsecSearchList) return;
    subsecSearchList.innerHTML = '';
    const filtered = query ? subs.filter(s => (s.name || '').toLowerCase().includes(query)) : subs;
    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'subsec-search-empty';
      empty.textContent = 'No subsections match.';
      subsecSearchList.appendChild(empty);
      return;
    }
    filtered.forEach(sub => {
      const item = document.createElement('button');
      item.className = 'subsec-search-item' + (activeSubsectionId === sub.id ? ' active' : '');
      item.textContent = sub.name || sub.id;
      item.addEventListener('click', () => {
        activeSubsectionId = sub.id;
        if (subsecSearchOverlay) subsecSearchOverlay.style.display = 'none';
        currentIdx = 0;
        renderSectionBar();
        render();
      });
      subsecSearchList.appendChild(item);
    });
  }

  function closeOverflow() {
    if (sectionOverflowOverlay) sectionOverflowOverlay.style.display = 'none';
  }

  if (sectionOverflowBtn) {
    sectionOverflowBtn.addEventListener('click', () => {
      if (sectionOverflowOverlay) sectionOverflowOverlay.style.display = 'flex';
    });
  }
  if (sectionOverflowClose) sectionOverflowClose.addEventListener('click', closeOverflow);
  if (sectionOverflowOverlay) {
    sectionOverflowOverlay.addEventListener('click', e => {
      if (e.target === sectionOverflowOverlay) closeOverflow();
    });
  }

  function getActivePages() {
    const sections = artbook?.sections || [];
    const allPages = artbook?.pages || [];
    if (sections.length === 0) return allPages;
    const sec = sections[activeSectionIdx];
    if (!sec) return [];
    const secPages = allPages.filter(p => p.sectionId === sec.id);
    // If a subsection is active, filter further
    if (activeSubsectionId) {
      return secPages.filter(p => p.subsectionId === activeSubsectionId);
    }
    return secPages;
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
    renderSectionBar();
    render();
  }

  // ─── RENDER ────────────────────────────────────────────────
  function render() {
    const pages = getActivePages();
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
    if (multiMode) {
      // Snap to spread boundary and re-render multi spread
      currentIdx = Math.floor(currentIdx / PAGES_PER_SPREAD) * PAGES_PER_SPREAD;
      renderMultiSpread();
    } else {
      renderPage(pages[currentIdx]);
    }
    updateNav(pages.length);
    // Sync fullscreen overlay if open
    if (fsMode) renderFullscreen();
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
    pageLabelNum.textContent = getPageLabel(currentIdx);
  }

  // Return a label like "A3" if sections exist, else just "3"
  function getPageLabel(idx) {
    const sections = artbook?.sections || [];
    if (sections.length === 0) return idx + 1;

    // Section letter (A, B, C…)
    let secLetter = '';
    let n = activeSectionIdx + 1;
    while (n > 0) { n--; secLetter = String.fromCharCode(65 + (n % 26)) + secLetter; n = Math.floor(n / 26); }

    if (!activeSubsectionId) {
      // Plain continuous: A1, A2…
      return secLetter + (idx + 1);
    }

    // Subsection active — find subsection letter (a, b, c…)
    const sec = sections[activeSectionIdx];
    const subs = sec?.subsections || [];
    const subIdx = subs.findIndex(s => s.id === activeSubsectionId);
    let subLetter = '';
    let m = subIdx + 1;
    while (m > 0) { m--; subLetter = String.fromCharCode(97 + (m % 26)) + subLetter; m = Math.floor(m / 26); }

    return `${secLetter}\u00b7${subLetter}${idx + 1}`;
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

    // Explicit user-set colours (with sensible defaults)
    const boxBg = page.floodBoxBg || 'rgba(255,255,255,0.92)';
    const boxFg = page.floodBoxFg || '#1a1814';

    const wrap = document.createElement('div');
    wrap.className = 'artwork-flood';

    // Apply colour vars immediately from stored data
    wrap.style.setProperty('--flood-bg', boxBg);
    wrap.style.setProperty('--flood-fg', boxFg);

    const img = makeImg(art.url, art.title);
    img.style.objectPosition = `${focalX}% 50%`;
    // Detect portrait images and switch to contain so they don't get clipped
    img.addEventListener('load', () => {
      if (img.naturalHeight > img.naturalWidth) {
        wrap.style.setProperty('--flood-img-fit', 'contain');
      } else {
        wrap.style.setProperty('--flood-img-fit', 'cover');
      }
    }, { once: true });

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

    // pageEl is the .art-page element. In single-page mode it is
    // position:absolute filling the a4Frame. In multi-page mode it is
    // position:relative inside padWrap, so offsetHeight is already the
    // post-padding content height — no need to subtract padding again.
    // We use pageEl.offsetHeight directly as the available height.
    const availH = pageEl.offsetHeight || a4Frame.offsetHeight || 1;

    // Find the tallest text-column height
    let maxTextH = 0;
    rows.forEach(row => {
      const textCol = row.querySelector('.text-col');
      if (textCol) maxTextH = Math.max(maxTextH, textCol.scrollHeight);
    });

    const gap      = size === 'medium' ? 20 : 10;
    const rowCount = rows.length;
    const targetH  = (availH - gap * (rowCount - 1)) / rowCount;

    // If text is taller than targetH let CSS flex handle it naturally
    if (maxTextH > targetH) return;

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
    const pages = total || artbook?.pages?.length || 0;
    if (multiMode) {
      // Show range e.g. "1–4 / 12"
      const spreadStart = currentIdx + 1;
      const spreadEnd   = Math.min(currentIdx + PAGES_PER_SPREAD, pages);
      currentPageEl.textContent = spreadStart + '–' + spreadEnd;
    } else {
      currentPageEl.textContent = currentIdx + 1;
    }
    totalPagesEl.textContent = pages;
    prevBtn.disabled = currentIdx === 0;
    nextBtn.disabled = multiMode
      ? currentIdx + PAGES_PER_SPREAD >= pages
      : currentIdx >= pages - 1;
  }

  function goTo(idx, direction) {
    if (isAnimating) return;
    const pages = getActivePages();
    // In multi-mode, clamp to valid spread starts (multiples of PAGES_PER_SPREAD)
    if (multiMode) {
      if (idx < 0 || idx >= pages.length) return;
      // Snap to nearest spread boundary
      idx = Math.floor(idx / PAGES_PER_SPREAD) * PAGES_PER_SPREAD;
      idx = Math.max(0, Math.min(idx, pages.length - 1));
      currentIdx = idx;
      renderMultiSpread();
      updateNav(pages.length);
      return;
    }
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
    pageLabelNum.textContent = getPageLabel(currentIdx);
    updateNav(pages.length);
  }

  prevBtn.addEventListener('click', () => {
    const step = multiMode ? PAGES_PER_SPREAD : 1;
    goTo(currentIdx - step, 'back');
  });
  nextBtn.addEventListener('click', () => {
    const step = multiMode ? PAGES_PER_SPREAD : 1;
    goTo(currentIdx + step, 'forward');
  });

  document.addEventListener('keydown', e => {
    if (document.querySelector('.admin-overlay.open') ||
        document.querySelector('.modal-overlay[style*="flex"]')) return;
    const step = multiMode ? PAGES_PER_SPREAD : 1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goTo(currentIdx + step, 'forward');
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   goTo(currentIdx - step, 'back');
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
      const step = multiMode ? PAGES_PER_SPREAD : 1;
      dx < 0 ? goTo(currentIdx + step, 'forward') : goTo(currentIdx - step, 'back');
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
    const viewport   = document.getElementById('a4Viewport');
    if (!zoomSlider || !viewport || !a4Frame) return;

    let zoomLevel = 1.0;
    const MIN_ZOOM = 1.0, MAX_ZOOM = 2.0, STEP = 0.05;

    // -- Apply zoom via CSS transform: scale() ----------------------
    // The a4Frame stays at its natural CSS size at all times.
    // transform: scale(z) enlarges it as a single visual unit so every
    // pixel inside scales uniformly — no reflow, no broken layouts.
    // The viewport wrapper is sized to the *base* frame dimensions and
    // set to overflow: auto so the scaled-up frame can be scrolled/panned.
    function applyZoom(newZoom, anchorFracX, anchorFracY) {
      if (anchorFracX === undefined) anchorFracX = 0.5;
      if (anchorFracY === undefined) anchorFracY = 0.5;

      const vpW = viewport.offsetWidth;
      const vpH = viewport.offsetHeight;

      // Capture the content-space point we want to keep under the anchor.
      const oldContentX = viewport.scrollLeft + anchorFracX * vpW;
      const oldContentY = viewport.scrollTop  + anchorFracY * vpH;

      const oldZoom = zoomLevel;
      zoomLevel = newZoom;

      // Scale the frame uniformly as one unit.
      a4Frame.style.transform       = `scale(${zoomLevel})`;
      a4Frame.style.transformOrigin = 'top left';

      // The scaled frame's rendered size is baseW*zoom × baseH*zoom.
      // To make the viewport scrollable to that full area we set an explicit
      // width/height on a shim div (or on a4Frame's parent placeholder).
      // Simpler: set a4Frame width/height to the *scaled* pixel size while
      // keeping the inner layout unchanged via transform.
      // The scaled frame's rendered size is baseW*zoom × baseH*zoom.
      const scaledW = vpW * zoomLevel;
      const scaledH = vpH * zoomLevel;
      a4Frame.style.marginRight  = (scaledW - vpW) + 'px';
      a4Frame.style.marginBottom = (scaledH - vpH) + 'px';
      // Restore anchor: scroll so the same content point is under the cursor.
      const ratio = zoomLevel / oldZoom;
      viewport.scrollLeft = oldContentX * ratio - anchorFracX * vpW;
      viewport.scrollTop  = oldContentY * ratio - anchorFracY * vpH;

      // UI
      zoomSlider.value = Math.round(zoomLevel * 100);
      zoomPct.textContent = Math.round(zoomLevel * 100) + '%';
      zoomOutBtn.disabled = zoomLevel <= MIN_ZOOM;
      zoomInBtn.disabled  = zoomLevel >= MAX_ZOOM;
      viewport.classList.toggle('can-pan', zoomLevel > MIN_ZOOM);
    }

    function setZoom(z, anchorFracX, anchorFracY) {
      z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
      if (z === zoomLevel) return;
      applyZoom(z, anchorFracX, anchorFracY);
    }

    zoomSlider.addEventListener('input', () => {
      setZoom(parseInt(zoomSlider.value, 10) / 100);
    });
    zoomOutBtn.addEventListener('click', () => setZoom(zoomLevel - STEP));
    zoomInBtn.addEventListener('click',  () => setZoom(zoomLevel + STEP));

    // -- Mouse pan: drag to scroll --------------------------------
    let dragging = false, lastX = 0, lastY = 0;

    viewport.addEventListener('mousedown', e => {
      if (zoomLevel <= MIN_ZOOM) return;
      if (e.target.closest('button,a,select,input')) return;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      viewport.classList.add('is-panning');
      e.preventDefault();
    });
    window.addEventListener('mousemove', e => {
      if (!dragging) return;
      viewport.scrollLeft -= (e.clientX - lastX);
      viewport.scrollTop  -= (e.clientY - lastY);
      lastX = e.clientX;
      lastY = e.clientY;
    });
    window.addEventListener('mouseup', () => {
      dragging = false;
      viewport.classList.remove('is-panning');
    });

    // -- Touch pan -----------------------------------------------
    let tLastX = 0, tLastY = 0, tPanning = false;
    viewport.addEventListener('touchstart', e => {
      if (e.touches.length === 1 && zoomLevel > MIN_ZOOM) {
        tPanning = true;
        tLastX = e.touches[0].clientX;
        tLastY = e.touches[0].clientY;
      } else { tPanning = false; }
    }, { passive: true });
    viewport.addEventListener('touchmove', e => {
      if (!tPanning || e.touches.length !== 1 || zoomLevel <= MIN_ZOOM) return;
      viewport.scrollLeft -= (e.touches[0].clientX - tLastX);
      viewport.scrollTop  -= (e.touches[0].clientY - tLastY);
      tLastX = e.touches[0].clientX;
      tLastY = e.touches[0].clientY;
    }, { passive: true });

    // -- Reset on page change ------------------------------------
    function resetZoomPan() {
      zoomLevel = 1.0;
      a4Frame.style.transform    = '';
      a4Frame.style.marginRight  = '';
      a4Frame.style.marginBottom = '';
      viewport.scrollLeft = 0;
      viewport.scrollTop  = 0;
      zoomSlider.value = 100;
      zoomPct.textContent = '100%';
      zoomOutBtn.disabled = true;
      zoomInBtn.disabled  = false;
      viewport.classList.remove('can-pan', 'is-panning');
    }
    if (prevBtn) prevBtn.addEventListener('click', resetZoomPan);
    if (nextBtn) nextBtn.addEventListener('click', resetZoomPan);

    // Initialise
    zoomOutBtn.disabled = true;
  })();

  // ─── MULTI-PAGE VIEW ───────────────────────────────────────
  // Toggle multi-page view (landscape only)
  if (multiViewBtn) {
    multiViewBtn.addEventListener('click', () => {
      multiMode = !multiMode;
      multiViewBtn.classList.toggle('active', multiMode);
      multiViewBtn.setAttribute('aria-pressed', String(multiMode));

      if (multiMode) {
        singleViewWrap.style.display = 'none';
        multiViewWrap.style.display  = 'flex';
        if (pageLabelNum) pageLabelNum.style.visibility = 'hidden';
        // Update button label to "Single-page"
        const btnSpan = multiViewBtn.querySelector('span');
        if (btnSpan) btnSpan.textContent = 'Single-page';
        // Snap currentIdx to nearest spread boundary
        currentIdx = Math.floor(currentIdx / PAGES_PER_SPREAD) * PAGES_PER_SPREAD;
        renderMultiSpread();
      } else {
        multiViewWrap.style.display  = 'none';
        singleViewWrap.style.display = 'flex';
        if (pageLabelNum) pageLabelNum.style.visibility = 'visible';
        // Restore button label
        const btnSpan = multiViewBtn.querySelector('span');
        if (btnSpan) btnSpan.textContent = 'Multi-page';
        renderPage(getActivePages()[currentIdx]);
      }
      updateNav(getActivePages().length);
    });
  }

  // Render 4 pages in the multi-page grid
  function renderMultiSpread() {
    if (!multiPageGrid) return;
    multiPageGrid.innerHTML = '';
    const pages = getActivePages();
    const start = currentIdx;
    const end   = Math.min(start + PAGES_PER_SPREAD, pages.length);

    for (let i = start; i < end; i++) {
      const cell = buildMultiCell(pages[i], i);
      multiPageGrid.appendChild(cell);
    }

    // If fewer than PAGES_PER_SPREAD pages, add empty ghost cells for grid alignment
    for (let i = end; i < start + PAGES_PER_SPREAD; i++) {
      const ghost = document.createElement('div');
      ghost.className = 'multi-cell multi-cell--ghost';
      multiPageGrid.appendChild(ghost);
    }
  }

  // Build one page cell for multi-page view
  function buildMultiCell(page, pageIdx) {
    const cell = document.createElement('div');
    cell.className = 'multi-cell';

    // Page number label — hidden in multi-mode (shown only via page counter in footer)

    // Viewport (scrollable, zoomable)
    const viewport = document.createElement('div');
    viewport.className = 'multi-cell-viewport';
    viewport.dataset.cellIdx = pageIdx;

    const frame = document.createElement('div');
    frame.className = 'multi-cell-frame';

    // Inner padding wrapper — sits inside the frame and provides the
    // A4 margin. The art-page (position:absolute inset:0) fills this
    // wrapper, so all content is naturally inset from the frame edge.
    const padWrap = document.createElement('div');
    padWrap.className = 'multi-cell-pad';
    if ((page.layout || 'large') === 'flood') padWrap.classList.add('is-flood');
    frame.appendChild(padWrap);

    // Build the actual page content inside the padding wrapper
    const pageEl = buildPage(page);
    pageEl.classList.remove('entering-forward', 'entering-back');
    padWrap.appendChild(pageEl);

    function syncPageVars() {
      const aw = frame.style.getPropertyValue('--a4-w');
      const ah = frame.style.getPropertyValue('--a4-h');
      if (aw) padWrap.style.setProperty('--a4-w', aw);
      if (ah) padWrap.style.setProperty('--a4-h', ah);
    }
    viewport.appendChild(frame);
    cell.appendChild(viewport);

    // Set A4 CSS vars on frame. The viewport uses aspect-ratio so its height
    // may not be resolved synchronously. We use getBoundingClientRect (which
    // forces a layout flush) inside a double-RAF, then keep watching with
    // ResizeObserver so zoom/resize stays accurate.
    function updateCellVars() {
      const rect = viewport.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (w > 0 && h > 0) {
        frame.style.setProperty('--a4-w', w + 'px');
        frame.style.setProperty('--a4-h', h + 'px');
      } else {
        // Fallback: derive from cell width since aspect-ratio might not have resolved
        const cw = cell.getBoundingClientRect().width;
        if (cw > 0) {
          const ch = cw * 1.4142;
          frame.style.setProperty('--a4-w', cw + 'px');
          frame.style.setProperty('--a4-h', ch + 'px');
        }
      }
      // Mirror vars onto the art-page so its calc() padding resolves immediately
      syncPageVars();
    }
    requestAnimationFrame(() => requestAnimationFrame(() => {
      updateCellVars();
      // One more deferred pass in case grid layout still settling
      setTimeout(updateCellVars, 50);
    }));
    if (typeof ResizeObserver !== 'undefined') {
      const cellRO = new ResizeObserver(updateCellVars);
      cellRO.observe(viewport);
      cellRO.observe(cell);
    }
    window.addEventListener('resize', updateCellVars);

    // Zoom controls per cell
    const zoomWrap = document.createElement('div');
    zoomWrap.className = 'zoom-controls multi-cell-zoom';

    const zoomOut = document.createElement('button');
    zoomOut.className = 'zoom-btn';
    zoomOut.title = 'Zoom out';
    zoomOut.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.3"/><path d="M4.5 7h5M11 11l2.5 2.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;

    const slider = document.createElement('input');
    slider.type  = 'range';
    slider.className = 'zoom-slider';
    slider.min   = '100';
    slider.max   = '200';
    slider.step  = '5';
    slider.value = '100';
    slider.style.width = '70px';

    const zoomIn = document.createElement('button');
    zoomIn.className = 'zoom-btn';
    zoomIn.title = 'Zoom in';
    zoomIn.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.3"/><path d="M7 4.5v5M4.5 7h5M11 11l2.5 2.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;

    const pctLabel = document.createElement('span');
    pctLabel.className = 'zoom-pct';
    pctLabel.textContent = '100%';

    zoomWrap.appendChild(zoomOut);
    zoomWrap.appendChild(slider);
    zoomWrap.appendChild(zoomIn);
    zoomWrap.appendChild(pctLabel);
    cell.appendChild(zoomWrap);

    // Per-cell zoom state
    let zoomLevel  = 1.0;
    const MIN_ZOOM = 1.0, MAX_ZOOM = 2.0, STEP = 0.05;

    function applyCellZoom(z, anchorFracX, anchorFracY) {
      anchorFracX = anchorFracX !== undefined ? anchorFracX : 0.5;
      anchorFracY = anchorFracY !== undefined ? anchorFracY : 0.5;
      const vpW = viewport.offsetWidth;
      const vpH = viewport.offsetHeight;
      const oldContentX = viewport.scrollLeft + anchorFracX * vpW;
      const oldContentY = viewport.scrollTop  + anchorFracY * vpH;
      const oldZoom = zoomLevel;
      zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
      frame.style.transform       = `scale(${zoomLevel})`;
      frame.style.transformOrigin = 'top left';
      const scaledW = vpW * zoomLevel;
      const scaledH = vpH * zoomLevel;
      frame.style.marginRight  = (scaledW - vpW) + 'px';
      frame.style.marginBottom = (scaledH - vpH) + 'px';
      const ratio = zoomLevel / oldZoom;
      viewport.scrollLeft = oldContentX * ratio - anchorFracX * vpW;
      viewport.scrollTop  = oldContentY * ratio - anchorFracY * vpH;
      slider.value    = Math.round(zoomLevel * 100);
      pctLabel.textContent = Math.round(zoomLevel * 100) + '%';
      zoomOut.disabled = zoomLevel <= MIN_ZOOM;
      zoomIn.disabled  = zoomLevel >= MAX_ZOOM;
      viewport.classList.toggle('can-pan', zoomLevel > MIN_ZOOM);
    }

    slider.addEventListener('input', () => applyCellZoom(parseInt(slider.value) / 100));
    zoomOut.addEventListener('click', () => applyCellZoom(zoomLevel - STEP));
    zoomIn.addEventListener('click',  () => applyCellZoom(zoomLevel + STEP));

    // Mouse drag pan on cell viewport
    let dragging = false, lastX = 0, lastY = 0;
    viewport.addEventListener('mousedown', e => {
      if (zoomLevel <= MIN_ZOOM) return;
      if (e.target.closest('button,a,select,input')) return;
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      viewport.classList.add('is-panning');
      e.preventDefault();
    });
    viewport.addEventListener('mousemove', e => {
      if (!dragging) return;
      viewport.scrollLeft -= (e.clientX - lastX);
      viewport.scrollTop  -= (e.clientY - lastY);
      lastX = e.clientX; lastY = e.clientY;
    });
    viewport.addEventListener('mouseup', () => { dragging = false; viewport.classList.remove('is-panning'); });
    viewport.addEventListener('mouseleave', () => { dragging = false; viewport.classList.remove('is-panning'); });

    zoomOut.disabled = true; // starts at 100%
    return cell;
  }

  // ─── FULLSCREEN VIEWER ─────────────────────────────────────
  // A fullscreen overlay that shows the current page (single or multi)
  // filling the entire screen. Translucent prev/next arrows, exit button.

  let fsOverlay = null;
  let fsContent = null;
  let fsMultiGrid = null;
  let fsIsMulti = false;

  function buildFullscreenOverlay() {
    if (fsOverlay) return;

    fsOverlay = document.createElement('div');
    fsOverlay.id = 'fsOverlay';
    fsOverlay.className = 'fs-overlay';
    fsOverlay.style.display = 'none';

    // Exit button
    const exitBtn = document.createElement('button');
    exitBtn.className = 'fs-exit-btn';
    exitBtn.title = 'Exit fullscreen';
    exitBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`;
    exitBtn.addEventListener('click', closeFullscreen);

    // Toggle single/multi in fullscreen
    const fsModeBtn = document.createElement('button');
    fsModeBtn.className = 'fs-mode-btn';
    fsModeBtn.title = 'Toggle multi-page';
    fsModeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 20 20" fill="none">
      <rect x="1" y="3" width="8" height="14" rx="1" stroke="currentColor" stroke-width="1.4"/>
      <rect x="11" y="3" width="8" height="14" rx="1" stroke="currentColor" stroke-width="1.4"/>
    </svg><span>Multi</span>`;
    fsModeBtn.addEventListener('click', () => {
      fsIsMulti = !fsIsMulti;
      fsModeBtn.classList.toggle('active', fsIsMulti);
      const span = fsModeBtn.querySelector('span');
      if (span) span.textContent = fsIsMulti ? 'Single' : 'Multi';
      renderFullscreen();
    });

    // Prev arrow
    const prevArrow = document.createElement('button');
    prevArrow.className = 'fs-arrow fs-arrow--prev';
    prevArrow.title = 'Previous page';
    prevArrow.innerHTML = `<svg width="28" height="28" viewBox="0 0 32 32" fill="none">
      <path d="M20 6L10 16l10 10" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
    prevArrow.addEventListener('click', () => {
      const step = fsIsMulti ? PAGES_PER_SPREAD : 1;
      const pages = getActivePages();
      const newIdx = currentIdx - step;
      if (newIdx < 0) return;
      currentIdx = Math.max(0, newIdx);
      if (fsIsMulti) currentIdx = Math.floor(currentIdx / PAGES_PER_SPREAD) * PAGES_PER_SPREAD;
      if (fsOverlay._resetZoom) fsOverlay._resetZoom();
      renderFullscreen();
      // Sync main view
      if (multiMode) renderMultiSpread(); else renderPage(pages[currentIdx]);
      updateNav(pages.length);
    });

    // Next arrow
    const nextArrow = document.createElement('button');
    nextArrow.className = 'fs-arrow fs-arrow--next';
    nextArrow.title = 'Next page';
    nextArrow.innerHTML = `<svg width="28" height="28" viewBox="0 0 32 32" fill="none">
      <path d="M12 6l10 10-10 10" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
    nextArrow.addEventListener('click', () => {
      const step = fsIsMulti ? PAGES_PER_SPREAD : 1;
      const pages = getActivePages();
      const newIdx = currentIdx + step;
      if (newIdx >= pages.length) return;
      currentIdx = fsIsMulti ? Math.floor(newIdx / PAGES_PER_SPREAD) * PAGES_PER_SPREAD : newIdx;
      if (fsOverlay._resetZoom) fsOverlay._resetZoom();
      renderFullscreen();
      // Sync main view
      if (multiMode) renderMultiSpread(); else renderPage(pages[currentIdx]);
      updateNav(pages.length);
    });

    // Page counter
    const fsCounter = document.createElement('div');
    fsCounter.className = 'fs-counter';

    // Content area
    fsContent = document.createElement('div');
    fsContent.className = 'fs-content';

    // Multi grid inside fullscreen
    fsMultiGrid = document.createElement('div');
    fsMultiGrid.className = 'fs-multi-grid';
    fsContent.appendChild(fsMultiGrid);

    fsOverlay.appendChild(exitBtn);
    fsOverlay.appendChild(fsModeBtn);
    fsOverlay.appendChild(prevArrow);
    fsOverlay.appendChild(nextArrow);
    fsOverlay.appendChild(fsCounter);
    fsOverlay.appendChild(fsContent);

    // ── Hover zoom bar (single-page mode only) ──────────────────
    // Appears at the bottom of the overlay when hovering near it,
    // auto-hides after idle. On mobile, tapping the bottom zone toggles it.
    const fsZoomBar = document.createElement('div');
    fsZoomBar.className = 'fs-zoom-bar';
    fsZoomBar.innerHTML = `
      <button class="fs-zoom-btn" data-dir="-1" title="Zoom out">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.3"/>
          <path d="M4.5 7h5M11 11l2.5 2.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
      </button>
      <input class="fs-zoom-slider" type="range" min="100" max="300" step="5" value="100">
      <button class="fs-zoom-btn" data-dir="1" title="Zoom in">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.3"/>
          <path d="M7 4.5v5M4.5 7h5M11 11l2.5 2.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
      </button>
      <span class="fs-zoom-pct">100%</span>
      <button class="fs-zoom-reset" title="Reset zoom">Reset</button>
    `;
    fsOverlay.appendChild(fsZoomBar);
    fsOverlay._zoomBar = fsZoomBar;

    // Zoom state
    let fsZoom = 1.0;
    const FS_MIN = 1.0, FS_MAX = 3.0, FS_STEP = 0.1;
    const fsZoomSlider = fsZoomBar.querySelector('.fs-zoom-slider');
    const fsZoomPct    = fsZoomBar.querySelector('.fs-zoom-pct');

    function applyFsZoom(z) {
      fsZoom = Math.max(FS_MIN, Math.min(FS_MAX, z));
      const wrap = fsContent.querySelector('.fs-page-wrap');
      if (wrap) {
        wrap.style.transform = fsZoom > 1 ? `scale(${fsZoom})` : '';
        wrap.style.transformOrigin = 'center center';
      }
      fsZoomSlider.value = Math.round(fsZoom * 100);
      fsZoomPct.textContent = Math.round(fsZoom * 100) + '%';
      fsZoomBar.querySelector('[data-dir="-1"]').disabled = fsZoom <= FS_MIN;
      fsZoomBar.querySelector('[data-dir="1"]').disabled  = fsZoom >= FS_MAX;
    }

    fsZoomSlider.addEventListener('input', () => applyFsZoom(parseInt(fsZoomSlider.value) / 100));
    fsZoomBar.querySelector('[data-dir="-1"]').addEventListener('click', () => applyFsZoom(fsZoom - FS_STEP));
    fsZoomBar.querySelector('[data-dir="1"]').addEventListener('click',  () => applyFsZoom(fsZoom + FS_STEP));
    fsZoomBar.querySelector('.fs-zoom-reset').addEventListener('click',  () => applyFsZoom(1.0));

    // Reset zoom when page changes
    fsOverlay._resetZoom = () => applyFsZoom(1.0);

    // ── Show / hide logic ────────────────────────────────────────
    // Desktop: hover near bottom 80px of overlay shows bar; idle 2s hides it.
    // Mobile: tap on bottom 20% of overlay toggles bar.
    let fsZoomHideTimer = null;
    let fsZoomVisible   = false;

    function showFsZoomBar() {
      if (fsIsMulti) return; // only in single mode
      fsZoomBar.classList.add('visible');
      fsZoomVisible = true;
      clearTimeout(fsZoomHideTimer);
    }
    function scheduleFsZoomHide(delay = 2000) {
      clearTimeout(fsZoomHideTimer);
      fsZoomHideTimer = setTimeout(() => {
        fsZoomBar.classList.remove('visible');
        fsZoomVisible = false;
      }, delay);
    }

    // Desktop: mousemove near bottom of overlay
    fsOverlay.addEventListener('mousemove', e => {
      if (fsIsMulti) return;
      const rect = fsOverlay.getBoundingClientRect();
      const fromBottom = rect.bottom - e.clientY;
      if (fromBottom < 100) {
        showFsZoomBar();
      } else if (fsZoomVisible && !fsZoomBar.matches(':hover')) {
        scheduleFsZoomHide(800);
      }
    });
    // Keep bar alive while hovering it
    fsZoomBar.addEventListener('mouseenter', () => { clearTimeout(fsZoomHideTimer); });
    fsZoomBar.addEventListener('mouseleave', () => scheduleFsZoomHide(1200));

    // Hide when mouse leaves overlay entirely
    fsOverlay.addEventListener('mouseleave', () => scheduleFsZoomHide(400));

    // Mobile: tap the lower 20% of overlay
    fsOverlay.addEventListener('touchend', e => {
      if (fsIsMulti) return;
      // Only act if tap wasn't on a button/control
      if (e.target.closest('button,input')) return;
      const rect = fsOverlay.getBoundingClientRect();
      const touchY = e.changedTouches[0].clientY;
      if (touchY > rect.bottom - rect.height * 0.2) {
        if (fsZoomVisible) {
          clearTimeout(fsZoomHideTimer);
          fsZoomBar.classList.remove('visible');
          fsZoomVisible = false;
        } else {
          showFsZoomBar();
          scheduleFsZoomHide(3500);
        }
        e.stopPropagation();
      }
    }, { passive: true });

    // Pinch-to-zoom on mobile inside fullscreen
    let fsLastPinchDist = null;
    fsOverlay.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        fsLastPinchDist = Math.hypot(dx, dy);
      }
    }, { passive: true });
    fsOverlay.addEventListener('touchmove', e => {
      if (e.touches.length !== 2 || fsLastPinchDist === null) return;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const delta = (dist - fsLastPinchDist) / 300;
      applyFsZoom(fsZoom + delta);
      fsLastPinchDist = dist;
      showFsZoomBar();
      scheduleFsZoomHide(2000);
    }, { passive: true });
    fsOverlay.addEventListener('touchend', () => { fsLastPinchDist = null; }, { passive: true });

    document.body.appendChild(fsOverlay);

    // Store refs for update
    fsOverlay._prevArrow = prevArrow;
    fsOverlay._nextArrow = nextArrow;
    fsOverlay._counter  = fsCounter;
    fsOverlay._modeBtn  = fsModeBtn;

    // Keyboard nav inside fullscreen
    document.addEventListener('keydown', e => {
      if (!fsMode) return;
      const step = fsIsMulti ? PAGES_PER_SPREAD : 1;
      const pages = getActivePages();
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        const ni = currentIdx + step;
        if (ni < pages.length) { currentIdx = fsIsMulti ? Math.floor(ni / PAGES_PER_SPREAD) * PAGES_PER_SPREAD : ni; if (fsOverlay._resetZoom) fsOverlay._resetZoom(); renderFullscreen(); if (multiMode) renderMultiSpread(); else renderPage(pages[currentIdx]); updateNav(pages.length); }
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        const ni = currentIdx - step;
        if (ni >= 0) { currentIdx = Math.max(0, fsIsMulti ? Math.floor(ni / PAGES_PER_SPREAD) * PAGES_PER_SPREAD : ni); if (fsOverlay._resetZoom) fsOverlay._resetZoom(); renderFullscreen(); if (multiMode) renderMultiSpread(); else renderPage(pages[currentIdx]); updateNav(pages.length); }
      }
      if (e.key === 'Escape') closeFullscreen();
    });
  }

  function openFullscreen() {
    buildFullscreenOverlay();
    fsMode = true;
    fsIsMulti = multiMode; // mirror current view mode
    const modeBtn = fsOverlay._modeBtn;
    modeBtn.classList.toggle('active', fsIsMulti);
    const span = modeBtn.querySelector('span');
    if (span) span.textContent = fsIsMulti ? 'Single' : 'Multi';
    fsOverlay.style.display = 'flex';
    document.body.classList.add('fs-open');
    renderFullscreen();

    // Request native browser fullscreen
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  }

  function closeFullscreen() {
    fsMode = false;
    if (fsOverlay) fsOverlay.style.display = 'none';
    document.body.classList.remove('fs-open');

    // Exit native browser fullscreen if active
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
  }

  // Sync overlay state when user presses F11 or Esc from native fullscreen
  document.addEventListener('fullscreenchange', () => {
    const isNativeFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    if (!isNativeFs && fsMode) {
      // User exited native fullscreen (F11 / Esc) — close our overlay too
      fsMode = false;
      if (fsOverlay) fsOverlay.style.display = 'none';
      document.body.classList.remove('fs-open');
    }
  });
  document.addEventListener('webkitfullscreenchange', () => {
    const isNativeFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    if (!isNativeFs && fsMode) {
      fsMode = false;
      if (fsOverlay) fsOverlay.style.display = 'none';
      document.body.classList.remove('fs-open');
    }
  });

  function renderFullscreen() {
    if (!fsOverlay || !fsContent || !fsMultiGrid) return;
    const pages = getActivePages();

    // Update arrows
    const step = fsIsMulti ? PAGES_PER_SPREAD : 1;
    fsOverlay._prevArrow.disabled = currentIdx === 0;
    fsOverlay._nextArrow.disabled = fsIsMulti
      ? currentIdx + PAGES_PER_SPREAD >= pages.length
      : currentIdx >= pages.length - 1;

    // Counter
    if (fsIsMulti) {
      const end = Math.min(currentIdx + PAGES_PER_SPREAD, pages.length);
      fsOverlay._counter.textContent = `${currentIdx + 1}–${end} / ${pages.length}`;
    } else {
      fsOverlay._counter.textContent = `${currentIdx + 1} / ${pages.length}`;
    }

    if (fsIsMulti) {
      // Multi-page fullscreen
      fsContent.classList.add('fs-content--multi');
      fsMultiGrid.style.display = 'grid';

      // Remove old single page if any
      const oldSingle = fsContent.querySelector('.fs-page-wrap');
      if (oldSingle) oldSingle.remove();

      fsMultiGrid.innerHTML = '';
      const start = currentIdx;
      const end = Math.min(start + PAGES_PER_SPREAD, pages.length);
      for (let i = start; i < end; i++) {
        const cell = buildFsMultiCell(pages[i]);
        fsMultiGrid.appendChild(cell);
      }
      // Ghost cells
      for (let i = end; i < start + PAGES_PER_SPREAD; i++) {
        const ghost = document.createElement('div');
        ghost.className = 'fs-multi-cell fs-multi-cell--ghost';
        fsMultiGrid.appendChild(ghost);
      }
    } else {
      // Single-page fullscreen
      fsContent.classList.remove('fs-content--multi');
      fsMultiGrid.style.display = 'none';
      fsMultiGrid.innerHTML = '';

      const oldWrap = fsContent.querySelector('.fs-page-wrap');
      if (oldWrap) oldWrap.remove();

      const page = pages[currentIdx];
      if (!page) return;

      const wrap = document.createElement('div');
      wrap.className = 'fs-page-wrap';

      const pageEl = buildPage(page);
      pageEl.classList.remove('entering-forward', 'entering-back');

      // Detect portrait vs landscape for fit direction
      const firstArt = (page.artworks || [])[0];
      if (firstArt && firstArt.url) {
        const probe = new Image();
        probe.onload = () => {
          if (probe.naturalHeight > probe.naturalWidth) {
            wrap.classList.add('fs-fit-vertical');
          } else {
            wrap.classList.add('fs-fit-horizontal');
          }
        };
        probe.src = firstArt.url;
      }

      wrap.appendChild(pageEl);
      fsContent.appendChild(wrap);

      // Set A4 vars on the page after layout
      requestAnimationFrame(() => {
        const rect = wrap.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          pageEl.style.setProperty('--a4-w', rect.width + 'px');
          pageEl.style.setProperty('--a4-h', rect.height + 'px');
        }
      });
    }
  }

  function buildFsMultiCell(page) {
    const cell = document.createElement('div');
    cell.className = 'fs-multi-cell';

    const frame = document.createElement('div');
    frame.className = 'fs-multi-cell-frame';

    const pageEl = buildPage(page);
    pageEl.classList.remove('entering-forward', 'entering-back');
    frame.appendChild(pageEl);
    cell.appendChild(frame);

    requestAnimationFrame(() => {
      const rect = frame.getBoundingClientRect();
      if (rect.width > 0) {
        pageEl.style.setProperty('--a4-w', rect.width + 'px');
        pageEl.style.setProperty('--a4-h', rect.height + 'px');
      }
    });
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(() => {
        const rect = frame.getBoundingClientRect();
        if (rect.width > 0) {
          pageEl.style.setProperty('--a4-w', rect.width + 'px');
          pageEl.style.setProperty('--a4-h', rect.height + 'px');
        }
      }).observe(frame);
    }
    return cell;
  }

  // Wire up fullscreen button — injected from HTML; add it dynamically if not present
  (function initFullscreenBtn() {
    let fsBtn = document.getElementById('fullscreenBtn');
    if (!fsBtn) {
      fsBtn = document.createElement('button');
      fsBtn.id = 'fullscreenBtn';
      fsBtn.className = 'toolbar-btn fs-btn-inject';
      fsBtn.title = 'Fullscreen';
      fsBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 20 20" fill="none">
        <path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
      // Insert near multiViewBtn
      if (multiViewBtn && multiViewBtn.parentNode) {
        multiViewBtn.parentNode.insertBefore(fsBtn, multiViewBtn.nextSibling);
      } else {
        document.body.appendChild(fsBtn);
      }
    }
    fsBtn.addEventListener('click', openFullscreen);
  })();

  // ─── PUBLIC API ────────────────────────────────────────────
  window._artbookViewer = {
    getArtbook:    () => artbook,
    setArtbook:    (cfg) => { artbook = cfg; },
    rerender:      () => { activeSubsectionId = null; renderSectionBar(); render(); },
    getActiveSectionIdx: () => activeSectionIdx,
    setActiveSectionIdx: (i) => { activeSectionIdx = i; activeSubsectionId = null; }
  };

  init();

})();
