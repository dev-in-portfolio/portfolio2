(() => {
  'use strict';
  const A = window.AlibiApp;
  if (!A || A.$('#walkPhase')) return;
  const quantity = A.$('#walkQty');
  const grid = quantity?.closest?.('.form-grid');
  if (!grid) throw new Error('Walk Count form is unavailable.');
  const label = document.createElement('label');
  label.textContent = 'Count Phase';
  const select = document.createElement('select');
  select.id = 'walkPhase';
  select.className = 'select count-input';
  select.innerHTML = '<option value="beginning">Opening Inventory</option><option value="ending">Ending Inventory</option>';
  label.appendChild(select);
  grid.insertBefore(label, grid.firstChild);
})();
