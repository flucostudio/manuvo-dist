/*!
 * Footer year — writes the current year into `#copyright-year`.
 * Extracted from navbar.js so the navbar script no longer throws on pages
 * without a footer. Requires: shared/fluco-core.js
 */
(function (window, document) {
  'use strict';

  var F = window.Fluco;
  if (!F) return;

  F.ready(function () {
    F.dom.qsa('#copyright-year, [data-fluco-year]').forEach(function (node) {
      node.textContent = String(new Date().getFullYear());
    });
  }, 'footer-year');
})(window, document);
