(() => {
  'use strict';

  const C = window.AlibiCore;
  if (!C) throw new Error('AlibiCore failed to load.');

  const A = window.AlibiApp = {
    C,
    STORAGE_KEY: 'kitchen_inventory_v8',
    BACKUP_KEYS: ['alibi_auto_backup_1', 'alibi_auto_backup_2', 'alibi_auto_backup_3'],
    state: {
      periodId: null,
      locationId: null,
      sectionId: null,
      invoiceId: null,
      recipeId: null,
      recipeFilter: 'portion',
      walk: null,
      saveTimer: null,
      modalReturnFocus: null
    }
  };

  A.$ = (selector, root = document) => root.querySelector(selector);
  A.$$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  A.clone = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  A.escapeHtml = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  A.escapeAttr = value => A.escapeHtml(value).replaceAll('"', '&quot;');
  A.money = value => C.finiteNumber(value).toLocaleString(undefined, { style: 'currency', currency: A.db?.settings?.currency || 'USD' });
  A.unitCost = value => C.finiteNumber(value).toLocaleString(undefined, {
    style: 'currency',
    currency: A.db?.settings?.currency || 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  });
  A.percent = value => value == null || !Number.isFinite(value) ? '—' : `${(value * 100).toFixed(1)}%`;
  A.qty = value => C.finiteNumber(value).toLocaleString(undefined, { maximumFractionDigits: 6 });
  A.empty = message => `<div class="empty-state">${A.escapeHtml(message)}</div>`;
  A.badge = (text, type = '') => `<span class="badge ${type}">${A.escapeHtml(text)}</span>`;

  A.notify = (message, type = 'info', persistent = false) => {
    const region = A.$('#toastRegion');
    if (!region) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = String(message);
    region.appendChild(toast);
    if (!persistent) setTimeout(() => toast.remove(), 4200);
  };

  A.setSaveStatus = (status, detail = '') => {
    const el = A.$('#saveStatus');
    if (!el) return;
    el.classList.remove('saving', 'failed');
    if (status === 'saving') el.classList.add('saving');
    if (status === 'failed') el.classList.add('failed');
    const label = A.$('.label', el);
    if (label) label.textContent = status === 'saving' ? 'Saving…' : status === 'failed' ? `Save Failed${detail ? `: ${detail}` : ''}` : 'Saved';
  };

  A.audit = (action, details = '') => {
    A.db.auditLog ||= [];
    A.db.auditLog.unshift({ id: C.uid('audit'), at: C.nowISO(), action, details });
    A.db.auditLog = A.db.auditLog.slice(0, 300);
  };

  A.createAutoBackup = (reason = 'automatic') => {
    try {
      for (let index = A.BACKUP_KEYS.length - 1; index > 0; index -= 1) {
        const previous = localStorage.getItem(A.BACKUP_KEYS[index - 1]);
        if (previous) localStorage.setItem(A.BACKUP_KEYS[index], previous);
      }
      localStorage.setItem(A.BACKUP_KEYS[0], JSON.stringify({ reason, createdAt: C.nowISO(), data: A.db }));
      return true;
    } catch (error) {
      A.notify(`Local backup failed: ${error.message}`, 'error', true);
      return false;
    }
  };

  A.loadDatabase = () => {
    try {
      const probe = '__alibi_storage_probe__';
      localStorage.setItem(probe, 'ok');
      localStorage.removeItem(probe);
    } catch (error) {
      A.notify('Browser storage is unavailable. Changes cannot be preserved.', 'error', true);
      return C.createEmptyDatabase();
    }

    const rawText = localStorage.getItem(A.STORAGE_KEY);
    if (!rawText) return C.createEmptyDatabase();

    let raw;
    try {
      raw = JSON.parse(rawText);
    } catch (error) {
      try { localStorage.setItem(`alibi_corrupt_backup_${Date.now()}`, rawText); } catch (_) {}
      A.notify('Stored data was invalid JSON. It was preserved and a clean database was opened.', 'error', true);
      return C.createEmptyDatabase();
    }

    const needsMigration = raw.schemaVersion !== C.CURRENT_SCHEMA_VERSION || !Array.isArray(raw.periods);
    if (needsMigration) {
      try { localStorage.setItem(`alibi_pre_migration_backup_${Date.now()}`, rawText); } catch (_) {}
    }

    try {
      const migrated = C.migrateDatabase(raw);
      const validation = C.validateDatabase(migrated);
      if (!validation.ok) throw new Error(validation.errors.join(' '));
      if (needsMigration) A.notify(`Existing data migrated to schema ${C.CURRENT_SCHEMA_VERSION}.`, 'success');
      return migrated;
    } catch (error) {
      A.notify(`Data migration failed: ${error.message}`, 'error', true);
      return C.createEmptyDatabase();
    }
  };

  A.save = () => {
    A.setSaveStatus('saving');
    try {
      A.db.metadata.updatedAt = C.nowISO();
      const validation = C.validateDatabase(A.db);
      if (!validation.ok) throw new Error(validation.errors.join(' '));
      localStorage.setItem(A.STORAGE_KEY, JSON.stringify(A.db));
      A.setSaveStatus('saved');
      return { ok: true };
    } catch (error) {
      A.setSaveStatus('failed', error.message);
      A.notify(`Changes are not saved: ${error.message}`, 'error', true);
      return { ok: false, error };
    }
  };

  A.saveDebounced = (delay = 180) => {
    clearTimeout(A.state.saveTimer);
    A.setSaveStatus('saving');
    A.state.saveTimer = setTimeout(A.save, delay);
  };

  A.currentPeriod = () => A.db.periods.find(period => period.id === A.state.periodId) || A.db.periods[0] || null;
  A.currentLocation = () => A.db.kitchen.locations.find(location => location.id === A.state.locationId) || null;
  A.currentSection = () => A.currentLocation()?.sections?.find(section => section.id === A.state.sectionId) || null;
  A.currentInvoice = () => A.db.invoices.find(invoice => invoice.id === A.state.invoiceId) || null;
  A.currentRecipe = () => A.db.recipes.find(recipe => recipe.id === A.state.recipeId) || null;
  A.isLocked = () => A.currentPeriod()?.status === 'locked';
  A.requireOpen = action => {
    if (!A.isLocked()) return true;
    A.notify(`This period is locked. Unlock it before you ${action}.`, 'warning');
    return false;
  };
  A.itemsById = () => new Map(A.db.items.map(item => [item.id, item]));

  A.findItem = query => {
    const normalized = C.normalizeText(query);
    if (!normalized) return null;
    const exact = A.db.items.find(item => C.normalizeText(item.name) === normalized || (item.aliases || []).some(alias => C.normalizeText(alias) === normalized));
    if (exact) return { item: exact, confidence: 'exact' };
    const candidates = A.db.items.map(item => {
      const name = C.normalizeText(item.name);
      let score = name.includes(normalized) ? 10 : normalized.includes(name) ? 7 : 0;
      const wanted = new Set(normalized.split(' '));
      const found = new Set(name.split(' '));
      wanted.forEach(token => { if (found.has(token)) score += 1; });
      return { item, score };
    }).filter(candidate => candidate.score > 0).sort((a, b) => b.score - a.score);
    return candidates[0] ? { item: candidates[0].item, confidence: candidates[0].score >= 10 ? 'high' : 'review' } : null;
  };

  A.goTab = tab => {
    A.$$('.panel').forEach(panel => panel.classList.toggle('active', panel.id === `panel-${tab}`));
    A.$$('.nav-btn').forEach(button => button.classList.toggle('active', button.dataset.gotoTab === tab));
    history.replaceState(null, '', `#${tab}`);
    A.renderAll?.();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  A.openModal = (html, opener = document.activeElement) => {
    A.state.modalReturnFocus = opener;
    const overlay = A.$('#sharedModal');
    A.$('#sharedModalCard').innerHTML = html;
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(() => A.$('#sharedModalCard input, #sharedModalCard select, #sharedModalCard textarea, #sharedModalCard button')?.focus(), 0);
  };

  A.closeModal = () => {
    A.$('#sharedModal').classList.add('hidden');
    A.$('#sharedModalCard').innerHTML = '';
    document.body.style.overflow = '';
    A.state.modalReturnFocus?.focus?.();
    A.state.modalReturnFocus = null;
  };

  A.downloadText = (name, content, type = 'text/plain;charset=utf-8') => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([content], { type }));
    link.download = name;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 1500);
  };

  A.db = A.loadDatabase();
  A.state.periodId = C.sortPeriods(A.db.periods)[0]?.id || null;
})();
