// ChemEngine - RDKit Core Engine with fallback SMILES parsing, template display & bond highlighting
const ChemEngine = {
  rdkit: null, ready: false,
  Colors: { C:'#000000',O:'#E53935',N:'#2196F3',S:'#FDD835',P:'#FF9800',F:'#4CAF50',Cl:'#4CAF50',Br:'#795548',I:'#9C27B0',H:'#9E9E9E' },

  // Regex patterns for template/placeholder SMILES
  TEMPLATE_RE: /\[R\d*\]|\[R'\]|\[Ar\d*\]|\[XH?\]|\[M\]|\[Lg?\]|\[Nu\]/i,

  // Bond type map: "?" means triple bond, "=" means double, "-" means single
  BOND_ORDER_MAP: { '-': 1, '=': 2, '?': 3, '#': 3 },

  async init() {
    try {
      this.rdkit = await window.initRDKitModule();
      this.ready = true;
      document.getElementById('loadingOverlay').classList.add('hide');
      setTimeout(()=>document.getElementById('loadingOverlay').style.display='none',600);
      const el = document.getElementById('statusRDKit');
      if (el) { el.textContent='RDKit: Ready'; el.style.color='var(--ok)'; }
      return true;
    } catch(e) {
      console.error('RDKit failed:',e);
      document.getElementById('loadingOverlay').classList.add('hide');
      setTimeout(()=>document.getElementById('loadingOverlay').style.display='none',600);
      const el = document.getElementById('statusRDKit');
      if (el) { el.textContent='RDKit: Offline'; el.style.color='var(--danger)'; }
      return false;
    }
  },

  isTemplateSMILES(smiles) {
    if (!smiles) return false;
    return this.TEMPLATE_RE.test(smiles);
  },

  // ═══════════════════════════════════════════
  //  SMILES Parsing with fallbacks
  // ═══════════════════════════════════════════
  _tryGetMol(smiles) {
    if (!this.ready || !smiles) return null;
    let mol;

    // Attempt 1: parse as-is
    try {
      mol = this.rdkit.get_mol(smiles);
      if (mol && mol.is_valid()) return mol;
      if (mol) mol.delete();
    } catch(e) {}

    // Attempt 2: fully kekulize
    try {
      const kekulized = smiles.replace(/(?<!\[)([cnos])/g, (m) => m.toUpperCase());
      if (kekulized !== smiles) {
        mol = this.rdkit.get_mol(kekulized);
        if (mol && mol.is_valid()) return mol;
        if (mol) mol.delete();
      }
    } catch(e) {}

    // Attempt 3: relaxed sanitization
    try {
      mol = this.rdkit.get_mol(smiles, JSON.stringify({sanitize: false}));
      if (mol && mol.is_valid()) return mol;
      if (mol) mol.delete();
    } catch(e) {}

    // Attempt 4: strip charges
    try {
      const stripped = smiles.replace(/\[\w+[+-]\d*\]/g, (m) => {
        const atom = m.match(/\[(\w+)/);
        return atom ? atom[1] : m;
      });
      if (stripped !== smiles) {
        mol = this.rdkit.get_mol(stripped);
        if (mol && mol.is_valid()) return mol;
        if (mol) mol.delete();
      }
    } catch(e) {}

    // Attempt 5: largest fragment
    if (smiles.includes('.')) {
      const parts = smiles.split('.').filter(p => p.trim());
      parts.sort((a, b) => b.length - a.length);
      for (const part of parts) {
        try {
          mol = this.rdkit.get_mol(part);
          if (mol && mol.is_valid()) return mol;
          if (mol) mol.delete();
        } catch(e) {}
        try {
          const kek = part.replace(/(?<!\[)([cnos])/g, m => m.toUpperCase());
          if (kek !== part) {
            mol = this.rdkit.get_mol(kek);
            if (mol && mol.is_valid()) return mol;
            if (mol) mol.delete();
          }
        } catch(e) {}
      }
    }

    // Attempt 6: remove stereochemistry
    try {
      const noStereo = smiles.replace(/@+/g, '').replace(/[/\\]/g, '');
      if (noStereo !== smiles) {
        mol = this.rdkit.get_mol(noStereo);
        if (mol && mol.is_valid()) return mol;
        if (mol) mol.delete();
      }
    } catch(e) {}

    return null;
  },

  // ═══════════════════════════════════════════
  //  SVG Generation (plain)
  // ═══════════════════════════════════════════
  getSvg(smiles, w, h) {
    if (!smiles) return null;

    if (this.ready) {
      const mol = this._tryGetMol(smiles);
      if (mol) {
        try {
          const details = JSON.stringify({
            clearBackground: false,
            addStereoAnnotation: true,
            atomLabelFontSize: 16,
            bondLineWidth: 2,
            multipleBondOffset: 0.2
          });
          return mol.get_svg_with_highlights(details);
        } catch(e) {}
        finally { mol.delete(); }
      }
    }

    return this._generateFallbackSvg(smiles, w || 150, h || 150);
  },

  // ═══════════════════════════════════════════
  //  SVG with Bond Highlighting (formed=green, broken=red)
  // ═══════════════════════════════════════════
  //  SVG with Bond Highlighting (custom colors per bond)
  // ═══════════════════════════════════════════
  // bondItems: array of {desc:"C-N", color:"#00c48c", type:"formed"|"broken"}
  // Falls back to formedBonds/brokenBonds arrays for backward compatibility
  getSvgHighlighted(smiles, w, h, formedBonds, brokenBonds, role, bondItems) {
    if (!smiles) return null;
    if (!this.ready) return this.getSvg(smiles, w, h);

    const mol = this._tryGetMol(smiles);
    if (!mol) return this._generateFallbackSvg(smiles, w || 150, h || 150);

    try {
      let molJSON;
      try { molJSON = mol.get_json(); } catch(e) { molJSON = null; }
      if (!molJSON) {
        const details = JSON.stringify({
          clearBackground: false, addStereoAnnotation: true,
          atomLabelFontSize: 16, bondLineWidth: 2, multipleBondOffset: 0.2
        });
        return mol.get_svg_with_highlights(details);
      }
      const molData = JSON.parse(molJSON);
      const atoms = molData.molecules?.[0]?.atoms || [];
      const bonds = molData.molecules?.[0]?.bonds || [];
      if (!atoms.length || !bonds.length) {
        const details = JSON.stringify({
          clearBackground: false, addStereoAnnotation: true,
          atomLabelFontSize: 16, bondLineWidth: 2, multipleBondOffset: 0.2
        });
        return mol.get_svg_with_highlights(details);
      }

      const ELEMENT_MAP = {1:'H',5:'B',6:'C',7:'N',8:'O',9:'F',12:'Mg',13:'Al',14:'Si',15:'P',16:'S',17:'Cl',
        24:'Cr',25:'Mn',26:'Fe',27:'Co',28:'Ni',29:'Cu',30:'Zn',33:'As',34:'Se',35:'Br',46:'Pd',47:'Ag',
        50:'Sn',53:'I',78:'Pt',79:'Au',80:'Hg',82:'Pb',44:'Ru',45:'Rh',77:'Ir'};

      const atomElements = atoms.map(a => ELEMENT_MAP[a.z] || `#${a.z}`);

      const highlightBonds = [];
      const highlightBondColors = {};
      const highlightAtoms = [];
      const highlightAtomColors = {};

      // Convert hex color to [r,g,b] 0..1 range
      const hexToRgb = (hex) => {
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
        return [parseInt(hex.substring(0,2),16)/255, parseInt(hex.substring(2,4),16)/255, parseInt(hex.substring(4,6),16)/255];
      };

      // Default colors
      const GREEN = [0.0, 0.78, 0.45];
      const RED   = [0.92, 0.15, 0.15];

      // Build unified bond list with per-bond colors
      const allBondDescs = [];
      if (bondItems && bondItems.length) {
        // New format: [{desc, color, type}]
        for (const item of bondItems) {
          allBondDescs.push({ desc: item.desc, color: hexToRgb(item.color) });
        }
      } else {
        // Legacy format: separate formed/broken arrays
        for (const d of (formedBonds || [])) allBondDescs.push({ desc: d, color: GREEN });
        for (const d of (brokenBonds || [])) allBondDescs.push({ desc: d, color: RED });
      }

      // Match each descriptor to molecule bonds
      for (const item of allBondDescs) {
        if (!item.desc) continue;
        const parsed = this._parseBondDescriptor(item.desc);
        if (!parsed) continue;

        for (let bi = 0; bi < bonds.length; bi++) {
          const bond = bonds[bi];
          const aidx1 = bond.atoms[0];
          const aidx2 = bond.atoms[1];
          const elem1 = atomElements[aidx1];
          const elem2 = atomElements[aidx2];
          const bondOrder = bond.bo || 1;

          if (this._bondMatches(elem1, elem2, bondOrder, parsed)) {
            if (!highlightBonds.includes(bi)) {
              highlightBonds.push(bi);
              highlightBondColors[bi] = item.color;
              if (!highlightAtoms.includes(aidx1)) {
                highlightAtoms.push(aidx1);
                highlightAtomColors[aidx1] = item.color;
              }
              if (!highlightAtoms.includes(aidx2)) {
                highlightAtoms.push(aidx2);
                highlightAtomColors[aidx2] = item.color;
              }
            }
            break;
          }
        }
      }

      // Build highlight details
      const details = {
        clearBackground: false,
        addStereoAnnotation: true,
        atomLabelFontSize: 16,
        bondLineWidth: 2,
        multipleBondOffset: 0.2
      };

      if (highlightBonds.length > 0) {
        details.bonds = highlightBonds;
        details.highlightBondColors = highlightBondColors;
        details.atoms = highlightAtoms;
        details.highlightAtomColors = highlightAtomColors;
        details.highlightAtomRadii = {};
        for (const ai of highlightAtoms) {
          details.highlightAtomRadii[ai] = 0.45;
        }
        details.highlightBondWidthMultiplier = 20;
      }

      let svg = mol.get_svg_with_highlights(JSON.stringify(details));

      // Add legend overlay
      if (highlightBonds.length > 0) {
        svg = this._addLegendToSvg(svg, formedBonds, brokenBonds, role);
      }

      // Add numbered circles on atoms for bondItems with order numbers
      if (bondItems && bondItems.some(item => item.order)) {
        svg = this._addNumberedAtomCircles(svg, smiles, bondItems);
      }

      return svg;
    } catch(e) {
      console.warn('Bond highlighting failed:', e);
      // Fallback to plain SVG
      try {
        const details = JSON.stringify({
          clearBackground: false, addStereoAnnotation: true,
          atomLabelFontSize: 16, bondLineWidth: 2, multipleBondOffset: 0.2
        });
        return mol.get_svg_with_highlights(details);
      } catch(e2) { return null; }
    }
    finally { mol.delete(); }
  },

  // Parse bond descriptor like "C-N", "C=O", "C?C" into {elem1, elem2, order}
  _parseBondDescriptor(desc) {
    if (!desc || typeof desc !== 'string') return null;
    // Clean up
    desc = desc.trim();

    // Match patterns: "X-Y", "X=Y", "X?Y", "X#Y"
    // Elements can be 1-2 chars: C, N, O, Br, Cl, Si, Mg, etc.
    const m = desc.match(/^([A-Z][a-z]?)([=\-?#])([A-Z][a-z]?)$/);
    if (!m) {
      // Try without explicit bond type (assume single)
      const m2 = desc.match(/^([A-Z][a-z]?)([A-Z][a-z]?)$/);
      if (m2) return { elem1: m2[1], elem2: m2[2], order: 0 }; // 0 = any order
      return null;
    }
    const order = this.BOND_ORDER_MAP[m[2]] || 0;
    return { elem1: m[1], elem2: m[3], order };
  },

  // Check if a molecule bond matches a descriptor
  _bondMatches(elem1, elem2, bondOrder, parsed) {
    // Skip generic placeholders
    if (parsed.elem1 === 'R' || parsed.elem1 === 'X' || parsed.elem1 === 'M') return false;
    if (parsed.elem2 === 'R' || parsed.elem2 === 'X' || parsed.elem2 === 'M') return false;

    const fwd = (elem1 === parsed.elem1 && elem2 === parsed.elem2);
    const rev = (elem1 === parsed.elem2 && elem2 === parsed.elem1);
    if (!fwd && !rev) return false;

    // If order specified, check it (aromatic bonds are 1.5, treat as either 1 or 2)
    if (parsed.order > 0) {
      if (bondOrder === parsed.order) return true;
      if (bondOrder === 1.5 && (parsed.order === 1 || parsed.order === 2)) return true;
      return false;
    }
    return true; // order 0 = match any
  },

  // ═══════════════════════════════════════════
  //  Add numbered circles on atoms involved in each bond change
  //  Shows order numbers (#1, #2...) with colored circles on each atom
  // ═══════════════════════════════════════════
  _addNumberedAtomCircles(svgStr, smiles, bondItems) {
    if (!svgStr || !smiles || !bondItems) return svgStr;

    // Get atom positions from molecule
    const abData = this.getAtomBondData(smiles);
    if (!abData || !abData.atoms.length) return svgStr;

    const atoms = abData.atoms;
    const molBonds = abData.bonds;
    const vb = abData.viewBox;
    const r = vb[2] * 0.032; // circle radius

    let circles = '';
    const processedKeys = new Set(); // avoid duplicate circles on same atom for same order

    for (const item of bondItems) {
      if (!item.order || !item.desc) continue;

      // Handle descriptors with atom indices like "C(3)-N(7)"
      const descClean = item.desc.replace(/\(\d+\)/g, '');
      const parsed = this._parseBondDescriptor(descClean);
      if (!parsed) continue;

      const isFormed = item.type === 'formed';
      const color = item.color || (isFormed ? '#00c48c' : '#ff6b6b');
      const fillColor = isFormed ? 'rgba(0,196,140,0.25)' : 'rgba(255,107,107,0.25)';

      // If atomIdx is provided, use those directly
      if (item.atomIdx && item.atomIdx.length === 2) {
        const a1 = atoms[item.atomIdx[0]];
        const a2 = atoms[item.atomIdx[1]];
        for (const atom of [a1, a2]) {
          if (!atom) continue;
          const key = `${atom.idx}_${item.order}`;
          if (processedKeys.has(key)) continue;
          processedKeys.add(key);
          circles += `<circle cx="${atom.cx}" cy="${atom.cy}" r="${r}" fill="${fillColor}" stroke="${color}" stroke-width="1.8" opacity="0.9"/>`;
          circles += `<text x="${atom.cx}" y="${atom.cy + r * 0.38}" text-anchor="middle" font-size="${r * 1.4}" font-weight="800" font-family="sans-serif" fill="${color}">${item.order}</text>`;
        }
        continue;
      }

      // Otherwise match by bond descriptor
      for (const b of molBonds) {
        const e1 = atoms[b.a1]?.element;
        const e2 = atoms[b.a2]?.element;
        if (!e1 || !e2) continue;

        if (this._bondMatches(e1, e2, b.bo || 1, parsed)) {
          const a1 = atoms[b.a1];
          const a2 = atoms[b.a2];
          for (const atom of [a1, a2]) {
            if (!atom) continue;
            const key = `${atom.idx}_${item.order}`;
            if (processedKeys.has(key)) continue;
            processedKeys.add(key);
            circles += `<circle cx="${atom.cx}" cy="${atom.cy}" r="${r}" fill="${fillColor}" stroke="${color}" stroke-width="1.8" opacity="0.9"/>`;
            circles += `<text x="${atom.cx}" y="${atom.cy + r * 0.38}" text-anchor="middle" font-size="${r * 1.4}" font-weight="800" font-family="sans-serif" fill="${color}">${item.order}</text>`;
          }
          break; // matched first bond
        }
      }
    }

    if (!circles) return svgStr;
    return svgStr.replace('</svg>', `<g class="bond-number-overlays">${circles}</g></svg>`);
  },

  // Add a small legend overlay at the bottom of the SVG
  _addLegendToSvg(svgStr, formedBonds, brokenBonds, role) {
    if (!svgStr) return svgStr;

    // Show all bond changes on both SM and Product
    const showFormed = formedBonds && formedBonds.length > 0;
    const showBroken = brokenBonds && brokenBonds.length > 0;

    if (!showFormed && !showBroken) return svgStr;

    let legend = '<g class="bond-legend" transform="translate(4, 4)">';
    let ly = 0;

    if (showFormed) {
      legend += `<rect x="0" y="${ly}" width="10" height="10" rx="2" fill="rgba(0,192,115,0.3)" stroke="#00c073" stroke-width="1.5"/>`;
      legend += `<text x="14" y="${ly+9}" font-size="9" fill="#00994d" font-weight="600" font-family="sans-serif">Formed: ${formedBonds.join(', ')}</text>`;
      ly += 14;
    }
    if (showBroken) {
      legend += `<rect x="0" y="${ly}" width="10" height="10" rx="2" fill="rgba(230,40,40,0.3)" stroke="#e62828" stroke-width="1.5"/>`;
      legend += `<text x="14" y="${ly+9}" font-size="9" fill="#cc2020" font-weight="600" font-family="sans-serif">Broken: ${brokenBonds.join(', ')}</text>`;
    }
    legend += '</g>';

    return svgStr.replace('</svg>', legend + '</svg>');
  },

  // ═══════════════════════════════════════════
  //  Fallback SVG (text-based) for unparseable SMILES
  // ═══════════════════════════════════════════
  _generateFallbackSvg(smiles, w, h) {
    const isTemplate = this.isTemplateSMILES(smiles);
    const formatted = this._formatSmilesForDisplay(smiles);
    const lines = formatted.lines;
    const lineHeight = 16;
    const totalTextH = lines.length * lineHeight;
    const startY = Math.max(20, (h - totalTextH) / 2);

    const bgColor = isTemplate ? '#f0f4ff' : '#fff8f0';
    const borderColor = isTemplate ? '#99b3e6' : '#e6c099';
    const labelText = isTemplate ? 'Template' : 'Structure';

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;
    svg += `<rect width="${w}" height="${h}" fill="${bgColor}" rx="4"/>`;
    svg += `<rect x="1" y="1" width="${w-2}" height="${h-2}" fill="none" stroke="${borderColor}" stroke-width="1" rx="4" stroke-dasharray="4,3"/>`;
    svg += `<rect x="${w/2-28}" y="4" width="56" height="16" fill="${borderColor}" rx="8"/>`;
    svg += `<text x="${w/2}" y="15" text-anchor="middle" font-size="9" font-weight="600" fill="white" font-family="monospace">${labelText}</text>`;

    lines.forEach((line, i) => {
      const y = startY + 16 + i * lineHeight;
      const escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      svg += `<text x="${w/2}" y="${y}" text-anchor="middle" font-size="${Math.min(12, w / (line.length * 0.65 + 1))}" font-family="'Courier New',monospace" fill="#333" letter-spacing="-0.5">${escaped}</text>`;
    });

    svg += '</svg>';
    return svg;
  },

  _formatSmilesForDisplay(smiles) {
    const maxChars = 22;
    const lines = [];
    if (smiles.length <= maxChars) {
      lines.push(smiles);
    } else {
      let remaining = smiles;
      while (remaining.length > 0) {
        if (remaining.length <= maxChars) { lines.push(remaining); break; }
        let bp = maxChars;
        for (let i = maxChars; i > maxChars / 2; i--) {
          const ch = remaining[i];
          if (ch === '.' || ch === ')' || ch === ']' || ch === '(' || ch === '[') {
            bp = ch === '.' ? i + 1 : i;
            break;
          }
        }
        lines.push(remaining.substring(0, bp));
        remaining = remaining.substring(bp);
        if (lines.length >= 6) { if (remaining.length > 0) lines.push('...'); break; }
      }
    }
    return { lines };
  },

  // ═══════════════════════════════════════════
  //  Auto-detect bond changes between SM and Product
  //  Compares bond fingerprints (atom-type pairs + bond order)
  //  Returns { formed: ["C-N", ...], broken: ["C=O", ...] }
  // ═══════════════════════════════════════════
  detectBondChanges(smilesSM, smilesProduct) {
    if (!this.ready || !smilesSM || !smilesProduct) return null;
    if (this.isTemplateSMILES(smilesSM) || this.isTemplateSMILES(smilesProduct)) return null;

    const ELEMENT_MAP = {1:'H',5:'B',6:'C',7:'N',8:'O',9:'F',12:'Mg',13:'Al',14:'Si',15:'P',16:'S',17:'Cl',
      24:'Cr',25:'Mn',26:'Fe',27:'Co',28:'Ni',29:'Cu',30:'Zn',33:'As',34:'Se',35:'Br',46:'Pd',47:'Ag',
      50:'Sn',53:'I',78:'Pt',79:'Au',80:'Hg',82:'Pb',44:'Ru',45:'Rh',77:'Ir'};
    const ORDER_SYM = {1:'-', 2:'=', 3:'#', 1.5:'~'};

    const getBondSet = (smiles) => {
      const mol = this._tryGetMol(smiles);
      if (!mol) return null;
      try {
        let molJSON;
        try { molJSON = mol.get_json(); } catch(e) { return null; }
        if (!molJSON) return null;
        const data = JSON.parse(molJSON);
        const atoms = data.molecules?.[0]?.atoms || [];
        const bonds = data.molecules?.[0]?.bonds || [];
        // Build a multiset of bond descriptors "ELEM1{sym}ELEM2" (sorted alphabetically)
        const bondMap = new Map(); // "C-N" → count
        for (const b of bonds) {
          const e1 = ELEMENT_MAP[atoms[b.atoms[0]]?.z] || '?';
          const e2 = ELEMENT_MAP[atoms[b.atoms[1]]?.z] || '?';
          const order = b.bo || 1;
          const sym = ORDER_SYM[order] || '-';
          // Sort elements alphabetically so C-N == N-C
          const pair = [e1, e2].sort();
          const key = `${pair[0]}${sym}${pair[1]}`;
          bondMap.set(key, (bondMap.get(key) || 0) + 1);
        }
        return bondMap;
      } catch(e) { return null; }
      finally { mol.delete(); }
    };

    const smBonds = getBondSet(smilesSM);
    const prodBonds = getBondSet(smilesProduct);
    if (!smBonds || !prodBonds) return null;

    // Find bonds in product but not in SM → formed
    // Find bonds in SM but not in product → broken
    const formed = [];
    const broken = [];

    // Compare counts: for each bond type, diff = prod_count - sm_count
    const allKeys = new Set([...smBonds.keys(), ...prodBonds.keys()]);
    for (const key of allKeys) {
      const smCount = smBonds.get(key) || 0;
      const prodCount = prodBonds.get(key) || 0;
      const diff = prodCount - smCount;
      if (diff > 0) {
        for (let i = 0; i < diff; i++) formed.push(key);
      } else if (diff < 0) {
        for (let i = 0; i < -diff; i++) broken.push(key);
      }
    }

    return { formed, broken };
  },

  // ═══════════════════════════════════════════
  //  Get atom positions & bond connectivity for interactive marking
  //  Returns {atoms: [{idx, cx, cy, element}], bonds: [{idx, a1, a2, order}], viewBox}
  // ═══════════════════════════════════════════
  getAtomBondData(smiles) {
    if (!this.ready || !smiles) return null;
    if (this.isTemplateSMILES(smiles)) return null;

    const mol = this._tryGetMol(smiles);
    if (!mol) return null;

    try {
      let molJSON;
      try { molJSON = mol.get_json(); } catch(e) { return null; }
      if (!molJSON) return null;

      const molData = JSON.parse(molJSON);
      const atoms = molData.molecules?.[0]?.atoms || [];
      const bonds = molData.molecules?.[0]?.bonds || [];
      if (!atoms.length) return null;

      const ELEMENT_MAP = {1:'H',5:'B',6:'C',7:'N',8:'O',9:'F',12:'Mg',13:'Al',14:'Si',15:'P',16:'S',17:'Cl',
        24:'Cr',25:'Mn',26:'Fe',27:'Co',28:'Ni',29:'Cu',30:'Zn',33:'As',34:'Se',35:'Br',46:'Pd',47:'Ag',
        50:'Sn',53:'I',78:'Pt',79:'Au',80:'Hg',82:'Pb',44:'Ru',45:'Rh',77:'Ir'};

      // Generate SVG with ALL atoms highlighted to extract their positions
      const allIdx = atoms.map((_, i) => i);
      const colors = {};
      const radii = {};
      allIdx.forEach(i => { colors[i] = [0.8, 0.8, 0.8]; radii[i] = 0.25; });

      const details = JSON.stringify({
        clearBackground: false,
        atoms: allIdx,
        highlightAtomColors: colors,
        highlightAtomRadii: radii,
        bonds: [],
        highlightBondColors: {}
      });

      const svg = mol.get_svg_with_highlights(details);
      if (!svg) return null;

      // Parse SVG to extract ellipse positions (atom highlight circles)
      const parser = new DOMParser();
      const doc = parser.parseFromString(svg, 'image/svg+xml');
      const ellipses = doc.querySelectorAll('ellipse');

      // Get SVG viewBox
      const svgEl = doc.querySelector('svg');
      const vbAttr = svgEl?.getAttribute('viewBox');
      const viewBox = vbAttr ? vbAttr.split(/[\s,]+/).map(Number) : [0, 0, 250, 200];

      // Build atom data from ellipse positions
      // RDKit draws one ellipse per highlighted atom, in atom index order
      const atomData = [];
      for (let i = 0; i < Math.min(ellipses.length, atoms.length); i++) {
        const el = ellipses[i];
        atomData.push({
          idx: i,
          cx: parseFloat(el.getAttribute('cx')),
          cy: parseFloat(el.getAttribute('cy')),
          element: ELEMENT_MAP[atoms[i].z] || '?'
        });
      }

      // If ellipses count doesn't match atoms, try fallback via molblock coordinates
      if (atomData.length < atoms.length) {
        try {
          const mb = mol.get_molblock();
          if (mb) {
            const lines = mb.split('\n');
            // Find counts line (V2000 format: line 4 has atom count)
            const countsLine = lines[3];
            const nAtoms = parseInt(countsLine.substring(0, 3).trim());
            // Collect coordinates from atom block (lines 4..4+nAtoms-1)
            const coords = [];
            for (let i = 0; i < nAtoms && i < atoms.length; i++) {
              const al = lines[4 + i];
              if (!al) continue;
              const x = parseFloat(al.substring(0, 10).trim());
              const y = parseFloat(al.substring(10, 20).trim());
              coords.push({ x, y });
            }
            if (coords.length === atoms.length && atomData.length === 0) {
              // Map mol coords to SVG viewport
              let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
              for (const c of coords) {
                if (c.x < minX) minX = c.x;
                if (c.x > maxX) maxX = c.x;
                if (c.y < minY) minY = c.y;
                if (c.y > maxY) maxY = c.y;
              }
              const molW = maxX - minX || 1;
              const molH = maxY - minY || 1;
              const svgW = viewBox[2];
              const svgH = viewBox[3];
              const padding = 0.12;
              const usableW = svgW * (1 - 2 * padding);
              const usableH = svgH * (1 - 2 * padding);
              const scale = Math.min(usableW / molW, usableH / molH);
              const offsetX = svgW / 2;
              const offsetY = svgH / 2;
              const cx0 = (minX + maxX) / 2;
              const cy0 = (minY + maxY) / 2;

              for (let i = 0; i < atoms.length; i++) {
                atomData.push({
                  idx: i,
                  cx: offsetX + (coords[i].x - cx0) * scale,
                  cy: offsetY - (coords[i].y - cy0) * scale, // Y is flipped
                  element: ELEMENT_MAP[atoms[i].z] || '?'
                });
              }
            }
          }
        } catch(e) { /* fallback failed, proceed with what we have */ }
      }

      // Build bond data
      const bondData = bonds.map((b, i) => ({
        idx: i,
        a1: b.atoms[0],
        a2: b.atoms[1],
        order: b.bo || 1
      }));

      return { atoms: atomData, bonds: bondData, viewBox };
    } catch(e) {
      console.warn('getAtomBondData failed:', e);
      return null;
    } finally {
      mol.delete();
    }
  },

  getMolBlock(smiles) {
    if (!this.ready || !smiles) return null;
    const mol = this._tryGetMol(smiles);
    if (!mol) return null;
    try { return mol.get_molblock(); }
    catch(e) { return null; }
    finally { mol.delete(); }
  },

  getSmilesFromMolBlock(mb) {
    if (!this.ready || !mb) return null;
    let mol;
    try {
      mol = this.rdkit.get_mol(mb);
      if (!mol || !mol.is_valid()) return null;
      return mol.get_smiles();
    } catch(e) { return null; }
    finally { if (mol) mol.delete(); }
  },

  substructureMatch(t, q) {
    if (!this.ready || !t || !q) return false;
    const tm = this._tryGetMol(t);
    const qm = this._tryGetMol(q);
    try {
      if (tm && qm) return tm.get_substruct_match(qm) !== '{}';
    } catch(e) {}
    finally {
      if (tm) tm.delete();
      if (qm) qm.delete();
    }
    return false;
  },

  canRender(smiles) {
    if (!this.ready || !smiles) return false;
    const mol = this._tryGetMol(smiles);
    if (mol) { mol.delete(); return true; }
    return false;
  }
};
