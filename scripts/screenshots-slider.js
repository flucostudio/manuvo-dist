/*!
 * Screenshots Slider — Swiper carousel for portfolio screenshots plus the
 * "hide empty gallery cells" cleanup.
 * Replaces: dynamic-screenshots.js
 * Requires: shared/fluco-core.js, Swiper (window.Swiper)
 *
 * Markup: `.swiper[data-fluco-slider-layout="Vertical — Phone"]`
 */
(function (window, document) {
  'use strict';

  var F = window.Fluco;
  if (!F) {
    console.error('[screenshots-slider] Fluco core is missing. Load shared/fluco-core.js first.');
    return;
  }

  // slidesPerView per layout: [mobile, tablet, desktop]
  var LAYOUTS = {
    'Vertical — Tablet': [2, 3, 3],
    'Vertical — Phone': [3, 3, 4],
    'Horizontal — Tablet': [2, 2, 2],
    'Horizontal — Phone': [2, 2, 2]
  };
  var FALLBACK = [2, 2, 2];

  function normalise(name) {
    // CMS editors type "-", "–" or "—"; treat them all the same.
    return String(name || '')
      .replace(/\s*[-–—]\s*/g, ' — ')
      .trim();
  }

  function initSlider() {
    var root = F.dom.qs('.swiper');
    if (!root) return null;
    if (typeof window.Swiper !== 'function') {
      F.error('[screenshots-slider] Swiper is not loaded.');
      return null;
    }

    var layout = LAYOUTS[normalise(root.dataset.flucoSliderLayout)] || FALLBACK;

    // Swiper handles breakpoints itself; no destroy/recreate on resize.
    return new window.Swiper(root, {
      direction: 'horizontal',
      initialSlide: 0,
      slidesPerView: layout[0],
      breakpoints: {
        768: { slidesPerView: layout[1] },
        992: { slidesPerView: layout[2] }
      }
    });
  }

  function hideEmptyGalleryItems() {
    var gallery = F.dom.qs('.portfolio-temp-gallery');
    if (!gallery) return;
    var grids = F.dom.qsa('.portfolio-temp-gallery-grid', gallery);
    var hidden = 0;

    grids.forEach(function (grid) {
      var video = grid.querySelector('.portfolio-trailer-video');
      var image = grid.querySelector('.portfolio-temp-pic');
      var videoEmpty = !video || !F.dom.isVisible(video);
      var imageEmpty = !image || !F.dom.isVisible(image);
      if (videoEmpty && imageEmpty) {
        grid.style.display = 'none';
        hidden++;
      }
    });

    if (grids.length && hidden === grids.length) gallery.style.display = 'none';
  }

  F.css(
    'screenshots-slider',
    ['.swiper-slide{-webkit-transform:translateZ(0);-webkit-backface-visibility:hidden}', '.swiper{overflow:visible!important}'].join('\n')
  );

  F.ready(function () {
    window.Fluco.screenshotsSlider = initSlider();
    hideEmptyGalleryItems();
  }, 'screenshots-slider');
})(window, document);
