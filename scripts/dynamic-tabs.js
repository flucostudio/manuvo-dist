/*!
 * Dynamic Tabs — auto-rotating Webflow tabs with a progress line and a
 * section height computed from the tallest tab.
 * Replaces: dynamic-tabs.js, dynamic-tabs-rc.js, dynamic-tabs-0.1.js
 * Requires: shared/fluco-core.js
 *
 * Markup (Webflow Tabs element):
 *   .w-tabs > .w-tab-menu > .w-tab-link
 *       .portfolio-temp-tab-link-heading
 *       .tab-progress-wrapper > .tab-progress-active
 *       .portfolio-temp-tab-link-subtext
 *   .w-tabs > .w-tab-content > .w-tab-pane > .portfolio-temp-tab-pic
 *
 * Optional: data-fluco-tabs-duration="10" on `.w-tabs` (seconds per tab).
 */
(function (window, document) {
  'use strict';

  var F = window.Fluco;
  if (!F) {
    console.error('[dynamic-tabs] Fluco core is missing. Load shared/fluco-core.js first.');
    return;
  }

  var DEFAULT_DURATION = 10; // seconds
  var PREVIEW_CLASS = 'playCarousel';

  function Tabs(root) {
    this.root = root;
    this.section = root.parentNode;
    this.menu = F.dom.qs('.w-tab-menu', root);
    this.content = F.dom.qs('.w-tab-content', root);
    this.duration = F.units.toNumber(root.dataset.flucoTabsDuration) || DEFAULT_DURATION;

    this.links = this.menu ? F.dom.visible(this.menu.querySelectorAll('.w-tab-link')) : [];
    this.panes = this.content ? F.dom.visible(this.content.querySelectorAll('.w-tab-pane')) : [];
    this.current = 0;
    this.offs = [];

    if (!this.menu || this.links.length === 0) return;

    var self = this;
    this.timer = new F.Countdown(this.duration * 1000, function () {
      self.goTo(self.current + 1);
    });

    this.init();
  }

  /* ---------- height ---------- */

  function vwOf(px) {
    return F.units.pxToVw(px, 2);
  }

  function styleVw(node, prop) {
    return vwOf(getComputedStyle(node).getPropertyValue(prop));
  }

  /**
   * The Webflow tabs section is absolutely positioned inside the parent,
   * so the parent needs an explicit height equal to the tallest content.
   * All reads happen before the single write to avoid layout thrashing.
   */
  Tabs.prototype.updateHeight = function () {
    var device = F.device.group();
    var measures = this.links.map(function (link, i) {
      var heading = link.querySelector('.portfolio-temp-tab-link-heading');
      var progress = link.querySelector('.tab-progress-wrapper');
      var subtext = link.querySelector('.portfolio-temp-tab-link-subtext');
      var media = this.panes[i] ? this.panes[i].querySelector('.portfolio-temp-tab-pic') : null;

      return {
        heading: heading ? vwOf(heading.offsetHeight) : 0,
        marginTop: styleVw(link, 'margin-top'),
        marginBottom: styleVw(link, 'margin-bottom'),
        progress: progress ? vwOf(progress.offsetHeight) : 0,
        subtext: subtext ? vwOf(subtext.offsetHeight) : 0,
        subtextPadTop: subtext ? styleVw(subtext, 'padding-top') : 0,
        subtextPadBottom: subtext ? styleVw(subtext, 'padding-bottom') : 0,
        media: media ? styleVw(media, 'height') : 0
      };
    }, this);

    var max = function (key) {
      return Math.max.apply(
        null,
        measures.map(function (m) {
          return m[key];
        })
      );
    };

    var gridGap = styleVw(this.menu, 'grid-row-gap');
    var headings = measures.reduce(function (sum, m) {
      return sum + m.heading;
    }, 0);

    var height;
    if (device === 'mobile') {
      var margins = measures.reduce(function (sum, m) {
        return sum + m.marginTop + m.marginBottom;
      }, 0);
      height =
        headings +
        margins +
        max('subtext') +
        max('subtextPadTop') +
        max('subtextPadBottom') +
        max('media') +
        max('progress') +
        (this.content ? styleVw(this.content, 'padding-bottom') : 0);
    } else {
      height =
        headings +
        max('subtext') +
        max('subtextPadTop') +
        max('subtextPadBottom') +
        max('progress') +
        gridGap * Math.max(0, measures.length - 1); // FIX: was `gap * n - 1`
      height = Math.max(height, max('media'));
    }

    this.section.style.height = height + 'vw';
  };

  /* ---------- rotation ---------- */

  Tabs.prototype.goTo = function (index) {
    this.current = ((index % this.links.length) + this.links.length) % this.links.length;
    // Webflow's own tab handler listens for click; a synthetic click is the
    // documented way to switch tabs from custom code.
    this.links[this.current].click();
  };

  Tabs.prototype.animateLine = function (index) {
    this.links.forEach(function (link, i) {
      var line = link.querySelector('.tab-progress-active');
      if (!line) return;
      line.classList.remove(PREVIEW_CLASS, 'paused');
      if (i === index) {
        // Force a reflow so the animation restarts from 0%.
        void line.offsetWidth;
        line.classList.add(PREVIEW_CLASS);
      }
    });

    var active = this.links[index];
    this.menu.scrollTo({ left: active.offsetLeft, behavior: 'smooth' });
  };

  Tabs.prototype.setPaused = function (paused) {
    if (paused) this.timer.pause();
    else this.timer.resume();
    var line = this.links[this.current].querySelector('.tab-progress-active');
    if (line) line.classList.toggle('paused', paused);
  };

  Tabs.prototype.init = function () {
    var self = this;

    // Webflow tab links carry `href="#"`; with an href, keyboard focus and
    // synthetic clicks can scroll the page. Strip it once.
    this.links.forEach(function (link) {
      link.removeAttribute('href');
      link.setAttribute('role', 'tab');
    });

    this.updateHeight();

    this.links.forEach(function (link, index) {
      self.offs.push(
        F.on(link, 'click', function (event) {
          if (event.isTrusted) self.current = index; // user click
          self.animateLine(self.current);
          self.timer.start();
        })
      );
    });

    if (!F.device.isTouch()) {
      this.offs.push(
        F.on(this.menu, 'mouseenter', function () {
          self.setPaused(true);
        })
      );
      this.offs.push(
        F.on(this.menu, 'mouseleave', function () {
          self.setPaused(false);
        })
      );
    }

    // Pause when the tab is in the background so tabs do not spin unseen.
    this.offs.push(
      F.on(document, 'visibilitychange', function () {
        self.setPaused(document.hidden);
      })
    );

    this.offs.push(F.onResize(this.updateHeight.bind(this)));

    this.goTo(0);
  };

  Tabs.prototype.destroy = function () {
    this.timer.stop();
    this.offs.forEach(function (off) {
      off();
    });
  };

  /* ------------------------------------------------------------------ */

  F.css(
    'dynamic-tabs',
    [
      '@keyframes ' + PREVIEW_CLASS + '{from{width:0%}to{width:100%}}',
      '.' + PREVIEW_CLASS + '{display:block;animation:' + PREVIEW_CLASS + ' var(--fluco-tabs-duration,' + DEFAULT_DURATION + 's) linear forwards}',
      '.' + PREVIEW_CLASS + '.paused{animation-play-state:paused}',
      '.w-tab-menu::-webkit-scrollbar{display:none}',
      '.w-tab-menu{-ms-overflow-style:none;scrollbar-width:none}',
      '@media (prefers-reduced-motion:reduce){.' + PREVIEW_CLASS + '{animation-duration:.01s}}'
    ].join('\n')
  );

  F.ready(function () {
    window.Fluco.tabs = F.dom.qsa('.w-tabs').map(function (root) {
      var duration = F.units.toNumber(root.dataset.flucoTabsDuration) || DEFAULT_DURATION;
      root.style.setProperty('--fluco-tabs-duration', duration + 's');
      return new Tabs(root);
    });
  }, 'dynamic-tabs');
})(window, document);
