const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

function isVisible(element) {
  if (!element || typeof element.getBoundingClientRect !== 'function') return false;
  const rect = element.getBoundingClientRect();
  const style = element.ownerDocument?.defaultView?.getComputedStyle?.(element);
  return rect.width > 0 && rect.height > 0 && style?.visibility !== 'hidden' && style?.display !== 'none';
}

function focusableElements(modal) {
  return [...modal.querySelectorAll(FOCUSABLE_SELECTOR)].filter(isVisible);
}

function visibleModal(document) {
  return [...document.querySelectorAll('.modal[role="dialog"]')].find(isVisible) || null;
}

function prepareScrollableRegions(document) {
  const disclosure = document.getElementById('discBox');
  if (disclosure) {
    disclosure.tabIndex = 0;
    disclosure.setAttribute('role', 'region');
    disclosure.setAttribute('aria-label', 'Coverage Compass disclosures');
  }
}

export function installModalAccessibility(root = globalThis) {
  const document = root.document;
  if (!document || document.__coverageCompassModalA11yInstalled) return false;
  document.__coverageCompassModalA11yInstalled = true;
  prepareScrollableRegions(document);

  let activeModal = null;
  let returnFocus = null;

  function activate(modal) {
    if (!modal || modal === activeModal) return;
    activeModal = modal;
    returnFocus = document.activeElement && document.activeElement !== document.body
      ? document.activeElement
      : returnFocus;
    modal.setAttribute('aria-hidden', 'false');
    if (!modal.hasAttribute('tabindex')) modal.setAttribute('tabindex', '-1');
    const first = focusableElements(modal)[0] || modal;
    queueMicrotask(() => first.focus({ preventScroll: true }));
  }

  function deactivate(modal) {
    if (!modal || modal !== activeModal) return;
    modal.setAttribute('aria-hidden', 'true');
    activeModal = null;
    const target = returnFocus;
    returnFocus = null;
    if (target && target.isConnected && typeof target.focus === 'function') {
      queueMicrotask(() => target.focus({ preventScroll: true }));
    }
  }

  function sync() {
    const next = visibleModal(document);
    if (activeModal && activeModal !== next) deactivate(activeModal);
    if (next) activate(next);
  }

  function onKeyDown(event) {
    if (!activeModal) return;
    if (event.key === 'Escape') {
      const close = activeModal.querySelector('[id^="btnClose"], [data-modal-close]');
      if (close) {
        event.preventDefault();
        close.click();
      }
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = focusableElements(activeModal);
    if (!focusable.length) {
      event.preventDefault();
      activeModal.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const current = document.activeElement;
    if (event.shiftKey && (current === first || !activeModal.contains(current))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && current === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const observer = new MutationObserver(sync);
  document.querySelectorAll('.modal[role="dialog"]').forEach((modal) => {
    modal.setAttribute('aria-hidden', isVisible(modal) ? 'false' : 'true');
    observer.observe(modal, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
  });
  document.addEventListener('keydown', onKeyDown, true);
  sync();

  return Object.freeze({
    sync,
    prepareScrollableRegions: () => prepareScrollableRegions(document),
    disconnect: () => {
      observer.disconnect();
      document.removeEventListener('keydown', onKeyDown, true);
      document.__coverageCompassModalA11yInstalled = false;
    }
  });
}

if (typeof window !== 'undefined') {
  if (window.document?.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => installModalAccessibility(window), { once: true });
  } else {
    installModalAccessibility(window);
  }
}
