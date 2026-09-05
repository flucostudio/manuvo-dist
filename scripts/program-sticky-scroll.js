/*!
 * Program sticky scroll — pins the swipe section and advances its panels with
 * the wheel / touch instead of the page scrolling.
 * Replaces: program-sticky-scroll.js and program-sticky-scroll-v2.js
 *           (identical apart from the variant attribute name and a
 *            stray console.log)
 * Requires: shared/fluco-core.js, GSAP, ScrollTrigger
 *
 * Markup:
 *   <section class="swipe-section" data-wf--slide-rail-section--variant="3-items">
 *     <div class="panel">…</div>            (up to 5)
 *   </section>
 *   <div class="panel-images"><div class="program-scroll-item-image">…</div></div>
 *   <div class="panel-progress-whole"><div class="panel-progress-active"></div></div>
 *
 * Desktop only, and only above 991px: the takeover is hostile on touch.
 * Add ?disable-custom-scroll=true to the URL to turn it off for debugging.
 */
(function (window, document) {
  'use strict';

  var F = window.Fluco;
  if (!F) {
    console.error('[program-sticky-scroll] Fluco core is missing. Load shared/fluco-core.js first.');
    return;
  }

  var SECTION = '.swipe-section';
  var PANEL = '.swipe-section .panel';
  var IMAGE = '.panel-images .program-scroll-item-image';
  var PROGRESS_WRAPPER = '.panel-progress-whole';
  var PROGRESS_BAR = '.panel-progress-active';
  // Two Webflow component variants ship different attribute names for the
  // same thing; -v2 (used on /new-course-page) renamed it. Accept both.
  var VARIANT_ATTRS = [
    'data-wf--slide-rail-section--variant',
    'data-wf--program-slide-rail-section--variant'
  ];

  var WIDE = 991;
  var MIN_PANELS = 1;
  var MAX_PANELS = 5;
  var DEFAULT_PANELS = 3;
  var BAR_PX = 40;
  var RESIZE_WAIT = 250;
  var SCROLL_UNLOCK = 1;

  function activeHere() {
    return F.device.type() === 'desktop' && window.innerWidth > WIDE;
  }

  function StickyScroll(section, gsap, ScrollTrigger) {
    var self = this;
    this.section = section;
    this.gsap = gsap;
    this.ScrollTrigger = ScrollTrigger;

    this.allowScroll = true;
    this.currentIndex = 0;
    this.cleanup = null;
    this.offs = [];

    this.scrollTimeout = gsap
      .delayedCall(SCROLL_UNLOCK, function () {
        self.allowScroll = true;
      })
      .pause();

    var variant = null;
    VARIANT_ATTRS.some(function (attr) {
      variant = section.getAttribute(attr);
      return !!variant;
    });
    if (!variant) variant = DEFAULT_PANELS + '-items';
    var count = Math.min(Math.max(parseInt(variant, 10) || DEFAULT_PANELS, MIN_PANELS), MAX_PANELS);
    this.panels = gsap.utils.toArray(PANEL).slice(0, count);
    this.images = gsap.utils.toArray(IMAGE).slice(0, count);
    this.progressWrapper = F.dom.qs(PROGRESS_WRAPPER);
    this.progressBar = F.dom.qs(PROGRESS_BAR);

    this.observer = this.createObserver();
    this.observer.disable();

    this.setupInitialState();
    this.syncToViewport();

    this.offs.push(
      F.on(window, 'resize', F.debounce(function () {
        self.reinit();
      }, RESIZE_WAIT))
    );
  }

  /** Bar height as a share of the viewport; recomputed so resizing is exact. */
  StickyScroll.prototype.barHeight = function () {
    return (BAR_PX / window.innerHeight) * 100;
  };

  StickyScroll.prototype.setupInitialState = function () {
    var gsap = this.gsap;
    var panels = this.panels;

    if (!activeHere()) {
      if (this.progressWrapper) this.progressWrapper.style.display = 'none';
      return;
    }
    if (this.progressWrapper) this.progressWrapper.style.display = 'block';

    var bar = this.barHeight();
    if (this.progressWrapper) {
      gsap.set(this.progressWrapper, { height: bar * panels.length + 'svh' });
    }
    if (this.progressBar) gsap.set(this.progressBar, { height: bar + 'svh', y: 0 });

    gsap.set(panels, {
      zIndex: function (i) {
        return panels.length - i;
      },
      clearProps: 'transform'
    });
    gsap.set(panels.slice(1), { yPercent: 100 });
    gsap.set(this.images.slice(1), { opacity: 0 });
  };

  StickyScroll.prototype.createObserver = function () {
    var self = this;
    return this.ScrollTrigger.observe({
      type: 'wheel,touch',
      tolerance: 10,
      preventDefault: true,
      onUp: function () {
        if (self.allowScroll) self.gotoPanel(self.currentIndex - 1, false);
      },
      onDown: function () {
        if (self.allowScroll) self.gotoPanel(self.currentIndex + 1, true);
      },
      onEnable: function (observer) {
        self.allowScroll = false;
        self.scrollTimeout.restart(true);
        var saved = observer.scrollY();
        observer._restoreScroll = function () {
          observer.scrollY(saved);
        };
        document.addEventListener('scroll', observer._restoreScroll, { passive: false });
      },
      onDisable: function (observer) {
        if (observer._restoreScroll) {
          document.removeEventListener('scroll', observer._restoreScroll);
        }
      }
    });
  };

  StickyScroll.prototype.gotoPanel = function (index, down) {
    // Past either end: hand scrolling back to the page.
    if ((index === this.panels.length && down) || (index === -1 && !down)) {
      this.observer.disable();
      return;
    }

    var gsap = this.gsap;
    this.allowScroll = false;
    this.scrollTimeout.restart(true);

    gsap.to(this.panels[this.currentIndex], {
      yPercent: down ? -100 : 100,
      duration: 1.5,
      ease: 'power4.out'
    });
    gsap.to(this.images[this.currentIndex], {
      opacity: 0,
      duration: 1.5,
      ease: 'power4.out',
      immediateRender: false
    });
    gsap.fromTo(this.panels[index], { yPercent: down ? 100 : -100 }, { yPercent: 0, duration: 0.75 });
    gsap.fromTo(
      this.images[index],
      { opacity: 0 },
      { opacity: 1, duration: 0.75, immediateRender: false }
    );
    if (this.progressBar) {
      gsap.to(this.progressBar, {
        y: index * this.barHeight() + 'svh',
        duration: 0.75,
        ease: 'power2.out'
      });
    }

    this.currentIndex = index;
  };

  StickyScroll.prototype.start = function () {
    var self = this;
    var gsap = this.gsap;
    var trigger = this.ScrollTrigger.create({
      trigger: SECTION,
      pin: true,
      start: 'top top',
      end: '+=200',
      ease: 'power4.out',
      onEnter: function (instance) {
        if (self.observer.isEnabled) return;
        instance.scroll(instance.start + 1);
        self.observer.enable();
      },
      onEnterBack: function (instance) {
        if (self.observer.isEnabled) return;
        instance.scroll(instance.end - 1);
        self.observer.enable();
      }
    });

    return function stop() {
      trigger.kill();
      self.observer.disable();
      gsap.set(self.panels, { clearProps: 'all' });
      gsap.set(self.images, { clearProps: 'all' });
      gsap.set([self.progressWrapper, self.progressBar].filter(Boolean), { clearProps: 'all' });
    };
  };

  /** Attach on wide desktop, detach everywhere else. */
  StickyScroll.prototype.syncToViewport = function () {
    if (activeHere()) {
      if (!this.cleanup) this.cleanup = this.start();
    } else if (this.cleanup) {
      this.cleanup();
      this.cleanup = null;
    }
  };

  StickyScroll.prototype.reinit = function () {
    if (this.cleanup) {
      this.cleanup();
      this.cleanup = null;
    }
    this.currentIndex = 0;
    this.setupInitialState();
    this.syncToViewport();
  };

  StickyScroll.prototype.destroy = function () {
    this.offs.forEach(function (off) {
      off();
    });
    this.offs = [];
    if (this.cleanup) {
      this.cleanup();
      this.cleanup = null;
    }
    this.observer.kill();
    this.scrollTimeout.kill();
  };

  F.ready(function () {
    var section = F.dom.qs(SECTION);
    if (!section) return;
    if (window.location.search.indexOf('disable-custom-scroll=true') !== -1) {
      F.log('[program-sticky-scroll] disabled via query string');
      return;
    }
    if (!window.gsap || !window.ScrollTrigger) {
      F.error('[program-sticky-scroll] GSAP and ScrollTrigger are required.');
      return;
    }
    window.gsap.registerPlugin(window.ScrollTrigger);
    window.Fluco.programStickyScroll = new StickyScroll(section, window.gsap, window.ScrollTrigger);
  }, 'program-sticky-scroll');
})(window, document);
