/* Shared helpers for C1 Advanced (CAE) test part pages */
(function () {
  'use strict';

  // -----------------------------------------------------------
  // Module detection — guesses from URL path so each part page
  // doesn't have to declare it manually.
  // -----------------------------------------------------------
  function detectModule() {
    var path = (location.pathname || '').toLowerCase();
    if (path.indexOf('writing-part') !== -1) return 'writing';
    if (path.indexOf('listening-part') !== -1) return 'listening';
    // Reading & Use of English Part 1-8 (named "Part 1.html" etc.)
    return 'reading';
  }

  var MODULE = detectModule();
  var STORAGE_KEY = 'cambridge-' + MODULE + 'Answers';

  function loadAnswers() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  function saveAnswers(answers) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
    } catch (e) {
      console.warn('Failed to save answers:', e);
    }
  }

  function setAnswer(qNum, value) {
    var answers = loadAnswers();
    answers[String(qNum)] = value;
    saveAnswers(answers);
  }

  function getAnswer(qNum) {
    var answers = loadAnswers();
    var v = answers[String(qNum)];
    return v == null ? '' : v;
  }

  // -----------------------------------------------------------
  // Force-save hook used by parent wrapper's autosave timer
  // -----------------------------------------------------------
  window.__C1_forceSaveAll = function () {
    // All inputs save synchronously on input/change so this is mostly a no-op
    // but we re-flush textarea values to be safe.
    document.querySelectorAll('[data-q]').forEach(function (el) {
      var q = el.getAttribute('data-q');
      if (!q) return;
      if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
        if (el.type === 'radio' || el.type === 'checkbox') {
          if (el.checked) setAnswer(q, el.value);
        } else {
          setAnswer(q, el.value);
        }
      } else if (el.tagName === 'SELECT') {
        setAnswer(q, el.value);
      }
    });
  };

  // -----------------------------------------------------------
  // Question rendering helpers
  // -----------------------------------------------------------
  function renderMultipleChoice(container, qNum, stem, options) {
    var qDiv = document.createElement('div');
    qDiv.className = 'c1-question';
    qDiv.innerHTML =
      '<span class="q-num">' + qNum + '</span>' +
      '<span class="q-stem">' + stem + '</span>' +
      '<div class="c1-options" id="opts-' + qNum + '"></div>';
    container.appendChild(qDiv);

    var optsDiv = qDiv.querySelector('#opts-' + qNum);
    var current = getAnswer(qNum);

    options.forEach(function (opt) {
      var letter = opt.letter;
      var text = opt.text;
      var label = document.createElement('label');
      label.className = 'c1-option' + (current === letter ? ' selected' : '');
      label.innerHTML =
        '<input type="radio" name="q' + qNum + '" value="' + letter + '" data-q="' + qNum + '"' +
        (current === letter ? ' checked' : '') + '>' +
        '<span class="opt-letter">' + letter + '</span><span>' + text + '</span>';
      label.querySelector('input').addEventListener('change', function (e) {
        setAnswer(qNum, e.target.value);
        // Update visual selected state
        optsDiv.querySelectorAll('.c1-option').forEach(function (lbl) {
          lbl.classList.remove('selected');
        });
        label.classList.add('selected');
      });
      optsDiv.appendChild(label);
    });
  }

  function renderTextInput(qNum, placeholder, wide) {
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'c1-text-input' + (wide ? ' wide' : '');
    input.setAttribute('data-q', qNum);
    input.placeholder = placeholder || ('q' + qNum);
    input.value = getAnswer(qNum);
    input.addEventListener('input', function () {
      setAnswer(qNum, input.value);
    });
    return input;
  }

  function renderTextarea(qNum, minWords, maxWords, placeholder) {
    var wrapper = document.createElement('div');
    var ta = document.createElement('textarea');
    ta.className = 'c1-textarea';
    ta.setAttribute('data-q', qNum);
    ta.placeholder = placeholder || 'Write your response here…';
    ta.value = getAnswer(qNum);

    var counter = document.createElement('div');
    counter.className = 'c1-wordcount';

    function updateCount() {
      var text = ta.value.trim();
      var words = text === '' ? 0 : text.split(/\s+/).length;
      var inRange = words >= minWords && words <= maxWords;
      counter.textContent = 'Word count: ' + words + ' / target ' + minWords + '–' + maxWords;
      counter.className = 'c1-wordcount ' + (words === 0 ? '' : (inRange ? 'in-range' : 'out-of-range'));
    }

    ta.addEventListener('input', function () {
      setAnswer(qNum, ta.value);
      updateCount();
    });

    updateCount();
    wrapper.appendChild(ta);
    wrapper.appendChild(counter);
    return wrapper;
  }

  function renderSelect(qNum, optionList) {
    var select = document.createElement('select');
    select.setAttribute('data-q', qNum);
    var blank = document.createElement('option');
    blank.value = '';
    blank.textContent = '— Select —';
    select.appendChild(blank);
    optionList.forEach(function (opt) {
      var o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.text;
      select.appendChild(o);
    });
    var current = getAnswer(qNum);
    if (current) select.value = current;
    select.addEventListener('change', function () {
      setAnswer(qNum, select.value);
    });
    return select;
  }

  // -----------------------------------------------------------
  // Navigation footer
  // -----------------------------------------------------------
  function buildNav(opts) {
    var nav = document.createElement('div');
    nav.className = 'c1-nav';

    var prev = document.createElement('button');
    prev.className = 'btn-prev';
    prev.textContent = '\u2190 Previous';
    if (!opts.prevUrl) prev.disabled = true;
    prev.addEventListener('click', function () {
      if (opts.prevUrl) navigateTo(opts.prevUrl);
    });

    var progress = document.createElement('div');
    progress.className = 'progress';
    progress.textContent = opts.progressText || '';

    var next;
    if (opts.isLast) {
      next = document.createElement('button');
      next.className = 'btn-submit';
      next.textContent = 'Submit ' + (MODULE.charAt(0).toUpperCase() + MODULE.slice(1)) + ' \u2713';
      next.addEventListener('click', function () {
        if (confirm('Are you sure you want to submit your ' + MODULE + ' test? You won\'t be able to change your answers after submission.')) {
          submitTest();
        }
      });
    } else {
      next = document.createElement('button');
      next.className = 'btn-next';
      next.textContent = 'Next \u2192';
      next.addEventListener('click', function () {
        if (opts.nextUrl) navigateTo(opts.nextUrl);
      });
    }

    nav.appendChild(prev);
    nav.appendChild(progress);
    nav.appendChild(next);
    document.body.appendChild(nav);
  }

  function navigateTo(url) {
    // Save first
    if (typeof window.__C1_forceSaveAll === 'function') window.__C1_forceSaveAll();
    // Try parent (iframe wrapper) first; fall back to direct nav
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'navigate', url: './' + url }, '*');
        return;
      }
    } catch (e) {}
    location.href = url;
  }

  function submitTest() {
    if (typeof window.__C1_forceSaveAll === 'function') window.__C1_forceSaveAll();
    localStorage.setItem('cambridge-' + MODULE + 'Status', 'completed');
    localStorage.setItem('cambridge-' + MODULE + 'EndTime', new Date().toISOString());

    if (MODULE === 'listening') {
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'listening-complete' }, '*');
          return;
        }
      } catch (e) {}
    }

    // Reading / writing return to dashboard
    var dashUrl = '../../dashboard-cambridge.html';
    try {
      if (window.parent && window.parent !== window) {
        window.parent.location.href = dashUrl;
        return;
      }
    } catch (e) {}
    location.href = dashUrl;
  }

  // -----------------------------------------------------------
  // Public API
  // -----------------------------------------------------------
  window.C1Test = {
    module: MODULE,
    setAnswer: setAnswer,
    getAnswer: getAnswer,
    renderMultipleChoice: renderMultipleChoice,
    renderTextInput: renderTextInput,
    renderTextarea: renderTextarea,
    renderSelect: renderSelect,
    buildNav: buildNav,
    submitTest: submitTest
  };
})();
