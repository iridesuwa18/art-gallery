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

  // ── Data (duplicated from concept.js for standalone use in index.html) ──
  const ART_MEDIUMS = window._artConcept?.ART_MEDIUMS || [];
  const COLOURS     = window._artConcept?.COLOURS || [];
  const THEMES      = window._artConcept?.THEMES || ['Landscape','Seascape','Cityscape','Forest','Desert','Mountains','Pose','Figure Study','Portrait','Self-Portrait','Animals','Birds','Still Life','Architecture','Abstract Environment','Night Sky'];
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

  // ── Build the mini concept settings UI ──
  function buildConceptSettingsPanel(art) {
    ensureConceptCSS();
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

      const lbl = document.createElement('div');
      lbl.className = 'concept-cat-mini-label';
      lbl.textContent = def.label;
      block.appendChild(lbl);

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

  // ── Patch into admin's openEditArtModal and editArtSave ──
  function initConceptSettings() {
    const editModalBody = document.querySelector('.edit-art-body');
    if (!editModalBody) return;

    // We intercept openEditArtModal by monkey-patching it
    // The panel gets rebuilt each time the modal opens
    const originalOpen = window.openEditArtModal;
    if (!originalOpen) {
      // fallback: observe editArtOverlay display changes
      const overlay = document.getElementById('editArtOverlay');
      if (!overlay) return;

      const obs = new MutationObserver(() => {
        if (overlay.style.display === 'flex') {
          injectPanel();
        }
      });
      obs.observe(overlay, { attributes: true, attributeFilter: ['style'] });
    }

    function injectPanel() {
      // Remove old panel if exists
      const old = document.getElementById('artConceptSettingsPanel');
      if (old) old.remove();

      // Get art target from admin's internal state
      // We can read it from the hidden _editArtTarget via a getter if exposed,
      // or just build blank if not available
      const art = window.__editArtTarget || {};
      const panel = buildConceptSettingsPanel(art);
      editModalBody.appendChild(panel);
    }

    // Patch editArtSave to include concept data
    const saveBtn = document.getElementById('editArtSave');
    if (saveBtn) {
      const origSave = saveBtn.onclick;
      saveBtn.addEventListener('click', () => {
        const catWrap = document.querySelector('.concept-cat-mini');
        if (!catWrap) return;

        // Write concept back to art object via admin's _editArtTarget
        // We access it via a MutationObserver trick or by reading localConfig
        const overlay = document.getElementById('editArtOverlay');
        if (overlay && overlay.style.display === 'flex') {
          const conceptData = readConceptFromPanel(catWrap);
          // Store for pickup by patched save handler
          window.__pendingConceptData = conceptData;
        }
      }, true); // capture phase — runs before existing handlers
    }

    // Listen for overlay open to inject panel
    const overlay = document.getElementById('editArtOverlay');
    if (overlay) {
      const obs = new MutationObserver(() => {
        if (overlay.style.display === 'flex') {
          setTimeout(injectPanel, 30);
        }
      });
      obs.observe(overlay, { attributes: true, attributeFilter: ['style'] });
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
