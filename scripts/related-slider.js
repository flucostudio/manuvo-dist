/*!
 * Related slider — one Related stories block that becomes a swiper on phones.
 * Requires: shared/fluco-core.js (Swiper is loaded on demand)
 *
 * The site used to carry two separate blocks with the same content — a
 * desktop grid and a mobile one — which meant editing every story twice and
 * let them drift apart. This drives the single desktop block instead:
 * below the breakpoint its cards are wrapped into a Swiper, above it the
 * markup is restored untouched.
 *
 * The site stylesheet hides that block on phones (.new-changemakers-yml
 * → display:none ≤479) because the mobile twin used to take over, so the
 * component re-shows it via a data attribute. Card styles for phones already
 * exist in the stylesheet — only the layout is added here.
 *
 * Markup:
 *   .new-changemakers-yml-links-wrapper > .new-changemakers-yml-link*
 */
(function (window, document) {
  'use strict';

  var F = window.Fluco;
  if (!F) {
    console.error('[related-slider] Fluco core is missing. Load shared/fluco-core.js first.');
    return;
  }

  var SWIPER_JS = 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js';
  var SWIPER_CSS = 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css';

  var WRAPPER = '.new-changemakers-yml-links-wrapper';
  var CARD = '.new-changemakers-yml-link';
  var PANEL = '.new-changemakers-yml';          // coloured panel around the cards
  var SECTION = '.redesign-section.new-related'; // section that wraps it all
  var LEGACY_MOBILE = '.redesign-section.mobile-related'; // the old duplicate
  var FLAG = 'data-fluco-related';
  var MOBILE_MAX = 479;
  var RESIZE_WAIT = 200;

  var CSS =
    '@media screen and (max-width:' + MOBILE_MAX + 'px){' +
      // Undo the stylesheet's display:none, but only where we took over.
      '[' + FLAG + '].redesign-section.new-related{display:block !important;}' +
      '[' + FLAG + '] .new-changemakers-yml{display:flex !important;}' +
      // A hidden duplicate would otherwise show the same stories twice.
      '[' + FLAG + '-legacy]{display:none !important;}' +
      '[' + FLAG + '] .new-changemakers-yml-links-wrapper{display:block !important;}' +
      '[' + FLAG + '] .related-swiper{width:100%;overflow:hidden;}' +
      '[' + FLAG + '] .related-swiper .swiper-slide{height:auto;display:flex;}' +
      '[' + FLAG + '] .related-swiper .swiper-slide > *{width:100%;}' +
      '[' + FLAG + '] .fluco-related-dots{display:flex;justify-content:center;gap:6px;margin-top:16px;}' +
      '[' + FLAG + '] .fluco-related-dots .swiper-pagination-bullet{width:7px;height:7px;' +
        'margin:0 !important;background:#1e1e1e80;opacity:1;box-shadow:none;}' +
      '[' + FLAG + '] .fluco-related-dots .swiper-pagination-bullet-active{background:#1e1e1e;}' +
    '}';

  function isMobile() {
    return window.innerWidth <= MOBILE_MAX;
  }

  function RelatedSlider(wrapper, Swiper) {
    this.wrapper = wrapper;
    this.Swiper = Swiper;
    this.swiper = null;
    this.built = false;
    this.offs = [];

    this.section = wrapper.closest(SECTION);
    this.panel = wrapper.closest(PANEL);
    this.cards = F.dom.qsa(CARD, wrapper);

    var self = this;
    this.sync();
    this.offs.push(
      F.onResize(function () {
        self.sync();
      }, RESIZE_WAIT)
    );
  }

  /** Wrap the existing cards; they keep their order and their classes. */
  RelatedSlider.prototype.build = function () {
    if (this.built || this.cards.length < 2) return;

    this.container = F.dom.el('div', 'swiper related-swiper');
    this.track = F.dom.el('div', 'swiper-wrapper');
    this.container.appendChild(this.track);

    this.cards.forEach(function (card) {
      var slide = F.dom.el('div', 'swiper-slide');
      slide.appendChild(card);
      this.track.appendChild(slide);
    }, this);

    this.dots = F.dom.el('div', 'fluco-related-dots');
    this.wrapper.appendChild(this.container);
    this.wrapper.appendChild(this.dots);
    this.built = true;
  };

  /** Put the cards back exactly where they were. */
  RelatedSlider.prototype.unbuild = function () {
    if (!this.built) return;
    this.cards.forEach(function (card) {
      this.wrapper.appendChild(card);
    }, this);
    if (this.container.parentNode) this.container.parentNode.removeChild(this.container);
    if (this.dots.parentNode) this.dots.parentNode.removeChild(this.dots);
    this.built = false;
  };

  RelatedSlider.prototype.mount = function () {
    this.build();
    if (!this.built || this.swiper) return;
    if (this.section) this.section.setAttribute(FLAG, '');
    this.swiper = new this.Swiper(this.container, {
      slidesPerView: 1,
      spaceBetween: 12,
      autoHeight: true,
      watchOverflow: true,
      pagination: { el: this.dots, clickable: true }
    });
  };

  RelatedSlider.prototype.unmount = function () {
    if (this.swiper) {
      this.swiper.destroy(true, true);
      this.swiper = null;
    }
    this.unbuild();
    if (this.section) this.section.removeAttribute(FLAG);
  };

  RelatedSlider.prototype.sync = function () {
    if (isMobile()) this.mount();
    else this.unmount();
  };

  RelatedSlider.prototype.destroy = function () {
    this.offs.forEach(function (off) { off(); });
    this.offs = [];
    this.unmount();
  };

  F.ready(function () {
    var wrappers = F.dom.qsa(WRAPPER).filter(function (wrapper) {
      return F.dom.qsa(CARD, wrapper).length > 1;
    });
    if (!wrappers.length) return;

    F.css('related-slider', CSS);
    // Mark any leftover duplicate block so the CSS above can hide it; the
    // markup itself is removed separately in the Designer.
    F.dom.qsa(LEGACY_MOBILE).forEach(function (node) {
      node.setAttribute(FLAG + '-legacy', '');
    });

    var start = function () {
      window.Fluco.relatedSliders = wrappers.map(function (wrapper) {
        return new RelatedSlider(wrapper, window.Swiper);
      });
    };

    if (window.Swiper) {
      start();
      return;
    }
    var link = F.dom.el('link', null, { rel: 'stylesheet', href: SWIPER_CSS });
    document.head.appendChild(link);
    F.loadScript(SWIPER_JS).then(start, function (e) {
      F.error('[related-slider] Swiper failed to load', e);
    });
  }, 'related-slider');
})(window, document);
