/*!
 * Program hero — background video behind the program page hero.
 * Replaces: program-hero.js
 * Requires: shared/fluco-core.js
 *
 * Markup:
 *   <section class="section-program-hero"
 *            data-video-url="https://…/hero.mp4"
 *            data-poster-url="https://…/poster.jpg">
 *     <div id="hero-background"></div>
 *   </section>
 * `data-fluco-video-url` / `data-fluco-poster-url` are also accepted.
 */
(function (window, document) {
  'use strict';

  var F = window.Fluco;
  if (!F) {
    console.error('[program-hero] Fluco core is missing. Load shared/fluco-core.js first.');
    return;
  }

  var SECTION = '.section-program-hero';
  var MOUNT = '#hero-background';
  var VIDEO_ID = 'heroBackgroundVideo';

  var CSS =
    '#' + VIDEO_ID + '{pointer-events:none;object-fit:cover;}';

  function ProgramHero(section) {
    this.section = section;
    this.mount = F.dom.qs(MOUNT, section);
    this.video = null;

    var url = section.dataset.flucoVideoUrl || section.dataset.videoUrl;
    if (!this.mount || !url) {
      F.log('[program-hero] Missing #hero-background or data-video-url, skipping');
      return;
    }
    F.css('program-hero', CSS);
    this.render(url, section.dataset.flucoPosterUrl || section.dataset.posterUrl);
  }

  ProgramHero.prototype.render = function (url, poster) {
    // Built with the DOM API rather than innerHTML: both URLs come from the
    // CMS, and interpolating them into markup is a stored-XSS vector.
    var video = F.dom.el('video', 'redesign-home-hero-bg', { id: VIDEO_ID, preload: 'auto' });
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('aria-hidden', 'true');
    if (poster) video.poster = poster;

    var source = F.dom.el('source', null, { type: 'video/mp4' });
    source.src = url;
    video.appendChild(source);

    this.video = video;
    this.mount.textContent = '';
    this.mount.appendChild(video);

    var play = video.play();
    if (play && typeof play.catch === 'function') {
      play.catch(function (e) {
        F.log('[program-hero] Autoplay refused:', e && e.name);
      });
    }
  };

  ProgramHero.prototype.destroy = function () {
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
    window.Fluco.programHero = new ProgramHero(section);
  }, 'program-hero');
})(window, document);
