/*!
 * Accordions — one-open-at-a-time expandable items.
 * Replaces: accordions.js
 * Requires: shared/fluco-core.js, GSAP
 *
 * Markup:
 *   <div class="accordion-item">
 *     <div class="accordion-toggle">
 *       <div class="accordion-item-icon show"></div>
 *       <div class="accordion-item-icon close"></div>
 *     </div>
 *     <div class="accordion-item-content"><div class="accordion-grid">…</div></div>
 *   </div>
 */
(function (window, document) {
  'use strict';

  var F = window.Fluco;
  if (!F) {
    console.error('[accordions] Fluco core is missing. Load shared/fluco-core.js first.');
    return;
  }

  var ITEM = '.accordion-item';
  var TOGGLE = '.accordion-toggle';
  var CONTENT = '.accordion-item-content';
  var GRID = '.accordion-grid';
  var ICON_OPEN = '.accordion-item-icon.show';
  var ICON_CLOSE = '.accordion-item-icon.close';

  // Original used a bare 480 rather than a Webflow breakpoint; kept as is so
  // the layout does not shift by a pixel at the boundary.
  var VW_UNITS_ABOVE = 480;
  var OPEN_MARGIN_PX = 60;
  var DURATION = 0.5;
  var EASE = 'power3.out';

  var CSS =
    '.accordion-item-content{overflow:hidden;}' +
    '.accordion-item-content-rich h1,.accordion-item-content-rich h2,' +
    '.accordion-item-content-rich h3,.accordion-item-content-rich h4,' +
    '.accordion-item-content-rich h5,.accordion-item-content-rich h6{margin-top:0;}';

  function useVw() {
    return window.innerWidth > VW_UNITS_ABOVE;
  }

  function Accordions(items, gsap) {
    var self = this;
    this.gsap = gsap;
    this.offs = [];
    this.items = [];

    items.forEach(function (item) {
      var toggle = F.dom.qs(TOGGLE, item);
      var content = F.dom.qs(CONTENT, item);
      if (!toggle || !content) return;
      self.items.push({ item: item, toggle: toggle, content: content, open: false });
    });
    if (!this.items.length) return;

    F.css('accordions', CSS);
    this.items.forEach(function (entry, index) {
      self.gsap.set(entry.content, { height: '0vw', marginTop: useVw() ? '0vw' : '0px' });
      entry.toggle.setAttribute('aria-expanded', 'false');
      self.offs.push(
        F.on(entry.toggle, 'click', function () {
          self.toggle(index);
        })
      );
    });

    // Debounced: the original recomputed on every resize event.
    this.offs.push(
      F.onResize(function () {
        self.items.forEach(function (entry) {
          if (entry.open) self.animateOpen(entry);
        });
      })
    );
  }

  /** Height the content needs, in the unit used at this viewport width. */
  Accordions.prototype.openHeight = function (entry) {
    var grid = F.dom.qs(GRID, entry.content);
    var height = grid ? grid.scrollHeight : entry.content.scrollHeight;
    return useVw() ? F.units.vw(height) : height;
  };

  Accordions.prototype.animateOpen = function (entry) {
    this.gsap.to(entry.content, {
      height: this.openHeight(entry),
      marginTop: useVw() ? F.units.vw(OPEN_MARGIN_PX) : '0px',
      opacity: 1,
      duration: DURATION,
      ease: EASE
    });
  };

  Accordions.prototype.animateClose = function (entry) {
    this.gsap.to(entry.content, {
      height: '0vw',
      marginTop: useVw() ? '0vw' : '0px',
      opacity: 0,
      duration: DURATION,
      ease: EASE
    });
  };

  Accordions.prototype.setIcon = function (entry, open) {
    F.dom.qsa(ICON_OPEN, entry.toggle).forEach(function (icon) {
      icon.style.display = open ? 'none' : 'block';
    });
    F.dom.qsa(ICON_CLOSE, entry.toggle).forEach(function (icon) {
      icon.style.display = open ? 'block' : 'none';
    });
    entry.toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  Accordions.prototype.setOpen = function (entry, open) {
    entry.open = open;
    if (open) this.animateOpen(entry);
    else this.animateClose(entry);
    this.setIcon(entry, open);
  };

  Accordions.prototype.toggle = function (index) {
    var self = this;
    var target = this.items[index];
    if (!target.open) {
      this.items.forEach(function (entry, i) {
        if (i !== index && entry.open) self.setOpen(entry, false);
      });
    }
    this.setOpen(target, !target.open);
  };

  Accordions.prototype.closeAll = function () {
    var self = this;
    this.items.forEach(function (entry) {
      if (entry.open) self.setOpen(entry, false);
    });
  };

  Accordions.prototype.destroy = function () {
    this.offs.forEach(function (off) {
      off();
    });
    this.offs = [];
    var gsap = this.gsap;
    this.items.forEach(function (entry) {
      gsap.killTweensOf(entry.content);
      gsap.set(entry.content, { clearProps: 'height,marginTop,opacity' });
    });
    this.items = [];
  };

  F.ready(function () {
    var items = F.dom.qsa(ITEM);
    if (!items.length) return;
    if (!window.gsap) {
      F.error('[accordions] GSAP is required but was not loaded.');
      return;
    }
    window.Fluco.accordions = new Accordions(items, window.gsap);
  }, 'accordions');
})(window, document);
