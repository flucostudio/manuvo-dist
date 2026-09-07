/*!
 * Empty media — tidies media blocks that have no source yet.
 * Requires: shared/fluco-core.js
 *
 * The Changemakers blocks ship a poster placeholder, <img class="mv-media-fill">,
 * which stays empty until a source is filled in. An <img> with src="" is a
 * broken image: it reports naturalWidth 0, shows a broken-image glyph in some
 * browsers, and in others triggers a second request for the page itself.
 *
 * The block is already zero-height when empty, so nothing moves — this only
 * removes the empty src and hides the placeholder until content arrives.
 *
 * Markup: [data-mv-bg] / [data-mv-player] containing [data-mv-src] and
 *         img.mv-media-fill (see the inline MVMedia script on those pages).
 */
(function (window, document) {
  'use strict';

  var F = window.Fluco;
  if (!F) {
    console.error('[empty-media] Fluco core is missing. Load shared/fluco-core.js first.');
    return;
  }

  var BOX = '[data-mv-bg],[data-mv-player]';
  var FILL = '.mv-media-fill';
  var SRC = '[data-mv-src]';
  var FLAG = 'data-fluco-empty-media';

  var CSS =
    '[' + FLAG + ']{display:none !important;}';

  function sourceOf(box) {
    var node = F.dom.qs(SRC, box);
    return node ? (node.textContent || '').trim() : '';
  }

  function tidy(fill) {
    var src = fill.getAttribute('src');
    if (src) return false;
    // Drop the attribute rather than leave src="": that is what makes the
    // browser treat it as a broken image.
    fill.removeAttribute('src');
    fill.removeAttribute('srcset');
    fill.setAttribute(FLAG, '');
    fill.setAttribute('aria-hidden', 'true');
    return true;
  }

  F.ready(function () {
    var boxes = F.dom.qsa(BOX);
    if (!boxes.length) return;

    var cleaned = 0;
    boxes.forEach(function (box) {
      if (sourceOf(box)) return; // block has media; MVMedia handles its poster
      F.dom.qsa(FILL, box).forEach(function (fill) {
        if (tidy(fill)) cleaned++;
      });
    });

    // Some posters live outside a media box; catch those too.
    F.dom.qsa(FILL).forEach(function (fill) {
      if (fill.getAttribute('src')) return;
      if (tidy(fill)) cleaned++;
    });

    if (cleaned) {
      F.css('empty-media', CSS);
      F.log('[empty-media] placeholders cleaned:', cleaned);
    }
    window.Fluco.emptyMediaCleaned = cleaned;
  }, 'empty-media');
})(window, document);
