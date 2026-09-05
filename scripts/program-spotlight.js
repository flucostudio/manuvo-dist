/*!
 * Program spotlight — swaps between the phone slider, the tablet slider and
 * the desktop scroll section depending on the device.
 * Replaces: the spotlight part of program-sliders.js
 * Requires: shared/fluco-core.js, Swiper
 *
 * Markup: .spotlight-slider (phone), .spotlight-slider-tablet (tablet),
 *         .swipe-section-wrapper (desktop), plus the two pagination nodes.
 *
 * The choice is made by PLATFORM, not by viewport width: an iPad in
 * landscape is 1366px wide but must still get the tablet slider, while a
 * narrow desktop window gets the phone one. Hence F.device.type().
 */
(function (window, document) {
  'use strict';

  var F = window.Fluco;
  if (!F) {
    console.error('[program-spotlight] Fluco core is missing. Load shared/fluco-core.js first.');
    return;
  }

  var PHONE = '.spotlight-slider';
  var TABLET = '.spotlight-slider-tablet';
  var DESKTOP = '.swipe-section-wrapper';
  var WIDE = 991;
  var RESIZE_WAIT = 250;

  var CSS =
    '.swiper-slide{user-select:none;}' +
    '.swiper-pagination-bullets{width:auto !important;}' +
    '.swiper-pagination-bullet{background-color:rgba(30,30,30,0.38) !important;' +
      'opacity:1 !important;box-shadow:none !important;margin:0 6px !important;}' +
    '.swiper-pagination-bullet-active{background-color:#fff !important;}' +
    '.spotlight-slide-top img{user-select:none;-webkit-user-drag:none;user-drag:none;}' +
    '.spotlight-slider-tablet .panel-images-tablet{z-index:10 !important;pointer-events:none !important;}' +
    '.spotlight-slider-pagination-tablet{width:50vw !important;left:auto !important;top:auto !important;' +
      'right:0 !important;bottom:var(--sizes--desktop--80px) !important;' +
      'display:flex !important;justify-content:center !important;}';

  var VARIANTS = {
    phone: {
      selector: PHONE,
      params: {
        slidesPerView: 1,
        loop: true,
        direction: 'horizontal',
        pagination: { el: '.spotlight-slider-pagination', clickable: true }
      }
    },
    tablet: {
      selector: TABLET,
      params: {
        slidesPerView: 1,
        loop: true,
        direction: 'horizontal',
        spaceBetween: 0,
        pagination: { el: '.spotlight-slider-pagination-tablet', clickable: true }
      }
    }
  };

  /** Which of phone / tablet / desktop this device should get. */
  function pick() {
    var type = F.device.type();
    var wide = window.innerWidth > WIDE;
    if (type === 'tablet' && wide) return 'tablet';
    if (type === 'desktop' && wide) return 'desktop';
    return 'phone';
  }

  function show(el, value) {
    if (el) el.style.display = value;
  }

  function Spotlight(Swiper) {
    this.Swiper = Swiper;
    this.swiper = null;
    this.mode = null;
    this.offs = [];

    var self = this;
    this.apply();

    var lastWidth = window.innerWidth;
    this.offs.push(
      F.on(window, 'resize', F.debounce(function () {
        // Ignore height-only changes: mobile browsers fire resize when the
        // URL bar hides, and rebuilding the slider there loses the position.
        if (window.innerWidth === lastWidth) return;
        lastWidth = window.innerWidth;
        self.apply();
      }, RESIZE_WAIT))
    );
  }

  /** Webflow hides CMS-conditional slides; Swiper would still count them. */
  Spotlight.prototype.dropHiddenSlides = function (root) {
    F.dom.qsa('.swiper-slide', root).forEach(function (slide) {
      if (window.getComputedStyle(slide).display === 'none') slide.remove();
    });
  };

  Spotlight.prototype.apply = function () {
    var mode = pick();
    if (mode === this.mode) return;
    this.teardown();
    this.mode = mode;

    var tablet = F.dom.qs(TABLET);
    var desktop = F.dom.qs(DESKTOP);

    if (mode === 'desktop') {
      show(tablet, 'none');
      show(desktop, 'flex');
    } else if (mode === 'tablet') {
      show(tablet, 'flex');
      show(desktop, 'none');
      this.build(VARIANTS.tablet);
    } else {
      show(tablet, 'none');
      show(desktop, 'none');
      this.build(VARIANTS.phone);
    }
    F.log('[program-spotlight] mode:', mode);
  };

  Spotlight.prototype.build = function (variant) {
    var root = F.dom.qs(variant.selector);
    if (!root) return;
    this.dropHiddenSlides(root);
    this.swiper = new this.Swiper(root, variant.params);
  };

  Spotlight.prototype.teardown = function () {
    if (!this.swiper) return;
    this.swiper.destroy(true, true);
    this.swiper = null;
  };

  Spotlight.prototype.destroy = function () {
    this.offs.forEach(function (off) {
      off();
    });
    this.offs = [];
    this.teardown();
    this.mode = null;
  };

  F.ready(function () {
    if (!F.dom.qs(PHONE) && !F.dom.qs(TABLET) && !F.dom.qs(DESKTOP)) return;
    if (!window.Swiper) {
      F.error('[program-spotlight] Swiper is required but was not loaded.');
      return;
    }
    F.css('program-spotlight', CSS);
    window.Fluco.programSpotlight = new Spotlight(window.Swiper);
  }, 'program-spotlight');
})(window, document);
