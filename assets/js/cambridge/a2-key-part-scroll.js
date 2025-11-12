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

    function ensureStyles(){ if (window.A2KeyShared) return A2KeyShared.ensureStyles(document); 
      if (document.getElementById('ic-a2key-style')) return; var css = ''+
      '.order-number.ic-on{border:2px solid #1976d2;border-radius:4px;padding:1px 6px;display:inline-block;box-shadow:0 0 0 3px rgba(25,118,210,.15);}'+
      '.ic-active-question{outline:2px solid rgba(25,118,210,.25);outline-offset:4px;border-radius:6px;}';
      var s = document.createElement('style'); s.id='ic-a2key-style'; s.type='text/css'; s.appendChild(document.createTextNode(css));
      (document.head || document.documentElement).appendChild(s);
    }

    function getSectionContent(){
      return qs('#sectionContent') || qs('.DisplayTypeContainer__sectionContent___2HSJ0');
    }

    function findAnchorFor(orderNumber){
      if (window.A2KeyShared) return A2KeyShared.findAnchor(document, orderNumber);
      if (!orderNumber && orderNumber !== 0) return null;
      // Try both formats: scorableItem-XXX_N and scorableItem-N
      var el = qs('#scorableItem-'+orderNumber) || qs('span.order-number[id^="scorableItem-"][id$="_'+orderNumber+'"]') || qs('[id^="scorableItem-"][id$="_'+orderNumber+'"]');
      if (el) return el; try { var btn = qs('.subQuestion.scorable-item[data-ordernumber="'+orderNumber+'"]'); var rid = btn && btn.getAttribute('data-contentrevisionid'); if (rid) { var hidden = qs('#'+rid+'-'+orderNumber); if (hidden) return hidden; } } catch(e) {}
      // Last resort: find the question wrapper by ID
      var wrapper = qs('#question-wrapper-'+orderNumber);
      if (wrapper) {
        var orderSpan = wrapper.querySelector('span.order-number');
        if (orderSpan) return orderSpan;
      }
      return null;
    }

    function scrollToQuestion(orderNumber){
      if (window.A2KeyShared) return A2KeyShared.scrollToQuestion(document, orderNumber);
      ensureStyles(); 
      // First try to find the question wrapper - this is the best scroll target
      var wrapper = qs('#question-wrapper-'+orderNumber) || qs('.QuestionDisplay__questionDisplayWrapper___1n_b0[id*="'+orderNumber+'"]');
      console.log('[A2-Key Nav] Found wrapper:', wrapper ? wrapper.id || 'no-id' : 'NULL');
      var scrollTarget = wrapper;
      // Fallback to the anchor if no wrapper found
      if (!scrollTarget) {
        var anchor = findAnchorFor(orderNumber);
        console.log('[A2-Key Nav] Found anchor:', anchor ? anchor.id || 'no-id' : 'NULL');
        if (!anchor) return false;
        // Try to find the closest question wrapper from the anchor
        scrollTarget = anchor.closest ? (anchor.closest('.QuestionDisplay__questionDisplayWrapper___1n_b0') || anchor.closest('.question-wrapper') || anchor) : anchor;
      }
      if (!scrollTarget) {
        console.log('[A2-Key Nav] No scroll target found!');
        return false;
      }
      console.log('[A2-Key Nav] Final scroll target:', scrollTarget.tagName, scrollTarget.id || scrollTarget.className);
      var container = getSectionContent();
      console.log('[A2-Key Nav] Scroll container:', container ? container.id || container.className : 'NULL (will use scrollIntoView)');
      try { 
        if (container) { 
          var cRect = container.getBoundingClientRect(); 
          var targetRect = scrollTarget.getBoundingClientRect(); 
          var top = targetRect.top - cRect.top + container.scrollTop - 80;
          console.log('[A2-Key Nav] Scrolling container to:', top, '(current:', container.scrollTop, ')');
          container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' }); 
        } else { 
          console.log('[A2-Key Nav] Using scrollIntoView on target');
          scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
        } 
        return true; 
      } catch (e) { 
        console.log('[A2-Key Nav] Scroll error:', e);
        if (container) container.scrollTop = (scrollTarget.offsetTop || 0) - 80; 
        else scrollTarget.scrollIntoView(true); 
        return true; 
      }
    }

    function highlightQuestion(orderNumber){
      if (window.A2KeyShared) return A2KeyShared.markActiveQuestion(document, orderNumber);
      ensureStyles(); qsa('.order-number.ic-on').forEach(function(el){ el.classList.remove('ic-on'); }); qsa('.ic-active-question').forEach(function(el){ el.classList.remove('ic-active-question'); }); var anchor = findAnchorFor(orderNumber); if (!anchor) return; if (anchor.classList) anchor.classList.add('ic-on'); var container = anchor.closest ? (anchor.closest('.choiceInteraction__choiceInteraction___3W0MH') || anchor.closest('.QuestionDisplay__question___') || anchor.parentElement) : anchor.parentElement; if (container) container.classList.add('ic-active-question');
    }

    function getActiveNumber(){
      if (window.A2KeyShared) return A2KeyShared.getActiveQuestionAbs(document);
      var activeBtn = qs('.footer__questionWrapper___1tZ46.selected .subQuestion.active.scorable-item') || qs('.subQuestion.active.scorable-item'); if (!activeBtn) return null; var n = parseInt(activeBtn.getAttribute('data-ordernumber'), 10); return isNaN(n) ? null : n;
    }

    function setActive(n){
      qsa('.subQuestion.scorable-item').forEach(function(b){ b.classList.remove('active'); });
      var btn = qs('.subQuestion.scorable-item[data-ordernumber="'+n+'"]');
      if (btn) btn.classList.add('active');
      highlightQuestion(n);
    }

    function bindFooterNav(){
      // Numbered sub-question buttons
      var buttons = qsa('.subQuestion.scorable-item');
      console.log('[A2-Key Nav] Found ' + buttons.length + ' question buttons');
      buttons.forEach(function(btn){
        if (btn.__icBound) return; 
        btn.__icBound = true;
        btn.addEventListener('click', function(e){
          var n = parseInt(btn.getAttribute('data-ordernumber'), 10);
          console.log('[A2-Key Nav] Button clicked: Q' + n);
          if (isNaN(n)) return;
          // If embedded inside combined, only hijack when the clicked button
          // belongs to the currently selected part; otherwise let parent handle.
          if (__embeddedWithParentNav) {
            var wrapper = btn.closest ? btn.closest('.footer__questionWrapper___1tZ46') : null;
            var isSamePart = wrapper && /\bselected\b/.test(wrapper.className || '');
            if (!isSamePart) {
              console.log('[A2-Key Nav] Different part, letting parent handle');
              return; // bubble up for parent cross-part nav
            }
          }
          e.preventDefault(); 
          e.stopPropagation();
          console.log('[A2-Key Nav] Scrolling to Q' + n);
          var success = scrollToQuestion(n);
          console.log('[A2-Key Nav] Scroll result:', success);
          if (success) setActive(n);
        }, true); // Use capture phase to get the event first
      });
      // Leave Prev/Next alone to avoid conflicts with page logic.
    }

    function init(){
      try {
        // Normalize header logo to central asset to avoid per-part duplication
        var img = document.querySelector('img[alt="header.logo"]');
        if (img) {
          var central = './A2 Key RW Digital Sample Test 1_26.04.23_files/ceq.png';
          var src = img.getAttribute('src') || '';
          if (src && /\bPart\s+\d+_files\/ceq\.png$/.test(src)) {
            img.setAttribute('src', central);
          }
        }
      } catch (e) { /* no-op */ }
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
