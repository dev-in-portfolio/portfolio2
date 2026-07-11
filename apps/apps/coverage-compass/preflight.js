/* Runs before the assessment engine. Coverage Compass no longer imports questionnaire
   answers from URL fragments because encoded fragments are not a secure sharing format. */
(function () {
  'use strict';
  try {
    if (window.location.hash && window.location.hash.length > 1) {
      sessionStorage.setItem('coverage_compass_blocked_import', '1');
      const cleanUrl = `${window.location.pathname}${window.location.search}`;
      window.history.replaceState(null, document.title, cleanUrl);
    }
  } catch (_) {
    // Do not block application startup if browser history APIs are unavailable.
  }
})();
