/*!
 * Waitlist modal — opens the join/download modal and validates its form.
 * Replaces: modal-waitlist.js
 * Requires: shared/fluco-core.js
 *
 * Markup:
 *   <div class="modal-join-waitlist" data-mailchimp-tag="123" data-kajabi-tag="…">
 *     <div class="modal-join-waitlist-overlay"></div>
 *     <div class="modal-join-waitlist-close"></div>
 *     <form class="join-waitlist-form">…</form>
 *   </div>
 * Openers: <a href="#123"> (matches data-mailchimp-tag) and .redesign-button
 * whose href is "#" or points at the asset CDN (those also start a download
 * once the form is submitted).
 *
 * Validation is intentionally self-contained: the original called a global
 * `Validator` defined in subscription-form.js, so the modal silently broke
 * whenever that file was absent or loaded later. Same rules, no coupling.
 */
(function (window, document) {
  'use strict';

  var F = window.Fluco;
  if (!F) {
    console.error('[modal-waitlist] Fluco core is missing. Load shared/fluco-core.js first.');
    return;
  }

  var MODAL = '.modal-join-waitlist';
  var CLOSE = '.modal-join-waitlist-close';
  var OVERLAY = '.modal-join-waitlist-overlay';
  var FORM = '.join-waitlist-form';
  var OPEN_CLASS = 'modal-open';
  var CDN_PREFIX = 'https://manuvo.ams3.cdn.digitaloceanspaces.com/';
  var BASE_TAG = '7211457';

  // Same expressions the legacy global Validator used.
  var NAME_RE = /^[a-zA-Z\s\-\u2014\u00C6\u00E6\u00D8\u00F8\u00C5\u00E5\u00DF\u00D0\u00F0\u00DE\u00FE\u00D1\u00F1\u00C7\u00E7\u0152\u0153\u00D9\u00F9\u00DB\u00FB\u00DC\u00FC\u00DA\u00FA\u00CD\u00ED\u00CE\u00EE\u00CF\u00EF\u00CC\u00EC\u00D3\u00F3\u00D4\u00F4\u00D6\u00F6\u00D2\u00F2\u00C1\u00E1\u00C2\u00E2\u00C4\u00E4\u00C0\u00E0\u00C9\u00E9\u00CA\u00EA\u00CB\u00EB\u00C8\u00E8\u00DD\u00FD\u0178\u00FF]*$/;
  var EMAIL_RE = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,20}$/;

  var CSS = ".modal-open {display: flex;}.modal-join-waitlist .w-input.error {// box-shadow: inset 0 0 0 2px #FF0000;}.modal-join-waitlist .message-group {display: inline-flex;align-items: center;gap: 0.139vw;color: #FFFFFF;// background-color: #FF0000;// border-radius: 1.667vw;// padding-left: 0.278vw;padding-left: 2.222vw;// padding-right: 0.972vw;z-index: 1;color: #D60B0B;}.modal-join-waitlist .message.error {// font-size: 0.972vw;font-size: 1.389vw;// line-height: 1.528vw;line-height: 1.944vw;// margin-bottom: 0.139vw;}.modal-join-waitlist .error.hide,.modal-join-waitlist .message-group.hide,.modal-join-waitlist .error-icon.hide {display: none;}.modal-join-waitlist .error-icon {background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xMS4xMzk5IDMuNjU3MDNDMTAuNjM0IDIuNzgwNjYgOS4zNjkxMyAyLjc4MDY2IDguODYzMTggMy42NTcwM0wyLjI5ODY3IDE1LjAyNzlDMS43OTI3MyAxNS45MDQzIDIuNDI1MTYgMTYuOTk5OCAzLjQzNzAzIDE2Ljk5OThIMTYuNTY2MUMxNy41Nzc5IDE2Ljk5OTggMTguMjEwNCAxNS45MDQzIDE3LjcwNDUgMTUuMDI3OUwxMS4xMzk5IDMuNjU3MDNaTTEwLjAwMTIgNy4xMTg4M0M5LjUxNzI1IDcuMTE4ODMgOS4xMjQ5MiA3LjUxMTIgOS4xMjQ5MiA3Ljk5NTE4VjExLjQ1NjhDOS4xMjQ5MiAxMS45NDA4IDkuNTE3MjUgMTIuMzMzMiAxMC4wMDEyIDEyLjMzMzJDMTAuNDg1MiAxMi4zMzMyIDEwLjg3NzUgMTEuOTQwOCAxMC44Nzc1IDExLjQ1NjhWNy45OTUxOEMxMC44Nzc1IDcuNTExMiAxMC40ODUyIDcuMTE4ODMgMTAuMDAxMiA3LjExODgzWk0xMC4wMDEyIDE1LjIyNTJDMTAuNDg1MiAxNS4yMjUyIDEwLjg3NzUgMTQuODMyOSAxMC44Nzc1IDE0LjM0ODlDMTAuODc3NSAxMy44NjQ5IDEwLjQ4NTIgMTMuNDcyNSAxMC4wMDEyIDEzLjQ3MjVDOS41MTcyNSAxMy40NzI1IDkuMTI0OTIgMTMuODY0OSA5LjEyNDkyIDE0LjM0ODlDOS4xMjQ5MiAxNC44MzI5IDkuNTE3MjUgMTUuMjI1MiAxMC4wMDEyIDE1LjIyNTJaIiBmaWxsPSJ3aGl0ZSIvPg08L3N2Zz4=');background-repeat: no-repeat;background-position: center;background-size: contain;width: 1.111vw;height: 1.111vw;visibility: visible;opacity: 1;display: none;}@media screen and (max-width: 479px) {.modal-join-waitlist .message-group {// border-radius: 16px;padding-left: 24px;// padding-right: 6px;}.modal-join-waitlist .message.error {font-size: 16px;line-height: 24px;margin-bottom: 2px;}.modal-join-waitlist .error-icon {width: 16px;height: 16px;}}.modal-join-waitlist input[type=\"submit\"].disabled {opacity: 0.5;cursor: not-allowed;pointer-events: none;}";

  function validName(value) {
    return !!value && NAME_RE.test(value);
  }

  function validEmail(value) {
    return !!value && EMAIL_RE.test(value);
  }

  function splitName(value) {
    var parts = String(value == null ? '' : value).split(' ');
    if (parts.length === 1) return { firstname: parts[0], lastname: '' };
    return { firstname: parts[0], lastname: parts.slice(1).join(' ') };
  }

  /* ------------------------------------------------------------------ */
  /* Form                                                                */
  /* ------------------------------------------------------------------ */

  function WaitlistForm(form) {
    this.form = form;
    this.offs = [];
    this.pendingDownloadUrl = null;

    this.email = F.dom.qs('input[type="email"]', form);
    this.name = F.dom.qs('input[name="Fullname"]', form);
    this.submit = F.dom.qs('input[type="submit"]', form);

    var wrapper = form.parentElement;
    this.tags = {
      mailchimp: (wrapper && wrapper.dataset.mailchimpTag) || '',
      kajabi: (wrapper && wrapper.dataset.kajabiTag) || ''
    };

    if (!this.submit) {
      F.log('[modal-waitlist] Form has no submit input, validation skipped');
      return;
    }

    this.addHiddenFields();
    this.addHoneypot();
    this.buildErrors();
    this.buildShadowButton();
    this.watchSuccess();

    // Browser bubbles duplicate the custom messages.
    this.form.setAttribute('novalidate', 'true');
    if (this.email) this.email.setAttribute('title', '');
    if (this.name) this.name.setAttribute('title', '');
  }

  WaitlistForm.prototype.addHiddenFields = function () {
    var tags = this.tags.mailchimp === BASE_TAG || !this.tags.mailchimp
      ? BASE_TAG
      : this.tags.mailchimp + ',' + BASE_TAG;

    this.hidden = {
      firstname: F.dom.el('input', null, { type: 'hidden', name: 'First Name' }),
      lastname: F.dom.el('input', null, { type: 'hidden', name: 'Last Name' }),
      tags: F.dom.el('input', null, { type: 'hidden', name: 'tags', value: tags }),
      kajabi: F.dom.el('input', null, { type: 'hidden', name: 'MMERGE3', value: this.tags.kajabi })
    };
    var form = this.form;
    Object.keys(this.hidden).forEach(function (key) {
      form.appendChild(this.hidden[key]);
    }, this);
  };

  WaitlistForm.prototype.addHoneypot = function () {
    var wrap = F.dom.el('div', null, { 'aria-hidden': 'true' });
    wrap.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;';
    this.honeypot = F.dom.el('input', null, {
      type: 'text', name: 'website', tabindex: '-1', autocomplete: 'off'
    });
    wrap.appendChild(this.honeypot);
    this.form.appendChild(wrap);
  };

  WaitlistForm.prototype.errorFor = function (input) {
    var group = F.dom.el('div', 'message-group hide');
    group.appendChild(F.dom.el('div', 'error-icon hide'));
    var message = F.dom.el('div', 'message error hide');
    message.textContent = input.dataset.errorMessage || 'This field is required';
    group.appendChild(message);
    input.parentElement.appendChild(group);
    return { group: group, message: message };
  };

  WaitlistForm.prototype.buildErrors = function () {
    var self = this;
    if (this.email) {
      this.emailError = this.errorFor(this.email);
      this.offs.push(F.on(this.email, 'input', function () {
        self.hideError(self.email, self.emailError);
      }));
    }
    if (this.name) {
      this.nameError = this.errorFor(this.name);
      this.offs.push(F.on(this.name, 'input', function () {
        self.hideError(self.name, self.nameError);
        if (validName(self.name.value)) self.storeName();
      }));
    }
  };

  WaitlistForm.prototype.storeName = function () {
    var parts = splitName(this.name.value);
    this.hidden.firstname.value = parts.firstname;
    this.hidden.lastname.value = parts.lastname;
  };

  WaitlistForm.prototype.showError = function (input, error) {
    if (!error) return;
    error.group.classList.remove('hide');
    error.message.classList.remove('hide');
    F.dom.qsa('.error-icon', error.group).forEach(function (icon) {
      icon.classList.remove('hide');
    });
    input.classList.add('error');
  };

  WaitlistForm.prototype.hideError = function (input, error) {
    if (!error) return;
    error.group.classList.add('hide');
    error.message.classList.add('hide');
    F.dom.qsa('.error-icon', error.group).forEach(function (icon) {
      icon.classList.add('hide');
    });
    input.classList.remove('error');
  };

  /**
   * Webflow submits on the real button, so validation runs on a stand-in and
   * the real one is only clicked once the fields pass.
   */
  WaitlistForm.prototype.buildShadowButton = function () {
    var self = this;
    this.submit.style.display = 'none';
    this.shadow = F.dom.el('button', this.submit.className, { type: 'button' });
    this.shadow.textContent = this.submit.value;
    this.submit.parentNode.insertBefore(this.shadow, this.submit.nextSibling);

    this.offs.push(F.on(this.shadow, 'click', function () {
      if (self.honeypot && self.honeypot.value) return;

      var emailOk = !self.email || validEmail(self.email.value);
      var nameOk = !self.name || validName(self.name.value);
      if (!emailOk) self.showError(self.email, self.emailError);
      if (!nameOk) self.showError(self.name, self.nameError);
      if (!emailOk || !nameOk) return;

      if (self.name) self.storeName();
      self.shadow.style.display = 'none';
      self.submit.style.display = '';
      self.submit.click();
    }));
  };

  /** Start the gated download once Webflow reveals its success state. */
  WaitlistForm.prototype.watchSuccess = function () {
    var self = this;
    var wrapper = this.form.closest('.w-form');
    var success = wrapper && F.dom.qs('.w-form-done', wrapper);
    if (!success) return;

    this.observer = new MutationObserver(function () {
      if (success.style.display !== 'none' && self.pendingDownloadUrl) {
        var url = self.pendingDownloadUrl;
        self.pendingDownloadUrl = null;
        download(url);
      }
    });
    this.observer.observe(success, { attributes: true, attributeFilter: ['style'] });
  };

  WaitlistForm.prototype.destroy = function () {
    this.offs.forEach(function (off) {
      off();
    });
    this.offs = [];
    if (this.observer) this.observer.disconnect();
  };

  function download(url) {
    window
      .fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.blob();
      })
      .then(function (blob) {
        var objectUrl = URL.createObjectURL(blob);
        var link = F.dom.el('a', null, { download: decodeURIComponent(url.split('/').pop()) });
        link.href = objectUrl;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl);
      })
      .catch(function (err) {
        F.error('[modal-waitlist] Download failed:', err);
      });
  }

  /* ------------------------------------------------------------------ */
  /* Modal                                                               */
  /* ------------------------------------------------------------------ */

  function Modal(root) {
    this.root = root;
    this.offs = [];
    this.form = null;

    var form = F.dom.qs(FORM, root);
    if (form) this.form = new WaitlistForm(form);

    this.wireOpeners();
    this.wireClosers();
  }

  Modal.prototype.open = function () {
    this.root.classList.add(OPEN_CLASS);
  };

  Modal.prototype.close = function () {
    this.root.classList.remove(OPEN_CLASS);
  };

  Modal.prototype.isOpen = function () {
    return this.root.classList.contains(OPEN_CLASS);
  };

  Modal.prototype.wireOpeners = function () {
    var self = this;

    // <a href="#123"> targets the modal whose form carries that Mailchimp tag.
    F.dom.qsa('a[href^="#"]').forEach(function (link) {
      var match = (link.getAttribute('href') || '').match(/^#(\d+)$/);
      if (!match) return;
      var wrapper = F.dom.qs('[data-mailchimp-tag="' + match[1] + '"]');
      var target = wrapper && wrapper.closest(MODAL);
      if (target !== self.root) return;
      self.offs.push(F.on(link, 'click', function (event) {
        event.preventDefault();
        self.open();
      }));
    });

    F.dom.qsa('.redesign-button').forEach(function (button) {
      if (button.dataset.modalWired) return;
      var href = button.getAttribute('href') || '';
      var isPlaceholder = href === '#';
      var isDownload = href.indexOf(CDN_PREFIX) === 0;
      if (!isPlaceholder && !isDownload) return;
      button.dataset.modalWired = 'true';

      if (!isDownload) {
        self.offs.push(F.on(button, 'click', function (event) {
          event.preventDefault();
          self.open();
        }));
        return;
      }

      // Swap the direct download link for a stand-in that opens the modal;
      // the file is delivered after the form is submitted.
      var shadow = F.dom.el('a', button.className);
      shadow.textContent = button.textContent;
      shadow.href = '#';
      button.parentNode.insertBefore(shadow, button);
      button.style.display = 'none';
      self.offs.push(F.on(shadow, 'click', function (event) {
        event.preventDefault();
        if (self.form) self.form.pendingDownloadUrl = href;
        self.open();
      }));
    });
  };

  Modal.prototype.wireClosers = function () {
    var self = this;
    var close = F.dom.qs(CLOSE, this.root);
    if (close) {
      this.offs.push(F.on(close, 'click', function () {
        self.close();
      }));
    }
    var overlay = F.dom.qs(OVERLAY, this.root);
    if (overlay) {
      this.offs.push(F.on(overlay, 'click', function () {
        self.close();
      }));
    }
    // One document-level Escape handler per modal, removed on destroy; the
    // original added one per modal and never removed any.
    this.offs.push(F.on(document, 'keydown', function (event) {
      if (event.key === 'Escape' && self.isOpen()) self.close();
    }));
  };

  Modal.prototype.destroy = function () {
    this.offs.forEach(function (off) {
      off();
    });
    this.offs = [];
    if (this.form) this.form.destroy();
    this.close();
  };

  F.ready(function () {
    var roots = F.dom.qsa(MODAL);
    if (!roots.length) return;
    F.css('modal-waitlist', CSS);
    window.Fluco.waitlistModals = roots.map(function (root) {
      return new Modal(root);
    });
  }, 'modal-waitlist');
})(window, document);
