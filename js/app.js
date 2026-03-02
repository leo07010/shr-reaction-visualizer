// Init / Main Entry Point

window.onload = async () => {
  // Load data from JSON file
  let data = [];
  try {
    const resp = await fetch('data/data.json');
    data = await resp.json();
  } catch (e) {
    console.warn('Could not load data.json:', e);
  }

  // Auto-load any CSV files in the project folder
  // Users can drop CSV files alongside data.json and they'll be loaded automatically
  const csvFiles = ['data/reactions.csv', 'data/data.csv', 'data/import.csv', 'data/shr_data.csv'];
  for (const csvFile of csvFiles) {
    try {
      const resp = await fetch(csvFile);
      if (resp.ok) {
        const text = await resp.text();
        const csvData = parseCSVToData(text);
        if (csvData.length > 0) {
          data = data.concat(csvData);
          console.log(`Auto-loaded ${csvData.length} entries from ${csvFile}`);
        }
      }
    } catch (e) {
      // File doesn't exist, skip silently
    }
  }

  // Initialize RDKit chemistry engine
  await ChemEngine.init();

  // Initialize Visualizer, Database, and Structure Search with shared data
  VisualizerApp.init(data);
  DataApp.init(data);
  StructureSearch.init(data);
};

// Parse CSV text into data array (same format as data.json entries)
function parseCSVToData(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const fieldMap = {
    'source': 'Paper DOI', 'paper doi': 'Paper DOI', 'doi': 'Paper DOI', 'reference': 'Paper DOI',
    'user name': 'Entered By', 'entered by': 'Entered By', 'author': 'Entered By',
    'step': 'Step',
    'smiles sm': 'SMILES SM', 'starting material': 'SMILES SM', 'sm': 'SMILES SM',
    'smiles product': 'SMILES Product', 'product': 'SMILES Product',
    'reagents': 'Reagents'
  };

  const entries = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    const entry = {};
    headers.forEach((h, idx) => {
      const key = fieldMap[h.toLowerCase().trim()] || h.trim();
      entry[key] = (vals[idx] || '').trim();
    });
    // Ensure Formed/Broken fields exist
    for (let j = 1; j <= 8; j++) {
      if (!entry[`Formed ${j}`]) entry[`Formed ${j}`] = '';
      if (!entry[`Broken ${j}`]) entry[`Broken ${j}`] = '';
    }
    if (entry['Paper DOI'] || entry['SMILES SM']) entries.push(entry);
  }
  return entries;
}

function parseCSVLine(line) {
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
}

