// ═══════════════════════════════════════════
//  MolDraw Engine — Canvas-based Chemical Structure Drawing
//  Adapted for SHR Structure Search page
// ═══════════════════════════════════════════

const DrawEngine = {
  canvas: null, ctx: null, canvasReady: false,
  curTool: 'bond', curElem: 'C', curBondType: 'single',
  atoms: [], bonds: [], undoStack: [], nextId: 1,
  isDragging: false, isDrawingBond: false, drawStart: null, dragTarget: null, hoverAtom: null,
  mousePos: {x:0,y:0},
  SNAP_R: 22, BOND_LEN: 50, ANGLE_SNAP: Math.PI/6,
  ECOLORS: {C:'#333',H:'#888',N:'#3465a4',O:'#cc0000',S:'#c4a000',P:'#ff8000',F:'#00cc00',Cl:'#00aa00',Br:'#a52a2a',I:'#940094'},

  init(canvasId, areaId) {
    this.canvas = document.getElementById(canvasId);
    this.canvasArea = document.getElementById(areaId);
    if (!this.canvas || !this.canvasArea) return;
    this.ctx = this.canvas.getContext('2d');
    this._bindEvents();
    this._initResize();
    this.resize();
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

  setTool(t) {
    this.curTool = t;
    if(t==='bond')this.curBondType='single'; else if(t==='double')this.curBondType='double'; else if(t==='triple')this.curBondType='triple';
    this.canvas.style.cursor = t==='select'?'default':t==='eraser'?'pointer':'crosshair';
    // Update toolbar buttons
    document.querySelectorAll('#drawToolbar .dtb-btn').forEach(b => b.classList.toggle('on', b.dataset.t === t));
  },

  setElem(el) {
    this.curElem = el;
    document.querySelectorAll('#drawElemGrid .el-btn').forEach(b => b.classList.toggle('on', b.dataset.e === el));
  },

  clearAll() {
    this.pushUndo();
    this.atoms = []; this.bonds = []; this.nextId = 1;
    this.render(); this.updateSmiles();
  },

  // ── Render ──
  render() {
    if (!this.canvasReady) return;
    const ctx = this.ctx;
    const w = parseFloat(this.canvas.style.width), h = parseFloat(this.canvas.style.height);
    ctx.clearRect(0,0,w,h);

    // Grid
    ctx.strokeStyle='#f0f0f0'; ctx.lineWidth=0.5; ctx.setLineDash([]);
    for(let x=0;x<w;x+=25){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
    for(let y=0;y<h;y+=25){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}

    // Bonds
    for(const bd of this.bonds){
      const a1=this.getAtom(bd.a), a2=this.getAtom(bd.b);
      if(a1&&a2) this._drawBond(a1,a2,bd.type);
    }

    // Preview bond while drawing
    if(this.isDrawingBond && this.drawStart){
      const snap=this.snapAngle(this.drawStart, this.mousePos.x, this.mousePos.y);
      const t=this.findNear(this.mousePos.x, this.mousePos.y);
      const ex=t?t.x:snap.x, ey=t?t.y:snap.y;
      ctx.strokeStyle='#00B4D8';ctx.lineWidth=2;ctx.setLineDash([6,4]);
      ctx.beginPath();ctx.moveTo(this.drawStart.x,this.drawStart.y);ctx.lineTo(ex,ey);ctx.stroke();ctx.setLineDash([]);
      if(!t){ctx.beginPath();ctx.arc(ex,ey,6,0,Math.PI*2);ctx.strokeStyle='#00B4D8';ctx.lineWidth=1.5;ctx.stroke();}
    }

    // Atoms
    for(const a of this.atoms){
      const deg=this.atomDeg(a), show=a.elem!=='C'||deg===0||a.explicit;
      if(show){
        ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(a.x,a.y,13,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=this.ECOLORS[a.elem]||'#333';ctx.font='bold 15px "Segoe UI",sans-serif';
        ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(a.elem,a.x,a.y+1);
      } else {
        ctx.fillStyle='#333';ctx.beginPath();ctx.arc(a.x,a.y,2.5,0,Math.PI*2);ctx.fill();
      }
      if(this.hoverAtom && this.hoverAtom.id===a.id){
        ctx.strokeStyle='#00B4D8';ctx.lineWidth=2;ctx.setLineDash([]);
        ctx.beginPath();ctx.arc(a.x,a.y,16,0,Math.PI*2);ctx.stroke();
      }
    }
  },

  _drawBond(a1,a2,type){
    const ctx=this.ctx;
    const dx=a2.x-a1.x,dy=a2.y-a1.y,len=Math.hypot(dx,dy)||1;
    const nx=-dy/len,ny=dx/len,g=3;
    ctx.strokeStyle='#333';ctx.lineWidth=2;ctx.lineCap='round';ctx.setLineDash([]);
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
        mb += x.padStart(10) + y.padStart(10) + '    0.0000 ' + a.elem.padEnd(3) + ' 0  0  0  0  0  0  0  0  0  0  0  0\n';
      }
      for (const b of this.bonds) {
        const a1 = idxMap[b.a] + 1, a2 = idxMap[b.b] + 1;
        const bt = b.type === 'double' ? 2 : b.type === 'triple' ? 3 : 1;
        mb += String(a1).padStart(3) + String(a2).padStart(3) + String(bt).padStart(3) + '  0  0  0  0\n';
      }
      mb += 'M  END\n';

      const mol = ChemEngine.rdkit.get_mol(mb);
      if (!mol || !mol.is_valid()) { if(mol)mol.delete(); return null; }
      const smiles = mol.get_smiles();
      mol.delete();
      return smiles;
    } catch(e) { return null; }
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

    c.addEventListener('mousedown', e => {
      if(!this.canvasReady) return;
      e.preventDefault();
      const pos = this.mpos(e);
      const atom = this.findNear(pos.x, pos.y);

      if(this.curTool==='select'){
        if(atom){this.pushUndo();this.isDragging=true;this.dragTarget=atom;} return;
      }
      if(this.curTool==='eraser'){
        if(atom){this.pushUndo();this.removeAtom(atom);this.hoverAtom=null;this.render();this.updateSmiles();} return;
      }
      if(this.curTool==='atom'){
        this.pushUndo(); if(atom){atom.elem=this.curElem;atom.explicit=true;} else this.addAtom(pos.x,pos.y,this.curElem,true); this.render(); this.updateSmiles(); return;
      }
      if(['ring6','ring5','benzene'].includes(this.curTool)){
        this.pushUndo();this.placeRing(pos.x,pos.y,this.curTool);this.render();this.updateSmiles();return;
      }
      if(['bond','double','triple'].includes(this.curTool)){
        this.pushUndo();this.isDrawingBond=true;this.drawStart=atom||this.addAtom(pos.x,pos.y,'C');this.render();return;
      }
    });

    c.addEventListener('mousemove', e => {
      if(!this.canvasReady) return;
      const pos=this.mpos(e); this.mousePos=pos; this.hoverAtom=this.findNear(pos.x,pos.y);
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
          endAtom=(st&&st.id!==this.drawStart.id)?st:this.addAtom(snap.x,snap.y,'C');
        }
        if(endAtom&&endAtom.id!==this.drawStart.id) this.addBond(this.drawStart,endAtom,this.curBondType);
        this.isDrawingBond=false;this.drawStart=null;this.render();this.updateSmiles();
      }
    });

    c.addEventListener('mouseleave', () => { this.hoverAtom=null; this.render(); });

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)) return;
      if(!document.getElementById('pg-search')?.classList.contains('active')) return;
      const km={v:'select','1':'bond','2':'double','3':'triple','5':'ring5','6':'ring6',b:'benzene',a:'atom',e:'eraser'};
      if(km[e.key]){this.setTool(km[e.key]);e.preventDefault();}
      if((e.ctrlKey||e.metaKey)&&e.key==='z'){this.popUndo();e.preventDefault();}
      if(e.key==='Escape'&&this.isDrawingBond){
        this.isDrawingBond=false;
        if(this.drawStart&&this.atomDeg(this.drawStart)===0) this.atoms=this.atoms.filter(a=>a.id!==this.drawStart.id);
        this.drawStart=null;this.popUndo();this.render();
      }
    });
  }
};
