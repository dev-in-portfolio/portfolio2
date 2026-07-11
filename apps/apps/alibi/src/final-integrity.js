(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else factory(root.AlibiApp, root.AlibiCore, root.document);
})(typeof globalThis !== 'undefined' ? globalThis : this, function installFinalIntegrity(A, C, document) {
  'use strict';
  if (!C) throw new Error('AlibiCore is required before final integrity hardening.');

  if (!C.__lockedVerificationSnapshotApplied) {
    const currentBuildExceptions = C.buildExceptions;
    C.buildExceptions = (db, period) => {
      const snapshot = period?.financialSnapshot?.verification;
      if (period?.status === 'locked' && Array.isArray(snapshot?.issues)) return C.deepCopy(snapshot.issues);
      return currentBuildExceptions(db, period);
    };
    Object.defineProperty(C, '__lockedVerificationSnapshotApplied', { value: true, enumerable: false });
  }

  if (!A || !document || A.finalIntegrity) return C;

  const originalSave = A.save;
  const originalCloseModal = A.closeModal;
  const originalNotify = A.notify;
  const originalRenderAll = A.renderAll;
  let eventTransaction = null;

  const stateCopy = () => ({ ...A.state, walk: A.state.walk ? A.clone(A.state.walk) : null });
  const restoreState = snapshot => {
    for (const key of Object.keys(A.state)) delete A.state[key];
    Object.assign(A.state, snapshot);
  };
  const calendarNumber = period => Number(period?.year || 0) * 12 + Number(period?.month || 0);
  const stop = event => {
    event.preventDefault?.();
    event.stopPropagation?.();
    event.stopImmediatePropagation?.();
  };

  function decorateRenderedControls() {
    const invoice = A.currentInvoice?.();
    const postButton = A.$?.('#btnPostInvoice');
    if (postButton && invoice?.status === 'posted') {
      postButton.disabled = true;
      postButton.textContent = 'Already Posted';
    }
    const phase = A.$?.('#walkPhase');
    if (phase && A.state.walk?.phase) phase.value = A.state.walk.phase;
  }

  A.renderAll = (...args) => {
    const value = originalRenderAll(...args);
    decorateRenderedControls();
    return value;
  };

  A.save = (...args) => {
    const result = originalSave(...args);
    if (eventTransaction && !result?.ok) {
      A.db = eventTransaction.beforeDb;
      restoreState(eventTransaction.beforeState);
      eventTransaction.failed = true;
      originalRenderAll();
      decorateRenderedControls();
    }
    return result;
  };

  A.closeModal = (...args) => {
    if (eventTransaction?.failed) return;
    return originalCloseModal(...args);
  };

  A.notify = (message, type, ...rest) => {
    if (eventTransaction?.failed && type === 'success') return;
    return originalNotify(message, type, ...rest);
  };

  function beginEventTransaction() {
    if (eventTransaction) return;
    eventTransaction = { beforeDb: A.clone(A.db), beforeState: stateCopy(), failed: false };
    queueMicrotask(() => { eventTransaction = null; });
  }

  function persistMutation(beforeDb, beforeState = null) {
    const result = A.save();
    if (result?.ok) return true;
    A.db = beforeDb;
    if (beforeState) restoreState(beforeState);
    A.renderAll();
    return false;
  }

  function currentRoutes() {
    const routes = [];
    const active = new Set((A.db.items || [])
      .filter(item => item.active !== false && !item.excludedFromCount && C.FINANCIAL_GROUPS.has(item.group))
      .map(item => item.id));
    for (const location of A.db.kitchen?.locations || []) {
      for (const section of location.sections || []) {
        for (const entry of section.itemEntries || []) {
          if (!active.has(entry.itemId)) continue;
          routes.push({ itemId: entry.itemId, locationId: location.id, sectionId: section.id });
        }
      }
    }
    return routes;
  }

  function laterLockedPeriods(period) {
    const point = calendarNumber(period);
    return (A.db.periods || []).filter(candidate => candidate.status === 'locked' && calendarNumber(candidate) > point);
  }

  function refreshEndingValuation(period) {
    for (const record of period.inventoryCounts?.ending || []) {
      const item = A.db.items.find(candidate => candidate.id === record.itemId);
      if (!item) continue;
      record.baseUnitCost = item.defaultBaseUnitCost == null ? null : C.roundUnitCost(item.defaultBaseUnitCost);
      record.extendedValue = record.baseUnitCost == null ? null : C.roundMoney(record.normalizedBaseQty * record.baseUnitCost);
    }
  }

  function safeTogglePeriodLock() {
    const period = A.currentPeriod();
    if (!period) return;
    const laterLocked = laterLockedPeriods(period);
    if (laterLocked.length) {
      A.notify(`Unlock later locked periods first: ${laterLocked.map(candidate => candidate.label).join(', ')}.`, 'error', true);
      return;
    }

    const beforeDb = A.clone(A.db);
    const beforeState = stateCopy();
    if (period.status === 'locked') {
      const reason = prompt('Reason for unlocking this period:');
      if (!reason?.trim()) return;
      period.status = 'open';
      period.lockedAt = null;
      period.financialSnapshot = null;
      A.audit('period_unlocked', `${period.label}: ${reason.trim()}`);
      if (!persistMutation(beforeDb, beforeState)) return;
      A.renderAll();
      A.notify('Period unlocked.', 'warning');
      return;
    }

    const issues = C.buildExceptions(A.db, period);
    if (issues.some(issue => issue.severity === 'incomplete') && !confirm('This period has incomplete data. Lock it anyway?')) return;
    const next = C.getNextPeriod(A.db.periods, period.id);
    if (next?.status === 'locked') {
      A.notify(`${next.label} is already locked. Unlock it before changing the prior period.`, 'error', true);
      return;
    }
    if (next && (next.inventoryCounts?.beginning || []).length && !confirm(`Locking ${period.label} will replace ${next.label}'s beginning inventory with finalized ending inventory. Continue?`)) return;

    refreshEndingValuation(period);
    if (next) {
      next.inventoryCounts.beginning = (period.inventoryCounts?.ending || []).map(record => ({ ...A.clone(record), countedAt: next.openedAt || C.nowISO() }));
      next.updatedAt = C.nowISO();
      A.audit('next_period_beginning_synced', `${period.label} → ${next.label}`);
    }
    period.financialSnapshot = {
      actual: C.actualCogs(A.db, period),
      theoretical: C.theoreticalCogs(A.db, period.id),
      movement: C.inventoryMovement(A.db, period),
      verification: {
        issues: C.deepCopy(issues),
        confidence: C.confidenceStatus(issues),
        routes: C.deepCopy(currentRoutes()),
        items: C.deepCopy((A.db.items || []).map(item => ({ id: item.id, name: item.name, group: item.group, active: item.active, excludedFromCount: item.excludedFromCount, costReviewRequired: item.costReviewRequired }))),
        createdAt: C.nowISO()
      },
      createdAt: C.nowISO()
    };
    period.status = 'locked';
    period.lockedAt = C.nowISO();
    A.audit('period_locked', period.label);
    if (!persistMutation(beforeDb, beforeState)) return;
    A.renderAll();
    A.notify('Period locked with historical verification frozen.', 'success');
  }

  function findCount(period, phase, itemId, locationId, sectionId) {
    return (period.inventoryCounts?.[phase] || []).find(record => record.itemId === itemId && record.locationId === locationId && record.sectionId === sectionId) || null;
  }

  function preferredWalkPhase(period, location, section) {
    const opening = new Set((period.inventoryCounts?.beginning || []).map(record => `${record.itemId}|${record.locationId}|${record.sectionId}`));
    const missingOpening = (section.itemEntries || []).some(entry => !opening.has(`${entry.itemId}|${location.id}|${section.id}`));
    return missingOpening ? 'beginning' : 'ending';
  }

  function renderWalk() {
    const walk = A.state.walk;
    if (!walk) return;
    const location = A.db.kitchen.locations.find(candidate => candidate.id === walk.locationId);
    const section = location?.sections?.find(candidate => candidate.id === walk.sectionId);
    const entry = walk.entries?.[walk.index];
    const item = A.db.items.find(candidate => candidate.id === entry?.itemId);
    const period = A.currentPeriod();
    if (!location || !section || !entry || !item || !period) return A.notify('The counting route contains a missing item or section.', 'error', true);
    const existing = findCount(period, walk.phase, item.id, location.id, section.id);
    const previous = C.getPreviousPeriod(A.db.periods, period.id);
    const comparison = walk.phase === 'beginning'
      ? previous && findCount(previous, 'ending', item.id, location.id, section.id)
      : findCount(period, 'beginning', item.id, location.id, section.id) || (previous && findCount(previous, 'ending', item.id, location.id, section.id));

    A.$('#walkPhase').value = walk.phase;
    A.$('#walkCrumb').textContent = `${walk.phase === 'beginning' ? 'Opening' : 'Ending'} • ${location.name} → ${section.name}`;
    A.$('#walkItemName').textContent = item.name;
    A.$('#walkProgress').textContent = `Item ${walk.index + 1} of ${walk.entries.length}`;
    A.$('#walkUnit').innerHTML = (entry.allowedCountUnits || [item.baseUnit]).map(unit => `<option value="${A.escapeAttr(unit)}">${A.escapeHtml(unit)}</option>`).join('');
    A.$('#walkQty').value = existing?.enteredQty ?? '';
    A.$('#walkUnit').value = existing?.enteredUnit || entry.preferredCountUnit || item.baseUnit;
    A.$('#walkGhost').textContent = comparison ? `Reference: ${A.qty(comparison.enteredQty)} ${comparison.enteredUnit}` : 'Reference: —';
    A.$('#walkNote').value = '';
    A.$('#btnPrevItem').disabled = walk.index === 0;
    A.$('#btnNextItem').textContent = walk.index === walk.entries.length - 1 ? 'Save and Finish' : 'Save and Next';
    walk.previousQty = comparison?.enteredQty ?? null;
    walk.previousUnit = comparison?.enteredUnit || A.$('#walkUnit').value;
    setTimeout(() => { A.$('#walkQty')?.focus?.(); A.$('#walkQty')?.select?.(); }, 0);
  }

  function persistWalk() {
    const walk = A.state.walk;
    const period = A.currentPeriod();
    if (!walk || !period) return true;
    const location = A.db.kitchen.locations.find(candidate => candidate.id === walk.locationId);
    const section = location?.sections?.find(candidate => candidate.id === walk.sectionId);
    const entry = walk.entries?.[walk.index];
    const item = A.db.items.find(candidate => candidate.id === entry?.itemId);
    if (!location || !section || !entry || !item) return false;
    const beforeDb = A.clone(A.db);
    const beforeState = stateCopy();
    const raw = A.$('#walkQty').value.trim();
    const records = period.inventoryCounts[walk.phase] || (period.inventoryCounts[walk.phase] = []);
    period.inventoryCounts[walk.phase] = records.filter(record => !(record.itemId === item.id && record.locationId === location.id && record.sectionId === section.id));
    if (raw !== '') {
      const result = C.normalizeCountRecord({ item, enteredQty: raw, enteredUnit: A.$('#walkUnit').value, baseUnitCost: item.defaultBaseUnitCost, locationId: location.id, sectionId: section.id });
      if (!result.ok) {
        A.db = beforeDb;
        restoreState(beforeState);
        A.$('#walkQty').classList.add('invalid');
        A.notify(result.error, 'error');
        return false;
      }
      result.record.countPhase = walk.phase;
      period.inventoryCounts[walk.phase].push(result.record);
    }
    period.updatedAt = C.nowISO();
    if (!persistMutation(beforeDb, beforeState)) return false;
    A.$('#walkQty').classList.remove('invalid');
    return true;
  }

  function startWalk() {
    if (!A.requireOpen('count inventory')) return;
    const location = A.currentLocation();
    const section = A.currentSection();
    const period = A.currentPeriod();
    if (!location || !section || !period || !(section.itemEntries || []).length) return;
    A.state.walk = {
      locationId: location.id,
      sectionId: section.id,
      entries: [...section.itemEntries].sort((a, b) => a.sortOrder - b.sortOrder),
      index: 0,
      phase: preferredWalkPhase(period, location, section)
    };
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
    const walk = A.state.walk;
    const location = A.db.kitchen.locations.find(candidate => candidate.id === walk?.locationId);
    const section = location?.sections?.find(candidate => candidate.id === walk?.sectionId);
    const beforeDb = A.clone(A.db);
    const beforeState = stateCopy();
    A.db.findings.unshift({ id: C.uid('finding'), periodId: A.state.periodId, createdAt: C.nowISO(), locationName: location?.name || '', sectionName: section?.name || '', text, status: 'open' });
    if (!persistMutation(beforeDb, beforeState)) return;
    A.$('#walkNote').value = '';
    A.notify('Finding saved.', 'success');
  }

  const transactionalClickIds = new Set([
    'btnSavePeriodSetup', 'btnQuickAddItem', 'btnNewLocation', 'btnNewSection', 'btnAddItemToSection',
    'deleteItem', 'saveInvoiceLine', 'deleteInvoiceLine', 'applyPasteRows',
    'btnNewInvoice', 'btnDuplicateInvoice', 'btnDeleteInvoice', 'btnNewPortionRecipe', 'btnNewBatchRecipe',
    'saveRecipeLine', 'deleteRecipeLine', 'btnClearFindings', 'btnSaveSettings', 'btnSaveFinding'
  ]);

  document.addEventListener('click', event => {
    const target = event.target.closest?.('button, [data-invoice-line-id]');
    if (!target) return;
    const invoice = A.currentInvoice?.();

    if (target.id === 'btnTogglePeriodLock') {
      stop(event);
      safeTogglePeriodLock();
      return;
    }
    if (target.id === 'btnPostInvoice' && invoice?.status === 'posted') {
      stop(event);
      A.notify('This invoice is already posted. Return it to draft before posting again.', 'warning');
      return;
    }
    if (target.id === 'btnStartWalk') {
      stop(event);
      startWalk();
      return;
    }
    if (target.id === 'btnCloseWalk') {
      stop(event);
      closeWalk(true);
      return;
    }
    if (target.id === 'btnZero') {
      stop(event);
      A.$('#walkQty').value = '0';
      persistWalk();
      return;
    }
    if (target.id === 'btnSameAsLast') {
      stop(event);
      if (A.state.walk?.previousQty == null) return;
      A.$('#walkQty').value = A.state.walk.previousQty;
      A.$('#walkUnit').value = A.state.walk.previousUnit;
      persistWalk();
      return;
    }
    if (target.id === 'btnPrevItem') {
      stop(event);
      if (persistWalk()) {
        A.state.walk.index = Math.max(0, A.state.walk.index - 1);
        renderWalk();
      }
      return;
    }
    if (target.id === 'btnNextItem') {
      stop(event);
      if (!persistWalk()) return;
      if (A.state.walk.index === A.state.walk.entries.length - 1) {
        const phaseLabel = A.state.walk.phase === 'beginning' ? 'Opening' : 'Ending';
        closeWalk(false);
        A.notify(`${phaseLabel} walk count complete.`, 'success');
      } else {
        A.state.walk.index += 1;
        renderWalk();
      }
      return;
    }
    if (target.id === 'btnWalkSaveFinding') {
      stop(event);
      saveWalkFinding();
      return;
    }
    if (transactionalClickIds.has(target.id)) beginEventTransaction();
  }, true);

  document.addEventListener('change', event => {
    if (event.target.id === 'walkPhase' && A.state.walk) {
      stop(event);
      if (!persistWalk()) return;
      A.state.walk.phase = event.target.value === 'beginning' ? 'beginning' : 'ending';
      renderWalk();
    }
  }, true);

  document.addEventListener('keydown', event => {
    if (event.target.id === 'sectionItemSearch' && event.key === 'Enter') beginEventTransaction();
  }, true);

  A.finalIntegrity = {
    safeTogglePeriodLock,
    startWalk,
    renderWalk,
    persistWalk,
    closeWalk,
    laterLockedPeriods,
    currentRoutes,
    beginEventTransaction
  };

  decorateRenderedControls();
  return C;
});
