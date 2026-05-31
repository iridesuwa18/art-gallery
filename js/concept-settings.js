/* ═══════════════════════════════════════════════════════════
   concept-settings.js — Injects Art Concept Settings panel
   into the Edit Artwork modal in admin.js.
   Load this AFTER admin.js and concept.js (via script tag at bottom of index.html).
═══════════════════════════════════════════════════════════ */

'use strict';

(function() {
  // Wait for DOM + other scripts to be ready
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initConceptSettings, 200);
  });

  // ── Data (sourced from concept.js if available, else inline fallback) ──
  // NOTE: concept.js only runs on concept.html, so on index.html _artConcept is
  // undefined. Full inline fallbacks are required here for dropdowns to populate.
  const ART_MEDIUMS = window._artConcept?.ART_MEDIUMS || [
    // Dry Drawing
    { name: 'Graphite Pencil (H\u2013HB)', category: 'Dry Drawing' },
    { name: 'Graphite Pencil (B\u20139B)', category: 'Dry Drawing' },
    { name: 'Mechanical Pencil', category: 'Dry Drawing' },
    { name: 'Charcoal Stick (Vine)', category: 'Dry Drawing' },
    { name: 'Charcoal Stick (Compressed)', category: 'Dry Drawing' },
    { name: 'Charcoal Block / Cont\xe9 Carr\xe9', category: 'Dry Drawing' },
    { name: 'Cont\xe9 Crayon', category: 'Dry Drawing' },
    { name: 'Wax Crayon', category: 'Dry Drawing' },
    { name: 'Oil Pastel', category: 'Dry Drawing' },
    { name: 'Soft Pastel', category: 'Dry Drawing' },
    { name: 'Hard Pastel', category: 'Dry Drawing' },
    { name: 'Coloured Pencil (wax-based)', category: 'Dry Drawing' },
    { name: 'Coloured Pencil (oil-based)', category: 'Dry Drawing' },
    { name: 'Water-soluble Coloured Pencil', category: 'Dry Drawing' },
    { name: 'Graphite Powder / Stick', category: 'Dry Drawing' },
    { name: 'Silver / Metalpoint', category: 'Dry Drawing' },
    // Ink & Pen
    { name: 'Ballpoint Pen', category: 'Ink & Pen' },
    { name: 'Felt Tip / Marker (thin)', category: 'Ink & Pen' },
    { name: 'Felt Tip / Marker (chisel)', category: 'Ink & Pen' },
    { name: 'Fine Liner / Technical Pen', category: 'Ink & Pen' },
    { name: 'Brush Pen (soft)', category: 'Ink & Pen' },
    { name: 'Brush Pen (hard)', category: 'Ink & Pen' },
    { name: 'Dip Pen / Nib', category: 'Ink & Pen' },
    // Paint
    { name: 'Watercolour', category: 'Paint' },
    { name: 'Gouache', category: 'Paint' },
    { name: 'Acrylic Paint', category: 'Paint' },
    { name: 'Oil Paint', category: 'Paint' },
  ];
  const COLOURS = window._artConcept?.COLOURS || [
    { name: 'Red', hex: '#E53935' },
    { name: 'Vermillion', hex: '#FF5722' },
    { name: 'Orange', hex: '#FF9800' },
    { name: 'Amber', hex: '#FFC107' },
    { name: 'Yellow', hex: '#FFD740' },
    { name: 'Lime', hex: '#CDDC39' },
    { name: 'Yellow-Green', hex: '#8BC34A' },
    { name: 'Green', hex: '#4CAF50' },
    { name: 'Emerald', hex: '#2ecc71' },
    { name: 'Teal', hex: '#009688' },
    { name: 'Aqua', hex: '#00BCD4' },
    { name: 'Cyan', hex: '#00E5FF' },
    { name: 'Sky Blue', hex: '#03A9F4' },
    { name: 'Blue', hex: '#2196F3' },
    { name: 'Cobalt', hex: '#1565C0' },
    { name: 'Indigo', hex: '#3F51B5' },
    { name: 'Violet', hex: '#7C4DFF' },
    { name: 'Purple', hex: '#9C27B0' },
    { name: 'Magenta', hex: '#E91E63' },
    { name: 'Pink', hex: '#FF80AB' },
    { name: 'Rose', hex: '#F06292' },
    { name: 'Coral', hex: '#FF7043' },
    { name: 'Peach', hex: '#FFAB91' },
    { name: 'Beige', hex: '#D7C4A3' },
    { name: 'Brown', hex: '#795548' },
    { name: 'Tan', hex: '#A1887F' },
    { name: 'Gold', hex: '#FFD700' },
    { name: 'Silver', hex: '#90A4AE' },
    { name: 'White', hex: '#F5F5F5' },
    { name: 'Light Grey', hex: '#BDBDBD' },
    { name: 'Grey', hex: '#757575' },
    { name: 'Charcoal', hex: '#424242' },
    { name: 'Black', hex: '#212121' },
    { name: 'Ivory', hex: '#FFF9C4' },
    { name: 'Lavender', hex: '#CE93D8' },
    { name: 'Mint', hex: '#A5D6A7' },
    { name: 'Sage', hex: '#80A487' },
    { name: 'Slate', hex: '#546E7A' },
    { name: 'Navy', hex: '#1A237E' },
    { name: 'Maroon', hex: '#880E4F' },
    { name: 'Olive', hex: '#827717' },
    { name: 'Mustard', hex: '#F9A825' },
    { name: 'Rust', hex: '#BF360C' },
    { name: 'Cream', hex: '#FFF8E1' },
  ];
  const THEMES      = window._artConcept?.THEMES || ['Landscape','Seascape','Cityscape','Forest','Desert','Mountains','Pose','Figure Study','Portrait','Self-Portrait','Hands Study','Clothed Figure','Animals','Birds','Marine Life','Mythical Creatures','Insects','Botanicals','Still Life','Architecture','Abstract Environment','Night Sky','Weather','Interior Space','Underwater','Aerial View'];
  const GENRES      = window._artConcept?.GENRES  || ['Victorian','Gothic','Fantasy','High Fantasy','Dark Fantasy','Romantic','Art Nouveau','Baroque','Renaissance','Medieval','Sci-Fi','Cyberpunk','Steampunk','Mythological','Horror','Fairy Tale','Ethereal'];
  const STYLES      = window._artConcept?.STYLES  || ['Abstract Expressionism','Abstract Art','Abstract Impressionism','Impressionism','Surrealism','Stylised Art','Semi-realistic Art','Realism','Photorealism'];
  const TIMER_PRESETS = window._artConcept?.TIMER_PRESETS || [{label:'10 min',minutes:10},{label:'15 min',minutes:15},{label:'20 min',minutes:20},{label:'30 min',minutes:30},{label:'45 min',minutes:45},{label:'1 hr',minutes:60},{label:'1.5 hr',minutes:90},{label:'2 hr',minutes:120},{label:'2.5 hr',minutes:150},{label:'3 hr',minutes:180}];

  const CATEGORY_DEFS_MINI = [
    { id: 'medium',  label: 'Art Medium',  type: 'medium',  options: ART_MEDIUMS.map(m => m.name) },
    { id: 'colour',  label: 'Colours',     type: 'colour',  options: COLOURS.map(c => c.name) },
    { id: 'theme',   label: 'Theme',       type: 'select',  options: THEMES },
    { id: 'genre',   label: 'Genre',       type: 'select',  options: GENRES },
    { id: 'timer',   label: 'Timer',       type: 'timer',   options: TIMER_PRESETS.map(t => t.label) },
    { id: 'style',   label: 'Style',       type: 'select',  options: STYLES },
  ];

  function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function getColour(name) { return COLOURS.find(c => c.name === name); }

  // ── Inject CSS for mini settings if concept.css not loaded ──
  function ensureConceptCSS() {
    if (document.querySelector('link[href*="concept.css"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'css/concept.css';
    document.head.appendChild(link);
  }

  // ── Inject freeze-feature styles (once) ──
  function ensureFreezeStyles() {
    if (document.getElementById('concept-freeze-styles')) return;
    const style = document.createElement('style');
    style.id = 'concept-freeze-styles';
    style.textContent = `
      /* Label row — holds label + freeze btn side by side */
      .concept-cat-mini-label-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 6px;
      }
      .concept-cat-mini-label-row .concept-cat-mini-label {
        margin-bottom: 0;
      }

      /* Freeze toggle button */
      .concept-freeze-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        padding: 0;
        border: 1px solid transparent;
        border-radius: 5px;
        background: transparent;
        color: var(--text-3, #aaa);
        cursor: pointer;
        flex-shrink: 0;
        transition: color 0.15s, background 0.15s, border-color 0.15s;
        opacity: 0.45;
      }
      .concept-freeze-btn:hover {
        opacity: 1;
        background: var(--bg-2, #f2f2f2);
        border-color: var(--border, #ddd);
        color: var(--text-1, #333);
      }
      .concept-freeze-btn[aria-pressed="true"] {
        opacity: 1;
        color: #5b9cf6;
        background: rgba(91, 156, 246, 0.12);
        border-color: rgba(91, 156, 246, 0.35);
      }

      /* Frozen block highlight */
      .concept-cat-mini-block.is-frozen {
        border-radius: 8px;
        padding: 8px 10px;
        margin: -8px -10px;
        background: rgba(91, 156, 246, 0.07);
        box-shadow: inset 0 0 0 1.5px rgba(91, 156, 246, 0.3);
      }

      /* Dark-mode adjustments */
      [data-theme="dark"] .concept-freeze-btn[aria-pressed="true"] {
        color: #7db3ff;
        background: rgba(125, 179, 255, 0.15);
        border-color: rgba(125, 179, 255, 0.3);
      }
      [data-theme="dark"] .concept-cat-mini-block.is-frozen {
        background: rgba(125, 179, 255, 0.08);
        box-shadow: inset 0 0 0 1.5px rgba(125, 179, 255, 0.25);
      }
    `;
    document.head.appendChild(style);
  }

  // ── Build the mini concept settings UI ──
  function buildConceptSettingsPanel(art) {
    ensureConceptCSS();
    ensureFreezeStyles();
    // Load existing concept from art object, or blank
    const existing = (art && art.concept) ? art.concept : {};

    const wrap = document.createElement('div');
    wrap.className = 'art-concept-settings';
    wrap.id = 'artConceptSettingsPanel';

    const hdr = document.createElement('div');
    hdr.className = 'art-concept-settings-header';

    const hdrLabel = document.createElement('span');
    hdrLabel.className = 'art-concept-settings-label';
    hdrLabel.textContent = 'Art Concept';

    const hdrActions = document.createElement('div');
    hdrActions.className = 'art-concept-settings-actions';

    const loadBtn = document.createElement('button');
    loadBtn.className = 'panel-btn sm';
    loadBtn.title = 'Load from JSON file';
    loadBtn.innerHTML = '<svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M8 2v9M5 8l3 3 3-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 13h12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg> Load JSON';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'panel-btn sm';
    saveBtn.title = 'Export concept as JSON';
    saveBtn.innerHTML = '<svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M13 10v3H3v-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg> Export';

    const randomBtn = document.createElement('button');
    randomBtn.className = 'panel-btn sm';
    randomBtn.title = 'Randomise all concept fields';
    randomBtn.innerHTML = '<svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M2 4h8.5a3.5 3.5 0 013.5 3.5v0a3.5 3.5 0 01-3.5 3.5H4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M12 2l2 2-2 2M4 10l-2 2 2 2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    hdrActions.appendChild(loadBtn);
    hdrActions.appendChild(saveBtn);
    hdrActions.appendChild(randomBtn);
    hdr.appendChild(hdrLabel);
    hdr.appendChild(hdrActions);
    wrap.appendChild(hdr);

    const catWrap = document.createElement('div');
    catWrap.className = 'concept-cat-mini';

    // Build each category mini-block
    CATEGORY_DEFS_MINI.forEach(def => {
      const block = document.createElement('div');
      block.className = 'concept-cat-mini-block';
      block.dataset.catId = def.id;

      const lblRow = document.createElement('div');
      lblRow.className = 'concept-cat-mini-label-row';

      const lbl = document.createElement('div');
      lbl.className = 'concept-cat-mini-label';
      lbl.textContent = def.label;

      const freezeBtn = document.createElement('button');
      freezeBtn.className = 'concept-freeze-btn';
      freezeBtn.title = 'Freeze — exclude from randomise';
      freezeBtn.setAttribute('aria-pressed', 'false');
      freezeBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 16 16" fill="none">
        <path d="M8 1v14M1 8h14M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        <circle cx="8" cy="8" r="2" fill="currentColor"/>
      </svg>`;

      freezeBtn.addEventListener('click', () => {
        const frozen = block.dataset.frozen === 'true';
        block.dataset.frozen = frozen ? 'false' : 'true';
        freezeBtn.setAttribute('aria-pressed', String(!frozen));
        block.classList.toggle('is-frozen', !frozen);
      });

      lblRow.appendChild(lbl);
      lblRow.appendChild(freezeBtn);
      block.appendChild(lblRow);

      const rows = document.createElement('div');
      rows.className = 'concept-cat-mini-rows';
      block.appendChild(rows);

      const existingVals = existing[def.id]
        ? (Array.isArray(existing[def.id]) ? existing[def.id] : [existing[def.id]])
        : [null];

      existingVals.forEach(val => addMiniRow(rows, def, val));

      // Add another button
      const addMore = document.createElement('button');
      addMore.className = 'concept-mini-add-btn';
      addMore.textContent = '+ Add another ' + def.label.toLowerCase();
      addMore.addEventListener('click', () => addMiniRow(rows, def, null));
      block.appendChild(addMore);

      catWrap.appendChild(block);
    });

    wrap.appendChild(catWrap);

    // ── Load JSON button ──
    const fileInput = document.createElement('input');
    fileInput.type = 'file'; fileInput.accept = '.json'; fileInput.style.display = 'none';
    wrap.appendChild(fileInput);

    loadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const f = fileInput.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = evt => {
        try {
          const json = JSON.parse(evt.target.result);
          loadConceptIntoPanel(catWrap, json);
        } catch(e) { alert('Invalid JSON file.'); }
      };
      reader.readAsText(f);
    });

    // ── Export JSON button ──
    saveBtn.addEventListener('click', () => {
      const data = readConceptFromPanel(catWrap);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'art-concept.json'; a.click();
      URL.revokeObjectURL(url);
    });

    // ── Randomise button ──
    randomBtn.addEventListener('click', () => {
      randomiseConceptPanel(catWrap);
    });

    return wrap;
  }

  function addMiniRow(container, def, value) {
    const row = document.createElement('div');
    row.className = 'concept-mini-row';
    row.dataset.catId = def.id;

    if (def.type === 'colour') {
      const swatch = document.createElement('div');
      swatch.className = 'colour-swatch';
      swatch.style.width = '14px'; swatch.style.height = '14px';
      swatch.style.borderRadius = '50%'; swatch.style.border = '1px solid rgba(0,0,0,0.12)';
      swatch.style.flexShrink = '0';
      const c = value ? getColour(value) : null;
      swatch.style.background = c ? c.hex : 'var(--border)';
      row.appendChild(swatch);

      const sel = buildSelect(def, value);
      sel.addEventListener('change', () => {
        const cd = sel.value ? getColour(sel.value) : null;
        swatch.style.background = cd ? cd.hex : 'var(--border)';
      });
      row.appendChild(sel);
    } else if (def.type === 'timer') {
      let numVal = 30, unitVal = 'min';
      if (value) {
        const match = value.match(/^(\d+(?:\.\d+)?)\s*(min|hr)/i);
        if (match) { numVal = parseFloat(match[1]); unitVal = match[2].toLowerCase(); }
      }
      const numInput = document.createElement('input');
      numInput.type = 'number'; numInput.min = 1; numInput.max = 999;
      numInput.className = 'cat-timer-number';
      numInput.style.background = 'var(--bg-2)'; numInput.style.border = '1px solid var(--border)';
      numInput.style.borderRadius = 'var(--radius)'; numInput.style.padding = '5px 6px';
      numInput.value = numVal; numInput.dataset.timerNum = '1';
      row.appendChild(numInput);

      const unitSel = document.createElement('select');
      unitSel.className = 'concept-mini-select';
      unitSel.style.flex = '0 0 60px'; unitSel.dataset.timerUnit = '1';
      ['min','hr'].forEach(u => {
        const o = document.createElement('option');
        o.value = u; o.textContent = u;
        if (u === unitVal) o.selected = true;
        unitSel.appendChild(o);
      });
      row.appendChild(unitSel);
    } else {
      const sel = buildSelect(def, value);
      row.appendChild(sel);
    }

    // Remove button (shown only when >1 row in this container)
    const removeBtn = document.createElement('button');
    removeBtn.className = 'cat-remove-btn';
    removeBtn.title = 'Remove';
    removeBtn.style.opacity = '0.5';
    removeBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';
    removeBtn.addEventListener('click', () => {
      if (container.querySelectorAll('.concept-mini-row').length <= 1) return;
      row.remove();
    });
    row.appendChild(removeBtn);

    container.appendChild(row);
  }

  function buildSelect(def, value) {
    const sel = document.createElement('select');
    sel.className = 'concept-mini-select';

    const blank = document.createElement('option');
    blank.value = ''; blank.textContent = '— ' + def.label.toLowerCase() + ' —';
    if (!value) blank.selected = true;
    sel.appendChild(blank);

    if (def.type === 'medium') {
      const cats = [...new Set(ART_MEDIUMS.map(m => m.category))];
      cats.forEach(cat => {
        const grp = document.createElement('optgroup');
        grp.label = cat;
        ART_MEDIUMS.filter(m => m.category === cat).forEach(m => {
          const o = document.createElement('option');
          o.value = m.name; o.textContent = m.name;
          if (m.name === value) o.selected = true;
          grp.appendChild(o);
        });
        sel.appendChild(grp);
      });
    } else {
      def.options.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt; o.textContent = opt;
        if (opt === value) o.selected = true;
        sel.appendChild(o);
      });
    }
    return sel;
  }

  function readConceptFromPanel(catWrap) {
    const out = {};
    CATEGORY_DEFS_MINI.forEach(def => {
      const block = catWrap.querySelector(`.concept-cat-mini-block[data-cat-id="${def.id}"]`);
      if (!block) return;
      const rows = block.querySelectorAll('.concept-mini-row');
      const vals = [];
      rows.forEach(row => {
        if (def.type === 'timer') {
          const num = row.querySelector('[data-timer-num]');
          const unit = row.querySelector('[data-timer-unit]');
          if (num && unit && num.value) vals.push(num.value + ' ' + unit.value);
        } else {
          const sel = row.querySelector('select.concept-mini-select');
          if (sel && sel.value) vals.push(sel.value);
        }
      });
      if (vals.length === 1) out[def.id] = vals[0];
      else if (vals.length > 1) out[def.id] = vals;
    });
    return out;
  }

  function loadConceptIntoPanel(catWrap, json) {
    CATEGORY_DEFS_MINI.forEach(def => {
      const block = catWrap.querySelector(`.concept-cat-mini-block[data-cat-id="${def.id}"]`);
      if (!block) return;
      const rows = block.querySelector('.concept-cat-mini-rows');
      rows.innerHTML = '';

      const raw = json[def.id];
      if (!raw) { addMiniRow(rows, def, null); return; }
      const vals = Array.isArray(raw) ? raw : [raw];
      vals.forEach(v => addMiniRow(rows, def, v));
    });
  }

  function randomiseConceptPanel(catWrap) {
    CATEGORY_DEFS_MINI.forEach(def => {
      const block = catWrap.querySelector(`.concept-cat-mini-block[data-cat-id="${def.id}"]`);
      if (!block) return;
      // Skip frozen categories
      if (block.dataset.frozen === 'true') return;
      const rows = block.querySelector('.concept-cat-mini-rows');
      const existingCount = rows.querySelectorAll('.concept-mini-row').length;
      rows.innerHTML = '';
      for (let i = 0; i < existingCount; i++) {
        let val;
        if (def.type === 'timer') {
          val = rand(TIMER_PRESETS).label;
        } else {
          val = rand(def.options);
        }
        addMiniRow(rows, def, val);
      }
    });
  }

  // ── Build split-ratio slider (medium/small layouts only) ──
  function buildSplitRatioSlider(inputId, initialValue) {
    const wrap = document.createElement('div');
    wrap.className = 'split-ratio-wrap';
    wrap.id = inputId + '-wrap';

    const labelRow = document.createElement('div');
    labelRow.className = 'split-ratio-label-row';

    const lbl = document.createElement('span');
    lbl.className = 'split-ratio-label';
    lbl.textContent = 'Image / Text ratio';

    const pct = document.createElement('span');
    pct.className = 'split-ratio-pct';
    const val = initialValue !== undefined ? initialValue : 50;
    pct.textContent = val + '% / ' + (100 - val) + '%';

    labelRow.appendChild(lbl);
    labelRow.appendChild(pct);

    const slider = document.createElement('input');
    slider.type  = 'range';
    slider.min   = 20;
    slider.max   = 80;
    slider.step  = 5;
    slider.value = val;
    slider.id    = inputId;
    slider.className = 'split-ratio-slider';

    slider.addEventListener('input', () => {
      pct.textContent = slider.value + '% / ' + (100 - slider.value) + '%';
    });

    wrap.appendChild(labelRow);
    wrap.appendChild(slider);
    return wrap;
  }

  function injectSplitSlider(overlayId, inputId, art) {
    // Only show for medium/small layouts
    const overlay = document.getElementById(overlayId);
    if (!overlay) return;

    // Remove old slider if exists
    const old = document.getElementById(inputId + '-wrap');
    if (old) old.remove();

    // Determine layout — read from admin localConfig via _editArtTarget or upload modal pageId
    let layout = null;
    if (overlayId === 'editArtOverlay' && window._editArtTarget) {
      layout = window._editArtTarget.page?.layout;
    } else if (overlayId === 'uploadOverlay') {
      // Read from the admin's localConfig via the viewer
      const artbook = window._artbookViewer?.getArtbook?.();
      const pages = artbook?.pages || [];
      // Find by pendingPageId — stored on window by admin
      const pageId = window.__pendingUploadPageId;
      const page = pages.find(p => p.id === pageId);
      layout = page?.layout;
    }

    if (layout !== 'medium' && layout !== 'small') return;

    const initialVal = (art && art.splitRatio !== undefined) ? art.splitRatio : 50;
    const slider = buildSplitRatioSlider(inputId, initialVal);

    // Insert before concept settings panel or at end of modal body
    const conceptPanel = document.getElementById(
      overlayId === 'editArtOverlay' ? 'artConceptSettingsPanel' : 'artConceptSettingsPanelUpload'
    );
    if (conceptPanel && conceptPanel.parentElement) {
      conceptPanel.parentElement.insertBefore(slider, conceptPanel);
    } else {
      const inner = overlay.querySelector('.edit-art-body') || overlay.firstElementChild;
      if (inner) inner.appendChild(slider);
    }
  }

  // ── Patch into admin's openEditArtModal, editArtSave, and upload modal ──
  function initConceptSettings() {
    const editModalBody = document.querySelector('.edit-art-body');

    // ── EDIT modal: inject concept panel when overlay opens ──
    if (editModalBody) {
      function injectEditPanel() {
        const old = document.getElementById('artConceptSettingsPanel');
        if (old) old.remove();
        const art = window.__editArtTarget || {};
        const panel = buildConceptSettingsPanel(art);
        editModalBody.appendChild(panel);
        // Split ratio slider — injected after panel is in DOM
        setTimeout(() => injectSplitSlider('editArtOverlay', 'editArtSplitRatio', art), 10);
      }

      // Capture concept data before the save handler runs
      const saveBtn = document.getElementById('editArtSave');
      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          const catWrap = document.querySelector('#artConceptSettingsPanel .concept-cat-mini');
          if (!catWrap) return;
          const overlay = document.getElementById('editArtOverlay');
          if (overlay && overlay.style.display === 'flex') {
            window.__pendingConceptData = readConceptFromPanel(catWrap);
          }
        }, true); // capture phase
      }

      const editOverlay = document.getElementById('editArtOverlay');
      if (editOverlay) {
        const obs = new MutationObserver(() => {
          if (editOverlay.style.display === 'flex') setTimeout(injectEditPanel, 30);
        });
        obs.observe(editOverlay, { attributes: true, attributeFilter: ['style'] });
      }
    }

    // ── UPLOAD modal: inject concept panel when overlay opens ──
    const uploadOverlay = document.getElementById('uploadOverlay');
    if (uploadOverlay) {
      function injectUploadPanel() {
        if (document.getElementById('artConceptSettingsPanelUpload')) return;
        const panel = buildConceptSettingsPanel({});
        panel.id = 'artConceptSettingsPanelUpload';

        // Insert after the description field
        const descField = uploadOverlay.querySelector('#artDesc');
        const insertTarget = descField
          ? (descField.closest('.field-label') || descField.parentElement)
          : null;

        if (insertTarget && insertTarget.parentElement) {
          insertTarget.parentElement.insertBefore(panel, insertTarget.nextSibling);
        } else {
          const inner = uploadOverlay.querySelector('.upload-modal-inner')
            || uploadOverlay.firstElementChild;
          if (inner) inner.appendChild(panel);
          else uploadOverlay.appendChild(panel);
        }
      }

      const uploadObs = new MutationObserver(() => {
        if (uploadOverlay.style.display === 'flex') {
          setTimeout(() => {
            injectUploadPanel();
            setTimeout(() => injectSplitSlider('uploadOverlay', 'uploadSplitRatio', {}), 20);
          }, 50);
        } else {
          const old = document.getElementById('artConceptSettingsPanelUpload');
          if (old) old.remove();
          const oldSlider = document.getElementById('uploadSplitRatio-wrap');
          if (oldSlider) oldSlider.remove();
        }
      });
      uploadObs.observe(uploadOverlay, { attributes: true, attributeFilter: ['style'] });

      // Capture concept data on upload submit
      const uploadSubmit = document.getElementById('uploadSubmit');
      if (uploadSubmit) {
        uploadSubmit.addEventListener('click', () => {
          const catWrap = document.querySelector('#artConceptSettingsPanelUpload .concept-cat-mini');
          if (catWrap) window.__pendingUploadConceptData = readConceptFromPanel(catWrap);
        }, true);
      }
    }
  }

  // ── Expose readConceptFromPanel for admin.js save patch ──
  window._conceptSettings = {
    readFromModal: () => {
      const catWrap = document.querySelector('#artConceptSettingsPanel .concept-cat-mini');
      if (!catWrap) return null;
      return readConceptFromPanel(catWrap);
    }
  };

})();
