/*!
 * Fluco Core — shared runtime for the Manuvo Webflow scripts.
 *
 * Load this file ONCE per page, BEFORE any file from `scripts/`.
 * It exposes a single global, `window.Fluco`, and nothing else.
 *
 * Every feature script in `scripts/` is an IIFE that only touches
 * `window.Fluco` and its own DOM, so scripts can be combined freely on a
 * page without "Identifier has already been declared" errors.
 */
(function (window, document) {
  'use strict';

  var VERSION = '1.0.0';

  // Idempotent: a second copy of the core on the page is a no-op.
  if (window.Fluco && window.Fluco.version === VERSION) return;

  /* ------------------------------------------------------------------ */
  /* Logging                                                             */
  /* ------------------------------------------------------------------ */

  // Enable with `localStorage.setItem('fluco:debug', '1')` in the console.
  var debugEnabled = false;
  try {
    debugEnabled = window.localStorage.getItem('fluco:debug') === '1';
  } catch (e) {
    /* localStorage may be blocked; stay silent */
  }

  function log() {
    if (!debugEnabled) return;
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[Fluco]');
    console.log.apply(console, args);
  }

  function error() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[Fluco]');
    console.error.apply(console, args);
  }

  /* ------------------------------------------------------------------ */
  /* Ready                                                               */
  /* ------------------------------------------------------------------ */

  /**
   * Run `fn` after the Webflow runtime has initialised (interactions,
   * tabs, forms, etc.). Safe to call from <head> or <body>: the queue is
   * created if webflow.js has not loaded yet. Falls back to `load` on
   * pages without the Webflow runtime (local previews).
   */
  function ready(fn, name) {
    var done = false;

    function run() {
      if (done) return;
      done = true;
      try {
        fn();
      } catch (e) {
        error(name ? '[' + name + ']' : '', e);
      }
    }

    window.Webflow = window.Webflow || [];
    window.Webflow.push(run);

    // Webflow replaces the array with its own object once it boots.
    // If it is still a plain array after `load`, the runtime never loaded.
    function fallback() {
      if (!done && Array.isArray(window.Webflow)) run();
    }
    if (document.readyState === 'complete') setTimeout(fallback, 0);
    else window.addEventListener('load', fallback);
  }

  /* ------------------------------------------------------------------ */
  /* Breakpoints & device                                                */
  /* ------------------------------------------------------------------ */

  // Webflow's own breakpoints (max-width, inclusive).
  var BREAKPOINTS = Object.freeze({
    mobilePortrait: 479,
    mobileLandscape: 767,
    tablet: 991,
    desktopSmall: 1279,
    desktopMedium: 1439,
    desktopLarge: 1919
    // anything wider is `desktopHuge`
  });

  /** Fine-grained device name, matches the keys of BREAKPOINTS. */
  function deviceName(width) {
    var w = typeof width === 'number' ? width : window.innerWidth;
    if (w <= BREAKPOINTS.mobilePortrait) return 'mobilePortrait';
    if (w <= BREAKPOINTS.mobileLandscape) return 'mobileLandscape';
    if (w <= BREAKPOINTS.tablet) return 'tablet';
    if (w <= BREAKPOINTS.desktopSmall) return 'desktopSmall';
    if (w <= BREAKPOINTS.desktopMedium) return 'desktopMedium';
    if (w <= BREAKPOINTS.desktopLarge) return 'desktopLarge';
    return 'desktopHuge';
  }

  /** Coarse group: 'mobile' | 'tablet' | 'desktop'. */
  function deviceGroup(width) {
    var w = typeof width === 'number' ? width : window.innerWidth;
    if (w <= BREAKPOINTS.mobileLandscape) return 'mobile';
    if (w <= BREAKPOINTS.tablet) return 'tablet';
    return 'desktop';
  }

  /** True on devices whose primary input cannot hover (touch). */
  function isTouch() {
    return window.matchMedia('(hover: none)').matches;
  }

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* ------------------------------------------------------------------ */
  /* Units                                                               */
  /* ------------------------------------------------------------------ */

  function toNumber(value) {
    var n = typeof value === 'number' ? value : parseFloat(value);
    return isFinite(n) ? n : 0;
  }

  /** px -> vw relative to the current viewport. Returns a number. */
  function pxToVw(px, decimals) {
    var vw = (toNumber(px) / window.innerWidth) * 100;
    return typeof decimals === 'number' ? +vw.toFixed(decimals) : vw;
  }

  /** vw -> px relative to the current viewport. Returns a number. */
  function vwToPx(vw, decimals) {
    var px = (toNumber(vw) * window.innerWidth) / 100;
    return typeof decimals === 'number' ? +px.toFixed(decimals) : px;
  }

  /** px -> "12.34vw" string (viewport based). */
  function vw(px, decimals) {
    return pxToVw(px, typeof decimals === 'number' ? decimals : 3) + 'vw';
  }

  /** Design-file px (e.g. 1440 artboard) -> "vw" string. */
  function designVw(px, designWidth) {
    return (toNumber(px) / (designWidth || 1440)) * 100 + 'vw';
  }

  /* ------------------------------------------------------------------ */
  /* DOM                                                                 */
  /* ------------------------------------------------------------------ */

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  /** Webflow hides conditionally-invisible CMS elements with this class. */
  function isVisible(el) {
    return !!el && !el.classList.contains('w-condition-invisible');
  }

  function visible(list) {
    return Array.prototype.filter.call(list, isVisible);
  }

  function el(tag, className, attrs) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        node.setAttribute(key, attrs[key]);
      });
    }
    return node;
  }

  /** Parse "true" / "" (bare attribute) as true, everything else false. */
  function attrBool(value) {
    return value === 'true' || value === '';
  }

  /**
   * Inject a <style> once. `id` makes it idempotent, so a class that is
   * instantiated N times injects its CSS only once.
   */
  function css(id, text) {
    var styleId = 'fluco-style-' + id;
    var existing = document.getElementById(styleId);
    if (existing) return existing;
    var style = el('style', null, { id: styleId });
    style.textContent = text;
    document.head.appendChild(style);
    return style;
  }

  /* ------------------------------------------------------------------ */
  /* Events & timing                                                     */
  /* ------------------------------------------------------------------ */

  /** addEventListener that returns its own remover. */
  function on(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    return function off() {
      target.removeEventListener(type, handler, options);
    };
  }

  function debounce(fn, wait) {
    var timer = null;
    var debounced = function () {
      var ctx = this;
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        timer = null;
        fn.apply(ctx, args);
      }, wait || 150);
    };
    debounced.cancel = function () {
      clearTimeout(timer);
      timer = null;
    };
    return debounced;
  }

  /** Coalesce calls into one per animation frame (scroll / pointermove). */
  function rafThrottle(fn) {
    var scheduled = false;
    var lastArgs;
    var throttled = function () {
      lastArgs = arguments;
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(function () {
        scheduled = false;
        fn.apply(null, lastArgs);
      });
    };
    return throttled;
  }

  /** Debounced window resize; returns the remover. */
  function onResize(fn, wait) {
    return on(window, 'resize', debounce(fn, wait || 150));
  }

  /** Passive, rAF-throttled window scroll; returns the remover. */
  function onScroll(fn) {
    return on(window, 'scroll', rafThrottle(fn), { passive: true });
  }

  /** Simple pausable countdown used by carousels. */
  function Countdown(durationMs, onDone) {
    this.duration = durationMs;
    this.onDone = onDone;
    this.remaining = durationMs;
    this.startedAt = 0;
    this.timer = null;
    this.running = false;
  }
  Countdown.prototype.start = function () {
    this.remaining = this.duration;
    this.resume();
  };
  Countdown.prototype.resume = function () {
    if (this.running) return;
    var self = this;
    this.running = true;
    this.startedAt = Date.now();
    this.timer = setTimeout(function () {
      self.running = false;
      self.onDone();
    }, this.remaining);
  };
  Countdown.prototype.pause = function () {
    if (!this.running) return;
    clearTimeout(this.timer);
    this.running = false;
    this.remaining -= Date.now() - this.startedAt;
    if (this.remaining < 0) this.remaining = 0;
  };
  Countdown.prototype.stop = function () {
    clearTimeout(this.timer);
    this.running = false;
    this.remaining = this.duration;
  };

  /* ------------------------------------------------------------------ */
  /* Media helpers                                                       */
  /* ------------------------------------------------------------------ */

  /** 65 -> "1:05" */
  function formatTime(seconds) {
    var s = Math.max(0, Math.floor(toNumber(seconds)));
    var m = Math.floor(s / 60);
    var rest = s % 60;
    return m + ':' + (rest < 10 ? '0' + rest : rest);
  }

  var fullscreen = {
    request: function (node) {
      var fn =
        node.requestFullscreen ||
        node.webkitRequestFullscreen ||
        node.mozRequestFullScreen ||
        node.msRequestFullscreen;
      if (!fn) return Promise.reject(new Error('Fullscreen API unavailable'));
      var result = fn.call(node);
      return result && typeof result.then === 'function' ? result : Promise.resolve();
    },
    exit: function () {
      var fn =
        document.exitFullscreen ||
        document.webkitExitFullscreen ||
        document.mozCancelFullScreen ||
        document.msExitFullscreen;
      if (!fn) return Promise.resolve();
      var result = fn.call(document);
      return result && typeof result.then === 'function' ? result : Promise.resolve();
    },
    element: function () {
      return (
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement ||
        null
      );
    },
    onChange: function (handler) {
      var offs = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].map(
        function (type) {
          return on(document, type, handler);
        }
      );
      return function () {
        offs.forEach(function (off) {
          off();
        });
      };
    }
  };

  /** Load an external script once, returns a promise. */
  var scriptPromises = {};
  function loadScript(src) {
    if (scriptPromises[src]) return scriptPromises[src];
    scriptPromises[src] = new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[src="' + src + '"]');
      if (existing) {
        resolve();
        return;
      }
      var script = el('script', null, { src: src, async: '' });
      script.onload = resolve;
      script.onerror = function () {
        reject(new Error('Failed to load ' + src));
      };
      document.head.appendChild(script);
    });
    return scriptPromises[src];
  }

  /* ------------------------------------------------------------------ */
  /* Export                                                              */
  /* ------------------------------------------------------------------ */

  window.Fluco = {
    version: VERSION,
    log: log,
    error: error,
    ready: ready,
    breakpoints: BREAKPOINTS,
    device: {
      name: deviceName,
      group: deviceGroup,
      isTouch: isTouch,
      prefersReducedMotion: prefersReducedMotion
    },
    units: {
      pxToVw: pxToVw,
      vwToPx: vwToPx,
      vw: vw,
      designVw: designVw,
      toNumber: toNumber
    },
    dom: {
      qs: qs,
      qsa: qsa,
      el: el,
      isVisible: isVisible,
      visible: visible,
      attrBool: attrBool
    },
    css: css,
    on: on,
    onResize: onResize,
    onScroll: onScroll,
    debounce: debounce,
    rafThrottle: rafThrottle,
    Countdown: Countdown,
    formatTime: formatTime,
    fullscreen: fullscreen,
    loadScript: loadScript
  };
})(window, document);
