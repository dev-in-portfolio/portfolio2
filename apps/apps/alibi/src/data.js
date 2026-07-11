(() => {
  'use strict';
  const A = window.AlibiApp;
  const C = A.C;

  function csvCell(value) {
    let text = value == null ? '' : String(value);
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }

  function rowsToCsv(headers, rows) {
    return [headers.join(','), ...rows.map(row => headers.map(header => csvCell(row[header])).join(','))].join('\n');
  }

  function buildExportFiles() {
    const period = A.currentPeriod();
    const actual = C.actualCogs(A.db, period);
    const theoretical = C.theoreticalCogs(A.db, period.id);
    const theoreticalComplete = theoretical.complete !== false;
    const movement = C.inventoryMovement(A.db, period);
    const issues = C.buildExceptions(A.db, period);
    const confidence = C.confidenceStatus(issues);
    const findings = A.db.findings.filter(finding => finding.periodId === period.id);
    const invoices = A.db.invoices.filter(invoice => invoice.periodId === period.id);
    const itemMap = A.itemsById();

    const summary = [{
      period: period.label,
      food_net_sales: period.sales.foodAndNonAlcoholNet,
      total_net_sales: period.sales.totalNet,
      beginning_inventory: actual.beginning,
      purchases: actual.purchases,
      ending_inventory: actual.ending,
      actual_cogs: actual.cogs,
      actual_cogs_percent: actual.cogsPercent == null ? '' : actual.cogsPercent * 100,
      theoretical_cogs: theoreticalComplete ? theoretical.total : '',
      variance: theoreticalComplete ? actual.cogs - theoretical.total : '',
      confidence
    }];

    const countRows = ['beginning', 'ending'].flatMap(phase => (period.inventoryCounts[phase] || []).map(record => ({
      phase,
      item: itemMap.get(record.itemId)?.name || record.itemId,
      location_id: record.locationId,
      section_id: record.sectionId,
      entered_qty: record.enteredQty,
      entered_unit: record.enteredUnit,
      normalized_base_qty: record.normalizedBaseQty,
      base_unit: record.baseUnit,
      base_unit_cost: record.baseUnitCost,
      extended_value: record.extendedValue,
      counted_at: record.countedAt
    })));

    const invoiceRows = invoices.map(invoice => ({
      vendor: invoice.vendor,
      invoice_number: invoice.invoiceNumber,
      invoice_date: invoice.invoiceDate,
      status: invoice.status,
      line_count: invoice.lines.length,
      total: invoice.lines.reduce((sum, line) => sum + C.finiteNumber(line.extendedCost), 0),
      notes: invoice.notes
    }));

    const lineRows = invoices.flatMap(invoice => invoice.lines.map(line => ({
      vendor: invoice.vendor,
      invoice_number: invoice.invoiceNumber,
      item: itemMap.get(line.itemId)?.name || line.rawName,
      raw_name: line.rawName,
      purchase_qty: line.purchaseQty,
      purchase_unit: line.purchaseUnit,
      base_units_per_purchase_unit: line.baseUnitsPerPurchaseUnit,
      purchase_unit_cost: line.purchaseUnitCost,
      normalized_base_qty: line.normalizedBaseUnitQty,
      normalized_base_unit_cost: line.normalizedBaseUnitCost,
      extended_cost: line.extendedCost,
      group: line.groupSnapshot,
      category: line.categorySnapshot,
      match_confidence: line.matchConfidence,
      notes: line.notes
    })));

    const recipeRows = A.db.recipes.map(recipe => {
      const cost = C.recipeCost(recipe, itemMap);
      return {
        name: recipe.name,
        type: recipe.type,
        yield_qty: recipe.yieldQty,
        yield_unit: recipe.yieldUnit,
        ingredient_count: recipe.lines.length,
        batch_cost: cost.ok ? cost.batchCost : '',
        unit_cost: cost.ok ? cost.unitCost : '',
        status: cost.ok ? 'costed' : cost.errors.join('; ')
      };
    });

    const latestPmix = A.db.pmixImports
      .filter(imported => imported.periodId === period.id)
      .sort((a, b) => String(b.importedAt).localeCompare(String(a.importedAt)))[0];
    const theoreticalDisplay = theoreticalComplete ? A.money(theoretical.total) : 'Incomplete';
    const varianceDisplay = theoreticalComplete ? A.money(actual.cogs - theoretical.total) : '—';
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${A.escapeHtml(period.label)} Alibi Report</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#111}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f4f4f4}.num{text-align:right}</style></head><body><h1>Alibi — ${A.escapeHtml(period.label)}</h1><p>Generated ${new Date().toLocaleString()} • ${A.escapeHtml(confidence)}</p><table><tr><th>Food + NA Net Sales</th><td class="num">${A.money(period.sales.foodAndNonAlcoholNet)}</td></tr><tr><th>Beginning Inventory</th><td class="num">${A.money(actual.beginning)}</td></tr><tr><th>Purchases</th><td class="num">${A.money(actual.purchases)}</td></tr><tr><th>Ending Inventory</th><td class="num">${A.money(actual.ending)}</td></tr><tr><th>Actual COGS</th><td class="num">${A.money(actual.cogs)}</td></tr><tr><th>Actual COGS %</th><td class="num">${A.percent(actual.cogsPercent)}</td></tr><tr><th>Theoretical COGS</th><td class="num">${theoreticalDisplay}</td></tr><tr><th>Variance</th><td class="num">${varianceDisplay}</td></tr></table><h2>Exceptions</h2><ul>${issues.map(issue => `<li>${A.escapeHtml(issue.message)}</li>`).join('') || '<li>None</li>'}</ul></body></html>`;

    return {
      'period_summary.html': html,
      'period_summary.csv': rowsToCsv(Object.keys(summary[0]), summary),
      'inventory_counts.csv': rowsToCsv(['phase','item','location_id','section_id','entered_qty','entered_unit','normalized_base_qty','base_unit','base_unit_cost','extended_value','counted_at'], countRows),
      'inventory_movement.csv': rowsToCsv(['name','group','baseUnit','beginningQty','purchasedQty','endingQty','usageQty','baseUnitCost','usageValue','anomaly'], movement),
      'invoices.csv': rowsToCsv(['vendor','invoice_number','invoice_date','status','line_count','total','notes'], invoiceRows),
      'invoice_lines.csv': rowsToCsv(['vendor','invoice_number','item','raw_name','purchase_qty','purchase_unit','base_units_per_purchase_unit','purchase_unit_cost','normalized_base_qty','normalized_base_unit_cost','extended_cost','group','category','match_confidence','notes'], lineRows),
      'recipes.csv': rowsToCsv(['name','type','yield_qty','yield_unit','ingredient_count','batch_cost','unit_cost','status'], recipeRows),
      'pmix.csv': rowsToCsv(['rawMenuItemName','quantitySold','recipeId','matchStatus'], latestPmix?.rows || []),
      'exceptions.csv': rowsToCsv(['type','severity','message'], issues),
      'findings.csv': rowsToCsv(['locationName','sectionName','text','status','createdAt'], findings),
      'alibi_backup.json': JSON.stringify(A.db, null, 2)
    };
  }

  async function downloadReport() {
    const files = buildExportFiles();
    const base = `${C.normalizeText(A.currentPeriod().label).replaceAll(' ', '_') || 'alibi'}_report`;
    const mimeFor = name => name.endsWith('.json') ? 'application/json' : name.endsWith('.csv') ? 'text/csv' : name.endsWith('.html') ? 'text/html' : 'text/plain';
    if (typeof window.JSZip === 'undefined') {
      Object.entries(files).forEach(([name, content]) => A.downloadText(`${base}_${name}`, content, mimeFor(name)));
      A.notify('ZIP support is unavailable. Report files were downloaded separately.', 'warning');
      return;
    }
    try {
      const zip = new JSZip();
      Object.entries(files).forEach(([name, content]) => zip.file(name, content));
      const blob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${base}.zip`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 1500);
      A.audit('report_exported', A.currentPeriod().label);
      A.save();
      A.notify('Report ZIP downloaded.', 'success');
    } catch (error) {
      Object.entries(files).forEach(([name, content]) => A.downloadText(`${base}_${name}`, content, mimeFor(name)));
      A.notify(`ZIP export failed. Files were downloaded separately: ${error.message}`, 'warning');
    }
  }

  function openEmailDraft() {
    const period = A.currentPeriod();
    const to = encodeURIComponent(A.db.settings.reportEmail || '');
    const subject = encodeURIComponent(`Alibi Report — ${period.label}`);
    const body = encodeURIComponent(`The Alibi report for ${period.label} has been downloaded. Attach the ZIP or separate report files before sending.\n\nGenerated: ${new Date().toLocaleString()}`);
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  }

  function exportBackup() {
    A.downloadText(`alibi_backup_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(A.db, null, 2), 'application/json');
    A.notify('Backup downloaded.', 'success');
  }

  async function handleImport(file) {
    let parsed;
    try {
      parsed = JSON.parse(await file.text());
    } catch (error) {
      return A.notify(`Import failed: ${error.message}`, 'error');
    }

    let candidate;
    try {
      candidate = C.migrateDatabase(parsed.data || parsed);
    } catch (error) {
      return A.notify(`Migration failed: ${error.message}`, 'error');
    }
    const validation = C.validateDatabase(candidate);
    if (!validation.ok) return A.notify(`Import rejected: ${validation.errors.join(' ')}`, 'error', true);

    A.openModal(`
      <div class="overlay-heading"><div><div class="eyebrow">Backup import</div><h2 id="sharedModalTitle">Replace Current Data?</h2><p>The imported backup passed nested schema and reference validation.</p></div><button class="btn secondary" data-close-modal type="button">Close</button></div>
      <div class="key-values"><span>Items</span><strong>${candidate.items.length}</strong><span>Periods</span><strong>${candidate.periods.length}</strong><span>Invoices</span><strong>${candidate.invoices.length}</strong><span>Recipes</span><strong>${candidate.recipes.length}</strong><span>Schema</span><strong>${candidate.schemaVersion}</strong></div>
      <div class="modal-actions"><button id="confirmImport" class="btn danger" type="button">Backup Current Data and Import</button></div>`);
    A.$('#confirmImport').onclick = () => {
      A.createAutoBackup('before import');
      const previous = A.db;
      A.db = candidate;
      A.state.periodId = C.sortPeriods(A.db.periods)[0]?.id || null;
      A.state.invoiceId = A.state.recipeId = A.state.locationId = A.state.sectionId = null;
      A.audit('backup_imported', file.name);
      const saved = A.save();
      if (!saved.ok) {
        A.db = previous;
        A.renderAll();
        return;
      }
      A.closeModal();
      A.renderAll();
      A.notify('Backup imported successfully.', 'success');
    };
  }

  function saveSettings() {
    A.db.settings.reportEmail = A.$('#settingsReportEmail').value.trim();
    A.db.settings.targetCogsPercent = Math.max(0, C.finiteNumber(A.$('#settingsTargetCogs').value, 30));
    A.audit('settings_updated');
    A.save();
    A.renderAll();
    A.notify('Settings saved.', 'success');
  }

  function resetData() {
    if (!confirm('Reset all Alibi data on this device? A local backup will be created first.')) return;
    if (!confirm('This removes all current items, periods, invoices, recipes, and findings. Continue?')) return;
    A.createAutoBackup('before reset');
    A.db = C.createEmptyDatabase();
    A.state.periodId = A.db.periods[0].id;
    A.state.invoiceId = A.state.recipeId = A.state.locationId = A.state.sectionId = null;
    A.audit('database_reset', 'User confirmed reset.');
    A.save();
    A.renderAll();
    A.notify('Alibi data reset.', 'warning');
  }

  function clearFindings() {
    if (!A.requireOpen('clear findings') || !confirm('Clear all findings for this period?')) return;
    A.createAutoBackup('before clearing findings');
    A.db.findings = A.db.findings.filter(finding => finding.periodId !== A.state.periodId);
    A.audit('findings_cleared', A.currentPeriod().label);
    A.save();
    A.renderAll();
  }

  function trapModalFocus(event, overlay) {
    if (event.key === 'Escape') {
      event.preventDefault();
      overlay.id === 'walkOverlay' ? A.$('#btnCloseWalk').click() : A.closeModal();
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = A.$$('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])', overlay).filter(element => element.offsetParent !== null);
    if (!controls.length) return;
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  A.initialize = () => {
    A.$$('.nav-btn').forEach(button => { button.onclick = () => A.goTab(button.dataset.gotoTab); });
    A.$('#periodSelect').onchange = event => {
      A.state.periodId = event.target.value;
      A.state.invoiceId = A.state.recipeId = A.state.locationId = A.state.sectionId = null;
      A.renderAll();
    };
    A.$('#btnExportBackup').onclick = exportBackup;
    A.$('#btnImportBackup').onclick = () => A.$('#importFile').click();
    A.$('#importFile').onchange = event => {
      const file = event.target.files?.[0];
      if (file) handleImport(file);
      event.target.value = '';
    };
    A.$('#btnDownloadReport').onclick = downloadReport;
    A.$('#btnEmailReport').onclick = openEmailDraft;
    A.$('#btnSaveSettings').onclick = saveSettings;
    A.$('#btnCreateAutoBackup').onclick = () => {
      if (A.createAutoBackup('manual')) {
        A.audit('local_backup_created');
        A.save();
        A.notify('Local rotating backup created.', 'success');
      }
    };
    A.$('#btnResetData').onclick = resetData;
    A.$('#btnClearFindings').onclick = clearFindings;
    A.$('#btnOpenReports').onclick = () => A.goTab('reports');
    A.$('#sharedModal').onmousedown = event => { if (event.target === A.$('#sharedModal')) A.closeModal(); };
    A.$('#sharedModal').onkeydown = event => trapModalFocus(event, A.$('#sharedModal'));
    A.$('#walkOverlay').onkeydown = event => trapModalFocus(event, A.$('#walkOverlay'));

    A.bindCoreWorkflows();
    A.bindFinanceWorkflows();
    const requestedTab = location.hash.replace('#', '');
    const validTabs = ['dashboard','counting','invoices','recipes','reports','settings'];
    if (validTabs.includes(requestedTab)) A.goTab(requestedTab);
    else A.renderAll();
    A.save();
  };

  A.initialize();
})();
