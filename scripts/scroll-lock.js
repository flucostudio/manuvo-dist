/*!
 * Scroll lock — freezes page scroll while a slider overlay or modal is open.
 * Replaces: scroll-lock.js
 * Requires: shared/fluco-core.js
 *
 * Markup: any of the containers below; the script watches their `style` and
 * `class` attributes and locks `<body>` while at least one is displayed.
 *   .awards-slider-wrapper, .team-slider-wrapper,
 *   .inspiring-change-slider-wrapper, .sc-modal
 * Add more with `data-fluco-scroll-lock` on the container.
 */
(function (window, document) {
  'use strict';

  var F = window.Fluco;
  if (!F) {
    console.error('[scroll-lock] Fluco core is missing. Load shared/fluco-core.js first.');
    return;
  }

  var SELECTOR =
    '.awards-slider-wrapper, .team-slider-wrapper, .inspiring-change-slider-wrapper, ' +
    '.sc-modal, [data-fluco-scroll-lock]';

  function ScrollLock(elements) {
    this.elements = elements;
    this.locked = false;
    // Remember what the page had, so unlocking restores rather than clears:
    // another component (the navbar menu) may own `overflow` at that moment.
    this.previousOverflow = null;
    this.update = this.update.bind(this);
    this.observer = new MutationObserver(this.update);

    var self = this;
    this.elements.forEach(function (el) {
      self.observer.observe(el, { attributes: true, attributeFilter: ['style', 'class'] });
    });

    // The original never ran an initial pass, so a container already open at
    // load (or reopened without an attribute change) left the page scrollable.
    this.update();
  }

  ScrollLock.prototype.isOpen = function (el) {
    return window.getComputedStyle(el).display !== 'none';
  };

  ScrollLock.prototype.update = function () {
    var anyOpen = this.elements.some(this.isOpen, this);
    if (anyOpen === this.locked) return;
    this.locked = anyOpen;
    if (anyOpen) {
      this.previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = this.previousOverflow || '';
      this.previousOverflow = null;
    }
    F.log('[scroll-lock]', anyOpen ? 'locked' : 'released');
  };

  ScrollLock.prototype.destroy = function () {
    this.observer.disconnect();
    if (this.locked) {
      document.body.style.overflow = this.previousOverflow || '';
      this.locked = false;
    }
  };

  F.ready(function () {
    var elements = F.dom.qsa(SELECTOR);
    if (!elements.length) return;
    window.Fluco.scrollLock = new ScrollLock(elements);
  }, 'scroll-lock');
})(window, document);
