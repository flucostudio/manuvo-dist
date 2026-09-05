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
 * Based on the GSAP "infinite draggable slider" helper.
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
  var SLIDE_DURATION = 2; // seconds per transition
  var REVEAL = { delay: 1, stagger: 0.1, duration: 0.75, ease: 'power3.out' };

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
      },
      onDrag: this.updateProgress.bind(this),
      onThrowUpdate: this.updateProgress.bind(this),
      onRelease: function () {
        if (!window.InertiaPlugin) self.animateTo(self.snapX(this.x));
      },
      snap: { x: this.snapX.bind(this) }
    });

    this.resize();
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

  ProjectsSlider.prototype.indexFromX = function (x) {
    return Math.abs(Math.round(x / this.slideWidth) % this.count);
  };

  ProjectsSlider.prototype.revealSlide = function (index) {
    if (this.reduced) return;
    var gsap = this.gsap;
    var slide = this.slides[index];
    var image = slide.querySelector('.projects-slider-item-image');
    var category = slide.querySelector('.projects-slider-item-category');
    var title = slide.querySelector('.projects-slider-item-title');
    var actions = slide.querySelector('.projects-slider-actions');

    if (image) gsap.from(image, { scale: 1.2, duration: 1, delay: REVEAL.delay, ease: REVEAL.ease, overwrite: 'auto' });
    [category, title, actions].forEach(function (node, i) {
      if (!node) return;
      gsap.from(node, {
        y: vw(80),
        opacity: 0,
        duration: REVEAL.duration,
        delay: REVEAL.delay + REVEAL.stagger * (i + 2),
        ease: REVEAL.ease,
        overwrite: 'auto'
      });
    });
  };

  ProjectsSlider.prototype.animateTo = function (x) {
    this.timer.restart(true);
    this.slideTween.kill();
    this.revealSlide(this.indexFromX(x));
    this.slideTween = this.gsap.to(this.proxy, {
      x: x,
      duration: SLIDE_DURATION,
      onUpdate: this.updateProgress.bind(this),
      ease: 'power3.inOut'
    });
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
