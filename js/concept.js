/* ═══════════════════════════════════════════════════════════
   concept.js — Art Concept Generator
   Handles all generator logic, rendering, randomise, export,
   medium detail modal, and duplicate categories.
═══════════════════════════════════════════════════════════ */

'use strict';

// ─── DATA ────────────────────────────────────────────────────

const ART_MEDIUMS = [
  // Dry Drawing
  { name: 'Graphite Pencil (H–HB)', category: 'Dry Drawing', brushShape: 'Round', wetDry: 'Dry', stickability: 'Yes — pigment depletes with use', irregularity: 'Low — fairly consistent', valueThickness: 'Wide: soft press = light, hard press = dark', naturalSize: 'Very thin (0.3–2mm)', colourMode: 'Grayscale', sizeDiff: 'Slight — harder press spreads slightly', smergability: 'Yes — blends smoothly with finger/stump' },
  { name: 'Graphite Pencil (B–9B)', category: 'Dry Drawing', brushShape: 'Round', wetDry: 'Dry', stickability: 'Yes — depletes faster', irregularity: 'Low–Medium', valueThickness: 'Wide: very responsive to pressure', naturalSize: 'Thin to medium', colourMode: 'Grayscale', sizeDiff: 'Yes — more spread at heavy pressure', smergability: 'Yes — very smergable, greasy feel' },
  { name: 'Mechanical Pencil', category: 'Dry Drawing', brushShape: 'Round (tiny)', wetDry: 'Dry', stickability: 'Yes — slight depletion', irregularity: 'Very Low — near perfect consistency', valueThickness: 'Moderate: less range than wood pencil', naturalSize: 'Very thin (0.3–0.9mm)', colourMode: 'Grayscale', sizeDiff: 'Minimal', smergability: 'Yes — but less than wood pencil' },
  { name: 'Charcoal Stick (Vine)', category: 'Dry Drawing', brushShape: 'Round/Irregular', wetDry: 'Dry', stickability: 'Yes — crumbles fast', irregularity: 'High — very irregular edges', valueThickness: 'Wide: extremely pressure sensitive', naturalSize: 'Medium–Large', colourMode: 'Grayscale', sizeDiff: 'Yes — significantly larger under pressure', smergability: 'Highly smergable' },
  { name: 'Charcoal Stick (Compressed)', category: 'Dry Drawing', brushShape: 'Round', wetDry: 'Dry', stickability: 'Yes — slower depletion', irregularity: 'Medium', valueThickness: 'Wide', naturalSize: 'Medium', colourMode: 'Grayscale', sizeDiff: 'Yes', smergability: 'Very smergable' },
  { name: 'Charcoal Block / Conté Carré', category: 'Dry Drawing', brushShape: 'Square / Flat Rectangle', wetDry: 'Dry', stickability: 'Yes', irregularity: 'Medium — edge vs face strokes differ', valueThickness: 'Wide — face=broad value, edge=line', naturalSize: 'Large (face) / Thin (edge)', colourMode: 'Grayscale (charcoal) / Color (conté)', sizeDiff: 'Yes — face use spreads a lot', smergability: 'Yes — smergable' },
  { name: 'Conté Crayon', category: 'Dry Drawing', brushShape: 'Square', wetDry: 'Dry', stickability: 'Yes', irregularity: 'Medium', valueThickness: 'Moderate range', naturalSize: 'Thin–Medium', colourMode: 'Limited earthy palette (sanguine, bistre, white, black)', sizeDiff: 'Slight', smergability: 'Partially — less than charcoal' },
  { name: 'Wax Crayon', category: 'Dry Drawing', brushShape: 'Triangle / Round tip', wetDry: 'Dry', stickability: 'Yes — slow depletion', irregularity: 'Low', valueThickness: 'Low: mostly same value no matter pressure', naturalSize: 'Medium', colourMode: 'Full colour', sizeDiff: 'Yes — slight spread', smergability: 'No — waxy resist' },
  { name: 'Oil Pastel', category: 'Dry Drawing', brushShape: 'Round / Blunt', wetDry: 'Dry (oily)', stickability: 'Yes', irregularity: 'Low–Medium', valueThickness: 'Low–Moderate: pressure adds thickness/opacity', naturalSize: 'Medium–Large', colourMode: 'Full colour', sizeDiff: 'Yes — spreads significantly', smergability: 'Yes — very smergable, like finger painting' },
  { name: 'Soft Pastel', category: 'Dry Drawing', brushShape: 'Round / Flat', wetDry: 'Dry', stickability: 'Yes — very fast falloff', irregularity: 'High — very chalky, dusty edge', valueThickness: 'Wide: very pressure sensitive', naturalSize: 'Medium–Large', colourMode: 'Full colour', sizeDiff: 'Yes — large spread', smergability: 'Highly smergable — almost designed for it' },
  { name: 'Hard Pastel', category: 'Dry Drawing', brushShape: 'Square / Round', wetDry: 'Dry', stickability: 'Yes', irregularity: 'Medium', valueThickness: 'Moderate range', naturalSize: 'Small–Medium', colourMode: 'Full colour', sizeDiff: 'Slight', smergability: 'Partially smergable' },
  { name: 'Coloured Pencil (wax-based)', category: 'Dry Drawing', brushShape: 'Round', wetDry: 'Dry', stickability: 'Yes — slow', irregularity: 'Low', valueThickness: 'Moderate: layering builds value', naturalSize: 'Very thin', colourMode: 'Full colour', sizeDiff: 'Minimal', smergability: 'Minimal — waxy resist' },
  { name: 'Coloured Pencil (oil-based)', category: 'Dry Drawing', brushShape: 'Round', wetDry: 'Dry', stickability: 'Yes — slow', irregularity: 'Low', valueThickness: 'Moderate', naturalSize: 'Very thin', colourMode: 'Full colour', sizeDiff: 'Minimal', smergability: 'Slightly more than wax' },
  { name: 'Water-soluble Coloured Pencil', category: 'Dry Drawing', brushShape: 'Round', wetDry: 'Dry (activates wet)', stickability: 'Yes — slow (dry); fast (wet)', irregularity: 'Low (dry); Medium (wet)', valueThickness: 'Moderate (dry); Wide (wet)', naturalSize: 'Very thin', colourMode: 'Full colour', sizeDiff: 'Minimal (dry); Moderate (wet)', smergability: 'Yes when wet — bleeds and blooms' },
  { name: 'Graphite Powder / Stick', category: 'Dry Drawing', brushShape: 'Round / Formless', wetDry: 'Dry', stickability: 'Yes — depletes quickly', irregularity: 'High — very free-form', valueThickness: 'Wide', naturalSize: 'Large (broad application)', colourMode: 'Grayscale', sizeDiff: 'Yes', smergability: 'Highly smergable' },
  { name: 'Silver / Metalpoint', category: 'Dry Drawing', brushShape: 'Round (tiny)', wetDry: 'Dry', stickability: 'Minimal — almost none', irregularity: 'Very Low — precise', valueThickness: 'Narrow: very consistent', naturalSize: 'Extremely thin', colourMode: 'Grayscale (warm grey to brown)', sizeDiff: 'None', smergability: 'No' },
  // Ink & Pen
  { name: 'Ballpoint Pen', category: 'Ink & Pen', brushShape: 'Round (tiny)', wetDry: 'Dry/Wet hybrid', stickability: 'Yes — ink depletes', irregularity: 'Very Low', valueThickness: 'Moderate: pressure affects flow slightly', naturalSize: 'Very thin', colourMode: 'Grayscale + limited colour', sizeDiff: 'Minimal', smergability: 'Minimal' },
  { name: 'Felt Tip / Marker (thin)', category: 'Ink & Pen', brushShape: 'Round', wetDry: 'Wet', stickability: 'Yes — ink runs out', irregularity: 'Low', valueThickness: 'Low: mostly flat value', naturalSize: 'Thin', colourMode: 'Full colour (or grayscale)', sizeDiff: 'Minimal', smergability: 'No — dries fast' },
  { name: 'Felt Tip / Marker (chisel)', category: 'Ink & Pen', brushShape: 'Flat / Angled Rectangle', wetDry: 'Wet', stickability: 'Yes', irregularity: 'Low', valueThickness: 'Low: consistent opacity', naturalSize: 'Medium–Large (flat)', colourMode: 'Full colour', sizeDiff: 'No — fixed nib', smergability: 'No' },
  { name: 'Fine Liner / Technical Pen', category: 'Ink & Pen', brushShape: 'Round (tiny)', wetDry: 'Wet', stickability: 'Yes', irregularity: 'Very Low — most precise line', valueThickness: 'None: constant value at any pressure', naturalSize: 'Very thin (0.05–1mm)', colourMode: 'Grayscale / Single colour', sizeDiff: 'None', smergability: 'No' },
  { name: 'Brush Pen (soft)', category: 'Ink & Pen', brushShape: 'Round / Tapered', wetDry: 'Wet', stickability: 'Yes', irregularity: 'Medium', valueThickness: 'Wide: varies greatly by pressure', naturalSize: 'Thin to Large (pressure-variable)', colourMode: 'Grayscale / Single colour', sizeDiff: 'Yes — significantly', smergability: 'No' },
  { name: 'Brush Pen (hard)', category: 'Ink & Pen', brushShape: 'Round', wetDry: 'Wet', stickability: 'Yes', irregularity: 'Low', valueThickness: 'Moderate', naturalSize: 'Thin to Medium', colourMode: 'Grayscale / Single colour', sizeDiff: 'Slight', smergability: 'No' },
  { name: 'Dip Pen / Nib', category: 'Ink & Pen', brushShape: 'Round / Pointed', wetDry: 'Wet', stickability: 'Yes — needs redipping', irregularity: 'Low–Medium (flex nib = higher)', valueThickness: 'Wide (flex nib) / Low (rigid nib)', naturalSize: 'Very thin to Medium', colourMode: 'Grayscale / Single colour', sizeDiff: 'Yes (flex) / No (rigid)', smergability: 'No' },
  { name: 'Reed Pen / Bamboo Pen', category: 'Ink & Pen', brushShape: 'Square / Chisel', wetDry: 'Wet', stickability: 'Yes — needs redipping', irregularity: 'High — rough, organic edges', valueThickness: 'Moderate', naturalSize: 'Medium (chunky)', colourMode: 'Grayscale / Single colour', sizeDiff: 'Slight', smergability: 'No' },
  { name: 'Quill Pen', category: 'Ink & Pen', brushShape: 'Pointed Oval', wetDry: 'Wet', stickability: 'Yes — needs redipping', irregularity: 'Medium — organic', valueThickness: 'Moderate: subtle flex', naturalSize: 'Very thin to Medium', colourMode: 'Grayscale / Single colour', sizeDiff: 'Slight', smergability: 'No' },
  { name: 'Indian Ink (brush applied)', category: 'Ink & Pen', brushShape: 'Round / Flat', wetDry: 'Wet', stickability: 'No — full coverage; dries fast', irregularity: 'Medium–High depending on brush', valueThickness: 'Wide: thinned ink = wash, full = opaque', naturalSize: 'Thin to Large (brush dependent)', colourMode: 'Grayscale', sizeDiff: 'Yes', smergability: 'While wet only' },
  // Paint
  { name: 'Watercolour', category: 'Paint', brushShape: 'Round / Flat (brush shape)', wetDry: 'Wet', stickability: 'Yes — pigment fades from centre outward', irregularity: 'Medium — blooms and edges form organically', valueThickness: 'Wide: wet-on-wet = soft; dry brush = textured', naturalSize: 'Thin to Large', colourMode: 'Full colour', sizeDiff: 'Yes — wet pools spread', smergability: 'While very wet only' },
  { name: 'Gouache', category: 'Paint', brushShape: 'Round / Flat', wetDry: 'Wet', stickability: 'Minimal — opaque coverage stays put', irregularity: 'Low–Medium — deliberate edges possible', valueThickness: 'Low–Moderate: more opaque than watercolour; drying lightens value', naturalSize: 'Thin to Large', colourMode: 'Full colour', sizeDiff: 'Slight', smergability: 'While wet — limited' },
  { name: 'Acrylic Paint', category: 'Paint', brushShape: 'Round / Flat / Fan', wetDry: 'Wet (dries fast)', stickability: 'Minimal — fast drying locks strokes', irregularity: 'Low–Medium — brush texture visible', valueThickness: 'Low: opaque; value locked on drying', naturalSize: 'Thin to Large', colourMode: 'Full colour', sizeDiff: 'Slight', smergability: 'While wet — very limited window' },
  { name: 'Oil Paint', category: 'Paint', brushShape: 'Round / Flat / Fan / Filbert', wetDry: 'Wet (dries very slow)', stickability: 'Minimal — paint stays wet long', irregularity: 'Low–Medium — buttery texture', valueThickness: 'Low: opaque; rich depth', naturalSize: 'Thin to Large', colourMode: 'Full colour', sizeDiff: 'Slight', smergability: 'Yes — highly smergable while wet' },
  { name: 'Tempera (Egg)', category: 'Paint', brushShape: 'Round / Flat', wetDry: 'Wet', stickability: 'Minimal', irregularity: 'Low — precise edges', valueThickness: 'Low–Moderate: less range than oil', naturalSize: 'Thin to Medium', colourMode: 'Full colour', sizeDiff: 'Minimal', smergability: 'While wet — very limited' },
  { name: 'Encaustic (Wax Paint)', category: 'Paint', brushShape: 'Flat / Broad', wetDry: 'Wet (molten wax)', stickability: 'Minimal', irregularity: 'Medium — wax texture, drips, ridges', valueThickness: 'Low — opaque', naturalSize: 'Large (usually)', colourMode: 'Full colour', sizeDiff: 'Slight', smergability: 'Yes — while warm/molten only' },
  { name: 'Fresco (wet plaster)', category: 'Paint', brushShape: 'Flat / Round', wetDry: 'Wet', stickability: 'Minimal — absorbed into plaster', irregularity: 'Low — brush strokes precise', valueThickness: 'Moderate — pigment absorbed determines saturation', naturalSize: 'Medium to Large', colourMode: 'Full colour (muted)', sizeDiff: 'Minimal', smergability: 'No — sets permanently' },
  { name: 'Ink Wash', category: 'Paint', brushShape: 'Round / Flat', wetDry: 'Wet', stickability: 'Yes — fades with water', irregularity: 'Medium — blooms, edges', valueThickness: 'Wide: dilution controls value entirely', naturalSize: 'Thin to Large', colourMode: 'Grayscale', sizeDiff: 'Yes — pools spread', smergability: 'While wet' },
  { name: 'Airbrush', category: 'Paint', brushShape: 'Round (soft cloud)', wetDry: 'Wet', stickability: 'Yes — paint thins and fades at edges', irregularity: 'Low at centre; High at edge (spray falloff)', valueThickness: 'Wide: distance and pressure control density', naturalSize: 'Thin to Very Large', colourMode: 'Full colour', sizeDiff: 'Yes — spray widens with distance', smergability: 'No — dries in air' },
];

