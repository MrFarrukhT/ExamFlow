/* ============================================================
   C1 Advanced — Single-question pagination
   ------------------------------------------------------------
   Activates only on pages with body[data-c1-layout="single-question"]
   (Reading & Use of English Part 4 — Key word transformation).

   Behaviour:
     - Hides every QuestionDisplay__questionDisplayWrapper except
       the .c1-active-q one (the CSS does the actual hiding).
     - Reads which question is "active" from the existing footer
       nav (.subQuestion.scorable-item.active) on load. Falls back
       to the first wrapper if nothing is marked active.
     - Hooks the footer sub-question buttons so clicking 25, 26, …
       swaps the visible wrapper.
     - Hooks the footer Prev / Next buttons (#footer-nav-button-…)
       to step through the wrappers in order.

   This file is intentionally tiny — we only override the visible
   wrapper. The existing cambridge-part-scroll.js already wires
   the footer nav for scrolling on other parts; for single-question
   pages it would scroll an invisible element, so we run BEFORE
   the scroll script's listener and stopPropagation on clicks
   that hit a wrapper we own.
   ============================================================ */
(function () {
  if (window.__c1QuestionNavInstalled) return;
  window.__c1QuestionNavInstalled = true;

  function isSingleQuestionPage() {
    return document.body && document.body.getAttribute('data-c1-layout') === 'single-question';
  }

  function getWrappers() {
    return Array.prototype.slice.call(
      document.querySelectorAll(
        '#sectionContent .QuestionDisplay__questionDisplayWrapper___1n_b0'
      )
    );
  }

  function wrapperOrderNumber(wrapper) {
    // Wrappers contain a child like #question-c1-25 — pull the trailing number
    var qEl = wrapper.querySelector('[id^="question-c1-"]');
    if (!qEl) return null;
    var m = qEl.id.match(/question-c1-(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  }

  function getInitialActiveNumber(wrappers) {
    var activeBtn = document.querySelector(
      '.footer__questionWrapper___1tZ46.selected .subQuestion.scorable-item.active'
    ) || document.querySelector('.subQuestion.scorable-item.active');
    if (activeBtn) {
      var n = parseInt(activeBtn.getAttribute('data-ordernumber'), 10);
      if (!isNaN(n)) return n;
    }
    // Fallback: first wrapper's number
    if (wrappers.length) return wrapperOrderNumber(wrappers[0]);
    return null;
  }

  function setActive(orderNumber) {
    var wrappers = getWrappers();
    var found = false;
    wrappers.forEach(function (w) {
      if (wrapperOrderNumber(w) === orderNumber) {
        w.classList.add('c1-active-q');
        found = true;
      } else {
        w.classList.remove('c1-active-q');
      }
    });
    if (!found && wrappers.length) {
      // Fallback: activate the first wrapper
      wrappers[0].classList.add('c1-active-q');
    }
    // Update the footer nav highlight to mirror our state
    var btns = document.querySelectorAll('.subQuestion.scorable-item');
    Array.prototype.forEach.call(btns, function (b) {
      var n = parseInt(b.getAttribute('data-ordernumber'), 10);
      if (n === orderNumber) b.classList.add('active');
      else b.classList.remove('active');
    });
  }

  function bindFooterNav() {
    var ourNumbers = getWrappers().map(wrapperOrderNumber).filter(function (n) {
      return n != null;
    });
    if (!ourNumbers.length) return;

    document.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest && e.target.closest('.subQuestion.scorable-item');
      if (!btn) return;
      var n = parseInt(btn.getAttribute('data-ordernumber'), 10);
      if (isNaN(n)) return;
      // Only intercept clicks for questions we own
      if (ourNumbers.indexOf(n) === -1) return;
      e.preventDefault();
      e.stopPropagation();
      setActive(n);
    }, true); // capture phase — runs before cambridge-part-scroll.js

    // Prev / Next buttons
    var prev = document.getElementById('footer-nav-button-previous');
    var next = document.getElementById('footer-nav-button-next');
    function step(delta) {
      var current = currentActive();
      if (current == null) return;
      var idx = ourNumbers.indexOf(current);
      if (idx === -1) return;
      var newIdx = idx + delta;
      if (newIdx < 0) newIdx = 0;
      if (newIdx >= ourNumbers.length) newIdx = ourNumbers.length - 1;
      setActive(ourNumbers[newIdx]);
    }
    if (prev) prev.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      step(-1);
    }, true);
    if (next) next.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      step(1);
    }, true);
  }

  function currentActive() {
    var w = document.querySelector(
      '#sectionContent .QuestionDisplay__questionDisplayWrapper___1n_b0.c1-active-q'
    );
    return w ? wrapperOrderNumber(w) : null;
  }

  /* Part 1 popover gap badge — shows the question number when
     the gap is empty, switches to the chosen letter (A–D) on
     selection. The select element underneath is still the
     functional control; the badge is purely visual.
     Independent from single-question pagination — runs on every
     page that uses .c1-popover-gap. */
  function bindPopoverBadges() {
    var gaps = document.querySelectorAll('.c1-popover-gap');
    if (!gaps.length) return;
    Array.prototype.forEach.call(gaps, function (gap) {
      var sel = gap.querySelector('select');
      var badge = gap.querySelector('.c1-popover-num');
      if (!sel || !badge) return;
      var originalNumber = badge.textContent.trim();
      function sync() {
        if (sel.value && sel.value !== '') {
          badge.textContent = sel.value;
          gap.classList.add('has-value');
        } else {
          badge.textContent = originalNumber;
          gap.classList.remove('has-value');
        }
      }
      sync();
      sel.addEventListener('change', sync);
    });
  }

  /* Bookmark / flag button injection — Parts 5, 6, 8 already
     ship with `.question-margin.right` siblings holding a bookmark
     button per question (the official Inspera UI keeps these on
     the right gutter so candidates can flag items to revisit).
     Parts 1, 2, 3, 4, 7 shipped without them. Inject one per
     question wrapper that doesn't already have a flag sibling.
     The button is non-functional (no real flag persistence in
     this static clone) but it visually matches the official
     screenshots and the existing CSS styles it correctly. */
  function injectFlagButtons() {
    var wrappers = document.querySelectorAll(
      '#sectionContent .QuestionDisplay__questionDisplayWrapper___1n_b0'
    );
    Array.prototype.forEach.call(wrappers, function (wrapper) {
      // Skip if a flag sibling already exists inside the wrapper
      if (wrapper.querySelector('.QuestionDisplay__visibleFlag___AmAom')) return;
      // Build the gutter container + button
      var num = wrapperOrderNumber(wrapper);
      var gutter = document.createElement('div');
      gutter.className = 'screen question-margin right no-title';
      var btn = document.createElement('button');
      btn.setAttribute('aria-pressed', 'false');
      btn.className =
        'QuestionDisplay__txtButton___3AYy9 QuestionDisplay__visibleFlag___AmAom';
      btn.type = 'button';
      btn.innerHTML =
        '<i class="fa fa-bookmark-o" aria-hidden="true"></i>' +
        '<span class="sr-only">Flag question' + (num != null ? ' ' + num : '') + '</span>';
      // Visual-only toggle so the bookmark icon flips when clicked
      btn.addEventListener('click', function () {
        var pressed = btn.getAttribute('aria-pressed') === 'true';
        btn.setAttribute('aria-pressed', pressed ? 'false' : 'true');
        var icon = btn.querySelector('i');
        if (icon) {
          icon.className = pressed ? 'fa fa-bookmark-o' : 'fa fa-bookmark';
        }
      });
      gutter.appendChild(btn);
      wrapper.appendChild(gutter);
    });
  }

  function init() {
    bindPopoverBadges();
    injectFlagButtons();
    if (!isSingleQuestionPage()) return;
    var wrappers = getWrappers();
    if (!wrappers.length) return;
    var initialN = getInitialActiveNumber(wrappers);
    if (initialN != null) setActive(initialN);
    bindFooterNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
