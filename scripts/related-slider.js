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
 * The cards are rebuilt in the same shape as the ones on
 * /series/changemakers (image, author, title, "Find out more"), so both
 * pages look alike. The author line only appears when the desktop card
 * carries data-fluco-related-subtitle — that field does not exist on it yet.
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
  var CARD_PIC = '.new-changemakers-yml-link-pic';
  // Card look copied from /series/changemakers so both pages match. These
  // classes are styled in the site stylesheet under @media ≤479 by plain
  // class selectors, so they work outside the old mobile section too.
  var CARD_COLOUR = 'peach';
  var BUTTON_LABEL = 'Find out more';
  var SUBTITLE_ATTR = 'data-fluco-related-subtitle';
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
      '[' + FLAG + '-source]{display:none !important;}' +
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

  /**
   * Build one card in the shape used on /series/changemakers:
   *   .mobile-related-card > a > img.mobile-related-card-pic
   *                        > .mobile-related-card-text-wrapper
   *                            > .mobile-related-card-header
   *                                > .captions        (author, optional)
   *                                > .redesign-small-title
   *                            > a.redesign-button.white
   * Built from the desktop card rather than moving it, so the original
   * markup is untouched and comes straight back above the breakpoint.
   */
  RelatedSlider.prototype.cardFrom = function (source) {
    var href = source.getAttribute('href') || '#';
    var card = F.dom.el('div', 'mobile-related-card ' + CARD_COLOUR);

    var picLink = F.dom.el('a', 'w-inline-block', { href: href });
    var sourcePic = F.dom.qs(CARD_PIC, source) || source.querySelector('img');
    if (sourcePic) {
      // Clone keeps srcset/sizes, so the phone still picks a small file.
      var pic = sourcePic.cloneNode(true);
      pic.className = 'mobile-related-card-pic';
      picLink.appendChild(pic);
    }
    card.appendChild(picLink);

    var text = F.dom.el('div', 'mobile-related-card-text-wrapper');
    var header = F.dom.el('div', 'mobile-related-card-header');

    // The desktop card has no author field; show the line only when one is
    // supplied via the attribute.
    var subtitle = source.getAttribute(SUBTITLE_ATTR);
    if (subtitle) {
      var caption = F.dom.el('div', 'captions');
      caption.textContent = subtitle;
      header.appendChild(caption);
    }

    var title = F.dom.el('div', 'redesign-small-title');
    // Title is whatever the desktop card shows next to its image.
    var titleNode = Array.prototype.filter.call(source.children, function (child) {
      return child.tagName !== 'IMG';
    })[0];
    title.textContent = titleNode ? (titleNode.textContent || '').trim() : (source.textContent || '').trim();
    header.appendChild(title);
    text.appendChild(header);

    var button = F.dom.el('a', 'redesign-button white w-button', { href: href });
    button.textContent = BUTTON_LABEL;
    text.appendChild(button);

    card.appendChild(text);
    return card;
  };

  RelatedSlider.prototype.build = function () {
    if (this.built || this.cards.length < 2) return;

    this.container = F.dom.el('div', 'swiper related-swiper');
    this.track = F.dom.el('div', 'swiper-wrapper');
    this.container.appendChild(this.track);

    this.cards.forEach(function (source) {
      var slide = F.dom.el('div', 'swiper-slide');
      slide.appendChild(this.cardFrom(source));
      this.track.appendChild(slide);
    }, this);

    this.dots = F.dom.el('div', 'fluco-related-dots');
    // Hide the desktop cards rather than move them: the slider shows copies.
    this.wrapper.setAttribute(FLAG + '-source', '');
    this.wrapper.parentNode.insertBefore(this.container, this.wrapper.nextSibling);
    this.container.parentNode.insertBefore(this.dots, this.container.nextSibling);
    this.built = true;
  };

  /** Drop the copies and reveal the original cards again. */
  RelatedSlider.prototype.unbuild = function () {
    if (!this.built) return;
    this.wrapper.removeAttribute(FLAG + '-source');
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
