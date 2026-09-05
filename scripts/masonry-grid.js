/*!
 * Masonry Grid — CSS-grid masonry via `grid-row-end: span N`.
 * Replaces: masonry-grid/main.js
 * Requires: shared/fluco-core.js
 *
 * Markup:
 *   .portfolio-temp-summary-grid  { display:grid; grid-auto-rows:<unit>; row-gap:<gap> }
 *     .portfolio-temp-summary-tile
 *       .portfolio-temp-summary-label     (optional)
 *       .portfolio-temp-summary-content
 * Re-spans on resize and whenever a tile's content changes size
 * (fonts loading, images, CMS render).
 */
(function (window, document) {
  'use strict';

  var F = window.Fluco;
  if (!F) {
    console.error('[masonry-grid] Fluco core is missing. Load shared/fluco-core.js first.');
    return;
  }

  var GRID = '.portfolio-temp-summary-grid';
  var TILE = '.portfolio-temp-summary-tile';
  var CONTENT = '.portfolio-temp-summary-content';
  var LABEL = '.portfolio-temp-summary-label';

  function Masonry(grid) {
    this.grid = grid;
    this.tiles = F.dom.visible(grid.querySelectorAll(TILE));
    this.layout = this.layout.bind(this);
    this.offs = [];

    this.layout();
    this.offs.push(F.onResize(this.layout, 100));

    if ('ResizeObserver' in window) {
      var self = this;
      this.observer = new ResizeObserver(F.debounce(function () { self.layout(); }, 50));
      this.tiles.forEach(function (tile) {
        var content = tile.querySelector(CONTENT);
        if (content) self.observer.observe(content);
      });
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(this.layout);
  }

  Masonry.prototype.layout = function () {
    var style = getComputedStyle(this.grid);
    var rowGap = parseFloat(style.getPropertyValue('row-gap')) || parseFloat(style.getPropertyValue('grid-row-gap')) || 0;
    var rowHeight = parseFloat(style.getPropertyValue('grid-auto-rows')) || 0;
    if (!rowHeight) return;

    // Read everything first, then write, to avoid layout thrashing.
    var spans = this.tiles.map(function (tile) {
      var content = tile.querySelector(CONTENT);
      var label = tile.querySelector(LABEL);
      if (!content) return 1;
      var height = content.getBoundingClientRect().height + (label ? label.getBoundingClientRect().height : 0);
      return Math.max(1, Math.ceil((height + rowGap) / (rowHeight + rowGap)));
    });
    this.tiles.forEach(function (tile, i) {
      tile.style.gridRowEnd = 'span ' + spans[i];
    });
  };

  Masonry.prototype.destroy = function () {
    if (this.observer) this.observer.disconnect();
    this.offs.forEach(function (off) { off(); });
  };

  F.ready(function () {
    window.Fluco.masonry = F.dom.qsa(GRID).map(function (grid) {
      return new Masonry(grid);
    });
  }, 'masonry-grid');
})(window, document);
