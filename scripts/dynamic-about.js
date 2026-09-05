/*!
 * Dynamic About — "Learn more / Show less" toggle for a long rich text.
 * Replaces: dynamic-about.js
 * Requires: shared/fluco-core.js
 *
 * Markup: `.portfolio-temp-about-subheader` (rich text). Optional
 * `data-fluco-about-preview="4"` sets how many paragraphs stay visible.
 */
(function (window, document) {
  'use strict';

  var F = window.Fluco;
  if (!F) {
    console.error('[dynamic-about] Fluco core is missing. Load shared/fluco-core.js first.');
    return;
  }

  var SELECTOR = '.portfolio-temp-about-subheader';
  var DEFAULT_PREVIEW = 4;
  var LABELS = { more: 'Learn More', less: 'Show Less' };

  function About(richText) {
    this.richText = richText;
    this.wrapper = richText.parentNode;
    this.preview = F.units.toNumber(richText.dataset.flucoAboutPreview) || DEFAULT_PREVIEW;
    this.expanded = false;
    this.offs = [];

    this.ensureTrailingParagraph();
    this.paragraphs = F.dom.qsa('p', richText);
    if (this.paragraphs.length <= this.preview) return;

    this.button = F.dom.el('button', 'learn-button', {
      type: 'button',
      'aria-expanded': 'false'
    });
    this.button.textContent = LABELS.more;
    this.wrapper.appendChild(this.button);

    this.richText.style.overflow = 'hidden';
    this.applyHeight();

    var self = this;
    this.offs.push(
      F.on(this.button, 'click', function () {
        self.setExpanded(!self.expanded);
      })
    );
    this.offs.push(F.onResize(this.applyHeight.bind(this)));
  }

  /**
   * Webflow drops the bottom margin of the last rich-text paragraph, so the
   * measured "full" height comes out short. An empty trailing paragraph
   * (zero-width joiner so Webflow does not strip it) restores the spacing.
   */
  About.prototype.ensureTrailingParagraph = function () {
    var ps = this.richText.querySelectorAll('p');
    if (ps.length <= this.preview) return;
    var last = ps[ps.length - 1];
    if (last.textContent === '\u200D') return;
    var spacer = F.dom.el('p');
    spacer.textContent = '\u200D';
    spacer.setAttribute('aria-hidden', 'true');
    this.richText.appendChild(spacer);
  };

  About.prototype.measure = function () {
    var total = 0;
    var previewHeight = 0;
    this.paragraphs.forEach(function (p, i) {
      var h = p.offsetHeight;
      total += h;
      if (i < this.preview) previewHeight += h;
    }, this);
    return { total: total, preview: previewHeight };
  };

  About.prototype.applyHeight = function () {
    var m = this.measure();
    this.richText.style.height = F.units.vw(this.expanded ? m.total : m.preview);
  };

  About.prototype.setExpanded = function (expanded) {
    this.expanded = expanded;
    this.richText.classList.toggle('about-expanded', expanded); // FIX: was inverted
    this.button.textContent = expanded ? LABELS.less : LABELS.more;
    this.button.setAttribute('aria-expanded', String(expanded));
    this.applyHeight();
  };

  About.prototype.destroy = function () {
    this.offs.forEach(function (off) {
      off();
    });
  };

  F.css(
    'dynamic-about',
    [
      '.learn-button{display:inline-block;cursor:pointer;text-transform:uppercase;color:inherit;opacity:.5;font-size:1.248vw;background:none;border:0;padding:0;font:inherit;font-size:1.248vw}',
      '.learn-button:hover,.learn-button:focus-visible{text-decoration:underline;opacity:1}',
      '.portfolio-temp-about-subheader{transition:height .3s ease-out}',
      '@media (max-width:991px){.learn-button{font-size:1.823vw}}',
      '@media (max-width:767px){.learn-button{font-size:16px}}'
    ].join('\n')
  );

  F.ready(function () {
    var richText = F.dom.qs(SELECTOR);
    if (richText) window.Fluco.about = new About(richText);
  }, 'dynamic-about');
})(window, document);
