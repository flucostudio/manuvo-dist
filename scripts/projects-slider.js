/*!
 * Projects Slider — infinite draggable hero slider with autoplay.
 * Replaces: tests/projects-slider.js (+ backups)
 * Requires: shared/fluco-core.js, GSAP + Draggable (InertiaPlugin optional)
 *
 * Markup:
 *   .projects-slider-wrapper > .slides-container > .projects-slider-item*
 *     .projects-slider-item-image / -category / -title / .projects-slider-actions
 *     .redesign-button.white-ghost   (share button, optional)
 *   .share-modal-dynamic > .sc-modal (one per slide, same order, optional)
 *
 * Based on the GSAP "infinite draggable slider" helper, with flick
 * detection added for the case where InertiaPlugin is absent.
 */
(function (window, document) {
  'use strict';

  var F = window.Fluco;
  if (!F) {
    console.error('[projects-slider] Fluco core is missing. Load shared/fluco-core.js first.');
    return;
  }

  var DESIGN_WIDTH = 1440; // Figma artboard width used for `vw()` values
  var SLIDE_DELAY = 6; // seconds between auto-advances
  var SLIDE_DURATION = 2; // seconds per auto-advance transition
  // A swipe must land quickly — 2s of power3.inOut after the finger is gone
  // reads as lag, so releases animate on their own, shorter curve.
  var SWIPE_DURATION = 0.5;
  var SWIPE_EASE = 'power2.out';
  // A flick counts when it either travels far enough or moves fast enough.
  // Without InertiaPlugin the original required dragging past half a slide,
  // so ordinary short swipes snapped back and felt broken.
  var FLICK_DISTANCE = 0.12; // share of slide width
  var FLICK_VELOCITY = 0.35; // px per ms
  // Auto-advance takes 2s, so its text starts midway through the move.
  // A swipe lands in 0.5s — the same delay would show the text after the
  // slide has already stopped, which reads as "the text is late".
  var REVEAL = { delay: 1, stagger: 0.1, duration: 0.75, ease: 'power3.out' };
  var SWIPE_REVEAL_DELAY = 0.12;
  // Text blocks of a slide. The image is deliberately not here: while
  // swiping, only media should be visible on the incoming slide.
  var CONTENT = ['.projects-slider-item-category', '.projects-slider-item-title', '.projects-slider-actions'];
  // Returning to the slide you started on should snap back, not glide.
  var CANCEL_DURATION = 0.3;

  var CSS =
    // Let the browser keep vertical scrolling while we take horizontal drags;
    // without this touch devices fight the slider for the gesture.
    '.projects-slider-wrapper{touch-action:pan-y;}' +
    '.projects-slider-wrapper img{-webkit-user-drag:none;user-drag:none;}' +
    '.projects-slider-item{-webkit-user-select:none;user-select:none;}';

  function vw(px) {
    return F.units.designVw(px, DESIGN_WIDTH);
  }

  function ProjectsSlider(root) {
    var gsap = window.gsap;
    var Draggable = window.Draggable;
    if (!gsap || !Draggable) {
      F.error('[projects-slider] GSAP and Draggable are required.');
      return;
    }
    gsap.registerPlugin(Draggable);

    this.gsap = gsap;
    this.root = root;
    this.slides = F.dom.qsa('.projects-slider-item', root);
    this.count = this.slides.length;
    if (!this.count) return;

    this.trigger = F.dom.qs('.slides-container', root) || root;
    this.proxy = document.createElement('div');
    this.slideWidth = 0;
    this.wrapWidth = 0;
    this.slideTween = gsap.to({}, {});
    this.reduced = F.device.prefersReducedMotion();
    this.offs = [];
    this.press = null; // { x, time } while a drag is in progress
    this.currentIndex = 0;

    F.css('projects-slider', CSS);
    this.build();
    this.bindHover();
    this.bindShare();
  }

  ProjectsSlider.prototype.build = function () {
    var gsap = this.gsap;
    var self = this;

    gsap.set(this.slides, { opacity: 1, xPercent: function (i) { return i * 100; } });

    var wrapX = gsap.utils.wrap(-100, (this.count - 1) * 100);
    this.progressWrap = gsap.utils.wrap(0, 1);

    this.track = gsap.to(this.slides, {
      xPercent: '+=' + this.count * 100,
      duration: 1,
      ease: 'none',
      paused: true,
      repeat: -1,
      modifiers: { xPercent: wrapX }
    });

    this.timer = gsap.delayedCall(SLIDE_DELAY, this.autoPlay.bind(this));

    this.draggable = new window.Draggable(this.proxy, {
      trigger: this.trigger,
      type: 'x',
      inertia: !!window.InertiaPlugin, // Club plugin; silently off if absent
      onPress: function () {
        self.timer.restart(true);
        self.slideTween.kill();
        this.update();
        self.press = { x: this.x, time: Date.now() };
      },
      onDrag: this.updateProgress.bind(this),
      onThrowUpdate: this.updateProgress.bind(this),
      onRelease: function () {
        // InertiaPlugin, when present, throws and snaps on its own.
        if (window.InertiaPlugin) return;
        self.settle(this.x);
      },
      snap: { x: this.snapX.bind(this) }
    });

    this.resize();
    this.hideContentExcept(this.currentIndex);
    this.offs.push(F.onResize(this.resize.bind(this)));
    this.offs.push(
      F.on(document, 'visibilitychange', function () {
        document.hidden ? self.timer.pause() : self.timer.resume();
      })
    );
  };

  ProjectsSlider.prototype.snapX = function (value) {
    return this.gsap.utils.snap(this.slideWidth, value);
  };

  ProjectsSlider.prototype.updateProgress = function () {
    var x = this.gsap.getProperty(this.proxy, 'x');
    this.track.progress(this.progressWrap(x / this.wrapWidth));
  };

  /**
   * Slide showing at offset `x`. Dragging left (negative x) walks forward
   * through the slides, so the sign is inverted before wrapping; the old
   * Math.abs() version returned the wrong slide for rightward moves — at
   * +1 slide it reported index 1 instead of the last one.
   */
  ProjectsSlider.prototype.indexFromX = function (x) {
    var steps = -Math.round(x / this.slideWidth);
    return ((steps % this.count) + this.count) % this.count;
  };

  /** Text nodes of a slide, in reveal order. */
  ProjectsSlider.prototype.contentOf = function (index) {
    var slide = this.slides[index];
    if (!slide) return [];
    return CONTENT.map(function (selector) {
      return slide.querySelector(selector);
    }).filter(Boolean);
  };

  /**
   * Hide the text on every slide except `keep`. Neighbours are already in
   * view during a drag, so their text has to be hidden up front — revealing
   * on release is too late, you would see the next slide's copy slide in.
   */
  ProjectsSlider.prototype.hideContentExcept = function (keep) {
    var gsap = this.gsap;
    for (var i = 0; i < this.count; i++) {
      if (i === keep) continue;
      var nodes = this.contentOf(i);
      if (nodes.length) gsap.set(nodes, { opacity: 0, pointerEvents: 'none' });
    }
  };

  ProjectsSlider.prototype.revealSlide = function (index, delay) {
    var gsapRef = this.gsap;
    if (this.reduced) {
      // Reduced motion: no animation, but the text still has to come back.
      var plain = this.contentOf(index);
      if (plain.length) gsapRef.set(plain, { opacity: 1, y: 0, pointerEvents: 'auto' });
      return;
    }
    var start = typeof delay === 'number' ? delay : REVEAL.delay;
    var gsap = this.gsap;
    var slide = this.slides[index];
    var image = slide.querySelector('.projects-slider-item-image');
    var nodes = this.contentOf(index);

    if (image) gsap.from(image, { scale: 1.2, duration: 1, delay: start, ease: REVEAL.ease, overwrite: 'auto' });

    nodes.forEach(function (node, i) {
      // The node was parked at opacity 0 by hideContentExcept(); fromTo makes
      // the end state explicit so it does not animate from 0 back to 0.
      gsap.fromTo(
        node,
        { y: vw(80), opacity: 0 },
        {
          y: 0,
          opacity: 1,
          pointerEvents: 'auto',
          duration: REVEAL.duration,
          delay: start + REVEAL.stagger * (i + 2),
          ease: REVEAL.ease,
          overwrite: 'auto'
        }
      );
    });
  };

  ProjectsSlider.prototype.animateTo = function (x, duration, ease, revealDelay) {
    this.timer.restart(true);
    this.slideTween.kill();

    // Only re-run the reveal when the slide actually changes. Cancelling a
    // swipe lands on the slide you were already on, and replaying the text
    // animation there looks like a glitch.
    var index = this.indexFromX(x);
    if (index !== this.currentIndex) {
      this.currentIndex = index;
      this.revealSlide(index, revealDelay);
    }

    var self = this;
    this.slideTween = this.gsap.to(this.proxy, {
      x: x,
      duration: duration || SLIDE_DURATION,
      onUpdate: this.updateProgress.bind(this),
      ease: ease || 'power3.inOut',
      // Once settled, park every other slide's text again so the next drag
      // starts with media only.
      onComplete: function () {
        self.hideContentExcept(self.currentIndex);
      }
    });
  };

  /**
   * Decide where a released drag lands. A deliberate flick advances exactly
   * one slide even when it barely moved, which is how a swipe is expected to
   * behave; anything smaller returns to the slide it started on.
   */
  ProjectsSlider.prototype.settle = function (x) {
    var press = this.press;
    this.press = null;
    if (!press) {
      this.animateTo(this.snapX(x), SWIPE_DURATION, SWIPE_EASE);
      return;
    }

    var dx = x - press.x;
    var elapsed = Math.max(Date.now() - press.time, 1);
    var velocity = dx / elapsed;
    var far = Math.abs(dx) > this.slideWidth * FLICK_DISTANCE;
    var fast = Math.abs(velocity) > FLICK_VELOCITY;

    var target;
    if (Math.abs(dx) >= this.slideWidth) {
      // Dragged a full slide or more: the finger already chose the position,
      // just round it off.
      target = this.snapX(x);
    } else if (far || fast) {
      // A short flick: advance exactly one slide from where the drag began.
      target = this.snapX(press.x) + (dx > 0 ? 1 : -1) * this.slideWidth;
    } else {
      // Swipe abandoned — snap back quickly and leave the text alone.
      this.animateTo(this.snapX(press.x), CANCEL_DURATION, SWIPE_EASE);
      return;
    }
    this.animateTo(target, SWIPE_DURATION, SWIPE_EASE, SWIPE_REVEAL_DELAY);
  };

  ProjectsSlider.prototype.animateSlides = function (direction) {
    var x = this.snapX(this.gsap.getProperty(this.proxy, 'x') + direction * this.slideWidth);
    this.animateTo(x);
  };

  ProjectsSlider.prototype.autoPlay = function () {
    var d = this.draggable;
    if (d.isPressed || d.isDragging || d.isThrowing) this.timer.restart(true);
    else this.animateSlides(-1);
  };

  ProjectsSlider.prototype.resize = function () {
    var gsap = this.gsap;
    var norm = gsap.getProperty(this.proxy, 'x') / this.wrapWidth || 0;
    this.slideWidth = this.slides[0].offsetWidth;
    this.wrapWidth = this.slideWidth * this.count;
    gsap.set(this.proxy, { x: norm * this.wrapWidth });
    this.slideTween.progress(1);
    this.updateProgress();
  };

  /** Pause autoplay while hovering the actions; bound once per slide. */
  ProjectsSlider.prototype.bindHover = function () {
    var self = this;
    this.slides.forEach(function (slide) {
      var actions = slide.querySelector('.projects-slider-actions');
      if (!actions) return;
      self.offs.push(F.on(actions, 'mouseenter', function () { self.timer.pause(); }));
      self.offs.push(F.on(actions, 'mouseleave', function () { self.timer.resume(); }));
    });
  };

  ProjectsSlider.prototype.bindShare = function () {
    var self = this;
    var modals = F.dom.qsa('.share-modal-dynamic');
    this.slides.forEach(function (slide, index) {
      var button = slide.querySelector('.redesign-button.white-ghost');
      var modal = modals[index] ? modals[index].querySelector('.sc-modal') : null;
      if (!button || !modal) return;
      self.offs.push(
        F.on(button, 'click', function () {
          modal.style.display = 'flex';
          modal.style.opacity = '1';
        })
      );
    });
  };

  ProjectsSlider.prototype.destroy = function () {
    // Put every slide's text back, otherwise the markup is left half-hidden.
    var gsap = this.gsap;
    for (var i = 0; i < this.count; i++) {
      var nodes = this.contentOf(i);
      if (nodes.length) gsap.set(nodes, { clearProps: 'opacity,pointerEvents,transform' });
    }
    this.timer.kill();
    this.slideTween.kill();
    this.track.kill();
    this.draggable.kill();
    this.offs.forEach(function (off) { off(); });
  };

  F.ready(function () {
    var root = F.dom.qs('.projects-slider-wrapper');
    if (root) window.Fluco.projectsSlider = new ProjectsSlider(root);
  }, 'projects-slider');
})(window, document);
