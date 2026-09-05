/*!
 * Article Figures — full-width / float layout for rich-text figures.
 * Replaces: tests/article-grid.js
 * Requires: shared/fluco-core.js
 *
 * The original instantiated a class per <figure> and injected the same
 * <style> block once per figure. The layout is pure CSS, so this file only
 * injects it once and tags each figure with `data-fluco-position` for
 * anyone who needs it from JS.
 */
(function (window, document) {
  'use strict';

  var F = window.Fluco;
  if (!F) {
    console.error('[article-figures] Fluco core is missing. Load shared/fluco-core.js first.');
    return;
  }

  var POSITIONS = {
    'w-richtext-align-fullwidth': 'fullwidth',
    'w-richtext-align-center': 'center',
    'w-richtext-align-floatleft': 'left',
    'w-richtext-align-floatright': 'right'
  };

  F.css(
    'article-figures',
    [
      '.w-richtext figure{display:flex!important;flex-direction:column}',
      '.w-richtext-align-fullwidth{width:100vw!important;max-width:100vw!important;margin-left:-6.736vw!important;margin-right:-6.736vw!important}',
      '.w-richtext-align-center,.w-richtext-align-floatleft,.w-richtext-align-floatright{width:70.486vw!important;max-width:70.486vw!important;margin-left:0!important;margin-right:0!important}',
      '.w-richtext-figure-type-video{min-height:calc(70.486vw / 16 * 9)!important}',
      '.w-richtext-align-floatleft{margin-right:23.2vw!important}',
      '.w-richtext-align-floatright{margin-left:23.2vw!important}',
      '@media (max-width:479px){',
      '.w-richtext-align-center,.w-richtext-align-floatleft,.w-richtext-align-floatright{width:100%!important;max-width:100%!important}',
      '.w-richtext-figure-type-video{min-height:calc((100vw - 40px) / 16 * 9)!important}',
      '.w-richtext-align-floatleft,.w-richtext-align-floatright{margin-left:0!important;margin-right:0!important}',
      '}'
    ].join('\n')
  );

  F.ready(function () {
    F.dom.qsa('.w-richtext figure').forEach(function (figure) {
      Object.keys(POSITIONS).some(function (cls) {
        if (!figure.classList.contains(cls)) return false;
        figure.dataset.flucoPosition = POSITIONS[cls];
        return true;
      });
    });
  }, 'article-figures');
})(window, document);