const MEDIUM_COL_LABELS = {
  brushShape: 'Brush Shape',
  wetDry: 'Wet / Dry',
  stickability: 'Stickability (trails off?)',
  irregularity: 'Irregularity',
  valueThickness: 'Value Thickness (soft vs hard press)',
  naturalSize: 'Natural Brush Size',
  colourMode: 'Colour / Grayscale',
  sizeDiff: 'Size Diff (harder = larger?)',
  smergability: 'Smergability',
};

const COLOURS = [
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

const THEMES = [
  'Landscape', 'Seascape', 'Cityscape', 'Forest', 'Desert', 'Mountains',
  'Pose', 'Figure Study', 'Portrait', 'Self-Portrait', 'Hands Study', 'Clothed Figure',
  'Animals', 'Birds', 'Marine Life', 'Mythical Creatures', 'Insects', 'Botanicals',
  'Still Life', 'Architecture', 'Abstract Environment', 'Night Sky', 'Weather',
  'Interior Space', 'Underwater', 'Aerial View',
];

const GENRES = [
  'Victorian', 'Gothic', 'Fantasy', 'High Fantasy', 'Dark Fantasy',
  'Romantic', 'Art Nouveau', 'Baroque', 'Renaissance', 'Medieval',
  'Sci-Fi', 'Cyberpunk', 'Steampunk', 'Solarpunk', 'Mythological',
  'Horror', 'Fairy Tale', 'Post-Apocalyptic', 'Ethereal', 'Folk Art',
  'East Asian', 'Ancient Greek', 'Noir', 'Cottagecore',
];

const STYLES = [
  'Abstract Expressionism',
  'Abstract Art',
  'Abstract Impressionism',
  'Impressionism',
  'Surrealism',
  'Stylised Art',
  'Semi-realistic Art',
  'Realism',
  'Photorealism',
];

const TIMER_PRESETS = [
  { label: '10 min', minutes: 10 },
  { label: '15 min', minutes: 15 },
  { label: '20 min', minutes: 20 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '1 hr', minutes: 60 },
  { label: '1.5 hr', minutes: 90 },
  { label: '2 hr', minutes: 120 },
  { label: '2.5 hr', minutes: 150 },
  { label: '3 hr', minutes: 180 },
];

// ─── CATEGORY DEFINITIONS ─────────────────────────────────────
// Each category has: id, label, type, options/range, selections[]
// selections = array of chosen values (allows duplicates)

const CATEGORY_DEFS = [
  { id: 'medium',  label: 'Art Medium',  type: 'medium',  options: ART_MEDIUMS.map(m => m.name) },
  { id: 'colour',  label: 'Colours',     type: 'colour',  options: COLOURS.map(c => c.name) },
  { id: 'theme',   label: 'Theme',       type: 'select',  options: THEMES },
  { id: 'genre',   label: 'Genre',       type: 'select',  options: GENRES },
  { id: 'timer',   label: 'Timer',       type: 'timer',   options: TIMER_PRESETS.map(t => t.label) },
  { id: 'style',   label: 'Style',       type: 'select',  options: STYLES },
];

// ─── STATE ────────────────────────────────────────────────────
// Each category: { defId, selections: [value, ...] }
let state = CATEGORY_DEFS.map(def => ({ defId: def.id, selections: [null] }));

// ─── DOM REFS ─────────────────────────────────────────────────
const genBody              = document.getElementById('genBody');
const randomiseAllBtn      = document.getElementById('randomiseAllBtn');
const downloadJsonBtn      = document.getElementById('downloadJsonBtn');
const previewContent       = document.getElementById('previewContent');
const previewCard          = document.getElementById('previewCard');
const previewTimerRing     = document.getElementById('previewTimerRing');
const timerFill            = document.getElementById('timerFill');
const timerText            = document.getElementById('timerText');
const mediumDetailOverlay  = document.getElementById('mediumDetailOverlay');
const mediumDetailClose    = document.getElementById('mediumDetailClose');
const mediumDetailTitle    = document.getElementById('mediumDetailTitle');
const mediumDetailBody     = document.getElementById('mediumDetailBody');
const mediumComparePanel   = document.getElementById('mediumComparePanel');
const mediumCompareClose   = document.getElementById('mediumCompareClose');
const mediumCompareSelect  = document.getElementById('mediumCompareSelect');
const mediumCompareBody    = document.getElementById('mediumCompareBody');
const mediumCompareOpenBtn = document.getElementById('mediumCompareOpenBtn');

// ─── HELPERS ──────────────────────────────────────────────────
function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function getColour(name) { return COLOURS.find(c => c.name === name); }
function getMedium(name) { return ART_MEDIUMS.find(m => m.name === name); }
function getDef(id) { return CATEGORY_DEFS.find(d => d.id === id); }
function getTimerMinutes(label) {
  const p = TIMER_PRESETS.find(t => t.label === label);
  return p ? p.minutes : null;
}
function minutesToLabel(m) {
  if (m < 60) return m + ' min';
  const h = m / 60;
  return (h === Math.floor(h) ? h : h.toFixed(1)) + ' hr';
}

// ─── RENDER GENERATOR ─────────────────────────────────────────
function renderGenerator() {
  genBody.innerHTML = '';
  state.forEach((catState, catIdx) => {
    const def = getDef(catState.defId);
    if (!def) return;

    const block = document.createElement('div');
    block.className = 'cat-block';

    // Header
    const header = document.createElement('div');
    header.className = 'cat-header';

    const label = document.createElement('span');
    label.className = 'cat-label';
    label.textContent = def.label;

    const actions = document.createElement('div');
    actions.className = 'cat-actions';

    const randomBtn = document.createElement('button');
    randomBtn.className = 'cat-randomise-btn';
    randomBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M2 4h8.5a3.5 3.5 0 013.5 3.5v0a3.5 3.5 0 01-3.5 3.5H4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M12 2l2 2-2 2M4 10l-2 2 2 2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg> Roll';
    randomBtn.title = 'Randomise this category';
    randomBtn.addEventListener('click', () => randomiseCat(catIdx));

    const addBtn = document.createElement('button');
    addBtn.className = 'cat-add-btn';
    addBtn.innerHTML = '<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg> Add';
    addBtn.title = 'Add another ' + def.label;
    addBtn.addEventListener('click', () => addSelection(catIdx));

    actions.appendChild(randomBtn);
    actions.appendChild(addBtn);
    header.appendChild(label);
    header.appendChild(actions);
    block.appendChild(header);

    // Selection rows
    const selContainer = document.createElement('div');
    selContainer.className = 'cat-selections';

    catState.selections.forEach((val, selIdx) => {
      const row = buildSelectionRow(def, catState, catIdx, selIdx, val);
      selContainer.appendChild(row);
    });

    block.appendChild(selContainer);
    genBody.appendChild(block);
  });
}

function buildSelectionRow(def, catState, catIdx, selIdx, val) {
  const row = document.createElement('div');
  row.className = 'cat-selection-row';

  // Timer type
  if (def.type === 'timer') {
    // Parse val like "30 min" or "2 hr"
    let numVal = 30, unitVal = 'min';
    if (val) {
      const match = val.match(/^(\d+(?:\.\d+)?)\s*(min|hr)/i);
      if (match) { numVal = parseFloat(match[1]); unitVal = match[2].toLowerCase(); }
    }

    const timerWrap = document.createElement('div');
    timerWrap.className = 'cat-timer-inputs';

    const numInput = document.createElement('input');
    numInput.type = 'number';
    numInput.min = 1; numInput.max = 999;
    numInput.className = 'cat-timer-number';
    numInput.value = numVal;

    const unitSel = document.createElement('select');
    unitSel.className = 'cat-timer-unit';
    ['min', 'hr'].forEach(u => {
      const opt = document.createElement('option');
      opt.value = u; opt.textContent = u;
      if (u === unitVal) opt.selected = true;
      unitSel.appendChild(opt);
    });

    const updateTimer = () => {
      const n = parseFloat(numInput.value) || 1;
      const u = unitSel.value;
      state[catIdx].selections[selIdx] = n + ' ' + u;
      updatePreview();
    };
    numInput.addEventListener('input', updateTimer);
    unitSel.addEventListener('change', updateTimer);

    timerWrap.appendChild(numInput);
    timerWrap.appendChild(unitSel);
    row.appendChild(timerWrap);

  } else if (def.type === 'colour') {
    // Colour swatch
    const swatch = document.createElement('div');
    swatch.className = 'colour-swatch';
    const colData = val ? getColour(val) : null;
    swatch.style.background = colData ? colData.hex : 'var(--border)';
    row.appendChild(swatch);

    const sel = document.createElement('select');
    sel.className = 'cat-value-select';
    const blankOpt = document.createElement('option');
    blankOpt.value = ''; blankOpt.textContent = '— pick a colour —';
    if (!val) blankOpt.selected = true;
    sel.appendChild(blankOpt);
    COLOURS.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.name; opt.textContent = c.name;
      if (c.name === val) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', () => {
      state[catIdx].selections[selIdx] = sel.value || null;
      // Update swatch
      const cd = sel.value ? getColour(sel.value) : null;
      swatch.style.background = cd ? cd.hex : 'var(--border)';
      updatePreview();
    });
    row.appendChild(sel);

  } else if (def.type === 'medium') {
    const sel = document.createElement('select');
    sel.className = 'cat-value-select';
    const blankOpt = document.createElement('option');
    blankOpt.value = ''; blankOpt.textContent = '— pick a medium —';
    if (!val) blankOpt.selected = true;
    sel.appendChild(blankOpt);

    // Group by category
    const cats = [...new Set(ART_MEDIUMS.map(m => m.category))];
    cats.forEach(cat => {
      const grp = document.createElement('optgroup');
      grp.label = cat;
      ART_MEDIUMS.filter(m => m.category === cat).forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.name; opt.textContent = m.name;
        if (m.name === val) opt.selected = true;
        grp.appendChild(opt);
      });
      sel.appendChild(grp);
    });
    sel.addEventListener('change', () => {
      state[catIdx].selections[selIdx] = sel.value || null;
      updatePreview();
      renderGenerator(); // re-render to show/hide info btn
    });
    row.appendChild(sel);

    // Info button to show medium details
    if (val) {
      const infoBtn = document.createElement('button');
      infoBtn.className = 'medium-info-btn';
      infoBtn.textContent = '+';
      infoBtn.title = 'View medium details';
      infoBtn.addEventListener('click', () => openMediumDetail(val));
      row.appendChild(infoBtn);
    }

  } else {
    // Generic select
    const sel = document.createElement('select');
    sel.className = 'cat-value-select';
    const blankOpt = document.createElement('option');
    blankOpt.value = ''; blankOpt.textContent = '— pick a ' + def.label.toLowerCase() + ' —';
    if (!val) blankOpt.selected = true;
    sel.appendChild(blankOpt);
    def.options.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt; o.textContent = opt;
      if (opt === val) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener('change', () => {
      state[catIdx].selections[selIdx] = sel.value || null;
      updatePreview();
    });
    row.appendChild(sel);
  }

  // Remove button (only if more than 1 selection)
  if (catState.selections.length > 1) {
    const removeBtn = document.createElement('button');
    removeBtn.className = 'cat-remove-btn';
    removeBtn.title = 'Remove';
    removeBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';
    removeBtn.addEventListener('click', () => {
      state[catIdx].selections.splice(selIdx, 1);
      renderGenerator();
      updatePreview();
    });
    row.appendChild(removeBtn);
  }

  return row;
}

