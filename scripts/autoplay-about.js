/*!
 * Autoplay About — YouTube player inside the founder modal.
 * Replaces: tests/autoplay-about.js
 * Requires: shared/fluco-core.js, YouTube IFrame API
 *
 * Markup:
 *   #autoplay-about                (open / play button)
 *   #autoplay-about-video          (player mount, data-fluco-youtube-id="xjNoAXCnB-k")
 *   #about-founder-modal-close     (close button)
 *   .about-founder-modal-bg        (backdrop)
 * The YouTube API script is loaded on demand, only when the page has the
 * player mount, instead of on every page.
 */
(function (window, document) {
  'use strict';

  var F = window.Fluco;
  if (!F) {
    console.error('[autoplay-about] Fluco core is missing. Load shared/fluco-core.js first.');
    return;
  }

  var YT_API = 'https://www.youtube.com/iframe_api';
  var DEFAULT_VIDEO_ID = 'xjNoAXCnB-k';

  function loadYouTube() {
    if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
    return new Promise(function (resolve) {
      var previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        if (typeof previous === 'function') previous();
        resolve(window.YT);
      };
      F.loadScript(YT_API).catch(function (err) {
        F.error('[autoplay-about]', err);
      });
    });
  }

  function AutoplayAbout(mount) {
    this.mount = mount;
    this.videoId = mount.dataset.flucoYoutubeId || DEFAULT_VIDEO_ID;
    this.button = F.dom.qs('#autoplay-about');
    this.close = F.dom.qs('#about-founder-modal-close');
    this.backdrop = F.dom.qs('.about-founder-modal-bg');
    this.player = null;
    this.ready = false;
    this.pendingPlay = false;

    var self = this;
    loadYouTube().then(function (YT) {
      self.player = new YT.Player(mount, {
        height: 'auto',
        width: '100%',
        videoId: self.videoId,
        playerVars: { rel: 0, playsinline: 1 },
        events: {
          onReady: function () {
            self.ready = true;
            if (self.pendingPlay) self.play();
          }
        }
      });
    });

    this.bind();
  }

  AutoplayAbout.prototype.play = function () {
    if (!this.ready) {
      this.pendingPlay = true;
      return;
    }
    this.pendingPlay = false;
    this.player.playVideo();
  };

  AutoplayAbout.prototype.pause = function () {
    this.pendingPlay = false;
    if (this.ready) this.player.pauseVideo();
  };

  AutoplayAbout.prototype.bind = function () {
    var self = this;
    if (this.button) F.on(this.button, 'click', function () { self.play(); });
    if (this.close) F.on(this.close, 'click', function () { self.pause(); });
    if (this.backdrop) F.on(this.backdrop, 'click', function () { self.pause(); });
    F.on(document, 'keydown', function (e) {
      if (e.key === 'Escape') self.pause();
    });
  };

  F.ready(function () {
    var mount = F.dom.qs('#autoplay-about-video');
    if (mount) window.Fluco.autoplayAbout = new AutoplayAbout(mount);
  }, 'autoplay-about');
})(window, document);
