(() => {
  'use strict';
  const A = window.AlibiApp;
  const C = A?.C;
  if (!A || !C) throw new Error('Alibi must initialize before runtime hardening.');

  const stop = event => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  };
  const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
  const cloneOrNull = value => value == null ? null : A.clone(value);
  const optionKey = (itemId, vendor, unit) => `${itemId}|${vendor || ''}|${unit || ''}`;

  function restoreDatabase(before) {
    A.db = before;
    A.renderAll();
  }

  function updateEndingCost(periodId, item) {
    const period = A.db.periods.find(candidate => candidate.id === periodId);
    if (!period || !item) return;
    for (const record of period.inventoryCounts?.ending || []) {
      if (record.itemId !== item.id) continue;
      record.baseUnitCost = item.defaultBaseUnitCost == null ? null : C.roundUnitCost(item.defaultBaseUnitCost);
      record.extendedValue = record.baseUnitCost == null ? null : C.roundMoney(record.normalizedBaseQty * record.baseUnitCost);
    }
  }

  function latestPostedLine(itemId, excludedInvoiceId, predicate = () => true) {
    const candidates = [];
    for (const invoice of A.db.invoices) {
      if (invoice.id === excludedInvoiceId || invoice.status !== 'posted') continue;
      (invoice.lines || []).forEach((line, lineIndex) => {
        if (line.itemId !== itemId || !Number.isFinite(Number(line.normalizedBaseUnitCost)) || !predicate(invoice, line)) return;
        candidates.push({ invoice, line, lineIndex });
      });
    }
    candidates.sort((a, b) => {
      const dateOrder = String(b.invoice.invoiceDate || '').localeCompare(String(a.invoice.invoiceDate || ''));
      if (dateOrder) return dateOrder;
      const updateOrder = String(b.invoice.updatedAt || b.invoice.createdAt || '').localeCompare(String(a.invoice.updatedAt || a.invoice.createdAt || ''));
      return updateOrder || b.lineIndex - a.lineIndex;
    });
    return candidates[0]?.line || null;
  }

  function identityConflict(records, currentId, name, aliases) {
    const proposed = new Set([name, ...(aliases || [])].map(C.normalizeText).filter(Boolean));
    if (!proposed.size) return null;
    for (const record of records) {
      if (record.id === currentId) continue;
      for (const raw of [record.name, ...(record.aliases || [])]) {
        const normalized = C.normalizeText(raw);
        if (normalized && proposed.has(normalized)) return record;
      }
    }
    return null;
  }

  function itemHasDependencies(itemId) {
    return A.db.periods.some(period => ['beginning', 'ending'].some(phase => (period.inventoryCounts?.[phase] || []).some(record => record.itemId === itemId))) ||
      A.db.invoices.some(invoice => (invoice.lines || []).some(line => line.itemId === itemId)) ||
      A.db.recipes.some(recipe => recipe.sourceItemId === itemId || (recipe.lines || []).some(line => line.itemId === itemId)) ||
      A.db.kitchen.locations.some(location => (location.sections || []).some(section => (section.itemEntries || []).some(entry => entry.itemId === itemId)));
  }

  function safeCreatePeriod() {
    const month = C.finiteNumber(A.$('#newPeriodMonth')?.value);
    const year = C.finiteNumber(A.$('#newPeriodYear')?.value);
    if (month < 1 || month > 12 || year < 2000 || year > 2200) return A.notify('Enter a valid month and year.', 'warning');
    if (A.db.periods.some(period => period.year === year && period.month === month)) return A.notify('That calendar period already exists.', 'warning');

    const before = A.clone(A.db);
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
    const saved = A.save();
    if (!saved.ok) return restoreDatabase(before);
    A.closeModal();
    A.renderAll();
    A.notify(`${period.label} created.`, 'success');
  }

  function refreshEndingValuation(period) {
    for (const record of period.inventoryCounts?.ending || []) {
      const item = A.db.items.find(candidate => candidate.id === record.itemId);
      if (!item) continue;
      const cost = item.defaultBaseUnitCost;
      record.baseUnitCost = cost == null ? null : C.roundUnitCost(cost);
      record.extendedValue = cost == null ? null : C.roundMoney(record.normalizedBaseQty * record.baseUnitCost);
    }
  }

  function safeTogglePeriodLock() {
    const period = A.currentPeriod();
    if (!period) return;
    const before = A.clone(A.db);

    if (period.status === 'locked') {
      const reason = prompt('Reason for unlocking this period:');
      if (!reason?.trim()) return;
      period.status = 'open';
      period.lockedAt = null;
      period.financialSnapshot = null;
      A.audit('period_unlocked', `${period.label}: ${reason.trim()}`);
      const saved = A.save();
      if (!saved.ok) return restoreDatabase(before);
      A.renderAll();
      A.notify('Period unlocked.', 'warning');
      return;
    }

    const issues = C.buildExceptions(A.db, period);
    if (issues.some(issue => issue.severity === 'incomplete') && !confirm('This period has incomplete data. Lock it anyway?')) return;
    const next = C.getNextPeriod(A.db.periods, period.id);
    if (next && next.status !== 'locked' && (next.inventoryCounts?.beginning || []).length) {
      if (!confirm(`Locking ${period.label} will replace ${next.label}'s beginning inventory with this period's finalized ending inventory. Continue?`)) return;
    }

    refreshEndingValuation(period);
    if (next && next.status !== 'locked') {
      next.inventoryCounts.beginning = (period.inventoryCounts?.ending || []).map(record => ({ ...A.clone(record), countedAt: next.openedAt || C.nowISO() }));
      next.updatedAt = C.nowISO();
      A.audit('next_period_beginning_synced', `${period.label} → ${next.label}`);
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
    const saved = A.save();
    if (!saved.ok) return restoreDatabase(before);
    A.renderAll();
    A.notify('Period locked and finalized values were carried forward.', 'success');
  }

  function safeSaveItem(item) {
    if (!item) return;
    const name = A.$('#editItemName')?.value.trim() || '';
    if (!name) return A.notify('Name is required.', 'warning');
    const aliases = (A.$('#editItemAliases')?.value || '').split(',').map(value => value.trim()).filter(Boolean);
    const conflict = identityConflict(A.db.items, item.id, name, aliases);
    if (conflict) return A.notify(`That name or alias is already used by ${conflict.name}.`, 'error', true);

    const nextBaseUnit = A.$('#editItemBaseUnit')?.value.trim() || 'ea';
    if (nextBaseUnit !== item.baseUnit && itemHasDependencies(item.id)) {
      return A.notify('Base unit cannot be changed after the item is linked or used. Create a new item instead.', 'error', true);
    }
    const before = A.clone(A.db);
    const rawCost = String(A.$('#editItemCost')?.value ?? '').trim();
    item.name = name;
    item.normalizedName = C.normalizeText(name);
    item.group = A.$('#editItemGroup')?.value || item.group;
    item.category = A.$('#editItemCategory')?.value.trim() || '';
    item.baseUnit = nextBaseUnit;
    item.defaultBaseUnitCost = rawCost === '' ? null : Math.max(0, C.finiteNumber(rawCost));
    item.aliases = aliases;
    item.excludedFromCount = Boolean(A.$('#editItemExcluded')?.checked);
    item.active = Boolean(A.$('#editItemActive')?.checked);
    item.costReviewRequired = false;
    item.unitConversions ||= {};
    const casePack = C.finiteNumber(A.$('#editItemCasePack')?.value);
    if (casePack > 0) {
      item.unitConversions.case = casePack;
      item.unitConversions.cs = casePack;
    } else {
      delete item.unitConversions.case;
      delete item.unitConversions.cs;
    }
    item.updatedAt = C.nowISO();
    if (!A.isLocked()) updateEndingCost(A.state.periodId, item);
    A.audit('item_updated', item.name);
    const saved = A.save();
    if (!saved.ok) return restoreDatabase(before);
    A.closeModal();
    A.renderAll();
    A.notify('Item saved.', 'success');
  }

  function safePostInvoice(invoice) {
    if (!A.requireOpen('post an invoice')) return;
    if (!invoice?.lines?.length) return A.notify('Add at least one invoice line before posting.', 'warning');
    const invalid = invoice.lines.filter(line =>
      !line.itemId ||
      !['exact', 'confirmed'].includes(line.matchConfidence) ||
      line.normalizationError ||
      !Number.isFinite(Number(line.normalizedBaseUnitQty)) ||
      !Number.isFinite(Number(line.normalizedBaseUnitCost)) ||
      line.purchaseUnitCost === '' || line.purchaseUnitCost === null || line.purchaseUnitCost === undefined
    );
    if (invalid.length) return A.notify(`Resolve or explicitly confirm ${invalid.length} line(s) before posting.`, 'error');

    const before = A.clone(A.db);
    const initialItems = new Map(before.items.map(item => [item.id, item]));
    const initialMemory = before.settings?.vendorMemory || {};
    for (const line of invoice.lines) {
      const item = A.db.items.find(candidate => candidate.id === line.itemId);
      const initialItem = initialItems.get(line.itemId);
      if (!item || !initialItem) {
        A.db = before;
        return A.notify('Posting stopped because an invoice line references a missing item.', 'error', true);
      }
      const previousOption = (initialItem.purchaseOptions || []).find(option => option.vendor === invoice.vendor && option.purchaseUnit === line.purchaseUnit);
      line.postingSnapshot = {
        previousBaseUnitCost: initialItem.defaultBaseUnitCost ?? null,
        previousPurchaseOption: cloneOrNull(previousOption),
        previousVendorMemory: cloneOrNull(initialMemory?.[invoice.vendor]?.[item.id])
      };
    }

    for (const line of invoice.lines) {
      const item = A.db.items.find(candidate => candidate.id === line.itemId);
      item.defaultBaseUnitCost = C.roundUnitCost(line.normalizedBaseUnitCost);
      item.updatedAt = C.nowISO();
      item.costReviewRequired = false;
      item.purchaseOptions ||= [];
      let option = item.purchaseOptions.find(candidate => candidate.vendor === invoice.vendor && candidate.purchaseUnit === line.purchaseUnit);
      if (!option) {
        option = { id: C.uid('purchaseOption'), vendor: invoice.vendor, purchaseUnit: line.purchaseUnit };
        item.purchaseOptions.push(option);
      }
      Object.assign(option, {
        baseUnitsPerPurchaseUnit: line.baseUnitsPerPurchaseUnit,
        lastPurchaseCost: line.purchaseUnitCost,
        normalizedBaseUnitCost: line.normalizedBaseUnitCost
      });
      A.db.settings.vendorMemory ||= {};
      A.db.settings.vendorMemory[invoice.vendor] ||= {};
      A.db.settings.vendorMemory[invoice.vendor][item.id] = {
        lastPurchaseUnit: line.purchaseUnit,
        lastUnitsPerPurchaseUnit: line.baseUnitsPerPurchaseUnit,
        lastPurchaseUnitCost: line.purchaseUnitCost,
        lastUsedAt: C.nowISO()
      };
      updateEndingCost(invoice.periodId, item);
    }
    invoice.status = 'posted';
    invoice.updatedAt = C.nowISO();
    A.audit('invoice_posted', `${invoice.vendor} ${invoice.invoiceNumber}`.trim());
    const saved = A.save();
    if (!saved.ok) return restoreDatabase(before);
    A.renderAll();
    A.notify('Invoice posted and base-unit costs updated.', 'success');
  }

  function restorePurchaseOption(item, invoice, sourceLine, excludedInvoiceId) {
    const replacement = latestPostedLine(item.id, excludedInvoiceId, (candidateInvoice, line) => candidateInvoice.vendor === invoice.vendor && line.purchaseUnit === sourceLine.purchaseUnit);
    const existingIndex = (item.purchaseOptions || []).findIndex(option => option.vendor === invoice.vendor && option.purchaseUnit === sourceLine.purchaseUnit);
    if (replacement) {
      const option = existingIndex >= 0
        ? item.purchaseOptions[existingIndex]
        : { id: C.uid('purchaseOption'), vendor: invoice.vendor, purchaseUnit: sourceLine.purchaseUnit };
      Object.assign(option, {
        baseUnitsPerPurchaseUnit: replacement.baseUnitsPerPurchaseUnit,
        lastPurchaseCost: replacement.purchaseUnitCost,
        normalizedBaseUnitCost: replacement.normalizedBaseUnitCost
      });
      if (existingIndex < 0) item.purchaseOptions.push(option);
      return;
    }
    const previous = sourceLine.postingSnapshot?.previousPurchaseOption;
    if (previous) {
      if (existingIndex >= 0) item.purchaseOptions[existingIndex] = A.clone(previous);
      else item.purchaseOptions.push(A.clone(previous));
    } else if (existingIndex >= 0) {
      item.purchaseOptions.splice(existingIndex, 1);
    }
  }

  function restoreVendorMemory(item, invoice, sourceLine, excludedInvoiceId) {
    const replacement = latestPostedLine(item.id, excludedInvoiceId, candidateInvoice => candidateInvoice.vendor === invoice.vendor);
    A.db.settings.vendorMemory ||= {};
    A.db.settings.vendorMemory[invoice.vendor] ||= {};
    if (replacement) {
      A.db.settings.vendorMemory[invoice.vendor][item.id] = {
        lastPurchaseUnit: replacement.purchaseUnit,
        lastUnitsPerPurchaseUnit: replacement.baseUnitsPerPurchaseUnit,
        lastPurchaseUnitCost: replacement.purchaseUnitCost,
        lastUsedAt: C.nowISO()
      };
      return;
    }
    const previous = sourceLine.postingSnapshot?.previousVendorMemory;
    if (previous) A.db.settings.vendorMemory[invoice.vendor][item.id] = A.clone(previous);
    else delete A.db.settings.vendorMemory[invoice.vendor][item.id];
    if (!Object.keys(A.db.settings.vendorMemory[invoice.vendor]).length) delete A.db.settings.vendorMemory[invoice.vendor];
  }

  function safeUnpostInvoice(invoice) {
    if (!invoice || invoice.status !== 'posted') return;
    if (!A.requireOpen('unpost an invoice')) return;
    if (!confirm('Move this posted invoice back to draft? Purchases will leave COGS and item costs, purchase options, and vendor memory will be reconciled.')) {
      A.renderAll();
      return;
    }
    const before = A.clone(A.db);
    invoice.status = 'draft';
    invoice.updatedAt = C.nowISO();
    const affectedItems = new Map();
    const affectedOptions = new Map();
    for (const line of invoice.lines || []) {
      if (!line.itemId) continue;
      if (!affectedItems.has(line.itemId)) affectedItems.set(line.itemId, line);
      const key = optionKey(line.itemId, invoice.vendor, line.purchaseUnit);
      if (!affectedOptions.has(key)) affectedOptions.set(key, line);
    }
    for (const [itemId, sourceLine] of affectedItems.entries()) {
      const item = A.db.items.find(candidate => candidate.id === itemId);
      if (!item) continue;
      const replacement = latestPostedLine(itemId, invoice.id);
      if (replacement) {
        item.defaultBaseUnitCost = C.roundUnitCost(replacement.normalizedBaseUnitCost);
        item.costReviewRequired = false;
      } else if (hasOwn(sourceLine.postingSnapshot || {}, 'previousBaseUnitCost')) {
        const previousCost = sourceLine.postingSnapshot.previousBaseUnitCost;
        item.defaultBaseUnitCost = previousCost == null ? null : C.roundUnitCost(previousCost);
        item.costReviewRequired = false;
      } else {
        item.defaultBaseUnitCost = null;
        item.costReviewRequired = true;
      }
      item.updatedAt = C.nowISO();
      updateEndingCost(invoice.periodId, item);
      restoreVendorMemory(item, invoice, sourceLine, invoice.id);
    }
    for (const sourceLine of affectedOptions.values()) {
      const item = A.db.items.find(candidate => candidate.id === sourceLine.itemId);
      if (item) restorePurchaseOption(item, invoice, sourceLine, invoice.id);
    }
    A.audit('invoice_unposted', `${invoice.vendor} ${invoice.invoiceNumber}`.trim());
    const saved = A.save();
    if (!saved.ok) return restoreDatabase(before);
    A.renderAll();
    A.notify('Invoice returned to draft and purchasing memory reconciled.', 'warning');
  }

  function safeImportPmix() {
    if (!A.requireOpen('import PMIX')) return;
    const text = A.$('#pmixInput')?.value.trim() || '';
    if (!text) return A.notify('Paste PMIX rows first.', 'warning');
    const errors = [];
    const rows = text.split(/\r?\n/).map(raw => raw.trim()).filter(Boolean).map((raw, index) => {
      const [name = '', sold = ''] = raw.split(/\t|,/).map(value => value.trim());
      const numeric = sold === '' ? NaN : Number(sold.replace(/,/g, ''));
      if (!name) errors.push(`Row ${index + 1}: menu item name is required.`);
      if (!Number.isFinite(numeric) || numeric < 0) errors.push(`Row ${index + 1}: quantity sold must be zero or greater.`);
      const recipe = C.matchRecipe(A.db.recipes, name);
      return { id: C.uid('pmixRow'), rawMenuItemName: name, normalizedMenuItemName: C.normalizeText(name), recipeId: recipe?.id || null, quantitySold: numeric, matchStatus: recipe ? 'matched' : 'unmatched' };
    });
    if (errors.length) return A.notify(`PMIX import rejected: ${errors.join(' ')}`, 'error', true);
    const before = A.clone(A.db);
    A.db.pmixImports.push({ id: C.uid('pmix'), periodId: A.state.periodId, source: 'Pasted CSV', importedAt: C.nowISO(), rows });
    A.audit('pmix_imported', `${rows.length} row(s) for ${A.currentPeriod().label}`);
    const saved = A.save();
    if (!saved.ok) return restoreDatabase(before);
    A.$('#pmixInput').value = '';
    A.renderAll();
    A.notify(`${rows.length} PMIX row(s) imported.`, 'success');
  }

  function itemUsedOutsideSourceRecipe(itemId, sourceRecipeId) {
    return A.db.periods.some(period => ['beginning', 'ending'].some(phase => (period.inventoryCounts?.[phase] || []).some(record => record.itemId === itemId))) ||
      A.db.invoices.some(invoice => (invoice.lines || []).some(line => line.itemId === itemId)) ||
      A.db.recipes.some(recipe => recipe.id !== sourceRecipeId && (recipe.lines || []).some(line => line.itemId === itemId)) ||
      A.db.kitchen.locations.some(location => (location.sections || []).some(section => (section.itemEntries || []).some(entry => entry.itemId === itemId)));
  }

  function safeDeleteRecipe(recipe) {
    if (!A.requireOpen('delete a recipe')) return;
    if (!recipe || !confirm('Delete this recipe?')) return;
    if (!A.createAutoBackup('before recipe deletion')) return A.notify('Recipe deletion stopped because the safety backup could not be created.', 'error', true);
    const before = A.clone(A.db);
    const sourceItem = recipe.sourceItemId ? A.db.items.find(item => item.id === recipe.sourceItemId) : null;
    if (sourceItem) {
      if (itemUsedOutsideSourceRecipe(sourceItem.id, recipe.id)) {
        sourceItem.sourceRecipeId = null;
        sourceItem.costReviewRequired = true;
      } else {
        A.db.items = A.db.items.filter(item => item.id !== sourceItem.id);
      }
    }
    for (const imported of A.db.pmixImports) {
      for (const row of imported.rows || []) {
        if (row.recipeId === recipe.id) {
          row.recipeId = null;
          row.matchStatus = 'unmatched';
        }
      }
    }
    A.db.recipes = A.db.recipes.filter(candidate => candidate.id !== recipe.id);
    A.state.recipeId = null;
    A.audit('recipe_deleted', recipe.name);
    const saved = A.save();
    if (!saved.ok) return restoreDatabase(before);
    A.renderAll();
    A.notify('Recipe deleted.', 'success');
  }

  function safeSyncBatch(recipe) {
    if (!A.requireOpen('sync a batch recipe')) return;
    if (!recipe || recipe.type !== 'batch' || !recipe.name.trim()) return A.notify('Name the batch recipe first.', 'warning');
    const conflict = identityConflict(A.db.recipes, recipe.id, recipe.name, recipe.aliases || []);
    if (conflict) return A.notify(`That recipe name or alias is already used by ${conflict.name}.`, 'error', true);
    const cost = C.recipeCost(recipe, A.itemsById());
    if (!cost.ok) return A.notify(cost.errors.join(' '), 'error');
    const before = A.clone(A.db);
    let item = recipe.sourceItemId ? A.db.items.find(candidate => candidate.id === recipe.sourceItemId) : null;
    if (!item) {
      const itemConflict = identityConflict(A.db.items, null, recipe.name, []);
      if (itemConflict) return A.notify(`A different inventory item already uses the name ${itemConflict.name}.`, 'error', true);
      item = { id: C.uid('item'), name: recipe.name.trim(), normalizedName: C.normalizeText(recipe.name), group: 'batch', category: 'batch', baseUnit: recipe.yieldUnit, unitConversions: {}, purchaseOptions: [], defaultBaseUnitCost: cost.unitCost, aliases: [], excludedFromCount: false, active: true, costReviewRequired: false, sourceRecipeId: recipe.id, createdAt: C.nowISO(), updatedAt: C.nowISO() };
      A.db.items.push(item);
      recipe.sourceItemId = item.id;
    } else {
      if (item.baseUnit !== recipe.yieldUnit) return A.notify('The yield unit is locked after batch sync. Restore the original yield unit before syncing.', 'error', true);
      Object.assign(item, { name: recipe.name.trim(), normalizedName: C.normalizeText(recipe.name), group: 'batch', category: 'batch', defaultBaseUnitCost: cost.unitCost, sourceRecipeId: recipe.id, updatedAt: C.nowISO() });
    }
    recipe.updatedAt = C.nowISO();
    A.audit('batch_synced', recipe.name);
    const saved = A.save();
    if (!saved.ok) return restoreDatabase(before);
    A.renderAll();
    A.notify('Batch synced to inventory.', 'success');
  }

  function validateRecipeHeaderChange(recipe) {
    if (!recipe) return true;
    const name = A.$('#recipeName')?.value.trim() || '';
    const aliases = (A.$('#recipeAliases')?.value || '').split(',').map(value => value.trim()).filter(Boolean);
    const conflict = identityConflict(A.db.recipes, recipe.id, name, aliases);
    if (conflict) {
      A.notify(`That recipe name or alias is already used by ${conflict.name}.`, 'error', true);
      A.renderAll();
      return false;
    }
    const nextYieldUnit = A.$('#recipeYieldUnit')?.value.trim() || recipe.yieldUnit;
    if (recipe.sourceItemId && nextYieldUnit !== recipe.yieldUnit) {
      A.notify('The yield unit is locked after a batch recipe is linked to inventory.', 'error', true);
      A.renderAll();
      return false;
    }
    return true;
  }

  document.addEventListener('click', event => {
    const settingsRow = event.target.closest?.('[data-settings-item-id]');
    if (settingsRow) A.state.editingItemId = settingsRow.dataset.settingsItemId;

    const target = event.target.closest?.('button, [data-invoice-line-id]');
    if (!target) return;
    const invoice = A.currentInvoice();

    if (target.id === 'confirmCreatePeriod') {
      stop(event);
      safeCreatePeriod();
      return;
    }
    if (target.id === 'btnTogglePeriodLock') {
      stop(event);
      safeTogglePeriodLock();
      return;
    }
    if (target.id === 'saveItem') {
      stop(event);
      safeSaveItem(A.db.items.find(candidate => candidate.id === A.state.editingItemId));
      return;
    }
    if (target.id === 'btnPostInvoice') {
      stop(event);
      safePostInvoice(invoice);
      return;
    }
    if (target.id === 'btnDeleteInvoice' && invoice?.status === 'posted') {
      stop(event);
      A.notify('Posted invoices must be returned to draft before deletion.', 'warning');
      return;
    }
    if ((target.id === 'btnAddInvoiceLine' || target.id === 'btnPasteInvoiceLines' || target.dataset?.invoiceLineId) && invoice?.status === 'posted') {
      stop(event);
      A.notify('Posted invoice lines are immutable. Return the invoice to draft before editing.', 'warning');
      return;
    }
    if (target.id === 'btnImportPmix') {
      stop(event);
      safeImportPmix();
      return;
    }
    if (target.id === 'btnDeleteRecipe') {
      stop(event);
      safeDeleteRecipe(A.currentRecipe());
      return;
    }
    if (target.id === 'btnSyncBatch') {
      stop(event);
      safeSyncBatch(A.currentRecipe());
      return;
    }
    if (target.id === 'deleteItem') {
      const item = A.db.items.find(candidate => candidate.id === A.state.editingItemId);
      const linked = item?.sourceRecipeId || A.db.recipes.some(recipe => recipe.sourceItemId === item?.id);
      if (linked) {
        stop(event);
        A.notify('This item is linked to a batch recipe. Delete or unlink the recipe first.', 'warning');
      }
    }
  }, true);

  document.addEventListener('change', event => {
    const invoice = A.currentInvoice();
    if (event.target.id === 'invoiceStatus') {
      stop(event);
      if (event.target.value === 'posted') safePostInvoice(invoice);
      else if (invoice?.status === 'posted') safeUnpostInvoice(invoice);
      else A.renderAll();
      return;
    }
    if (invoice?.status === 'posted' && ['invoiceVendor', 'invoiceNumber', 'invoiceDate', 'invoiceNotes'].includes(event.target.id)) {
      stop(event);
      A.notify('Posted invoice headers are immutable. Return the invoice to draft before editing.', 'warning');
      A.renderAll();
      return;
    }
    if (['recipeName', 'recipeYieldQty', 'recipeYieldUnit', 'recipeAliases', 'recipeNotes'].includes(event.target.id)) {
      if (!validateRecipeHeaderChange(A.currentRecipe())) stop(event);
    }
  }, true);

  document.addEventListener('input', event => {
    if (event.target.id !== 'walkQty' || event.target.value.trim() !== '' || !A.state.walk) return;
    const walk = A.state.walk;
    const entry = walk.entries?.[walk.index];
    const period = A.currentPeriod();
    if (!entry || !period) return;
    const beforeLength = period.inventoryCounts.ending.length;
    period.inventoryCounts.ending = period.inventoryCounts.ending.filter(record => !(
      record.itemId === entry.itemId && record.locationId === walk.locationId && record.sectionId === walk.sectionId
    ));
    if (period.inventoryCounts.ending.length !== beforeLength) A.saveDebounced();
  }, true);

  A.hardening = {
    safeCreatePeriod,
    safeTogglePeriodLock,
    safeSaveItem,
    safePostInvoice,
    safeUnpostInvoice,
    safeImportPmix,
    safeDeleteRecipe,
    safeSyncBatch,
    identityConflict,
    refreshEndingValuation,
    latestPostedLine
  };
})();
