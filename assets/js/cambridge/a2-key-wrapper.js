// Cambridge A2 Key Combined Wrapper controller for reading-writing.html
// Uses A2KeyShared helpers; coordinates part switching, cross-part nav, and highlighting
(function(){
  if (window.__A2WrapperLoaded) return; window.__A2WrapperLoaded = true;

  function setPart(n){
    var frame = document.getElementById('part-frame');
    if (!frame) return;
    
    // Force immediate save of all answers before switching parts
    try {
      var doc = frame.contentDocument;
      if (doc && doc.defaultView && doc.defaultView.__A2_forceSaveAll) {
        // Call the force save function in the iframe
        doc.defaultView.__A2_forceSaveAll();
      }
    } catch(e) {
    }
    
    try { sessionStorage.setItem('a2key-rw-active', String(n)); } catch (e) {}
    
    // Navigate to new part (force save is synchronous, no delay needed)
    frame.setAttribute('src', './Part ' + n + '.html');
  }

  function getPartForQuestion(q){
    var rs = window.__A2_ranges || [];
    for (var i=0;i<rs.length;i++) if (q>=rs[i].min && q<=rs[i].max) return rs[i].part;
    return null;
  }

  function bindCambridgeNav(){
    var frame = document.getElementById('part-frame');
    var doc = frame && frame.contentDocument;
    if (!doc) return;
    window.__A2_ranges = A2KeyShared.updateRangesFromDoc(doc);
    A2KeyShared.ensureStyles(doc);

    // Restore answers for this part
    setTimeout(function(){
      try {
        if (doc.defaultView && doc.defaultView.__A2_applySavedAnswers) {
          doc.defaultView.__A2_applySavedAnswers();
        }
      } catch(e) {
      }
    }, 200);

    // Initial mark/scroll
    try{
      var cur = A2KeyShared.getActiveQuestionAbs(doc);
      if(cur!=null){ A2KeyShared.scrollToQuestion(doc, cur); A2KeyShared.markActiveQuestion(doc, cur); }
    }catch(e){}

    function currentAbs(){ return A2KeyShared.getActiveQuestionAbs(doc); }

    // Delegated click for footer question buttons
    if (!doc.__icDelegated) {
      doc.__icDelegated = true;
      doc.addEventListener('click', function(e){
        var btn = e.target && (e.target.closest && e.target.closest('.subQuestion.scorable-item'));
        if (!btn || !e.isTrusted) return;
        var n = parseInt(btn.getAttribute('data-ordernumber'),10);
        if (isNaN(n)) return;
        var curPart = A2KeyShared.getCurrentPartFromDoc(doc);
        var targetPart = getPartForQuestion(n);
        if (targetPart && curPart && targetPart !== curPart) {
          e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation();
          goToQuestion(n);
        } else {
          setTimeout(function(){ A2KeyShared.scrollToQuestion(doc, n); A2KeyShared.markActiveQuestion(doc, n); }, 50);
        }
      }, true);
    }

    // Delegated Prev/Next interception only across parts
    if (!doc.__icArrowsDelegated) {
      doc.__icArrowsDelegated = true;
      doc.addEventListener('click', function(e){
        var prevBtn = e.target && (e.target.closest && e.target.closest('#footer-nav-button-previous'));
        var nextBtn = e.target && (e.target.closest && e.target.closest('#footer-nav-button-next'));
        if (!prevBtn && !nextBtn) return;
        var c = currentAbs(); if (c==null) return;
        var nextAbs = prevBtn ? (c-1) : (c+1);
        var curPart = A2KeyShared.getCurrentPartFromDoc(doc);
        var targetPart = getPartForQuestion(nextAbs);
        if (targetPart && curPart && targetPart !== curPart) {
          e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation();
          goToQuestion(nextAbs);
        } else {
          setTimeout(function(){ A2KeyShared.scrollToQuestion(doc, nextAbs); A2KeyShared.markActiveQuestion(doc, nextAbs); }, 50);
        }
      }, true);
    }

    // Observe for active change to keep highlight synced
    try{
      var mo = new MutationObserver(function(){
        if (doc.__icMarking) return;
        clearTimeout(doc.__icMoTimer);
        doc.__icMoTimer = setTimeout(function(){
          var c = currentAbs(); if(c!=null) A2KeyShared.markActiveQuestion(doc, c);
        }, 40);
      });
      var footer = doc.querySelector('.footer__footer___1NlzQ') || doc.body;
      mo.observe(footer, { attributes: true, subtree: true, attributeFilter: ['class'] });
    }catch(e){}

    // Handle target question from sessionStorage
    try{
      var tgt = sessionStorage.getItem('a2key-target-question');
      if(tgt){
        var num = parseInt(tgt,10);
        var b = doc.querySelector('.subQuestion.scorable-item[data-ordernumber="'+num+'"]');
        if(b){ b.click(); }
        setTimeout(function(){ A2KeyShared.scrollToQuestion(doc, num); A2KeyShared.markActiveQuestion(doc, num); }, 80);
        sessionStorage.removeItem('a2key-target-question');
      }
    }catch(e){}
  }

  function goToQuestion(qAbs){
    var part = getPartForQuestion(qAbs);
    if(!part) return;
    var frame = document.getElementById('part-frame');
    var doc = frame && frame.contentDocument;
    var currentPart = doc ? A2KeyShared.getCurrentPartFromDoc(doc) : null;
    if (currentPart === part && doc) {
      try{
        var btn = doc.querySelector('.subQuestion.scorable-item[data-ordernumber="'+qAbs+'"]');
        if (btn) { btn.click(); A2KeyShared.markActiveQuestion(doc, qAbs); }
      }catch(e){}
      return;
    }
    
    // Force save before switching to different part
    try {
      if (doc && doc.defaultView && doc.defaultView.__A2_forceSaveAll) {
        doc.defaultView.__A2_forceSaveAll();
      }
    } catch(e) {}
    
    try { sessionStorage.setItem('a2key-target-question', String(qAbs)); } catch(e) {}
    setPart(part);
  }

  function initCombined(){
    var frame = document.getElementById('part-frame');
    var saved = parseInt((sessionStorage.getItem('a2key-rw-active') || '1'), 10);
    setPart(isNaN(saved) ? 1 : saved);
    frame.addEventListener('load', function(){ setTimeout(bindCambridgeNav, 25); });
  }

  // Expose minimal API for per-part pages if needed
  window.__A2_setPart = setPart;
  window.__A2_goToQuestion = goToQuestion;
  window.__A2_getPartForQuestion = getPartForQuestion;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCombined);
  } else {
    initCombined();
  }
})();

