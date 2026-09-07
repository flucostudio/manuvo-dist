/*!
 * Image alt — marks decorative images so screen readers skip them, and
 * reports the ones that genuinely need a description.
 * Requires: shared/fluco-core.js
 *
 * Two different things look the same in an audit — an empty alt:
 *
 *   Decorative: video posters and background stills. They sit behind or under
 *   a video that carries the meaning, so alt="" is CORRECT — but only when the
 *   image is also hidden from the accessibility tree. Otherwise assistive tech
 *   announces an unnamed graphic.
 *
 *   Meaningful: photographs in the article body. These need a human sentence,
 *   which cannot be invented here: the caption field on those blocks holds a
 *   credit line ("Credit: photographer, copyright and year"), not a
 *   description, and copying it into alt would be worse than leaving it empty.
 *
 * Alt text on the meaningful ones comes from the asset in Webflow (the blocks
 * are set to inherit it), so filling it there fixes every usage at once.
 * Enable `localStorage.setItem('fluco:debug','1')` to list what still needs one.
 */
(function (window, document) {
  'use strict';

  var F = window.Fluco;
  if (!F) {
    console.error('[image-alt] Fluco core is missing. Load shared/fluco-core.js first.');
    return;
  }

  // Anything inside these is presentation: the media itself carries meaning.
  var DECORATIVE_CONTAINERS = [
    '[data-mv-bg]',
    '[data-mv-player]',
    '.episode-video-wrapper',
    '.redesign-home-hero-bg'
  ].join(',');
  var DECORATIVE_CLASSES = ['mv-media-fill', 'episode-video-overlay'];

  function isDecorative(img) {
    if (DECORATIVE_CLASSES.some(function (c) { return img.classList.contains(c); })) return true;
    return !!img.closest(DECORATIVE_CONTAINERS);
  }

  /** Where the image sits, so the debug list is actionable. */
  function describe(img) {
    var section = img.closest('section');
    var heading = section ? section.querySelector('h1,h2,h3') : null;
    return {
      file: (img.currentSrc || img.src || '').split('/').pop().split('?')[0].slice(0, 60),
      near: heading ? (heading.textContent || '').trim().slice(0, 40) : '(без заголовка)'
    };
  }

  F.ready(function () {
    var decorative = 0;
    var needsAlt = [];

    F.dom.qsa('img').forEach(function (img) {
      var alt = (img.getAttribute('alt') || '').trim();
      if (alt) return;

      if (isDecorative(img)) {
        // Correct pattern for decorative images: empty alt AND hidden from
        // the accessibility tree, so it is skipped rather than announced.
        img.setAttribute('alt', '');
        img.setAttribute('role', 'presentation');
        img.setAttribute('aria-hidden', 'true');
        decorative++;
        return;
      }
      needsAlt.push(describe(img));
    });

    window.Fluco.imageAlt = { decorative: decorative, needsAlt: needsAlt };
    F.log('[image-alt] декоративных помечено:', decorative, '| ждут описания:', needsAlt.length);
    if (needsAlt.length) F.log('[image-alt] без alt:', needsAlt);
  }, 'image-alt');
})(window, document);
