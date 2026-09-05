/*!
 * Sliders — horizontal Swiper carousels used across the site.
 * Replaces: slider.js (base class), courses-sliders.js, events-sliders.js,
 *           training-sliders.js, projects-sliders.js, members-slider.js,
 *           and the benefits slider from program-sliders.js
 * Requires: shared/fluco-core.js, Swiper
 *
 * The originals each shipped their own copy of the base class and of
 * pxToVw/vwToPx at top level, so loading two of them on one page threw
 * "Identifier has already been declared" and the second file never ran.
 * Everything here lives in one IIFE, and each carousel is one PRESETS entry.
 *
 * Markup: a Swiper container with the preset's class, e.g.
 *   <div class="courses-slider"><div class="swiper-wrapper">…</div></div>
 */
(function (window, document) {
  'use strict';

  var F = window.Fluco;
  if (!F) {
    console.error('[sliders] Fluco core is missing. Load shared/fluco-core.js first.');
    return;
  }

  var MOBILE_MAX = 767;
  var MOBILE_GAP_PX = 12;

  /** Shared chrome: hidden scrollbar, grab cursor, no text/image dragging. */
  function baseCss(scope) {
    return (
      scope + ' .swiper-wrapper{cursor:grab;}' +
      scope + ' .swiper-wrapper:active{cursor:grabbing;}' +
      scope + ' .swiper,' + scope + ' .desktop-scroll{' +
        '-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;}' +
      scope + ' .swiper img,' + scope + ' .desktop-scroll img{' +
        '-webkit-user-drag:none;user-drag:none;}'
    );
  }

  var SCROLL_CSS =
    '.desktop-scroll{overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none;}' +
    '.desktop-scroll::-webkit-scrollbar{display:none;}';

  // One entry per carousel. `gapVw` is the desktop gap; mobile always 12px.
  var PRESETS = [
    {
      name: 'courses',
      selector: '.courses-slider',
      gapVw: 1.875,
      css:
        '.courses-slider .swiper-wrapper{display:flex !important;flex-wrap:nowrap !important;}' +
        '.courses-slider .swiper-slide{scroll-snap-align:start;flex:0 0 auto;width:38.542vw !important;}' +
        baseCss('.courses-slider') +
        '@media (max-width:767px){.courses-slider .swiper-slide{width:100% !important;}}'
    },
    {
      name: 'events',
      selector: '.events-slider',
      gapVw: 1.875,
      css:
        '.events-slider .swiper-wrapper{display:flex !important;flex-wrap:nowrap !important;}' +
        '.events-slider .swiper-slide{scroll-snap-align:start;flex:0 0 auto;width:38.542vw !important;}' +
        baseCss('.events-slider') +
        '@media (max-width:767px){.events-slider .swiper-slide{width:100% !important;}}'
    },
    {
      name: 'freebies',
      // Swiper is initialised on the wrapper, while the CSS targets the inner
      // list — matches the original markup, do not "tidy" this.
      selector: '.freebies-slider-wrapper',
      gapVw: 2.778,
      css:
        '.freebies-slider{display:flex !important;flex-wrap:nowrap !important;}' +
        '.freebies-slider .swiper-slide{scroll-snap-align:start;flex:0 0 auto;width:36.667vw !important;}' +
        baseCss('.freebies-slider') +
        '@media (max-width:767px){.freebies-slider .swiper-slide{width:100% !important;}}'
    },
    {
      name: 'projects',
      selector: '.projects-slider',
      gapVw: 1.875,
      css:
        '.projects-slider .swiper-wrapper{display:flex !important;flex-wrap:nowrap !important;}' +
        '.projects-slider .swiper-wrapper > .swiper-slide{scroll-snap-align:start;flex:0 0 auto;width:30vw !important;}' +
        '.projects-slider .swiper-wrapper > .swiper-slide .created-by-manuvo-item-image-wrapper{height:auto;}' +
        baseCss('.projects-slider') +
        '@media (max-width:767px){.projects-slider .swiper-slide{width:100% !important;}}'
    },
    {
      name: 'created-by-manuvo',
      selector: '.created-by-manuvo-slider',
      gapVw: 1.875,
      css:
        '.created-by-manuvo-slider .swiper-wrapper{display:flex !important;flex-wrap:nowrap !important;}' +
        '.created-by-manuvo-slider .swiper-wrapper > .swiper-slide{scroll-snap-align:start;flex:0 0 auto;width:38.542vw !important;}' +
        '.created-by-manuvo-slider .swiper-wrapper > .swiper-slide .created-by-manuvo-item-image-wrapper{height:auto;}' +
        baseCss('.created-by-manuvo-slider') +
        '@media (max-width:767px){.created-by-manuvo-slider .swiper-slide{width:100% !important;}}'
    },
    {
      name: 'benefits',
      selector: '.program-benefits-slider',
      gapVw: 2.778,
      // Scoped to .desktop-scroll in the original rather than to the slider
      // class; kept that way so the existing markup keeps matching.
      css:
        '.desktop-scroll .swiper-wrapper{display:flex !important;flex-wrap:nowrap !important;' +
          'gap:2.778vw !important;}' +
        '.desktop-scroll .swiper-slide{scroll-snap-align:start;flex:0 0 auto;width:45% !important;}' +
        baseCss('.desktop-scroll')
    },
    {
      name: 'members',
      selector: '.members-slider',
      gapVw: 1.389,
      autoplayDelay: 6000,
      pauseOnHover: true,
      params: {
        loop: true,
        centeredSlides: true,
        pagination: { el: '.members-slider-pagination-wrapper', clickable: true }
      },
      css:
        '.members-slider .swiper-wrapper{display:flex !important;flex-wrap:nowrap !important;}' +
        '.members-slider .swiper-slide{flex:0 0 auto;width:30% !important;}' +
        baseCss('.members-slider') +
        '@media (max-width:767px){.members-slider .swiper-slide{width:100% !important;}}'
    }
  ];

  function isMobile() {
    return window.innerWidth <= MOBILE_MAX;
  }

  function gapPx(preset) {
    return isMobile() ? MOBILE_GAP_PX : F.units.vwToPx(preset.gapVw);
  }

  function Carousel(element, preset, Swiper) {
    var self = this;
    this.element = element;
    this.preset = preset;
    this.offs = [];

    var params = {
      slidesPerView: 'auto',
      loop: false,
      direction: 'horizontal',
      spaceBetween: gapPx(preset),
      centeredSlides: false,
      watchOverflow: true,
      mousewheel: { forceToAxis: true, onlyInViewport: true, invert: false }
    };
    if (preset.params) {
      Object.keys(preset.params).forEach(function (key) {
        params[key] = preset.params[key];
      });
    }
    if (preset.autoplayDelay) {
      params.autoplay = { delay: preset.autoplayDelay, disableOnInteraction: false };
    }

    this.swiper = new Swiper(element, params);

    // The gap is a vw value resolved to px, so it must be recomputed on
    // resize; the original attached an undebounced listener per slider.
    this.offs.push(
      F.onResize(function () {
        if (!self.swiper) return;
        self.swiper.params.spaceBetween = gapPx(preset);
        self.swiper.update();
      })
    );

    if (preset.pauseOnHover && this.swiper.autoplay) {
      this.offs.push(
        F.on(element, 'mouseenter', function () {
          self.swiper.autoplay.stop();
        })
      );
      this.offs.push(
        F.on(element, 'mouseleave', function () {
          self.swiper.autoplay.start();
        })
      );
      // Swiper occasionally reports autoplay as running before layout settles.
      this.autoplayTimer = window.setTimeout(function () {
        if (self.swiper && self.swiper.autoplay) self.swiper.autoplay.start();
      }, 100);
    }
  }

  Carousel.prototype.destroy = function () {
    this.offs.forEach(function (off) {
      off();
    });
    this.offs = [];
    window.clearTimeout(this.autoplayTimer);
    if (this.swiper) {
      this.swiper.destroy(true, true);
      this.swiper = null;
    }
    this.element.classList.remove('desktop-scroll');
  };

  F.ready(function () {
    var present = PRESETS.filter(function (preset) {
      return !!F.dom.qs(preset.selector);
    });
    if (!present.length) return;
    if (!window.Swiper) {
      F.error('[sliders] Swiper is required but was not loaded.');
      return;
    }

    F.css('sliders-scroll', SCROLL_CSS);
    window.Fluco.sliders = present.map(function (preset) {
      F.css('slider-' + preset.name, preset.css);
      return new Carousel(F.dom.qs(preset.selector), preset, window.Swiper);
    });
    F.log('[sliders] initialised:', present.map(function (p) { return p.name; }).join(', '));
  }, 'sliders');
})(window, document);
