// Navigation & UI
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  document.getElementById('toastBox').appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function goPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('pg-' + name).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === name));
  // Hide step selector bar when not on visualizer page
  const stepBar = document.getElementById('stepSelectorBar');
  if (stepBar && name !== 'viz') stepBar.style.display = 'none';
  if (name === 'data') {
    DataApp.renderTable();
    DataApp.updateStats();
  }
  if (name === 'search' && typeof StructureSearch !== 'undefined') {
    StructureSearch.loadKetcher();
  }
}

document.querySelectorAll('.nav-btn').forEach(btn =>
  btn.addEventListener('click', e => goPage(e.currentTarget.dataset.page))
);
