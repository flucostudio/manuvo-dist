/*!
 * Video Player — custom <video> player for portfolio pages.
 * Replaces: autoplay-video.js (+ all its copies).
 * Requires: shared/fluco-core.js
 *
 * Markup (Webflow):
 *   <div class="videoLink"
 *        data-fluco-video-src="https://…/video.mp4"
 *        data-fluco-poster-src="https://…/poster.jpg"   (optional)
 *        data-fluco-controls="true"                     (optional)
 *        data-fluco-loop="true"                         (optional)
 *        data-fluco-autoplay="true"                     (optional)
 *        data-fluco-muted="true"                        (optional)
 *        data-fluco-alignment="true"></div>             (optional, gallery grid)
 *
 * The element is replaced by `.video-wrapper > .video-player > video`
 * plus `.media-controls` when controls are enabled. CSS class names are
 * unchanged from the original script so existing Webflow styles keep working.
 */
(function (window, document) {
  'use strict';

  var F = window.Fluco;
  if (!F) {
    console.error('[video-player] Fluco core is missing. Load shared/fluco-core.js first.');
    return;
  }

  var SELECTOR = '.videoLink';
  var DEFAULT_VOLUME = 1;
  // iOS shows a black frame instead of the first frame when preload="none".
  // Seeking a fraction of a second in forces the poster frame to render.
  var START_OFFSET = 0.1;
  var CONTROLS_HIDE_DELAY = 3000;

  var ICONS = {
    initPlay:
      'PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+DTxjaXJjbGUgY3g9IjYwIiBjeT0iNjAiIHI9IjYwIiBmaWxsPSIjRjFFREU4Ii8+DTxwYXRoIGQ9Ik01Ni44NSA1Mi40NzI2TDY3LjkzMjIgNjBMNTYuODUgNjcuNTI3NEw1Ni44NSA1Mi40NzI2WiIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4NPC9zdmc+',
    play:
      'PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NPHBhdGggZD0iTTcuMzUgNC40NzI2MUwxOC40MzIyIDEyTDcuMzUgMTkuNTI3NEw3LjM1IDQuNDcyNjFaIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjEuMiIvPg08L3N2Zz4=',
    pause:
      'PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NPHBhdGggZD0iTTcgMTlMNyA1IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjEuMiIvPg08cGF0aCBkPSJNMTcgMTlMMTcgNSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4NPC9zdmc+',
    fullscreen:
      'PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NPHBhdGggZD0iTTE0LjUgOS41TDE5LjUgNC41TTE5LjUgNC41VjguNU0xOS41IDQuNUgxNS41TTkuNSA5LjVMNC41IDQuNU00LjUgNC41VjguNU00LjUgNC41SDguNU0xNC41IDE0LjVMMTkuNSAxOS41TTE5LjUgMTkuNVYxNS41TTE5LjUgMTkuNUgxNS41TTkuNSAxNC41TDQuNSAxOS41TTQuNSAxOS41VjE1LjVNNC41IDE5LjVIOC41IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjEuMiIvPg08L3N2Zz4=',
    fullscreenExit:
      'PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NPHBhdGggZD0iTTE5LjUgNC41TDE0LjUgOS41TTE0LjUgOS41VjUuNU0xNC41IDkuNUgxOC41TTQuNSA0LjVMOS41IDkuNU05LjUgOS41VjUuNU05LjUgOS41SDUuNU0xOS41IDE5LjVMMTQuNSAxNC41TTE0LjUgMTQuNVYxOC41TTE0LjUgMTQuNUgxOC41TTQuNSAxOS41TDkuNSAxNC41TTkuNSAxNC41VjE4LjVNOS41IDE0LjVINS41IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjEuMiIvPg08L3N2Zz4=',
    mute:
      'PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NPHBhdGggZD0iTTMgMTVWOUg3TDEwIDVIMTRWMTlIMTBMNyAxNUgzWiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4NPHBhdGggZD0iTTE2LjI0MjYgMTYuMjQyNkMxNy4zNjc5IDE1LjExNzQgMTggMTMuNTkxMyAxOCAxMkMxOCAxMC40MDg3IDE3LjM2NzkgOC44ODI1OCAxNi4yNDI2IDcuNzU3MzYiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMS4yIi8+DTxwYXRoIGQ9Ik0xOC4zNjQgMTguMzY0QzIwLjA1MTggMTYuNjc2MSAyMSAxNC4zODY5IDIxIDEyQzIxIDkuNjEzMDUgMjAuMDUxOCA3LjMyMzg3IDE4LjM2NCA1LjYzNjA0IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjEuMiIvPg08L3N2Zz4=',
    unmute:
      'PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NPHBhdGggZD0iTTExLjI1IDhMMTMuNSA1SDE3LjVWMTMuNzVNOCA4SDYuNVYxNUgxMC41TDEzLjUgMTlIMTcuNVYxNy41IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjEuMiIvPg08cGF0aCBkPSJNNCA0TDIwIDIwIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjEuMiIvPg08L3N2Zz4='
  };

  var el = F.dom.el;
  var attrBool = F.dom.attrBool;

  /* ------------------------------------------------------------------ */

  function VideoPlayer(link) {
    this.link = link;
    this.parent = link.parentNode;

    var d = link.dataset;
    this.opts = {
      src: d.flucoVideoSrc || '',
      poster: d.flucoPosterSrc || '',
      controls: attrBool(d.flucoControls),
      loop: attrBool(d.flucoLoop),
      autoplay: attrBool(d.flucoAutoplay),
      muted: attrBool(d.flucoMuted),
      alignment: attrBool(d.flucoAlignment)
    };

    if (!this.opts.src) {
      F.error('[video-player] Missing data-fluco-video-src on', link);
      return;
    }

    this.playing = false;
    this.playedOnce = false;
    this.volume = DEFAULT_VOLUME;
    this.orientation = null;
    this.device = F.device.group();
    this.hideTimer = null;
    this.offs = [];

    this.build();
    this.bindVideo();
    if (this.opts.controls) {
      this.buildControls();
      this.bindControls();
    }
    this.offs.push(F.onResize(this.onResize.bind(this)));
  }

  /* ---------- DOM ---------- */

  VideoPlayer.prototype.build = function () {
    var o = this.opts;

    this.wrapper = el('div', 'video-wrapper');
    this.player = el('div', 'video-player');
    if (o.autoplay && !o.alignment) this.wrapper.classList.add('hidden');

    var video = (this.video = el('video', 'videoTrailer'));
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.preload = o.poster ? 'none' : 'metadata';
    if (o.poster) video.poster = o.poster;
    if (o.loop) video.loop = true;
    // Browsers only allow autoplay when muted.
    video.muted = o.autoplay || o.muted;
    video.autoplay = o.autoplay;
    video.disablePictureInPicture = true;
    video.setAttribute('controlslist', 'nodownload noplaybackrate');

    var source = el('source', null, { type: 'video/mp4' });
    source.src = o.src + '#t=' + START_OFFSET;

    video.appendChild(source);
    this.player.appendChild(video);
    this.wrapper.appendChild(this.player);
    this.parent.appendChild(this.wrapper);
    this.link.remove();
  };

  VideoPlayer.prototype.buildControls = function () {
    this.parent.style.position = 'relative';

    var c = (this.controls = {
      root: el('div', 'media-controls'),
      clickArea: el('div', 'media-controls-clickable-area'),
      initPlay: el('div', 'media-controls__init-play', { role: 'button', 'aria-label': 'Play', tabindex: '0' }),
      bar: el('div', 'media-controls__progress-wrapper'),
      play: el('div', 'media-controls__button media-controls__play', { role: 'button', 'aria-label': 'Play' }),
      pause: el('div', 'media-controls__button media-controls__pause', { role: 'button', 'aria-label': 'Pause' }),
      timing: el('div', 'media-controls__timing'),
      track: el('div', 'media-controls__progress-length'),
      fill: el('div', 'media-controls__progress-fill'),
      buffered: el('div', 'media-controls__progress-buffered'),
      volumeWrap: el('div', 'media-controls__button media-controls__volume-wrapper'),
      mute: el('div', 'media-controls__button media-controls__volume-mute', { role: 'button', 'aria-label': 'Mute' }),
      unmute: el('div', 'media-controls__button media-controls__volume-unmute', { role: 'button', 'aria-label': 'Unmute' }),
      fullscreen: el('div', 'media-controls__button media-controls__fullscreen', { role: 'button', 'aria-label': 'Fullscreen' })
    });

    c.timing.textContent = '0:00';

    c.clickArea.appendChild(c.initPlay);
    c.track.appendChild(c.buffered);
    c.track.appendChild(c.fill);
    c.volumeWrap.appendChild(c.mute);
    c.volumeWrap.appendChild(c.unmute);

    c.bar.appendChild(c.play);
    c.bar.appendChild(c.pause);
    c.bar.appendChild(c.timing);
    c.bar.appendChild(c.track);
    c.bar.appendChild(c.volumeWrap);
    c.bar.appendChild(c.fullscreen);

    c.root.appendChild(c.clickArea);
    c.root.appendChild(c.bar);
    this.parent.appendChild(c.root);

    // On touch devices the overlay is inert until the first play.
    if (this.device !== 'desktop') c.clickArea.style.pointerEvents = 'none';
  };

  /* ---------- Playback ---------- */

  VideoPlayer.prototype.play = function () {
    var self = this;
    var promise = this.video.play();
    if (promise && promise.catch) {
      promise.catch(function (err) {
        // Autoplay policy or interrupted load. Leave the paused UI.
        F.log('[video-player] play() rejected:', err && err.name);
        self.setPlaying(false);
      });
    }
  };

  VideoPlayer.prototype.pause = function () {
    this.video.pause();
  };

  VideoPlayer.prototype.toggle = function () {
    if (this.playing) this.pause();
    else this.play();
  };

  VideoPlayer.prototype.setPlaying = function (state) {
    this.playing = state;
    if (!this.controls) return;
    var c = this.controls;
    c.play.classList.toggle('playing', state);
    c.pause.classList.toggle('playing', state);
    if (state) {
      c.initPlay.classList.add('playing');
      c.bar.classList.add('playing');
      if (this.device !== 'desktop') {
        c.clickArea.style.pointerEvents = 'all';
        this.hideControls(CONTROLS_HIDE_DELAY);
      }
    }
  };

  VideoPlayer.prototype.showControls = function () {
    clearTimeout(this.hideTimer);
    this.controls.bar.classList.add('playing');
  };

  VideoPlayer.prototype.hideControls = function (delay) {
    var self = this;
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(function () {
      self.controls.bar.classList.remove('playing');
    }, delay || 0);
  };

  VideoPlayer.prototype.setMuted = function (muted) {
    this.video.muted = muted;
    this.video.volume = muted ? 0 : this.volume;
    if (this.controls) {
      this.controls.mute.classList.toggle('muted', muted);
      this.controls.unmute.classList.toggle('muted', muted);
    }
  };

  VideoPlayer.prototype.toggleFullscreen = function () {
    if (F.fullscreen.element() === this.parent) {
      F.fullscreen.exit();
    } else {
      F.fullscreen.request(this.parent).catch(function (err) {
        F.log('[video-player] fullscreen rejected:', err);
      });
    }
  };

  VideoPlayer.prototype.seekFromPointer = function (event) {
    var rect = this.controls.track.getBoundingClientRect();
    if (!rect.width || !isFinite(this.video.duration)) return;
    var ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    this.video.currentTime = ratio * this.video.duration;
  };

  /* ---------- Layout ---------- */

  VideoPlayer.prototype.defineOrientation = function () {
    var v = this.video;
    var w = v.videoWidth || v.offsetWidth;
    var h = v.videoHeight || v.offsetHeight;
    if (!w || !h) return;

    var orientation = w > h ? 'landscape' : 'portrait';
    if (orientation === this.orientation) return;

    if (this.orientation) {
      v.classList.remove(this.orientation);
      this.parent.classList.remove(this.orientation);
    }
    this.orientation = orientation;
    v.classList.add(orientation);
    this.parent.classList.add(orientation);

    if (this.parent.classList.contains('portfolio-temp-hero-video')) {
      var heroText = F.dom.qs('.portfolio-temp-hero-content .portfolio-temp-hero-text-wrapper');
      if (heroText) heroText.classList.add(orientation);
    }

    var galleryItem = this.parent.closest('.portfolio-temp-gallery-item');
    if (galleryItem && orientation === 'portrait') galleryItem.classList.add('portrait');
  };

  /** Match the sibling gallery image height to the video height. */
  VideoPlayer.prototype.adaptImage = function () {
    if (!this.opts.alignment) return;
    var grid = this.video.closest('.portfolio-temp-gallery-grid');
    if (!grid) return;

    var image = F.dom.visible(grid.querySelectorAll('img'))[0];
    if (!image) return;

    var height = this.video.offsetHeight;
    if (!height) return;
    image.style.height = F.units.vw(height);
    if (image.offsetHeight > image.offsetWidth) image.parentNode.classList.add('portrait');
  };

  VideoPlayer.prototype.onResize = function () {
    this.device = F.device.group();
    this.adaptImage();
  };

  /* ---------- Events ---------- */

  VideoPlayer.prototype.bindVideo = function () {
    var self = this;
    var v = this.video;
    var on = function (type, fn) {
      self.offs.push(F.on(v, type, fn));
    };

    on('loadedmetadata', function () {
      self.defineOrientation();
    });

    on('canplay', function () {
      self.wrapper.classList.remove('hidden');
      if (self.opts.autoplay && !self.playedOnce) self.play();
    });

    on('play', function () {
      self.setPlaying(true);
      if (!self.playedOnce) {
        self.playedOnce = true;
        self.adaptImage();
      }
    });

    on('pause', function () {
      self.setPlaying(false);
    });

    on('ended', function () {
      self.setPlaying(false);
      if (!self.controls) return;
      var c = self.controls;
      v.currentTime = START_OFFSET;
      c.fill.style.width = '0%';
      c.buffered.style.width = '0%';
      c.initPlay.classList.remove('playing');
      c.bar.classList.remove('playing');
    });

    if (!this.opts.controls) return;

    on('timeupdate', function () {
      if (!isFinite(v.duration)) return;
      self.controls.fill.style.width = (v.currentTime / v.duration) * 100 + '%';
      self.controls.timing.textContent = F.formatTime(v.currentTime);
    });

    on('progress', function () {
      if (!v.buffered.length || !isFinite(v.duration)) return;
      var end = v.buffered.end(v.buffered.length - 1);
      self.controls.buffered.style.width = (end / v.duration) * 100 + '%';
    });

    on('contextmenu', function (e) {
      e.preventDefault();
    });
  };

  VideoPlayer.prototype.bindControls = function () {
    var self = this;
    var c = this.controls;
    var on = function (target, type, fn) {
      self.offs.push(F.on(target, type, fn));
    };

    // Big play button in the middle. Stops propagation so the click-area
    // handler below does not toggle twice.
    on(c.initPlay, 'click', function (e) {
      e.stopPropagation();
      self.toggle();
    });
    on(c.initPlay, 'keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        self.toggle();
      }
    });

    // Whole-video click: desktop toggles playback, touch toggles the bar.
    on(c.clickArea, 'click', function () {
      if (self.device === 'desktop') {
        self.toggle();
        return;
      }
      if (c.bar.classList.contains('playing')) self.hideControls(0);
      else {
        self.showControls();
        self.hideControls(CONTROLS_HIDE_DELAY);
      }
    });

    on(c.root, 'mouseleave', function () {
      if (self.playing && self.device === 'desktop') self.hideControls(0);
    });
    on(c.root, 'mouseenter', function () {
      if (self.playing && self.device === 'desktop') self.showControls();
    });

    on(c.play, 'click', function () {
      self.play();
    });
    on(c.pause, 'click', function () {
      self.pause();
    });
    on(c.mute, 'click', function () {
      self.setMuted(true);
    });
    on(c.unmute, 'click', function () {
      self.setMuted(false);
    });
    on(c.fullscreen, 'click', function () {
      self.toggleFullscreen();
    });
    on(c.track, 'pointerdown', function (e) {
      self.seekFromPointer(e);
    });

    // Keep the fullscreen class in sync even when the user presses Esc.
    this.offs.push(
      F.fullscreen.onChange(function () {
        c.root.classList.toggle('fullscreen', F.fullscreen.element() === self.parent);
      })
    );

    // Non-autoplay videos start with sound; the mute button toggles it.
    if (!this.opts.autoplay) this.setMuted(this.opts.muted);
  };

  VideoPlayer.prototype.destroy = function () {
    clearTimeout(this.hideTimer);
    this.offs.forEach(function (off) {
      off();
    });
    this.offs = [];
    this.video.pause();
    this.video.removeAttribute('src');
    this.video.load();
    this.wrapper.remove();
    if (this.controls) this.controls.root.remove();
  };

  /* ------------------------------------------------------------------ */

  F.css(
    'video-player',
    [
      '.video-wrapper{position:relative;flex-grow:1;max-width:100%;visibility:visible}',
      '.video-wrapper.hidden{visibility:hidden}',
      '.video-player video{width:100%;display:block}',
      '.portfolio-temp-hero-content .video-player{height:100%;display:flex;justify-content:flex-end}',
      '.portfolio-temp-hero-content .video-player video{width:auto}',
      '.portfolio-temp-hero-content .video-player video.portrait{height:100%;width:auto}',
      '.portfolio-temp-hero-content .video-player video.landscape{height:auto;width:100%}',
      '.portfolio-temp-hero-content .portfolio-temp-hero-video.portrait{height:31.806vw;max-height:31.806vw}',
      '.portfolio-temp-hero-content .portfolio-temp-hero-video.landscape{height:auto;max-height:none}',
      '.portfolio-trailer-video{display:flex;justify-content:center;align-items:center}',
      'video::-webkit-media-controls-enclosure{display:none!important}',

      '.media-controls{position:absolute;inset:0;width:100%;height:100%;color:#fff}',
      '.media-controls:fullscreen{position:fixed;z-index:2147483647}',
      '.media-controls-clickable-area{position:absolute;top:0;right:0;left:0;bottom:calc(1.75vw * 2 + 2vw)}',

      '.media-controls__progress-wrapper{position:absolute;bottom:1.75vw;left:2vw;right:2vw;height:2vw;display:flex;align-items:center;gap:.833vw;visibility:hidden;opacity:0;transition:opacity .15s ease-out,visibility .15s ease-out}',
      '.media-controls__progress-wrapper.playing,.portfolio-trailer-video:fullscreen .media-controls__progress-wrapper{visibility:visible;opacity:1}',

      '.media-controls__progress-length{position:relative;height:2px;width:100%;background:rgba(255,255,255,.25);display:flex;cursor:pointer;margin:0 .417vw;user-select:none;-webkit-user-select:none;transition:height .15s ease-out}',
      '.media-controls__progress-wrapper:hover .media-controls__progress-length{height:8px}',
      '.media-controls__progress-fill{position:absolute;left:0;top:0;height:100%;width:0;background:#fff;transition:width .3s ease-out}',
      '.media-controls__progress-buffered{position:absolute;left:0;top:0;height:100%;width:0;background:rgba(255,255,255,.5);transition:width .3s ease-out;pointer-events:none}',
      '.media-controls__timing{margin-bottom:.208vw;font-variant-numeric:lining-nums tabular-nums;user-select:none;-webkit-user-select:none}',

      '.media-controls__init-play{width:8.333vw;height:8.333vw;background:url("data:image/svg+xml;base64,' +
        ICONS.initPlay +
        '") center/cover;position:absolute;top:calc(50% - 8.333vw/2 + 4.5%);left:calc(50% - 8.333vw/2);cursor:pointer;opacity:1;transition:transform .3s ease-out,opacity .3s ease-out;user-select:none;-webkit-user-select:none}',
      '.media-controls__init-play:hover{transform:scale(1.15)}',
      '.media-controls__init-play.playing{opacity:0;pointer-events:none}',

      '.media-controls__button{width:1.667vw;height:1.667vw;transition:transform .15s ease-out;background-size:cover;cursor:pointer;flex-shrink:0;user-select:none;-webkit-user-select:none}',
      '.media-controls__button:hover{transform:scale(1.2)}',
      '.media-controls__play{background-image:url("data:image/svg+xml;base64,' + ICONS.play + '");display:flex}',
      '.media-controls__pause{background-image:url("data:image/svg+xml;base64,' + ICONS.pause + '");display:none}',
      '.media-controls__play.playing{display:none}',
      '.media-controls__pause.playing{display:flex}',
      '.media-controls__fullscreen{background-image:url("data:image/svg+xml;base64,' + ICONS.fullscreen + '");display:flex}',
      '.media-controls.fullscreen .media-controls__fullscreen,.portfolio-trailer-video:fullscreen .media-controls__fullscreen{background-image:url("data:image/svg+xml;base64,' +
        ICONS.fullscreenExit +
        '")}',
      '.media-controls__volume-mute{background-image:url("data:image/svg+xml;base64,' + ICONS.mute + '");display:flex}',
      '.media-controls__volume-unmute{background-image:url("data:image/svg+xml;base64,' + ICONS.unmute + '");display:none}',
      '.media-controls__volume-mute.muted{display:none}',
      '.media-controls__volume-unmute.muted{display:flex}',

      '@media (max-width:991px){',
      '.media-controls-clickable-area{pointer-events:none}',
      '.media-controls__init-play{pointer-events:all}',
      '.portfolio-temp-hero-text-wrapper.portrait{margin-top:2.604vw}',
      '.media-controls__progress-wrapper{bottom:3vw;left:2vw;right:2vw}',
      '.media-controls__button{width:3.229vw;height:3.229vw}',
      '.portfolio-temp-gallery-item.portrait .portfolio-trailer-video{width:100%}',
      '.portfolio-temp-hero-content .video-player{justify-content:center}',
      '.media-controls__volume-wrapper{display:none}',
      '}',

      '@media (max-width:767px){',
      '.portfolio-temp-hero-content .portfolio-temp-hero-video,.portfolio-temp-hero-content .portfolio-temp-hero-video.landscape,.portfolio-temp-hero-content .portfolio-temp-hero-video.portrait{height:auto;max-height:none}',
      '.portfolio-temp-gallery-item.portrait{padding:0 24px;display:flex;justify-content:center}',
      '.portfolio-temp-hero-content .portfolio-temp-hero-video video.portrait,.portfolio-temp-hero-content .portfolio-temp-hero-video video.landscape{width:100%;height:auto}',
      '.media-controls__progress-length,.media-controls__progress-wrapper:hover .media-controls__progress-length{height:16px}',
      '.media-controls__button{width:24px;height:24px}',
      '.media-controls__progress-wrapper{gap:8px}',
      '.media-controls__init-play{width:72px;height:72px;top:calc(50% - 36px + 4.5%);left:calc(50% - 36px)}',
      '}',

      '@media (max-width:479px){',
      '.media-controls__fullscreen{display:none}',
      '.media-controls__progress-wrapper{bottom:20px;left:16px;right:20px}',
      '}'
    ].join('\n')
  );

  F.ready(function () {
    var players = F.dom
      .qsa(SELECTOR)
      .filter(function (link) {
        return F.dom.isVisible(link.parentNode);
      })
      .map(function (link) {
        return new VideoPlayer(link);
      });

    // Exposed for debugging / manual teardown, nothing else depends on it.
    window.Fluco.videoPlayers = players;
  }, 'video-player');
})(window, document);
