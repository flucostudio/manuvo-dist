/*!
 * Video overlay — swaps a poster block for an inline Vimeo player on click.
 * Replaces four copies of the same component:
 *   about-video.js, tests/program-overview-video.js,
 *   training-overview-video.js, case-study-dynamic-assets.js
 * Requires: shared/fluco-core.js, Vimeo Player API
 *
 * They differed only in three things, which are the fields of a preset:
 *   - where the video id comes from (hardcoded / data attribute / element text)
 *   - what gets hidden while the player is open (the block itself, or an
 *     inner wrapper)
 *   - where the player is inserted (next to the block, or inside a child)
 *
 * Markup, "sibling" form (about / program / resources):
 *   <div class="about-overview-video-wrapper" data-video-id="1085000174">
 *     <div class="about-overview-video-overlay">…</div>
 *   </div>
 *   <button class="about-overview-video-button">Play</button>
 *
 * Markup, "inside" form (case studies, repeats per section):
 *   <section class="about-overview">
 *     <div class="case-study-asset">
 *       <div class="case-study-asset-content-wrapper">…</div>
 *       <div class="case-study-asset-url">1085000174</div>
 *       <div class="program-overview-video-overlay">…</div>
 *       <button class="case-study-asset-video-button">Play</button>
 *     </div>
 *   </section>
 */
(function (window, document) {
  'use strict';

  var F = window.Fluco;
  if (!F) {
    console.error('[video-overlay] Fluco core is missing. Load shared/fluco-core.js first.');
    return;
  }

  var VIMEO_API = 'https://player.vimeo.com/api/player.js';
  var DEFAULT_VIDEO_ID = '1085000174';

  var PRESETS = [
    {
      name: 'about',
      root: '.about-overview-video-wrapper',
      button: '.about-overview-video-button',
      overlay: '.about-overview-video-overlay'
    },
    {
      name: 'program',
      root: '.program-overview-video-wrapper',
      button: '.program-overview-video-button',
      overlay: '.program-overview-video-overlay'
    },
    {
      // One per section, and there can be several sections on a page.
      name: 'case-study',
      root: '.about-overview',
      all: true,
      requires: '.case-study-asset-url',
      idFrom: '.case-study-asset-url',
      button: '.case-study-asset-video-button',
      overlay: '.program-overview-video-overlay',
      hide: '.case-study-asset-content-wrapper',
      mount: '.case-study-asset'
    }
  ];

  function videoIdFor(root, preset) {
    if (preset.idFrom) {
      var node = F.dom.qs(preset.idFrom, root);
      var text = node ? (node.textContent || '').trim() : '';
      if (text) return text;
    }
    return root.dataset.flucoVimeoId || root.dataset.videoId || DEFAULT_VIDEO_ID;
  }

  function VideoOverlay(root, preset) {
    var self = this;
    this.preset = preset;
    this.root = root;
    this.player = null;
    this.offs = [];

    // Scope the button to the section when sections repeat, otherwise the
    // first one on the page would drive every player.
    this.button = preset.all ? F.dom.qs(preset.button, root) : F.dom.qs(preset.button);
    this.overlay = F.dom.qs(preset.overlay, root);
    // What disappears while the video plays.
    this.hidden = preset.hide ? F.dom.qs(preset.hide, root) : root;
    if (!this.button || !this.hidden) return;

    this.wrapper = F.dom.el('div', 'vimeo-video-wrapper');
    this.wrapper.style.display = 'none';
    this.mount = F.dom.el('div', 'vimeo-video');
    this.mount.style.display = 'none';
    this.wrapper.appendChild(this.mount);

    var host = preset.mount ? F.dom.qs(preset.mount, root) : null;
    if (host) host.appendChild(this.wrapper);
    else root.parentNode.insertBefore(this.wrapper, root.nextSibling);

    this.player = new window.Vimeo.Player(this.mount, {
      url: 'https://vimeo.com/' + videoIdFor(root, preset),
      responsive: true
    });
    this.player.setVolume(0);
    this.player.on('ended', function () {
      self.hide();
    });

    this.offs.push(
      F.on(this.button, 'click', function (event) {
        event.preventDefault();
        self.show();
      })
    );
  }

  VideoOverlay.prototype.show = function () {
    this.wrapper.style.display = 'block';
    this.mount.style.display = 'block';
    this.hidden.style.display = 'none';
    if (this.overlay) {
      this.overlay.style.display = 'none';
      this.overlay.style.opacity = 0;
    }
    this.player.setVolume(1);
    var played = this.player.play();
    if (played && typeof played.catch === 'function') {
      played.catch(function (e) {
        F.log('[video-overlay] play refused:', e && e.name);
      });
    }
  };

  VideoOverlay.prototype.hide = function () {
    this.wrapper.style.display = 'none';
    this.mount.style.display = 'none';
    this.hidden.style.display = 'block';
    if (this.overlay) {
      this.overlay.style.display = 'flex';
      this.overlay.style.opacity = 1;
    }
    this.player.pause();
  };

  VideoOverlay.prototype.destroy = function () {
    this.offs.forEach(function (off) {
      off();
    });
    this.offs = [];
    if (this.player) this.player.destroy();
    if (this.wrapper && this.wrapper.parentNode) this.wrapper.parentNode.removeChild(this.wrapper);
    if (this.hidden) this.hidden.style.display = '';
  };

  /** Roots this preset applies to on the current page. */
  function rootsFor(preset) {
    var roots = preset.all ? F.dom.qsa(preset.root) : [F.dom.qs(preset.root)].filter(Boolean);
    return roots.filter(function (root) {
      if (preset.requires && !F.dom.qs(preset.requires, root)) return false;
      return preset.all ? !!F.dom.qs(preset.button, root) : !!F.dom.qs(preset.button);
    });
  }

  F.ready(function () {
    var work = [];
    PRESETS.forEach(function (preset) {
      rootsFor(preset).forEach(function (root) {
        work.push({ root: root, preset: preset });
      });
    });
    if (!work.length) return;

    var start = function () {
      window.Fluco.videoOverlays = work.map(function (item) {
        return new VideoOverlay(item.root, item.preset);
      });
      F.log('[video-overlay] mounted:', work.length);
    };

    if (window.Vimeo && window.Vimeo.Player) start();
    else
      F.loadScript(VIMEO_API).then(start, function (e) {
        F.error('[video-overlay] Vimeo Player API failed to load', e);
      });
  }, 'video-overlay');
})(window, document);