// ─── ACTIONS ──────────────────────────────────────────────────
function addSelection(catIdx) {
  state[catIdx].selections.push(null);
  renderGenerator();
  updatePreview();
}

function randomiseCat(catIdx) {
  const def = getDef(state[catIdx].defId);
  state[catIdx].selections = state[catIdx].selections.map(() => {
    if (def.type === 'timer') {
      const p = rand(TIMER_PRESETS);
      return p.label;
    } else {
      return rand(def.options);
    }
  });
  renderGenerator();
  updatePreview();
  flashCat(catIdx);
}

function flashCat(catIdx) {
  const blocks = genBody.querySelectorAll('.cat-block');
  const block = blocks[catIdx];
  if (!block) return;
  block.style.transition = 'background 0.08s';
  block.style.background = 'var(--bg-2)';
  setTimeout(() => { block.style.background = ''; }, 280);
}

function randomiseAll() {
  state.forEach((catState, i) => {
    const def = getDef(catState.defId);
    catState.selections = catState.selections.map(() => {
      if (def.type === 'timer') return rand(TIMER_PRESETS).label;
      return rand(def.options);
    });
  });
  renderGenerator();
  updatePreview();
}

// ─── PREVIEW UPDATE ───────────────────────────────────────────
function updatePreview() {
  const sections = state.map(catState => {
    const def = getDef(catState.defId);
    const vals = catState.selections.filter(Boolean);
    return { def, vals };
  }).filter(s => s.vals.length > 0);

  if (sections.length === 0) {
    previewContent.innerHTML = '<p class="preview-empty">Configure your categories on the left, then randomise or pick values to see your concept here.</p>';
    previewTimerRing.style.display = 'none';
    return;
  }

  previewContent.innerHTML = '';

  let timerMins = null;

  sections.forEach(({ def, vals }) => {
    if (def.type === 'timer') {
      // Find first timer value
      const first = vals[0];
      const match = first && first.match(/^(\d+(?:\.\d+)?)\s*(min|hr)/i);
      if (match) {
        const n = parseFloat(match[1]);
        const u = match[2].toLowerCase();
        timerMins = u === 'hr' ? n * 60 : n;
      }
      return; // render as ring below, not chip
    }

    const section = document.createElement('div');
    section.className = 'preview-section';

    const lbl = document.createElement('div');
    lbl.className = 'preview-section-label';
    lbl.textContent = def.label;
    section.appendChild(lbl);

    const chips = document.createElement('div');
    chips.className = 'preview-chips';

    vals.forEach(val => {
      const chip = document.createElement('div');
      chip.className = 'preview-chip';

      if (def.type === 'colour') {
        const c = getColour(val);
        if (c) {
          const sw = document.createElement('div');
          sw.className = 'chip-swatch';
          sw.style.background = c.hex;
          chip.appendChild(sw);
        }
      }

      chip.appendChild(document.createTextNode(val));
      chips.appendChild(chip);
    });

    section.appendChild(chips);
    previewContent.appendChild(section);
  });

  // Timer ring
  if (timerMins) {
    previewTimerRing.style.display = 'block';
    const maxMins = 180;
    const pct = Math.min(timerMins / maxMins, 1);
    const circumference = 2 * Math.PI * 44;
    timerFill.style.strokeDasharray = circumference;
    timerFill.style.strokeDashoffset = circumference * (1 - pct);
    const h = Math.floor(timerMins / 60);
    const m = timerMins % 60;
    timerText.textContent = h > 0 ? (m > 0 ? h + 'h\n' + m + 'm' : h + 'h') : m + 'm';
  } else {
    previewTimerRing.style.display = 'none';
  }
}

