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
//  Draw molecular fragments and search via RDKit substructure matching
// ═══════════════════════════════════════════
const StructureSearch = {
  db: [],
  ketcherLoaded: false,

  init(data) {
    this.db = data || [];
  },

  // Load Ketcher in the search page iframe
  loadKetcher() {
    const frame = document.getElementById('searchKetcherFrame');
    if (!frame) return;
    if (!frame.src || frame.src === '' || frame.src === window.location.href) {
      frame.src = 'https://unpkg.com/ketcher-standalone@2.26.0/dist/index.html';
      this.ketcherLoaded = true;
    }
  },

  // Get SMILES from Ketcher editor
  async getFromKetcher() {
    const frame = document.getElementById('searchKetcherFrame');
    if (!frame || !frame.contentWindow) {
      toast('Ketcher editor is loading...', 'info');
      return;
    }
    try {
      const ketcher = frame.contentWindow.ketcher;
      if (!ketcher) {
        toast('Ketcher API not ready yet. Please wait a moment.', 'info');
        return;
      }
      let smiles = '';
      if (ketcher.getSmiles) {
        smiles = await ketcher.getSmiles();
      }
      if (smiles && smiles.trim()) {
        document.getElementById('searchSmilesInput').value = smiles.trim();
        toast(`Got SMILES: ${smiles.trim()}`, 'success');
      } else {
        toast('No structure drawn. Please draw a molecule fragment first.', 'info');
      }
    } catch (e) {
      console.warn('Ketcher API error:', e);
      toast('Could not get SMILES from editor. Type SMILES manually.', 'error');
    }
  },

  // Run substructure search using RDKit
  runSearch() {
    const query = document.getElementById('searchSmilesInput')?.value?.trim();
    if (!query) {
      toast('Please enter a SMILES or SMARTS query', 'info');
      return;
    }

    if (!ChemEngine.ready) {
      toast('RDKit is not ready yet', 'error');
      return;
    }

    const resultsDiv = document.getElementById('searchResults');
    const countSpan = document.getElementById('searchResultCount');
    if (!resultsDiv) return;

    // Try as SMARTS first, then as SMILES
    let qmol = null;
    try {
      qmol = ChemEngine.rdkit.get_qmol(query);
      if (!qmol || !qmol.is_valid()) {
        if (qmol) qmol.delete();
        qmol = null;
      }
    } catch (e) { qmol = null; }

    if (!qmol) {
      try {
        const mol = ChemEngine.rdkit.get_mol(query);
        if (mol && mol.is_valid()) {
          // Convert to SMARTS-like query
          qmol = ChemEngine.rdkit.get_qmol(query);
        }
        if (mol) mol.delete();
      } catch (e) {}
    }

    if (!qmol) {
      toast('Invalid SMILES/SMARTS query', 'error');
      return;
    }

    // Search all entries
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
          if (mol && mol.is_valid()) {
            const match = mol.get_substruct_match(qmol);
            if (match && match !== '{}') {
              seen.add(key);
              matches.push({
                entry,
                field,
                smiles,
                matchData: match
              });
            }
          }
        } catch (e) {}
        finally { if (mol) mol.delete(); }
      }
    }

    qmol.delete();

    // Render results
    if (countSpan) countSpan.textContent = `(${matches.length} found)`;

    if (matches.length === 0) {
      resultsDiv.innerHTML = '<div class="search-placeholder">No matching molecules found for this substructure.</div>';
      return;
    }

    let html = '';
    for (const m of matches.slice(0, 200)) { // limit to 200 results
      const svg = ChemEngine.getSvg(m.smiles, 80, 80) || '';
      const doi = m.entry['Paper DOI'] || 'Unknown';
      const step = m.entry['Step'] || '?';
      const role = m.field === 'SMILES SM' ? 'Starting Material' : 'Product';
      const truncSmiles = m.smiles.length > 60 ? m.smiles.substring(0, 57) + '...' : m.smiles;

      html += `<div class="search-result-card" onclick="goPage('data');document.getElementById('searchInput').value='${doi.replace(/'/g, "\\'")}';DataApp.applyFilters()">
        <div class="search-result-mol">${svg}</div>
        <div class="search-result-info">
          <div class="search-result-doi">${doi}</div>
          <div class="search-result-smiles" title="${m.smiles}">${truncSmiles}</div>
          <div class="search-result-step">Step ${step} · ${role}</div>
          <span class="search-result-highlight">Substructure match</span>
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
  }
};
