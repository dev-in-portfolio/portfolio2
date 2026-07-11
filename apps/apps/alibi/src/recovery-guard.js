(() => {
  'use strict';
  const A = window.AlibiApp;
  const C = A?.C;
  if (!A || !C) throw new Error('Alibi state must load before recovery guard.');

  let rawText;
  try {
    rawText = localStorage.getItem(A.STORAGE_KEY);
  } catch (_) {
    return;
  }
  if (!rawText) return;

  let rejected = false;
  let reason = '';
  try {
    const parsed = JSON.parse(rawText);
    const candidate = C.migrateDatabase(parsed);
    const validation = C.validateDatabase(candidate);
    if (!validation.ok) {
      rejected = true;
      reason = validation.errors.join(' ');
    }
  } catch (error) {
    rejected = true;
    reason = error.message;
  }
  if (!rejected) return;

  const backupKey = `alibi_rejected_storage_${Date.now()}`;
  try { localStorage.setItem(backupKey, rawText); } catch (_) {}
  A.state.recoveryMode = true;
  A.state.recoveryDatabase = A.db;
  A.state.recoveryBackupKey = backupKey;
  const originalSave = A.save;
  let noticeShown = false;

  A.save = () => {
    const replacingRecoveryDatabase = A.state.recoveryMode && A.db !== A.state.recoveryDatabase;
    if (A.state.recoveryMode && !replacingRecoveryDatabase) {
      A.setSaveStatus('failed', 'Recovery mode');
      if (!noticeShown) {
        noticeShown = true;
        A.notify(`Stored data was rejected and preserved as ${backupKey}. Import a valid backup or reset data before saving. ${reason}`, 'error', true);
      }
      return { ok: false, error: new Error('Recovery mode prevents overwriting rejected stored data.') };
    }
    const result = originalSave();
    if (result.ok && replacingRecoveryDatabase) {
      A.state.recoveryMode = false;
      A.state.recoveryDatabase = null;
      A.state.recoveryBackupKey = null;
      A.notify('Recovery mode cleared after a valid replacement database was saved.', 'success');
    }
    return result;
  };

  A.setSaveStatus('failed', 'Recovery mode');
  A.notify(`Stored data was rejected and preserved as ${backupKey}. The original storage key will not be overwritten until you import a valid backup or reset data.`, 'error', true);
})();
