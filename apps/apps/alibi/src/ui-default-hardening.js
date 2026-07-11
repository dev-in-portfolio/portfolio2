(() => {
  'use strict';
  const A = window.AlibiApp;
  if (!A) throw new Error('Alibi must initialize before UI default hardening.');

  document.addEventListener('click', event => {
    const button = event.target.closest?.('#btnAddInvoiceLine');
    if (!button || A.currentInvoice()?.status === 'posted') return;
    setTimeout(() => {
      const cost = A.$('#lineUnitCost');
      if (!cost || cost.value !== '0') return;
      cost.value = '';
      cost.dispatchEvent(new Event('input', { bubbles: true }));
      cost.setAttribute('placeholder', 'Required; enter 0 explicitly when correct');
    }, 0);
  }, true);
})();
