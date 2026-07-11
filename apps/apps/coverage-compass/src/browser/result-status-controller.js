/* First-class result-status UI controller.
   Owns readiness presentation on the result screen without owning scoring,
   report gating, or assessment state. */
(function installCoverageCompassResultStatus(root) {
  'use strict';

  if (root.CoverageCompassResultStatus?.installed) return;

  const STATUS_BOX_ID = 'assessmentReadinessStatus';
  const STYLE_ID = 'coverageCompassResultStatusStyles';
  const EYEBROWS = Object.freeze({
    complete: 'Your Coverage Compass Result',
    'enrollment-review': 'Enrollment status review',
    'calculation-error': 'Calculation incomplete',
    default: 'Your current directional result'
  });

  function currentReadiness() {
    const reports = root.CoverageCompassReports;
    if (reports && typeof reports.reportReadinessStatus === 'function') {
      return reports.reportReadinessStatus();
    }
    if (root.CoverageCompassCore && typeof root.CoverageCompassCore.currentReadiness === 'function') {
      return root.CoverageCompassCore.currentReadiness();
    }
    return null;
  }

  function eyebrowFor(status) {
    return EYEBROWS[status] || EYEBROWS.default;
  }

  function progressSummary(readiness = {}) {
    const answered = Number.isFinite(readiness.answeredCount) ? readiness.answeredCount : 0;
    const total = Number.isFinite(readiness.totalQuestions) ? readiness.totalQuestions : 0;
    const minimum = Number.isFinite(readiness.minimumAnswersRequired) ? readiness.minimumAnswersRequired : 0;
    return `${answered} of ${total} questions answered; minimum ${minimum} plus all critical domains for a final packet.`;
  }

  function ensureStyles() {
    const document = root.document;
    if (!document || document.getElementById(STYLE_ID)) return false;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .assessmentReadinessStatus{margin:14px 0;padding:14px;border:1px solid rgba(155,209,255,.32);border-radius:12px;background:rgba(15,23,42,.72)}
      .assessmentReadinessStatus strong{display:block;margin-bottom:6px}
      .assessmentReadinessStatus ul{margin:8px 0 0;padding-left:20px}
    `;
    document.head.appendChild(style);
    return true;
  }

  function ensureStatusBox() {
    const document = root.document;
    if (!document) return null;
    const existing = document.getElementById(STATUS_BOX_ID);
    if (existing) return existing;

    const legacy = document.getElementById('hardeningReadiness');
    if (legacy) {
      legacy.id = STATUS_BOX_ID;
      legacy.className = 'assessmentReadinessStatus';
      return legacy;
    }

    const cta = document.getElementById('reportCtaBox');
    if (!cta || !cta.parentNode) return null;
    const box = document.createElement('div');
    box.id = STATUS_BOX_ID;
    box.className = 'assessmentReadinessStatus';
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'polite');
    cta.parentNode.insertBefore(box, cta);
    return box;
  }

  function render(readiness = currentReadiness()) {
    const document = root.document;
    if (!document || !readiness) return false;
    ensureStyles();

    const eyebrow = document.querySelector('#screenResult .resultHero .eyebrow');
    const title = document.getElementById('resHeroTitle');
    const confidence = document.getElementById('resHeroConfidence');

    if (eyebrow) eyebrow.textContent = eyebrowFor(readiness.status);
    if (title && readiness.status === 'calculation-error') {
      title.textContent = 'Coverage Compass could not calculate a reliable result';
    }
    if (confidence) {
      const base = confidence.textContent.split(' · ')[0];
      confidence.textContent = `${base} · ${readiness.label || readiness.status || 'Assessment status unavailable'}`;
    }

    const box = ensureStatusBox();
    if (!box) return false;
    box.dataset.status = readiness.status || 'unknown';
    box.replaceChildren();

    const heading = document.createElement('strong');
    heading.textContent = readiness.label || 'Assessment status unavailable';
    box.appendChild(heading);

    const summary = document.createElement('span');
    summary.textContent = progressSummary(readiness);
    box.appendChild(summary);

    const missing = Array.isArray(readiness.missingCoreItems) ? readiness.missingCoreItems : [];
    if (missing.length) {
      const list = document.createElement('ul');
      missing.forEach((item) => {
        const entry = document.createElement('li');
        entry.textContent = String(item);
        list.appendChild(entry);
      });
      box.appendChild(list);
    }

    if (root.CoverageCompassCore && typeof root.CoverageCompassCore.renderMissingNavigation === 'function') {
      root.CoverageCompassCore.renderMissingNavigation();
    }
    return true;
  }

  function wrapResultRenderer() {
    const renderer = root.renderResults;
    if (typeof renderer !== 'function' || renderer.__resultStatusControllerWrapped) return false;
    function resultStatusRenderWrapper() {
      const result = renderer.apply(this, arguments);
      render();
      return result;
    }
    resultStatusRenderWrapper.__resultStatusControllerWrapped = true;
    resultStatusRenderWrapper.__wrappedRenderer = renderer;
    root.renderResults = resultStatusRenderWrapper;
    return true;
  }

  function installUi() {
    ensureStyles();
    wrapResultRenderer();
    const resultScreen = root.document?.getElementById('screenResult');
    if (resultScreen && !resultScreen.classList.contains('hidden')) render();
  }

  root.CoverageCompassResultStatus = Object.freeze({
    installed: true,
    STATUS_BOX_ID,
    eyebrowFor,
    progressSummary,
    currentReadiness,
    ensureStatusBox,
    render,
    wrapResultRenderer
  });

  if (root.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', installUi, { once: true });
    else installUi();
  }
})(window);