// ═══════════════════════════════════════════
//  Structure Search Module
//  Uses Python RDKit backend API if available, falls back to JS RDKit
// ═══════════════════════════════════════════
const StructureSearch = {
  db: [],
  // Backend API URL — auto-detect from current server. Falls back to JS RDKit if unreachable.
  API_URL: window.location.origin + '/api',

  init(data) {
    this.db = data || [];
    this._checkBackend();
    this._initDrawEngine();
  },

  // Check if Python backend is available
  async _checkBackend() {
    try {
      const resp = await fetch(`${this.API_URL}/health`, { signal: AbortSignal.timeout(3000) });
      if (resp.ok) {
        const info = await resp.json();
        console.log(`[StructureSearch] Python backend online. ${info.entries} entries.`);
        this.backendAvailable = true;
        const badge = document.getElementById('searchBackendBadge');
        if (badge) { badge.textContent = '🐍 Python RDKit'; badge.className = 'search-backend-badge online'; }
      }
    } catch (e) {
      console.log('[StructureSearch] Python backend offline, using JS RDKit.');
      this.backendAvailable = false;
      const badge = document.getElementById('searchBackendBadge');
      if (badge) { badge.textContent = '⚡ JS RDKit (local)'; badge.className = 'search-backend-badge offline'; }
    }
  },

  // Initialize canvas drawing engine
  _initDrawEngine() {
    DrawEngine.init('drawCanvas', 'drawCanvasArea');

    // Toolbar click handlers
    document.getElementById('drawToolbar')?.addEventListener('click', e => {
      const btn = e.target.closest('.dtb-btn');
      if (!btn) return;
      const t = btn.dataset.t;
      if (t === 'clear') { DrawEngine.clearAll(); return; }
      if (t === 'undo') { DrawEngine.popUndo(); return; }
      DrawEngine.setTool(t);
    });

    // Element grid click handlers — auto-switches to atom tool
    document.getElementById('drawElemGrid')?.addEventListener('click', e => {
      const btn = e.target.closest('.el-btn');
      if (!btn) return;
      DrawEngine.curFragment = null;
      document.querySelectorAll('#drawFragGrid .fg-btn').forEach(b => b.classList.remove('on'));
      DrawEngine.setElem(btn.dataset.e);
    });

    // Functional group grid click handlers
    document.getElementById('drawFragGrid')?.addEventListener('click', e => {
      const btn = e.target.closest('.fg-btn');
      if (!btn) return;
      DrawEngine.setFragment(btn.dataset.fg);
    });
  },

  // Run substructure search — Python backend first, JS fallback
  async runSearch() {
    const query = document.getElementById('searchSmilesInput')?.value?.trim();
    if (!query) { toast('Please enter a SMILES or SMARTS query', 'info'); return; }

    const resultsDiv = document.getElementById('searchResults');
    const countSpan = document.getElementById('searchResultCount');
    if (!resultsDiv) return;

    resultsDiv.innerHTML = '<div class="search-placeholder">Searching...</div>';

    // ── Try Python backend first ────────────────────────────────────────────
    if (this.backendAvailable) {
      try {
        const resp = await fetch(`${this.API_URL}/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ smiles: query, limit: 200 }),
          signal: AbortSignal.timeout(15000)
        });
        if (resp.ok) {
          const data = await resp.json();
          if (countSpan) countSpan.textContent = `(${data.count} found)`;
          if (data.count === 0) {
            resultsDiv.innerHTML = '<div class="search-placeholder">No matching molecules found.</div>';
            return;
          }
          let html = '';
          for (const m of data.results) {
            const svg = m.svg || ChemEngine.getSvg(m.smiles, 80, 80) || '';
            const doi = m.doi || 'Unknown';
            const step = m.step || '?';
            const role = m.role === 'SM' ? 'Starting Material' : 'Product';
            const truncSmiles = m.smiles.length > 60 ? m.smiles.substring(0, 57) + '...' : m.smiles;
            const safeSmiles = m.smiles.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const safeDoi = doi.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            html += `<div class="search-result-card" onclick="StructureSearch.showResultDetail('${safeSmiles}','${safeDoi}','${step}','${role}','Python RDKit')">
              <div class="search-result-mol">${svg}</div>
              <div class="search-result-info">
                <div class="search-result-doi">${doi}</div>
                <div class="search-result-smiles" title="${m.smiles}">${truncSmiles}</div>
                <div class="search-result-step">Step ${step} · ${role}</div>
                <span class="search-result-highlight">🐍 Python RDKit match</span>
              </div>
            </div>`;
          }
          resultsDiv.innerHTML = html;
          toast(`Found ${data.count} matching molecules`, 'success');
          return;
        }
      } catch (e) {
        console.warn('[StructureSearch] Backend search failed, falling back to JS:', e);
        this.backendAvailable = false;
      }
    }

    // ── JS RDKit fallback ───────────────────────────────────────────────────
    if (!ChemEngine.ready) { toast('RDKit is not ready yet', 'error'); return; }

    // Try SMILES first (stricter matching), then SMARTS fallback
    let qmol = null;
    try {
      const mol = ChemEngine.rdkit.get_mol(query);
      if (mol?.is_valid()) {
        // Convert SMILES mol to query mol for substructure search
        const qsmarts = mol.get_smarts();
        mol.delete();
        if (qsmarts) { try { qmol = ChemEngine.rdkit.get_qmol(qsmarts); } catch(e) {} }
        if (!qmol?.is_valid()) { if (qmol) qmol.delete(); qmol = null; }
      } else { if (mol) mol.delete(); }
    } catch (e) {}
    // SMARTS fallback
    if (!qmol) { try { qmol = ChemEngine.rdkit.get_qmol(query); if (!qmol?.is_valid()) { if (qmol) qmol.delete(); qmol = null; } } catch (e) {} }
    if (!qmol) { toast('Invalid SMILES/SMARTS query', 'error'); return; }

    const matches = [];
    const seen = new Set();
    for (const entry of this.db) {
      for (const field of ['SMILES SM', 'SMILES Product']) {
        const smiles = entry[field];
        if (!smiles || ChemEngine.isTemplateSMILES(smiles)) continue;
        const key = `${smiles}_${entry['Paper DOI']}_${entry['Step']}`;
        if (seen.has(key)) continue;
        let mol = null;
        try {
          mol = ChemEngine.rdkit.get_mol(smiles);
          if (mol?.is_valid() && mol.get_substruct_match(qmol) !== '{}') {
            seen.add(key);
            matches.push({ entry, field, smiles });
          }
        } catch (e) {} finally { if (mol) mol.delete(); }
      }
    }
    qmol.delete();

    if (countSpan) countSpan.textContent = `(${matches.length} found)`;
    if (matches.length === 0) {
      resultsDiv.innerHTML = '<div class="search-placeholder">No matching molecules found.</div>';
      return;
    }
    let html = '';
    for (const m of matches.slice(0, 200)) {
      const svg = ChemEngine.getSvg(m.smiles, 80, 80) || '';
      const doi = m.entry['Paper DOI'] || 'Unknown';
      const step = m.entry['Step'] || '?';
      const role = m.field === 'SMILES SM' ? 'Starting Material' : 'Product';
      const truncSmiles = m.smiles.length > 60 ? m.smiles.substring(0, 57) + '...' : m.smiles;
      const safeSmiles = m.smiles.replace(/'/g, "\\'").replace(/"/g, '&quot;');
      const safeDoi = doi.replace(/'/g, "\\'").replace(/"/g, '&quot;');
      html += `<div class="search-result-card" onclick="StructureSearch.showResultDetail('${safeSmiles}','${safeDoi}','${step}','${role}','JS RDKit')">
        <div class="search-result-mol">${svg}</div>
        <div class="search-result-info">
          <div class="search-result-doi">${doi}</div>
          <div class="search-result-smiles" title="${m.smiles}">${truncSmiles}</div>
          <div class="search-result-step">Step ${step} · ${role}</div>
          <span class="search-result-highlight">⚡ JS RDKit match</span>
        </div>
      </div>`;
    }
    resultsDiv.innerHTML = html;
    toast(`Found ${matches.length} matching molecules`, 'success');
  },

  clearResults() {
    const resultsDiv = document.getElementById('searchResults');
    const countSpan = document.getElementById('searchResultCount');
    const input = document.getElementById('searchSmilesInput');
    if (resultsDiv) resultsDiv.innerHTML = '<div class="search-placeholder">Draw a molecular fragment and click "Search" to find matching molecules.</div>';
    if (countSpan) countSpan.textContent = '';
    if (input) input.value = '';
  },

  // ── Result detail modal ──
  _modalData: null,

  showResultDetail(smiles, doi, step, role, matchType) {
    this._modalData = { smiles, doi, step, role };
    // Generate larger SVG for the modal
    const svg = ChemEngine.getSvg(smiles, 300, 220) || `<div style="color:#999;font-size:14px">Structure unavailable</div>`;
    document.getElementById('srMolDisplay').innerHTML = svg;
    document.getElementById('srSmiles').textContent = smiles;
    document.getElementById('srDoi').textContent = doi;
    document.getElementById('srStep').textContent = step;
    document.getElementById('srRole').textContent = role;
    document.getElementById('srMatch').innerHTML = matchType.includes('Python')
      ? '<span style="color:#00c48c">🐍 ' + matchType + '</span>'
      : '<span style="color:var(--accent)">⚡ ' + matchType + '</span>';
    document.getElementById('srOverlay').classList.add('on');
  },

  copySmiles() {
    if (!this._modalData) return;
    navigator.clipboard.writeText(this._modalData.smiles).then(() => {
      toast('SMILES copied to clipboard', 'success');
    }).catch(() => {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = this._modalData.smiles;
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      toast('SMILES copied to clipboard', 'success');
    });
  },

  goFromModal(page) {
    document.getElementById('srOverlay').classList.remove('on');
    if (!this._modalData) return;
    const doi = this._modalData.doi;
    if (page === 'data') {
      goPage('data');
      document.getElementById('searchInput').value = doi;
      DataApp.applyFilters();
    } else if (page === 'visualizer') {
      goPage('visualizer');
      // Auto-select matching DOI in the visualizer sidebar
      setTimeout(() => {
        const vizSearch = document.getElementById('vizSearch');
        if (vizSearch) { vizSearch.value = doi; VisualizerApp.filterDOIs(); }
        // Click the first matching DOI entry
        const doiItems = document.querySelectorAll('.viz-doi-item');
        for (const item of doiItems) {
          if (item.textContent.includes(doi)) { item.click(); break; }
        }
      }, 200);
    }
  }
};