// ─── MEDIUM DETAIL MODAL ──────────────────────────────────────

// Populate a detail body element with rows for a given medium object
function populateMediumDetailBody(bodyEl, m) {
  bodyEl.innerHTML = '';

  // Category row first
  const catRow = document.createElement('div');
  catRow.className = 'medium-detail-row';
  const catLbl = document.createElement('div');
  catLbl.className = 'medium-detail-col-label';
  catLbl.textContent = 'Category';
  const catVal = document.createElement('div');
  catVal.className = 'medium-detail-col-value';
  catVal.textContent = m.category;
  catRow.appendChild(catLbl);
  catRow.appendChild(catVal);
  bodyEl.appendChild(catRow);

  Object.entries(MEDIUM_COL_LABELS).forEach(([key, label]) => {
    if (!m[key]) return;
    const row = document.createElement('div');
    row.className = 'medium-detail-row';
    const lbl = document.createElement('div');
    lbl.className = 'medium-detail-col-label';
    lbl.textContent = label;
    const val = document.createElement('div');
    val.className = 'medium-detail-col-value';
    val.textContent = m[key];
    row.appendChild(lbl);
    row.appendChild(val);
    bodyEl.appendChild(row);
  });
}

// Populate the compare dropdown (all mediums, grouped)
function populateCompareSelect() {
  // Keep the placeholder option
  while (mediumCompareSelect.options.length > 1) mediumCompareSelect.remove(1);
  const cats = [...new Set(ART_MEDIUMS.map(m => m.category))];
  cats.forEach(cat => {
    const grp = document.createElement('optgroup');
    grp.label = cat;
    ART_MEDIUMS.filter(m => m.category === cat).forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.name;
      opt.textContent = m.name;
      grp.appendChild(opt);
    });
    mediumCompareSelect.appendChild(grp);
  });
}

function openComparePanel() {
  populateCompareSelect();
  mediumCompareSelect.value = '';
  mediumCompareBody.innerHTML = '<p class="medium-compare-empty">Select a medium above to see its details side by side.</p>';
  mediumComparePanel.style.display = 'flex';
  // Adjust detail modal border-radius to join seamlessly
  document.getElementById('mediumDetailModal').style.borderRadius = '0 var(--radius-md) var(--radius-md) 0';
  // Trigger slide-in by adding active class on next frame
  requestAnimationFrame(() => mediumComparePanel.classList.add('medium-compare-panel--open'));
}

function closeComparePanel() {
  mediumComparePanel.classList.remove('medium-compare-panel--open');
  document.getElementById('mediumDetailModal').style.borderRadius = '';
  setTimeout(() => {
    mediumComparePanel.style.display = 'none';
  }, 280); // match transition duration
}

function openMediumDetail(mediumName) {
  const m = getMedium(mediumName);
  if (!m) return;

  mediumDetailTitle.textContent = m.name;
  populateMediumDetailBody(mediumDetailBody, m);
  mediumCompareOpenBtn.style.display = 'inline-flex';

  // Close compare panel when opening a fresh detail
  mediumComparePanel.classList.remove('medium-compare-panel--open');
  mediumComparePanel.style.display = 'none';

  mediumDetailOverlay.style.display = 'flex';
}

