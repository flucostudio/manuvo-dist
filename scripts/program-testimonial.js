/*!
 * Program testimonial — centered carousel whose caption is lifted out of the
 * slides into a fixed block below the image.
 * Replaces: the SliderTestimonial part of program-sliders.js
 * Requires: shared/fluco-core.js, Swiper
 *
 * Markup:
 *   <div class="join-changemakers-slider">
 *     <div class="swiper-wrapper">
 *       <div class="swiper-slide">
 *         <div class="join-changemakers-slide-content">
 *           <div class="join-changemakers-slide-content-suptext">…</div>
 *           <div class="join-changemakers-slide-content-testimonial">…</div>
 *           <div class="join-changemakers-slide-content-subtext">…</div>
 *         </div>
 *       </div>
 *     </div>
 *   </div>
 *   <div class="join-changemakers-desc-container">
 *     <div class="join-changemakers-desc-wrapper"></div>
 *   </div>
 *
 * Dropped from the original as dead code: hideContent() (body commented out),
 * rearrangeContent() (ran before any slide could be active, so always a
 * no-op) and updateProgressBar() (never called; its markup was commented out).
 */
(function (window, document) {
  'use strict';

  var F = window.Fluco;
  if (!F) {
    console.error('[program-testimonial] Fluco core is missing. Load shared/fluco-core.js first.');
    return;
  }

  var ROOT = '.join-changemakers-slider';
  var SLIDE_CONTENT = '.join-changemakers-slide-content';
  var SUPTEXT = '.join-changemakers-slide-content-suptext';
  var TITLE = '.join-changemakers-slide-content-testimonial';
  var SUBTEXT = '.join-changemakers-slide-content-subtext';
  var DESC_WRAPPER = '.join-changemakers-desc-wrapper';
  var DESC_CONTAINER = '.join-changemakers-desc-container';
  var DESC_GROUP = '.join-changemakers-desc-group';
  var SLIDE_IMAGE = '.join-changemakers-slide-image';
  var TEXT_WRAPPER = '.testimonial-text-wrapper';
  var ACTIVE_SLIDE = 'testimonial-slide-active';
  var ACTIVE_GROUP = 'join-changemakers-desc-group-active';

  var MOBILE_MAX = 767;
  var SPACE_BETWEEN_VW = 7;
  var AUTOPLAY_DELAY = 10000;
  var VISIBLE_RATIO = 0.2;

  var CSS =
    ROOT + '{position:relative;}' +
    ROOT + ' .swiper-wrapper{align-items:flex-start;user-select:none;}' +
    ROOT + ' .join-changemakers-slider-pagination{display:none;}' +
    ROOT + ' .join-changemakers > ' + SLIDE_CONTENT + '{visibility:hidden;}' +
    ROOT + ' .swiper-slide{width:62.5vw;transition:all 0.4s cubic-bezier(0.25,1,0.5,1);user-select:none;}' +
    ROOT + ' .' + ACTIVE_SLIDE + '{opacity:1;}' +
    ROOT + ' ' + TEXT_WRAPPER + '{transition:opacity 0.4s cubic-bezier(0.25,1,0.5,1),' +
      'visibility 0.4s cubic-bezier(0.25,1,0.5,1);user-select:none;}' +
    ROOT + ' ' + DESC_WRAPPER + '{position:relative;}' +
    ROOT + ' ' + DESC_GROUP + '{position:absolute;top:0;left:0;width:100%;height:100%;' +
      'opacity:0;transition:opacity 0.4s cubic-bezier(0.25,1,0.5,1);}' +
    ROOT + ' .' + ACTIVE_GROUP + '{opacity:1;}' +
    ROOT + ' .swiper-notification{display:none !important;}' +
    ROOT + ' ' + DESC_CONTAINER + '{position:absolute;top:0;left:0;z-index:0;' +
      'margin-top:var(--sizes--desktop--24px);pointer-events:none;user-select:none;width:100%;}' +
    '@media (max-width:480px){' +
      ROOT + ' .join-changemakers-slider-pagination{display:block;}' +
      ROOT + ' .swiper-slide{width:100%;}' +
      DESC_GROUP + '{position:relative;width:100%;}' +
      DESC_CONTAINER + '{margin-top:16px;}' +
    '}';

  function isMobile() {
    return window.innerWidth <= MOBILE_MAX;
  }

  function text(node, selector) {
    var found = F.dom.qs(selector, node);
    return found ? found.textContent : '';
  }

  function Testimonial(root, Swiper) {
    var self = this;
    this.root = root;
    this.offs = [];
    this.slides = F.dom.qsa('.swiper-slide', root);
    this.wrapper = F.dom.qs(DESC_WRAPPER);
    this.container = F.dom.qs(DESC_CONTAINER);

    this.equaliseSlideHeights();
    this.buildDescGroups();

    this.swiper = new Swiper(root, {
      slidesPerView: 'auto',
      autoplay: { delay: AUTOPLAY_DELAY, disableOnInteraction: false },
      loop: true,
      direction: 'horizontal',
      centeredSlides: true,
      spaceBetween: F.units.vwToPx(SPACE_BETWEEN_VW),
      slideActiveClass: ACTIVE_SLIDE,
      pagination: { el: '.join-changemakers-slider-pagination', clickable: true }
    });

    this.offs.push(
      F.on(this.swiper.el, 'mouseenter', function () {
        self.swiper.autoplay.stop();
      })
    );
    this.offs.push(
      F.on(this.swiper.el, 'mouseleave', function () {
        self.swiper.autoplay.start();
      })
    );

    // Only autoplay while the section is on screen.
    this.observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!self.swiper || !self.swiper.autoplay) return;
          if (entry.isIntersecting) self.swiper.autoplay.start();
          else self.swiper.autoplay.stop();
        });
      },
      { threshold: VISIBLE_RATIO }
    );
    this.observer.observe(this.swiper.el);

    this.swiper.on('slideChange', function () {
      self.showActiveText();
      self.showActiveGroup(self.swiper.realIndex);
    });

    this.offs.push(
      F.onResize(function () {
        self.updateWrapperHeight();
        self.updateContainerPosition();
      })
    );

    this.showActiveText();
    this.showActiveGroup(0);
    this.updateContainerPosition();
  }

  /** All slides get the tallest content height so the carousel doesn't jump. */
  Testimonial.prototype.equaliseSlideHeights = function () {
    var max = 0;
    this.slides.forEach(function (slide) {
      var content = F.dom.qs(SLIDE_CONTENT, slide);
      if (content) max = Math.max(max, content.offsetHeight);
    });
    this.slides.forEach(function (slide) {
      var content = F.dom.qs(SLIDE_CONTENT, slide);
      if (content) content.style.height = max + 'px';
    });
  };

  /** Copy each slide's caption into the shared block below the image. */
  Testimonial.prototype.buildDescGroups = function () {
    if (!this.wrapper) return;
    var wrapper = this.wrapper;
    this.slides.forEach(function (slide, index) {
      var group = F.dom.el('div', 'join-changemakers-slide-content join-changemakers-desc-group');
      group.dataset.index = index;

      [[SUPTEXT, 'join-changemakers-slide-content-suptext'],
       [TITLE, 'join-changemakers-slide-content-testimonial'],
       [SUBTEXT, 'join-changemakers-slide-content-subtext']].forEach(function (pair) {
        var value = text(slide, pair[0]);
        if (!value) return;
        var node = F.dom.el('div', pair[1]);
        node.textContent = value;
        group.appendChild(node);
      });

      wrapper.appendChild(group);
    });
    this.updateWrapperHeight();
  };

  /**
   * Tallest caption, measured by un-hiding each group off-layout and putting
   * every touched inline style back exactly as it was.
   */
  Testimonial.prototype.measureGroups = function () {
    var max = 0;
    F.dom.qsa(DESC_GROUP).forEach(function (group) {
      var saved = {
        display: group.style.display,
        opacity: group.style.opacity,
        visibility: group.style.visibility,
        position: group.style.position,
        height: group.style.height,
        overflow: group.style.overflow
      };
      group.style.display = 'block';
      group.style.opacity = '1';
      group.style.visibility = 'visible';
      group.style.position = 'absolute';
      group.style.height = 'auto';
      group.style.overflow = 'visible';
      max = Math.max(max, group.getBoundingClientRect().height);
      Object.keys(saved).forEach(function (prop) {
        group.style[prop] = saved[prop];
      });
    });
    return max;
  };

  Testimonial.prototype.updateWrapperHeight = function () {
    if (!this.wrapper) return;
    var max = this.measureGroups();
    this.wrapper.style.height = isMobile() ? max + 'px' : F.units.pxToVw(max) + 'vw';
  };

  Testimonial.prototype.updateContainerPosition = function () {
    var image = F.dom.qs(SLIDE_IMAGE);
    if (!this.container || !image) return;
    this.container.style.top = image.offsetHeight + 'px';
  };

  Testimonial.prototype.showActiveText = function () {
    F.dom.qsa('.swiper-slide ' + TEXT_WRAPPER, this.root).forEach(function (node) {
      node.style.opacity = '0';
      node.style.visibility = 'hidden';
    });
    var active = F.dom.qs('.' + ACTIVE_SLIDE + ' ' + TEXT_WRAPPER, this.root);
    if (active) {
      active.style.opacity = '1';
      active.style.visibility = 'visible';
    }
  };

  Testimonial.prototype.showActiveGroup = function (index) {
    F.dom.qsa(DESC_GROUP).forEach(function (group) {
      group.classList.remove(ACTIVE_GROUP);
    });
    var active = F.dom.qs(DESC_GROUP + '[data-index="' + index + '"]');
    if (active) active.classList.add(ACTIVE_GROUP);
  };

  Testimonial.prototype.destroy = function () {
    this.offs.forEach(function (off) {
      off();
    });
    this.offs = [];
    if (this.observer) this.observer.disconnect();
    if (this.swiper) {
      this.swiper.destroy(true, true);
      this.swiper = null;
    }
    F.dom.qsa(DESC_GROUP).forEach(function (group) {
      if (group.parentNode) group.parentNode.removeChild(group);
    });
  };

  F.ready(function () {
    var root = F.dom.qs(ROOT);
    if (!root) return;
    if (!window.Swiper) {
      F.error('[program-testimonial] Swiper is required but was not loaded.');
      return;
    }
    F.css('program-testimonial', CSS);
    window.Fluco.programTestimonial = new Testimonial(root, window.Swiper);
  }, 'program-testimonial');
})(window, document);
