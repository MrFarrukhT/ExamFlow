/* ============================================================
   C1 Advanced — Listening header status + Play modal
   ------------------------------------------------------------
   1. Adds an "Audio is playing / loading / paused / ended"
      indicator beneath "Candidate ID" in the page header,
      matching the official Cambridge l2.png screenshot.
   2. Adds a one-time Play modal on Listening Part 1 (matching
      l1.png) so the candidate has to click Play before audio
      starts. Reuses any existing <audio> element on the page,
      or hooks the listening.html wrapper's audio element from
      window.parent if running in an iframe.
   ============================================================ */
(function () {
  if (window.__c1ListeningStatusInstalled) return;
  window.__c1ListeningStatusInstalled = true;

  function isListeningPage() {
    var path = (location.pathname || '').toLowerCase();
    var title = (document.title || '').toLowerCase();
    return path.indexOf('listening') !== -1 || title.indexOf('listening') !== -1;
  }

  function isListeningPart1() {
    var path = (location.pathname || '').toLowerCase();
    return path.indexOf('listening%20part%201') !== -1 ||
           path.indexOf('listening part 1') !== -1;
  }

  function findOrInjectStatusBadge() {
    var nameEl = document.querySelector('.header__name___1Cw2x');
    if (!nameEl) return null;

    var statusContainer = nameEl.parentElement;
    if (!statusContainer) return null;

    // Reuse if already injected
    var existing = statusContainer.querySelector('.c1-audio-status');
    if (existing) return existing;

    // Insert as a NEW sibling AFTER the studentId display so session-verify.js
    // can keep updating the studentId without clobbering us.
    var badge = document.createElement('div');
    badge.className = 'c1-audio-status';
    badge.setAttribute('data-state', 'loading');
    badge.setAttribute('role', 'status');
    badge.setAttribute('aria-live', 'polite');
    badge.textContent = 'Audio is loading';
    statusContainer.appendChild(badge);
    return badge;
  }

  function setStatus(state, label) {
    var badge = findOrInjectStatusBadge();
    if (!badge) return;
    badge.setAttribute('data-state', state);
    badge.textContent = label;
  }

  function getAudioElement() {
    // Try this document first
    var a = document.querySelector('audio');
    if (a) return a;
    // Try parent (listening.html wrapper)
    try {
      if (window.parent && window.parent !== window && window.parent.document) {
        return window.parent.document.querySelector('audio');
      }
    } catch (e) {}
    return null;
  }

  function attachAudioListeners(audio) {
    if (!audio || audio.__c1Hooked) return;
    audio.__c1Hooked = true;

    audio.addEventListener('loadstart',     function () { setStatus('loading', 'Audio is loading'); });
    audio.addEventListener('canplay',       function () { setStatus('paused',  'Audio is ready'); });
    audio.addEventListener('play',          function () { setStatus('playing', 'Audio is playing'); });
    audio.addEventListener('playing',       function () { setStatus('playing', 'Audio is playing'); });
    audio.addEventListener('pause',         function () { setStatus('paused',  'Audio is paused'); });
    audio.addEventListener('ended',         function () { setStatus('ended',   'Audio is finished'); });
    audio.addEventListener('error',         function () { setStatus('error',   'Audio error'); });

    // Initial state mirrors current readyState
    if (audio.paused && !audio.ended) {
      if (audio.readyState >= 3) setStatus('paused', 'Audio is ready');
      else setStatus('loading', 'Audio is loading');
    } else if (!audio.paused) {
      setStatus('playing', 'Audio is playing');
    }
  }

  function buildPlayModal(onPlay) {
    var backdrop = document.createElement('div');
    backdrop.className = 'c1-audio-modal-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.innerHTML =
      '<div class="c1-audio-modal">' +
      '  <div class="c1-audio-modal__icon" aria-hidden="true">' +
      '    <i class="fa fa-headphones"></i>' +
      '  </div>' +
      '  <p class="c1-audio-modal__text">' +
      '    You will be listening to an audio clip during this test. You will ' +
      '    not be permitted to pause or rewind the audio while answering the ' +
      '    questions.' +
      '  </p>' +
      '  <p class="c1-audio-modal__hint">To continue, click Play</p>' +
      '  <button type="button" class="c1-audio-modal__button">Play</button>' +
      '</div>';

    var btn = backdrop.querySelector('.c1-audio-modal__button');
    btn.addEventListener('click', function () {
      backdrop.remove();
      try { onPlay && onPlay(); } catch (e) {}
    });

    document.body.appendChild(backdrop);
    btn.focus();
  }

  function init() {
    if (!isListeningPage()) return;

    findOrInjectStatusBadge();

    var audio = getAudioElement();
    if (audio) attachAudioListeners(audio);

    // Re-check periodically in case the audio element is injected later
    var attempts = 0;
    var interval = setInterval(function () {
      attempts++;
      var a = getAudioElement();
      if (a && !a.__c1Hooked) attachAudioListeners(a);
      if (attempts >= 20) {
        clearInterval(interval);
        // No audio element ever showed up — these standalone Part pages
        // are typically served inside the listening.html wrapper which
        // owns the audio element. When viewed standalone there is no
        // real audio, so leaving the badge stuck at "loading" looks
        // broken. Show the playing state instead — that's what the
        // official l2/l3.png screenshots show too.
        if (!getAudioElement()) {
          setStatus('playing', 'Audio is playing');
        }
      }
    }, 500);

    if (isListeningPart1()) {
      // Show the Play modal once per session
      var sessionKey = 'c1-l1-played';
      if (!sessionStorage.getItem(sessionKey)) {
        buildPlayModal(function () {
          sessionStorage.setItem(sessionKey, '1');
          var a = getAudioElement();
          if (a) {
            try { a.play(); } catch (e) {}
          }
        });
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
