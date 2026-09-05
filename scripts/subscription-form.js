/*!
 * Subscription Form — two-step newsletter form (email -> full name) with
 * inline validation, step dots, hidden firstname / lastname fields and a
 * client-side spam guard.
 * Replaces: tests/subscription-form.js (+ backup)
 * Requires: shared/fluco-core.js
 *
 * Markup:
 *   .w-form
 *     form.new-newsletter-form
 *       .new-newsletter-form-step (x2)
 *         input[type=email]            step 1
 *         input[name=Fullname]         step 2
 *       .new-newsletter-next-button
 *       input[type=submit]
 *     .w-form-done                     (Webflow success block, optional)
 * Inputs may carry data-error-message="…".
 *
 * Spam guard (see SPAM_DEFAULTS). Override before this script loads:
 *   window.FlucoSpamConfig = { minSeconds: 5, blockDomains: ['foo.xyz'] }
 *
 * IMPORTANT: everything here runs in the browser. Bots that POST straight
 * to Webflow's form endpoint never execute it. The only server-side
 * defence Webflow offers is Site settings -> Forms -> reCAPTCHA / spam
 * filtering; enable it as well.
 */
(function (window, document) {
  'use strict';

  var F = window.Fluco;
  if (!F) {
    console.error('[subscription-form] Fluco core is missing. Load shared/fluco-core.js first.');
    return;
  }

  var el = F.dom.el;
  var qs = F.dom.qs;

  var ICON_ERROR =
    'PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xMS4xMzk5IDMuNjU3MDNDMTAuNjM0IDIuNzgwNjYgOS4zNjkxMyAyLjc4MDY2IDguODYzMTggMy42NTcwM0wyLjI5ODY3IDE1LjAyNzlDMS43OTI3MyAxNS45MDQzIDIuNDI1MTYgMTYuOTk5OCAzLjQzNzAzIDE2Ljk5OThIMTYuNTY2MUMxNy41Nzc5IDE2Ljk5OTggMTguMjEwNCAxNS45MDQzIDE3LjcwNDUgMTUuMDI3OUwxMS4xMzk5IDMuNjU3MDNaTTEwLjAwMTIgNy4xMTg4M0M5LjUxNzI1IDcuMTE4ODMgOS4xMjQ5MiA3LjUxMTIgOS4xMjQ5MiA3Ljk5NTE4VjExLjQ1NjhDOS4xMjQ5MiAxMS45NDA4IDkuNTE3MjUgMTIuMzMzMiAxMC4wMDEyIDEyLjMzMzJDMTAuNDg1MiAxMi4zMzMyIDEwLjg3NzUgMTEuOTQwOCAxMC44Nzc1IDExLjQ1NjhWNy45OTUxOEMxMC44Nzc1IDcuNTExMiAxMC40ODUyIDcuMTE4ODMgMTAuMDAxMiA3LjExODgzWk0xMC4wMDEyIDE1LjIyNTJDMTAuNDg1MiAxNS4yMjUyIDEwLjg3NzUgMTQuODMyOSAxMC44Nzc1IDE0LjM0ODlDMTAuODc3NSAxMy44NjQ5IDEwLjQ4NTIgMTMuNDcyNSAxMC4wMDEyIDEzLjQ3MjVDOS41MTcyNSAxMy40NzI1IDkuMTI0OTIgMTMuODY0OSA5LjEyNDkyIDE0LjM0ODlDOS4xMjQ5MiAxNC44MzI5IDkuNTE3MjUgMTUuMjI1MiAxMC4wMDEyIDE1LjIyNTJaIiBmaWxsPSJ3aGl0ZSIvPg08L3N2Zz4=';

  /* ================================================================== */
  /* Spam guard                                                          */
  /* ================================================================== */

  var SPAM_DEFAULTS = {
    // Hard rules -> silent block (bot sees a success message, nothing is sent).
    honeypot: true,
    honeypotName: 'website', // attractive to bots, invisible to people
    webdriver: true, // navigator.webdriver === true (headless browsers)
    minSeconds: 3, // submitted faster than this after the form appeared
    requireTrustedInput: true, // at least one isTrusted key/pointer event
    repeatMinutes: 10, // second submit from the same browser within N minutes
    // Soft rules -> score; at or above `threshold` the user sees an error.
    threshold: 3,
    maxNameWords: 5,
    maxNameLength: 60,
    maxLocalPartLength: 40,
    blockKeywords: [
      'http', 'www.', '.com', '.ru', '.xyz', 'casino', 'crypto', 'bitcoin', 'btc', 'seo',
      'backlink', 'porn', 'sex', 'viagra', 'cialis', 'loan', 'credit', 'forex', 'telegram',
      'whatsapp', 'earn', 'income', 'promo', 'discount', 'free', 'click', 'bonus', 'invest'
    ],
    blockDomains: [
      'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', '10minutemail.com', 'tempmail.com',
      'temp-mail.org', 'throwawaymail.com', 'yopmail.com', 'trashmail.com', 'getnada.com',
      'dispostable.com', 'fakeinbox.com', 'maildrop.cc', 'mohmal.com', 'sharklasers.com',
      'spam4.me', 'mailnesia.com', 'emailondeck.com', 'tempr.email', 'burnermail.io',
      'mailsac.com', 'inboxkitten.com', 'tmpmail.net', 'moakt.com', 'crazymailing.com'
    ],
    // Downstream automation (Make/Zapier/email) can filter on these fields.
    hiddenFields: {
      score: 'spam-score',
      reasons: 'spam-reasons',
      elapsed: 'submitted-after-ms',
      token: 'form-token'
    },
    // What to do on a hard block: 'silent' (fake success) or 'error'.
    hardBlockMode: 'silent'
  };

  var SPAM_STORAGE_KEY = 'fluco:form-submitted';

  function SpamGuard(form, config) {
    this.form = form;
    this.cfg = Object.assign({}, SPAM_DEFAULTS, config || {});
    // `extraDomains` / `extraKeywords` extend the defaults instead of replacing them.
    this.cfg.blockDomains = this.cfg.blockDomains.concat(this.cfg.extraDomains || []).map(function (d) {
      return String(d).toLowerCase();
    });
    this.cfg.blockKeywords = this.cfg.blockKeywords.concat(this.cfg.extraKeywords || []).map(function (k) {
      return String(k).toLowerCase();
    });
    this.startedAt = Date.now();
    this.trustedEvents = 0;
    this.offs = [];

    this.addHoneypot();
    this.addHiddenFields();
    this.trackInteraction();
  }

  SpamGuard.prototype.addHoneypot = function () {
    if (!this.cfg.honeypot) return;
    var wrap = el('div', 'fluco-hp', { 'aria-hidden': 'true' });
    var input = el('input', null, {
      type: 'text',
      name: this.cfg.honeypotName,
      autocomplete: 'off',
      tabindex: '-1'
    });
    wrap.appendChild(input);
    this.form.appendChild(wrap);
    this.honeypot = input;
  };

  SpamGuard.prototype.addHiddenFields = function () {
    var names = this.cfg.hiddenFields;
    this.fields = {};
    Object.keys(names).forEach(function (key) {
      var input = el('input', null, { type: 'hidden', name: names[key] });
      this.form.appendChild(input);
      this.fields[key] = input;
    }, this);
    // Opaque token: form id + start time. Not a secret, just a marker for
    // downstream filters ("no token" = the JS never ran = direct POST).
    this.fields.token.value = 'f' + Math.abs(hash((this.form.id || 'form') + this.startedAt)).toString(36) + '-' + this.startedAt.toString(36);
  };

  SpamGuard.prototype.trackInteraction = function () {
    var self = this;
    ['keydown', 'pointerdown', 'touchstart'].forEach(function (type) {
      self.offs.push(
        F.on(
          self.form,
          type,
          function (event) {
            if (event.isTrusted) self.trustedEvents++;
          },
          { passive: true }
        )
      );
    });
  };

  /* ---------- rules ---------- */

  function hash(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return h;
  }

  function escapeRe(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /** Whole-word match for plain words ("free" must not hit "Freeman"). */
  function hasKeyword(value, list) {
    var v = value.toLowerCase();
    return list.some(function (word) {
      if (/^[a-z]+$/.test(word)) return new RegExp('(^|[^a-z])' + word + '([^a-z]|$)').test(v);
      return v.indexOf(word) !== -1;
    });
  }

  function looksRandom(str) {
    // Long runs of consonants or digits ("xkqzvbn", "a8f7g6h5") are typical
    // of generated strings; real names and mailboxes have vowels. Six in a
    // row keeps "Schmidt" / "Krzysztof" safe (y counts as a vowel).
    var s = str.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (s.length < 6) return false;
    if (/[bcdfghjklmnpqrstvwxz]{6,}/.test(s)) return true;
    var digits = (s.match(/\d/g) || []).length;
    return digits / s.length > 0.5;
  }

  function isUrlToken(word) {
    return /^(https?|www\.|\.[a-z]{2,4}$)/.test(word);
  }

  function mixedScripts(str) {
    var latin = /[A-Za-z]/.test(str);
    var cyrillic = /[Ѐ-ӿ]/.test(str);
    var cjk = /[぀-ヿ一-鿿]/.test(str);
    return (latin && cyrillic) || (latin && cjk) || (cyrillic && cjk);
  }

  SpamGuard.prototype.lastSubmitAgeMinutes = function () {
    try {
      var ts = parseInt(window.localStorage.getItem(SPAM_STORAGE_KEY), 10);
      if (!ts) return Infinity;
      return (Date.now() - ts) / 60000;
    } catch (e) {
      return Infinity;
    }
  };

  SpamGuard.prototype.rememberSubmit = function () {
    try {
      window.localStorage.setItem(SPAM_STORAGE_KEY, String(Date.now()));
    } catch (e) {
      /* private mode */
    }
  };

  /**
   * @returns {{ hard: string[], score: number, reasons: string[], elapsed: number }}
   */
  SpamGuard.prototype.evaluate = function (values) {
    var cfg = this.cfg;
    var hard = [];
    var soft = [];
    var score = 0;
    var elapsed = Date.now() - this.startedAt;

    var add = function (points, reason) {
      score += points;
      soft.push(reason);
    };

    /* hard rules */
    if (cfg.honeypot && this.honeypot && this.honeypot.value) hard.push('honeypot');
    if (cfg.webdriver && navigator.webdriver === true) hard.push('webdriver');
    if (cfg.minSeconds && elapsed < cfg.minSeconds * 1000) hard.push('too-fast');
    if (cfg.requireTrustedInput && this.trustedEvents === 0) hard.push('no-interaction');
    if (cfg.repeatMinutes && this.lastSubmitAgeMinutes() < cfg.repeatMinutes) hard.push('repeat');

    /* name */
    var name = String(values.name || '').trim();
    var email = String(values.email || '').trim().toLowerCase();
    var at = email.lastIndexOf('@');
    var local = at > 0 ? email.slice(0, at) : email;
    var domain = at > 0 ? email.slice(at + 1) : '';

    if (/https?:\/\/|www\.|\.[a-z]{2,4}\//i.test(name)) hard.push('url-in-name');
    if (hasKeyword(name, cfg.blockKeywords)) add(3, 'name-keyword');
    if (/\d/.test(name)) add(2, 'name-digits');
    if (name.split(/\s+/).length > cfg.maxNameWords) add(2, 'name-too-many-words');
    if (name.length > cfg.maxNameLength) add(2, 'name-too-long');
    if (mixedScripts(name)) add(2, 'name-mixed-scripts');
    if (/(.)\1{3,}/.test(name)) add(2, 'name-repeated-chars');
    if (name.split(/\s+/).some(looksRandom)) add(2, 'name-random');
    if (name && local && name.replace(/\s/g, '').toLowerCase() === local) add(1, 'name-equals-mailbox');

    /* email */
    if (domain && cfg.blockDomains.indexOf(domain) !== -1) hard.push('disposable-domain');
    if (local.length > cfg.maxLocalPartLength) add(2, 'mailbox-too-long');
    if (looksRandom(local)) add(2, 'mailbox-random');
    // "robertsmith48213@gmail.com" style: letters glued to 4+ digits.
    if (/^[a-z]{5,}\d{4,}$/.test(local)) add(2, 'mailbox-name-digits');
    if (hasKeyword(local, cfg.blockKeywords.filter(function (w) { return !isUrlToken(w); }))) add(2, 'mailbox-keyword');
    if (domain && !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) add(3, 'domain-invalid');

    /* environment */
    if (!navigator.languages || navigator.languages.length === 0) add(1, 'no-languages');

    return { hard: hard, score: score, reasons: hard.concat(soft), elapsed: elapsed };
  };

  /** Write the verdict into the hidden fields so it travels with the lead. */
  SpamGuard.prototype.annotate = function (verdict) {
    this.fields.score.value = String(verdict.score);
    this.fields.reasons.value = verdict.reasons.join(',');
    this.fields.elapsed.value = String(verdict.elapsed);
  };

  SpamGuard.prototype.destroy = function () {
    this.offs.forEach(function (off) {
      off();
    });
  };

  /* ================================================================== */
  /* Validation                                                          */
  /* ================================================================== */

  var Validator = {
    // Letters from any script, spaces, hyphens, apostrophes and dots
    // ("O'Neil", "Jean-Luc", "J. R."). Unicode property escapes need the
    // `u` flag; every browser that runs this site supports them.
    NAME_RE: /^[\p{L}\p{M}\s'’.\-—]+$/u,
    // Pragmatic e-mail check; the real validation happens server-side.
    EMAIL_RE: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,

    name: function (value) {
      var v = String(value || '').trim();
      return v.length > 1 && Validator.NAME_RE.test(v);
    },
    email: function (value) {
      var v = String(value || '').trim();
      return v.length > 0 && Validator.EMAIL_RE.test(v);
    },
    splitName: function (value) {
      var parts = String(value || '').trim().split(/\s+/).filter(Boolean);
      return {
        firstname: parts[0] || '',
        lastname: parts.slice(1).join(' ')
      };
    }
  };

  /* ================================================================== */
  /* Form                                                                */
  /* ================================================================== */

  function Form(form, spamConfig) {
    this.form = form;
    this.steps = F.dom.qsa('.new-newsletter-form-step', form);
    this.nextButton = qs('.new-newsletter-next-button', form);
    this.submitButton = qs('input[type="submit"], button[type="submit"]', form);
    this.email = qs('input[type="email"]', form);
    this.fullname = qs('input[name="Fullname"], input[type="text"]', form);
    this.wForm = form.closest('.w-form');
    this.doneBlock = this.wForm ? qs('.w-form-done', this.wForm) : null;
    this.offs = [];

    if (this.steps.length < 2 || !this.nextButton || !this.submitButton || !this.email || !this.fullname) {
      F.error('[subscription-form] Missing required markup in', form);
      return;
    }

    this.hidden = {
      firstname: el('input', null, { type: 'hidden', name: 'firstname' }),
      lastname: el('input', null, { type: 'hidden', name: 'lastname' })
    };
    form.appendChild(this.hidden.firstname);
    form.appendChild(this.hidden.lastname);

    this.errors = {
      email: this.createError(this.email),
      fullname: this.createError(this.fullname)
    };

    this.guard = new SpamGuard(form, spamConfig);

    this.buildDots();
    this.bind();
    this.showStep(0);
  }

  Form.prototype.createError = function (input) {
    var group = el('div', 'message-group hide', { role: 'alert', 'aria-live': 'polite' });
    var icon = el('div', 'error-icon hide');
    var message = el('div', 'message error hide');
    message.textContent = input.dataset.errorMessage || 'This field is required';
    group.appendChild(icon);
    group.appendChild(message);
    input.parentElement.appendChild(group);
    return { group: group, icon: icon, message: message, input: input, defaultText: message.textContent };
  };

  Form.prototype.setError = function (error, visible, text) {
    error.message.textContent = text || error.defaultText;
    error.group.classList.toggle('hide', !visible);
    error.icon.classList.toggle('hide', !visible);
    error.message.classList.toggle('hide', !visible);
    error.input.classList.toggle('error', visible);
    error.input.setAttribute('aria-invalid', visible ? 'true' : 'false');
  };

  Form.prototype.buildDots = function () {
    this.dotsWrapper = el('div', 'new-newsletter-controls hide');
    this.dots = this.steps.map(function (step, index) {
      var dot = el('div', 'new-newsletter-controls-dot dot-' + index);
      this.dotsWrapper.appendChild(dot);
      return dot;
    }, this);
    this.form.appendChild(this.dotsWrapper);
  };

  Form.prototype.setSubmitEnabled = function (enabled, visible) {
    var b = this.submitButton;
    b.disabled = !enabled;
    b.classList.toggle('disabled', !enabled);
    b.classList.toggle('hidden-button', visible === false);
  };

  Form.prototype.showStep = function (index) {
    this.currentStep = index;
    this.steps.forEach(function (step, i) {
      step.classList.toggle('active-step', i === index);
      step.classList.toggle('inactive-step', i !== index);
    });
    this.dots.forEach(function (dot, i) {
      dot.classList.toggle('active', i === index);
      dot.classList.toggle('finished', i < index);
    });
    this.nextButton.classList.toggle('finished-button-step', index > 0);

    if (index === 0) {
      this.setSubmitEnabled(false, false);
      this.nextButton.classList.toggle('hidden-button', !this.email.value);
      this.nextButton.classList.toggle('disabled', !this.email.value);
    } else {
      this.validateName();
      this.fullname.focus();
    }
  };

  Form.prototype.goNext = function () {
    if (!Validator.email(this.email.value)) {
      this.setError(this.errors.email, true);
      this.email.focus();
      return;
    }
    this.setError(this.errors.email, false);
    this.showStep(1);
  };

  Form.prototype.validateName = function () {
    var value = this.fullname.value;
    if (!value) {
      this.setError(this.errors.fullname, false);
      this.setSubmitEnabled(false, false);
      return false;
    }
    var ok = Validator.name(value);
    this.setError(this.errors.fullname, !ok);
    if (ok) {
      var parts = Validator.splitName(value);
      this.hidden.firstname.value = parts.firstname;
      this.hidden.lastname.value = parts.lastname;
    }
    this.setSubmitEnabled(ok, true);
    return ok;
  };

  /** Mimic Webflow's own success state without sending anything. */
  Form.prototype.fakeSuccess = function () {
    this.form.style.display = 'none';
    if (this.doneBlock) this.doneBlock.style.display = 'block';
  };

  Form.prototype.onSubmit = function (event) {
    var emailOk = Validator.email(this.email.value);
    var nameOk = this.validateName();
    if (!emailOk || !nameOk) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    var verdict = this.guard.evaluate({ email: this.email.value, name: this.fullname.value });
    this.guard.annotate(verdict);
    F.log('[subscription-form] spam verdict', verdict);

    if (verdict.hard.length) {
      event.preventDefault();
      event.stopImmediatePropagation(); // keep Webflow's AJAX handler out
      if (this.guard.cfg.hardBlockMode === 'silent') this.fakeSuccess();
      else this.setError(this.errors.email, true, 'Something went wrong. Please try again later.');
      return;
    }

    if (verdict.score >= this.guard.cfg.threshold) {
      event.preventDefault();
      event.stopImmediatePropagation();
      var nameIssue = verdict.reasons.some(function (r) {
        return r.indexOf('name-') === 0;
      });
      if (nameIssue) {
        this.setError(this.errors.fullname, true, 'Please enter your real name.');
        this.fullname.focus();
      } else {
        this.showStep(0);
        this.setError(this.errors.email, true, 'Please use a valid personal or work e-mail.');
        this.email.focus();
      }
      return;
    }

    this.guard.rememberSubmit();
  };

  Form.prototype.bind = function () {
    var self = this;

    // Enter must not submit the form from step 1.
    this.offs.push(
      F.on(this.form, 'keydown', function (event) {
        if (event.key !== 'Enter') return;
        if (self.currentStep === 0) {
          event.preventDefault();
          self.goNext();
        } else if (!self.validateName()) {
          event.preventDefault();
        }
      })
    );

    this.offs.push(
      F.on(this.email, 'input', function () {
        var has = !!self.email.value.trim();
        self.setError(self.errors.email, false);
        self.nextButton.classList.toggle('disabled', !has);
        self.nextButton.classList.toggle('hidden-button', !has);
        self.dotsWrapper.classList.toggle('hide', !has);
      })
    );

    // Bound once, outside the input handler (the original re-registered
    // this listener on every keystroke).
    this.offs.push(
      F.on(this.nextButton, 'click', function (event) {
        event.preventDefault();
        self.goNext();
      })
    );

    this.offs.push(
      F.on(this.fullname, 'input', function () {
        self.validateName();
      })
    );

    this.offs.push(
      F.on(this.dots[0], 'click', function () {
        self.showStep(0);
      })
    );
    this.offs.push(
      F.on(this.dots[1], 'click', function () {
        if (Validator.email(self.email.value)) self.showStep(1);
      })
    );

    // Capture phase: runs before Webflow's document-level submit handler.
    this.offs.push(F.on(this.form, 'submit', this.onSubmit.bind(this), true));
  };

  Form.prototype.destroy = function () {
    this.guard.destroy();
    this.offs.forEach(function (off) {
      off();
    });
  };

  /* ================================================================== */

  F.css(
    'subscription-form',
    [
      // Honeypot: off-screen, not display:none (some bots skip hidden fields).
      '.fluco-hp{position:absolute!important;left:-10000px!important;top:auto!important;width:1px!important;height:1px!important;overflow:hidden!important;opacity:0!important}',
      '.new-newsletter-form select{appearance:none}',
      '.inactive-step{visibility:hidden;opacity:0}',
      '.active-step{visibility:visible!important;left:0!important}',
      '.finished-button-step{visibility:hidden!important;opacity:0!important}',
      '.new-newsletter-form .w-input.drop.active{color:#263238}',
      '.new-newsletter-form .w-input,.new-newsletter-form-step,.new-newsletter-form .w-button{transition:all .3s}',
      '.new-newsletter-form .w-input.error{box-shadow:inset 0 0 0 2px #f00}',
      '.new-newsletter-form .disabled{cursor:not-allowed;opacity:.5}',
      '.new-newsletter-form .disabled.hidden-button,.new-newsletter-form .hidden-button{opacity:0;pointer-events:none}',
      '.new-newsletter-form .message-group{display:inline-flex;align-items:center;color:#fff;background:#f00;border-radius:1.667vw;padding-left:.278vw;padding-right:.972vw;margin-top:.625vw;z-index:1}',
      '.new-newsletter-form .message-group.hide{visibility:hidden;opacity:0}',
      '.new-newsletter-form .message.error{font-size:.972vw;line-height:1.528vw;margin-bottom:.139vw}',
      '.new-newsletter-form .error.hide{display:none}',
      '.new-newsletter-form .w-form-label{user-select:none}',
      '.new-newsletter-form .error-icon{background:url("data:image/svg+xml;base64,' +
        ICON_ERROR +
        '") center/contain no-repeat;width:1.667vw;height:1.667vw;visibility:visible;opacity:1}',
      '.new-newsletter-form .error-icon.hide{visibility:hidden;opacity:0}',
      '.new-newsletter-controls{display:flex;gap:.208vw;justify-content:center;position:relative;top:1.111vw;visibility:visible;opacity:1;transition:all .3s}',
      '.new-newsletter-controls.hide{visibility:hidden;opacity:0}',
      '.new-newsletter-controls-dot{width:.486vw;height:.486vw;background:#1e1e1e;border-radius:50%;opacity:.5;transition:all .3s}',
      '.new-newsletter-for-wrapper.stay-tuned .new-newsletter-controls-dot{background:#fff}',
      '.new-newsletter-controls-dot.active{opacity:1}',
      '.new-newsletter-controls-dot.finished{cursor:pointer}',
      '@media (max-width:479px){',
      '.new-newsletter-form .message-group{border-radius:16px;padding-left:4px;padding-right:6px}',
      '.new-newsletter-form .message.error{font-size:12px;line-height:16px;margin-bottom:2px}',
      '.new-newsletter-form .error-icon{width:16px;height:16px}',
      '.new-newsletter-controls{gap:3px;top:12px}',
      '.new-newsletter-controls-dot{width:7px;height:7px}',
      '}'
    ].join('\n')
  );

  // Reusable for any other Webflow form on the site:
  //   var guard = new Fluco.SpamGuard(form); form.addEventListener('submit', e => {
  //     var v = guard.evaluate({ email: ..., name: ... }); if (v.hard.length) { e.preventDefault(); … }
  //   }, true);
  window.Fluco.SpamGuard = SpamGuard;
  window.Fluco.SpamValidator = Validator;

  F.ready(function () {
    var spamConfig = window.FlucoSpamConfig || {};
    window.Fluco.subscriptionForms = F.dom.qsa('.new-newsletter-form').map(function (form) {
      return new Form(form, spamConfig);
    });
  }, 'subscription-form');
})(window, document);
