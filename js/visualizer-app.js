// Visualizer App - Canvas whiteboard with draggable & resizable reaction elements
// Pan: two-finger scroll / trackpad swipe = move canvas
// Resize: drag molecule edge handles
// Select: left-click drag on empty space = selection rectangle → copy/download
const VisualizerApp = {
  grouped: new Map(),
  allDOIs: [],
  currentDOI: null,
  canvas: null,
  elements: [],
  nextZIndex: 100,
  canvasOffset: { x: 0, y: 0 },
  scale: 1,

  // Pan state
  isPanning: false,
  panStart: { x: 0, y: 0 },

  // Selection state
  isSelecting: false,
  selRect: null,
  selStart: { x: 0, y: 0 },

  // Bond marking mode: null | 'formed' | 'broken'
  markMode: null,
  // Atom-based marking state
  _markFirstAtom: null,  // {atom, molBox, svgEl, abData}
  markHistory: [],        // undo stack: [{type, svgEl, overlayIds, box}]
  _markOverlayCounter: 0, // unique IDs for overlay SVG elements

  init(data) {
    this.canvas = document.getElementById('vizCanvas');
    this.groupData(data);
    this.renderDOIList();
    this.initCanvasControls();
    this._createSelectionOverlay();
  },

  // ─── Data Grouping ───
  groupData(data) {
    this.grouped.clear();
    for (const e of data) {
      const doi = e['Paper DOI'] || 'Unknown';
      if (!this.grouped.has(doi)) this.grouped.set(doi, []);
      this.grouped.get(doi).push(e);
    }
    for (const [, entries] of this.grouped) {
      entries.sort((a, b) => (parseInt(a['Step']) || 0) - (parseInt(b['Step']) || 0));
    }
    this.allDOIs = Array.from(this.grouped.keys()).sort();
  },

  // ─── DOI List ───
  renderDOIList(filter) {
    const list = document.getElementById('doiList');
    if (!list) return;
    list.innerHTML = '';
    const q = (filter || '').toLowerCase();
    const dois = q ? this.allDOIs.filter(d => d.toLowerCase().includes(q)) : this.allDOIs;
    if (!dois.length) {
      list.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:10px;text-align:center">No reactions found</div>';
      return;
    }
    for (const doi of dois) {
      const steps = this.grouped.get(doi);
      const el = document.createElement('div');
      el.className = 'viz-doi-item' + (doi === this.currentDOI ? ' active' : '');
      el.title = doi;
      const by = steps[0]['Entered By'] || '';
      el.innerHTML = `<div style="font-weight:600;white-space:normal;word-break:break-all;line-height:1.4;overflow-wrap:break-word">${doi}</div>
        <div class="doi-meta">${steps.length} step${steps.length > 1 ? 's' : ''} · ${by}</div>`;
      el.addEventListener('click', () => this.selectReaction(doi));
      list.appendChild(el);
    }
  },

  filterDOIs() {
    this.renderDOIList(document.getElementById('vizSearch').value);
  },

  // ═══════════════════════════════════════════
  //  Canvas Controls
  // ═══════════════════════════════════════════
  initCanvasControls() {
    if (!this.canvas) return;

    // ── Wheel / Trackpad: PAN (not zoom) ──
    // Two-finger swipe on trackpad sends wheel events with deltaX/deltaY
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      // Ctrl+wheel = pinch-to-zoom on trackpad → we use this for zoom
      if (e.ctrlKey || e.metaKey) {
        const oldScale = this.scale;
        const delta = e.deltaY > 0 ? -0.06 : 0.06;
        this.scale = Math.max(0.2, Math.min(3, this.scale + delta));
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const ratio = this.scale / oldScale;
        this.canvasOffset.x = mx - ratio * (mx - this.canvasOffset.x);
        this.canvasOffset.y = my - ratio * (my - this.canvasOffset.y);
      } else {
        // Normal scroll / two-finger swipe → PAN
        this.canvasOffset.x -= e.deltaX;
        this.canvasOffset.y -= e.deltaY;
      }
      this.applyCanvasTransform();
      this.updateZoomLabel();
    }, { passive: false });

    // ── Middle-click pan ──
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 1) { // middle click
        e.preventDefault();
        this._startPan(e);
        return;
      }

      const t = e.target;
      const isBg = (t === this.canvas || t.id === 'vizCanvasInner' || t.id === 'vizPlaceholder' || t.classList.contains('viz-canvas-placeholder'));

      if (e.button === 0 && isBg) {
        // Left-click on empty canvas → start selection rectangle
        if (e.shiftKey) {
          // Shift+click = pan
          this._startPan(e);
        } else {
          this._startSelection(e);
        }
      }
    });

    // ── Right-click context menu ──
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this._showContextMenu(e);
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPanning) {
        this.canvasOffset.x = e.clientX - this.panStart.x;
        this.canvasOffset.y = e.clientY - this.panStart.y;
        this.applyCanvasTransform();
      }
      if (this.isSelecting) {
        this._updateSelection(e);
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (this.isPanning) {
        this.isPanning = false;
        this.canvas.style.cursor = '';
      }
      if (this.isSelecting) {
        this._endSelection(e);
      }
    });
  },

  _startPan(e) {
    this.isPanning = true;
    this.panStart = { x: e.clientX - this.canvasOffset.x, y: e.clientY - this.canvasOffset.y };
    this.canvas.style.cursor = 'grabbing';
    e.preventDefault();
  },

  applyCanvasTransform() {
    const inner = document.getElementById('vizCanvasInner');
    if (inner) {
      inner.style.transform = `translate(${this.canvasOffset.x}px, ${this.canvasOffset.y}px) scale(${this.scale})`;
    }
  },

  updateZoomLabel() {
    const el = document.getElementById('zoomLabel');
    if (el) el.textContent = Math.round(this.scale * 100) + '%';
  },

  resetView() {
    this.scale = 1;
    this.canvasOffset = { x: 0, y: 0 };
    this.applyCanvasTransform();
    this.updateZoomLabel();
  },

  zoomIn()  { this.scale = Math.min(3, this.scale + 0.15); this.applyCanvasTransform(); this.updateZoomLabel(); },
  zoomOut() { this.scale = Math.max(0.2, this.scale - 0.15); this.applyCanvasTransform(); this.updateZoomLabel(); },

  fitToView() {
    if (!this.elements.length) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of this.elements) {
      const x = parseInt(el.style.left) || 0;
      const y = parseInt(el.style.top) || 0;
      const w = el.offsetWidth || 150;
      const h = el.offsetHeight || 150;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x + w > maxX) maxX = x + w;
      if (y + h > maxY) maxY = y + h;
    }
    const contentW = maxX - minX + 80;
    const contentH = maxY - minY + 80;
    const rect = this.canvas.getBoundingClientRect();
    this.scale = Math.min(rect.width / contentW, rect.height / contentH, 1.2);
    this.scale = Math.max(0.2, Math.min(2, this.scale));
    this.canvasOffset.x = (rect.width - contentW * this.scale) / 2 - minX * this.scale + 40;
    this.canvasOffset.y = (rect.height - contentH * this.scale) / 2 - minY * this.scale + 40;
    this.applyCanvasTransform();
    this.updateZoomLabel();
  },

  // ═══════════════════════════════════════════
  //  Selection Rectangle → Copy / Download
  // ═══════════════════════════════════════════
  _createSelectionOverlay() {
    // Selection rectangle element
    const sel = document.createElement('div');
    sel.id = 'selectionRect';
    sel.className = 'cv-selection-rect';
    sel.style.display = 'none';
    if (this.canvas) this.canvas.appendChild(sel);
    this.selRect = sel;

    // Floating action bar (copy / download)
    const bar = document.createElement('div');
    bar.id = 'selActionBar';
    bar.className = 'cv-sel-action-bar';
    bar.style.display = 'none';
    bar.innerHTML = `
      <button class="cv-sel-btn" id="selCopyBtn" title="Copy selection as image">📋 Copy</button>
      <button class="cv-sel-btn" id="selDownloadBtn" title="Download selection as PNG">💾 Download</button>
      <button class="cv-sel-btn cv-sel-btn-close" id="selCloseBtn" title="Cancel selection">✕</button>
    `;
    if (this.canvas) this.canvas.appendChild(bar);

    // Event listeners
    document.getElementById('selCopyBtn')?.addEventListener('click', () => this._captureSelection('copy'));
    document.getElementById('selDownloadBtn')?.addEventListener('click', () => this._captureSelection('download'));
    document.getElementById('selCloseBtn')?.addEventListener('click', () => this._clearSelection());
  },

  _startSelection(e) {
    this.isSelecting = true;
    const rect = this.canvas.getBoundingClientRect();
    this.selStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    this.selRect.style.display = 'block';
    this.selRect.style.left = this.selStart.x + 'px';
    this.selRect.style.top = this.selStart.y + 'px';
    this.selRect.style.width = '0px';
    this.selRect.style.height = '0px';
    document.getElementById('selActionBar').style.display = 'none';
    e.preventDefault();
  },

  _updateSelection(e) {
    const rect = this.canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const x = Math.min(this.selStart.x, cx);
    const y = Math.min(this.selStart.y, cy);
    const w = Math.abs(cx - this.selStart.x);
    const h = Math.abs(cy - this.selStart.y);
    this.selRect.style.left = x + 'px';
    this.selRect.style.top = y + 'px';
    this.selRect.style.width = w + 'px';
    this.selRect.style.height = h + 'px';
  },

  _endSelection(e) {
    this.isSelecting = false;
    const w = parseInt(this.selRect.style.width);
    const h = parseInt(this.selRect.style.height);
    if (w < 10 || h < 10) {
      // Too small, treat as a click → clear selection and just pan
      this._clearSelection();
      return;
    }
    // Show action bar near the selection
    const bar = document.getElementById('selActionBar');
    const selLeft = parseInt(this.selRect.style.left);
    const selTop = parseInt(this.selRect.style.top);
    bar.style.left = (selLeft + w / 2 - 80) + 'px';
    bar.style.top = (selTop + h + 8) + 'px';
    bar.style.display = 'flex';
  },

  _clearSelection() {
    this.selRect.style.display = 'none';
    document.getElementById('selActionBar').style.display = 'none';
  },

  async _captureSelection(mode) {
    const selX = parseInt(this.selRect.style.left);
    const selY = parseInt(this.selRect.style.top);
    const selW = parseInt(this.selRect.style.width);
    const selH = parseInt(this.selRect.style.height);

    // Use html2canvas if available, otherwise fall back to native canvas approach
    try {
      // Hide selection UI temporarily
      this.selRect.style.display = 'none';
      document.getElementById('selActionBar').style.display = 'none';

      // Try html2canvas first
      if (typeof html2canvas !== 'undefined') {
        const canvasEl = await html2canvas(this.canvas, {
          x: selX, y: selY, width: selW, height: selH,
          backgroundColor: '#f8f9fc',
          scale: 2, // high-res
          useCORS: true
        });
        await this._exportCanvas(canvasEl, mode);
      } else {
        // Fallback: native approach using SVG foreignObject
        await this._nativeCapture(selX, selY, selW, selH, mode);
      }
    } catch(err) {
      console.error('Capture failed:', err);
      toast('Capture failed. Try right-click → Download instead.', 'error');
    }
  },

  async _nativeCapture(sx, sy, sw, sh, mode) {
    // Create an offscreen canvas and render the visible area
    const dpr = 2; // 2x resolution for crisp images
    const offCanvas = document.createElement('canvas');
    offCanvas.width = sw * dpr;
    offCanvas.height = sh * dpr;
    const ctx = offCanvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#f8f9fc';
    ctx.fillRect(0, 0, sw, sh);

    // For each element, render it at the correct position
    const inner = document.getElementById('vizCanvasInner');
    if (!inner) return;

    // Convert the inner div to an SVG foreignObject image
    const svgData = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${sw}" height="${sh}">
        <foreignObject width="${sw}" height="${sh}">
          <div xmlns="http://www.w3.org/1999/xhtml" style="width:${sw}px;height:${sh}px;overflow:hidden;position:relative;">
            <div style="transform:translate(${this.canvasOffset.x - sx}px,${this.canvasOffset.y - sy}px) scale(${this.scale});transform-origin:0 0;">
              ${inner.outerHTML}
            </div>
          </div>
        </foreignObject>
      </svg>`;

    const img = new Image();
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    return new Promise((resolve, reject) => {
      img.onload = async () => {
        ctx.drawImage(img, 0, 0, sw, sh);
        URL.revokeObjectURL(url);
        await this._exportCanvas(offCanvas, mode);
        resolve();
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        // Final fallback: just capture what we can
        toast('Use browser screenshot (Cmd+Shift+4 / Win+Shift+S) for best results', 'info');
        reject(new Error('SVG render failed'));
      };
      img.src = url;
    });
  },

  async _exportCanvas(canvasEl, mode) {
    if (mode === 'copy') {
      try {
        const blob = await new Promise(r => canvasEl.toBlob(r, 'image/png'));
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        toast('Copied to clipboard! Paste in your document.', 'success');
      } catch(err) {
        // Clipboard API might not be available
        console.warn('Clipboard write failed:', err);
        // Fallback: download instead
        this._downloadCanvasAsPng(canvasEl);
        toast('Clipboard not available. Downloaded as PNG instead.', 'info');
      }
    } else {
      this._downloadCanvasAsPng(canvasEl);
    }
  },

  _downloadCanvasAsPng(canvasEl) {
    const link = document.createElement('a');
    link.download = `reaction_${this.currentDOI || 'export'}_${Date.now()}.png`;
    link.href = canvasEl.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('Image downloaded!', 'success');
  },

  // ─── Right-click context menu ───
  _showContextMenu(e) {
    // Remove any existing context menu
    const old = document.getElementById('cvContextMenu');
    if (old) old.remove();

    const menu = document.createElement('div');
    menu.id = 'cvContextMenu';
    menu.className = 'cv-context-menu';
    const rect = this.canvas.getBoundingClientRect();
    menu.style.left = (e.clientX - rect.left) + 'px';
    menu.style.top = (e.clientY - rect.top) + 'px';

    menu.innerHTML = `
      <div class="cv-ctx-item" data-action="download-all">💾 Download full view as PNG</div>
      <div class="cv-ctx-item" data-action="copy-all">📋 Copy full view to clipboard</div>
      <div class="cv-ctx-sep"></div>
      <div class="cv-ctx-item" data-action="fit">🔲 Fit to view</div>
      <div class="cv-ctx-item" data-action="reset">↺ Reset view</div>
    `;

    this.canvas.appendChild(menu);

    menu.addEventListener('click', (ev) => {
      const action = ev.target.dataset.action;
      menu.remove();
      if (action === 'download-all') this._captureFullView('download');
      else if (action === 'copy-all') this._captureFullView('copy');
      else if (action === 'fit') this.fitToView();
      else if (action === 'reset') this.resetView();
    });

    // Remove on click outside
    const dismiss = () => { menu.remove(); window.removeEventListener('click', dismiss); };
    setTimeout(() => window.addEventListener('click', dismiss), 10);
  },

  async _captureFullView(mode) {
    const rect = this.canvas.getBoundingClientRect();
    if (typeof html2canvas !== 'undefined') {
      try {
        const canvasEl = await html2canvas(this.canvas, {
          backgroundColor: '#f8f9fc', scale: 2, useCORS: true
        });
        await this._exportCanvas(canvasEl, mode);
      } catch(err) {
        toast('Capture failed. Use browser screenshot instead.', 'error');
      }
    } else {
      await this._nativeCapture(0, 0, rect.width, rect.height, mode);
    }
  },

  // ─── Select Reaction ───
  selectReaction(doi) {
    this.currentDOI = doi;
    document.querySelectorAll('.viz-doi-item').forEach(el => el.classList.toggle('active', el.title === doi));
    const steps = this.grouped.get(doi) || [];
    this.clearCanvas();
    this.resetView();
    this._clearSelection();
    const ph = document.getElementById('vizPlaceholder');
    if (ph) ph.style.display = 'none';
    this.layoutReaction(steps, doi);
    setTimeout(() => this.fitToView(), 120);
  },

  clearCanvas() {
    const inner = document.getElementById('vizCanvasInner');
    if (inner) inner.innerHTML = '';
    this.elements = [];
    this.nextZIndex = 100;
    this.markHistory = [];
    this._markFirstAtom = null;
    this._markOverlayCounter = 0;
    this.toggleMarkMode(null);
  },

  // ═══════════════════════════════════════════
  //  Layout: Overview + Z-shaped step rows
  //  (wider spacing to avoid text compression)
  // ═══════════════════════════════════════════
  layoutReaction(steps, doi) {
    if (!steps.length) return;

    const MOL_W = 260;
    const MOL_H = 260;
    const MARGIN = 50;
    const BOND_PANEL_W = 180;  // width reserved for bond changes panel
    const GAP = 25;            // gap between molecule and panel
    const STEP_BLOCK_W = MOL_W + GAP + BOND_PANEL_W + GAP + MOL_W + 40; // ~810
    const COLS_PER_ROW = 2;
    const STEP_ROW_H = 460;

    // ── Title ──
    const isDOI = doi.startsWith('10.');
    this.addElement({
      type: 'title', x: MARGIN, y: 20,
      html: `<div class="cv-title">${isDOI ? `<a href="https://doi.org/${doi}" target="_blank">${doi}</a>` : doi}</div>`,
    });

    // ── Overview Row (half-size: steps are the main focus) ──
    const OV_W = Math.round(MOL_W / 2);   // 130
    const OV_H = Math.round(MOL_H / 2);   // 130
    const step1 = steps.filter(s => parseInt(s['Step']) === 1);
    const smSet = new Set();
    for (const s of (step1.length ? step1 : [steps[0]])) {
      const sm = s['SMILES SM'];
      if (sm) sm.split('.').forEach(m => { if (m.trim()) smSet.add(m.trim()); });
    }
    const smList = Array.from(smSet);
    const lastStep = steps[steps.length - 1];
    const prodSmiles = lastStep['SMILES Product'] || '';
    const allReagents = steps.map(s => s['Reagents']).filter(Boolean).join(', ');

    let cx = MARGIN;
    const oy = 70;

    smList.forEach((sm, i) => {
      if (i > 0) {
        this.addElement({ type: 'label', x: cx, y: oy + OV_H / 2 - 12, html: '<div class="cv-plus">+</div>' });
        cx += 30;
      }
      this.addElement({ type: 'molecule', x: cx, y: oy, smiles: sm, width: OV_W, height: OV_H, label: i === 0 ? 'SM' : `SM${i + 1}` });
      cx += OV_W + 20;
    });

    this.addElement({
      type: 'label', x: cx, y: oy + OV_H / 2 - 20,
      html: `<div class="cv-big-arrow">
        <div class="cv-arrow-line"><div class="cv-arrow-head"></div></div>
        <div class="cv-arrow-label">${(allReagents || 'Conditions').substring(0, 60)}</div>
      </div>`
    });
    cx += 160;

    this.addElement({ type: 'molecule', x: cx, y: oy - 10, smiles: prodSmiles, width: OV_W + 20, height: OV_H + 20, label: 'Product' });

    // ── Step-by-Step with Checkbox Selection ──
    const startY = oy + OV_H + 60;

    // Initialize visible steps: default to last step only
    if (!this._visibleSteps) this._visibleSteps = {};
    if (!this._visibleSteps[doi]) {
      this._visibleSteps[doi] = new Set([steps.length - 1]);
    }
    const visibleSet = this._visibleSteps[doi];

    // Step selector in fixed bar below toolbar
    const stepBar = document.getElementById('stepSelectorBar');
    if (stepBar) {
      let barHTML = '<span class="cv-step-selector-label">Show Steps:</span>';
      steps.forEach((step, idx) => {
        const checked = visibleSet.has(idx) ? 'checked' : '';
        const stepNum = step['Step'] || (idx + 1);
        barHTML += `<label class="cv-step-check"><input type="checkbox" data-step-idx="${idx}" ${checked}> Step ${stepNum}</label>`;
      });
      barHTML += `<button class="cv-step-all-btn" data-action="all">All</button>`;
      barHTML += `<button class="cv-step-all-btn" data-action="last">Last Only</button>`;
      stepBar.innerHTML = barHTML;
      stepBar.style.display = 'flex';

      // Attach checkbox listeners
      const self = this;
      stepBar.querySelectorAll('.cv-step-check input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
          const idx = parseInt(cb.dataset.stepIdx);
          if (cb.checked) visibleSet.add(idx);
          else visibleSet.delete(idx);
          self.selectReaction(self.currentDOI);
        });
      });
      stepBar.querySelectorAll('.cv-step-all-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (btn.dataset.action === 'all') {
            steps.forEach((_, i) => visibleSet.add(i));
          } else {
            visibleSet.clear();
            visibleSet.add(steps.length - 1);
          }
          self.selectReaction(self.currentDOI);
        });
      });
    }

    // Section title on canvas
    this.addElement({
      type: 'label', x: MARGIN, y: startY,
      html: `<div class="cv-section-title">Step-by-Step Mechanism</div>`
    });

    // Store editable bond data per step for re-rendering
    if (!this._stepBondData) this._stepBondData = {};

    // Only render visible steps
    const visibleSteps = steps.filter((_, idx) => visibleSet.has(idx));
    let visibleIdx = 0;

    steps.forEach((step, idx) => {
      // Skip steps not checked
      if (!visibleSet.has(idx)) return;
      const row = Math.floor(visibleIdx / COLS_PER_ROW);
      const col = visibleIdx % COLS_PER_ROW;
      visibleIdx++;
      const sx = MARGIN + col * STEP_BLOCK_W;
      const sy = startY + 50 + row * STEP_ROW_H;

      // Get bond changes in alternating CSV order: Formed 1, Broken 1, Formed 2, Broken 2...
      const smSmi = step['SMILES SM'];
      const prodSmi = step['SMILES Product'];

      // Read bonds in alternating order from CSV columns
      let alternatingBonds = [];
      for (let i = 1; i <= 8; i++) {
        const f = step[`Formed ${i}`];
        const b = step[`Broken ${i}`];
        if (f && f.trim()) alternatingBonds.push({ desc: f.trim(), color: '#00c48c', type: 'formed' });
        if (b && b.trim()) alternatingBonds.push({ desc: b.trim(), color: '#ff6b6b', type: 'broken' });
      }

      // Auto-detect bond changes from SMILES comparison if no manual data
      let autoDetected = null;
      if (!alternatingBonds.length && smSmi && prodSmi) {
        autoDetected = ChemEngine.detectBondChanges(smSmi, prodSmi);
        if (autoDetected) {
          // Interleave auto-detected: formed first, then broken alternating
          const maxLen = Math.max(autoDetected.formed.length, autoDetected.broken.length);
          for (let i = 0; i < maxLen; i++) {
            if (i < autoDetected.formed.length) alternatingBonds.push({ desc: autoDetected.formed[i], color: '#00c48c', type: 'formed' });
            if (i < autoDetected.broken.length) alternatingBonds.push({ desc: autoDetected.broken[i], color: '#ff6b6b', type: 'broken' });
          }
        }
      }

      // Store editable state - each bond has {desc, color, type, order, atomIdx}
      const stepKey = `${doi}_step${idx}`;
      if (!this._stepBondData[stepKey]) {
        this._stepBondData[stepKey] = {
          bondItems: alternatingBonds.map((item, i) => ({ ...item, order: i + 1, atomIdx: null }))
        };
      }
      const bondState = this._stepBondData[stepKey];

      // Step badge
      this.addElement({
        type: 'label', x: sx, y: sy,
        html: `<div class="cv-step-num">Step ${step['Step'] || (idx + 1)}</div>`
      });

      // SM molecule — highlight with custom colors
      this.addElement({
        type: 'molecule', x: sx, y: sy + 36,
        smiles: smSmi, width: MOL_W, height: MOL_H,
        bondItems: bondState.bondItems, molRole: 'sm',
        stepKey
      });

      // Bond changes column with edit controls + color pickers
      const bondPanelId = `bondPanel_${idx}`;
      let bondHTML = '<div class="cv-small-arrow">→</div>';
      bondHTML += '<div class="cv-bond-edit-section">';

      if (bondState.bondItems.length) {
        bondState.bondItems.forEach((item, bi) => {
          const badgeClass = item.type === 'broken' ? 'bond-badge broken' : 'bond-badge';
          const orderNum = item.order || (bi + 1);
          const typeLabel = item.type === 'broken' ? 'break' : 'form';
          const atomInfo = item.atomIdx ? ` [${item.atomIdx[0]},${item.atomIdx[1]}]` : '';
          bondHTML += `<div class="cv-bond-item-row">
            <input type="color" class="cv-bond-color" data-step="${stepKey}" data-idx="${bi}" value="${item.color}" title="Change color">
            <span class="cv-bond-order">#${orderNum}</span>
            <span class="${badgeClass} cv-bond-editable" style="border-color:${item.color};color:${item.color};background:${item.color}18">
              ${item.desc}${atomInfo}
            </span>
            <span class="cv-bond-type-label cv-bond-type-${item.type}">${typeLabel}</span>
            <span class="cv-bond-remove" data-step="${stepKey}" data-idx="${bi}" title="Remove">✕</span>
          </div>`;
        });
      } else {
        bondHTML += '<div style="color:#999;font-size:11px">no change</div>';
      }

      // Add bond buttons
      bondHTML += `<div class="cv-bond-add-row">
        <button class="cv-bond-add-btn" data-step="${stepKey}" data-type="formed" title="Add Formed bond">+ Formed</button>
        <button class="cv-bond-add-btn cv-bond-add-broken" data-step="${stepKey}" data-type="broken" title="Add Broken bond">+ Broken</button>
      </div>`;

      if (autoDetected && (autoDetected.formed.length || autoDetected.broken.length)) {
        bondHTML += '<div class="cv-bond-source">Auto-detected</div>';
      }
      bondHTML += '</div>';

      this.addElement({
        type: 'label', x: sx + MOL_W + GAP, y: sy + 40,
        html: `<div class="cv-bond-changes" id="${bondPanelId}" style="width:${BOND_PANEL_W}px">${bondHTML}</div>`
      });

      // Attach event listeners
      setTimeout(() => {
        const panel = document.getElementById(bondPanelId);
        if (!panel) return;

        // Color change
        panel.querySelectorAll('.cv-bond-color').forEach(input => {
          input.addEventListener('input', (e) => {
            e.stopPropagation();
            const sk = input.dataset.step;
            const bi = parseInt(input.dataset.idx);
            const state = this._stepBondData[sk];
            if (!state) return;
            state.bondItems[bi].color = input.value;
            this.selectReaction(this.currentDOI);
          });
        });

        // Remove bond
        panel.querySelectorAll('.cv-bond-remove').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const sk = btn.dataset.step;
            const bi = parseInt(btn.dataset.idx);
            const state = this._stepBondData[sk];
            if (!state) return;
            state.bondItems.splice(bi, 1);
            this.selectReaction(this.currentDOI);
          });
        });

        // Add bond
        panel.querySelectorAll('.cv-bond-add-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const sk = btn.dataset.step;
            const type = btn.dataset.type;
            const state = this._stepBondData[sk];
            if (!state) return;
            const desc = prompt('Enter bond descriptor (e.g. C-N, C=O, C-C):');
            if (!desc || !desc.trim()) return;
            const defaultColor = type === 'formed' ? '#00c48c' : '#ff6b6b';
            const nextOrder = state.bondItems.length + 1;
            state.bondItems.push({ desc: desc.trim(), color: defaultColor, type, order: nextOrder, atomIdx: null });
            this.selectReaction(this.currentDOI);
          });
        });
      }, 50);

      // Product molecule — highlight with custom colors
      const prodX = sx + MOL_W + GAP + BOND_PANEL_W + GAP;
      this.addElement({
        type: 'molecule', x: prodX, y: sy + 36,
        smiles: prodSmi, width: MOL_W, height: MOL_H,
        bondItems: bondState.bondItems, molRole: 'product',
        stepKey
      });

      // Reagents label (below bond panel)
      if (step['Reagents']) {
        this.addElement({
          type: 'label', x: sx + MOL_W + GAP, y: sy + MOL_H + 55,
          html: `<div class="cv-reagent" style="max-width:${BOND_PANEL_W}px">${step['Reagents']}</div>`
        });
      }

      // Connector (only between visible steps)
      if (visibleIdx < visibleSteps.length) {
        const nextCol = visibleIdx % COLS_PER_ROW;
        if (nextCol > 0) {
          this.addElement({
            type: 'label', x: sx + STEP_BLOCK_W + 5, y: sy + MOL_H / 2,
            html: '<div class="cv-step-connector-h">⟶</div>'
          });
        } else {
          this.addElement({
            type: 'label', x: sx + STEP_BLOCK_W / 2, y: sy + STEP_ROW_H - 30,
            html: '<div class="cv-step-connector-v">↓ next row</div>'
          });
        }
      }
    });
  },

  // ═══════════════════════════════════════════
  //  Create draggable + resizable element
  // ═══════════════════════════════════════════
  // bondItems: [{desc, color, type}] for custom per-bond colors
  addElement({ type, x, y, html, smiles, width, height, label, formedBonds, brokenBonds, molRole, bondItems, stepKey }) {
    const inner = document.getElementById('vizCanvasInner');
    if (!inner) return;

    const el = document.createElement('div');
    el.className = 'cv-element';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.zIndex = this.nextZIndex++;

    if (type === 'molecule') {
      el.classList.add('cv-mol');
      const box = document.createElement('div');
      box.className = 'cv-mol-box';
      const molW = width || 260;
      const molH = height || 260;
      box.style.width = molW + 'px';
      box.style.height = molH + 'px';

      if (smiles) {
        let svg;
        if (bondItems && bondItems.length) {
          svg = ChemEngine.getSvgHighlighted(smiles, molW, molH, null, null, molRole || 'both', bondItems);
        } else if ((formedBonds && formedBonds.length) || (brokenBonds && brokenBonds.length)) {
          svg = ChemEngine.getSvgHighlighted(smiles, molW, molH, formedBonds, brokenBonds, molRole || 'both');
        } else {
          svg = ChemEngine.getSvg(smiles, molW, molH);
        }
        if (svg) {
          box.innerHTML = svg;
        } else {
          box.innerHTML = `<div class="cv-smiles-text" title="${smiles}">${smiles.length > 30 ? smiles.substring(0, 27) + '...' : smiles}</div>`;
        }
        box.title = smiles;
      } else {
        box.innerHTML = '<span class="cv-na">No SMILES</span>';
      }
      el.appendChild(box);

      if (label) {
        const lb = document.createElement('div');
        lb.className = 'cv-mol-label';
        lb.textContent = label;
        el.appendChild(lb);
      }

      // 4-corner resize handles
      for (const corner of ['se', 'sw', 'ne', 'nw']) {
        const handle = document.createElement('div');
        handle.className = `cv-resize-handle cv-rh-${corner}`;
        handle.title = 'Drag to resize';
        handle.dataset.corner = corner;
        el.appendChild(handle);
      }

      // Edge resize zones
      for (const edge of ['right', 'bottom', 'left', 'top']) {
        const zone = document.createElement('div');
        zone.className = `cv-edge-zone cv-ez-${edge}`;
        zone.dataset.edge = edge;
        box.appendChild(zone);
      }

      this.makeResizable(el, box, smiles, formedBonds, brokenBonds, molRole, bondItems);

      // Store stepKey on box for bond marking
      box._stepKey = stepKey || null;

      // Bond marking click handler
      this._setupBondMarking(el, box, smiles);
    } else {
      el.innerHTML = html || '';
    }

    this.makeDraggable(el);
    inner.appendChild(el);
    this.elements.push(el);
    return el;
  },

  // ─── Drag ───
  makeDraggable(el) {
    let isDragging = false, startX, startY, origX, origY;

    const onDown = (e) => {
      if (e.target.classList.contains('cv-resize-handle')) return;
      if (e.target.tagName === 'A' || e.target.tagName === 'INPUT') return;
      if (e.target.isContentEditable) return;
      if (e.button !== 0) return; // only left click
      e.stopPropagation();
      isDragging = true;
      el.style.zIndex = this.nextZIndex++;
      el.classList.add('dragging');
      startX = e.clientX;
      startY = e.clientY;
      origX = parseInt(el.style.left) || 0;
      origY = parseInt(el.style.top) || 0;

      const onMove = (ev) => {
        if (!isDragging) return;
        el.style.left = (origX + (ev.clientX - startX) / this.scale) + 'px';
        el.style.top  = (origY + (ev.clientY - startY) / this.scale) + 'px';
      };
      const onUp = () => {
        isDragging = false;
        el.classList.remove('dragging');
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    };
    el.addEventListener('mousedown', onDown);
  },

  // ─── Resize (for molecule boxes, all 4 corners + edges) ───
  makeResizable(el, box, smiles, formedBonds, brokenBonds, molRole, bondItems) {
    const handles = el.querySelectorAll('.cv-resize-handle');
    const edges = box.querySelectorAll('.cv-edge-zone');
    const self = this;

    const rerender = () => {
      if (!smiles) return;
      const w = box.offsetWidth;
      const h = box.offsetHeight;
      let svg;
      if (bondItems && bondItems.length) {
        svg = ChemEngine.getSvgHighlighted(smiles, w, h, null, null, molRole || 'both', bondItems);
      } else if ((formedBonds && formedBonds.length) || (brokenBonds && brokenBonds.length)) {
        svg = ChemEngine.getSvgHighlighted(smiles, w, h, formedBonds, brokenBonds, molRole || 'both');
      } else {
        svg = ChemEngine.getSvg(smiles, w, h);
      }
      if (svg) {
        // Preserve edge zones
        const zones = box.querySelectorAll('.cv-edge-zone');
        box.innerHTML = svg;
        zones.forEach(z => box.appendChild(z.cloneNode()));
        // Re-setup bond marking
        self._setupBondMarking(el, box, smiles);
      }
    };

    const startResize = (e, corner) => {
      e.stopPropagation();
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      const origW = box.offsetWidth;
      const origH = box.offsetHeight;
      const origLeft = parseInt(el.style.left) || 0;
      const origTop = parseInt(el.style.top) || 0;

      const onMove = (ev) => {
        const dx = (ev.clientX - startX) / self.scale;
        const dy = (ev.clientY - startY) / self.scale;

        let newW = origW, newH = origH, newLeft = origLeft, newTop = origTop;

        if (corner === 'se' || corner === 'right' || corner === 'bottom') {
          const delta = corner === 'right' ? dx : corner === 'bottom' ? dy : Math.max(dx, dy);
          newW = Math.max(60, origW + (corner === 'bottom' ? 0 : (corner === 'se' ? delta : dx)));
          newH = Math.max(60, origH + (corner === 'right' ? 0 : (corner === 'se' ? delta : dy)));
          if (corner === 'se') { newW = newH = Math.max(60, origW + delta); }
        } else if (corner === 'nw') {
          const delta = Math.min(dx, dy);
          newW = Math.max(60, origW - delta);
          newH = Math.max(60, origH - delta);
          newLeft = origLeft + (origW - newW);
          newTop = origTop + (origH - newH);
        } else if (corner === 'ne') {
          const delta = Math.max(dx, -dy);
          newW = Math.max(60, origW + delta);
          newH = Math.max(60, origH + delta);
          newTop = origTop + (origH - newH);
        } else if (corner === 'sw') {
          const delta = Math.max(-dx, dy);
          newW = Math.max(60, origW + delta);
          newH = Math.max(60, origH + delta);
          newLeft = origLeft + (origW - newW);
        } else if (corner === 'left') {
          newW = Math.max(60, origW - dx);
          newLeft = origLeft + (origW - newW);
        } else if (corner === 'top') {
          newH = Math.max(60, origH - dy);
          newTop = origTop + (origH - newH);
        }

        box.style.width = newW + 'px';
        box.style.height = newH + 'px';
        el.style.left = newLeft + 'px';
        el.style.top = newTop + 'px';
      };

      const onUp = () => {
        rerender();
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    };

    handles.forEach(h => {
      h.addEventListener('mousedown', (e) => startResize(e, h.dataset.corner));
    });

    edges.forEach(z => {
      z.addEventListener('mousedown', (e) => startResize(e, z.dataset.edge));
    });
  },

  // ─── Custom Elements ───
  addTextNote() {
    const text = prompt('Enter text:');
    if (!text) return;
    const pos = this._viewCenter();
    this.addElement({
      type: 'label', x: pos.x, y: pos.y,
      html: `<div class="cv-text-note" contenteditable="true">${text}</div>`
    });
  },

  addArrowElement() {
    const pos = this._viewCenter();
    this.addElement({
      type: 'label', x: pos.x, y: pos.y,
      html: '<div class="cv-draggable-arrow"><div class="cv-arrow-line" style="width:120px"><div class="cv-arrow-head"></div></div></div>'
    });
  },

  addCircleElement() {
    const pos = this._viewCenter();
    this.addElement({
      type: 'label', x: pos.x, y: pos.y,
      html: '<div class="cv-circle-marker"></div>'
    });
  },

  // ═══════════════════════════════════════════
  //  Bond Marking Mode (Atom-based selection)
  //  Click atom A → click atom B:
  //    if A-B bonded → highlight bond (green/red)
  //    if not bonded → mark both atoms individually
  // ═══════════════════════════════════════════
  toggleMarkMode(mode) {
    // Toggle: if same mode, turn off
    if (this.markMode === mode) mode = null;
    this.markMode = mode;
    this._markFirstAtom = null; // reset partial selection

    // Update toolbar button states
    const btnF = document.getElementById('btnMarkFormed');
    const btnB = document.getElementById('btnMarkBroken');
    if (btnF) btnF.classList.toggle('mark-active-formed', mode === 'formed');
    if (btnB) btnB.classList.toggle('mark-active-broken', mode === 'broken');

    // Update all molecule boxes
    document.querySelectorAll('.cv-mol-box').forEach(box => {
      box.classList.toggle('marking-mode', mode !== null);
    });

    // Remove any pending first-atom highlight
    document.querySelectorAll('.cv-atom-select-pending').forEach(el => el.remove());

    if (mode) {
      toast(mode === 'formed' ? 'Click two atoms to mark FORMED bond (green)' : 'Click two atoms to mark BROKEN bond (red)', 'info');
    }
  },

  // Setup atom-based click handler on a molecule box
  _setupBondMarking(el, box, smiles) {
    // Pre-compute atom/bond data from ChemEngine
    const abData = ChemEngine.getAtomBondData(smiles);
    if (abData && abData.atoms.length > 0) {
      box._atomBondData = abData;
    }

    box.addEventListener('click', (e) => {
      if (!this.markMode) return;
      e.stopPropagation();

      const abData = box._atomBondData;
      if (!abData || !abData.atoms.length) {
        toast('Unable to detect atom positions for this molecule', 'error');
        return;
      }

      const svgEl = box.querySelector('svg');
      if (!svgEl) return;

      // Convert click position to SVG viewBox coordinates
      const rect = svgEl.getBoundingClientRect();
      const clickScreenX = e.clientX - rect.left;
      const clickScreenY = e.clientY - rect.top;

      const vb = abData.viewBox; // [x, y, width, height]
      const svgX = vb[0] + (clickScreenX / rect.width) * vb[2];
      const svgY = vb[1] + (clickScreenY / rect.height) * vb[3];

      // Find nearest atom
      let nearest = null;
      let minDist = vb[2] * 0.15; // max click distance ~15% of SVG width
      for (const atom of abData.atoms) {
        const dx = svgX - atom.cx;
        const dy = svgY - atom.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          nearest = atom;
        }
      }

      if (!nearest) return; // clicked too far from any atom

      // === First atom selection ===
      if (!this._markFirstAtom || this._markFirstAtom.molBox !== box) {
        // Clear any previous first-atom highlight from other boxes
        document.querySelectorAll('.cv-atom-select-pending').forEach(el => el.remove());

        this._markFirstAtom = { atom: nearest, molBox: box, svgEl, abData };
        this._drawAtomHighlight(svgEl, nearest, 'pending');
        toast(`Selected ${nearest.element}(${nearest.idx + 1}), click the second atom`, 'info');
        return;
      }

      // === Second atom selection ===
      const first = this._markFirstAtom.atom;
      const second = nearest;

      // Remove pending highlight
      document.querySelectorAll('.cv-atom-select-pending').forEach(el => el.remove());

      if (first.idx === second.idx) {
        // Clicked same atom → deselect
        this._markFirstAtom = null;
        return;
      }

      // Check adjacency (are they bonded?)
      const bond = abData.bonds.find(b =>
        (b.a1 === first.idx && b.a2 === second.idx) ||
        (b.a1 === second.idx && b.a2 === first.idx)
      );

      const mode = this.markMode;
      const color = mode === 'formed' ? '#00c48c' : '#ff6b6b';
      const glowColor = mode === 'formed' ? 'rgba(0,196,140,0.4)' : 'rgba(255,107,107,0.4)';
      const overlayIds = [];

      // Build bond descriptor with atom indices
      const bondDesc = bond
        ? `${first.element}(${first.idx})-${second.element}(${second.idx})`
        : `${first.element}(${first.idx}),${second.element}(${second.idx})`;
      const atomIdx = [first.idx, second.idx];

      // Add to _stepBondData if stepKey is available
      const stepKey = box._stepKey;
      let orderNum = null;
      if (stepKey && this._stepBondData && this._stepBondData[stepKey]) {
        const state = this._stepBondData[stepKey];
        orderNum = state.bondItems.length + 1;
        state.bondItems.push({
          desc: bondDesc, color, type: mode,
          order: orderNum, atomIdx
        });
      }

      const labelText = orderNum ? `#${orderNum}` : (mode === 'formed' ? 'F' : 'B');

      // ── Compute perpendicular offset direction for label placement ──
      // This ensures labels for the two atoms are on OPPOSITE sides
      const dx = second.cx - first.cx;
      const dy = second.cy - first.cy;
      const bondLen = Math.sqrt(dx * dx + dy * dy) || 1;
      // Perpendicular unit vector (rotated 90°)
      const perpX = -dy / bondLen;
      const perpY = dx / bondLen;
      const labelOffset = vb[2] * 0.055; // distance from atom to label

      if (bond) {
        // ── Adjacent atoms → highlight the BOND between them ──
        const id1 = this._addSvgOverlay(svgEl, 'circle', {
          cx: first.cx, cy: first.cy, r: vb[2] * 0.025,
          fill: glowColor, stroke: color, 'stroke-width': 1.5
        });
        const id2 = this._addSvgOverlay(svgEl, 'circle', {
          cx: second.cx, cy: second.cy, r: vb[2] * 0.025,
          fill: glowColor, stroke: color, 'stroke-width': 1.5
        });
        const id3 = this._addSvgOverlay(svgEl, 'line', {
          x1: first.cx, y1: first.cy, x2: second.cx, y2: second.cy,
          stroke: color, 'stroke-width': vb[2] * 0.02,
          'stroke-linecap': 'round', opacity: 0.7
        });
        overlayIds.push(id1, id2, id3);

        // Label order number near midpoint, offset perpendicular to bond
        const mx = (first.cx + second.cx) / 2;
        const my = (first.cy + second.cy) / 2;
        const id4 = this._addSvgOverlay(svgEl, 'text', {
          x: mx + perpX * labelOffset * 0.6, y: my + perpY * labelOffset * 0.6,
          'text-anchor': 'middle', 'dominant-baseline': 'central',
          'font-size': vb[2] * 0.04, 'font-weight': '700', 'font-family': 'sans-serif',
          fill: color, _text: labelText
        });
        overlayIds.push(id4);

        // Individual atom labels on OPPOSITE sides of the bond
        const id5 = this._addSvgOverlay(svgEl, 'text', {
          x: first.cx + perpX * labelOffset, y: first.cy + perpY * labelOffset,
          'text-anchor': 'middle', 'dominant-baseline': 'central',
          'font-size': vb[2] * 0.03, 'font-weight': '600', 'font-family': 'sans-serif',
          fill: color, _text: `${first.element}${first.idx + 1}`
        });
        const id6 = this._addSvgOverlay(svgEl, 'text', {
          x: second.cx - perpX * labelOffset, y: second.cy - perpY * labelOffset,
          'text-anchor': 'middle', 'dominant-baseline': 'central',
          'font-size': vb[2] * 0.03, 'font-weight': '600', 'font-family': 'sans-serif',
          fill: color, _text: `${second.element}${second.idx + 1}`
        });
        overlayIds.push(id5, id6);

      } else {
        // ── Non-adjacent atoms → mark each individually ──
        const r = vb[2] * 0.035;
        const id1 = this._addSvgOverlay(svgEl, 'circle', {
          cx: first.cx, cy: first.cy, r,
          fill: glowColor, stroke: color, 'stroke-width': 2
        });
        const id2 = this._addSvgOverlay(svgEl, 'circle', {
          cx: second.cx, cy: second.cy, r,
          fill: glowColor, stroke: color, 'stroke-width': 2
        });
        overlayIds.push(id1, id2);

        // Labels on OPPOSITE sides: first atom label above-left, second atom label below-right
        const id3 = this._addSvgOverlay(svgEl, 'text', {
          x: first.cx + perpX * labelOffset, y: first.cy + perpY * labelOffset,
          'text-anchor': 'middle', 'dominant-baseline': 'central',
          'font-size': vb[2] * 0.035, 'font-weight': '600', 'font-family': 'sans-serif',
          fill: color, _text: `${first.element}(${first.idx + 1})`
        });
        const id4 = this._addSvgOverlay(svgEl, 'text', {
          x: second.cx - perpX * labelOffset, y: second.cy - perpY * labelOffset,
          'text-anchor': 'middle', 'dominant-baseline': 'central',
          'font-size': vb[2] * 0.035, 'font-weight': '600', 'font-family': 'sans-serif',
          fill: color, _text: `${second.element}(${second.idx + 1})`
        });
        overlayIds.push(id3, id4);
      }

      // Push to undo stack with stepKey for _stepBondData removal
      this.markHistory.push({
        type: bond ? 'bond' : 'atoms',
        svgEl, overlayIds, mode, box,
        stepKey: stepKey || null,
        desc: bondDesc
      });

      this._markFirstAtom = null;
      const toastMsg = orderNum ? `#${orderNum} ${bondDesc} (${mode})` : `${bondDesc} (${mode})`;
      toast(`Marked ${toastMsg}`, 'success');
    });
  },

  // Draw a temporary highlight circle on an atom (for pending first-atom selection)
  _drawAtomHighlight(svgEl, atom, type) {
    const vb = svgEl.getAttribute('viewBox')?.split(/[\s,]+/).map(Number) || [0, 0, 250, 200];
    const r = vb[2] * 0.04;
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', atom.cx);
    circle.setAttribute('cy', atom.cy);
    circle.setAttribute('r', r);
    circle.setAttribute('fill', 'rgba(255,165,0,0.35)');
    circle.setAttribute('stroke', '#ffa500');
    circle.setAttribute('stroke-width', '2');
    circle.setAttribute('stroke-dasharray', '3,2');
    circle.classList.add('cv-atom-select-pending');
    circle.style.pointerEvents = 'none';
    svgEl.appendChild(circle);
  },

  // Add an SVG overlay element and return its unique data-mark-id
  _addSvgOverlay(svgEl, tag, attrs) {
    const id = 'mark-' + (++this._markOverlayCounter);
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    el.setAttribute('data-mark-id', id);
    el.classList.add('cv-mark-overlay');
    for (const [k, v] of Object.entries(attrs)) {
      if (k === '_text') {
        el.textContent = v;
      } else {
        el.setAttribute(k, v);
      }
    }
    el.style.pointerEvents = 'none';
    svgEl.appendChild(el);
    return id;
  },

  // ─── Undo last marking action ───
  undoMark() {
    if (!this.markHistory.length) {
      toast('Nothing to undo', 'info');
      return;
    }
    const last = this.markHistory.pop();
    // Remove all SVG overlay elements for this action
    for (const id of last.overlayIds) {
      const el = last.svgEl.querySelector(`[data-mark-id="${id}"]`);
      if (el) el.remove();
    }
    // Also remove from _stepBondData if it was added there
    if (last.stepKey && this._stepBondData && this._stepBondData[last.stepKey]) {
      const items = this._stepBondData[last.stepKey].bondItems;
      // Remove the last item that matches this desc
      for (let i = items.length - 1; i >= 0; i--) {
        if (items[i].desc === last.desc && items[i].type === last.mode) {
          items.splice(i, 1);
          break;
        }
      }
    }
    toast(`Undone: ${last.desc}`, 'success');
  },

  _viewCenter() {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (rect.width / 2 - this.canvasOffset.x) / this.scale,
      y: (rect.height / 2 - this.canvasOffset.y) / this.scale
    };
  },

  // ─── Helpers ───
  getBondChanges(entry, type) {
    const bonds = [];
    for (let i = 1; i <= 8; i++) {
      const val = entry[`${type} ${i}`];
      if (val && val.trim()) bonds.push(val.trim());
    }
    return bonds;
  },

  // ─── CSV Upload ───
  handleCSV(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) { toast('CSV appears empty', 'error'); return; }
        const headers = this.parseCSVLine(lines[0]);
        const fieldMap = {
          'source': 'Paper DOI', 'paper doi': 'Paper DOI', 'doi': 'Paper DOI', 'reference': 'Paper DOI',
          'user name': 'Entered By', 'entered by': 'Entered By', 'author': 'Entered By',
          'step': 'Step',
          'smiles sm': 'SMILES SM', 'starting material': 'SMILES SM', 'sm': 'SMILES SM',
          'smiles product': 'SMILES Product', 'product': 'SMILES Product',
          'reagents': 'Reagents'
        };
        const newEntries = [];
        for (let i = 1; i < lines.length; i++) {
          const vals = this.parseCSVLine(lines[i]);
          const entry = {};
          headers.forEach((h, idx) => {
            const key = fieldMap[h.toLowerCase().trim()] || h.trim();
            entry[key] = (vals[idx] || '').trim();
          });
          for (let j = 1; j <= 8; j++) {
            if (!entry[`Formed ${j}`]) entry[`Formed ${j}`] = '';
            if (!entry[`Broken ${j}`]) entry[`Broken ${j}`] = '';
          }
          if (entry['Paper DOI'] || entry['SMILES SM']) newEntries.push(entry);
        }
        if (!newEntries.length) { toast('No valid entries found', 'error'); return; }
        DataApp.db = newEntries.concat(DataApp.db);
        DataApp.applyFilters();
        this.groupData(DataApp.db);
        this.renderDOIList();
        toast(`Loaded ${newEntries.length} entries`, 'success');
        const firstDOI = newEntries[0]['Paper DOI'];
        if (firstDOI) this.selectReaction(firstDOI);
      } catch (err) {
        console.error('CSV parse error:', err);
        toast('Failed to parse CSV: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  },

  parseCSVLine(line) {
    const result = [];
    let current = '', inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === ',' && !inQuotes) { result.push(current); current = ''; }
      else current += ch;
    }
    result.push(current);
    return result;
  },

  exportImage() {
    if (!this.currentDOI) { toast('Select a reaction first', 'error'); return; }
    this._captureFullView('download');
  }
};
