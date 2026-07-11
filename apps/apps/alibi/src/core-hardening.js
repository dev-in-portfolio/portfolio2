(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.AlibiCore = factory(root.AlibiCore);
})(typeof globalThis !== 'undefined' ? globalThis : this, function applyCoreHardening(Core) {
  'use strict';
  if (!Core) throw new Error('AlibiCore is required before core hardening.');
  if (Core.__releaseHardeningApplied) return Core;

  const original = {
    normalizePurchaseLine: Core.normalizePurchaseLine,
    normalizeCountRecord: Core.normalizeCountRecord,
    migrateDatabase: Core.migrateDatabase,
    validateDatabase: Core.validateDatabase,
    buildExceptions: Core.buildExceptions
  };
  const isBlank = value => value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
  const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
  const countKey = (itemId, locationId, sectionId) => `${itemId || ''}|${locationId || ''}|${sectionId || ''}`;

  Core.normalizePurchaseLine = input => {
    const errors = [];
    if (isBlank(input?.purchaseQty)) errors.push('Purchase quantity is required.');
    if (isBlank(input?.purchaseUnitCost)) errors.push('Purchase-unit cost is required.');
    if (isBlank(input?.baseUnitsPerPurchaseUnit)) errors.push('Base units per purchase unit are required.');
    if (errors.length) return { ok: false, errors };
    return original.normalizePurchaseLine(input);
  };

  Core.normalizeCountRecord = input => original.normalizeCountRecord({
    ...input,
    allowMissingCost: input?.allowMissingCost ?? true
  });

  Core.recipeCost = (recipe, itemsById) => {
    const errors = [];
    const lines = Array.isArray(recipe?.lines) ? recipe.lines : [];
    if (!lines.length) errors.push('Recipe requires at least one ingredient.');
    let batchCost = 0;
    let positiveLines = 0;
    for (const line of lines) {
      const qty = isBlank(line?.qty) ? NaN : Core.finiteNumber(line.qty, NaN);
      if (!Number.isFinite(qty) || qty <= 0) {
        errors.push('Recipe ingredient quantities must be greater than zero.');
        continue;
      }
      positiveLines += 1;
      const item = itemsById.get(line.itemId);
      if (!item) {
        errors.push(`Missing item for recipe line ${line.id || ''}`.trim());
        continue;
      }
      const conversion = Core.convertQuantity({ quantity: qty, fromUnit: line.unit, toUnit: item.baseUnit, item });
      if (!conversion.ok) {
        errors.push(conversion.error);
        continue;
      }
      const rawCost = item.defaultBaseUnitCost;
      const cost = isBlank(rawCost) ? NaN : Core.finiteNumber(rawCost, NaN);
      if (!Number.isFinite(cost) || cost < 0) {
        errors.push(`Missing valid cost for ${item.name}.`);
        continue;
      }
      batchCost += conversion.quantity * cost;
    }
    if (lines.length && positiveLines === 0) errors.push('Recipe requires at least one positive-quantity ingredient.');
    const yieldQty = Core.finiteNumber(recipe?.yieldQty, NaN);
    if (!Number.isFinite(yieldQty) || yieldQty <= 0) errors.push('Recipe yield must be greater than zero.');
    return {
      ok: errors.length === 0,
      errors: [...new Set(errors)],
      batchCost: Core.roundMoney(batchCost),
      unitCost: Number.isFinite(yieldQty) && yieldQty > 0 ? Core.roundUnitCost(batchCost / yieldQty) : 0
    };
  };

  Core.theoreticalCogs = (db, periodId) => {
    const period = (db.periods || []).find(candidate => candidate.id === periodId);
    if (period?.status === 'locked' && period.financialSnapshot?.theoretical) {
      const snapshot = Core.deepCopy(period.financialSnapshot.theoretical);
      if (!snapshot.importId) return { ...snapshot, complete: false, missingPmix: true };
      return snapshot;
    }
    const itemsById = new Map((db.items || []).map(item => [item.id, item]));
    const imports = (db.pmixImports || [])
      .filter(imported => imported.periodId === periodId)
      .sort((a, b) => String(b.importedAt).localeCompare(String(a.importedAt)));
    const activeImport = imports[0] || null;
    if (!activeImport) return { total: 0, matchedQty: 0, unmatched: [], errors: [], importId: null, complete: false, missingPmix: true };
    if (!(activeImport.rows || []).length) {
      return { total: 0, matchedQty: 0, unmatched: [], errors: ['PMIX import contains no rows.'], importId: activeImport.id, complete: false, missingPmix: false };
    }

    let total = 0;
    let matchedQty = 0;
    const unmatched = [];
    const errors = [];
    for (const row of activeImport.rows || []) {
      const recipe = row.recipeId
        ? (db.recipes || []).find(candidate => candidate.id === row.recipeId)
        : Core.matchRecipe(db.recipes || [], row.rawMenuItemName);
      if (!recipe) {
        unmatched.push(row.rawMenuItemName);
        continue;
      }
      const cost = Core.recipeCost(recipe, itemsById);
      if (!cost.ok) {
        errors.push(...cost.errors.map(error => `${recipe.name || 'Unnamed recipe'}: ${error}`));
        continue;
      }
      const rawQty = row.quantitySold;
      const qty = isBlank(rawQty) ? NaN : Core.finiteNumber(rawQty, NaN);
      if (!Number.isFinite(qty) || qty < 0) {
        errors.push(`${recipe.name || 'Unnamed recipe'}: Quantity sold must be zero or greater.`);
        continue;
      }
      total += qty * cost.unitCost;
      matchedQty += qty;
    }
    return {
      total: Core.roundMoney(total),
      matchedQty: Core.roundQuantity(matchedQty),
      unmatched: [...new Set(unmatched)],
      errors: [...new Set(errors)],
      importId: activeImport.id,
      complete: unmatched.length === 0 && errors.length === 0,
      missingPmix: false
    };
  };

  Core.buildExceptions = (db, period) => {
    const issues = original.buildExceptions(db, period);
    const addUnique = (type, severity, message, context = {}) => {
      if (!issues.some(issue => issue.type === type && issue.message === message)) {
        issues.push({ id: Core.uid('issue'), type, severity, message, context });
      }
    };

    const activeItems = new Map((db.items || [])
      .filter(item => item.active !== false && !item.excludedFromCount && Core.FINANCIAL_GROUPS.has(item.group))
      .map(item => [item.id, item]));
    const requiredRoutes = new Map();
    for (const location of db.kitchen?.locations || []) {
      for (const section of location.sections || []) {
        for (const entry of section.itemEntries || []) {
          if (!activeItems.has(entry.itemId)) continue;
          requiredRoutes.set(countKey(entry.itemId, location.id, section.id), {
            itemId: entry.itemId,
            itemName: activeItems.get(entry.itemId)?.name || entry.itemId,
            locationId: location.id,
            sectionId: section.id
          });
        }
      }
    }
    for (const item of activeItems.values()) {
      const routed = [...requiredRoutes.values()].some(route => route.itemId === item.id);
      if (!routed) addUnique('unrouted_count_item', 'incomplete', `${item.name} is active for inventory but is not assigned to a counting route.`, { itemId: item.id });
    }
    if (activeItems.size && !requiredRoutes.size) {
      addUnique('missing_count_routes', 'incomplete', 'No counting routes are configured for active inventory items.');
    }
    for (const phase of ['beginning', 'ending']) {
      const records = period?.inventoryCounts?.[phase] || [];
      const covered = new Set(records.map(record => countKey(record.itemId, record.locationId, record.sectionId)));
      const missing = [...requiredRoutes.keys()].filter(key => !covered.has(key));
      if (missing.length) {
        const label = phase === 'beginning' ? 'Beginning' : 'Ending';
        addUnique(`missing_${phase}_counts`, 'incomplete', `${label} inventory is missing ${missing.length} of ${requiredRoutes.size} routed count${requiredRoutes.size === 1 ? '' : 's'}.`, { missingKeys: missing });
      }
    }

    const theoretical = Core.theoreticalCogs(db, period.id);
    if (theoretical.missingPmix) addUnique('missing_pmix', 'incomplete', 'PMIX has not been imported for this period.');
    for (const error of theoretical.errors || []) addUnique('recipe_cost', 'incomplete', error);
    return issues;
  };

  Core.migrateDatabase = raw => {
    const migrated = original.migrateDatabase(raw);
    if (!raw || typeof raw !== 'object' || (raw.schemaVersion === Core.CURRENT_SCHEMA_VERSION && Array.isArray(raw.periods))) return migrated;

    const legacyItems = Array.isArray(raw.items) ? raw.items : [];
    migrated.items.forEach((item, index) => {
      const legacy = legacyItems.find(candidate => candidate.id && candidate.id === item.id) || legacyItems[index] || {};
      const unitsPerCase = Core.finiteNumber(legacy.unitsPerCase);
      const hadExplicitBaseCost = hasOwn(legacy, 'defaultBaseUnitCost');
      const hadAmbiguousLegacyCost = !hadExplicitBaseCost && (hasOwn(legacy, 'defaultCost') || hasOwn(legacy, 'cost')) && unitsPerCase > 1;
      if (hadAmbiguousLegacyCost) {
        item.defaultBaseUnitCost = null;
        item.costReviewRequired = true;
      }
    });

    const legacyInvoices = Array.isArray(raw.invoices) ? raw.invoices : [];
    migrated.invoices.forEach((invoice, index) => {
      const legacy = legacyInvoices.find(candidate => candidate.id && candidate.id === invoice.id) || legacyInvoices[index] || {};
      const legacyLines = Array.isArray(legacy.lines) ? legacy.lines : [];
      for (const [lineIndex, line] of (invoice.lines || []).entries()) {
        const legacyLine = legacyLines.find(candidate => candidate.id && candidate.id === line.id) || legacyLines[lineIndex] || {};
        const rawCost = legacyLine.purchaseUnitCost ?? legacyLine.unitCost;
        if (isBlank(rawCost)) {
          line.purchaseUnitCost = '';
          line.normalizedBaseUnitQty = null;
          line.normalizedBaseUnitCost = null;
          line.extendedCost = null;
          line.normalizationError = 'Purchase-unit cost is required.';
        }
        if (line.itemId && !line.normalizationError) line.matchConfidence = 'confirmed';
        else if (!line.itemId) line.matchConfidence = 'unmatched';
      }
      if (!legacy.status) {
        invoice.status = invoice.lines.length && invoice.lines.every(line => line.itemId && !line.normalizationError && Number.isFinite(Number(line.normalizedBaseUnitQty)) && Number.isFinite(Number(line.normalizedBaseUnitCost)))
          ? 'posted'
          : 'draft';
      } else if (legacy.status === 'posted' && invoice.lines.some(line => !line.itemId || line.normalizationError)) {
        invoice.status = 'draft';
      }
    });
    return migrated;
  };

  Core.validateDatabase = db => {
    const result = original.validateDatabase(db);
    const errors = [...result.errors];
    if (!db || typeof db !== 'object' || !Array.isArray(db.items) || !Array.isArray(db.recipes)) {
      return { ok: errors.length === 0, errors: [...new Set(errors)] };
    }
    const itemIds = new Set(db.items.map(item => item.id));
    const recipeIds = new Set(db.recipes.map(recipe => recipe.id));
    const validateIdentities = (records, label) => {
      const owners = new Map();
      for (const [index, record] of records.entries()) {
        for (const raw of [record.name, ...(record.aliases || [])]) {
          const normalized = Core.normalizeText(raw);
          if (!normalized) continue;
          const existing = owners.get(normalized);
          if (existing && existing.id !== record.id) errors.push(`${label}[${index}] duplicates the name or alias “${raw}”.`);
          else owners.set(normalized, record);
        }
      }
    };
    validateIdentities(db.items, 'items');
    validateIdentities(db.recipes, 'recipes');

    for (const [index, recipe] of db.recipes.entries()) {
      if (recipe.sourceItemId && !itemIds.has(recipe.sourceItemId)) errors.push(`recipes[${index}].sourceItemId references a missing item.`);
      if (recipe.sourceItemId) {
        const item = db.items.find(candidate => candidate.id === recipe.sourceItemId);
        if (item && item.sourceRecipeId !== recipe.id) errors.push(`recipes[${index}] and its source item are not linked reciprocally.`);
      }
    }
    for (const [index, item] of db.items.entries()) {
      if (item.sourceRecipeId && !recipeIds.has(item.sourceRecipeId)) errors.push(`items[${index}].sourceRecipeId references a missing recipe.`);
      if (item.sourceRecipeId) {
        const recipe = db.recipes.find(candidate => candidate.id === item.sourceRecipeId);
        if (recipe && recipe.sourceItemId !== item.id) errors.push(`items[${index}] and its source recipe are not linked reciprocally.`);
      }
    }
    return { ok: errors.length === 0, errors: [...new Set(errors)] };
  };

  Object.defineProperty(Core, '__releaseHardeningApplied', { value: true, enumerable: false });
  return Core;
});
