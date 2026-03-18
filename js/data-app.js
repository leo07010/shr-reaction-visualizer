// Database
const DataApp = {
  db:[], filtered:[], currentPage:1, pageSize:50, sortCol:null, sortAsc:true,
  init(data){ this.db=data||[];this.applyFilters();this.updateStats(); },
  updateStats(){
    const refs=new Set(this.db.map(e=>e['Paper DOI']).filter(Boolean));
    const contribs=new Set(this.db.map(e=>e['Entered By']).filter(Boolean));
    const bonds=new Set();
    this.db.forEach(e=>{for(let i=1;i<=8;i++){if(e[`Formed ${i}`])bonds.add(e[`Formed ${i}`]);if(e[`Broken ${i}`])bonds.add(e[`Broken ${i}`]);}});
    const s=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
    s('stat-entries',this.db.length);s('stat-refs',refs.size);s('stat-people',contribs.size);s('stat-bonds',bonds.size);
    s('sideStatEntries',this.db.length);s('sideStatRefs',refs.size);s('sideStatContributors',contribs.size);s('sideStatBonds',bonds.size);
    const pop=(id,label,set)=>{const el=document.getElementById(id);if(!el)return;const v=el.value;el.innerHTML=`<option value="">All ${label}</option>`;Array.from(set).sort().forEach(item=>el.innerHTML+=`<option value="${item}">${item}</option>`);el.value=v;};
    pop('fltContributor','Contributors',contribs);pop('fltBond','Bond Types',bonds);
  },
  applyFilters(){
    const txt=document.getElementById('searchInput').value.toLowerCase();
    const sub=document.getElementById('searchSubstruct').value.trim();
    const by=document.getElementById('fltContributor').value;
    const bnd=document.getElementById('fltBond').value;
    const bndRole=(document.getElementById('fltBondRole')||{}).value||'';
    this.filtered=this.db.filter(e=>{
      if(txt){const f=`${e['Paper DOI']||''} ${e['Entered By']||''} ${e['Reagents']||''} ${e['SMILES SM']||''} ${e['SMILES Product']||''}`.toLowerCase();if(!f.includes(txt))return false;}
      if(by&&e['Entered By']!==by)return false;
      if(bnd){let has=false;for(let i=1;i<=8;i++){const checkF=!bndRole||bndRole==='formed';const checkB=!bndRole||bndRole==='broken';if(checkF&&e[`Formed ${i}`]===bnd){has=true;break;}if(checkB&&e[`Broken ${i}`]===bnd){has=true;break;}}if(!has)return false;}
      if(sub&&ChemEngine.ready){if(!ChemEngine.substructureMatch(e['SMILES SM'],sub)&&!ChemEngine.substructureMatch(e['SMILES Product'],sub))return false;}
      return true;
    });
    this.currentPage=1;this.renderTable();this.updateStats();
  },
  clearFilters(){
    ['searchInput','searchSubstruct','fltContributor','fltBond','fltBondRole'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    this.applyFilters();
  },
  sort(col){
    if(this.sortCol===col)this.sortAsc=!this.sortAsc;else{this.sortCol=col;this.sortAsc=true;}
    document.querySelectorAll('.dt th').forEach(th=>{th.classList.remove('sorted');const a=th.querySelector('.arrow');if(a)a.textContent='↕';});
    event.currentTarget.classList.add('sorted');const arr=event.currentTarget.querySelector('.arrow');if(arr)arr.textContent=this.sortAsc?'▲':'▼';
    this.filtered.sort((a,b)=>{let va=a[col]||'',vb=b[col]||'';if(col==='Step'){va=parseInt(va)||0;vb=parseInt(vb)||0;}else{va=String(va).toLowerCase();vb=String(vb).toLowerCase();}return va<vb?(this.sortAsc?-1:1):va>vb?(this.sortAsc?1:-1):0;});
    this.renderTable();
  },
  renderTable(){
    const tb=document.getElementById('dataTable');tb.innerHTML='';
    const start=(this.currentPage-1)*this.pageSize;
    this.filtered.slice(start,start+this.pageSize).forEach(e=>{
      const idx=this.db.indexOf(e)+1,tr=document.createElement('tr');
      tr.addEventListener('click',()=>this.showDetail(e));
      const smImg=ChemEngine.getSvg(e['SMILES SM'],46,46)||`<span style="color:#aaa;font-size:8px;text-align:center;word-break:break-all;padding:2px">${(e['SMILES SM']||'N/A').substring(0,20)}</span>`;
      const prImg=ChemEngine.getSvg(e['SMILES Product'],46,46)||`<span style="color:#aaa;font-size:8px;text-align:center;word-break:break-all;padding:2px">${(e['SMILES Product']||'N/A').substring(0,20)}</span>`;
      let bH='';
      for(let j=1;j<=8;j++){if(e[`Formed ${j}`])bH+=`<span class="bond-badge">${e[`Formed ${j}`]}</span> `;if(e[`Broken ${j}`])bH+=`<span class="bond-badge broken">${e[`Broken ${j}`]}</span> `;}
      let ref=e['Paper DOI']||'';
      const refDisp=ref.length>28?ref.substring(0,25)+'...':ref;
      const refHtml=ref.startsWith('10.')?`<a href="https://doi.org/${ref}" target="_blank" onclick="event.stopPropagation()">${refDisp}</a>`:refDisp;
      tr.innerHTML=`<td>${idx}</td><td title="${ref}">${refHtml}</td><td>${e['Entered By']||'-'}</td><td>${e['Step']||'-'}</td><td><div class="mp">${smImg}</div></td><td><div class="mp">${prImg}</div></td><td><div style="display:flex;flex-wrap:wrap;gap:4px;max-width:200px">${bH}</div></td><td>${e['Reagents']||'-'}</td>`;
      tb.appendChild(tr);
    });
    this.renderPagination();
  },
  renderPagination(){
    const pag=document.getElementById('pagination');pag.innerHTML='';
    const pages=Math.ceil(this.filtered.length/this.pageSize);if(pages<=1)return;
    const mk=(txt,active,disabled,fn)=>{const b=document.createElement('button');b.className='pag-btn'+(active?' active':'');b.textContent=txt;b.disabled=disabled;b.onclick=fn;pag.appendChild(b);};
    mk('← Prev',false,this.currentPage===1,()=>{this.currentPage--;this.renderTable();});
    for(let i=1;i<=pages;i++){
      if(i===1||i===pages||(i>=this.currentPage-2&&i<=this.currentPage+2)) mk(i,i===this.currentPage,false,((p)=>()=>{this.currentPage=p;this.renderTable();})(i));
      else if(i===this.currentPage-3||i===this.currentPage+3){const d=document.createElement('span');d.textContent='...';d.style.padding='4px 8px';pag.appendChild(d);}
    }
    mk('Next →',false,this.currentPage===pages,()=>{this.currentPage++;this.renderTable();});
  },
  showDetail(e){
    const ref=e['Paper DOI']||'';
    document.getElementById('detRef').innerHTML=ref.startsWith('10.')?`<a href="https://doi.org/${ref}" target="_blank">${ref}</a>`:ref;
    document.getElementById('detDoi').textContent=ref||'-';
    document.getElementById('detBy').textContent=e['Entered By']||'-';
    document.getElementById('detStep').textContent=e['Step']||'-';
    document.getElementById('detReagents').textContent=e['Reagents']||'-';
    // Collect bond changes for highlighting
    const detFormed=[];const detBroken=[];
    for(let i=1;i<=8;i++){const f=e[`Formed ${i}`];const b=e[`Broken ${i}`];if(f&&f.trim())detFormed.push(f.trim());if(b&&b.trim())detBroken.push(b.trim());}
    // SM: show broken bonds in red
    const smSvg=(detFormed.length||detBroken.length)?ChemEngine.getSvgHighlighted(e['SMILES SM'],340,280,detFormed,detBroken,'sm'):ChemEngine.getSvg(e['SMILES SM'],340,280);
    document.getElementById('detSmImg').innerHTML=smSvg||`<div style="color:#666;font-family:monospace;font-size:12px;word-break:break-all;padding:10px">${e['SMILES SM']||'No SMILES'}</div>`;
    // Product: show formed bonds in green
    const prSvg=(detFormed.length||detBroken.length)?ChemEngine.getSvgHighlighted(e['SMILES Product'],340,280,detFormed,detBroken,'product'):ChemEngine.getSvg(e['SMILES Product'],340,280);
    document.getElementById('detProdImg').innerHTML=prSvg||`<div style="color:#666;font-family:monospace;font-size:12px;word-break:break-all;padding:10px">${e['SMILES Product']||'No SMILES'}</div>`;
    let fH='',bH='';
    for(let i=1;i<=8;i++){if(e[`Formed ${i}`])fH+=`<span class="bond-badge">${e[`Formed ${i}`]}</span>`;if(e[`Broken ${i}`])bH+=`<span class="bond-badge broken">${e[`Broken ${i}`]}</span>`;}
    document.getElementById('detFormed').innerHTML=fH||'<span style="color:var(--muted)">None</span>';
    document.getElementById('detBroken').innerHTML=bH||'<span style="color:var(--muted)">None</span>';
    document.getElementById('detailOverlay').classList.add('on');
  },
  handleCSV(event){
    const file=event.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      try{
        const lines=ev.target.result.split('\n');
        const headers=lines[0].split(',').map(s=>s.trim().replace(/^"|"$/g,''));
        let count=0;
        for(let i=1;i<lines.length;i++){
          if(!lines[i].trim())continue;
          const vals=lines[i].match(/(".*?"|[^",\n]+)(?=\s*,|\s*$)/g)||lines[i].split(',');
          const obj={};
          headers.forEach((h,idx)=>{let v=vals[idx]||'';if(v.startsWith('"')&&v.endsWith('"'))v=v.substring(1,v.length-1);obj[h]=v.trim();});
          if(obj['Source'])obj['Paper DOI']=obj['Source'];
          if(obj['User Name'])obj['Entered By']=obj['User Name'];
          this.db.push(obj);count++;
        }
        this.applyFilters();toast(`Loaded ${count} entries`,'success');
      }catch(err){toast('CSV parse failed','error');}
    };
    reader.readAsText(file);event.target.value='';
  },
  exportCSV(){
    if(!this.db.length){toast('Database is empty','error');return;}
    const headers=['Paper DOI','Entered By','Step','SMILES SM','SMILES Product','Reagents','Formed 1','Broken 1','Formed 2','Broken 2','Formed 3','Broken 3','Formed 4','Broken 4','Formed 5','Broken 5','Formed 6','Broken 6','Formed 7','Broken 7','Formed 8','Broken 8'];
    let csv=headers.join(',')+'\n';
    for(const e of this.db){
      const row=headers.map(h=>{const v=String(e[h]||'');return(v.includes(',')||v.includes('"'))?`"${v.replace(/"/g,'""')}"`:`${v}`;});
      csv+=row.join(',')+'\n';
    }
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download='SHR_Database_Export.csv';
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    toast('Exported successfully','success');
  },

  // ─── Draw Substructure (opens Structure Search page) ───
  openKetcher() {
    goPage('search');
    toast('Draw your substructure query on the canvas, then click Search', 'info');
  }
};
