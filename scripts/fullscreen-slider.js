/*!
 * Fullscreen slider — overlay gallery with paired text/image carousels.
 * Replaces: fullscreen-content-slider.js (About / Team / Awards variants)
 * Requires: shared/fluco-core.js, Swiper
 *
 * Two Swipers are linked through Swiper's controller so the caption and the
 * image always move together. The overlay opens from a button, or from
 * clicking an item in the section (opening at that item's index).
 *
 * The original attached two click handlers to the About opener — one from the
 * base class and one from the subclass — so it opened twice per click.
 */
(function (window, document) {
  'use strict';

  var F = window.Fluco;
  if (!F) {
    console.error('[fullscreen-slider] Fluco core is missing. Load shared/fluco-core.js first.');
    return;
  }

  var CLOSE = '.fullscreen-slider-close';

  function dotsCss(scope) {
    return (
      '@media (max-width:991px){' + scope + '{display:flex !important;' +
        'grid-column-gap:3px !important;grid-row-gap:3px !important;z-index:10;}}' +
      scope + ' .swiper-pagination-bullet{height:7px !important;width:7px !important;' +
        'margin:0px !important;background:#ffffff80 !important;opacity:1 !important;' +
        'box-shadow:none !important;}' +
      scope + ' .swiper-pagination-bullet-active{background:#ffffff !important;}'
    );
  }

  var TEXT_PARAMS = {
    loop: false,
    effect: 'fade',
    fadeEffect: { crossFade: true },
    allowTouchMove: true,
    observer: true,
    observeParents: true,
    // Captions are swiped on phones only; on desktop the arrows drive them.
    breakpoints: { 991: { allowTouchMove: false } }
  };

  var PRESETS = [
    {
      name: 'inspiring',
      section: '.inspiring-change',
      wrapper: '.inspiring-change-slider-wrapper',
      opener: '#slider-inspiring-open-button',
      texts: '.ics-texts',
      images: '.ics-images',
      next: '.ics-next',
      prev: '.ics-prev',
      // This one uses Swiper's own pagination rather than hand-built bullets.
      pagination: { el: '.mobile-related-slider-dots', type: 'bullets', clickable: true },
      lazy: false
    },
    {
      name: 'team',
      section: '.team-members',
      wrapper: '.team-slider-wrapper',
      items: '.team-member-item',
      texts: '.team-members-texts',
      images: '.team-members-images',
      next: '.ics-next-team',
      prev: '.ics-prev-team',
      dots: '.mobile-related-slider-dots-team',
      lazy: true
    },
    {
      name: 'awards',
      section: '.about-awards',
      wrapper: '.awards-slider-wrapper',
      items: '.about-awards-logo',
      texts: '.awards-texts',
      images: '.awards-images',
      next: '.ics-next-awards',
      prev: '.ics-prev-awards',
      dots: '.mobile-related-slider-dots-awards',
      lazy: true
    }
  ];

  function FullscreenSlider(preset, section, wrapper, Swiper) {
    var self = this;
    this.preset = preset;
    this.section = section;
    this.wrapper = wrapper;
    this.Swiper = Swiper;
    this.ready = false;
    this.offs = [];
    this.texts = null;
    this.images = null;

    var opener = preset.opener ? F.dom.qs(preset.opener) : null;
    if (opener) {
      this.offs.push(F.on(opener, 'click', function (event) {
        event.preventDefault();
        self.open(0);
      }));
    }

    if (preset.items) {
      F.dom.qsa(preset.items, section).forEach(function (item, index) {
        self.offs.push(F.on(item, 'click', function () {
          self.open(index);
        }));
      });
    }

    var close = F.dom.qs(CLOSE, wrapper);
    if (close) {
      this.offs.push(F.on(close, 'click', function () {
        self.close();
      }));
    }

    if (!preset.lazy) this.build();
  }

  FullscreenSlider.prototype.build = function () {
    if (this.ready) return;
    var preset = this.preset;

    this.texts = new this.Swiper(preset.texts, TEXT_PARAMS);

    var imageParams = {
      navigation: { nextEl: preset.next, prevEl: preset.prev },
      observer: true,
      observeParents: true
    };
    if (preset.pagination) imageParams.pagination = preset.pagination;
    this.images = new this.Swiper(preset.images, imageParams);

    this.texts.controller.control = this.images;
    this.images.controller.control = this.texts;

    if (preset.dots) this.buildDots();
    this.ready = true;
  };

  /** Hand-built bullets for the variants that have no Swiper pagination. */
  FullscreenSlider.prototype.buildDots = function () {
    var self = this;
    var container = F.dom.qs(this.preset.dots);
    if (!container) return;

    F.css('fullscreen-dots-' + this.preset.name, dotsCss(this.preset.dots));
    container.textContent = '';

    this.images.slides.forEach(function (slide, index) {
      var bullet = F.dom.el(
        'span',
        'swiper-pagination-bullet' + (index === 0 ? ' swiper-pagination-bullet-active' : '')
      );
      self.offs.push(F.on(bullet, 'click', function () {
        self.images.slideTo(index);
      }));
      container.appendChild(bullet);
    });

    this.images.on('slideChange', function (swiper) {
      F.dom.qsa('.swiper-pagination-bullet', container).forEach(function (bullet, index) {
        bullet.classList.toggle('swiper-pagination-bullet-active', index === swiper.activeIndex);
      });
    });
  };

  FullscreenSlider.prototype.open = function (index) {
    var self = this;
    this.wrapper.style.display = 'flex';
    // Swiper measures zero while the overlay is display:none, so build and
    // update only after the browser has laid it out.
    window.requestAnimationFrame(function () {
      if (!self.ready) self.build();
      else {
        if (self.texts) self.texts.update();
        if (self.images) self.images.update();
      }
      if (typeof index === 'number' && self.images) self.images.slideTo(index, 0);
      self.wrapper.style.opacity = '1';
      self.wrapper.style.visibility = 'visible';
    });
  };

  FullscreenSlider.prototype.close = function () {
    this.wrapper.style.display = 'none';
    this.wrapper.style.opacity = '0';
    this.wrapper.style.visibility = 'hidden';
  };

  FullscreenSlider.prototype.destroy = function () {
    this.offs.forEach(function (off) {
      off();
    });
    this.offs = [];
    if (this.texts) this.texts.destroy(true, true);
    if (this.images) this.images.destroy(true, true);
    this.texts = this.images = null;
    this.ready = false;
    this.close();
  };

  F.ready(function () {
    var found = [];
    PRESETS.forEach(function (preset) {
      var section = F.dom.qs(preset.section);
      var wrapper = F.dom.qs(preset.wrapper);
      if (section && wrapper) found.push({ preset: preset, section: section, wrapper: wrapper });
    });
    if (!found.length) return;
    if (!window.Swiper) {
      F.error('[fullscreen-slider] Swiper is required but was not loaded.');
      return;
    }
    window.Fluco.fullscreenSliders = found.map(function (entry) {
      return new FullscreenSlider(entry.preset, entry.section, entry.wrapper, window.Swiper);
    });
  }, 'fullscreen-slider');
})(window, document);
