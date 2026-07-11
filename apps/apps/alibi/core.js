(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AlibiCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const CURRENT_SCHEMA_VERSION = 11;
  const FINANCIAL_GROUPS = new Set(['ingredients', 'products', 'batch']);
  const UNIT_COST_DECIMALS = 8;
  const UNIT_DEFINITIONS = Object.freeze({
    oz: { dimension: 'weight', toCanonical: 1 },
    lb: { dimension: 'weight', toCanonical: 16 },
    g: { dimension: 'weight', toCanonical: 0.03527396195 },
    kg: { dimension: 'weight', toCanonical: 35.27396195 },
    fl_oz: { dimension: 'volume', toCanonical: 1 },
    cup: { dimension: 'volume', toCanonical: 8 },
    pt: { dimension: 'volume', toCanonical: 16 },
    qt: { dimension: 'volume', toCanonical: 32 },
    gal: { dimension: 'volume', toCanonical: 128 },
    ml: { dimension: 'volume', toCanonical: 0.0338140227 },
    l: { dimension: 'volume', toCanonical: 33.8140227 }
  });

  function uid(prefix = 'id') {
    const cryptoObj = typeof crypto !== 'undefined' ? crypto : null;
    if (cryptoObj && typeof cryptoObj.randomUUID === 'function') return `${prefix}_${cryptoObj.randomUUID()}`;
    return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
  }

  function nowISO() { return new Date().toISOString(); }
  function normalizeText(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }
  function finiteNumber(value, fallback = 0) {
    const n = typeof value === 'string' ? Number(value.replace(/,/g, '').trim()) : Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  function roundTo(value, decimals) {
    const factor = 10 ** decimals;
    return Math.round((finiteNumber(value) + Number.EPSILON) * factor) / factor;
  }
  function roundMoney(value) { return roundTo(value, 2); }
  function roundUnitCost(value) { return roundTo(value, UNIT_COST_DECIMALS); }
  function roundQuantity(value) { return roundTo(value, 6); }
  function periodKey(period) { return finiteNumber(period?.year) * 100 + finiteNumber(period?.month); }
  function sortPeriods(periods) { return [...(periods || [])].sort((a, b) => periodKey(b) - periodKey(a)); }
  function getPreviousPeriod(periods, periodId) {
    const ordered = [...(periods || [])].sort((a, b) => periodKey(a) - periodKey(b));
    const current = ordered.find(period => period.id === periodId);
    if (!current) return null;
    return ordered.filter(period => periodKey(period) < periodKey(current)).pop() || null;
  }
  function getNextPeriod(periods, periodId) {
    const ordered = [...(periods || [])].sort((a, b) => periodKey(a) - periodKey(b));
    const current = ordered.find(period => period.id === periodId);
    if (!current) return null;
    return ordered.find(period => periodKey(period) > periodKey(current)) || null;
  }

  function getItemConversion(item, unit) {
    if (!item || !unit) return null;
    if (unit === item.baseUnit) return 1;
    const explicit = finiteNumber(item.unitConversions?.[unit], NaN);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;
    const option = (item.purchaseOptions || []).find(candidate => candidate.purchaseUnit === unit);
    const factor = finiteNumber(option?.baseUnitsPerPurchaseUnit, NaN);
    return Number.isFinite(factor) && factor > 0 ? factor : null;
  }

  function convertQuantity({ quantity, fromUnit, toUnit, item }) {
    const qty = finiteNumber(quantity, NaN);
    if (!Number.isFinite(qty)) return { ok: false, error: 'Quantity must be a number.' };
    if (qty < 0) return { ok: false, error: 'Quantity cannot be negative.' };
    if (!fromUnit || !toUnit) return { ok: false, error: 'Both units are required.' };
    if (fromUnit === toUnit) return { ok: true, quantity: roundQuantity(qty) };

    const fromDef = UNIT_DEFINITIONS[fromUnit];
    const toDef = UNIT_DEFINITIONS[toUnit];
    if (fromDef && toDef && fromDef.dimension === toDef.dimension) {
      return { ok: true, quantity: roundQuantity(qty * fromDef.toCanonical / toDef.toCanonical) };
    }

    if (item?.baseUnit) {
      const fromFactor = getItemConversion(item, fromUnit);
      const toFactor = getItemConversion(item, toUnit);
      if (fromFactor && toFactor) return { ok: true, quantity: roundQuantity(qty * fromFactor / toFactor) };
    }
    return { ok: false, error: `No conversion from ${fromUnit} to ${toUnit}${item?.name ? ` for ${item.name}` : ''}.` };
  }

  function normalizePurchaseLine({ purchaseQty, purchaseUnit, purchaseUnitCost, baseUnitsPerPurchaseUnit, baseUnit }) {
    const qty = finiteNumber(purchaseQty, NaN);
    const cost = finiteNumber(purchaseUnitCost, NaN);
    const factor = finiteNumber(baseUnitsPerPurchaseUnit, NaN);
    const errors = [];
    if (!Number.isFinite(qty) || qty < 0) errors.push('Purchase quantity must be zero or greater.');
    if (!Number.isFinite(cost) || cost < 0) errors.push('Purchase-unit cost must be zero or greater.');
    if (!purchaseUnit) errors.push('Purchase unit is required.');
    if (!baseUnit) errors.push('Base unit is required.');
    if (!Number.isFinite(factor) || factor <= 0) errors.push('Base units per purchase unit must be greater than zero.');
    if (errors.length) return { ok: false, errors };
    return {
      ok: true,
      purchaseQty: roundQuantity(qty),
      purchaseUnit,
      purchaseUnitCost: roundMoney(cost),
      baseUnitsPerPurchaseUnit: roundQuantity(factor),
      baseUnit,
      extendedCost: roundMoney(qty * cost),
      normalizedBaseUnitQty: roundQuantity(qty * factor),
      normalizedBaseUnitCost: roundUnitCost(cost / factor)
    };
  }

  function normalizeCountRecord({
    item,
    enteredQty,
    enteredUnit,
    baseUnitCost,
    locationId = '',
    sectionId = '',
    countedAt = nowISO(),
    allowMissingCost = false
  }) {
    if (!item) return { ok: false, error: 'Item is required.' };
    const converted = convertQuantity({ quantity: enteredQty, fromUnit: enteredUnit, toUnit: item.baseUnit, item });
    if (!converted.ok) return converted;
    const rawCost = baseUnitCost ?? item.defaultBaseUnitCost;
    const missingCost = rawCost === null || rawCost === undefined || rawCost === '';
    const cost = missingCost ? NaN : finiteNumber(rawCost, NaN);
    if (!Number.isFinite(cost) || cost < 0) {
      if (!allowMissingCost) return { ok: false, error: 'Base-unit cost must be zero or greater.' };
      return {
        ok: true,
        record: {
          itemId: item.id,
          locationId,
          sectionId,
          enteredQty: roundQuantity(enteredQty),
          enteredUnit,
          normalizedBaseQty: converted.quantity,
          baseUnit: item.baseUnit,
          baseUnitCost: null,
          extendedValue: null,
          countedAt
        }
      };
    }
    const normalizedCost = roundUnitCost(cost);
    return {
      ok: true,
      record: {
        itemId: item.id,
        locationId,
        sectionId,
        enteredQty: roundQuantity(enteredQty),
        enteredUnit,
        normalizedBaseQty: converted.quantity,
        baseUnit: item.baseUnit,
        baseUnitCost: normalizedCost,
        extendedValue: roundMoney(converted.quantity * normalizedCost),
        countedAt
      }
    };
  }

  function inventoryValue(records, itemsById, group) {
    return roundMoney((records || []).reduce((sum, record) => {
      const item = itemsById.get(record.itemId);
      if (!item || (group && item.group !== group)) return sum;
      const qty = finiteNumber(record.normalizedBaseQty);
      const snapshotCost = record.baseUnitCost === null || record.baseUnitCost === undefined || record.baseUnitCost === ''
        ? NaN
        : finiteNumber(record.baseUnitCost, NaN);
      const currentCost = item.defaultBaseUnitCost === null || item.defaultBaseUnitCost === undefined || item.defaultBaseUnitCost === ''
        ? NaN
        : finiteNumber(item.defaultBaseUnitCost, NaN);
      const cost = Number.isFinite(snapshotCost) ? snapshotCost : currentCost;
      return Number.isFinite(cost) ? sum + qty * cost : sum;
    }, 0));
  }

  function postedInvoices(invoices, periodId) {
    return (invoices || []).filter(invoice => invoice.periodId === periodId && invoice.status === 'posted');
  }

  function purchaseValue(invoices, periodId, group) {
    return roundMoney(postedInvoices(invoices, periodId).reduce((sum, invoice) => {
      return sum + (invoice.lines || []).reduce((lineSum, line) => {
        if (group && line.groupSnapshot !== group) return lineSum;
        return lineSum + finiteNumber(line.extendedCost, finiteNumber(line.purchaseQty) * finiteNumber(line.purchaseUnitCost));
      }, 0);
    }, 0));
  }

  function actualCogsByGroup(db, period, group) {
    const itemsById = new Map((db.items || []).map(item => [item.id, item]));
    const beginning = inventoryValue(period.inventoryCounts?.beginning || [], itemsById, group);
    const purchases = purchaseValue(db.invoices || [], period.id, group);
    const ending = inventoryValue(period.inventoryCounts?.ending || [], itemsById, group);
    return { beginning, purchases, ending, cogs: roundMoney(beginning + purchases - ending) };
  }

  function deepCopy(value) { return JSON.parse(JSON.stringify(value)); }

  function actualCogs(db, period) {
    if (period?.status === 'locked' && period.financialSnapshot?.actual) return deepCopy(period.financialSnapshot.actual);
    const groups = {};
    let beginning = 0;
    let purchases = 0;
    let ending = 0;
    let cogs = 0;
    for (const group of ['ingredients', 'products', 'batch', 'nonfood']) {
      groups[group] = actualCogsByGroup(db, period, group);
      if (FINANCIAL_GROUPS.has(group)) {
        beginning += groups[group].beginning;
        purchases += groups[group].purchases;
        ending += groups[group].ending;
        cogs += groups[group].cogs;
      }
    }
    const sales = finiteNumber(period?.sales?.foodAndNonAlcoholNet);
    return {
      beginning: roundMoney(beginning),
      purchases: roundMoney(purchases),
      ending: roundMoney(ending),
      cogs: roundMoney(cogs),
      cogsPercent: sales > 0 ? cogs / sales : null,
      groups
    };
  }

  function recipeCost(recipe, itemsById) {
    const errors = [];
    let batchCost = 0;
    for (const line of recipe?.lines || []) {
      const item = itemsById.get(line.itemId);
      if (!item) {
        errors.push(`Missing item for recipe line ${line.id || ''}`.trim());
        continue;
      }
      const conversion = convertQuantity({ quantity: line.qty, fromUnit: line.unit, toUnit: item.baseUnit, item });
      if (!conversion.ok) {
        errors.push(conversion.error);
        continue;
      }
      const cost = finiteNumber(item.defaultBaseUnitCost, NaN);
      if (!Number.isFinite(cost) || cost < 0) {
        errors.push(`Missing valid cost for ${item.name}.`);
        continue;
      }
      batchCost += conversion.quantity * cost;
    }
    const yieldQty = finiteNumber(recipe?.yieldQty, 1);
    if (yieldQty <= 0) errors.push('Recipe yield must be greater than zero.');
    const unitCost = yieldQty > 0 ? batchCost / yieldQty : 0;
    return {
      ok: errors.length === 0,
      errors: [...new Set(errors)],
      batchCost: roundMoney(batchCost),
      unitCost: roundUnitCost(unitCost)
    };
  }

  function matchRecipe(recipes, rawName) {
    const normalized = normalizeText(rawName);
    if (!normalized) return null;
    for (const recipe of recipes || []) {
      if (normalizeText(recipe.name) === normalized) return recipe;
      if ((recipe.aliases || []).some(alias => normalizeText(alias) === normalized)) return recipe;
    }
    return null;
  }

  function theoreticalCogs(db, periodId) {
    const period = (db.periods || []).find(candidate => candidate.id === periodId);
    if (period?.status === 'locked' && period.financialSnapshot?.theoretical) return deepCopy(period.financialSnapshot.theoretical);
    const itemsById = new Map((db.items || []).map(item => [item.id, item]));
    const imports = (db.pmixImports || [])
      .filter(imported => imported.periodId === periodId)
      .sort((a, b) => String(b.importedAt).localeCompare(String(a.importedAt)));
    const activeImport = imports[0] || null;
    if (!activeImport) return { total: 0, matchedQty: 0, unmatched: [], errors: [], importId: null, complete: true };

    let total = 0;
    let matchedQty = 0;
    const unmatched = [];
    const errors = [];
    for (const row of activeImport.rows || []) {
      const recipe = row.recipeId
        ? (db.recipes || []).find(candidate => candidate.id === row.recipeId)
        : matchRecipe(db.recipes || [], row.rawMenuItemName);
      if (!recipe) {
        unmatched.push(row.rawMenuItemName);
        continue;
      }
      const cost = recipeCost(recipe, itemsById);
      if (!cost.ok) {
        errors.push(...cost.errors.map(error => `${recipe.name}: ${error}`));
        continue;
      }
      const qty = finiteNumber(row.quantitySold, NaN);
      if (!Number.isFinite(qty) || qty < 0) {
        errors.push(`${recipe.name}: Quantity sold must be zero or greater.`);
        continue;
      }
      total += qty * cost.unitCost;
      matchedQty += qty;
    }
    return {
      total: roundMoney(total),
      matchedQty: roundQuantity(matchedQty),
      unmatched: [...new Set(unmatched)],
      errors: [...new Set(errors)],
      importId: activeImport.id,
      complete: unmatched.length === 0 && errors.length === 0
    };
  }

  function aggregateCountQty(records) {
    const map = new Map();
    for (const record of records || []) {
      map.set(record.itemId, roundQuantity((map.get(record.itemId) || 0) + finiteNumber(record.normalizedBaseQty)));
    }
    return map;
  }

  function aggregatePurchasedQty(invoices, periodId) {
    const map = new Map();
    for (const invoice of postedInvoices(invoices, periodId)) {
      for (const line of invoice.lines || []) {
        if (!line.itemId) continue;
        map.set(line.itemId, roundQuantity((map.get(line.itemId) || 0) + finiteNumber(line.normalizedBaseUnitQty)));
      }
    }
    return map;
  }

  function inventoryMovement(db, period) {
    if (period?.status === 'locked' && Array.isArray(period.financialSnapshot?.movement)) return deepCopy(period.financialSnapshot.movement);
    const beginning = aggregateCountQty(period.inventoryCounts?.beginning || []);
    const ending = aggregateCountQty(period.inventoryCounts?.ending || []);
    const purchased = aggregatePurchasedQty(db.invoices || [], period.id);
    return (db.items || []).filter(item => FINANCIAL_GROUPS.has(item.group)).map(item => {
      const beginningQty = beginning.get(item.id) || 0;
      const purchasedQty = purchased.get(item.id) || 0;
      const endingQty = ending.get(item.id) || 0;
      const usageQty = roundQuantity(beginningQty + purchasedQty - endingQty);
      const baseUnitCost = finiteNumber(item.defaultBaseUnitCost);
      return {
        itemId: item.id,
        name: item.name,
        group: item.group,
        baseUnit: item.baseUnit,
        beginningQty,
        purchasedQty,
        endingQty,
        usageQty,
        baseUnitCost: roundUnitCost(baseUnitCost),
        usageValue: roundMoney(usageQty * baseUnitCost),
        anomaly: usageQty < 0
      };
    }).sort((a, b) => Math.abs(b.usageValue) - Math.abs(a.usageValue));
  }

  function buildExceptions(db, period) {
    const issues = [];
    const add = (type, severity, message, context = {}) => issues.push({ id: uid('issue'), type, severity, message, context });
    if (finiteNumber(period?.sales?.foodAndNonAlcoholNet) <= 0) add('missing_sales', 'incomplete', 'Food and non-alcohol net sales have not been entered.');

    for (const item of db.items || []) {
      if (!item.active || item.excludedFromCount) continue;
      const rawCost = item.defaultBaseUnitCost;
      if (FINANCIAL_GROUPS.has(item.group) && (rawCost === null || rawCost === undefined || rawCost === '')) {
        add('missing_cost', 'incomplete', `${item.name} is missing a base-unit cost.`, { itemId: item.id });
      } else if (FINANCIAL_GROUPS.has(item.group) && (!Number.isFinite(Number(rawCost)) || Number(rawCost) < 0)) {
        add('invalid_cost', 'incomplete', `${item.name} has an invalid base-unit cost.`, { itemId: item.id });
      }
      if (item.costReviewRequired) add('cost_review', 'review', `${item.name} requires cost review after migration.`, { itemId: item.id });
    }

    for (const invoice of (db.invoices || []).filter(candidate => candidate.periodId === period.id)) {
      for (const line of invoice.lines || []) {
        if (!line.itemId) add('unmatched_invoice_line', 'incomplete', `${line.rawName || 'Invoice line'} is not matched to an item.`, { invoiceId: invoice.id, lineId: line.id });
        if (!['exact', 'confirmed'].includes(line.matchConfidence) && line.itemId) add('unconfirmed_invoice_match', 'incomplete', `${line.rawName || 'Invoice line'} requires match confirmation.`, { invoiceId: invoice.id, lineId: line.id });
        if (line.normalizationError) add('unit_conversion', 'incomplete', line.normalizationError, { invoiceId: invoice.id, lineId: line.id });
      }
    }

    for (const movement of inventoryMovement(db, period)) {
      if (movement.anomaly) add('negative_usage', 'review', `${movement.name} has negative calculated usage.`, { itemId: movement.itemId });
    }
    const actual = actualCogs(db, period);
    if (actual.cogs < 0) add('negative_cogs', 'incomplete', 'Actual COGS is negative. Check beginning inventory, purchases, ending inventory, and units.');
    const theoretical = theoreticalCogs(db, period.id);
    for (const name of theoretical.unmatched) add('pmix_unmatched', 'review', `PMIX item “${name}” is not matched to a recipe.`);
    for (const error of theoretical.errors) add('recipe_cost', 'incomplete', error);
    return issues;
  }

  function confidenceStatus(issues) {
    if ((issues || []).some(issue => issue.severity === 'incomplete')) return 'Incomplete';
    if ((issues || []).length) return 'Review Required';
    return 'Verified';
  }

  function createEmptyDatabase(date = new Date()) {
    const periodId = uid('period');
    const locations = ['Freezer', 'Walk-In', 'Dry Storage', 'Line', 'Cleaning/Paper'].map((name, index) => ({
      id: uid('location'),
      name,
      sortOrder: index + 1,
      sections: []
    }));
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      metadata: { createdAt: nowISO(), updatedAt: nowISO(), lastMigrationAt: null },
      settings: { reportEmail: '', targetCogsPercent: 30, currency: 'USD', locale: 'en-US', vendorMemory: {} },
      items: [],
      kitchen: { locations },
      periods: [{
        id: periodId,
        label: date.toLocaleString(undefined, { month: 'long', year: 'numeric' }),
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        status: 'open',
        openedAt: nowISO(),
        lockedAt: null,
        sales: { foodAndNonAlcoholNet: 0, totalNet: 0 },
        targetCogsPercent: 30,
        inventoryCounts: { beginning: [], ending: [] },
        financialSnapshot: null,
        notes: '',
        createdAt: nowISO(),
        updatedAt: nowISO()
      }],
      invoices: [],
      findings: [],
      recipes: [],
      pmixImports: [],
      auditLog: []
    };
  }

  function coerceLegacyItem(item) {
    const baseUnit = item.baseUnit || 'ea';
    const legacyCost = item.defaultBaseUnitCost ?? item.defaultCost ?? item.cost;
    const unitsPerCase = finiteNumber(item.unitsPerCase);
    const conversions = { ...(item.unitConversions || {}) };
    if (unitsPerCase > 0 && !conversions.case && !conversions.cs) {
      conversions.case = unitsPerCase;
      conversions.cs = unitsPerCase;
    }
    return {
      id: item.id || uid('item'),
      name: item.name || 'Unnamed Item',
      normalizedName: normalizeText(item.name),
      group: item.group || 'ingredients',
      category: item.category || '',
      baseUnit,
      unitConversions: conversions,
      purchaseOptions: Array.isArray(item.purchaseOptions) ? item.purchaseOptions : [],
      defaultBaseUnitCost: Number.isFinite(Number(legacyCost)) ? roundUnitCost(legacyCost) : null,
      aliases: Array.isArray(item.aliases) ? item.aliases : [],
      excludedFromCount: Boolean(item.excludedFromCount ?? item.exclude),
      active: item.active !== false,
      costReviewRequired: Boolean(item.costReviewRequired || (item.defaultBaseUnitCost == null && item.defaultCost != null && unitsPerCase > 1)),
      sourceRecipeId: item.sourceRecipeId || null,
      createdAt: item.createdAt || nowISO(),
      updatedAt: nowISO()
    };
  }

  function migrateLegacyCount({ item, entry, locationId = '', sectionId = '' }) {
    return normalizeCountRecord({
      item,
      enteredQty: finiteNumber(entry?.qty),
      enteredUnit: entry?.unit || item.baseUnit,
      baseUnitCost: item.defaultBaseUnitCost,
      locationId,
      sectionId,
      allowMissingCost: true
    });
  }

  function migrateDatabase(raw) {
    if (!raw || typeof raw !== 'object') return createEmptyDatabase();
    if (raw.schemaVersion === CURRENT_SCHEMA_VERSION && Array.isArray(raw.periods)) return sanitizeDatabase(raw);

    const db = createEmptyDatabase();
    db.metadata.createdAt = raw.metadata?.createdAt || nowISO();
    db.metadata.lastMigrationAt = nowISO();
    db.settings = { ...db.settings, ...(raw.settings || {}) };
    db.items = (raw.items || []).map(coerceLegacyItem);
    const itemMap = new Map(db.items.map(item => [item.id, item]));

    const legacyLocations = raw.kitchen?.locations || [];
    db.kitchen.locations = legacyLocations.length ? legacyLocations.map((location, locationIndex) => ({
      id: location.id || uid('location'),
      name: location.name || `Location ${locationIndex + 1}`,
      sortOrder: location.sortOrder || locationIndex + 1,
      sections: (location.sections || []).map((section, sectionIndex) => ({
        id: section.id || uid('section'),
        name: section.name || `Section ${sectionIndex + 1}`,
        sortOrder: section.sortOrder || sectionIndex + 1,
        itemEntries: (section.itemEntries || section.itemIds || []).map((entry, entryIndex) => {
          const itemId = typeof entry === 'string' ? entry : entry.itemId;
          const override = section.overrides?.[itemId] || {};
          const item = itemMap.get(itemId);
          return {
            itemId,
            sortOrder: entryIndex + 1,
            preferredCountUnit: entry.preferredCountUnit || override.defaultUnit || item?.baseUnit || 'ea',
            allowedCountUnits: entry.allowedCountUnits || override.allowedUnits || [item?.baseUnit || 'ea']
          };
        }).filter(entry => itemMap.has(entry.itemId))
      }))
    })) : db.kitchen.locations;

    const legacyPeriods = raw.periods || raw.months || [];
    db.periods = legacyPeriods.length ? legacyPeriods.map((period, index) => ({
      id: period.id || uid('period'),
      label: period.label || `Period ${index + 1}`,
      year: finiteNumber(period.year, new Date().getFullYear()),
      month: finiteNumber(period.month, index + 1),
      status: period.status || (raw.period?.locked ? 'locked' : 'open'),
      openedAt: period.openedAt || period.createdAt || nowISO(),
      lockedAt: period.lockedAt || null,
      sales: {
        foodAndNonAlcoholNet: finiteNumber(period.sales?.foodAndNonAlcoholNet ?? period.sales?.foodNet),
        totalNet: finiteNumber(period.sales?.totalNet)
      },
      targetCogsPercent: finiteNumber(period.targetCogsPercent, db.settings.targetCogsPercent),
      inventoryCounts: { beginning: [], ending: [] },
      financialSnapshot: period.financialSnapshot || null,
      notes: period.notes || '',
      createdAt: period.createdAt || nowISO(),
      updatedAt: nowISO()
    })) : db.periods;
    const periodMap = new Map(db.periods.map(period => [period.id, period]));

    for (const location of legacyLocations) {
      for (const section of location.sections || []) {
        for (const [periodId, counts] of Object.entries(section._counts || {})) {
          const period = periodMap.get(periodId);
          if (!period) continue;
          for (const [itemId, entry] of Object.entries(counts || {})) {
            const item = itemMap.get(itemId);
            if (!item) continue;
            const normalized = migrateLegacyCount({ item, entry, locationId: location.id, sectionId: section.id });
            if (normalized.ok) period.inventoryCounts.ending.push(normalized.record);
          }
        }
      }
    }

    for (const legacy of legacyPeriods) {
      const period = periodMap.get(legacy.id);
      if (!period) continue;
      for (const [itemId, entry] of Object.entries(legacy.end?.counts || {})) {
        if (period.inventoryCounts.ending.some(record => record.itemId === itemId)) continue;
        const item = itemMap.get(itemId);
        if (!item) continue;
        const normalized = migrateLegacyCount({ item, entry });
        if (normalized.ok) period.inventoryCounts.ending.push(normalized.record);
      }
    }

    const orderedAsc = [...db.periods].sort((a, b) => periodKey(a) - periodKey(b));
    for (let index = 1; index < orderedAsc.length; index += 1) {
      orderedAsc[index].inventoryCounts.beginning = orderedAsc[index - 1].inventoryCounts.ending.map(record => ({ ...record, countedAt: orderedAsc[index].openedAt }));
    }

    db.invoices = (raw.invoices || []).map(invoice => ({
      id: invoice.id || uid('invoice'),
      periodId: invoice.periodId || invoice.monthId || db.periods[0]?.id,
      vendor: invoice.vendor || '',
      invoiceNumber: invoice.invoiceNumber || invoice.number || '',
      invoiceDate: invoice.invoiceDate || invoice.date || '',
      notes: invoice.notes || '',
      status: invoice.status || 'draft',
      lines: (invoice.lines || []).map(line => {
        const item = itemMap.get(line.itemId);
        const purchaseQty = finiteNumber(line.purchaseQty ?? line.qty, 0);
        const purchaseUnit = line.purchaseUnit || line.unit || item?.baseUnit || 'ea';
        const explicitFactor = finiteNumber(line.baseUnitsPerPurchaseUnit, NaN);
        const resolvedFactor = Number.isFinite(explicitFactor) && explicitFactor > 0
          ? explicitFactor
          : purchaseUnit === item?.baseUnit
            ? 1
            : getItemConversion(item, purchaseUnit);
        const purchaseUnitCost = finiteNumber(line.purchaseUnitCost ?? line.unitCost, 0);
        const normalized = normalizePurchaseLine({
          purchaseQty,
          purchaseUnit,
          purchaseUnitCost,
          baseUnitsPerPurchaseUnit: resolvedFactor,
          baseUnit: item?.baseUnit || purchaseUnit
        });
        return {
          id: line.id || uid('line'),
          rawName: line.rawName || item?.name || '',
          itemId: line.itemId || null,
          purchaseQty,
          purchaseUnit,
          baseUnitsPerPurchaseUnit: normalized.ok ? normalized.baseUnitsPerPurchaseUnit : null,
          purchaseUnitCost,
          normalizedBaseUnitQty: normalized.ok ? normalized.normalizedBaseUnitQty : null,
          normalizedBaseUnitCost: normalized.ok ? normalized.normalizedBaseUnitCost : null,
          extendedCost: normalized.ok ? normalized.extendedCost : roundMoney(purchaseQty * purchaseUnitCost),
          groupSnapshot: line.groupSnapshot || line.group || item?.group || 'ingredients',
          categorySnapshot: line.categorySnapshot || line.category || item?.category || '',
          matchConfidence: line.itemId ? 'review' : 'unmatched',
          notes: line.notes || '',
          normalizationError: normalized.ok ? null : normalized.errors.join(' ')
        };
      }),
      createdAt: invoice.createdAt || nowISO(),
      updatedAt: nowISO()
    }));

    db.findings = (raw.findings || []).map(finding => ({
      ...finding,
      id: finding.id || uid('finding'),
      periodId: finding.periodId || finding.monthId || db.periods[0]?.id,
      status: finding.status || 'open'
    }));
    db.recipes = (raw.recipes || []).map(recipe => ({
      id: recipe.id || uid('recipe'),
      type: recipe.type || 'portion',
      name: recipe.name || '',
      aliases: recipe.aliases || [],
      yieldQty: finiteNumber(recipe.yieldQty, 1) || 1,
      yieldUnit: recipe.yieldUnit || (recipe.type === 'batch' ? 'qt' : 'portion'),
      lines: (recipe.lines || []).map(line => ({
        id: line.id || uid('recipeLine'),
        itemId: line.itemId || null,
        qty: finiteNumber(line.qty),
        unit: line.unit || itemMap.get(line.itemId)?.baseUnit || 'ea'
      })),
      notes: recipe.notes || '',
      active: recipe.active !== false,
      sourceItemId: recipe.sourceItemId || null,
      createdAt: recipe.createdAt || nowISO(),
      updatedAt: nowISO()
    }));

    if (Array.isArray(raw.pmix) && raw.pmix.length) {
      db.pmixImports.push({
        id: uid('pmix'),
        periodId: db.periods[0]?.id,
        source: 'Legacy',
        importedAt: nowISO(),
        rows: raw.pmix.map(row => {
          const recipe = matchRecipe(db.recipes, row.name);
          return {
            id: uid('pmixRow'),
            rawMenuItemName: row.name || '',
            normalizedMenuItemName: normalizeText(row.name),
            recipeId: recipe?.id || null,
            quantitySold: finiteNumber(row.qty),
            matchStatus: recipe ? 'matched' : 'unmatched'
          };
        })
      });
    }
    db.auditLog.push({ id: uid('audit'), at: nowISO(), action: 'database_migrated', details: `Migrated legacy database to schema ${CURRENT_SCHEMA_VERSION}.` });
    return sanitizeDatabase(db);
  }

  function sanitizeDatabase(db) {
    const clean = { ...db };
    clean.schemaVersion = CURRENT_SCHEMA_VERSION;
    clean.metadata = {
      createdAt: db.metadata?.createdAt || nowISO(),
      updatedAt: db.metadata?.updatedAt || nowISO(),
      lastMigrationAt: db.metadata?.lastMigrationAt || null
    };
    clean.settings = { reportEmail: '', targetCogsPercent: 30, currency: 'USD', locale: 'en-US', vendorMemory: {}, ...(db.settings || {}) };
    clean.items = (db.items || []).map(coerceLegacyItem);
    clean.kitchen = db.kitchen && Array.isArray(db.kitchen.locations) ? db.kitchen : { locations: [] };
    clean.periods = sortPeriods(db.periods || []);
    clean.invoices = Array.isArray(db.invoices) ? db.invoices : [];
    clean.findings = Array.isArray(db.findings) ? db.findings : [];
    clean.recipes = Array.isArray(db.recipes) ? db.recipes : [];
    clean.pmixImports = Array.isArray(db.pmixImports) ? db.pmixImports : [];
    clean.auditLog = Array.isArray(db.auditLog) ? db.auditLog : [];
    return clean;
  }

  function validateDatabase(db) {
    const errors = [];
    if (!db || typeof db !== 'object') return { ok: false, errors: ['Database must be an object.'] };
    if (db.schemaVersion !== CURRENT_SCHEMA_VERSION) errors.push(`Expected schema version ${CURRENT_SCHEMA_VERSION}.`);
    for (const key of ['items', 'periods', 'invoices', 'findings', 'recipes', 'pmixImports', 'auditLog']) {
      if (!Array.isArray(db[key])) errors.push(`${key} must be an array.`);
    }
    if (!db.kitchen || !Array.isArray(db.kitchen.locations)) errors.push('kitchen.locations must be an array.');
    if (!db.metadata || typeof db.metadata !== 'object') errors.push('metadata must be an object.');
    if (!db.settings || typeof db.settings !== 'object') errors.push('settings must be an object.');
    if (errors.length) return { ok: false, errors };

    const allIds = new Set();
    const registerId = (id, path) => {
      if (!id || typeof id !== 'string') errors.push(`${path} must have a string ID.`);
      else if (allIds.has(id)) errors.push(`Duplicate ID ${id} at ${path}.`);
      else allIds.add(id);
    };

    const itemIds = new Set();
    for (const [index, item] of db.items.entries()) {
      registerId(item.id, `items[${index}]`);
      itemIds.add(item.id);
      if (!item.name || typeof item.name !== 'string') errors.push(`items[${index}].name is required.`);
      if (!item.baseUnit || typeof item.baseUnit !== 'string') errors.push(`items[${index}].baseUnit is required.`);
      if (!['ingredients', 'products', 'batch', 'nonfood'].includes(item.group)) errors.push(`items[${index}].group is invalid.`);
      const cost = finiteNumber(item.defaultBaseUnitCost, NaN);
      if (item.defaultBaseUnitCost != null && (!Number.isFinite(cost) || cost < 0)) errors.push(`items[${index}].defaultBaseUnitCost is invalid.`);
      if (!Array.isArray(item.aliases)) errors.push(`items[${index}].aliases must be an array.`);
      if (!item.unitConversions || typeof item.unitConversions !== 'object' || Array.isArray(item.unitConversions)) errors.push(`items[${index}].unitConversions must be an object.`);
    }

    const periodIds = new Set();
    const periodKeys = new Set();
    for (const [index, period] of db.periods.entries()) {
      registerId(period.id, `periods[${index}]`);
      periodIds.add(period.id);
      const key = periodKey(period);
      if (!Number.isInteger(period.month) || period.month < 1 || period.month > 12) errors.push(`periods[${index}].month is invalid.`);
      if (!Number.isInteger(period.year) || period.year < 2000 || period.year > 2200) errors.push(`periods[${index}].year is invalid.`);
      if (periodKeys.has(key)) errors.push(`Duplicate calendar period ${period.year}-${period.month}.`);
      periodKeys.add(key);
      if (!['open', 'locked'].includes(period.status)) errors.push(`periods[${index}].status is invalid.`);
      if (!period.sales || typeof period.sales !== 'object') errors.push(`periods[${index}].sales must be an object.`);
      if (!period.inventoryCounts || !Array.isArray(period.inventoryCounts.beginning) || !Array.isArray(period.inventoryCounts.ending)) {
        errors.push(`periods[${index}].inventoryCounts must contain beginning and ending arrays.`);
      } else {
        for (const phase of ['beginning', 'ending']) {
          for (const [recordIndex, record] of period.inventoryCounts[phase].entries()) {
            if (!itemIds.has(record.itemId)) errors.push(`periods[${index}].inventoryCounts.${phase}[${recordIndex}] references a missing item.`);
            if (!Number.isFinite(Number(record.normalizedBaseQty)) || Number(record.normalizedBaseQty) < 0) errors.push(`periods[${index}].inventoryCounts.${phase}[${recordIndex}] has invalid normalizedBaseQty.`);
            if (!record.baseUnit || typeof record.baseUnit !== 'string') errors.push(`periods[${index}].inventoryCounts.${phase}[${recordIndex}] is missing baseUnit.`);
            if (record.baseUnitCost != null && (!Number.isFinite(Number(record.baseUnitCost)) || Number(record.baseUnitCost) < 0)) errors.push(`periods[${index}].inventoryCounts.${phase}[${recordIndex}] has invalid baseUnitCost.`);
          }
        }
      }
    }

    for (const [locationIndex, location] of db.kitchen.locations.entries()) {
      registerId(location.id, `kitchen.locations[${locationIndex}]`);
      if (!Array.isArray(location.sections)) errors.push(`kitchen.locations[${locationIndex}].sections must be an array.`);
      for (const [sectionIndex, section] of (location.sections || []).entries()) {
        registerId(section.id, `kitchen.locations[${locationIndex}].sections[${sectionIndex}]`);
        if (!Array.isArray(section.itemEntries)) errors.push(`kitchen.locations[${locationIndex}].sections[${sectionIndex}].itemEntries must be an array.`);
        for (const [entryIndex, entry] of (section.itemEntries || []).entries()) {
          if (!itemIds.has(entry.itemId)) errors.push(`kitchen.locations[${locationIndex}].sections[${sectionIndex}].itemEntries[${entryIndex}] references a missing item.`);
          if (!Array.isArray(entry.allowedCountUnits) || !entry.allowedCountUnits.length) errors.push(`kitchen.locations[${locationIndex}].sections[${sectionIndex}].itemEntries[${entryIndex}] must have allowedCountUnits.`);
        }
      }
    }

    for (const [index, invoice] of db.invoices.entries()) {
      registerId(invoice.id, `invoices[${index}]`);
      if (!periodIds.has(invoice.periodId)) errors.push(`invoices[${index}] references a missing period.`);
      if (!['draft', 'posted', 'void'].includes(invoice.status)) errors.push(`invoices[${index}].status is invalid.`);
      if (!Array.isArray(invoice.lines)) errors.push(`invoices[${index}].lines must be an array.`);
      for (const [lineIndex, line] of (invoice.lines || []).entries()) {
        registerId(line.id, `invoices[${index}].lines[${lineIndex}]`);
        if (line.itemId && !itemIds.has(line.itemId)) errors.push(`invoices[${index}].lines[${lineIndex}] references a missing item.`);
        if (!Number.isFinite(Number(line.purchaseQty)) || Number(line.purchaseQty) < 0) errors.push(`invoices[${index}].lines[${lineIndex}] has invalid purchaseQty.`);
        if (!Number.isFinite(Number(line.purchaseUnitCost)) || Number(line.purchaseUnitCost) < 0) errors.push(`invoices[${index}].lines[${lineIndex}] has invalid purchaseUnitCost.`);
        if (invoice.status === 'posted') {
          if (!line.itemId) errors.push(`invoices[${index}].lines[${lineIndex}] cannot be posted without an item.`);
          if (!['exact', 'confirmed'].includes(line.matchConfidence)) errors.push(`invoices[${index}].lines[${lineIndex}] cannot be posted without confirmed matching.`);
          if (line.normalizationError) errors.push(`invoices[${index}].lines[${lineIndex}] cannot be posted with a normalization error.`);
          if (!Number.isFinite(Number(line.normalizedBaseUnitQty)) || !Number.isFinite(Number(line.normalizedBaseUnitCost))) errors.push(`invoices[${index}].lines[${lineIndex}] lacks normalized values.`);
        }
      }
    }

    const recipeIds = new Set();
    for (const [index, recipe] of db.recipes.entries()) {
      registerId(recipe.id, `recipes[${index}]`);
      recipeIds.add(recipe.id);
      if (!['portion', 'batch'].includes(recipe.type)) errors.push(`recipes[${index}].type is invalid.`);
      if (!Array.isArray(recipe.lines)) errors.push(`recipes[${index}].lines must be an array.`);
      if (!Number.isFinite(Number(recipe.yieldQty)) || Number(recipe.yieldQty) <= 0) errors.push(`recipes[${index}].yieldQty must be greater than zero.`);
      for (const [lineIndex, line] of (recipe.lines || []).entries()) {
        registerId(line.id, `recipes[${index}].lines[${lineIndex}]`);
        if (!itemIds.has(line.itemId)) errors.push(`recipes[${index}].lines[${lineIndex}] references a missing item.`);
        if (!Number.isFinite(Number(line.qty)) || Number(line.qty) < 0) errors.push(`recipes[${index}].lines[${lineIndex}] has invalid qty.`);
        if (!line.unit || typeof line.unit !== 'string') errors.push(`recipes[${index}].lines[${lineIndex}] is missing unit.`);
      }
    }

    for (const [index, imported] of db.pmixImports.entries()) {
      registerId(imported.id, `pmixImports[${index}]`);
      if (!periodIds.has(imported.periodId)) errors.push(`pmixImports[${index}] references a missing period.`);
      if (!Array.isArray(imported.rows)) errors.push(`pmixImports[${index}].rows must be an array.`);
      for (const [rowIndex, row] of (imported.rows || []).entries()) {
        registerId(row.id, `pmixImports[${index}].rows[${rowIndex}]`);
        if (row.recipeId && !recipeIds.has(row.recipeId)) errors.push(`pmixImports[${index}].rows[${rowIndex}] references a missing recipe.`);
        if (!Number.isFinite(Number(row.quantitySold)) || Number(row.quantitySold) < 0) errors.push(`pmixImports[${index}].rows[${rowIndex}] has invalid quantitySold.`);
      }
    }

    for (const [index, finding] of db.findings.entries()) {
      registerId(finding.id, `findings[${index}]`);
      if (!periodIds.has(finding.periodId)) errors.push(`findings[${index}] references a missing period.`);
      if (typeof finding.text !== 'string') errors.push(`findings[${index}].text must be a string.`);
    }

    return { ok: errors.length === 0, errors: [...new Set(errors)] };
  }

  return {
    CURRENT_SCHEMA_VERSION,
    FINANCIAL_GROUPS,
    UNIT_COST_DECIMALS,
    UNIT_DEFINITIONS,
    uid,
    nowISO,
    normalizeText,
    finiteNumber,
    roundMoney,
    roundUnitCost,
    roundQuantity,
    periodKey,
    sortPeriods,
    getPreviousPeriod,
    getNextPeriod,
    getItemConversion,
    convertQuantity,
    normalizePurchaseLine,
    normalizeCountRecord,
    inventoryValue,
    postedInvoices,
    purchaseValue,
    actualCogsByGroup,
    actualCogs,
    recipeCost,
    matchRecipe,
    theoreticalCogs,
    inventoryMovement,
    buildExceptions,
    confidenceStatus,
    deepCopy,
    createEmptyDatabase,
    migrateDatabase,
    sanitizeDatabase,
    validateDatabase
  };
});
