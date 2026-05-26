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
let state = CATEGORY_DEFS.map(def => ({ defId: def.id, selections: [null], frozen: false }));

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

    const freezeBtn = document.createElement('button');
    freezeBtn.className = 'cat-freeze-btn' + (catState.frozen ? ' is-frozen' : '');
    freezeBtn.title = catState.frozen ? 'Unfreeze — allow randomising' : 'Freeze — exclude from randomise';
    freezeBtn.setAttribute('aria-pressed', String(catState.frozen));
    freezeBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M8 1v14M1 8h14M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="8" cy="8" r="1.8" fill="currentColor"/></svg>';
    freezeBtn.addEventListener('click', () => {
      state[catIdx].frozen = !state[catIdx].frozen;
      renderGenerator();
    });

    if (catState.frozen) block.classList.add('is-frozen');

    const addBtn = document.createElement('button');
    addBtn.className = 'cat-add-btn';
    addBtn.innerHTML = '<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg> Add';
    addBtn.title = 'Add another ' + def.label;
    addBtn.addEventListener('click', () => addSelection(catIdx));

    actions.appendChild(randomBtn);
    actions.appendChild(freezeBtn);
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
  if (state[catIdx].frozen) return;
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
    if (catState.frozen) return;
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
function openMediumDetail(mediumName) {
  const m = getMedium(mediumName);
  if (!m) return;

  mediumDetailTitle.textContent = m.name;
  mediumDetailBody.innerHTML = '';

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
    mediumDetailBody.appendChild(row);
  });

  // Category badge
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
  mediumDetailBody.prepend(catRow);

  mediumDetailOverlay.style.display = 'flex';
}

mediumDetailClose.addEventListener('click', () => { mediumDetailOverlay.style.display = 'none'; });
mediumDetailOverlay.addEventListener('click', e => { if (e.target === mediumDetailOverlay) mediumDetailOverlay.style.display = 'none'; });

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
