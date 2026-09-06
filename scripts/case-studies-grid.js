/*!
 * Case studies grid — staggered 12-column layout for the case study list.
 * Replaces: case-studies-grid.js
 * Requires: shared/fluco-core.js
 *
 * Markup: .case-studies-list > .case-study-item*, each with
 *         .case-study-item-image and .case-study-item-content.
 *
 * The original also registered an fsAttributes 'cmsload' callback whose body
 * only computed a row index and console.logged it — dropped as dead code.
 * What actually did the work was the stylesheet, so this file is CSS only.
 */
(function (window, document) {
  'use strict';

  var F = window.Fluco;
  if (!F) {
    console.error('[case-studies-grid] Fluco core is missing. Load shared/fluco-core.js first.');
    return;
  }

  var LIST = '.case-studies-list';

  // Nested `&` selectors from the original are expanded here: CSS nesting is
  // still unsupported in older Safari, and this ships to real traffic.
  var CSS =
    '.case-studies-list{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));}' +
    '.case-study-item:nth-child(6n+1){grid-column-start:1;grid-column-end:7;}' +
    '.case-study-item:nth-child(6n+2){grid-column-start:8;grid-column-end:13;margin-top:23.472vw;}' +
    '.case-study-item:nth-child(6n+3){grid-column-start:1;grid-column-end:13;' +
      'margin-left:-2.778vw;margin-right:-2.778vw;}' +
    '.case-study-item:nth-child(6n+3) .case-study-item-image{height:57.292vw;}' +
    '.case-study-item:nth-child(6n+3) .case-study-item-content{margin-left:2.778vw;margin-right:2.778vw;}' +
    '.case-study-item:nth-child(6n+4){grid-column-start:5;grid-column-end:13;}' +
    '.case-study-item:nth-child(6n+4) .case-study-item-image{height:37.5vw;}' +
    '.case-study-item:nth-child(6n+5){grid-column-start:1;grid-column-end:10;}' +
    '.case-study-item:nth-child(6n+6){grid-column-start:6;grid-column-end:12;}' +
    '@media screen and (max-width:479px){' +
      '.case-studies-list{grid-template-columns:repeat(6,minmax(0,1fr));}' +
      '.case-study-item:nth-child(6n+1){grid-column-start:1;grid-column-end:7;}' +
      '.case-study-item:nth-child(6n+1) .case-study-item-image{height:73.791vw;}' +
      '.case-study-item:nth-child(6n+2){grid-column-start:2;grid-column-end:7;margin-top:0px;}' +
      '.case-study-item:nth-child(6n+2) .case-study-item-image{height:63.868vw;}' +
      '.case-study-item:nth-child(6n+3){grid-column-start:1;grid-column-end:7;' +
        'margin-left:-20px;margin-right:-20px;}' +
      '.case-study-item:nth-child(6n+3) .case-study-item-image{height:57.252vw;}' +
      '.case-study-item:nth-child(6n+3) .case-study-item-content{margin-left:20px;margin-right:20px;}' +
      '.case-study-item:nth-child(6n+4){grid-column-start:1;grid-column-end:7;}' +
      '.case-study-item:nth-child(6n+4) .case-study-item-image{height:49.364vw;}' +
      '.case-study-item:nth-child(6n+5){grid-column-start:1;grid-column-end:7;}' +
      '.case-study-item:nth-child(6n+5) .case-study-item-image{height:49.364vw;}' +
      '.case-study-item:nth-child(6n+6){grid-column-start:2;grid-column-end:7;}' +
      '.case-study-item:nth-child(6n+6) .case-study-item-image{height:61.069vw;}' +
    '}';

  F.ready(function () {
    if (!F.dom.qs(LIST)) return;
    F.css('case-studies-grid', CSS);
  }, 'case-studies-grid');
})(window, document);
