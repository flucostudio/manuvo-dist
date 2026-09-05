/*!
 * Changemakers Videos — episode cards that open a Vimeo player in place of
 * the hero and auto-advance to the next episode.
 * Replaces: tests/changemakers-parent.js (+ -new, -tests copies)
 * Requires: shared/fluco-core.js, Vimeo Player API (window.Vimeo)
 *
 * Markup:
 *   .new-home-hero                                  (section replaced by the player)
 *   .new-changemakers-episodes-collection-list .w-dyn-item
 *     .new-changemakers-episodes-card[data-fluco-video-link="123456789"]
 *       .new-changemakers-episodes-card-thumbnail
 *       .new-changemakers-episodes-card-playing-tag
 *
 * Players are created lazily on first click: the original created one
 * Vimeo iframe per card at page load.
 */
(function (window, document) {
  'use strict';

  var F = window.Fluco;
  if (!F) {
    console.error('[changemakers-videos] Fluco core is missing. Load shared/fluco-core.js first.');
    return;
  }

  var VIMEO_OPTIONS = {
    chromecast: false,
    airplay: false,
    byline: false,
    pip: false,
    title: false,
    vimeo_logo: false,
    responsive: true
  };

  function Changemakers(list, section) {
    this.list = list;
    this.section = section;
    this.sectionDisplay = getComputedStyle(section).display;
    this.current = -1;
    this.offs = [];

    this.wrapper = F.dom.el('div', 'vimeo-video-wrapper');
    section.parentNode.insertBefore(this.wrapper, section.nextSibling);

    this.videos = F.dom.qsa('.w-dyn-item', list)
      .map(function (item, index) {
        var card = item.querySelector('.new-changemakers-episodes-card');
        if (!card) return null;
        var link = (card.dataset.flucoVideoLink || '').trim();
        if (!link) return null;
        var host = F.dom.el('div', null, { id: 'vimeo-video-' + index });
        host.style.display = 'none';
        this.wrapper.appendChild(host);
        return {
          index: index,
          card: card,
          link: link,
          host: host,
          thumb: card.querySelector('.new-changemakers-episodes-card-thumbnail'),
          tag: card.querySelector('.new-changemakers-episodes-card-playing-tag'),
          player: null
        };
      }, this)
      .filter(Boolean);

    this.bind();
  }

  /** Accepts a numeric id or a full vimeo.com URL. */
  function vimeoUrl(link) {
    if (/^https?:\/\//i.test(link)) return link;
    return 'https://vimeo.com/' + encodeURIComponent(link.replace(/\D/g, ''));
  }

  Changemakers.prototype.getPlayer = function (video) {
    if (video.player) return video.player;
    if (!window.Vimeo || !window.Vimeo.Player) {
      F.error('[changemakers-videos] Vimeo Player API is not loaded.');
      return null;
    }
    var self = this;
    var player = new window.Vimeo.Player(video.host, Object.assign({ url: vimeoUrl(video.link) }, VIMEO_OPTIONS));
    player.on('ended', function () {
      self.onEnded(video);
    });
    video.player = player;
    return player;
  };

  Changemakers.prototype.bind = function () {
    var self = this;
    this.videos.forEach(function (video) {
      if (!video.thumb) return;
      video.thumb.setAttribute('role', 'button');
      video.thumb.setAttribute('tabindex', '0');
      self.offs.push(F.on(video.thumb, 'click', function () { self.show(video); }));
      self.offs.push(F.on(video.thumb, 'keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          self.show(video);
        }
      }));
    });
  };

  Changemakers.prototype.hideAll = function () {
    this.videos.forEach(function (video) {
      if (video.player) video.player.pause();
      video.host.style.display = 'none';
      video.card.classList.remove('playing');
      if (video.tag) video.tag.style.display = 'none';
    });
    this.wrapper.style.display = 'none';
    this.section.style.display = this.sectionDisplay;
    this.current = -1;
  };

  Changemakers.prototype.show = function (video) {
    var player = this.getPlayer(video);
    if (!player) return;

    this.hideAll();
    this.current = this.videos.indexOf(video);

    this.wrapper.style.display = 'block';
    video.host.style.display = 'block';
    this.section.style.display = 'none';
    video.card.classList.add('playing');
    if (video.tag) video.tag.style.display = 'block';

    player.setVolume(1);
    player.play().catch(function (err) {
      F.log('[changemakers-videos] play rejected:', err && err.name);
    });
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };

  Changemakers.prototype.onEnded = function (video) {
    var next = this.videos[this.videos.indexOf(video) + 1];
    if (next) this.show(next);
    else this.hideAll();
  };

  Changemakers.prototype.destroy = function () {
    this.hideAll();
    this.videos.forEach(function (video) {
      if (video.player) video.player.destroy();
    });
    this.offs.forEach(function (off) { off(); });
    this.wrapper.remove();
  };

  F.css(
    'changemakers-videos',
    [
      '.vimeo-video-wrapper{display:none;position:relative;margin-top:5.972vw}',
      '.new-changemakers-episodes-card.playing{cursor:default}',
      '.new-changemakers-episodes-card.playing .new-changemakers-episodes-card-thumbnail{pointer-events:none}',
      '.new-changemakers-episodes-card .new-changemakers-episodes-card-play{opacity:0;visibility:hidden;transition:opacity .3s cubic-bezier(.165,.84,.44,1),visibility .3s cubic-bezier(.165,.84,.44,1)}',
      '.new-changemakers-episodes-card:hover .new-changemakers-episodes-card-play,.new-changemakers-episodes-card-thumbnail:focus-visible .new-changemakers-episodes-card-play{opacity:1;visibility:visible}',
      '.new-changemakers-episodes-card.playing .new-changemakers-episodes-card-play{opacity:0;visibility:hidden}',
      '@media (max-width:991px){',
      '.new-changemakers-episodes-card .new-changemakers-episodes-card-play{opacity:1;visibility:visible}',
      '.new-changemakers-episodes-card.playing .new-changemakers-episodes-card-play{opacity:0;visibility:hidden}',
      '}',
      '@media (max-width:479px){.vimeo-video-wrapper{margin-top:68px}}'
    ].join('\n')
  );

  F.ready(function () {
    var list = F.dom.qs('.new-changemakers-episodes-collection-list');
    var section = F.dom.qs('.new-home-hero');
    if (list && section) window.Fluco.changemakers = new Changemakers(list, section);
  }, 'changemakers-videos');
})(window, document);
