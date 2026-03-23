// ═══════════════════════════════════════════
//  MolDraw Engine — Canvas-based Chemical Structure Drawing
//  Adapted for SHR Structure Search page
// ═══════════════════════════════════════════

const DrawEngine = {
  canvas: null, ctx: null, canvasReady: false,
  curTool: 'bond', curElem: 'C', curBondType: 'single',
  atoms: [], bonds: [], undoStack: [], nextId: 1,
  isDragging: false, isDrawingBond: false, drawStart: null, dragTarget: null,
  hoverAtom: null, hoverBond: null,
  mousePos: {x:0,y:0},
  SNAP_R: 22, BOND_LEN: 50, ANGLE_SNAP: Math.PI/6,
  ECOLORS: {C:'#333',H:'#888',N:'#3465a4',O:'#cc0000',S:'#c4a000',P:'#ff8000',F:'#00cc00',Cl:'#00aa00',Br:'#a52a2a',I:'#940094',
    Li:'#cc80ff',Na:'#ab5cf2',K:'#8f40d4',Mg:'#8aff00',Ca:'#3dff00',
    Fe:'#e06633',Co:'#f090a0',Ni:'#50d050',Cu:'#c88033',Zn:'#7d80b0',
    Pd:'#006985',Pt:'#d0d0e0',Ru:'#248f8f',Rh:'#0a7d8c',Ir:'#175487',
    Au:'#ffd123',Ag:'#c0c0c0',Al:'#bfa6a6',Mn:'#9c7ac7',Cr:'#8a99c7',
    Sn:'#668080',B:'#ffb5b5',Se:'#ffa100',Si:'#f0c8a0'},

  // ── Tool display names for status indicator ──
  TOOL_NAMES: {
    select:'Select / Move', bond:'Single Bond', double:'Double Bond', triple:'Triple Bond',
    ring6:'Hexagon', ring5:'Pentagon', benzene:'Benzene', atom:'Place Atom', eraser:'Eraser', fragment:'Functional Group',
    charge_plus:'Add + Charge', charge_minus:'Add − Charge', radical:'Add Radical ·'
  },

  init(canvasId, areaId) {
    this.canvas = document.getElementById(canvasId);
    this.canvasArea = document.getElementById(areaId);
    if (!this.canvas || !this.canvasArea) return;
    this.ctx = this.canvas.getContext('2d');
    this._bindEvents();
    this._initResize();
    this.resize();
    this._updateToolIndicator();
  },

  resize() {
    const rect = this.canvasArea.getBoundingClientRect();
    const w = Math.floor(rect.width), h = Math.floor(rect.height);
    if (w <= 0 || h <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.canvasReady = true;
    this.render();
  },

  _initResize() {
    if (window.ResizeObserver) {
      new ResizeObserver(() => this.resize()).observe(this.canvasArea);
    }
  },

  // ── Atom/Bond helpers ──
  getAtom(id) { return this.atoms.find(a => a.id === id); },
  findNear(x, y) {
    let best = null, bd = this.SNAP_R;
    for (const a of this.atoms) { const d = Math.hypot(a.x-x, a.y-y); if(d<bd){best=a;bd=d;} }
    return best;
  },
  // Find the bond nearest to (x,y) — for click-to-cycle
  findNearBond(x, y) {
    let best = null, bd = 12;
    for (const b of this.bonds) {
      const a1 = this.getAtom(b.a), a2 = this.getAtom(b.b);
      if (!a1 || !a2) continue;
      // Point-to-segment distance
      const dx = a2.x-a1.x, dy = a2.y-a1.y, len2 = dx*dx+dy*dy;
      if (len2 === 0) continue;
      let t = ((x-a1.x)*dx + (y-a1.y)*dy) / len2;
      t = Math.max(0, Math.min(1, t));
      const px = a1.x + t*dx, py = a1.y + t*dy;
      const d = Math.hypot(x-px, y-py);
      if (d < bd) { best = b; bd = d; }
    }
    return best;
  },
  mpos(e) { const r = this.canvas.getBoundingClientRect(); return {x:e.clientX-r.left, y:e.clientY-r.top}; },
  pushUndo() { this.undoStack.push(JSON.stringify({atoms:this.atoms,bonds:this.bonds,nextId:this.nextId})); if(this.undoStack.length>80)this.undoStack.shift(); },
  popUndo() { if(!this.undoStack.length)return; const s=JSON.parse(this.undoStack.pop()); this.atoms=s.atoms; this.bonds=s.bonds; this.nextId=s.nextId; this.render(); this.updateSmiles(); },
  addAtom(x,y,el,explicit) { const a={id:this.nextId++,x,y,elem:el||this.curElem,explicit:!!explicit}; this.atoms.push(a); return a; },
  addBond(a1,a2,type) {
    if(a1.id===a2.id) return;
    const ex = this.bonds.find(b=>(b.a===a1.id&&b.b===a2.id)||(b.a===a2.id&&b.b===a1.id));
    if(ex){ex.type=type||this.curBondType;return;}
    this.bonds.push({a:a1.id,b:a2.id,type:type||this.curBondType});
  },
  removeAtom(a) { this.bonds=this.bonds.filter(b=>b.a!==a.id&&b.b!==a.id); this.atoms=this.atoms.filter(x=>x.id!==a.id); },
  removeBond(b) { this.bonds = this.bonds.filter(x => x !== b); },
  atomDeg(a) { return this.bonds.filter(b=>b.a===a.id||b.b===a.id).length; },

  snapAngle(from, tx, ty) {
    const angle = Math.atan2(ty-from.y, tx-from.x);
    const snapped = Math.round(angle/this.ANGLE_SNAP)*this.ANGLE_SNAP;
    return {x:from.x+Math.cos(snapped)*this.BOND_LEN, y:from.y+Math.sin(snapped)*this.BOND_LEN};
  },
  findBestAngle(atom) {
    const conn = this.bonds.filter(b=>b.a===atom.id||b.b===atom.id).map(b=>{
      const o=this.getAtom(b.a===atom.id?b.b:b.a);
      return o?Math.atan2(o.y-atom.y,o.x-atom.x):0;
    });
    if(!conn.length) return -Math.PI/6;
    if(conn.length===1) return conn[0]+Math.PI*2/3;
    const sorted=[...conn].sort((a,b)=>a-b);
    let ba=sorted[0]+Math.PI, bg=0;
    for(let i=0;i<sorted.length;i++){
      const nx=i+1<sorted.length?sorted[i+1]:sorted[0]+Math.PI*2;
      const gap=nx-sorted[i];
      if(gap>bg){bg=gap;ba=sorted[i]+gap/2;}
    }
    return ba;
  },

  placeRing(cx, cy, type) {
    const n = type==='ring5'?5:6;
    const ra = [];
    for(let i=0;i<n;i++){
      const a=Math.PI*2*i/n-Math.PI/2;
      const ax=cx+Math.cos(a)*this.BOND_LEN, ay=cy+Math.sin(a)*this.BOND_LEN;
      const ex=this.findNear(ax,ay);
      ra.push(ex&&Math.hypot(ex.x-ax,ex.y-ay)<this.SNAP_R?ex:this.addAtom(ax,ay,'C'));
    }
    for(let i=0;i<n;i++){
      const isD=type==='benzene'&&i%2===0;
      this.addBond(ra[i],ra[(i+1)%n],isD?'double':'single');
    }
  },

  // ── Tool management ──
  setTool(t) {
    this.curTool = t;
    this.curFragment = null;
    if(t==='bond')this.curBondType='single'; else if(t==='double')this.curBondType='double'; else if(t==='triple')this.curBondType='triple';
    this.canvas.style.cursor = t==='select'?'default':t==='eraser'?'pointer':'crosshair';
    // Update toolbar buttons
    document.querySelectorAll('#drawToolbar .dtb-btn').forEach(b => b.classList.toggle('on', b.dataset.t === t));
    // Deselect fragment buttons
    document.querySelectorAll('#drawFragGrid .fg-btn').forEach(b => b.classList.remove('on'));
    this._updateToolIndicator();
  },

  setElem(el) {
    this.curElem = el;
    // Auto-switch to atom tool so clicking canvas immediately places this element
    this.setTool('atom');
    document.querySelectorAll('#drawElemGrid .el-btn').forEach(b => b.classList.toggle('on', b.dataset.e === el));
    this._updateToolIndicator();
  },

  // ── Charge & Radical tools ──
  // Click an atom to add/modify charge or radical
  setChargeTool(delta) {
    this.curTool = delta > 0 ? 'charge_plus' : 'charge_minus';
    this._chargeDelta = delta;
    this.canvas.style.cursor = 'pointer';
    document.querySelectorAll('#drawToolbar .dtb-btn').forEach(b => b.classList.toggle('on', b.dataset.t === this.curTool));
    this._updateToolIndicator();
  },

  setRadicalTool() {
    this.curTool = 'radical';
    this.canvas.style.cursor = 'pointer';
    document.querySelectorAll('#drawToolbar .dtb-btn').forEach(b => b.classList.toggle('on', b.dataset.t === 'radical'));
    this._updateToolIndicator();
  },

  applyCharge(atom, delta) {
    this.pushUndo();
    atom.charge = (atom.charge || 0) + delta;
    // Clamp to ±3
    atom.charge = Math.max(-3, Math.min(3, atom.charge));
    if (atom.charge === 0) delete atom.charge;
    this.render();
    this.updateSmiles();
  },

  toggleRadical(atom) {
    this.pushUndo();
    atom.radical = atom.radical ? 0 : 1;
    if (!atom.radical) delete atom.radical;
    this.render();
    this.updateSmiles();
  },

  _updateToolIndicator() {
    const el = document.getElementById('drawToolIndicator');
    if (!el) return;
    let text = this.TOOL_NAMES[this.curTool] || this.curTool;
    if (this.curTool === 'atom') text += ` (${this.curElem})`;
    if (this.curTool === 'fragment' && this.curFragment) text = `Place ${this.curFragment}`;
    el.textContent = text;
    // Color the indicator based on tool type
    const colors = {select:'var(--muted)',bond:'var(--accent)',double:'var(--accent)',triple:'var(--accent)',
      ring6:'#7c6fff',ring5:'#7c6fff',benzene:'#7c6fff',atom:this.ECOLORS[this.curElem]||'var(--accent)',
      eraser:'var(--danger)',fragment:'var(--ok)'};
    el.style.color = colors[this.curTool] || 'var(--accent)';
  },

  // ── Functional group fragments ──
  FRAGMENTS: {
    'OH':   { atoms:[{e:'O',x:0,y:0},{e:'H',x:30,y:-20}], bonds:[[0,1,'single']] },
    'NH2':  { atoms:[{e:'N',x:0,y:0},{e:'H',x:-25,y:-25},{e:'H',x:25,y:-25}], bonds:[[0,1,'single'],[0,2,'single']] },
    'CHO':  { atoms:[{e:'C',x:0,y:0},{e:'H',x:-30,y:-20},{e:'O',x:30,y:-20}], bonds:[[0,1,'single'],[0,2,'double']] },
    'COOH': { atoms:[{e:'C',x:0,y:0},{e:'O',x:-30,y:-25},{e:'O',x:30,y:-25},{e:'H',x:50,y:-5}], bonds:[[0,1,'double'],[0,2,'single'],[2,3,'single']] },
    'NO2':  { atoms:[{e:'N',x:0,y:0},{e:'O',x:-30,y:-25},{e:'O',x:30,y:-25}], bonds:[[0,1,'double'],[0,2,'single']] },
    'SO3H': { atoms:[{e:'S',x:0,y:0},{e:'O',x:-35,y:-20},{e:'O',x:35,y:-20},{e:'O',x:0,y:35},{e:'H',x:25,y:45}], bonds:[[0,1,'double'],[0,2,'double'],[0,3,'single'],[3,4,'single']] },
    'CF3':  { atoms:[{e:'C',x:0,y:0},{e:'F',x:-30,y:-25},{e:'F',x:30,y:-25},{e:'F',x:0,y:30}], bonds:[[0,1,'single'],[0,2,'single'],[0,3,'single']] },
    'CN':   { atoms:[{e:'C',x:0,y:0},{e:'N',x:35,y:0}], bonds:[[0,1,'triple']] },
    'SH':   { atoms:[{e:'S',x:0,y:0},{e:'H',x:30,y:-20}], bonds:[[0,1,'single']] },
    'PO4':  { atoms:[{e:'P',x:0,y:0},{e:'O',x:-35,y:-20},{e:'O',x:35,y:-20},{e:'O',x:0,y:35},{e:'O',x:0,y:-35}], bonds:[[0,1,'single'],[0,2,'single'],[0,3,'single'],[0,4,'double']] },
  },

  placeFragment(name, cx, cy) {
    const frag = this.FRAGMENTS[name];
    if (!frag) return;
    this.pushUndo();
    const placed = [];
    for (const a of frag.atoms) {
      placed.push(this.addAtom(cx + a.x, cy + a.y, a.e, true));
    }
    for (const [i, j, t] of frag.bonds) {
      this.addBond(placed[i], placed[j], t);
    }
    // Auto-bond first atom of fragment to nearest existing atom if close enough
    if (placed.length > 0) {
      const first = placed[0];
      let nearest = null, nd = this.SNAP_R * 1.5;
      for (const a of this.atoms) {
        if (placed.includes(a)) continue;
        const d = Math.hypot(a.x - first.x, a.y - first.y);
        if (d < nd) { nearest = a; nd = d; }
      }
      if (nearest) this.addBond(nearest, first, 'single');
    }
    this.render();
    this.updateSmiles();
  },

  curFragment: null,

  setFragment(name) {
    this.curFragment = name;
    this.curTool = 'fragment';
    this.canvas.style.cursor = 'crosshair';
    document.querySelectorAll('#drawToolbar .dtb-btn').forEach(b => b.classList.remove('on'));
    document.querySelectorAll('#drawFragGrid .fg-btn').forEach(b => b.classList.toggle('on', b.dataset.fg === name));
    document.querySelectorAll('#drawElemGrid .el-btn').forEach(b => b.classList.remove('on'));
    this._updateToolIndicator();
  },

  clearAll() {
    this.pushUndo();
    this.atoms = []; this.bonds = []; this.nextId = 1;
    this.render(); this.updateSmiles();
  },

  // ── Bond type cycling (click existing bond) ──
  cycleBondType(bond) {
    this.pushUndo();
    const order = ['single','double','triple'];
    const idx = order.indexOf(bond.type);
    bond.type = order[(idx + 1) % 3];
    this.render();
    this.updateSmiles();
  },

  // ── Render ──
  render() {
    if (!this.canvasReady) return;
    const ctx = this.ctx;
    const w = parseFloat(this.canvas.style.width), h = parseFloat(this.canvas.style.height);
    ctx.clearRect(0,0,w,h);

    // Grid (subtle dots instead of lines for cleaner look)
    ctx.fillStyle='#e8e8e8';
    for(let x=25;x<w;x+=25) for(let y=25;y<h;y+=25) { ctx.beginPath(); ctx.arc(x,y,0.8,0,Math.PI*2); ctx.fill(); }

    // Empty canvas guidance
    if (this.atoms.length === 0 && !this.isDrawingBond) {
      ctx.save();
      ctx.fillStyle='#bbb';ctx.font='15px "Segoe UI",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('Click to start drawing',w/2,h/2-12);
      ctx.fillStyle='#ccc';ctx.font='12px "Segoe UI",sans-serif';
      ctx.fillText('Use tools on the left · Select atoms/groups below',w/2,h/2+12);
      ctx.restore();
    }

    // Bonds
    for(const bd of this.bonds){
      const a1=this.getAtom(bd.a), a2=this.getAtom(bd.b);
      if(a1&&a2) this._drawBond(a1,a2,bd.type, this.hoverBond===bd);
    }

    // Preview bond while drawing
    if(this.isDrawingBond && this.drawStart){
      const snap=this.snapAngle(this.drawStart, this.mousePos.x, this.mousePos.y);
      const t=this.findNear(this.mousePos.x, this.mousePos.y);
      const ex=t?t.x:snap.x, ey=t?t.y:snap.y;
      ctx.strokeStyle='#00B4D8';ctx.lineWidth=2;ctx.setLineDash([6,4]);
      ctx.beginPath();ctx.moveTo(this.drawStart.x,this.drawStart.y);ctx.lineTo(ex,ey);ctx.stroke();ctx.setLineDash([]);
      // Show preview atom label at end point
      if(!t){
        ctx.beginPath();ctx.arc(ex,ey,11,0,Math.PI*2);
        ctx.fillStyle='rgba(0,180,216,.1)';ctx.fill();
        ctx.strokeStyle='#00B4D8';ctx.lineWidth=1.5;ctx.stroke();
        // Show element label that will be placed
        ctx.fillStyle='#00B4D8';ctx.font='bold 12px "Segoe UI",sans-serif';
        ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(this.curElem,ex,ey+1);
      }
    }

    // Atoms
    for(const a of this.atoms){
      const deg=this.atomDeg(a), show=a.elem!=='C'||deg===0||a.explicit||a.charge||a.radical;
      if(show){
        ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(a.x,a.y,13,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=this.ECOLORS[a.elem]||'#333';ctx.font='bold 15px "Segoe UI",sans-serif';
        ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(a.elem,a.x,a.y+1);

        // Draw charge superscript (top-right)
        if(a.charge){
          const chStr = a.charge > 0
            ? (a.charge > 1 ? a.charge + '+' : '+')
            : (a.charge < -1 ? Math.abs(a.charge) + '−' : '−');
          ctx.font='bold 11px "Segoe UI",sans-serif';
          ctx.fillStyle=a.charge>0?'#2196F3':'#E53935';
          ctx.textAlign='left';ctx.textBaseline='top';
          ctx.fillText(chStr,a.x+10,a.y-15);
        }
        // Draw radical dot (top-right, offset from charge)
        if(a.radical){
          const rdx = a.charge ? 22 : 14;
          ctx.fillStyle='#FF9800';ctx.beginPath();
          ctx.arc(a.x+rdx,a.y-10,3,0,Math.PI*2);ctx.fill();
        }
      } else {
        ctx.fillStyle='#333';ctx.beginPath();ctx.arc(a.x,a.y,2.5,0,Math.PI*2);ctx.fill();
        // Even implicit C atoms can have charge/radical
        if(a.charge){
          const chStr = a.charge > 0
            ? (a.charge > 1 ? a.charge + '+' : '+')
            : (a.charge < -1 ? Math.abs(a.charge) + '−' : '−');
          ctx.font='bold 10px "Segoe UI",sans-serif';
          ctx.fillStyle=a.charge>0?'#2196F3':'#E53935';
          ctx.textAlign='left';ctx.textBaseline='top';
          ctx.fillText(chStr,a.x+5,a.y-12);
        }
        if(a.radical){
          ctx.fillStyle='#FF9800';ctx.beginPath();
          ctx.arc(a.x+(a.charge?16:8),a.y-8,3,0,Math.PI*2);ctx.fill();
        }
      }
      // Hover highlight
      if(this.hoverAtom && this.hoverAtom.id===a.id){
        ctx.strokeStyle='#00B4D8';ctx.lineWidth=2;ctx.setLineDash([]);
        ctx.beginPath();ctx.arc(a.x,a.y,16,0,Math.PI*2);ctx.stroke();
      }
    }
  },

  _drawBond(a1,a2,type,highlight){
    const ctx=this.ctx;
    const dx=a2.x-a1.x,dy=a2.y-a1.y,len=Math.hypot(dx,dy)||1;
    const nx=-dy/len,ny=dx/len,g=3;
    ctx.strokeStyle=highlight?'#00B4D8':'#333';
    ctx.lineWidth=highlight?2.5:2;ctx.lineCap='round';ctx.setLineDash([]);
    if(type==='single'){ctx.beginPath();ctx.moveTo(a1.x,a1.y);ctx.lineTo(a2.x,a2.y);ctx.stroke();}
    else if(type==='double'){
      ctx.beginPath();ctx.moveTo(a1.x+nx*g,a1.y+ny*g);ctx.lineTo(a2.x+nx*g,a2.y+ny*g);ctx.stroke();
      ctx.beginPath();ctx.moveTo(a1.x-nx*g,a1.y-ny*g);ctx.lineTo(a2.x-nx*g,a2.y-ny*g);ctx.stroke();
    } else if(type==='triple'){
      ctx.beginPath();ctx.moveTo(a1.x,a1.y);ctx.lineTo(a2.x,a2.y);ctx.stroke();
      ctx.beginPath();ctx.moveTo(a1.x+nx*g*1.5,a1.y+ny*g*1.5);ctx.lineTo(a2.x+nx*g*1.5,a2.y+ny*g*1.5);ctx.stroke();
      ctx.beginPath();ctx.moveTo(a1.x-nx*g*1.5,a1.y-ny*g*1.5);ctx.lineTo(a2.x-nx*g*1.5,a2.y-ny*g*1.5);ctx.stroke();
    }
  },

  // ── Canvas → SMILES (via RDKit molblock) ──
  toSmiles() {
    if (!ChemEngine.ready || this.atoms.length === 0) return null;
    try {
      const nA = this.atoms.length, nB = this.bonds.length;
      const idxMap = {};
      this.atoms.forEach((a,i) => idxMap[a.id] = i);

      let mb = '\n  MolDraw\n\n';
      mb += String(nA).padStart(3) + String(nB).padStart(3) + '  0  0  0  0  0  0  0  0999 V2000\n';
      for (const a of this.atoms) {
        const x = (a.x / 50).toFixed(4);
        const y = (-a.y / 50).toFixed(4);
        // Use M CHG / M RAD lines instead of atom block charge field for RDKit.js compatibility
        mb += x.padStart(10) + y.padStart(10) + '    0.0000 ' + a.elem.padEnd(3) + ' 0  0  0  0  0  0  0  0  0  0  0  0\n';
      }
      for (const b of this.bonds) {
        const a1 = idxMap[b.a] + 1, a2 = idxMap[b.b] + 1;
        const bt = b.type === 'double' ? 2 : b.type === 'triple' ? 3 : 1;
        mb += String(a1).padStart(3) + String(a2).padStart(3) + String(bt).padStart(3) + '  0  0  0  0\n';
      }
      // Add M  CHG lines for charges (more reliable than atom block field)
      const chargedAtoms = this.atoms.filter(a => a.charge);
      if (chargedAtoms.length) {
        mb += 'M  CHG' + String(chargedAtoms.length).padStart(3);
        for (const a of chargedAtoms) {
          mb += String(idxMap[a.id] + 1).padStart(4) + String(a.charge).padStart(4);
        }
        mb += '\n';
      }
      // Add M  RAD lines for radicals
      const radAtoms = this.atoms.filter(a => a.radical);
      if (radAtoms.length) {
        mb += 'M  RAD' + String(radAtoms.length).padStart(3);
        for (const a of radAtoms) {
          mb += String(idxMap[a.id] + 1).padStart(4) + '   2'; // 2 = doublet
        }
        mb += '\n';
      }
      mb += 'M  END\n';

      // Use relaxed parsing when charges/radicals present (M CHG/RAD lines need sanitize:false)
      const hasChargeOrRad = this.atoms.some(a => a.charge || a.radical);
      let mol;
      if (hasChargeOrRad) {
        mol = ChemEngine.rdkit.get_mol(mb, JSON.stringify({sanitize: false}));
      } else {
        mol = ChemEngine.rdkit.get_mol(mb);
      }
      if (!mol || !mol.is_valid()) { if(mol)mol.delete(); return null; }
      const smiles = mol.get_smiles();
      mol.delete();
      return smiles;
    } catch(e) { return null; }
  },

  // ── SMILES → Canvas (via RDKit molblock 2D coords) ──
  loadFromSmiles(smiles) {
    if (!ChemEngine.ready || !smiles || !smiles.trim()) return false;
    try {
      const mol = ChemEngine._tryGetMol(smiles.trim());
      if (!mol) return false;
      const mb = mol.get_molblock();
      mol.delete();
      if (!mb) return false;

      const lines = mb.split('\n');
      const counts = lines[3];
      const nA = parseInt(counts.substring(0, 3).trim());
      const nB = parseInt(counts.substring(3, 6).trim());
      if (!nA) return false;

      // Parse atom coordinates + elements from molblock
      const newAtoms = [];
      const BOND_LEN = this.BOND_LEN || 50;
      const scale = BOND_LEN; // 1 Angstrom ≈ BOND_LEN px
      for (let i = 0; i < nA; i++) {
        const al = lines[4 + i];
        if (!al) continue;
        const x = parseFloat(al.substring(0, 10).trim()) * scale;
        const y = -parseFloat(al.substring(10, 20).trim()) * scale; // flip Y
        const elem = al.substring(31, 34).trim() || 'C';
        newAtoms.push({ id: this.nextId++, x, y, elem, explicit: elem !== 'C' });
      }

      // Parse bonds
      const newBonds = [];
      const typeMap = { 1: 'single', 2: 'double', 3: 'triple' };
      for (let i = 0; i < nB; i++) {
        const bl = lines[4 + nA + i];
        if (!bl) continue;
        const a1 = parseInt(bl.substring(0, 3).trim()) - 1;
        const a2 = parseInt(bl.substring(3, 6).trim()) - 1;
        const bt = parseInt(bl.substring(6, 9).trim()) || 1;
        if (a1 < nA && a2 < nA) {
          newBonds.push({ a: newAtoms[a1].id, b: newAtoms[a2].id, type: typeMap[bt] || 'single' });
        }
      }

      // Center on canvas
      if (newAtoms.length) {
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        let mx = 0, my = 0;
        for (const a of newAtoms) { mx += a.x; my += a.y; }
        mx /= newAtoms.length; my /= newAtoms.length;
        for (const a of newAtoms) { a.x += cx - mx; a.y += cy - my; }
      }

      this.pushUndo();
      this.atoms = newAtoms;
      this.bonds = newBonds;
      this.render();
      this.updateSmiles();
      return true;
    } catch (e) {
      console.warn('loadFromSmiles failed:', e);
      return false;
    }
  },

  updateSmiles() {
    const smiles = this.toSmiles();
    const input = document.getElementById('searchSmilesInput');
    const liveEl = document.getElementById('drawLiveSmiles');
    if (smiles) {
      if (input) input.value = smiles;
      if (liveEl) { liveEl.textContent = smiles; liveEl.style.color = 'var(--accent)'; }
    } else {
      if (liveEl) {
        liveEl.textContent = this.atoms.length > 0 ? 'Invalid structure' : 'Draw a molecule...';
        liveEl.style.color = 'var(--muted)';
      }
    }
  },

  // ── Mouse/Keyboard Events ──
  _bindEvents() {
    const c = this.canvas;
    let lastClickTime = 0;

    c.addEventListener('mousedown', e => {
      if(!this.canvasReady) return;
      e.preventDefault();
      const pos = this.mpos(e);
      const atom = this.findNear(pos.x, pos.y);
      const now = Date.now();

      // ── Double-click atom → open element picker popup ──
      if (atom && now - lastClickTime < 350 && this.curTool !== 'eraser') {
        lastClickTime = 0;
        this._showAtomPopup(atom, pos);
        return;
      }
      lastClickTime = now;

      if(this.curTool==='select'){
        if(atom){this.pushUndo();this.isDragging=true;this.dragTarget=atom;} return;
      }
      if(this.curTool==='eraser'){
        if(atom){
          this.pushUndo();this.removeAtom(atom);this.hoverAtom=null;this.render();this.updateSmiles();
        } else {
          // Eraser on bond: remove bond
          const bond = this.findNearBond(pos.x, pos.y);
          if(bond){this.pushUndo();this.removeBond(bond);this.hoverBond=null;this.render();this.updateSmiles();}
        }
        return;
      }
      if(this.curTool==='charge_plus'||this.curTool==='charge_minus'){
        if(atom){this.applyCharge(atom,this._chargeDelta);} return;
      }
      if(this.curTool==='radical'){
        if(atom){this.toggleRadical(atom);} return;
      }
      if(this.curTool==='atom'){
        this.pushUndo(); if(atom){atom.elem=this.curElem;atom.explicit=true;} else this.addAtom(pos.x,pos.y,this.curElem,true); this.render(); this.updateSmiles(); return;
      }
      if(this.curTool==='fragment' && this.curFragment){
        this.placeFragment(this.curFragment,pos.x,pos.y);return;
      }
      if(['ring6','ring5','benzene'].includes(this.curTool)){
        this.pushUndo();this.placeRing(pos.x,pos.y,this.curTool);this.render();this.updateSmiles();return;
      }
      if(['bond','double','triple'].includes(this.curTool)){
        // If clicking near an existing bond (not on an atom), cycle its type
        if (!atom) {
          const bond = this.findNearBond(pos.x, pos.y);
          if (bond) { this.cycleBondType(bond); return; }
        }
        this.pushUndo();this.isDrawingBond=true;
        this.drawStart=atom||this.addAtom(pos.x,pos.y,this.curElem);
        this.render();return;
      }
    });

    c.addEventListener('mousemove', e => {
      if(!this.canvasReady) return;
      const pos=this.mpos(e); this.mousePos=pos;
      this.hoverAtom=this.findNear(pos.x,pos.y);
      // Hover bond highlight (when in bond/eraser tool and not hovering an atom)
      if (!this.hoverAtom && (this.curTool==='eraser' || ['bond','double','triple'].includes(this.curTool))) {
        this.hoverBond = this.findNearBond(pos.x, pos.y);
      } else {
        this.hoverBond = null;
      }
      if(this.isDragging&&this.dragTarget){this.dragTarget.x=pos.x;this.dragTarget.y=pos.y;}
      this.render();
    });

    c.addEventListener('mouseup', e => {
      if(!this.canvasReady) return;
      const pos=this.mpos(e);
      if(this.isDragging){this.isDragging=false;this.dragTarget=null;this.updateSmiles();return;}
      if(this.isDrawingBond && this.drawStart){
        const ex=this.findNear(pos.x,pos.y);
        let endAtom;
        if(ex&&ex.id!==this.drawStart.id){endAtom=ex;}
        else {
          const snap=this.snapAngle(this.drawStart,pos.x,pos.y);
          const dist=Math.hypot(pos.x-this.drawStart.x,pos.y-this.drawStart.y);
          if(dist<10){const ba=this.findBestAngle(this.drawStart);snap.x=this.drawStart.x+Math.cos(ba)*this.BOND_LEN;snap.y=this.drawStart.y+Math.sin(ba)*this.BOND_LEN;}
          const st=this.findNear(snap.x,snap.y);
          endAtom=(st&&st.id!==this.drawStart.id)?st:this.addAtom(snap.x,snap.y,this.curElem);
        }
        if(endAtom&&endAtom.id!==this.drawStart.id) this.addBond(this.drawStart,endAtom,this.curBondType);
        this.isDrawingBond=false;this.drawStart=null;this.render();this.updateSmiles();
      }
    });

    c.addEventListener('mouseleave', () => { this.hoverAtom=null; this.hoverBond=null; this.render(); });

    // Right-click to delete atom/bond (alternative to eraser)
    c.addEventListener('contextmenu', e => {
      e.preventDefault();
      if(!this.canvasReady) return;
      const pos = this.mpos(e);
      const atom = this.findNear(pos.x, pos.y);
      if (atom) { this.pushUndo(); this.removeAtom(atom); this.hoverAtom=null; this.render(); this.updateSmiles(); return; }
      const bond = this.findNearBond(pos.x, pos.y);
      if (bond) { this.pushUndo(); this.removeBond(bond); this.hoverBond=null; this.render(); this.updateSmiles(); }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)) return;
      if(!document.getElementById('pg-search')?.classList.contains('active')) return;
      const km={v:'select','1':'bond','2':'double','3':'triple','5':'ring5','6':'ring6',b:'benzene',a:'atom',e:'eraser'};
      if(km[e.key]){this.setTool(km[e.key]);e.preventDefault();}
      if((e.ctrlKey||e.metaKey)&&e.key==='z'){this.popUndo();e.preventDefault();}
      if(e.key==='Delete'||e.key==='Backspace'){
        // Delete hovered atom
        if(this.hoverAtom){this.pushUndo();this.removeAtom(this.hoverAtom);this.hoverAtom=null;this.render();this.updateSmiles();e.preventDefault();}
      }
      if(e.key==='Escape'){
        if(this.isDrawingBond){
          this.isDrawingBond=false;
          if(this.drawStart&&this.atomDeg(this.drawStart)===0) this.atoms=this.atoms.filter(a=>a.id!==this.drawStart.id);
          this.drawStart=null;this.popUndo();this.render();
        }
        // Close atom popup if open
        this._closeAtomPopup();
      }
    });

    // ── SMILES text input → load into drawing canvas ──
    const smiInput = document.getElementById('searchSmilesInput');
    if (smiInput) {
      let _smiLoading = false;
      smiInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !_smiLoading) {
          e.preventDefault();
          _smiLoading = true;
          const val = smiInput.value.trim();
          if (val && this.loadFromSmiles(val)) {
            const liveEl = document.getElementById('drawLiveSmiles');
            if (liveEl) { liveEl.textContent = val; liveEl.style.color = 'var(--accent)'; }
          }
          _smiLoading = false;
        }
      });
    }
  },

  // ── Inline atom element popup (double-click to change element) ──
  _atomPopup: null,

  _showAtomPopup(atom, pos) {
    this._closeAtomPopup();
    const rect = this.canvas.getBoundingClientRect();
    const popup = document.createElement('div');
    popup.className = 'draw-atom-popup';
    popup.style.left = (rect.left + atom.x + 18) + 'px';
    popup.style.top = (rect.top + atom.y - 20) + 'px';
    const elements = ['C','N','O','S','H','P','F','Cl','Br','I','B','Si','Se',
      'Li','Na','K','Mg','Ca','Al','Mn','Cr','Fe','Co','Ni','Cu','Zn',
      'Pd','Pt','Ru','Rh','Ir','Au','Ag','Sn'];
    for (const el of elements) {
      const btn = document.createElement('button');
      btn.textContent = el;
      btn.className = 'atom-popup-btn' + (atom.elem === el ? ' current' : '');
      btn.style.color = this.ECOLORS[el] || '#333';
      btn.onclick = (ev) => {
        ev.stopPropagation();
        this.pushUndo();
        atom.elem = el; atom.explicit = true;
        this.render(); this.updateSmiles();
        this._closeAtomPopup();
      };
      popup.appendChild(btn);
    }
    document.body.appendChild(popup);
    this._atomPopup = popup;
    // Close on outside click
    setTimeout(() => {
      const closer = (ev) => {
        if (!popup.contains(ev.target)) { this._closeAtomPopup(); document.removeEventListener('mousedown', closer); }
      };
      document.addEventListener('mousedown', closer);
    }, 10);
  },

  _closeAtomPopup() {
    if (this._atomPopup) { this._atomPopup.remove(); this._atomPopup = null; }
  }
};
