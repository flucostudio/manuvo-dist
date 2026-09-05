/*!
 * Course Marquee — seamless horizontal loop of CMS items with a hover
 * overlay showing the image alt text.
 * Replaces: tests/course-marquee.js / course-marquee-new.js
 * Requires: shared/fluco-core.js, GSAP
 *
 * Markup: `.w-dyn-items > .tape-item > img[alt]` (first `.w-dyn-items`
 * on the page, or pass a different root via data attribute:
 * `<div class="w-dyn-items" data-fluco-marquee data-fluco-marquee-speed="1">`).
 */
(function (window, document) {
  'use strict';

  var F = window.Fluco;
  if (!F) {
    console.error('[course-marquee] Fluco core is missing. Load shared/fluco-core.js first.');
    return;
  }

  var ITEM_SELECTOR = '.tape-item';
  var DEFAULT_SPEED = 1; // ~100px per second

  /**
   * GSAP's official horizontalLoop helper (gsap.com/docs/v3/HelperFunctions),
   * unchanged in behaviour. Returns a timeline with next/previous/toIndex.
   */
  function horizontalLoop(items, config) {
    var gsap = window.gsap;
    items = gsap.utils.toArray(items);
    config = config || {};
    var tl = gsap.timeline({
      repeat: config.repeat,
      paused: config.paused,
      defaults: { ease: 'none' },
      onReverseComplete: function () {
        tl.totalTime(tl.rawTime() + tl.duration() * 100);
      }
    });
    var length = items.length;
    var startX = items[0].offsetLeft;
    var times = [];
    var widths = [];
    var xPercents = [];
    var curIndex = 0;
    var pixelsPerSecond = (config.speed || 1) * 100;
    var snap = config.snap === false ? function (v) { return v; } : gsap.utils.snap(config.snap || 1);
    var totalWidth, curX, distanceToStart, distanceToLoop, item, i;

    gsap.set(items, {
      xPercent: function (i, el) {
        var w = (widths[i] = parseFloat(gsap.getProperty(el, 'width', 'px')));
        xPercents[i] = snap((parseFloat(gsap.getProperty(el, 'x', 'px')) / w) * 100 + gsap.getProperty(el, 'xPercent'));
        return xPercents[i];
      }
    });
    gsap.set(items, { x: 0 });
    totalWidth =
      items[length - 1].offsetLeft +
      (xPercents[length - 1] / 100) * widths[length - 1] -
      startX +
      items[length - 1].offsetWidth * gsap.getProperty(items[length - 1], 'scaleX') +
      (parseFloat(config.paddingRight) || 0);

    for (i = 0; i < length; i++) {
      item = items[i];
      curX = (xPercents[i] / 100) * widths[i];
      distanceToStart = item.offsetLeft + curX - startX;
      distanceToLoop = distanceToStart + widths[i] * gsap.getProperty(item, 'scaleX');
      tl.to(item, { xPercent: snap(((curX - distanceToLoop) / widths[i]) * 100), duration: distanceToLoop / pixelsPerSecond }, 0)
        .fromTo(
          item,
          { xPercent: snap(((curX - distanceToLoop + totalWidth) / widths[i]) * 100) },
          { xPercent: xPercents[i], duration: (curX - distanceToLoop + totalWidth - curX) / pixelsPerSecond, immediateRender: false },
          distanceToLoop / pixelsPerSecond
        )
        .add('label' + i, distanceToStart / pixelsPerSecond);
      times[i] = distanceToStart / pixelsPerSecond;
    }

    function toIndex(index, vars) {
      vars = vars || {};
      if (Math.abs(index - curIndex) > length / 2) index += index > curIndex ? -length : length;
      var newIndex = gsap.utils.wrap(0, length, index);
      var time = times[newIndex];
      if (time > tl.time() !== index > curIndex) {
        vars.modifiers = { time: gsap.utils.wrap(0, tl.duration()) };
        time += tl.duration() * (index > curIndex ? 1 : -1);
      }
      curIndex = newIndex;
      vars.overwrite = true;
      return tl.tweenTo(time, vars);
    }

    tl.next = function (vars) { return toIndex(curIndex + 1, vars); };
    tl.previous = function (vars) { return toIndex(curIndex - 1, vars); };
    tl.current = function () { return curIndex; };
    tl.toIndex = function (index, vars) { return toIndex(index, vars); };
    tl.times = times;
    tl.progress(1, true).progress(0, true);
    if (config.reversed) {
      tl.vars.onReverseComplete();
      tl.reverse();
    }
    return tl;
  }

  function Marquee(wrapper) {
    if (!window.gsap) {
      F.error('[course-marquee] GSAP is required.');
      return;
    }
    this.wrapper = wrapper;
    this.items = F.dom.qsa(ITEM_SELECTOR, wrapper);
    if (this.items.length < 2) return;

    this.speed = F.units.toNumber(wrapper.dataset.flucoMarqueeSpeed) || DEFAULT_SPEED;
    this.offs = [];

    this.loop = horizontalLoop(this.items, {
      paused: F.device.prefersReducedMotion(),
      repeat: -1,
      speed: this.speed
    });

    this.addOverlays();
    this.bind();
  }

  Marquee.prototype.addOverlays = function () {
    var gsap = window.gsap;
    var self = this;
    this.items.forEach(function (item) {
      var img = item.querySelector('img');
      var alt = img ? img.alt.trim() : '';
      if (!alt) return;

      var overlay = F.dom.el('div', 'tape-item-overlay', { 'aria-hidden': 'true' });
      var text = F.dom.el('div', 'tape-item-text');
      text.textContent = alt; // textContent: alt comes from the CMS
      overlay.appendChild(text);
      item.appendChild(overlay);

      self.offs.push(F.on(item, 'mouseenter', function () {
        gsap.to(overlay, { duration: 0.3, autoAlpha: 1, overwrite: true });
        gsap.fromTo(text, { y: 16, opacity: 0 }, { duration: 0.25, y: 0, opacity: 1, overwrite: true });
      }));
      self.offs.push(F.on(item, 'mouseleave', function () {
        gsap.to(overlay, { duration: 0.3, autoAlpha: 0, overwrite: true });
        gsap.to(text, { duration: 0.25, y: 16, opacity: 0, overwrite: true });
      }));
    });
  };

  Marquee.prototype.bind = function () {
    var self = this;
    var gsap = window.gsap;
    // Slow down smoothly instead of freezing (timeScale 0 in the original).
    this.offs.push(F.on(this.wrapper, 'mouseenter', function () {
      gsap.to(self.loop, { timeScale: 0, duration: 0.4, overwrite: true });
    }));
    this.offs.push(F.on(this.wrapper, 'mouseleave', function () {
      gsap.to(self.loop, { timeScale: 1, duration: 0.4, overwrite: true });
    }));
    this.offs.push(F.on(document, 'visibilitychange', function () {
      document.hidden ? self.loop.pause() : self.loop.play();
    }));
  };

  Marquee.prototype.destroy = function () {
    this.loop.kill();
    this.offs.forEach(function (off) { off(); });
  };

  F.css(
    'course-marquee',
    [
      '.tape-item{position:relative}',
      '.tape-item-overlay{position:absolute;top:0;left:12px;width:calc(100% - 24px);height:100%;background:rgba(0,0,0,.5);color:#fff;padding:24px;visibility:hidden;opacity:0;pointer-events:none;box-sizing:border-box}'
    ].join('\n')
  );

  F.ready(function () {
    var wrapper = F.dom.qs('[data-fluco-marquee]') || F.dom.qs('.w-dyn-items');
    if (wrapper) window.Fluco.marquee = new Marquee(wrapper);
  }, 'course-marquee');
})(window, document);