// Compare open/close
mediumCompareOpenBtn.addEventListener('click', openComparePanel);
mediumCompareClose.addEventListener('click', closeComparePanel);

// Compare select change → populate compare body
mediumCompareSelect.addEventListener('change', () => {
  const name = mediumCompareSelect.value;
  if (!name) {
    mediumCompareBody.innerHTML = '<p class="medium-compare-empty">Select a medium above to see its details side by side.</p>';
    return;
  }
  const m = getMedium(name);
  if (m) populateMediumDetailBody(mediumCompareBody, m);
});

mediumDetailClose.addEventListener('click', () => {
  closeComparePanel();
  mediumDetailOverlay.style.display = 'none';
});
mediumDetailOverlay.addEventListener('click', e => {
  // Close if clicking the overlay backdrop or the row wrapper (not the panels)
  const row = mediumDetailOverlay.querySelector('.medium-detail-modal-row');
  if (e.target === mediumDetailOverlay || e.target === row) {
    closeComparePanel();
    mediumDetailOverlay.style.display = 'none';
  }
});

// ─── EXPORT / IMPORT JSON ─────────────────────────────────────
function buildConceptJson() {
  const out = {};
  state.forEach(catState => {
    const def = getDef(catState.defId);
    const vals = catState.selections.filter(Boolean);
    if (vals.length) out[def.id] = vals.length === 1 ? vals[0] : vals;
  });
  return out;
}

function loadConceptJson(json) {
  if (typeof json !== 'object' || Array.isArray(json)) return;
  state.forEach(catState => {
    const def = getDef(catState.defId);
    const raw = json[def.id];
    if (raw === undefined) { catState.selections = [null]; return; }
    const vals = Array.isArray(raw) ? raw : [raw];
    catState.selections = vals.length ? vals : [null];
  });
  renderGenerator();
  updatePreview();
}

downloadJsonBtn.addEventListener('click', () => {
  const data = buildConceptJson();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'art-concept.json';
  a.click();
  URL.revokeObjectURL(url);
});

randomiseAllBtn.addEventListener('click', randomiseAll);

// ─── INIT ─────────────────────────────────────────────────────
renderGenerator();
updatePreview();

// ─── EXPOSE for external use (e.g. page settings) ─────────────
window._artConcept = {
  buildJson: buildConceptJson,
  loadJson: loadConceptJson,
  getMedium,
  COLOURS,
  ART_MEDIUMS,
  THEMES,
  GENRES,
  STYLES,
  TIMER_PRESETS,
  CATEGORY_DEFS,
};

// ═══════════════════════════════════════════════════════════
//  BRUSH SHAPE REFERENCE
// ═══════════════════════════════════════════════════════════

// ── Canonical unique shapes, with a friendly display name and
//    a draw function that renders onto a 1080×1080 canvas. ──

