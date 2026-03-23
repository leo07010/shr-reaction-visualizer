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

  // Replace template placeholders [R], [R1], [R2], [Ar], etc. with RDKit dummy atoms [*]
  // so that template SMILES can still be rendered as molecules with * at generic positions
  _replaceTemplatePlaceholders(smiles) {
    if (!smiles) return smiles;
    // [R1] → [*:1], [R2] → [*:2], [R'] → [*:3], [R] → [*]
    // [Ar] → [*:10], [X] → [*:11], [M] → [*:12], [L] → [*:13], [Nu] → [*:14], [Lg] → [*:15]
    let s = smiles;
    s = s.replace(/\[R(\d+)\]/g, (_, n) => `[*:${n}]`);
    s = s.replace(/\[R'\]/g, '[*:3]');
    s = s.replace(/\[R\]/g, '[*]');
    s = s.replace(/\[Ar(\d*)\]/gi, (_, n) => n ? `[*:${10 + parseInt(n)}]` : '[*:10]');
    s = s.replace(/\[XH?\]/gi, '[*:11]');
    s = s.replace(/\[M\]/gi, '[*:12]');
    s = s.replace(/\[Lg?\]/gi, '[*:13]');
    s = s.replace(/\[Nu\]/gi, '[*:14]');
    return s;
  },

  // ═══════════════════════════════════════════
  //  SMILES Parsing with fallbacks
  // ═══════════════════════════════════════════
  _tryGetMol(smiles) {
    if (!this.ready || !smiles) return null;
    let mol;

    // Attempt 0: if template SMILES, replace placeholders with dummy atoms first
    if (this.isTemplateSMILES(smiles)) {
      const converted = this._replaceTemplatePlaceholders(smiles);
      try {
        mol = this.rdkit.get_mol(converted);
        if (mol && mol.is_valid()) return mol;
        if (mol) mol.delete();
      } catch(e) {}
      // Also try with relaxed sanitization
      try {
        mol = this.rdkit.get_mol(converted, JSON.stringify({sanitize: false}));
        if (mol && mol.is_valid()) return mol;
        if (mol) mol.delete();
      } catch(e) {}
      // Try without stereochemistry
      try {
        const noStereo = converted.replace(/@+/g, '').replace(/[/\\]/g, '');
        mol = this.rdkit.get_mol(noStereo);
        if (mol && mol.is_valid()) return mol;
        if (mol) mol.delete();
      } catch(e) {}
    }

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
    const sw = w || 250;
    const sh = h || 200;

    if (this.ready) {
      const mol = this._tryGetMol(smiles);
      if (mol) {
        try {
          // Scale font/line for larger renders
          const scale = Math.min(sw, sh) / 200;
          const fontSize = Math.max(12, Math.round(14 * scale));
          const lineWidth = Math.max(1.5, 1.8 * scale);
          const details = JSON.stringify({
            width: sw,
            height: sh,
            clearBackground: false,
            addStereoAnnotation: true,
            atomLabelFontSize: fontSize,
            bondLineWidth: lineWidth,
            multipleBondOffset: 0.2,
            padding: 0.12
          });
          return mol.get_svg_with_highlights(details);
        } catch(e) {}
        finally { mol.delete(); }
      }
    }

    return this._generateFallbackSvg(smiles, sw, sh);
  },

  // ═══════════════════════════════════════════
  //  SVG with Bond Highlighting (formed=green, broken=red)
  // ═══════════════════════════════════════════
  //  SVG with Bond Highlighting (custom colors per bond)
  // ═══════════════════════════════════════════
  // bondItems: array of {desc:"C-N", color:"#00c48c", type:"formed"|"broken"}
  // Falls back to formedBonds/brokenBonds arrays for backward compatibility
  // displayMode: 'bar' (default), 'color-only' (no atom overlays), 'superscript' (small superscript numbers)
  getSvgHighlighted(smiles, w, h, formedBonds, brokenBonds, role, bondItems, displayMode) {
    if (!smiles) return null;
    const sw = w || 250;
    const sh = h || 200;
    if (!this.ready) return this.getSvg(smiles, sw, sh);

    const mol = this._tryGetMol(smiles);
    if (!mol) return this._generateFallbackSvg(smiles, sw, sh);

    // Scale font/line for larger renders
    const scale = Math.min(sw, sh) / 200;
    const fontSize = Math.max(12, Math.round(14 * scale));
    const lineWidth = Math.max(1.5, 1.8 * scale);

    try {
      let molJSON;
      try { molJSON = mol.get_json(); } catch(e) { molJSON = null; }
      if (!molJSON) {
        const details = JSON.stringify({
          width: sw, height: sh,
          clearBackground: false, addStereoAnnotation: true,
          atomLabelFontSize: fontSize, bondLineWidth: lineWidth, multipleBondOffset: 0.2, padding: 0.12
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

      // CommonChem JSON default: z=6 (Carbon) is omitted, so atoms without z are Carbon
      const atomElements = atoms.map(a => ELEMENT_MAP[a.z || 6] || `#${a.z}`);

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

      // Build unified bond list — show ALL bond changes on BOTH SM and Product
      // so users can trace atoms: left molecule → right molecule by order numbers
      const allBondDescs = [];
      if (bondItems && bondItems.length) {
        for (const item of bondItems) {
          const cleanDesc = item.desc ? item.desc.replace(/\(\d+\)/g, '') : item.desc;
          allBondDescs.push({
            desc: cleanDesc, color: hexToRgb(item.color), order: item.order,
            type: item.type, rawColor: item.color,
            smAtoms: item.smAtoms || null,     // exact atom indices from MCS
            prodAtoms: item.prodAtoms || null   // exact atom indices from MCS
          });
        }
      } else {
        for (const d of (formedBonds || [])) allBondDescs.push({ desc: d, color: GREEN, type: 'formed' });
        for (const d of (brokenBonds || [])) allBondDescs.push({ desc: d, color: RED, type: 'broken' });
      }

      // Track which atom belongs to which bond changes (supports multiple per atom)
      const atomBondOrderMap = {}; // atomIdx → [{order, rawColor, type}]

      // Compute implicit H count per atom for X-H bond matching
      // valence map: expected default valence for common elements
      const VALENCE_MAP = { C:4, N:3, O:2, S:2, P:3, F:1, Cl:1, Br:1, I:1, Si:4, B:3, Se:2 };
      const atomExplicitBondOrder = new Array(atoms.length).fill(0);
      for (const b of bonds) {
        const bo = b.bo || 1;
        atomExplicitBondOrder[b.atoms[0]] += bo;
        atomExplicitBondOrder[b.atoms[1]] += bo;
      }
      // Account for charges
      const atomCharges = atoms.map(a => a.chg || 0);
      const atomImplicitH = atoms.map((a, i) => {
        const elem = atomElements[i];
        const valence = VALENCE_MAP[elem];
        if (!valence) return 0;
        const charge = atomCharges[i];
        const expected = valence - charge; // simplified: charge reduces available bonds
        const implH = Math.max(0, expected - atomExplicitBondOrder[i]);
        return implH;
      });

      // Match each descriptor to molecule bonds
      const matchedDescs = new Set(); // track which descriptors were matched

      for (let di = 0; di < allBondDescs.length; di++) {
        const item = allBondDescs[di];
        if (!item.desc) continue;

        // ─── Fast path: use exact MCS atom indices if available ───
        const mcsAtoms = (role === 'sm') ? item.smAtoms : (role === 'product') ? item.prodAtoms : null;
        if (mcsAtoms && mcsAtoms.length && mcsAtoms.every(a => a !== null && a !== undefined && a < atoms.length)) {
          // Highlight the specific atoms from MCS mapping
          for (const aidx of mcsAtoms) {
            if (!highlightAtoms.includes(aidx)) {
              highlightAtoms.push(aidx);
              highlightAtomColors[aidx] = item.color;
            }
            if (item.order) {
              if (!atomBondOrderMap[aidx]) atomBondOrderMap[aidx] = [];
              atomBondOrderMap[aidx].push({ order: item.order, rawColor: item.rawColor, type: item.type });
            }
          }
          // Also try to highlight the bond between these atoms if it exists
          if (mcsAtoms.length === 2) {
            for (let bi = 0; bi < bonds.length; bi++) {
              const bond = bonds[bi];
              const ba1 = bond.atoms[0], ba2 = bond.atoms[1];
              if ((ba1 === mcsAtoms[0] && ba2 === mcsAtoms[1]) ||
                  (ba1 === mcsAtoms[1] && ba2 === mcsAtoms[0])) {
                if (!highlightBonds.includes(bi)) {
                  highlightBonds.push(bi);
                  highlightBondColors[bi] = item.color;
                }
                break;
              }
            }
          }
          matchedDescs.add(di);
          continue;  // skip pattern matching
        }

        const parsed = this._parseBondDescriptor(item.desc);
        if (!parsed) continue;
        const involvesH = parsed.elem1 === 'H' || parsed.elem2 === 'H';

        if (involvesH) {
          // ─── Implicit H bond matching ───
          // Find the non-H element atom that has implicit hydrogens
          const nonHElem = parsed.elem1 === 'H' ? parsed.elem2 : parsed.elem1;
          let matched = false;
          for (let ai = 0; ai < atomElements.length; ai++) {
            if (atomElements[ai] !== nonHElem) continue;
            if (atomImplicitH[ai] <= 0) continue;
            // Check this atom isn't already used for the same descriptor type
            const alreadyUsedForThis = Object.entries(atomBondOrderMap).some(
              ([idx, info]) => parseInt(idx) === ai && info.order === item.order
            );
            if (alreadyUsedForThis) continue;

            // Highlight this atom (no specific bond to highlight for X-H)
            if (!highlightAtoms.includes(ai)) {
              highlightAtoms.push(ai);
              highlightAtomColors[ai] = item.color;
            }
            if (item.order) {
              if (!atomBondOrderMap[ai]) atomBondOrderMap[ai] = [];
              atomBondOrderMap[ai].push({ order: item.order, rawColor: item.rawColor, type: item.type });
            }
            matchedDescs.add(di);
            atomImplicitH[ai]--; // consume one implicit H
            matched = true;
            break;
          }
        } else {
          // ─── Normal explicit bond matching ───
          // Key insight: a FORMED bond exists in Product but NOT in SM.
          // A BROKEN bond exists in SM but NOT in Product.
          // When highlighting on the "wrong" molecule (formed on SM, broken on Product),
          // we should find UNBONDED atom pairs instead of matching existing bonds.
          const isReverse = (item.type === 'formed' && role === 'sm') ||
                            (item.type === 'broken' && role === 'product');

          if (isReverse) {
            // ─── Reverse matching: find unbonded atom pairs ───
            // Build set of bonded atom pairs for quick lookup
            const bondedSet = new Set();
            for (const b of bonds) {
              const a1 = b.atoms[0], a2 = b.atoms[1];
              bondedSet.add(`${Math.min(a1,a2)}-${Math.max(a1,a2)}`);
            }

            // Find all unbonded pairs of matching elements
            let bestPair = null;
            let bestScore = -1;
            for (let ai = 0; ai < atomElements.length; ai++) {
              for (let aj = ai + 1; aj < atomElements.length; aj++) {
                const e1 = atomElements[ai], e2 = atomElements[aj];
                const fwd = (e1 === parsed.elem1 && e2 === parsed.elem2);
                const rev = (e1 === parsed.elem2 && e2 === parsed.elem1);
                if (!fwd && !rev) continue;

                // Must NOT be bonded to each other
                const pairKey = `${Math.min(ai,aj)}-${Math.max(ai,aj)}`;
                if (bondedSet.has(pairKey)) continue;

                // Skip atoms already used for another bond descriptor with same order
                const alreadyUsed = (atomBondOrderMap[ai] || []).some(x => x.order === item.order) ||
                                    (atomBondOrderMap[aj] || []).some(x => x.order === item.order);
                if (alreadyUsed) continue;

                // Score: prefer atoms with more implicit H (available valence)
                const score = (atomImplicitH[ai] || 0) + (atomImplicitH[aj] || 0);
                if (score > bestScore) {
                  bestScore = score;
                  bestPair = [ai, aj];
                }
              }
            }

            if (bestPair) {
              const [aidx1, aidx2] = bestPair;
              if (!highlightAtoms.includes(aidx1)) {
                highlightAtoms.push(aidx1);
                highlightAtomColors[aidx1] = item.color;
              }
              if (!highlightAtoms.includes(aidx2)) {
                highlightAtoms.push(aidx2);
                highlightAtomColors[aidx2] = item.color;
              }
              if (item.order) {
                if (!atomBondOrderMap[aidx1]) atomBondOrderMap[aidx1] = [];
                atomBondOrderMap[aidx1].push({ order: item.order, rawColor: item.rawColor, type: item.type });
                if (!atomBondOrderMap[aidx2]) atomBondOrderMap[aidx2] = [];
                atomBondOrderMap[aidx2].push({ order: item.order, rawColor: item.rawColor, type: item.type });
              }
              matchedDescs.add(di);
            }
          } else {
            // ─── Forward matching: bond EXISTS on this molecule ───
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
                if (item.order) {
                  if (!atomBondOrderMap[aidx1]) atomBondOrderMap[aidx1] = [];
                  atomBondOrderMap[aidx1].push({ order: item.order, rawColor: item.rawColor, type: item.type });
                  if (!atomBondOrderMap[aidx2]) atomBondOrderMap[aidx2] = [];
                  atomBondOrderMap[aidx2].push({ order: item.order, rawColor: item.rawColor, type: item.type });
                }
                matchedDescs.add(di);
                break;
              }
            }
          }
        }
      }

      // Build highlight details
      const details = {
        width: sw,
        height: sh,
        clearBackground: false,
        addStereoAnnotation: true,
        atomLabelFontSize: fontSize,
        bondLineWidth: lineWidth,
        multipleBondOffset: 0.2,
        padding: 0.12
      };

      if (highlightBonds.length > 0) {
        details.bonds = highlightBonds;
        details.highlightBondColors = highlightBondColors;
        details.highlightBondWidthMultiplier = 8;
      }
      // No atom circle highlights — we use text labels instead

      let svg = mol.get_svg_with_highlights(JSON.stringify(details));

      // Add legend overlay (only for legacy formedBonds/brokenBonds path)
      if (!bondItems && (highlightBonds.length > 0 || highlightAtoms.length > 0)) {
        svg = this._addLegendToSvg(svg, formedBonds, brokenBonds, role);
      }

      // Add atom overlays based on display mode
      const dMode = displayMode || 'bar';
      if (dMode !== 'color-only' && Object.keys(atomBondOrderMap).length > 0) {
        // Get precise atom positions using SAME dimensions as the final SVG
        const atomPositions = this._getAtomPositionsFromMol(mol, atoms.length, sw, sh, fontSize, lineWidth);
        if (atomPositions) {
          svg = this._addNumberedAtomCircles(svg, atomPositions, atomBondOrderMap, dMode);
        }
      }

      return svg;
    } catch(e) {
      console.warn('Bond highlighting failed:', e);
      // Fallback to plain SVG
      try {
        const details = JSON.stringify({
          width: sw, height: sh,
          clearBackground: false, addStereoAnnotation: true,
          atomLabelFontSize: fontSize, bondLineWidth: lineWidth, multipleBondOffset: 0.2, padding: 0.12
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
  //  Get precise atom positions by rendering a probe SVG with all atoms highlighted
  //  Uses the SAME mol object AND SAME dimensions as the final SVG
  //  Returns: [{idx, cx, cy}] or null
  // ═══════════════════════════════════════════
  _getAtomPositionsFromMol(mol, nAtoms, w, h, atomLabelFontSize, bondLineWidth) {
    try {
      // Render an SVG with ALL atoms highlighted as tiny dots — just to extract their screen positions
      // CRITICAL: use the SAME width/height/padding as the final SVG so coordinates match
      const allIdx = [];
      const colors = {};
      const radii = {};
      for (let i = 0; i < nAtoms; i++) {
        allIdx.push(i);
        colors[i] = [0.95, 0.95, 0.95];
        radii[i] = 0.25;
      }
      const probeDetails = JSON.stringify({
        width: w || undefined,
        height: h || undefined,
        atomLabelFontSize: atomLabelFontSize || undefined,
        bondLineWidth: bondLineWidth || undefined,
        multipleBondOffset: 0.2,
        padding: 0.12,
        clearBackground: false,
        atoms: allIdx,
        highlightAtomColors: colors,
        highlightAtomRadii: radii,
        bonds: [],
        highlightBondColors: {}
      });
      const probeSvg = mol.get_svg_with_highlights(probeDetails);
      if (!probeSvg) return null;

      // Parse probe SVG to extract ellipse positions
      const parser = new DOMParser();
      const doc = parser.parseFromString(probeSvg, 'image/svg+xml');
      let ellipses = doc.querySelectorAll('ellipse');

      if (ellipses.length < nAtoms) {
        // Fallback: try molblock coordinate mapping
        return this._getAtomCoordsViaMolblock(mol, nAtoms, probeSvg);
      }

      const positions = [];
      for (let i = 0; i < Math.min(ellipses.length, nAtoms); i++) {
        positions.push({
          idx: i,
          cx: parseFloat(ellipses[i].getAttribute('cx')),
          cy: parseFloat(ellipses[i].getAttribute('cy'))
        });
      }
      return positions;
    } catch (e) {
      console.warn('_getAtomPositionsFromMol failed:', e);
      return null;
    }
  },

  // Fallback: extract coordinates from molblock and map to SVG viewport
  _getAtomCoordsViaMolblock(mol, nAtoms, referenceSvg) {
    try {
      const mb = mol.get_molblock();
      if (!mb) return null;

      const lines = mb.split('\n');
      const nAtomsFromMol = parseInt(lines[3].substring(0, 3).trim());
      const molCoords = [];
      for (let i = 0; i < Math.min(nAtomsFromMol, nAtoms); i++) {
        const al = lines[4 + i];
        if (!al) continue;
        molCoords.push({
          x: parseFloat(al.substring(0, 10).trim()),
          y: parseFloat(al.substring(10, 20).trim())
        });
      }
      if (molCoords.length < nAtoms) return null;

      // Get SVG viewBox
      const vbMatch = referenceSvg.match(/viewBox=['"]([\d.\s,eE+-]+)['"]/);
      if (!vbMatch) return null;
      const vb = vbMatch[1].split(/[\s,]+/).map(Number);
      const svgW = vb[2], svgH = vb[3];

      // Map mol coords to SVG space
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const c of molCoords) {
        if (c.x < minX) minX = c.x;
        if (c.x > maxX) maxX = c.x;
        if (c.y < minY) minY = c.y;
        if (c.y > maxY) maxY = c.y;
      }
      const molW = maxX - minX || 1;
      const molH = maxY - minY || 1;
      const padding = 0.12;
      const usableW = svgW * (1 - 2 * padding);
      const usableH = svgH * (1 - 2 * padding);
      const scale = Math.min(usableW / molW, usableH / molH);
      const cx0 = (minX + maxX) / 2;
      const cy0 = (minY + maxY) / 2;

      const positions = [];
      for (let i = 0; i < nAtoms; i++) {
        positions.push({
          idx: i,
          cx: svgW / 2 + (molCoords[i].x - cx0) * scale,
          cy: svgH / 2 - (molCoords[i].y - cy0) * scale
        });
      }
      return positions;
    } catch (e) {
      console.warn('_getAtomCoordsViaMolblock failed:', e);
      return null;
    }
  },

  // ═══════════════════════════════════════════
  //  Add colored bar + text label overlays on atoms involved in bond changes
  //  Green = formed only, Red = broken only, Purple = both
  //  Each atom shows a colored underline bar + order label (F1, B2, etc.)
  //  so users can trace SM ↔ Product
  // ═══════════════════════════════════════════
  _addNumberedAtomCircles(svgStr, atomPositions, atomBondOrderMap, displayMode) {
    if (!svgStr || !atomPositions || !atomBondOrderMap) return svgStr;
    if (Object.keys(atomBondOrderMap).length === 0) return svgStr;

    const dMode = displayMode || 'bar';
    const vbMatch = svgStr.match(/viewBox=['"]([\d.\s,eE+-]+)['"]/);
    const vb = vbMatch ? vbMatch[1].split(/[\s,]+/).map(Number) : [0, 0, 250, 200];
    const fontSize = dMode === 'superscript' ? vb[2] * 0.02 : vb[2] * 0.026;
    const barH = vb[2] * 0.009;       // color bar height (thin underline)
    const barW = vb[2] * 0.045;       // color bar width

    const COLORS = {
      formed: { bar: '#00a86b', barFill: 'rgba(0,168,107,0.75)', text: '#00a86b' },
      broken: { bar: '#d63031', barFill: 'rgba(214,48,49,0.75)', text: '#d63031' },
      both:   { bar: '#7c3aed', barFill: 'rgba(124,58,237,0.75)', text: '#7c3aed' }
    };

    let overlays = '';
    const processedAtoms = new Set();

    for (const [atomIdxStr, entries] of Object.entries(atomBondOrderMap)) {
      const atomIdx = parseInt(atomIdxStr);
      if (!entries || !entries.length) continue;
      if (processedAtoms.has(atomIdx)) continue;
      processedAtoms.add(atomIdx);

      const pos = atomPositions[atomIdx];
      if (!pos) continue;

      // Deduplicate by order
      const seen = new Set();
      const unique = entries.filter(e => {
        const k = `${e.type}_${e.order}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      // Determine color: formed only / broken only / both
      const types = new Set(unique.map(e => e.type));
      const hasFormed = types.has('formed');
      const hasBroken = types.has('broken');
      let atomRole;
      if (hasFormed && hasBroken) atomRole = 'both';
      else if (hasFormed) atomRole = 'formed';
      else atomRole = 'broken';

      const c = COLORS[atomRole];

      const labelParts = unique.map(e => {
        const prefix = e.type === 'formed' ? 'F' : 'B';
        return { text: `${prefix}${e.order}`, type: e.type };
      });

      if (dMode === 'superscript') {
        // ── Superscript mode: small colored text at top-right of atom ──
        const supX = pos.cx + fontSize * 0.6;
        const supY = pos.cy - fontSize * 0.5;
        const fullLabel = labelParts.map(p => p.text).join(',');
        let xOff = 0;
        for (let i = 0; i < labelParts.length; i++) {
          const p = labelParts[i];
          const pColor = COLORS[p.type === 'formed' ? 'formed' : 'broken'].text;
          const comma = i < labelParts.length - 1 ? ',' : '';
          const str = p.text + comma;
          overlays += `<text x="${(supX + xOff).toFixed(1)}" y="${supY.toFixed(1)}" font-size="${fontSize.toFixed(1)}" font-weight="700" font-family="Arial,sans-serif" fill="${pColor}">${str}</text>`;
          xOff += str.length * fontSize * 0.55;
        }
      } else {
        // ── Bar mode (default): colored underline bar + text label below ──
        const bx = pos.cx - barW / 2;
        const by = pos.cy + fontSize * 0.45;
        overlays += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" rx="${(barH / 2).toFixed(1)}" fill="${c.barFill}"/>`;

        const labelY = by + barH + fontSize * 1.05;
        const fullLabel = labelParts.map(p => p.text).join(',');
        const totalW = fullLabel.length * fontSize * 0.55;
        let xOff = pos.cx - totalW / 2;

        for (let i = 0; i < labelParts.length; i++) {
          const p = labelParts[i];
          const pColor = COLORS[p.type === 'formed' ? 'formed' : 'broken'].text;
          const comma = i < labelParts.length - 1 ? ',' : '';
          const str = p.text + comma;
          overlays += `<text x="${xOff.toFixed(1)}" y="${labelY.toFixed(1)}" font-size="${fontSize.toFixed(1)}" font-weight="700" font-family="Arial,sans-serif" fill="${pColor}">${str}</text>`;
          xOff += str.length * fontSize * 0.55;
        }
      }
    }

    if (!overlays) return svgStr;
    return svgStr.replace('</svg>', `<g class="bond-atom-overlays">${overlays}</g></svg>`);
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
          const e1 = ELEMENT_MAP[atoms[b.atoms[0]]?.z || 6] || '?';
          const e2 = ELEMENT_MAP[atoms[b.atoms[1]]?.z || 6] || '?';
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
          element: ELEMENT_MAP[atoms[i].z || 6] || '?'
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
                  element: ELEMENT_MAP[atoms[i].z || 6] || '?'
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
