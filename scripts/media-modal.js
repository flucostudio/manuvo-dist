/*!
 * Media modal — opens a Vimeo player in a lightbox from a media card.
 * Replaces: the modal half of media-assets.js (its slider is in sliders.js)
 * Requires: shared/fluco-core.js, Vimeo Player API
 *
 * Markup: one card per video, image-only cards are ignored.
 *   <div class="media-slide-link">
 *     <div class="media-item-video-id">1085000174</div>   (empty ⇒ image card)
 *     <button class="media-asset-video-button">Play</button>
 *   </div>
 *
 * Fixed from the original: closing was bound to the whole modal, so a click
 * on the video itself dismissed it; the stylesheet was appended once per
 * card; and every card built its own modal even when it had no video.
 */
(function (window, document) {
  'use strict';

  var F = window.Fluco;
  if (!F) {
    console.error('[media-modal] Fluco core is missing. Load shared/fluco-core.js first.');
    return;
  }

  var VIMEO_API = 'https://player.vimeo.com/api/player.js';
  var CARD = '.media-slide-link';
  var VIDEO_ID = '.media-item-video-id';
  var PLAY = '.media-asset-video-button';

  var CLOSE_ICON =
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIiBmaWxsPSJub25lIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiByeD0iMzAiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik00MC40NSAzOS41TDMwLjMxNjcgMzBMNDAuNDUgMjAuNSIgc3Ryb2tlPSIjMUUxRTFFIiBzdHJva2Utd2lkdGg9IjMiLz4KPHBhdGggZD0iTTE5LjU1IDIwLjVMMzAuMzE2NyAzMEwxOS41NSAzOS41IiBzdHJva2U9IiMxRTFFMUUiIHN0cm9rZS13aWR0aD0iMyIvPgo8L3N2Zz4=';

  var CSS =
    '.modal-media-asset-wrapper{display:flex;justify-content:center;align-items:center;' +
      'position:fixed;z-index:9999;opacity:1;inset:0%;background-color:#000000a3;}' +
    '.modal-media-asset-content{width:100%;max-width:66.9795vw;position:relative;z-index:1;}' +
    '.modal-media-asset-bg{position:absolute;inset:0;}' +
    '.modal-media-asset-close{position:absolute;width:3.056vw;height:3.056vw;' +
      'inset:-1.528vw -1.528vw auto auto;background:url("' + CLOSE_ICON + '") no-repeat center center;' +
      'background-size:contain;cursor:pointer;z-index:10;}' +
    '@media (max-width:767px){' +
      '.modal-media-asset-content{max-width:calc(100vw - 40px);}' +
      '.modal-media-asset-close{width:32px;height:32px;inset:-16px -16px auto auto;}' +
    '}';

  function host() {
    var existing = F.dom.qs('.modal-media-asset-parent');
    if (existing) return existing;
    var node = F.dom.el('div', 'modal-media-asset-parent');
    document.body.appendChild(node);
    return node;
  }

  function MediaModal(card, videoId, parent) {
    var self = this;
    this.offs = [];
    this.player = null;

    this.modal = F.dom.el('div', 'modal-media-asset-wrapper');
    this.modal.style.display = 'none';
    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-modal', 'true');

    // Background sits behind the content, so a click on the video no longer
    // counts as a click outside.
    this.background = F.dom.el('div', 'modal-media-asset-bg');
    this.modal.appendChild(this.background);

    this.content = F.dom.el('div', 'modal-media-asset-content');
    this.modal.appendChild(this.content);

    this.close = F.dom.el('div', 'modal-media-asset-close', { role: 'button', 'aria-label': 'Close' });
    this.content.appendChild(this.close);

    this.mount = F.dom.el('div', 'video');
    this.content.appendChild(this.mount);
    parent.appendChild(this.modal);

    this.player = new window.Vimeo.Player(this.mount, {
      url: 'https://vimeo.com/' + videoId,
      responsive: true
    });
    this.player.setVolume(0);

    var play = F.dom.qs(PLAY, card);
    if (play) {
      this.offs.push(
        F.on(play, 'click', function (event) {
          event.preventDefault();
          self.open();
        })
      );
    }
    this.offs.push(F.on(this.close, 'click', function () { self.hide(); }));
    this.offs.push(F.on(this.background, 'click', function () { self.hide(); }));
    this.offs.push(
      F.on(document, 'keydown', function (event) {
        if (event.key === 'Escape' && self.isOpen()) self.hide();
      })
    );
  }

  MediaModal.prototype.isOpen = function () {
    return this.modal.style.display === 'flex';
  };

  MediaModal.prototype.open = function () {
    this.modal.style.display = 'flex';
    this.player.setVolume(1);
    var played = this.player.play();
    if (played && typeof played.catch === 'function') {
      played.catch(function (e) {
        F.log('[media-modal] play refused:', e && e.name);
      });
    }
  };

  MediaModal.prototype.hide = function () {
    this.modal.style.display = 'none';
    this.player.pause();
  };

  MediaModal.prototype.destroy = function () {
    this.offs.forEach(function (off) { off(); });
    this.offs = [];
    if (this.player) this.player.destroy();
    if (this.modal.parentNode) this.modal.parentNode.removeChild(this.modal);
  };

  F.ready(function () {
    var cards = F.dom.qsa(CARD).filter(function (card) {
      var id = F.dom.qs(VIDEO_ID, card);
      return id && (id.textContent || '').trim() !== '';
    });
    if (!cards.length) return;

    var start = function () {
      F.css('media-modal', CSS);
      var parent = host();
      window.Fluco.mediaModals = cards.map(function (card) {
        var id = F.dom.qs(VIDEO_ID, card).textContent.trim();
        return new MediaModal(card, id, parent);
      });
    };

    if (window.Vimeo && window.Vimeo.Player) start();
    else
      F.loadScript(VIMEO_API).then(start, function (e) {
        F.error('[media-modal] Vimeo Player API failed to load', e);
      });
  }, 'media-modal');
})(window, document);
