/*!
 * Navbar — hide-on-scroll-down / reveal-on-scroll-up navigation.
 * Replaces: navbar-new.js (current), navbar-active.js,
 *           and navbar.js / navbar-rc.js (legacy).
 * Requires: shared/fluco-core.js
 *
 * Markup: the navbar element gets `.scrolled` once the page is scrolled
 * past `scrollOffset`, and its `top` is animated between the two offset
 * tables below. Override per page with
 *   window.FlucoNavbarConfig = { selector: '.my-nav', ... }
 * BEFORE this script loads.
 */
(function (window, document) {
  'use strict';

  var F = window.Fluco;
  if (!F) {
    console.error('[navbar] Fluco core is missing. Load shared/fluco-core.js first.');
    return;
  }

  var DEFAULTS = {
    // First selector that matches wins: new redesign nav, then legacy nav.
    selector: '.redesign-navbar, .new-nav-wrapper',
    linksSelector: '.redesign-nav-links-wrapper a',
    burgerSelector: '.redesign-nav-button-icons-wrapper',
    scrollOffset: 40,
    scrollOffsetAdditional: 400,
    // Inline background applied while scrolled; null keeps the CSS value.
    scrolledBackground: '#FFFFFF',
    transition:
      'top 0.5s cubic-bezier(0.250, 0.460, 0.450, 0.940), height 0.5s cubic-bezier(0.250, 0.460, 0.450, 0.940), background-color 0.5s cubic-bezier(0.250, 0.460, 0.450, 0.940)',
    // `top` value when the nav is visible / hidden, per device.
    offsetVisible: {
      mobilePortrait: '0vw',
      mobileLandscape: '0vw',
      tablet: '0vw',
      desktopSmall: '0vw',
      desktopMedium: '0vw',
      desktopLarge: '0vw',
      desktopHuge: '0vw'
    },
    offsetHidden: {
      mobilePortrait: '-68px',
      mobileLandscape: '-68px',
      tablet: '-68px',
      desktopSmall: '-5.972vw',
      desktopMedium: '-5.972vw',
      desktopLarge: '-5.972vw',
      desktopHuge: '-5.972vw'
    },
    // Map of URL first segment -> nav href to mark as `.active`.
    activeMap: {
      work: '/work'
    },
    // Webflow marks the current nav link with `w--current` and styles it.
    // Its own detection only matches exact URLs, so section pages
    // (/blog/<post>, /training/<course>) lose the highlight — these rules
    // restore it by path prefix. Replaces: navbar-active.js
    activeLinkSelector: '.redesign-nav-link',
    activeCurrentClass: 'w--current',
    activePrefixes: [
      { path: '/blog', link: '/blog' },
      { path: '/training', link: '/training' }
    ]
  };

  function Navbar(nav, config) {
    this.nav = nav;
    this.cfg = config;
    this.body = document.body;
    this.links = F.dom.qsa(config.linksSelector, nav);
    this.burger = F.dom.qs(config.burgerSelector, nav);
    this.menuOpen = false;
    this.previousY = window.scrollY;
    this.defaultBackground = nav.style.backgroundColor;
    this.visibleTop = '0';
    this.hiddenTop = '0';
    this.offs = [];

    this.init();
  }

  Navbar.prototype.init = function () {
    this.nav.style.transition = this.cfg.transition;
    this.applyDevice();
    this.applyInitialState();
    this.highlightCurrentPage();

    this.offs.push(F.onScroll(this.onScroll.bind(this)));
    this.offs.push(F.onResize(this.onResize.bind(this)));
    if (this.burger) this.offs.push(F.on(this.burger, 'click', this.onBurger.bind(this)));
  };

  Navbar.prototype.applyDevice = function () {
    var name = F.device.name();
    this.visibleTop = this.cfg.offsetVisible[name] || '0';
    this.hiddenTop = this.cfg.offsetHidden[name] || '0';
  };

  Navbar.prototype.applyInitialState = function () {
    if (window.scrollY > this.cfg.scrollOffset) {
      this.nav.classList.add('scrolled', 'shadowed');
      this.setBackground(true);
    }
  };

  Navbar.prototype.setBackground = function (scrolled) {
    if (this.cfg.scrolledBackground === null) return;
    this.nav.style.backgroundColor = scrolled ? this.cfg.scrolledBackground : this.defaultBackground;
  };

  Navbar.prototype.onScroll = function () {
    var y = Math.max(0, window.scrollY);
    var prev = this.previousY;
    var offset = this.cfg.scrollOffset;

    if (!this.menuOpen) {
      var goingDown = y > prev;
      if (goingDown && y < offset) {
        this.nav.classList.add('scrolled');
        this.setBackground(true);
      } else if (goingDown && y > offset + this.cfg.scrollOffsetAdditional) {
        this.nav.style.top = this.hiddenTop;
      } else if (!goingDown && y > offset) {
        this.nav.style.top = this.visibleTop;
        this.setBackground(true);
      } else if (!goingDown && y < offset) {
        this.nav.classList.remove('scrolled');
        this.nav.style.top = this.visibleTop;
        this.setBackground(false);
      }
    }

    this.previousY = y;
  };

  Navbar.prototype.onResize = function () {
    this.applyDevice();
    // Closing the menu on resize keeps body scroll from staying locked
    // when the layout switches to desktop.
    if (this.menuOpen && F.device.group() === 'desktop') this.setMenu(false);
  };

  Navbar.prototype.onBurger = function () {
    this.setMenu(!this.menuOpen);
  };

  Navbar.prototype.setMenu = function (open) {
    this.menuOpen = open;
    this.body.style.overflow = open ? 'hidden' : '';
  };

  Navbar.prototype.highlightCurrentPage = function () {
    var slug = window.location.pathname.split('/')[1];
    var target = this.cfg.activeMap[slug];
    if (target) {
      this.links.forEach(function (link) {
        if (link.getAttribute('href') === target) link.classList.add('active');
      });
    }
    this.highlightSection();
  };

  /** Mark the section link with Webflow's own `w--current` on child pages. */
  Navbar.prototype.highlightSection = function () {
    var cfg = this.cfg;
    var path = window.location.pathname;
    var rules = cfg.activePrefixes || [];
    rules.forEach(function (rule) {
      if (path !== rule.path && path.indexOf(rule.path + '/') !== 0) return;
      F.dom.qsa(cfg.activeLinkSelector + '[href="' + rule.link + '"]').forEach(function (link) {
        link.classList.add(cfg.activeCurrentClass);
        // Webflow's own markup also carries aria-current on the active link.
        link.setAttribute('aria-current', 'page');
      });
    });
  };

  Navbar.prototype.destroy = function () {
    this.offs.forEach(function (off) {
      off();
    });
    this.setMenu(false);
  };

  F.ready(function () {
    var config = Object.assign({}, DEFAULTS, window.FlucoNavbarConfig || {});
    var nav = F.dom.qs(config.selector);
    if (!nav) {
      F.log('[navbar] No element matches', config.selector);
      return;
    }
    window.Fluco.navbar = new Navbar(nav, config);
  }, 'navbar');
})(window, document);