const BRUSH_SHAPES = [
  {
    id: 'round',
    label: 'Round',
    desc: 'Classic round bristle tip — most common all-purpose brush shape.',
    mediums: [],
    draw(ctx, W, H) {
      const cx = W/2, cy = H/2;
      const rx = W * 0.18, ry = H * 0.28;
      // Body
      ctx.beginPath();
      ctx.ellipse(cx, cy + H*0.04, rx, ry, 0, 0, Math.PI*2);
      ctx.fill();
      // Ferrule
      drawFerrule(ctx, cx, cy + H*0.04 - ry + H*0.06, W*0.13, H*0.09);
      // Handle
      drawHandle(ctx, cx, cy + H*0.04 - ry + H*0.04 - H*0.09, H*0.32);
      // Tip highlight
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(cx - rx*0.28, cy + H*0.04 + ry - H*0.08, rx*0.32, H*0.06, -0.3, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  },
  {
    id: 'round-tiny',
    label: 'Round (Tiny)',
    desc: 'Needle-fine round tip for precision line work and detail.',
    mediums: [],
    draw(ctx, W, H) {
      const cx = W/2, cy = H/2;
      const rx = W * 0.045, ry = H * 0.30;
      ctx.beginPath();
      ctx.ellipse(cx, cy + H*0.05, rx, ry, 0, 0, Math.PI*2);
      ctx.fill();
      drawFerrule(ctx, cx, cy + H*0.05 - ry + H*0.05, W*0.10, H*0.08);
      drawHandle(ctx, cx, cy + H*0.05 - ry + H*0.03 - H*0.08, H*0.33);
    }
  },
  {
    id: 'flat',
    label: 'Flat / Broad',
    desc: 'Flat wide head for bold strokes, washes, and geometric marks.',
    mediums: [],
    draw(ctx, W, H) {
      const cx = W/2, cy = H/2;
      const bw = W*0.36, bh = H*0.22, by = cy + H*0.08;
      // Bristle head
      roundRect(ctx, cx - bw/2, by - bh/2, bw, bh, W*0.025);
      ctx.fill();
      // Bristle texture lines
      ctx.save();
      ctx.globalAlpha = 0.13;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = W*0.006;
      for (let i = 1; i < 6; i++) {
        const x = cx - bw/2 + bw*(i/6);
        ctx.beginPath(); ctx.moveTo(x, by - bh/2 + 4); ctx.lineTo(x, by + bh/2 - 4); ctx.stroke();
      }
      ctx.restore();
      drawFerrule(ctx, cx, by - bh/2 - H*0.025, W*0.18, H*0.06);
      drawHandle(ctx, cx, by - bh/2 - H*0.025 - H*0.06, H*0.30);
    }
  },
  {
    id: 'flat-angled',
    label: 'Flat / Angled',
    desc: 'Angled flat bristles for calligraphic strokes and cut-in edges.',
    mediums: [],
    draw(ctx, W, H) {
      const cx = W/2, cy = H/2;
      const bw = W*0.34, bh = H*0.20, by = cy + H*0.08;
      ctx.save();
      ctx.translate(cx, by);
      ctx.rotate(0.18);
      roundRect(ctx, -bw/2, -bh/2, bw, bh, W*0.02);
      ctx.fill();
      ctx.restore();
      drawFerrule(ctx, cx, by - bh/2 - H*0.02, W*0.17, H*0.06);
      drawHandle(ctx, cx, by - bh/2 - H*0.02 - H*0.06, H*0.30);
    }
  },
  {
    id: 'round-flat',
    label: 'Round / Flat',
    desc: 'Versatile shape — flat body with a rounded tip edge.',
    mediums: [],
    draw(ctx, W, H) {
      const cx = W/2, cy = H/2;
      const bw = W*0.26, bh = H*0.24, by = cy + H*0.07;
      // Body with rounded bottom only
      ctx.beginPath();
      ctx.moveTo(cx - bw/2, by - bh/2);
      ctx.lineTo(cx + bw/2, by - bh/2);
      ctx.lineTo(cx + bw/2, by + bh/2 - bw/2);
      ctx.arc(cx, by + bh/2 - bw/2, bw/2, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      drawFerrule(ctx, cx, by - bh/2 - H*0.02, W*0.155, H*0.065);
      drawHandle(ctx, cx, by - bh/2 - H*0.02 - H*0.065, H*0.30);
    }
  },
  {
    id: 'fan',
    label: 'Fan',
    desc: 'Spread fan of bristles for texturing, blending, and foliage.',
    mediums: [],
    draw(ctx, W, H) {
      const cx = W/2, cy = H/2 + H*0.05;
      const r = H * 0.24, spread = Math.PI * 0.72;
      const start = -Math.PI/2 - spread/2, end = -Math.PI/2 + spread/2;
      // Fan arc
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fill();
      // Bristle gaps
      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = W * 0.008;
      for (let i = 1; i < 8; i++) {
        const a = start + (spread * i/8);
        ctx.beginPath();
        ctx.moveTo(cx + 8, cy);
        ctx.lineTo(cx + Math.cos(a)*r, cy + Math.sin(a)*r);
        ctx.stroke();
      }
      ctx.restore();
      drawFerrule(ctx, cx, cy - H*0.04, W*0.10, H*0.065);
      drawHandle(ctx, cx, cy - H*0.04 - H*0.065, H*0.30);
    }
  },
  {
    id: 'filbert',
    label: 'Filbert',
    desc: 'Oval flat with rounded tip — great for blending and petal strokes.',
    mediums: [],
    draw(ctx, W, H) {
      const cx = W/2, cy = H/2;
      const bw = W*0.22, bh = H*0.26, by = cy + H*0.07;
      ctx.beginPath();
      ctx.ellipse(cx, by, bw/2, bh/2, 0, 0, Math.PI*2);
      ctx.fill();
      drawFerrule(ctx, cx, by - bh/2 - H*0.015, W*0.15, H*0.065);
      drawHandle(ctx, cx, by - bh/2 - H*0.015 - H*0.065, H*0.30);
    }
  },
  {
    id: 'pointed-oval',
    label: 'Pointed Oval',
    desc: 'Oval body tapering to a pointed tip — used by quill pens.',
    mediums: [],
    draw(ctx, W, H) {
      const cx = W/2, cy = H/2 + H*0.04;
      const rx = W*0.12, ry = H*0.26;
      // Pointed tip at bottom
      ctx.beginPath();
      ctx.moveTo(cx, cy + ry);
      ctx.bezierCurveTo(cx + rx*0.6, cy + ry*0.4, cx + rx, cy - ry*0.3, cx + rx*0.2, cy - ry);
      ctx.bezierCurveTo(cx, cy - ry*1.05, cx, cy - ry*1.05, cx - rx*0.2, cy - ry);
      ctx.bezierCurveTo(cx - rx, cy - ry*0.3, cx - rx*0.6, cy + ry*0.4, cx, cy + ry);
      ctx.fill();
      drawFerrule(ctx, cx, cy - ry - H*0.01, W*0.10, H*0.06);
      drawHandle(ctx, cx, cy - ry - H*0.01 - H*0.06, H*0.28);
    }
  },
  {
    id: 'round-tapered',
    label: 'Round / Tapered',
    desc: 'Round base tapering to a fine point — for calligraphy brush pens.',
    mediums: [],
    draw(ctx, W, H) {
      const cx = W/2, cy = H/2 + H*0.05;
      const bw = W*0.16, tipY = cy + H*0.28, baseY = cy - H*0.10;
      ctx.beginPath();
      ctx.moveTo(cx, tipY);
      ctx.bezierCurveTo(cx + bw*0.3, cy + H*0.1, cx + bw/2, baseY + H*0.06, cx + bw/2, baseY);
      ctx.arc(cx, baseY, bw/2, 0, Math.PI, true);
      ctx.bezierCurveTo(cx - bw/2, baseY + H*0.06, cx - bw*0.3, cy + H*0.1, cx, tipY);
      ctx.fill();
      drawFerrule(ctx, cx, baseY - H*0.025, W*0.12, H*0.06);
      drawHandle(ctx, cx, baseY - H*0.025 - H*0.06, H*0.28);
    }
  },
  {
    id: 'round-blunt',
    label: 'Round / Blunt',
    desc: 'Rounded head with a blunt flat bottom — oil pastels and chunky media.',
    mediums: [],
    draw(ctx, W, H) {
      const cx = W/2, cy = H/2 + H*0.04;
      const rx = W*0.17, ry = H*0.21;
      // Flat bottom, domed top
      ctx.beginPath();
      ctx.arc(cx, cy - ry*0.3, rx, Math.PI, 0);
      ctx.lineTo(cx + rx, cy + ry*0.7);
      ctx.arc(cx, cy + ry*0.7, rx, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      // No ferrule/handle — this is a pastel/crayon body shape
      // Flat bottom edge highlight
      ctx.save();
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(cx, cy + ry*0.7, rx*0.8, H*0.018, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  },
  {
    id: 'square',
    label: 'Square',
    desc: 'Square-tipped tool — conté crayons, square brushes.',
    mediums: [],
    draw(ctx, W, H) {
      const cx = W/2, cy = H/2 + H*0.04;
      const s = W * 0.26;
      roundRect(ctx, cx - s/2, cy - s*0.9, s, s*1.8, W*0.015);
      ctx.fill();
      ctx.save();
      ctx.globalAlpha = 0.13;
      ctx.fillStyle = '#fff';
      roundRect(ctx, cx - s/2 + s*0.08, cy - s*0.9 + s*0.08, s*0.28, s*1.6, W*0.01);
      ctx.fill();
      ctx.restore();
    }
  },
  {
    id: 'square-chisel',
    label: 'Square / Chisel',
    desc: 'Flat chisel end — reed pens, bamboo pens, broad-edge tools.',
    mediums: [],
    draw(ctx, W, H) {
      const cx = W/2, cy = H/2 + H*0.04;
      const bw = W*0.30, bh = H*0.07;
      const bodyH = H * 0.32;
      // Body (shaft)
      roundRect(ctx, cx - bw*0.18, cy - bodyH/2, bw*0.36, bodyH, W*0.012);
      ctx.fill();
      // Chisel tip
      ctx.beginPath();
      ctx.rect(cx - bw/2, cy + bodyH/2 - H*0.01, bw, bh);
      ctx.fill();
      ctx.save();
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.rect(cx - bw*0.5 + 2, cy + bodyH/2, bw*0.35, bh - 2);
      ctx.fill();
      ctx.restore();
    }
  },
  {
    id: 'triangle',
    label: 'Triangle / Round Tip',
    desc: 'Triangular body (like a wax crayon) with a rounded tip.',
    mediums: [],
    draw(ctx, W, H) {
      const cx = W/2, cy = H/2 + H*0.06;
      const r = W * 0.20, h = H * 0.52;
      // Triangular prism — 3 faces visible
      const top = cy - h/2;
      const bot = cy + h/2;
      // Front face
      ctx.beginPath();
      ctx.moveTo(cx - r, top + r*0.3);
      ctx.lineTo(cx + r, top + r*0.3);
      ctx.lineTo(cx + r*0.6, bot);
      ctx.arc(cx, bot, r*0.6, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      // Edge highlight
      ctx.save();
      ctx.globalAlpha = 0.17;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(cx - r*0.05, top + r*0.3);
      ctx.lineTo(cx + r*0.05, top + r*0.3);
      ctx.lineTo(cx + r*0.05, bot - r*0.3);
      ctx.lineTo(cx - r*0.05, bot - r*0.3);
      ctx.fill();
      ctx.restore();
    }
  },
  {
    id: 'round-irregular',
    label: 'Round / Irregular',
    desc: 'Rough, uneven bristle edges — charcoal sticks and expressive media.',
    mediums: [],
    draw(ctx, W, H) {
      const cx = W/2, cy = H/2 + H*0.04;
      const rx = W*0.20, ry = H*0.28;
      // Irregular blob
      ctx.beginPath();
      const pts = 18;
      for (let i = 0; i <= pts; i++) {
        const a = (i / pts) * Math.PI * 2;
        const jitter = 0.78 + 0.22 * Math.sin(i * 3.7 + 1.2) * Math.cos(i * 2.1);
        const x = cx + Math.cos(a) * rx * jitter;
        const y = cy + Math.sin(a) * ry * jitter;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      drawFerrule(ctx, cx, cy - ry - H*0.01, W*0.14, H*0.07);
      drawHandle(ctx, cx, cy - ry - H*0.01 - H*0.07, H*0.28);
    }
  },
  {
    id: 'round-formless',
    label: 'Round / Formless',
    desc: 'Free-form application — graphite powder, sponge, or broad tools.',
    mediums: [],
    draw(ctx, W, H) {
      const cx = W/2, cy = H/2 + H*0.05;
      // Diffuse cloud-like shape
      const blobs = [
        [cx, cy, W*0.22, H*0.20, 1.0],
        [cx + W*0.12, cy - H*0.06, W*0.16, H*0.15, 0.7],
        [cx - W*0.13, cy - H*0.04, W*0.15, H*0.14, 0.7],
        [cx + W*0.08, cy + H*0.10, W*0.17, H*0.13, 0.65],
        [cx - W*0.10, cy + H*0.09, W*0.14, H*0.12, 0.6],
      ];
      blobs.forEach(([bx, by, brx, bry, a]) => {
        ctx.save();
        ctx.globalAlpha = a * 0.82;
        ctx.beginPath();
        ctx.ellipse(bx, by, brx, bry, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
      });
    }
  },
  {
    id: 'round-soft-cloud',
    label: 'Round (Soft Cloud)',
    desc: 'Airbrushed soft-edged spray — feathered circular falloff.',
    mediums: [],
    draw(ctx, W, H) {
      const cx = W/2, cy = H/2 + H*0.03;
      const r = W * 0.28;
      // Radial gradient falloff
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      // Use the current fill colour from ctx
      const col = ctx.fillStyle;
      grd.addColorStop(0,   col);
      grd.addColorStop(0.4, col);
      grd.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.save();
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  },
];

// ── Utility draw helpers ──────────────────────────────────────

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawFerrule(ctx, cx, cy, w, h) {
  if (ctx._noHandleParts) return;
  ctx.save();
  ctx.fillStyle = ctx._ferruleCol || '#8a8680';
  roundRect(ctx, cx - w/2, cy - h/2, w, h, 2);
  ctx.fill();
  // Highlight strip
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#fff';
  roundRect(ctx, cx - w/2 + w*0.1, cy - h/2 + 2, w*0.25, h - 4, 1);
  ctx.fill();
  ctx.restore();
}

function drawHandle(ctx, cx, tipY, length) {
  if (ctx._noHandleParts) return;
  ctx.save();
  ctx.fillStyle = ctx._handleCol || '#c8a96a';
  const hw = ctx._handleW || 14;
  roundRect(ctx, cx - hw/2, tipY - length, hw, length, hw/2);
  ctx.fill();
  // Grain highlight
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#fff';
  roundRect(ctx, cx - hw/2 + hw*0.15, tipY - length + 6, hw*0.22, length - 12, hw*0.1);
  ctx.fill();
  ctx.restore();
}

// ── Find the bounding box of visible pixels in an ImageData ──
function getPixelBounds(data, W, H, threshold = 10) {
  let x1 = W, y1 = H, x2 = 0, y2 = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] > threshold) {
        if (x < x1) x1 = x;
        if (x > x2) x2 = x;
        if (y < y1) y1 = y;
        if (y > y2) y2 = y;
      }
    }
  }
  return x1 <= x2 && y1 <= y2 ? { x1, y1, x2, y2 } : null;
}

// ── Render a shape onto a canvas ─────────────────────────────
function drawBrushShape(canvas, shape, opts = {}) {
  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext('2d');
  const isDark = opts.dark ?? (document.documentElement.dataset.theme === 'dark');
  const isSilhouette = opts.silhouette === true;
  const isUnified    = opts.unified === true;

  // Background
  ctx.clearRect(0, 0, W, H);
  if (!isSilhouette && opts.bg !== false) {
    ctx.fillStyle = isDark ? '#1e1c19' : '#f7f5f2';
    ctx.fillRect(0, 0, W, H);
  }

  // Brush colour — white for silhouette export, themed otherwise
  const brushColour = isSilhouette ? '#ffffff' : (isDark ? '#edeae3' : '#1a1814');

  // ── Draw shape onto a temp canvas so we can measure and center it ──
  const tmp = document.createElement('canvas');
  tmp.width = W; tmp.height = H;
  const tc = tmp.getContext('2d');
  tc.fillStyle = brushColour;
  tc.strokeStyle = brushColour;
  tc._ferruleCol    = brushColour; // unused (noHandleParts), kept for safety
  tc._handleCol     = brushColour;
  tc._handleW       = Math.round(W * 0.013);
  tc._noHandleParts = true;
  shape.draw(tc, W, H);

  // Measure bounding box of drawn pixels
  const bounds = getPixelBounds(tc.getImageData(0, 0, W, H).data, W, H);
  if (bounds) {
    const { x1, y1, x2, y2 } = bounds;
    const shapeW = x2 - x1 + 1;
    const shapeH = y2 - y1 + 1;
    // Offset so the shape's bounding box is centered in the canvas
    const dx = Math.round((W - shapeW) / 2) - x1;
    const dy = Math.round((H - shapeH) / 2) - y1;
    ctx.drawImage(tmp, dx, dy);
  } else {
    ctx.drawImage(tmp, 0, 0);
  }

  // Label — omitted in silhouette mode
  if (!isSilhouette && opts.label !== false) {
    const fontSize = Math.round(W * 0.032);
    ctx.font = `300 ${fontSize}px 'DM Sans', 'Helvetica Neue', sans-serif`;
    ctx.fillStyle = isDark ? '#5a5650' : '#a09c95';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(shape.label, W/2, H - Math.round(H * 0.04));
  }
}

// ── Build a preview thumbnail (small canvas shown in the grid) ─
function buildShapeThumbnail(shape) {
  const SIZE = 140;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  canvas.className = 'brush-thumb-canvas';
  drawBrushShape(canvas, shape, { label: false, unified: true });
  return canvas;
}

// ── Download 1080×1080 PNG (white silhouette on transparent background) ──
function downloadShapePng(shape) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1080;
  drawBrushShape(canvas, shape, { silhouette: true });
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brush-shape-${shape.id}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

// ── Build the full Brush Shape Reference section ──────────────
function buildBrushShapeSection() {
  const section = document.createElement('section');
  section.className = 'brush-shape-section';
  section.id = 'brushShapeSection';

  // ── Header ──
  const hdr = document.createElement('div');
  hdr.className = 'brush-shape-header';

  const titleWrap = document.createElement('div');
  const title = document.createElement('h2');
  title.className = 'brush-shape-title';
  title.textContent = 'Brush Shape Reference';
  const sub = document.createElement('p');
  sub.className = 'brush-shape-sub';
  sub.textContent = `${BRUSH_SHAPES.length} unique shapes — click any card to download a 1080 × 1080 PNG`;
  titleWrap.appendChild(title);
  titleWrap.appendChild(sub);

  const dlAllBtn = document.createElement('button');
  dlAllBtn.className = 'panel-btn sm brush-dl-all-btn';
  dlAllBtn.innerHTML = '<svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M8 2v9M5 8l3 3 3-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 13h12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg> Download All';
  dlAllBtn.title = 'Download all shapes as PNGs';
  dlAllBtn.addEventListener('click', () => {
    BRUSH_SHAPES.forEach((shape, i) => {
      setTimeout(() => downloadShapePng(shape), i * 120);
    });
  });

  hdr.appendChild(titleWrap);
  hdr.appendChild(dlAllBtn);
  section.appendChild(hdr);

  // ── Grid ──
  const grid = document.createElement('div');
  grid.className = 'brush-shape-grid';
  grid.id = 'brushShapeGrid';

  BRUSH_SHAPES.forEach(shape => {
    const card = document.createElement('div');
    card.className = 'brush-shape-card';
    card.title = `Download ${shape.label}`;

    const thumb = buildShapeThumbnail(shape);
    card.appendChild(thumb);

    const info = document.createElement('div');
    info.className = 'brush-shape-card-info';

    const lbl = document.createElement('div');
    lbl.className = 'brush-shape-card-label';
    lbl.textContent = shape.label;

    const dlIcon = document.createElement('div');
    dlIcon.className = 'brush-shape-dl-icon';
    dlIcon.innerHTML = '<svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M8 2v9M5 8l3 3 3-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 13h12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';

    info.appendChild(lbl);
    info.appendChild(dlIcon);
    card.appendChild(info);

    card.addEventListener('click', () => downloadShapePng(shape));
    grid.appendChild(card);
  });

  section.appendChild(grid);

  // ── Divider ──
  const div = document.createElement('div');
  div.className = 'brush-shape-divider';
  section.appendChild(div);

  // ── Brush Chooser ──
  const chooserWrap = document.createElement('div');
  chooserWrap.className = 'brush-chooser-wrap';

  const chooserHdr = document.createElement('div');
  chooserHdr.className = 'brush-chooser-header';

  const chooserTitle = document.createElement('span');
  chooserTitle.className = 'brush-chooser-title';
  chooserTitle.textContent = 'Brush Inspector';

  const chooserActions = document.createElement('div');
  chooserActions.className = 'brush-chooser-actions';

  // Medium select
  const medSel = document.createElement('select');
  medSel.className = 'brush-medium-select';
  const blankOpt = document.createElement('option');
  blankOpt.value = ''; blankOpt.textContent = '— choose a medium —';
  medSel.appendChild(blankOpt);

  // Group by category
  const cats = [...new Set(ART_MEDIUMS.map(m => m.category))];
  cats.forEach(cat => {
    const grp = document.createElement('optgroup');
    grp.label = cat;
    ART_MEDIUMS.filter(m => m.category === cat).forEach(m => {
      const o = document.createElement('option');
      o.value = m.name; o.textContent = m.name;
      grp.appendChild(o);
    });
    medSel.appendChild(grp);
  });

  // Copy btn — left of dropdown
  const chooserCopyBtn = document.createElement('button');
  chooserCopyBtn.className = 'panel-btn sm chooser-copy-btn';
  chooserCopyBtn.title = 'Copy brush shape name';
  chooserCopyBtn.style.display = 'none';
  chooserCopyBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
    <path d="M3 11H2.5A1.5 1.5 0 0 1 1 9.5v-7A1.5 1.5 0 0 1 2.5 1h7A1.5 1.5 0 0 1 11 2.5V3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
  </svg>`;

  chooserCopyBtn.addEventListener('click', () => {
    const text = currentChooserMedium
      ? `${currentChooserMedium.name} — ${currentChooserMedium.brushShape}`
      : '';
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      chooserCopyBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2.5 8.5L6 12L13.5 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
      chooserCopyBtn.classList.add('copied');
      setTimeout(() => {
        chooserCopyBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
          <path d="M3 11H2.5A1.5 1.5 0 0 1 1 9.5v-7A1.5 1.5 0 0 1 2.5 1h7A1.5 1.5 0 0 1 11 2.5V3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>`;
        chooserCopyBtn.classList.remove('copied');
      }, 1500);
    });
  });

  // Download btn for chooser
  const chooserDlBtn = document.createElement('button');
  chooserDlBtn.className = 'panel-btn sm';
  chooserDlBtn.innerHTML = '<svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M8 2v9M5 8l3 3 3-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 13h12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg> PNG';
  chooserDlBtn.title = 'Download this shape as PNG';
  chooserDlBtn.style.display = 'none';

  // Info (+) button — same as medium-info-btn
  const chooserInfoBtn = document.createElement('button');
  chooserInfoBtn.className = 'medium-info-btn';
  chooserInfoBtn.textContent = '+';
  chooserInfoBtn.title = 'View medium details';
  chooserInfoBtn.style.display = 'none';

  chooserActions.appendChild(chooserCopyBtn);
  chooserActions.appendChild(medSel);
  chooserActions.appendChild(chooserInfoBtn);
  chooserActions.appendChild(chooserDlBtn);
  chooserHdr.appendChild(chooserTitle);
  chooserHdr.appendChild(chooserActions);
  chooserWrap.appendChild(chooserHdr);

  // Preview canvas area
  const previewWrap = document.createElement('div');
  previewWrap.className = 'brush-chooser-preview';
  previewWrap.id = 'brushChooserPreview';

  const emptyMsg = document.createElement('p');
  emptyMsg.className = 'brush-chooser-empty';
  emptyMsg.textContent = 'Select a medium above to preview its brush shape';
  previewWrap.appendChild(emptyMsg);

  const chooserCanvas = document.createElement('canvas');
  chooserCanvas.className = 'brush-chooser-canvas';
  chooserCanvas.width = chooserCanvas.height = 400;
  chooserCanvas.style.display = 'none';
  previewWrap.appendChild(chooserCanvas);

  // Shape name + desc below canvas
  const chooserMeta = document.createElement('div');
  chooserMeta.className = 'brush-chooser-meta';
  chooserMeta.style.display = 'none';

  const chooserShapeName = document.createElement('div');
  chooserShapeName.className = 'brush-chooser-shape-name';

  const chooserShapeDesc = document.createElement('div');
  chooserShapeDesc.className = 'brush-chooser-shape-desc';

  chooserMeta.appendChild(chooserShapeName);
  chooserMeta.appendChild(chooserShapeDesc);
  previewWrap.appendChild(chooserMeta);
  chooserWrap.appendChild(previewWrap);
  section.appendChild(chooserWrap);

  // ── Medium select handler ──
  let currentChooserMedium = null;
  let currentChooserShape = null;

  medSel.addEventListener('change', () => {
    const medName = medSel.value;
    if (!medName) {
      emptyMsg.style.display = '';
      chooserCanvas.style.display = 'none';
      chooserMeta.style.display = 'none';
      chooserDlBtn.style.display = 'none';
      chooserInfoBtn.style.display = 'none';
      chooserCopyBtn.style.display = 'none';
      currentChooserMedium = null;
      return;
    }
    const med = getMedium(medName);
    currentChooserMedium = med;

    // Find best matching shape
    const shape = resolveShapeForMedium(med);
    currentChooserShape = shape;

    emptyMsg.style.display = 'none';
    chooserCanvas.style.display = 'block';
    chooserMeta.style.display = 'flex';
    chooserDlBtn.style.display = '';
    chooserInfoBtn.style.display = '';
    chooserCopyBtn.style.display = '';

    drawBrushShape(chooserCanvas, shape, { label: false, unified: true });
    chooserShapeName.textContent = shape.label;
    chooserShapeDesc.textContent = med.brushShape + (shape.desc ? ' — ' + shape.desc : '');

    chooserDlBtn.onclick = () => {
      const canvas1080 = document.createElement('canvas');
      canvas1080.width = canvas1080.height = 1080;
      drawBrushShape(canvas1080, shape, { silhouette: true });
      canvas1080.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `brush-shape-${medName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    };

    chooserInfoBtn.onclick = () => openMediumDetail(medName);
  });

  // Re-render on theme change
  const themeBtn = document.getElementById('themeBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      // Small delay so data-theme has updated
      setTimeout(() => {
        refreshAllThumbnails(grid);
        if (chooserCanvas.style.display !== 'none' && currentChooserShape) {
          drawBrushShape(chooserCanvas, currentChooserShape, { label: false, unified: true });
        }
      }, 30);
    });
  }

  return section;
}

// Map a medium's brushShape string to the closest BRUSH_SHAPES entry
function resolveShapeForMedium(med) {
  const raw = (med.brushShape || '').toLowerCase();

  if (raw.includes('soft cloud') || raw.includes('cloud'))        return findShape('round-soft-cloud');
  if (raw.includes('fan'))                                         return findShape('fan');
  if (raw.includes('filbert'))                                     return findShape('filbert');
  if (raw.includes('tapered'))                                     return findShape('round-tapered');
  if (raw.includes('pointed oval'))                                return findShape('pointed-oval');
  if (raw.includes('irregular'))                                   return findShape('round-irregular');
  if (raw.includes('formless'))                                    return findShape('round-formless');
  if (raw.includes('blunt'))                                       return findShape('round-blunt');
  if (raw.includes('triangle'))                                    return findShape('triangle');
  if (raw.includes('chisel') || raw.includes('square / chisel'))  return findShape('square-chisel');
  if (raw.includes('square / flat') || raw.includes('flat rect')) return findShape('flat-angled');
  if (raw.includes('square'))                                      return findShape('square');
  if (raw.includes('angled'))                                      return findShape('flat-angled');
  if (raw.includes('flat / broad') || raw.includes('flat / round') || raw.includes('round / flat / fan / filbert')) return findShape('fan');
  if (raw.includes('round / flat / fan'))                         return findShape('fan');
  if (raw.includes('round / flat'))                               return findShape('round-flat');
  if (raw.includes('flat'))                                        return findShape('flat');
  if (raw.includes('tiny'))                                        return findShape('round-tiny');
  if (raw.includes('round / pointed'))                            return findShape('pointed-oval');
  if (raw.includes('round'))                                       return findShape('round');

  return findShape('round');
}

function findShape(id) {
  return BRUSH_SHAPES.find(s => s.id === id) || BRUSH_SHAPES[0];
}

function refreshAllThumbnails(grid) {
  const cards = grid.querySelectorAll('.brush-shape-card');
  cards.forEach((card, i) => {
    const shape = BRUSH_SHAPES[i];
    if (!shape) return;
    const existing = card.querySelector('.brush-thumb-canvas');
    const fresh = buildShapeThumbnail(shape);
    if (existing) card.replaceChild(fresh, existing);
  });
}

// ── Mount the section below the generator layout ──────────────
document.addEventListener('DOMContentLoaded', () => {
  const section = buildBrushShapeSection();
  document.querySelector('main.concept-main')?.after(section);
});

