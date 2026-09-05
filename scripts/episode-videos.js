/*!
 * Episode Videos — play an embedded (Vimeo/YouTube) iframe from a custom
 * button via player.js.
 * Replaces: episode-videos.js
 * Requires: shared/fluco-core.js, player.js (window.playerjs)
 *
 * Markup: `.episode-video-wrapper` containing an <iframe> and
 * `.play-vimeo-button`.
 */
(function (window, document) {
  'use strict';

  var F = window.Fluco;
  if (!F) {
    console.error('[episode-videos] Fluco core is missing. Load shared/fluco-core.js first.');
    return;
  }

  F.ready(function () {
    if (!window.playerjs || !window.playerjs.Player) {
      F.error('[episode-videos] player.js is not loaded.');
      return;
    }

    F.dom.qsa('.episode-video-wrapper').forEach(function (wrapper) {
      var button = F.dom.qs('.play-vimeo-button', wrapper);
      var iframe = F.dom.qs('iframe', wrapper);
      if (!button || !iframe) return;

      var player = new window.playerjs.Player(iframe);
      var ready = false;
      player.on('ready', function () {
        ready = true;
      });

      F.on(button, 'click', function () {
        if (!ready) return; // player.js queues nothing before ready
        player.mute();
        player.play();
      });
    });
  }, 'episode-videos');
})(window, document);
