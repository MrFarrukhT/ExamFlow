// Cambridge A2 Key per-part question navigation
// - Adds click handlers to footer question numbers to scroll the right pane
// - Works in standalone Part X.html pages
// - Intentionally disables itself when loaded inside the combined
//   reading-writing.html (that wrapper exposes window.__A2_goToQuestion)

(function(){
  try {
    // If embedded in the combined wrapper, we still run
    // but only handle clicks for the currently selected part.
    var __embeddedWithParentNav = !!(window.parent && window.parent !== window && window.parent.__A2_goToQuestion);

    function qs(sel, root){ return (root||document).querySelector(sel); }
    function qsa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

    function ensureStyles(){
      if (document.getElementById('ic-a2key-style')) return;
      var css = ''+
        '.order-number.ic-on{border:2px solid #1976d2;border-radius:4px;padding:1px 6px;display:inline-block;box-shadow:0 0 0 3px rgba(25,118,210,.15);}'+
        '.ic-active-question{outline:2px solid rgba(25,118,210,.25);outline-offset:4px;border-radius:6px;}';
      var s = document.createElement('style'); s.id='ic-a2key-style'; s.type='text/css'; s.appendChild(document.createTextNode(css));
      (document.head || document.documentElement).appendChild(s);
    }

    function getSectionContent(){
      return qs('#sectionContent') || qs('.DisplayTypeContainer__sectionContent___2HSJ0');
    }

    function findAnchorFor(orderNumber){
      if (!orderNumber && orderNumber !== 0) return null;
      // 1) Typical visible number element in question body
      var el = qs('span.order-number[id^="scorableItem-"][id$="_'+orderNumber+'"]')
            || qs('[id^="scorableItem-"][id$="_'+orderNumber+'"]');
      if (el) return el;
      // 2) Hidden focus element id="<revision>-<n>" derived from footer metadata
      try {
        var btn = qs('.subQuestion.scorable-item[data-ordernumber="'+orderNumber+'"]');
        var rid = btn && btn.getAttribute('data-contentrevisionid');
        if (rid) {
          var hidden = qs('#'+rid+'-'+orderNumber);
          if (hidden) return hidden;
        }
      } catch(e) {}
      // 3) Last resort: the footer button itself
      return qs('.subQuestion.scorable-item[data-ordernumber="'+orderNumber+'"]');
    }

    function scrollToQuestion(orderNumber){
      ensureStyles();
      var anchor = findAnchorFor(orderNumber);
      if (!anchor) return false;
      var container = getSectionContent();
      try {
        if (container) {
          var cRect = container.getBoundingClientRect();
          var aRect = anchor.getBoundingClientRect();
          var top = aRect.top - cRect.top + container.scrollTop - 48; // offset for padding/header
          container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
        } else {
          anchor.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return true;
      } catch (e) {
        // Non-smooth fallback
        if (container) container.scrollTop = (anchor.offsetTop || 0) - 48; else anchor.scrollIntoView(true);
        return true;
      }
    }

    function highlightQuestion(orderNumber){
      ensureStyles();
      // remove previous marks
      qsa('.order-number.ic-on').forEach(function(el){ el.classList.remove('ic-on'); });
      qsa('.ic-active-question').forEach(function(el){ el.classList.remove('ic-active-question'); });
      var anchor = findAnchorFor(orderNumber);
      if (!anchor) return;
      if (anchor.classList) anchor.classList.add('ic-on');
      var container = anchor.closest ? (anchor.closest('.choiceInteraction__choiceInteraction___3W0MH') || anchor.closest('.QuestionDisplay__question___') || anchor.parentElement) : anchor.parentElement;
      if (container) container.classList.add('ic-active-question');
    }

    function getActiveNumber(){
      var activeBtn = qs('.footer__questionWrapper___1tZ46.selected .subQuestion.active.scorable-item') || qs('.subQuestion.active.scorable-item');
      if (!activeBtn) return null;
      var n = parseInt(activeBtn.getAttribute('data-ordernumber'), 10);
      return isNaN(n) ? null : n;
    }

    function setActive(n){
      qsa('.subQuestion.scorable-item').forEach(function(b){ b.classList.remove('active'); });
      var btn = qs('.subQuestion.scorable-item[data-ordernumber="'+n+'"]');
      if (btn) btn.classList.add('active');
      highlightQuestion(n);
    }

    function bindFooterNav(){
      // Numbered sub-question buttons
      qsa('.subQuestion.scorable-item').forEach(function(btn){
        if (btn.__icBound) return; btn.__icBound = true;
        btn.addEventListener('click', function(e){
          if (e.defaultPrevented) return;
          var n = parseInt(btn.getAttribute('data-ordernumber'), 10);
          if (isNaN(n)) return;
          // If embedded inside combined, only hijack when the clicked button
          // belongs to the currently selected part; otherwise let parent handle.
          if (__embeddedWithParentNav) {
            var wrapper = btn.closest ? btn.closest('.footer__questionWrapper___1tZ46') : null;
            var isSamePart = wrapper && /\bselected\b/.test(wrapper.className || '');
            if (!isSamePart) return; // bubble up for parent cross-part nav
          }
          e.preventDefault(); e.stopPropagation();
          if (scrollToQuestion(n)) setActive(n);
        }, false);
      });
      // Leave Prev/Next alone to avoid conflicts with page logic.
    }

    function init(){
      // Ensure the current question (if any) is visible and marked
      var cur = getActiveNumber();
      if (cur != null) {
        setTimeout(function(){ scrollToQuestion(cur); highlightQuestion(cur); }, 50);
      }
      bindFooterNav();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      setTimeout(init, 0);
    }

  } catch (err) {
    // Fail silently — never block the page
  }
})();
