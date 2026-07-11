(() => {
  'use strict';
  const A = window.AlibiApp;
  const C = A.C;

  function renderPeriodSelect() {
    A.db.periods = C.sortPeriods(A.db.periods);
    if (!A.db.periods.some(period => period.id === A.state.periodId)) A.state.periodId = A.db.periods[0]?.id || null;
    const select = A.$('#periodSelect');
    select.innerHTML = A.db.periods.map(period =>
      `<option value="${A.escapeAttr(period.id)}">${A.escapeHtml(period.label)}${period.status === 'locked' ? ' 🔒' : ''}</option>`
    ).join('');
    select.value = A.state.periodId || '';
  }

  function renderDashboard() {
    const period = A.currentPeriod();
    if (!period) return;
    const actual = C.actualCogs(A.db, period);
    const issues = C.buildExceptions(A.db, period);
    const confidence = C.confidenceStatus(issues);
    const target = C.finiteNumber(period.targetCogsPercent ?? A.db.settings.targetCogsPercent, 30) / 100;
    const sales = C.finiteNumber(period.sales?.foodAndNonAlcoholNet);
    const delta = actual.cogs - sales * target;

    A.$('#dashActualCogs').textContent = A.money(actual.cogs);
    A.$('#dashActualCogsPct').textContent = A.percent(actual.cogsPercent);
    A.$('#dashPurchases').textContent = A.money(actual.purchases);
    A.$('#dashEndingInventory').textContent = A.money(actual.ending);
    A.$('#dashTargetDelta').textContent = sales > 0 ? `${delta > 0 ? '+' : ''}${A.money(delta)}` : '—';
    A.$('#dashTargetLabel').textContent = `Target ${(target * 100).toFixed(1)}%`;

    const confidenceBadge = A.$('#confidenceBadge');
    confidenceBadge.textContent = confidence;
    confidenceBadge.className = `badge ${confidence === 'Verified' ? 'success' : confidence === 'Review Required' ? 'warning' : 'danger'}`;

    A.$('#salesFoodNet').value = period.sales?.foodAndNonAlcoholNet ?? 0;
    A.$('#salesTotalNet').value = period.sales?.totalNet ?? 0;
    A.$('#targetCogsPercent').value = period.targetCogsPercent ?? A.db.settings.targetCogsPercent ?? 30;
    A.$('#periodStatusText').textContent = period.status === 'locked'
      ? `Locked ${period.lockedAt ? new Date(period.lockedAt).toLocaleString() : ''}`
      : 'Open';
    A.$('#btnTogglePeriodLock').textContent = period.status === 'locked' ? 'Unlock Period' : 'Lock Period';
    A.$('#btnTogglePeriodLock').className = period.status === 'locked' ? 'btn secondary' : 'btn';

    A.$('#dashboardExceptions').innerHTML = issues.length
      ? issues.slice(0, 8).map(issue => `<div class="list-row clickable" data-open-reports><div><div class="title">${A.escapeHtml(issue.message)}</div><div class="meta">${A.escapeHtml(issue.type.replaceAll('_', ' '))}</div></div>${A.badge(issue.severity === 'incomplete' ? 'Incomplete' : 'Review', issue.severity === 'incomplete' ? 'danger' : 'warning')}</div>`).join('')
      : `<div class="list-row"><div><div class="title">No unresolved exceptions</div><div class="meta">Current verification checks pass.</div></div>${A.badge('Verified', 'success')}</div>`;

    const movement = C.inventoryMovement(A.db, period).filter(row => Math.abs(row.usageValue) >= .01).slice(0, 8);
    const max = Math.max(1, ...movement.map(row => Math.abs(row.usageValue)));
    A.$('#dashboardMovement').innerHTML = movement.length
      ? movement.map(row => `<div class="list-row"><div><div class="title">${A.escapeHtml(row.name)}</div><div class="meta">Begin ${A.qty(row.beginningQty)} + Purch ${A.qty(row.purchasedQty)} − End ${A.qty(row.endingQty)} = ${A.qty(row.usageQty)} ${A.escapeHtml(row.baseUnit)}</div></div><div class="right"><strong>${A.money(row.usageValue)}</strong><div class="movement-bar"><div class="movement-fill ${row.anomaly ? 'anomaly' : ''}" style="width:${Math.max(5, Math.round(Math.abs(row.usageValue) / max * 100))}%"></div></div>${row.anomaly ? A.badge('Anomaly', 'danger') : A.badge('Usage', 'info')}</div></div>`).join('')
      : A.empty('Add beginning inventory, posted invoices, and ending counts to see movement.');
  }

  function renderCounting() {
    const locations = A.db.kitchen.locations || [];
    A.$('#locationsList').innerHTML = locations.length
      ? [...locations].sort((a, b) => a.sortOrder - b.sortOrder).map(location => `<div class="list-row clickable ${location.id === A.state.locationId ? 'active' : ''}" data-location-id="${A.escapeAttr(location.id)}"><div><div class="title">${A.escapeHtml(location.name)}</div><div class="meta">${(location.sections || []).length} section(s)</div></div><button class="text-btn" type="button">Open</button></div>`).join('')
      : A.empty('No locations yet.');

    const location = A.currentLocation();
    A.$('#selectedLocationTitle').textContent = location?.name || 'Sections';
    A.$('#selectedLocationSub').textContent = location ? 'Choose a section and build the walk path.' : 'Choose a location.';
    A.$('#btnNewSection').disabled = !location || A.isLocked();

    const sections = location?.sections || [];
    A.$('#sectionsList').innerHTML = location
      ? sections.length
        ? [...sections].sort((a, b) => a.sortOrder - b.sortOrder).map(section => `<div class="list-row clickable ${section.id === A.state.sectionId ? 'active' : ''}" data-section-id="${A.escapeAttr(section.id)}"><div><div class="title">${A.escapeHtml(section.name)}</div><div class="meta">${(section.itemEntries || []).length} item(s)</div></div><button class="text-btn" type="button">Select</button></div>`).join('')
        : A.empty('No sections yet.')
      : A.empty('Select a location first.');

    const section = A.currentSection();
    A.$('#btnAddItemToSection').disabled = !section || A.isLocked();
    A.$('#btnStartWalk').disabled = !section || !(section.itemEntries || []).length || A.isLocked();
    A.$('#itemsDatalist').innerHTML = A.db.items.filter(item => item.active).map(item => `<option value="${A.escapeAttr(item.name)}"></option>`).join('');
  }

  function renderInvoices() {
    const period = A.currentPeriod();
    const invoices = A.db.invoices.filter(invoice => invoice.periodId === period?.id)
      .sort((a, b) => String(b.invoiceDate).localeCompare(String(a.invoiceDate)) || String(b.createdAt).localeCompare(String(a.createdAt)));
    A.$('#invoiceList').innerHTML = invoices.length
      ? invoices.map(invoice => {
        const total = (invoice.lines || []).reduce((sum, line) => sum + C.finiteNumber(line.extendedCost), 0);
        const unresolved = (invoice.lines || []).filter(line => !line.itemId || line.normalizationError || !['exact', 'confirmed'].includes(line.matchConfidence)).length;
        return `<div class="list-row clickable ${invoice.id === A.state.invoiceId ? 'active' : ''}" data-invoice-id="${A.escapeAttr(invoice.id)}"><div><div class="title">${A.escapeHtml(invoice.vendor || '(Vendor)')}${invoice.invoiceNumber ? ` • #${A.escapeHtml(invoice.invoiceNumber)}` : ''}</div><div class="meta">${A.escapeHtml(invoice.invoiceDate || 'No date')} • ${(invoice.lines || []).length} line(s) • ${A.escapeHtml(invoice.status || 'draft')}</div></div><div class="right"><strong>${A.money(total)}</strong>${unresolved ? A.badge(`${unresolved} unresolved`, 'danger') : invoice.status === 'posted' ? A.badge('Posted', 'success') : A.badge('Ready to post', 'warning')}</div></div>`;
      }).join('')
      : A.empty(`No invoices for ${period?.label || 'this period'}.`);

    const invoice = A.currentInvoice();
    A.$('#btnDuplicateInvoice').disabled = !invoice || A.isLocked();
    A.$('#btnDeleteInvoice').disabled = !invoice || A.isLocked();
    const editor = A.$('#invoiceEditor');
    if (!invoice || invoice.periodId !== period?.id) {
      A.state.invoiceId = null;
      A.$('#invoiceEditorTitle').textContent = 'Invoice Editor';
      A.$('#invoiceEditorSub').textContent = 'Create or select an invoice.';
      editor.innerHTML = A.empty('Invoice details and normalized line costs appear here.');
      return;
    }

    const total = invoice.lines.reduce((sum, line) => sum + C.finiteNumber(line.extendedCost), 0);
    A.$('#invoiceEditorTitle').textContent = invoice.vendor || 'Invoice';
    A.$('#invoiceEditorSub').textContent = `${invoice.status || 'draft'} • only posted invoices affect COGS`;
    editor.innerHTML = `
      <div class="form-grid two">
        <label>Vendor<input id="invoiceVendor" class="input" value="${A.escapeAttr(invoice.vendor)}" ${A.isLocked() ? 'disabled' : ''}></label>
        <label>Invoice #<input id="invoiceNumber" class="input" value="${A.escapeAttr(invoice.invoiceNumber)}" ${A.isLocked() ? 'disabled' : ''}></label>
        <label>Date<input id="invoiceDate" class="input" type="date" value="${A.escapeAttr(invoice.invoiceDate)}" ${A.isLocked() ? 'disabled' : ''}></label>
        <label>Status<select id="invoiceStatus" class="select" ${A.isLocked() ? 'disabled' : ''}><option value="draft" ${invoice.status === 'draft' ? 'selected' : ''}>Draft</option><option value="posted" ${invoice.status === 'posted' ? 'selected' : ''}>Posted</option></select></label>
      </div>
      <label>Notes<input id="invoiceNotes" class="input" value="${A.escapeAttr(invoice.notes)}" ${A.isLocked() ? 'disabled' : ''}></label>
      <div class="button-row"><button id="btnAddInvoiceLine" class="btn" type="button" ${A.isLocked() ? 'disabled' : ''}>+ Line</button><button id="btnPasteInvoiceLines" class="btn secondary" type="button" ${A.isLocked() ? 'disabled' : ''}>Paste Many</button><button id="btnPostInvoice" class="btn secondary" type="button" ${A.isLocked() ? 'disabled' : ''}>Post and Update Costs</button><strong>Total ${A.money(total)}</strong></div>
      <div class="divider"></div>
      <div id="invoiceLines" class="stack-list">${invoice.lines.length ? invoice.lines.map(line => {
        const item = A.db.items.find(candidate => candidate.id === line.itemId);
        const confirmed = ['exact', 'confirmed'].includes(line.matchConfidence);
        return `<div class="list-row clickable" data-invoice-line-id="${A.escapeAttr(line.id)}"><div><div class="title">${A.escapeHtml(item?.name || line.rawName || '(Item)')}</div><div class="meta">${A.qty(line.purchaseQty)} ${A.escapeHtml(line.purchaseUnit)} × ${A.money(line.purchaseUnitCost)} • ${A.qty(line.normalizedBaseUnitQty)} ${A.escapeHtml(item?.baseUnit || '')} @ ${A.unitCost(line.normalizedBaseUnitCost)}</div></div><div class="right"><strong>${A.money(line.extendedCost)}</strong>${!line.itemId ? A.badge('Unmatched', 'danger') : line.normalizationError ? A.badge('Invalid', 'danger') : A.badge(line.matchConfidence || 'unmatched', confirmed ? 'success' : 'warning')}</div></div>`;
      }).join('') : A.empty('No invoice lines yet.')}</div>`;
  }

  function renderRecipes() {
    A.$$('.segment[data-recipe-filter]').forEach(button => button.classList.toggle('active', button.dataset.recipeFilter === A.state.recipeFilter));
    const items = A.itemsById();
    const recipes = A.db.recipes.filter(recipe => recipe.type === A.state.recipeFilter && recipe.active !== false);
    A.$('#recipeList').innerHTML = recipes.length
      ? recipes.map(recipe => {
        const cost = C.recipeCost(recipe, items);
        return `<div class="list-row clickable ${recipe.id === A.state.recipeId ? 'active' : ''}" data-recipe-id="${A.escapeAttr(recipe.id)}"><div><div class="title">${A.escapeHtml(recipe.name || '(Recipe)')}</div><div class="meta">${recipe.lines.length} ingredient(s) • yield ${A.qty(recipe.yieldQty)} ${A.escapeHtml(recipe.yieldUnit)}</div></div><div class="right"><strong>${A.unitCost(cost.unitCost)}</strong>${cost.ok ? A.badge('Costed', 'success') : A.badge(`${cost.errors.length} issue(s)`, 'danger')}</div></div>`;
      }).join('')
      : A.empty(`No ${A.state.recipeFilter} recipes yet.`);

    const recipe = A.currentRecipe();
    A.$('#btnDeleteRecipe').disabled = !recipe || A.isLocked();
    const editor = A.$('#recipeEditor');
    if (!recipe || recipe.type !== A.state.recipeFilter) {
      A.state.recipeId = null;
      A.$('#recipeEditorTitle').textContent = 'Recipe Editor';
      A.$('#recipeEditorSub').textContent = 'Create or select a recipe.';
      editor.innerHTML = A.empty('Recipe cost is calculated from normalized ingredient quantities.');
      return;
    }
    const cost = C.recipeCost(recipe, items);
    A.$('#recipeEditorTitle').textContent = recipe.name || (recipe.type === 'batch' ? 'Batch Recipe' : 'Portion Recipe');
    A.$('#recipeEditorSub').textContent = cost.ok ? `${A.money(cost.batchCost)} batch • ${A.unitCost(cost.unitCost)} per ${recipe.yieldUnit}` : cost.errors.join(' ');
    editor.innerHTML = `
      <label>Name<input id="recipeName" class="input" value="${A.escapeAttr(recipe.name)}" ${A.isLocked() ? 'disabled' : ''}></label>
      <div class="form-grid two"><label>Yield Quantity<input id="recipeYieldQty" class="input" type="number" min="0.000001" step="0.0001" value="${A.escapeAttr(recipe.yieldQty)}" ${A.isLocked() ? 'disabled' : ''}></label><label>Yield Unit<input id="recipeYieldUnit" class="input" value="${A.escapeAttr(recipe.yieldUnit)}" ${A.isLocked() ? 'disabled' : ''}></label></div>
      <label>Aliases<input id="recipeAliases" class="input" value="${A.escapeAttr((recipe.aliases || []).join(', '))}" ${A.isLocked() ? 'disabled' : ''}></label>
      <label>Notes<input id="recipeNotes" class="input" value="${A.escapeAttr(recipe.notes)}" ${A.isLocked() ? 'disabled' : ''}></label>
      <div class="button-row"><button id="btnAddRecipeLine" class="btn" type="button" ${A.isLocked() ? 'disabled' : ''}>+ Ingredient</button>${recipe.type === 'batch' ? `<button id="btnSyncBatch" class="btn secondary" type="button" ${A.isLocked() ? 'disabled' : ''}>Sync Batch to Inventory</button>` : ''}<strong>${A.unitCost(cost.unitCost)} per ${A.escapeHtml(recipe.yieldUnit)}</strong></div>
      <div class="divider"></div><div id="recipeLines" class="stack-list">${recipe.lines.length ? recipe.lines.map(line => {
        const item = items.get(line.itemId);
        const conversion = item ? C.convertQuantity({ quantity: line.qty, fromUnit: line.unit, toUnit: item.baseUnit, item }) : { ok: false };
        const lineCost = item && conversion.ok ? conversion.quantity * C.finiteNumber(item.defaultBaseUnitCost) : 0;
        return `<div class="list-row clickable" data-recipe-line-id="${A.escapeAttr(line.id)}"><div><div class="title">${A.escapeHtml(item?.name || '(Missing item)')}</div><div class="meta">${A.qty(line.qty)} ${A.escapeHtml(line.unit)}${conversion.ok ? ` = ${A.qty(conversion.quantity)} ${A.escapeHtml(item.baseUnit)}` : ' • conversion required'}</div></div><div class="right"><strong>${A.money(lineCost)}</strong>${conversion.ok ? A.badge('Normalized', 'success') : A.badge('Invalid', 'danger')}</div></div>`;
      }).join('') : A.empty('No ingredients yet.')}</div>`;
  }

  function renderReports() {
    const period = A.currentPeriod();
    if (!period) return;
    const actual = C.actualCogs(A.db, period);
    const theoretical = C.theoreticalCogs(A.db, period.id);
    const variance = theoretical.complete ? actual.cogs - theoretical.total : null;
    const issues = C.buildExceptions(A.db, period);
    const confidence = C.confidenceStatus(issues);
    A.$('#reportBeginning').textContent = A.money(actual.beginning);
    A.$('#reportPurchases').textContent = A.money(actual.purchases);
    A.$('#reportEnding').textContent = A.money(actual.ending);
    A.$('#reportActual').textContent = A.money(actual.cogs);
    A.$('#reportActualPct').textContent = A.percent(actual.cogsPercent);
    A.$('#reportTheoretical').textContent = theoretical.complete ? A.money(theoretical.total) : 'Incomplete';
    A.$('#reportVariance').textContent = variance == null ? '—' : A.money(variance);
    A.$('#reportVariancePct').textContent = variance != null && theoretical.total > 0 ? A.percent(variance / theoretical.total) : '—';
    A.$('#reportConfidenceText').textContent = confidence;
    A.$('#reportConfidenceText').className = `badge ${confidence === 'Verified' ? 'success' : confidence === 'Review Required' ? 'warning' : 'danger'}`;

    const groups = ['ingredients', 'products', 'batch', 'nonfood'];
    A.$('#groupBreakdown').innerHTML = `<table><thead><tr><th>Group</th><th class="numeric">Beginning</th><th class="numeric">Purchases</th><th class="numeric">Ending</th><th class="numeric">COGS</th></tr></thead><tbody>${groups.map(group => {
      const row = actual.groups[group];
      return `<tr><td>${A.escapeHtml(group)}</td><td class="numeric">${A.money(row.beginning)}</td><td class="numeric">${A.money(row.purchases)}</td><td class="numeric">${A.money(row.ending)}</td><td class="numeric">${A.money(row.cogs)}</td></tr>`;
    }).join('')}</tbody></table>`;

    A.$('#reportExceptions').innerHTML = issues.length
      ? issues.map(issue => `<div class="list-row"><div><div class="title">${A.escapeHtml(issue.message)}</div><div class="meta">${A.escapeHtml(issue.type.replaceAll('_', ' '))}</div></div>${A.badge(issue.severity === 'incomplete' ? 'Incomplete' : 'Review', issue.severity === 'incomplete' ? 'danger' : 'warning')}</div>`).join('')
      : `<div class="list-row"><div><div class="title">Period verified</div><div class="meta">No current calculation or data-integrity exceptions.</div></div>${A.badge('Verified', 'success')}</div>`;

    const findings = A.db.findings.filter(finding => finding.periodId === period.id);
    A.$('#findingsList').innerHTML = findings.length
      ? findings.map(finding => `<div class="list-row"><div><div class="title">${A.escapeHtml([finding.locationName, finding.sectionName].filter(Boolean).join(' • ') || 'General')}</div><div class="meta">${A.escapeHtml(finding.text)} • ${new Date(finding.createdAt || finding.at || Date.now()).toLocaleString()}</div></div>${A.badge(finding.status || 'open', finding.status === 'resolved' ? 'success' : 'warning')}</div>`).join('')
      : A.empty('No findings for this period.');

    const movement = C.inventoryMovement(A.db, period);
    A.$('#movementTable').innerHTML = `<table><thead><tr><th>Item</th><th>Group</th><th class="numeric">Beginning</th><th class="numeric">Purchased</th><th class="numeric">Ending</th><th class="numeric">Usage</th><th class="numeric">Cost/Base</th><th class="numeric">Usage Value</th></tr></thead><tbody>${movement.map(row => `<tr><td>${A.escapeHtml(row.name)}</td><td>${A.escapeHtml(row.group)}</td><td class="numeric">${A.qty(row.beginningQty)}</td><td class="numeric">${A.qty(row.purchasedQty)}</td><td class="numeric">${A.qty(row.endingQty)}</td><td class="numeric">${A.qty(row.usageQty)} ${A.escapeHtml(row.baseUnit)}${row.anomaly ? ' ⚠' : ''}</td><td class="numeric">${A.unitCost(row.baseUnitCost)}</td><td class="numeric">${A.money(row.usageValue)}</td></tr>`).join('')}</tbody></table>`;
    const latestPmix = A.db.pmixImports.filter(imported => imported.periodId === period.id).sort((a, b) => String(b.importedAt).localeCompare(String(a.importedAt)))[0];
    A.$('#pmixStatus').textContent = latestPmix ? `${latestPmix.rows.length} row(s) imported ${new Date(latestPmix.importedAt).toLocaleString()}` : 'No PMIX imported';
  }

  function renderSettings() {
    A.$('#settingsReportEmail').value = A.db.settings.reportEmail || '';
    A.$('#settingsTargetCogs').value = A.db.settings.targetCogsPercent ?? 30;
    const size = new Blob([JSON.stringify(A.db)]).size;
    A.$('#storageSize').textContent = size < 1024 ? `${size} B` : size < 1048576 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1048576).toFixed(2)} MB`;
    A.$('#schemaVersion').textContent = String(A.db.schemaVersion);
    A.$('#lastUpdated').textContent = A.db.metadata.updatedAt ? new Date(A.db.metadata.updatedAt).toLocaleString() : '—';
    A.$('#settingsItemList').innerHTML = A.db.items.length
      ? [...A.db.items].sort((a, b) => a.name.localeCompare(b.name)).map(item => {
        const costText = item.defaultBaseUnitCost == null ? 'Cost missing' : `${A.unitCost(item.defaultBaseUnitCost)} per ${A.escapeHtml(item.baseUnit)}`;
        return `<div class="list-row clickable" data-settings-item-id="${A.escapeAttr(item.id)}"><div><div class="title">${A.escapeHtml(item.name)}</div><div class="meta">${A.escapeHtml(item.group)} • ${costText} • ${(item.aliases || []).length} alias(es)</div></div><div class="right">${item.costReviewRequired ? A.badge('Cost Review', 'warning') : ''}${item.excludedFromCount ? A.badge('Excluded', 'info') : A.badge('Counted', 'success')}</div></div>`;
      }).join('')
      : A.empty('No items yet.');
    A.$('#auditList').innerHTML = (A.db.auditLog || []).length
      ? A.db.auditLog.slice(0, 50).map(entry => `<div class="list-row"><div><div class="title">${A.escapeHtml(entry.action.replaceAll('_', ' '))}</div><div class="meta">${A.escapeHtml(entry.details || '')}</div></div><span class="meta">${new Date(entry.at).toLocaleString()}</span></div>`).join('')
      : A.empty('No audit events yet.');
  }

  A.renderAll = () => {
    renderPeriodSelect();
    renderDashboard();
    renderCounting();
    renderInvoices();
    renderRecipes();
    renderReports();
    renderSettings();
  };
})();
