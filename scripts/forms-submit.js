/*!
 * Forms Submit — lets a non-submit element (div/link styled as a button)
 * submit its parent form.
 * Replaces: forms-submit.js
 * Requires: shared/fluco-core.js
 *
 * Markup: any element with `.newsletter__form__btn` inside a <form>.
 * If the element already is an <input type="submit"> or <button>, nothing
 * is done: the browser handles it, and Webflow's own AJAX handler runs.
 */
(function (window, document) {
  'use strict';

  var F = window.Fluco;
  if (!F) {
    console.error('[forms-submit] Fluco core is missing. Load shared/fluco-core.js first.');
    return;
  }

  var SELECTOR = '.newsletter__form__btn, [data-fluco-submit]';

  function isNativeSubmit(node) {
    var tag = node.tagName;
    return (tag === 'INPUT' || tag === 'BUTTON') && (node.type === 'submit' || tag === 'BUTTON');
  }

  F.ready(function () {
    F.dom.qsa(SELECTOR).forEach(function (button) {
      var form = button.closest('form');
      if (!form || isNativeSubmit(button)) return;

      button.setAttribute('role', 'button');
      if (!button.hasAttribute('tabindex')) button.setAttribute('tabindex', '0');

      var submit = function (event) {
        event.preventDefault();
        // requestSubmit runs constraint validation and fires `submit`,
        // which Webflow's runtime intercepts. Fallback for old Safari.
        if (typeof form.requestSubmit === 'function') form.requestSubmit();
        else if (window.jQuery) window.jQuery(form).trigger('submit');
        else form.submit();
      };

      F.on(button, 'click', submit);
      F.on(button, 'keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') submit(event);
      });
    });
  }, 'forms-submit');
})(window, document);
