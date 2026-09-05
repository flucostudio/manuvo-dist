/*!
 * Community hero video — autoplaying muted background video in the hero.
 * Replaces: community-hero-video.js
 * Requires: shared/fluco-core.js
 *
 * Markup:
 *   <div class="community-hero" data-video-url="https://…/hero.mp4">
 *     <div class="community-hero-video-wrapper"></div>
 *   </div>
 * `data-fluco-video-url` is also accepted.
 */
(function (window, document) {
  'use strict';

  var F = window.Fluco;
  if (!F) {
    console.error('[community-hero-video] Fluco core is missing. Load shared/fluco-core.js first.');
    return;
  }

  var SECTION = '.community-hero';
  var WRAPPER = '.community-hero-video-wrapper';

  function HeroVideo(section) {
    this.section = section;
    this.wrapper = F.dom.qs(WRAPPER, section);
    this.video = null;

    var url = section.dataset.flucoVideoUrl || section.dataset.videoUrl;
    if (!this.wrapper || !url) {
      F.log('[community-hero-video] Missing wrapper or data-video-url, skipping');
      return;
    }
    this.mount(url);
  }

  HeroVideo.prototype.mount = function (url) {
    var video = F.dom.el('video');
    video.src = url;
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    // iOS < 10 still needs the attribute form to avoid going fullscreen.
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('aria-hidden', 'true');
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';

    this.video = video;
    this.wrapper.appendChild(video);

    // Autoplay can still be refused (low power mode); nothing to do but log.
    var play = video.play();
    if (play && typeof play.catch === 'function') {
      play.catch(function (e) {
        F.log('[community-hero-video] Autoplay refused:', e && e.name);
      });
    }
  };

  HeroVideo.prototype.destroy = function () {
    if (!this.video) return;
    this.video.pause();
    this.video.removeAttribute('src');
    this.video.load();
    if (this.video.parentNode) this.video.parentNode.removeChild(this.video);
    this.video = null;
  };

  F.ready(function () {
    var section = F.dom.qs(SECTION);
    if (!section) return;
    window.Fluco.communityHeroVideo = new HeroVideo(section);
  }, 'community-hero-video');
})(window, document);
