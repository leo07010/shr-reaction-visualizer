// Init / Main Entry Point

window.onload = async () => {
  // Load data from JSON file
  let data = [];
  try {
    const resp = await fetch('data.json');
    data = await resp.json();
  } catch (e) {
    console.warn('Could not load data.json:', e);
  }

  // Auto-load any CSV files in the project folder
  // Users can drop CSV files alongside data.json and they'll be loaded automatically
  const csvFiles = ['reactions.csv', 'data.csv', 'import.csv', 'shr_data.csv'];
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

  // Initialize Visualizer and Database with shared data
  VisualizerApp.init(data);
  DataApp.init(data);
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
