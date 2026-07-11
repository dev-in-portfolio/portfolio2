(() => {
  'use strict';
  const A = window.AlibiApp;
  const C = A.C;

  function createInvoice() {
    if (!A.requireOpen('create an invoice')) return;
    const invoice = {
      id: C.uid('invoice'), periodId: A.state.periodId, vendor: '', invoiceNumber: '',
      invoiceDate: new Date().toISOString().slice(0, 10), notes: '', status: 'draft', lines: [],
      createdAt: C.nowISO(), updatedAt: C.nowISO()
    };
    A.db.invoices.unshift(invoice);
    A.state.invoiceId = invoice.id;
    A.audit('invoice_created', A.currentPeriod().label);
    A.save();
    A.renderAll();
  }

  function duplicateInvoice() {
    if (!A.requireOpen('duplicate an invoice')) return;
    const invoice = A.currentInvoice();
    if (!invoice) return;
    const copy = A.clone(invoice);
    copy.id = C.uid('invoice');
    copy.invoiceNumber = '';
    copy.invoiceDate = new Date().toISOString().slice(0, 10);
    copy.status = 'draft';
    copy.createdAt = C.nowISO();
    copy.updatedAt = C.nowISO();
    copy.lines = copy.lines.map(line => ({ ...line, id: C.uid('line') }));
    A.db.invoices.unshift(copy);
    A.state.invoiceId = copy.id;
    A.audit('invoice_duplicated', invoice.vendor);
    A.save();
    A.renderAll();
  }

  function deleteInvoice() {
    if (!A.requireOpen('delete an invoice')) return;
    const invoice = A.currentInvoice();
    if (!invoice || !confirm('Delete this invoice?')) return;
    A.createAutoBackup('before invoice deletion');
    A.db.invoices = A.db.invoices.filter(candidate => candidate.id !== invoice.id);
    A.audit('invoice_deleted', `${invoice.vendor} ${invoice.invoiceNumber}`.trim());
    A.state.invoiceId = null;
    A.save();
    A.renderAll();
  }

  function updateInvoiceHeader() {
    const invoice = A.currentInvoice();
    if (!invoice || A.isLocked()) return;
    invoice.vendor = A.$('#invoiceVendor')?.value.trim() || '';
    invoice.invoiceNumber = A.$('#invoiceNumber')?.value.trim() || '';
    invoice.invoiceDate = A.$('#invoiceDate')?.value || '';
    invoice.notes = A.$('#invoiceNotes')?.value.trim() || '';
    invoice.updatedAt = C.nowISO();
    A.saveDebounced();
  }

  function lineEditorHtml(line = {}) {
    const itemName = A.db.items.find(item => item.id === line.itemId)?.name || line.rawName || '';
    return `
      <div class="overlay-heading"><div><div class="eyebrow">Invoice line</div><h2 id="sharedModalTitle">${line.id ? 'Edit Line' : 'Add Line'}</h2><p>Normalize commercial packaging to the inventory item’s base unit.</p></div><button class="btn secondary" data-close-modal type="button">Close</button></div>
      <label>Item / Raw Name<input id="lineItemName" class="input" list="modalItemsDatalist" value="${A.escapeAttr(itemName)}"><datalist id="modalItemsDatalist">${A.db.items.filter(item => item.active).map(item => `<option value="${A.escapeAttr(item.name)}"></option>`).join('')}</datalist></label>
      <div class="form-grid two">
        <label>Purchase Quantity<input id="linePurchaseQty" class="input" type="number" min="0" step="0.0001" value="${A.escapeAttr(line.purchaseQty ?? 1)}"></label>
        <label>Purchase Unit<input id="linePurchaseUnit" class="input" value="${A.escapeAttr(line.purchaseUnit || 'case')}"></label>
        <label>Base Units per Purchase Unit<input id="linePackFactor" class="input" type="number" min="0.000001" step="0.000001" value="${A.escapeAttr(line.baseUnitsPerPurchaseUnit ?? 1)}"></label>
        <label>Purchase Unit Cost<input id="lineUnitCost" class="input" type="number" min="0" step="0.0001" value="${A.escapeAttr(line.purchaseUnitCost ?? 0)}"></label>
        <label>Group<select id="lineGroup" class="select">${['ingredients','products','batch','nonfood'].map(group => `<option value="${group}" ${line.groupSnapshot === group ? 'selected' : ''}>${group}</option>`).join('')}</select></label>
        <label>Category<input id="lineCategory" class="input" value="${A.escapeAttr(line.categorySnapshot || '')}"></label>
      </div>
      <label>Notes<input id="lineNotes" class="input" value="${A.escapeAttr(line.notes || '')}"></label>
      <div id="linePreview" class="card"></div>
      <div class="modal-actions">${line.id ? '<button id="deleteInvoiceLine" class="btn danger" type="button">Delete Line</button>' : ''}<button id="saveInvoiceLine" class="btn" type="button">Save Line</button></div>`;
  }

  function confirmSuggestedMatch(match, rawName) {
    if (!match || match.confidence === 'exact') return match?.confidence || 'unmatched';
    const accepted = confirm(`“${rawName}” was matched to “${match.item.name}” with ${match.confidence} confidence. Confirm this item match?`);
    return accepted ? 'confirmed' : null;
  }

  function openInvoiceLineEditor(invoice, existingLine, opener) {
    if (!A.requireOpen('edit invoice lines')) return;
    const draft = existingLine ? A.clone(existingLine) : {
      purchaseQty: 1, purchaseUnit: 'case', baseUnitsPerPurchaseUnit: 1, purchaseUnitCost: 0,
      groupSnapshot: 'ingredients', categorySnapshot: '', notes: ''
    };
    A.openModal(lineEditorHtml(draft), opener);

    const updatePreview = () => {
      const match = A.findItem(A.$('#lineItemName').value);
      const item = match?.item;
      if (item && !existingLine && A.$('#linePackFactor').value === '1') {
        const remembered = A.db.settings.vendorMemory?.[invoice.vendor]?.[item.id];
        const factor = remembered?.lastUnitsPerPurchaseUnit || C.getItemConversion(item, A.$('#linePurchaseUnit').value);
        if (factor) A.$('#linePackFactor').value = factor;
        if (remembered?.lastPurchaseUnitCost != null) A.$('#lineUnitCost').value = remembered.lastPurchaseUnitCost;
      }
      if (item) {
        A.$('#lineGroup').value = item.group;
        if (!A.$('#lineCategory').value) A.$('#lineCategory').value = item.category || '';
      }
      const normalized = C.normalizePurchaseLine({
        purchaseQty: A.$('#linePurchaseQty').value,
        purchaseUnit: A.$('#linePurchaseUnit').value.trim(),
        purchaseUnitCost: A.$('#lineUnitCost').value,
        baseUnitsPerPurchaseUnit: A.$('#linePackFactor').value,
        baseUnit: item?.baseUnit || A.$('#linePurchaseUnit').value.trim()
      });
      A.$('#linePreview').innerHTML = normalized.ok
        ? `<div class="key-values"><span>Extended Cost</span><strong>${A.money(normalized.extendedCost)}</strong><span>Normalized Quantity</span><strong>${A.qty(normalized.normalizedBaseUnitQty)} ${A.escapeHtml(item?.baseUnit || normalized.baseUnit)}</strong><span>Cost per Base Unit</span><strong>${A.unitCost(normalized.normalizedBaseUnitCost)}</strong><span>Match</span><strong>${A.escapeHtml(item ? `${item.name} (${match.confidence})` : 'Unmatched')}</strong></div>`
        : A.badge(normalized.errors.join(' '), 'danger');
      return { match, normalized };
    };

    ['lineItemName','linePurchaseQty','linePurchaseUnit','linePackFactor','lineUnitCost'].forEach(id => A.$(`#${id}`).addEventListener('input', updatePreview));
    updatePreview();

    A.$('#saveInvoiceLine').onclick = () => {
      const { match, normalized } = updatePreview();
      if (!normalized.ok) return A.notify(normalized.errors.join(' '), 'error');
      const rawName = A.$('#lineItemName').value.trim();
      const confidence = confirmSuggestedMatch(match, rawName);
      if (match && !confidence) return;
      const target = existingLine || { id: C.uid('line') };
      Object.assign(target, {
        rawName,
        itemId: match?.item?.id || null,
        purchaseQty: normalized.purchaseQty,
        purchaseUnit: normalized.purchaseUnit,
        baseUnitsPerPurchaseUnit: normalized.baseUnitsPerPurchaseUnit,
        purchaseUnitCost: normalized.purchaseUnitCost,
        normalizedBaseUnitQty: normalized.normalizedBaseUnitQty,
        normalizedBaseUnitCost: normalized.normalizedBaseUnitCost,
        extendedCost: normalized.extendedCost,
        groupSnapshot: A.$('#lineGroup').value,
        categorySnapshot: A.$('#lineCategory').value.trim(),
        matchConfidence: confidence,
        notes: A.$('#lineNotes').value.trim(),
        normalizationError: null
      });
      if (!existingLine) invoice.lines.push(target);
      invoice.status = 'draft';
      invoice.updatedAt = C.nowISO();
      A.save();
      A.closeModal();
      A.renderAll();
    };
    A.$('#deleteInvoiceLine')?.addEventListener('click', () => {
      if (!confirm('Delete this invoice line?')) return;
      invoice.lines = invoice.lines.filter(line => line.id !== existingLine.id);
      invoice.status = 'draft';
      A.save();
      A.closeModal();
      A.renderAll();
    });
  }

  function parsePasteRows(text) {
    return text.split(/\r?\n/).map(raw => raw.trim()).filter(Boolean).map((raw, index) => {
      const [name = '', qty = '1', unit = '', unitCost = '', pack = ''] = raw.split(/\t|,/).map(value => value.trim());
      const match = A.findItem(name);
      const item = match?.item;
      const knownFactor = C.getItemConversion(item, unit) || (unit === item?.baseUnit ? 1 : NaN);
      const factor = String(pack).trim() === '' ? knownFactor : C.finiteNumber(pack, NaN);
      const normalized = C.normalizePurchaseLine({ purchaseQty: qty, purchaseUnit: unit || item?.baseUnit || '', purchaseUnitCost: unitCost, baseUnitsPerPurchaseUnit: factor, baseUnit: item?.baseUnit || unit });
      return { index: index + 1, name, match, normalized };
    });
  }

  function openPasteInvoice(invoice, opener) {
    if (!A.requireOpen('paste invoice lines')) return;
    A.openModal(`
      <div class="overlay-heading"><div><div class="eyebrow">Bulk entry</div><h2 id="sharedModalTitle">Paste Invoice Lines</h2><p>Name, quantity, purchase unit, purchase-unit cost, pack size.</p></div><button class="btn secondary" data-close-modal type="button">Close</button></div>
      <textarea id="pasteInvoiceArea" class="textarea" placeholder="Ketchup,2,case,30,12"></textarea>
      <div class="button-row"><button id="previewPasteRows" class="btn secondary" type="button">Preview</button></div><div id="pastePreview"></div>`, opener);
    A.$('#previewPasteRows').onclick = () => {
      const rows = parsePasteRows(A.$('#pasteInvoiceArea').value);
      const valid = rows.filter(row => row.normalized.ok);
      A.$('#pastePreview').innerHTML = rows.length
        ? `<div class="table-wrap preview-table"><table><thead><tr><th>Row</th><th>Item</th><th>Match</th><th>Normalized</th><th>Status</th></tr></thead><tbody>${rows.map(row => `<tr><td>${row.index}</td><td>${A.escapeHtml(row.name)}</td><td>${A.escapeHtml(row.match?.item?.name || 'Unmatched')}</td><td>${row.normalized.ok ? `${A.qty(row.normalized.normalizedBaseUnitQty)} ${A.escapeHtml(row.match?.item?.baseUnit || row.normalized.baseUnit)} @ ${A.unitCost(row.normalized.normalizedBaseUnitCost)}` : '—'}</td><td>${row.normalized.ok ? A.badge(row.match ? row.match.confidence : 'unmatched', row.match?.confidence === 'exact' ? 'success' : 'warning') : A.badge(row.normalized.errors.join(' '), 'danger')}</td></tr>`).join('')}</tbody></table></div><div class="modal-actions"><button id="applyPasteRows" class="btn" type="button">Review and Add ${valid.length} Valid Row(s)</button></div>`
        : A.empty('Nothing to preview.');
      A.$('#applyPasteRows')?.addEventListener('click', () => {
        const accepted = [];
        for (const row of valid) {
          const confidence = confirmSuggestedMatch(row.match, row.name);
          if (row.match && !confidence) continue;
          accepted.push({ row, confidence });
        }
        accepted.forEach(({ row, confidence }) => invoice.lines.push({
          id: C.uid('line'), rawName: row.name, itemId: row.match?.item?.id || null,
          purchaseQty: row.normalized.purchaseQty, purchaseUnit: row.normalized.purchaseUnit,
          baseUnitsPerPurchaseUnit: row.normalized.baseUnitsPerPurchaseUnit, purchaseUnitCost: row.normalized.purchaseUnitCost,
          normalizedBaseUnitQty: row.normalized.normalizedBaseUnitQty, normalizedBaseUnitCost: row.normalized.normalizedBaseUnitCost,
          extendedCost: row.normalized.extendedCost, groupSnapshot: row.match?.item?.group || 'ingredients',
          categorySnapshot: row.match?.item?.category || '', matchConfidence: confidence, notes: '', normalizationError: null
        }));
        invoice.status = 'draft';
        invoice.updatedAt = C.nowISO();
        A.save();
        A.closeModal();
        A.renderAll();
        A.notify(`${accepted.length} invoice line(s) added.`, 'success');
      });
    };
  }

  function postInvoice(invoice) {
    if (!A.requireOpen('post an invoice')) return;
    if (!invoice?.lines?.length) return A.notify('Add at least one invoice line before posting.', 'warning');
    const invalid = invoice.lines.filter(line => !line.itemId || !['exact', 'confirmed'].includes(line.matchConfidence) || line.normalizationError || !Number.isFinite(Number(line.normalizedBaseUnitQty)) || !Number.isFinite(Number(line.normalizedBaseUnitCost)));
    if (invalid.length) return A.notify(`Resolve or explicitly confirm ${invalid.length} line(s) before posting.`, 'error');
    for (const line of invoice.lines) {
      const item = A.db.items.find(candidate => candidate.id === line.itemId);
      item.defaultBaseUnitCost = C.roundUnitCost(line.normalizedBaseUnitCost);
      item.updatedAt = C.nowISO();
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
      for (const record of A.currentPeriod().inventoryCounts.ending || []) {
        if (record.itemId !== item.id) continue;
        record.baseUnitCost = C.roundUnitCost(item.defaultBaseUnitCost);
        record.extendedValue = C.roundMoney(record.normalizedBaseQty * record.baseUnitCost);
      }
    }
    invoice.status = 'posted';
    invoice.updatedAt = C.nowISO();
    A.audit('invoice_posted', `${invoice.vendor} ${invoice.invoiceNumber}`.trim());
    const saved = A.save();
    if (!saved.ok) {
      invoice.status = 'draft';
      return;
    }
    A.renderAll();
    A.notify('Invoice posted and base-unit costs updated.', 'success');
  }

  function createRecipe(type) {
    if (!A.requireOpen('create a recipe')) return;
    const recipe = { id: C.uid('recipe'), type, name: '', aliases: [], yieldQty: 1, yieldUnit: type === 'batch' ? 'qt' : 'portion', lines: [], notes: '', active: true, sourceItemId: null, createdAt: C.nowISO(), updatedAt: C.nowISO() };
    A.db.recipes.unshift(recipe);
    A.state.recipeFilter = type;
    A.state.recipeId = recipe.id;
    A.audit('recipe_created', type);
    A.save();
    A.renderAll();
  }

  function deleteRecipe() {
    if (!A.requireOpen('delete a recipe')) return;
    const recipe = A.currentRecipe();
    if (!recipe || !confirm('Delete this recipe?')) return;
    A.createAutoBackup('before recipe deletion');
    A.db.recipes = A.db.recipes.filter(candidate => candidate.id !== recipe.id);
    A.state.recipeId = null;
    A.audit('recipe_deleted', recipe.name);
    A.save();
    A.renderAll();
  }

  function updateRecipeHeader() {
    const recipe = A.currentRecipe();
    if (!recipe || A.isLocked()) return;
    recipe.name = A.$('#recipeName')?.value.trim() || '';
    recipe.yieldQty = Math.max(.000001, C.finiteNumber(A.$('#recipeYieldQty')?.value, 1));
    recipe.yieldUnit = A.$('#recipeYieldUnit')?.value.trim() || 'portion';
    recipe.aliases = (A.$('#recipeAliases')?.value || '').split(',').map(value => value.trim()).filter(Boolean);
    recipe.notes = A.$('#recipeNotes')?.value.trim() || '';
    recipe.updatedAt = C.nowISO();
    A.saveDebounced();
  }

  function openRecipeLineEditor(recipe, existingLine, opener) {
    if (!A.requireOpen('edit recipe ingredients')) return;
    const itemName = A.db.items.find(item => item.id === existingLine?.itemId)?.name || '';
    A.openModal(`
      <div class="overlay-heading"><div><div class="eyebrow">Recipe ingredient</div><h2 id="sharedModalTitle">${existingLine ? 'Edit Ingredient' : 'Add Ingredient'}</h2><p>Quantity is converted to the item’s base unit before costing.</p></div><button class="btn secondary" data-close-modal type="button">Close</button></div>
      <label>Item<input id="recipeLineItem" class="input" list="recipeItemsDatalist" value="${A.escapeAttr(itemName)}"><datalist id="recipeItemsDatalist">${A.db.items.filter(item => item.active).map(item => `<option value="${A.escapeAttr(item.name)}"></option>`).join('')}</datalist></label>
      <div class="form-grid two"><label>Quantity<input id="recipeLineQty" class="input" type="number" min="0" step="0.0001" value="${A.escapeAttr(existingLine?.qty ?? 0)}"></label><label>Unit<input id="recipeLineUnit" class="input" value="${A.escapeAttr(existingLine?.unit || 'ea')}"></label></div>
      <div id="recipeLinePreview" class="card"></div>
      <div class="modal-actions">${existingLine ? '<button id="deleteRecipeLine" class="btn danger" type="button">Delete Ingredient</button>' : ''}<button id="saveRecipeLine" class="btn" type="button">Save Ingredient</button></div>`, opener);
    const preview = () => {
      const match = A.findItem(A.$('#recipeLineItem').value);
      const item = match?.item;
      const conversion = item ? C.convertQuantity({ quantity: A.$('#recipeLineQty').value, fromUnit: A.$('#recipeLineUnit').value.trim(), toUnit: item.baseUnit, item }) : { ok: false, error: 'Choose an existing item.' };
      A.$('#recipeLinePreview').innerHTML = conversion.ok
        ? `<div class="key-values"><span>Normalized Quantity</span><strong>${A.qty(conversion.quantity)} ${A.escapeHtml(item.baseUnit)}</strong><span>Ingredient Cost</span><strong>${A.money(conversion.quantity * C.finiteNumber(item.defaultBaseUnitCost))}</strong></div>`
        : A.badge(conversion.error, 'danger');
      return { match, conversion };
    };
    ['recipeLineItem','recipeLineQty','recipeLineUnit'].forEach(id => A.$(`#${id}`).addEventListener('input', preview));
    preview();
    A.$('#saveRecipeLine').onclick = () => {
      const { match, conversion } = preview();
      if (!match || match.confidence !== 'exact') return A.notify('Choose an exact existing item name.', 'error');
      if (!conversion.ok) return A.notify(conversion.error, 'error');
      const target = existingLine || { id: C.uid('recipeLine') };
      Object.assign(target, { itemId: match.item.id, qty: Math.max(0, C.finiteNumber(A.$('#recipeLineQty').value)), unit: A.$('#recipeLineUnit').value.trim() || match.item.baseUnit });
      if (!existingLine) recipe.lines.push(target);
      recipe.updatedAt = C.nowISO();
      A.save();
      A.closeModal();
      A.renderAll();
    };
    A.$('#deleteRecipeLine')?.addEventListener('click', () => {
      recipe.lines = recipe.lines.filter(line => line.id !== existingLine.id);
      A.save();
      A.closeModal();
      A.renderAll();
    });
  }

  function syncBatch(recipe) {
    if (!recipe || recipe.type !== 'batch' || !recipe.name.trim()) return A.notify('Name the batch recipe first.', 'warning');
    const cost = C.recipeCost(recipe, A.itemsById());
    if (!cost.ok) return A.notify(cost.errors.join(' '), 'error');
    let item = recipe.sourceItemId ? A.db.items.find(candidate => candidate.id === recipe.sourceItemId) : null;
    if (!item) {
      item = { id: C.uid('item'), name: recipe.name.trim(), normalizedName: C.normalizeText(recipe.name), group: 'batch', category: 'batch', baseUnit: recipe.yieldUnit, unitConversions: {}, purchaseOptions: [], defaultBaseUnitCost: cost.unitCost, aliases: [], excludedFromCount: false, active: true, costReviewRequired: false, sourceRecipeId: recipe.id, createdAt: C.nowISO(), updatedAt: C.nowISO() };
      A.db.items.push(item);
      recipe.sourceItemId = item.id;
    } else {
      if (item.baseUnit !== recipe.yieldUnit) return A.notify('The synced inventory item base unit differs from the recipe yield unit. Create a new batch item instead.', 'error');
      Object.assign(item, { name: recipe.name.trim(), normalizedName: C.normalizeText(recipe.name), group: 'batch', category: 'batch', defaultBaseUnitCost: cost.unitCost, sourceRecipeId: recipe.id, updatedAt: C.nowISO() });
    }
    A.audit('batch_synced', recipe.name);
    A.save();
    A.renderAll();
    A.notify('Batch synced to inventory.', 'success');
  }

  function importPmix() {
    if (!A.requireOpen('import PMIX')) return;
    const text = A.$('#pmixInput').value.trim();
    if (!text) return A.notify('Paste PMIX rows first.', 'warning');
    const rows = text.split(/\r?\n/).map(raw => raw.trim()).filter(Boolean).map(raw => {
      const [name = '', sold = '0'] = raw.split(/\t|,/).map(value => value.trim());
      const recipe = C.matchRecipe(A.db.recipes, name);
      return { id: C.uid('pmixRow'), rawMenuItemName: name, normalizedMenuItemName: C.normalizeText(name), recipeId: recipe?.id || null, quantitySold: Math.max(0, C.finiteNumber(sold)), matchStatus: recipe ? 'matched' : 'unmatched' };
    });
    A.db.pmixImports.push({ id: C.uid('pmix'), periodId: A.state.periodId, source: 'Pasted CSV', importedAt: C.nowISO(), rows });
    A.audit('pmix_imported', `${rows.length} row(s) for ${A.currentPeriod().label}`);
    A.$('#pmixInput').value = '';
    A.save();
    A.renderAll();
    A.notify(`${rows.length} PMIX row(s) imported.`, 'success');
  }

  A.bindFinanceWorkflows = () => {
    A.$('#btnNewInvoice').onclick = createInvoice;
    A.$('#btnDuplicateInvoice').onclick = duplicateInvoice;
    A.$('#btnDeleteInvoice').onclick = deleteInvoice;
    A.$('#btnNewPortionRecipe').onclick = () => createRecipe('portion');
    A.$('#btnNewBatchRecipe').onclick = () => createRecipe('batch');
    A.$('#btnDeleteRecipe').onclick = deleteRecipe;
    A.$('#btnImportPmix').onclick = importPmix;

    document.addEventListener('click', event => {
      const invoiceRow = event.target.closest('[data-invoice-id]');
      if (invoiceRow) { A.state.invoiceId = invoiceRow.dataset.invoiceId; A.renderAll(); return; }
      const invoiceLine = event.target.closest('[data-invoice-line-id]');
      if (invoiceLine) { const invoice = A.currentInvoice(); openInvoiceLineEditor(invoice, invoice.lines.find(line => line.id === invoiceLine.dataset.invoiceLineId), invoiceLine); return; }
      if (event.target.id === 'btnAddInvoiceLine') { openInvoiceLineEditor(A.currentInvoice(), null, event.target); return; }
      if (event.target.id === 'btnPasteInvoiceLines') { openPasteInvoice(A.currentInvoice(), event.target); return; }
      if (event.target.id === 'btnPostInvoice') { postInvoice(A.currentInvoice()); return; }

      const recipeRow = event.target.closest('[data-recipe-id]');
      if (recipeRow) { A.state.recipeId = recipeRow.dataset.recipeId; A.renderAll(); return; }
      const recipeLine = event.target.closest('[data-recipe-line-id]');
      if (recipeLine) { const recipe = A.currentRecipe(); openRecipeLineEditor(recipe, recipe.lines.find(line => line.id === recipeLine.dataset.recipeLineId), recipeLine); return; }
      if (event.target.id === 'btnAddRecipeLine') { openRecipeLineEditor(A.currentRecipe(), null, event.target); return; }
      if (event.target.id === 'btnSyncBatch') syncBatch(A.currentRecipe());
    });

    document.addEventListener('change', event => {
      if (['invoiceVendor','invoiceNumber','invoiceDate','invoiceNotes'].includes(event.target.id)) updateInvoiceHeader();
      if (event.target.id === 'invoiceStatus') {
        if (event.target.value === 'posted') postInvoice(A.currentInvoice());
        else { A.currentInvoice().status = 'draft'; A.save(); A.renderAll(); }
      }
      if (['recipeName','recipeYieldQty','recipeYieldUnit','recipeAliases','recipeNotes'].includes(event.target.id)) updateRecipeHeader();
    });

    A.$$('.segment[data-recipe-filter]').forEach(button => button.onclick = () => {
      A.state.recipeFilter = button.dataset.recipeFilter;
      A.state.recipeId = null;
      A.renderAll();
    });
  };
})();
