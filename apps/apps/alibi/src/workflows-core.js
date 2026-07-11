(() => {
  'use strict';
  const A = window.AlibiApp;
  const C = A.C;

  function createPeriodModal(opener) {
    const now = new Date();
    A.openModal(`
      <div class="overlay-heading"><div><div class="eyebrow">New period</div><h2 id="sharedModalTitle">Create Inventory Period</h2><p>Beginning inventory may be carried from the previous calendar period.</p></div><button class="btn secondary" data-close-modal type="button">Close</button></div>
      <div class="form-grid two">
        <label>Month<select id="newPeriodMonth" class="select">${Array.from({ length: 12 }, (_, index) => `<option value="${index + 1}" ${index === now.getMonth() ? 'selected' : ''}>${new Date(2000, index).toLocaleString(undefined, { month: 'long' })}</option>`).join('')}</select></label>
        <label>Year<input id="newPeriodYear" class="input" type="number" value="${now.getFullYear()}"></label>
      </div>
      <label><input id="copyPreviousInventory" type="checkbox" checked> Carry previous ending inventory into beginning inventory</label>
      <div class="modal-actions"><button id="confirmCreatePeriod" class="btn" type="button">Create Period</button></div>`, opener);
  }

  function createPeriod() {
    const month = C.finiteNumber(A.$('#newPeriodMonth')?.value);
    const year = C.finiteNumber(A.$('#newPeriodYear')?.value);
    if (month < 1 || month > 12 || year < 2000 || year > 2200) return A.notify('Enter a valid month and year.', 'warning');
    if (A.db.periods.some(period => period.year === year && period.month === month)) return A.notify('That calendar period already exists.', 'warning');
    const period = {
      id: C.uid('period'),
      label: new Date(year, month - 1).toLocaleString(undefined, { month: 'long', year: 'numeric' }),
      year,
      month,
      status: 'open',
      openedAt: C.nowISO(),
      lockedAt: null,
      sales: { foodAndNonAlcoholNet: 0, totalNet: 0 },
      targetCogsPercent: A.db.settings.targetCogsPercent ?? 30,
      inventoryCounts: { beginning: [], ending: [] },
      financialSnapshot: null,
      notes: '',
      createdAt: C.nowISO(),
      updatedAt: C.nowISO()
    };
    if (A.$('#copyPreviousInventory')?.checked) {
      const previous = C.getPreviousPeriod([...A.db.periods, period], period.id);
      if (previous) period.inventoryCounts.beginning = (previous.inventoryCounts?.ending || []).map(record => ({ ...A.clone(record), countedAt: period.openedAt }));
    }
    A.db.periods.push(period);
    A.state.periodId = period.id;
    A.state.invoiceId = A.state.recipeId = A.state.locationId = A.state.sectionId = null;
    A.audit('period_created', period.label);
    A.save();
    A.closeModal();
    A.renderAll();
    A.notify(`${period.label} created.`, 'success');
  }

  function syncNextPeriodBeginning(period) {
    const next = C.getNextPeriod(A.db.periods, period.id);
    if (!next || next.status === 'locked') return true;
    const existing = next.inventoryCounts?.beginning || [];
    if (existing.length && !confirm(`Locking ${period.label} will replace ${next.label}'s beginning inventory with this period's ending inventory. Continue?`)) return false;
    next.inventoryCounts.beginning = (period.inventoryCounts?.ending || []).map(record => ({ ...A.clone(record), countedAt: next.openedAt || C.nowISO() }));
    next.updatedAt = C.nowISO();
    A.audit('next_period_beginning_synced', `${period.label} → ${next.label}`);
    return true;
  }

  function togglePeriodLock() {
    const period = A.currentPeriod();
    if (!period) return;
    if (period.status === 'locked') {
      const reason = prompt('Reason for unlocking this period:');
      if (!reason?.trim()) return;
      period.status = 'open';
      period.lockedAt = null;
      period.financialSnapshot = null;
      A.audit('period_unlocked', `${period.label}: ${reason.trim()}`);
      A.save();
      A.renderAll();
      A.notify('Period unlocked.', 'warning');
      return;
    }

    const issues = C.buildExceptions(A.db, period);
    if (issues.some(issue => issue.severity === 'incomplete') && !confirm('This period has incomplete data. Lock it anyway?')) return;
    if (!syncNextPeriodBeginning(period)) return;

    for (const record of period.inventoryCounts.ending || []) {
      const item = A.db.items.find(candidate => candidate.id === record.itemId);
      if (!item) continue;
      const cost = item.defaultBaseUnitCost;
      record.baseUnitCost = cost == null ? null : C.roundUnitCost(cost);
      record.extendedValue = cost == null ? null : C.roundMoney(record.normalizedBaseQty * record.baseUnitCost);
    }
    period.financialSnapshot = {
      actual: C.actualCogs(A.db, period),
      theoretical: C.theoreticalCogs(A.db, period.id),
      movement: C.inventoryMovement(A.db, period),
      createdAt: C.nowISO()
    };
    period.status = 'locked';
    period.lockedAt = C.nowISO();
    A.audit('period_locked', period.label);
    A.save();
    A.renderAll();
    A.notify('Period locked and financial results snapshotted.', 'success');
  }

  function savePeriodSetup() {
    if (!A.requireOpen('edit sales')) return;
    const period = A.currentPeriod();
    const food = Math.max(0, C.finiteNumber(A.$('#salesFoodNet').value));
    const total = Math.max(0, C.finiteNumber(A.$('#salesTotalNet').value));
    if (total > 0 && total < food && !confirm('Total net sales are lower than food and non-alcohol sales. Save anyway?')) return;
    period.sales.foodAndNonAlcoholNet = food;
    period.sales.totalNet = total;
    period.targetCogsPercent = Math.max(0, C.finiteNumber(A.$('#targetCogsPercent').value, A.db.settings.targetCogsPercent));
    period.updatedAt = C.nowISO();
    A.save();
    A.renderAll();
    A.notify('Period setup saved.', 'success');
  }

  function parseOptionalCost(value) {
    const raw = String(value ?? '').trim();
    return raw === '' ? null : Math.max(0, C.finiteNumber(raw));
  }

  function addQuickItem() {
    const name = A.$('#quickItemName').value.trim();
    if (!name) return A.notify('Item name is required.', 'warning');
    if (A.findItem(name)?.confidence === 'exact') return A.notify('An item with that name or alias already exists.', 'warning');
    const baseUnit = A.$('#quickItemBaseUnit').value.trim() || 'ea';
    const casePack = C.finiteNumber(A.$('#quickItemCasePack').value);
    A.db.items.push({
      id: C.uid('item'),
      name,
      normalizedName: C.normalizeText(name),
      group: A.$('#quickItemGroup').value,
      category: A.$('#quickItemCategory').value.trim(),
      baseUnit,
      unitConversions: casePack > 0 ? { case: casePack, cs: casePack } : {},
      purchaseOptions: [],
      defaultBaseUnitCost: parseOptionalCost(A.$('#quickItemCost').value),
      aliases: [],
      excludedFromCount: false,
      active: true,
      costReviewRequired: false,
      sourceRecipeId: null,
      createdAt: C.nowISO(),
      updatedAt: C.nowISO()
    });
    ['quickItemName', 'quickItemCategory', 'quickItemCost', 'quickItemCasePack'].forEach(id => { A.$(`#${id}`).value = ''; });
    A.audit('item_created', name);
    A.save();
    A.renderAll();
    A.notify(`${name} added.`, 'success');
  }

  function itemHasDependencies(itemId) {
    return A.db.periods.some(period => ['beginning', 'ending'].some(phase => (period.inventoryCounts?.[phase] || []).some(record => record.itemId === itemId))) ||
      A.db.invoices.some(invoice => (invoice.lines || []).some(line => line.itemId === itemId)) ||
      A.db.recipes.some(recipe => (recipe.lines || []).some(line => line.itemId === itemId)) ||
      A.db.kitchen.locations.some(location => (location.sections || []).some(section => (section.itemEntries || []).some(entry => entry.itemId === itemId)));
  }

  function openItemEditor(item, opener) {
    A.openModal(`
      <div class="overlay-heading"><div><div class="eyebrow">Item setup</div><h2 id="sharedModalTitle">${A.escapeHtml(item.name)}</h2><p>All costs represent one base unit.</p></div><button class="btn secondary" data-close-modal type="button">Close</button></div>
      <div class="form-grid two">
        <label>Name<input id="editItemName" class="input" value="${A.escapeAttr(item.name)}"></label>
        <label>Group<select id="editItemGroup" class="select">${['ingredients','products','batch','nonfood'].map(group => `<option value="${group}" ${item.group === group ? 'selected' : ''}>${group}</option>`).join('')}</select></label>
        <label>Category<input id="editItemCategory" class="input" value="${A.escapeAttr(item.category)}"></label>
        <label>Base Unit<input id="editItemBaseUnit" class="input" value="${A.escapeAttr(item.baseUnit)}"></label>
        <label>Cost per Base Unit<input id="editItemCost" class="input" type="number" min="0" step="0.000001" value="${A.escapeAttr(item.defaultBaseUnitCost ?? '')}"></label>
        <label>Units per Case<input id="editItemCasePack" class="input" type="number" min="0" step="0.0001" value="${A.escapeAttr(item.unitConversions?.case || item.unitConversions?.cs || '')}"></label>
      </div>
      <label>Aliases<input id="editItemAliases" class="input" value="${A.escapeAttr((item.aliases || []).join(', '))}"></label>
      <label><input id="editItemExcluded" type="checkbox" ${item.excludedFromCount ? 'checked' : ''}> Exclude from inventory counts</label>
      <label><input id="editItemActive" type="checkbox" ${item.active ? 'checked' : ''}> Active item</label>
      <div class="modal-actions"><button id="deleteItem" class="btn danger" type="button">Delete Item</button><button id="saveItem" class="btn" type="button">Save Item</button></div>`, opener);
    A.$('#saveItem').onclick = () => saveItem(item);
    A.$('#deleteItem').onclick = () => deleteItem(item);
  }

  function saveItem(item) {
    const name = A.$('#editItemName').value.trim();
    if (!name) return A.notify('Name is required.', 'warning');
    const nextBaseUnit = A.$('#editItemBaseUnit').value.trim() || 'ea';
    if (nextBaseUnit !== item.baseUnit && itemHasDependencies(item.id)) {
      return A.notify('Base unit cannot be changed after the item is used in counts, invoices, recipes, or a counting route. Create a new item instead.', 'error', true);
    }

    item.name = name;
    item.normalizedName = C.normalizeText(name);
    item.group = A.$('#editItemGroup').value;
    item.category = A.$('#editItemCategory').value.trim();
    item.baseUnit = nextBaseUnit;
    item.defaultBaseUnitCost = parseOptionalCost(A.$('#editItemCost').value);
    item.aliases = A.$('#editItemAliases').value.split(',').map(value => value.trim()).filter(Boolean);
    item.excludedFromCount = A.$('#editItemExcluded').checked;
    item.active = A.$('#editItemActive').checked;
    item.costReviewRequired = false;
    item.unitConversions ||= {};
    const casePack = C.finiteNumber(A.$('#editItemCasePack').value);
    if (casePack > 0) {
      item.unitConversions.case = casePack;
      item.unitConversions.cs = casePack;
    } else {
      delete item.unitConversions.case;
      delete item.unitConversions.cs;
    }
    item.updatedAt = C.nowISO();
    if (!A.isLocked()) {
      for (const record of A.currentPeriod().inventoryCounts.ending || []) {
        if (record.itemId !== item.id) continue;
        record.baseUnitCost = item.defaultBaseUnitCost == null ? null : C.roundUnitCost(item.defaultBaseUnitCost);
        record.extendedValue = record.baseUnitCost == null ? null : C.roundMoney(record.normalizedBaseQty * record.baseUnitCost);
      }
    }
    A.audit('item_updated', item.name);
    A.save();
    A.closeModal();
    A.renderAll();
    A.notify('Item saved.', 'success');
  }

  function deleteItem(item) {
    if (itemHasDependencies(item.id)) return A.notify('This item is already used. Deactivate it instead.', 'warning');
    if (!confirm(`Delete ${item.name}?`)) return;
    A.createAutoBackup('before item deletion');
    A.db.items = A.db.items.filter(candidate => candidate.id !== item.id);
    A.audit('item_deleted', item.name);
    A.save();
    A.closeModal();
    A.renderAll();
  }

  function addLocation() {
    if (!A.requireOpen('change the kitchen map')) return;
    const name = prompt('Location name:');
    if (!name?.trim()) return;
    const location = { id: C.uid('location'), name: name.trim(), sortOrder: A.db.kitchen.locations.length + 1, sections: [] };
    A.db.kitchen.locations.push(location);
    A.state.locationId = location.id;
    A.state.sectionId = null;
    A.audit('location_created', location.name);
    A.save();
    A.renderAll();
  }

  function addSection() {
    if (!A.requireOpen('change the kitchen map')) return;
    const location = A.currentLocation();
    if (!location) return;
    const name = prompt('Section name:');
    if (!name?.trim()) return;
    const section = { id: C.uid('section'), name: name.trim(), sortOrder: location.sections.length + 1, itemEntries: [] };
    location.sections.push(section);
    A.state.sectionId = section.id;
    A.audit('section_created', `${location.name} / ${section.name}`);
    A.save();
    A.renderAll();
  }

  function addItemToSection() {
    if (!A.requireOpen('change the counting route')) return;
    const section = A.currentSection();
    if (!section) return;
    const match = A.findItem(A.$('#sectionItemSearch').value.trim());
    if (!match || match.confidence !== 'exact') return A.notify('Choose an exact existing item name from the list.', 'warning');
    if (section.itemEntries.some(entry => entry.itemId === match.item.id)) return A.notify('That item is already in this section.', 'warning');
    const units = [match.item.baseUnit, ...Object.keys(match.item.unitConversions || {})].filter((value, index, array) => array.indexOf(value) === index);
    section.itemEntries.push({ itemId: match.item.id, sortOrder: section.itemEntries.length + 1, preferredCountUnit: match.item.baseUnit, allowedCountUnits: units });
    A.$('#sectionItemSearch').value = '';
    A.save();
    A.renderAll();
    A.notify(`${match.item.name} added to ${section.name}.`, 'success');
  }

  function findCountRecord(period, phase, itemId, locationId, sectionId) {
    return (period.inventoryCounts?.[phase] || []).find(record => record.itemId === itemId && record.locationId === locationId && record.sectionId === sectionId) || null;
  }

  function renderWalk() {
    const walk = A.state.walk;
    if (!walk) return;
    const location = A.db.kitchen.locations.find(candidate => candidate.id === walk.locationId);
    const section = location?.sections?.find(candidate => candidate.id === walk.sectionId);
    const entry = walk.entries[walk.index];
    const item = A.db.items.find(candidate => candidate.id === entry.itemId);
    if (!location || !section || !item) return A.notify('The counting route contains a missing item or section.', 'error', true);
    const period = A.currentPeriod();
    const existing = findCountRecord(period, 'ending', item.id, location.id, section.id);
    const previous = C.getPreviousPeriod(A.db.periods, period.id);
    const previousRecord = previous && findCountRecord(previous, 'ending', item.id, location.id, section.id);
    A.$('#walkCrumb').textContent = `${location.name} → ${section.name}`;
    A.$('#walkItemName').textContent = item.name;
    A.$('#walkProgress').textContent = `Item ${walk.index + 1} of ${walk.entries.length}`;
    A.$('#walkUnit').innerHTML = (entry.allowedCountUnits || [item.baseUnit]).map(unit => `<option value="${A.escapeAttr(unit)}">${A.escapeHtml(unit)}</option>`).join('');
    A.$('#walkQty').value = existing?.enteredQty ?? '';
    A.$('#walkUnit').value = existing?.enteredUnit || entry.preferredCountUnit || item.baseUnit;
    A.$('#walkGhost').textContent = previousRecord ? `Last period: ${A.qty(previousRecord.enteredQty)} ${previousRecord.enteredUnit}` : 'Last period: —';
    A.$('#walkNote').value = '';
    A.$('#btnPrevItem').disabled = walk.index === 0;
    A.$('#btnNextItem').textContent = walk.index === walk.entries.length - 1 ? 'Save and Finish' : 'Save and Next';
    walk.previousQty = previousRecord?.enteredQty ?? null;
    walk.previousUnit = previousRecord?.enteredUnit || A.$('#walkUnit').value;
    setTimeout(() => { A.$('#walkQty').focus(); A.$('#walkQty').select(); }, 0);
  }

  function persistWalk() {
    const walk = A.state.walk;
    if (!walk) return true;
    const raw = A.$('#walkQty').value.trim();
    if (raw === '') return true;
    const location = A.db.kitchen.locations.find(candidate => candidate.id === walk.locationId);
    const section = location?.sections?.find(candidate => candidate.id === walk.sectionId);
    const entry = walk.entries[walk.index];
    const item = A.db.items.find(candidate => candidate.id === entry.itemId);
    const result = C.normalizeCountRecord({ item, enteredQty: raw, enteredUnit: A.$('#walkUnit').value, baseUnitCost: item?.defaultBaseUnitCost, locationId: location?.id, sectionId: section?.id });
    if (!result.ok) {
      A.$('#walkQty').classList.add('invalid');
      A.notify(result.error, 'error');
      return false;
    }
    A.$('#walkQty').classList.remove('invalid');
    const period = A.currentPeriod();
    period.inventoryCounts.ending = period.inventoryCounts.ending.filter(record => !(record.itemId === item.id && record.locationId === location.id && record.sectionId === section.id));
    period.inventoryCounts.ending.push(result.record);
    A.saveDebounced();
    return true;
  }

  function startWalk() {
    if (!A.requireOpen('count inventory')) return;
    const location = A.currentLocation();
    const section = A.currentSection();
    if (!location || !section || !section.itemEntries.length) return;
    A.state.walk = { locationId: location.id, sectionId: section.id, entries: [...section.itemEntries].sort((a, b) => a.sortOrder - b.sortOrder), index: 0 };
    A.state.modalReturnFocus = A.$('#btnStartWalk');
    A.$('#walkOverlay').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    renderWalk();
  }

  function closeWalk(saveCurrent = true) {
    if (saveCurrent && !persistWalk()) return;
    A.state.walk = null;
    A.$('#walkOverlay').classList.add('hidden');
    document.body.style.overflow = '';
    A.state.modalReturnFocus?.focus?.();
    A.state.modalReturnFocus = null;
    A.renderAll();
  }

  function saveWalkFinding() {
    const text = A.$('#walkNote').value.trim();
    if (!text) return A.notify('Add a note first.', 'warning');
    const location = A.currentLocation();
    const section = A.currentSection();
    A.db.findings.unshift({ id: C.uid('finding'), periodId: A.state.periodId, createdAt: C.nowISO(), locationName: location?.name || '', sectionName: section?.name || '', text, status: 'open' });
    A.$('#walkNote').value = '';
    A.save();
    A.notify('Finding saved.', 'success');
  }

  A.bindCoreWorkflows = () => {
    A.$('#btnNewPeriod').onclick = event => createPeriodModal(event.currentTarget);
    A.$('#btnSavePeriodSetup').onclick = savePeriodSetup;
    A.$('#btnTogglePeriodLock').onclick = togglePeriodLock;
    A.$('#btnQuickAddItem').onclick = addQuickItem;
    A.$('#btnNewLocation').onclick = addLocation;
    A.$('#btnNewSection').onclick = addSection;
    A.$('#btnAddItemToSection').onclick = addItemToSection;
    A.$('#sectionItemSearch').onkeydown = event => { if (event.key === 'Enter') { event.preventDefault(); addItemToSection(); } };
    A.$('#btnStartWalk').onclick = startWalk;
    A.$('#btnCloseWalk').onclick = () => closeWalk(true);
    A.$('#btnZero').onclick = () => { A.$('#walkQty').value = '0'; persistWalk(); };
    A.$('#btnSameAsLast').onclick = () => {
      if (A.state.walk?.previousQty == null) return;
      A.$('#walkQty').value = A.state.walk.previousQty;
      A.$('#walkUnit').value = A.state.walk.previousUnit;
      persistWalk();
    };
    A.$('#btnPrevItem').onclick = () => { if (persistWalk()) { A.state.walk.index = Math.max(0, A.state.walk.index - 1); renderWalk(); } };
    A.$('#btnNextItem').onclick = () => {
      if (!persistWalk()) return;
      if (A.state.walk.index === A.state.walk.entries.length - 1) {
        closeWalk(false);
        A.notify('Walk count complete.', 'success');
      } else {
        A.state.walk.index += 1;
        renderWalk();
      }
    };
    A.$('#btnWalkSaveFinding').onclick = saveWalkFinding;
    A.$('#walkQty').onkeydown = event => { if (event.key === 'Enter') { event.preventDefault(); A.$('#btnNextItem').click(); } };
    A.$('#walkUnit').onchange = persistWalk;
    A.$('#btnClearRunningNotes').onclick = () => { A.$('#runningNotes').value = ''; };
    A.$('#btnSaveFinding').onclick = () => {
      const text = A.$('#runningNotes').value.trim();
      if (!text) return A.notify('Add a note first.', 'warning');
      A.db.findings.unshift({ id: C.uid('finding'), periodId: A.state.periodId, createdAt: C.nowISO(), locationName: A.currentLocation()?.name || '', sectionName: A.currentSection()?.name || '', text, status: 'open' });
      A.$('#runningNotes').value = '';
      A.save();
      A.renderAll();
      A.notify('Finding saved.', 'success');
    };

    document.addEventListener('click', event => {
      const locationRow = event.target.closest('[data-location-id]');
      if (locationRow) { A.state.locationId = locationRow.dataset.locationId; A.state.sectionId = null; A.renderAll(); return; }
      const sectionRow = event.target.closest('[data-section-id]');
      if (sectionRow) { A.state.sectionId = sectionRow.dataset.sectionId; A.renderAll(); return; }
      const itemRow = event.target.closest('[data-settings-item-id]');
      if (itemRow) { openItemEditor(A.db.items.find(item => item.id === itemRow.dataset.settingsItemId), itemRow); return; }
      if (event.target.closest('[data-open-reports]')) A.goTab('reports');
      if (event.target.closest('[data-close-modal]')) A.closeModal();
      if (event.target.id === 'confirmCreatePeriod') createPeriod();
    });
  };
})();
