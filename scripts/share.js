/*!
 * Share — LinkedIn / Facebook / X share links and "copy link".
 * Replaces: tests/share.js
 * Requires: shared/fluco-core.js
 *
 * Markup:
 *   <a fluco-share="linkedin" href="#">…</a>
 *   <a fluco-share="facebook" href="https://site/page">…</a>   (explicit URL)
 *   <a fluco-share="x" fluco-share-title="Custom title" href="#">…</a>
 *   <a fluco-share="copy" href="#"><span class="sc-modal-link-text copy-link">Copy</span></a>
 * `href="#"` (or empty) means "share the current page".
 */
(function (window, document) {
  'use strict';

  var F = window.Fluco;
  if (!F) {
    console.error('[share] Fluco core is missing. Load shared/fluco-core.js first.');
    return;
  }

  var NETWORKS = {
    linkedin: function (url) {
      return 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url);
    },
    facebook: function (url) {
      return 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url);
    },
    x: function (url, title) {
      return 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(title);
    }
  };
  NETWORKS.twitter = NETWORKS.x;

  var COPIED_LABEL = 'Copied!';
  var COPIED_TIMEOUT = 2000;

  function pageUrl() {
    return window.location.origin + window.location.pathname + window.location.search;
  }

  /** Only http(s) URLs may be shared; anything else falls back to the page. */
  function resolveUrl(link) {
    var raw = (link.getAttribute('href') || '').trim();
    if (!raw || raw === '#') return pageUrl();
    try {
      var parsed = new URL(raw, window.location.href);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return pageUrl();
      parsed.hash = '';
      return parsed.toString();
    } catch (e) {
      return pageUrl();
    }
  }

  function resolveTitle(link) {
    return link.getAttribute('fluco-share-title') || document.title;
  }

  function openPopup(url) {
    var w = 600;
    var h = 500;
    var left = Math.max(0, (window.screen.width - w) / 2);
    var top = Math.max(0, (window.screen.height - h) / 2);
    var popup = window.open(
      url,
      '_blank',
      'noopener,noreferrer,width=' + w + ',height=' + h + ',left=' + left + ',top=' + top
    );
    if (popup) popup.opener = null;
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    // Fallback for http:// previews and old WebViews.
    return new Promise(function (resolve, reject) {
      var area = F.dom.el('textarea', null, { readonly: '', 'aria-hidden': 'true' });
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      var ok = false;
      try {
        ok = document.execCommand('copy');
      } catch (e) {
        /* ignore */
      }
      area.remove();
      ok ? resolve() : reject(new Error('copy failed'));
    });
  }

  function bindShare(link, network) {
    var url = resolveUrl(link);
    var title = resolveTitle(link);
    link.setAttribute('href', NETWORKS[network](url, title));
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
    F.on(link, 'click', function (event) {
      event.preventDefault(); // FIX: original jumped to top via href="#"
      openPopup(link.getAttribute('href'));
    });
  }

  function bindCopy(link) {
    var url = resolveUrl(link);
    var labelNode = link.children.length ? F.dom.qs('.sc-modal-link-text.copy-link', link.parentElement) || link : link;
    var originalLabel = labelNode.textContent;
    var timer = null;

    link.setAttribute('role', 'button');
    F.on(link, 'click', function (event) {
      event.preventDefault();
      copyText(url).then(
        function () {
          labelNode.textContent = COPIED_LABEL;
          clearTimeout(timer);
          timer = setTimeout(function () {
            labelNode.textContent = originalLabel;
          }, COPIED_TIMEOUT);
        },
        function (err) {
          F.error('[share] copy failed', err);
        }
      );
    });
  }

  F.ready(function () {
    F.dom.qsa('[fluco-share]').forEach(function (link) {
      var type = (link.getAttribute('fluco-share') || '').toLowerCase();
      if (type === 'copy') bindCopy(link);
      else if (NETWORKS[type]) bindShare(link, type);
    });
  }, 'share');
})(window, document);
