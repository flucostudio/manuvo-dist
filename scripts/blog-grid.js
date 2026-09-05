/*!
 * Blog Grid — 12-column editorial layout for `.articles-list`.
 * Replaces: tests/blog-grid.js
 * Requires: shared/fluco-core.js
 *
 * This is CSS only. The original also registered a Finsweet `cmsload`
 * callback that did nothing but console.log; it is gone. Selectors are
 * written flat (no CSS nesting) so they work in every browser.
 * Consider moving this block to Webflow's page-level <head> custom code:
 * CSS injected from a footer script paints one frame late.
 */
(function (window, document) {
  'use strict';

  var F = window.Fluco;
  if (!F) {
    console.error('[blog-grid] Fluco core is missing. Load shared/fluco-core.js first.');
    return;
  }

  F.css(
    'blog-grid',
    [
      '.articles-list{display:grid;grid-template-columns:repeat(12,minmax(0,1fr))}',
      '.article-post-item:nth-child(6n+1){grid-column:1/7}',
      '.article-post-item:nth-child(6n+2){grid-column:8/13;margin-top:23.472vw}',
      '.article-post-item:nth-child(6n+3){grid-column:1/13;margin-left:-6.736vw;margin-right:-6.736vw}',
      '.article-post-item:nth-child(6n+3) .article-post-thumbnail{height:57.292vw}',
      '.article-post-item:nth-child(6n+3) .article-post-info{margin-left:6.736vw;margin-right:6.736vw}',
      '.article-post-item:nth-child(6n+4){grid-column:5/13}',
      '.article-post-item:nth-child(6n+4) .article-post-thumbnail{height:37.5vw}',
      '.article-post-item:nth-child(6n+5){grid-column:1/10}',
      '.article-post-item:nth-child(6n+6){grid-column:6/12}',

      '@media (max-width:479px){',
      '.articles-list{grid-template-columns:repeat(6,minmax(0,1fr))}',
      '.article-post-item:nth-child(6n+1){grid-column:1/7}',
      '.article-post-item:nth-child(6n+1) .article-post-thumbnail{height:73.791vw}',
      '.article-post-item:nth-child(6n+2){grid-column:2/7;margin-top:0}',
      '.article-post-item:nth-child(6n+2) .article-post-thumbnail{height:63.868vw}',
      '.article-post-item:nth-child(6n+3){grid-column:1/7;margin-left:-20px;margin-right:-20px}',
      '.article-post-item:nth-child(6n+3) .article-post-thumbnail{height:57.252vw}',
      '.article-post-item:nth-child(6n+3) .article-post-info{margin-left:20px;margin-right:20px}',
      '.article-post-item:nth-child(6n+4){grid-column:1/7}',
      '.article-post-item:nth-child(6n+4) .article-post-thumbnail{height:49.364vw}',
      '.article-post-item:nth-child(6n+5){grid-column:1/7}',
      '.article-post-item:nth-child(6n+5) .article-post-thumbnail{height:49.364vw}',
      '.article-post-item:nth-child(6n+6){grid-column:2/7}',
      '.article-post-item:nth-child(6n+6) .article-post-thumbnail{height:61.069vw}',
      '}'
    ].join('\n')
  );
})(window, document);
