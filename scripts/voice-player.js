/*!
 * Voice Player — audio "listen to story" button with an SVG progress ring.
 * Replaces: tests/voice-player.js
 * Requires: shared/fluco-core.js
 *
 * Two ways to use:
 *  1. Declarative (recommended):
 *       <a class="button" data-fluco-voice-src="https://…/story.mp3"
 *          data-fluco-voice-labels="true">
 *         <span class="button-label">Listen to story</span>
 *       </a>
 *       <div class="player-controls"><div class="play"></div><div class="pause"></div></div>
 *  2. Manual: new Fluco.VoicePlayer(src, buttonElementOrSelector, changeLabels)
 */
(function (window, document) {
  'use strict';

  var F = window.Fluco;
  if (!F) {
    console.error('[voice-player] Fluco core is missing. Load shared/fluco-core.js first.');
    return;
  }

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var LABELS = {
    idle: 'Listen to story',
    playing: 'Pause story',
    paused: 'Continue story'
  };
  var RING = { size: 40, sizeVw: 2.778, gapVw: 1.042, stroke: 2.5 };

  function VoicePlayer(src, button, changeLabels) {
    this.button = typeof button === 'string' ? F.dom.qs(button) : button;
    if (!this.button) {
      F.error('[voice-player] Button not found:', button);
      return;
    }
    this.label = F.dom.qs('.button-label', this.button);
    this.controls = F.dom.qs('.player-controls', this.button) || F.dom.qs('.player-controls');
    this.playIcon = this.controls ? F.dom.qs('.play', this.controls) : null;
    this.pauseIcon = this.controls ? F.dom.qs('.pause', this.controls) : null;
    this.changeLabels = !!changeLabels;
    this.state = 'idle';
    this.offs = [];

    this.audio = new Audio();
    this.audio.preload = 'metadata';
    this.audio.src = src;

    this.buildRing();
    this.bind();
  }

  VoicePlayer.prototype.buildRing = function () {
    var r = RING.size / 2 - RING.stroke / 2;
    this.circumference = 2 * Math.PI * r; // FIX: precedence bug in the original

    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'player-indicator');
    svg.setAttribute('viewBox', '0 0 ' + RING.size + ' ' + RING.size);
    svg.setAttribute('fill', 'none');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.display = 'none';

    var track = document.createElementNS(SVG_NS, 'circle');
    track.setAttribute('cx', RING.size / 2);
    track.setAttribute('cy', RING.size / 2);
    track.setAttribute('r', r);
    track.setAttribute('stroke', 'rgba(0, 0, 0, 0.1)');
    track.setAttribute('stroke-width', RING.stroke);

    var active = document.createElementNS(SVG_NS, 'circle');
    active.setAttribute('class', 'player-indicator-active');
    active.setAttribute('cx', RING.size / 2);
    active.setAttribute('cy', RING.size / 2);
    active.setAttribute('r', r);
    active.setAttribute('stroke', 'currentColor');
    active.setAttribute('stroke-width', RING.stroke);
    active.setAttribute('transform', 'rotate(-90 ' + RING.size / 2 + ' ' + RING.size / 2 + ')');
    active.style.strokeDasharray = String(this.circumference);
    active.style.strokeDashoffset = String(this.circumference);

    svg.appendChild(track);
    svg.appendChild(active);
    (this.controls || this.button).appendChild(svg);

    this.ring = svg;
    this.ringActive = active;
  };

  VoicePlayer.prototype.setState = function (state) {
    this.state = state;
    var playing = state === 'playing';
    if (this.playIcon) this.playIcon.style.display = playing ? 'none' : 'flex';
    if (this.pauseIcon) this.pauseIcon.style.display = playing ? 'flex' : 'none';
    this.ring.style.display = state === 'idle' ? 'none' : 'block';
    if (this.changeLabels && this.label) this.label.textContent = LABELS[state];
    this.button.setAttribute('aria-pressed', String(playing));
  };

  VoicePlayer.prototype.updateRing = function () {
    var d = this.audio.duration;
    if (!isFinite(d) || d === 0) return;
    var progress = this.audio.currentTime / d;
    this.ringActive.style.strokeDashoffset = String(this.circumference * (1 - progress));
  };

  VoicePlayer.prototype.toggle = function () {
    if (this.state === 'playing') this.audio.pause();
    else {
      var p = this.audio.play();
      if (p && p.catch) p.catch(function (err) {
        F.log('[voice-player] play() rejected:', err && err.name);
      });
    }
  };

  VoicePlayer.prototype.bind = function () {
    var self = this;
    this.button.classList.add('voice-player-button');
    this.button.setAttribute('role', 'button');
    this.offs.push(
      F.on(this.button, 'click', function (event) {
        event.preventDefault();
        self.toggle();
      })
    );
    this.offs.push(F.on(this.audio, 'play', function () { self.setState('playing'); }));
    this.offs.push(F.on(this.audio, 'pause', function () {
      if (self.state !== 'idle') self.setState('paused');
    }));
    this.offs.push(F.on(this.audio, 'ended', function () {
      self.audio.currentTime = 0;
      self.updateRing();
      self.setState('idle');
    }));
    this.offs.push(F.on(this.audio, 'timeupdate', function () { self.updateRing(); }));
  };

  VoicePlayer.prototype.destroy = function () {
    this.audio.pause();
    this.offs.forEach(function (off) { off(); });
    this.ring.remove();
  };

  F.css(
    'voice-player',
    [
      '.player-indicator{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:' + RING.sizeVw + 'vw;height:' + RING.sizeVw + 'vw}',
      '.player-indicator-active{transition:stroke-dashoffset .3s linear}',
      '.voice-player-button{grid-column-gap:' + RING.gapVw + 'vw}',
      '@media (max-width:479px){.player-indicator{width:' + (RING.size - 12) + 'px;height:' + (RING.size - 12) + 'px}.voice-player-button{grid-column-gap:12px!important}}'
    ].join('\n')
  );

  window.Fluco.VoicePlayer = VoicePlayer;

  F.ready(function () {
    window.Fluco.voicePlayers = F.dom.qsa('[data-fluco-voice-src]').map(function (button) {
      return new VoicePlayer(button.dataset.flucoVoiceSrc, button, F.dom.attrBool(button.dataset.flucoVoiceLabels));
    });
  }, 'voice-player');
})(window, document);
