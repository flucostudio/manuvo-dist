/*!
 * Video overlay — swaps a poster block for an inline Vimeo player on click.
 * Replaces: about-video.js, tests/program-overview-video.js and
 *           training-overview-video.js (the same component three times over,
 *           differing only in selectors and where the video id comes from)
 * Requires: shared/fluco-core.js, Vimeo Player API
 *
 * Markup (either the existing classes, or the data-attribute form):
 *   <div class="about-overview-video-wrapper" data-fluco-vimeo-id="1085000174">
 *   <!-- or, on resource pages: data-video-id="…" -->
 *     <div class="about-overview-video-overlay">…</div>
 *   </div>
 *   <button class="about-overview-video-button">Play</button>
 *
 * The player is inserted as a sibling right after the poster block, so it
 * inherits the section's layout without touching the Webflow markup.
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

  // Both pages ship the same structure under a different prefix.
  var PRESETS = [
    { prefix: 'about-overview-video' },
    { prefix: 'program-overview-video' }
  ];

  function VideoOverlay(section, button, overlay, videoId) {
    this.section = section;
    this.button = button;
    this.overlay = overlay;
    this.videoId = videoId;
    this.player = null;
    this.playing = false;
    this.offs = [];

    this.wrapper = F.dom.el('div', 'vimeo-video-wrapper');
    this.wrapper.style.display = 'none';
    this.mount = F.dom.el('div', 'vimeo-video');
    this.mount.style.display = 'none';
    this.wrapper.appendChild(this.mount);
    section.parentNode.insertBefore(this.wrapper, section.nextSibling);

    this.init();
  }

  VideoOverlay.prototype.init = function () {
    var self = this;
    this.player = new window.Vimeo.Player(this.mount, {
      url: 'https://vimeo.com/' + this.videoId,
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
  };

  VideoOverlay.prototype.show = function () {
    this.playing = true;
    this.wrapper.style.display = 'block';
    this.mount.style.display = 'block';
    this.section.style.display = 'none';
    if (this.overlay) {
      this.overlay.style.display = 'none';
      this.overlay.style.opacity = 0;
    }
    this.player.setVolume(1);
    // play() rejects when the browser blocks unmuted playback; the click
    // gesture normally satisfies it, but never let it surface as unhandled.
    var played = this.player.play();
    if (played && typeof played.catch === 'function') {
      played.catch(function (e) {
        F.log('[video-overlay] play refused:', e && e.name);
      });
    }
  };

  VideoOverlay.prototype.hide = function () {
    this.playing = false;
    this.wrapper.style.display = 'none';
    this.mount.style.display = 'none';
    this.section.style.display = 'block';
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
    if (this.wrapper.parentNode) this.wrapper.parentNode.removeChild(this.wrapper);
    this.section.style.display = '';
  };

  function build(preset) {
    var section = F.dom.qs('.' + preset.prefix + '-wrapper');
    var button = F.dom.qs('.' + preset.prefix + '-button');
    if (!section || !button) return null;
    var overlay = F.dom.qs('.' + preset.prefix + '-overlay', section);
    // training-overview-video.js took the id from data-video-id per item
    // (resource pages each show a different film); about/program hardcoded it.
    var videoId = section.dataset.flucoVimeoId || section.dataset.videoId || DEFAULT_VIDEO_ID;
    return new VideoOverlay(section, button, overlay, videoId);
  }

  F.ready(function () {
    var present = PRESETS.filter(function (preset) {
      return F.dom.qs('.' + preset.prefix + '-wrapper') && F.dom.qs('.' + preset.prefix + '-button');
    });
    if (!present.length) return;

    var start = function () {
      window.Fluco.videoOverlays = present.map(build).filter(Boolean);
    };

    if (window.Vimeo && window.Vimeo.Player) start();
    else F.loadScript(VIMEO_API).then(start, function (e) {
      F.error('[video-overlay] Vimeo Player API failed to load', e);
    });
  }, 'video-overlay');
})(window, document);
