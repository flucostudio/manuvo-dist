/*!
 * Related slider — turns the mobile "Related stories" block into a swiper.
 * Requires: shared/fluco-core.js (Swiper is loaded on demand)
 *
 * The desktop and mobile blocks already exist in the markup and the site CSS
 * swaps them at 479px:
 *   .redesign-section.new-related.for-changemakers  → display:none  ≤479
 *   .redesign-section.mobile-related                → display:block ≤479
 *
 * On /series/changemakers the mobile block is hand-built as
 * .swiper > .swiper-wrapper > .swiper-slide. On the article pages the cards
 * sit directly in .mobile-related-story-wrapper because they come from a
 * component slot, so the structure has to be built at runtime instead —
 * that also keeps it correct for any number of cards the slot receives.
 *
 * Only mounts below the breakpoint: above it the block is hidden anyway, and
 * a Swiper measured while display:none reports zero widths.
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
  // Wrappers that hold the cards, in either spelling used on the site.
  var WRAPPERS = '.mobile-related-story-wrapper, .mobile-related-slider-wrapper';
  var CARD = '.mobile-related-card';
  var MOBILE_MAX = 479;
  var RESIZE_WAIT = 200;

  var CSS =
    '.related-swiper{width:100%;overflow:hidden;}' +
    '.related-swiper .swiper-slide{height:auto;display:flex;}' +
    '.related-swiper .swiper-slide > *{width:100%;}' +
    '.mobile-related-slider-dots{display:flex;justify-content:center;gap:6px;margin-top:16px;}' +
    '.mobile-related-slider-dots .swiper-pagination-bullet{width:7px;height:7px;margin:0 !important;' +
      'background:#1e1e1e80;opacity:1;box-shadow:none;}' +
    '.mobile-related-slider-dots .swiper-pagination-bullet-active{background:#1e1e1e;}';

  function isMobile() {
    return window.innerWidth <= MOBILE_MAX;
  }

  function RelatedSlider(wrapper, Swiper) {
    this.wrapper = wrapper;
    this.Swiper = Swiper;
    this.swiper = null;
    this.built = false;
    this.offs = [];

    var self = this;
    this.sync();
    this.offs.push(
      F.onResize(function () {
        self.sync();
      }, RESIZE_WAIT)
    );
  }

  /**
   * Wrap the existing cards into the structure Swiper expects. The cards keep
   * their place in the DOM order, so the component slot stays intact.
   */
  RelatedSlider.prototype.build = function () {
    if (this.built) return;
    var cards = F.dom.qsa(CARD, this.wrapper);
    if (cards.length < 2) return; // nothing to swipe through

    this.container = F.dom.el('div', 'swiper related-swiper');
    this.track = F.dom.el('div', 'swiper-wrapper');
    this.container.appendChild(this.track);

    // Remember where each card came from, so destroy() can put it back.
    this.origin = cards[0].parentNode;
    this.cards = cards;
    cards.forEach(function (card) {
      var slide = F.dom.el('div', 'swiper-slide');
      slide.appendChild(card);
      this.track.appendChild(slide);
    }, this);

    this.dots = F.dom.el('div', 'mobile-related-slider-dots');
    this.origin.appendChild(this.container);
    this.origin.appendChild(this.dots);
    this.built = true;
  };

  RelatedSlider.prototype.mount = function () {
    this.build();
    if (!this.built || this.swiper) return;
    this.swiper = new this.Swiper(this.container, {
      slidesPerView: 1,
      spaceBetween: 8,
      autoHeight: true,
      watchOverflow: true,
      pagination: { el: this.dots, clickable: true }
    });
  };

  RelatedSlider.prototype.unmount = function () {
    if (!this.swiper) return;
    this.swiper.destroy(true, true);
    this.swiper = null;
  };

  /** Swiper runs on phones only; wider viewports show the desktop block. */
  RelatedSlider.prototype.sync = function () {
    if (isMobile()) this.mount();
    else this.unmount();
  };

  RelatedSlider.prototype.destroy = function () {
    this.offs.forEach(function (off) { off(); });
    this.offs = [];
    this.unmount();
    if (!this.built) return;
    // Return the cards to their original parent and drop the scaffolding.
    this.cards.forEach(function (card) {
      this.origin.appendChild(card);
    }, this);
    if (this.container.parentNode) this.container.parentNode.removeChild(this.container);
    if (this.dots.parentNode) this.dots.parentNode.removeChild(this.dots);
    this.built = false;
  };

  F.ready(function () {
    var wrappers = F.dom.qsa(WRAPPERS).filter(function (wrapper) {
      // Skip blocks that are already hand-built as a swiper.
      return !F.dom.qs('.swiper-wrapper', wrapper) && F.dom.qsa(CARD, wrapper).length > 1;
    });
    if (!wrappers.length) return;

    F.css('related-slider', CSS);

    var start = function () {
      window.Fluco.relatedSliders = wrappers.map(function (wrapper) {
        return new RelatedSlider(wrapper, window.Swiper);
      });
    };

    if (window.Swiper) {
      start();
      return;
    }
    // Swiper is not on these pages; pull it in rather than asking every
    // article template to add two more tags.
    var link = F.dom.el('link', null, { rel: 'stylesheet', href: SWIPER_CSS });
    document.head.appendChild(link);
    F.loadScript(SWIPER_JS).then(start, function (e) {
      F.error('[related-slider] Swiper failed to load', e);
    });
  }, 'related-slider');
})(window, document);
