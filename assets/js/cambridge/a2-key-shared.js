// Shared helpers for Cambridge A2 Key RW navigation/highlighting
// Safe to include on both wrapper and per-part pages. No-op if not applicable.
(function(){
  if (window.A2KeyShared) return;

  function qs(sel, root){ return (root||document).querySelector(sel); }
  function qsa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

  function ensureStyles(doc){
    doc = doc || document;
    if (doc.getElementById('ic-a2key-style')) return;
    var css = ''+
      '.order-number.ic-on{border:2px solid #1976d2;border-radius:4px;padding:1px 6px;display:inline-block;box-shadow:0 0 0 3px rgba(25,118,210,.15);}' +
      '.ic-active-question{outline:2px solid rgba(25,118,210,.25);outline-offset:4px;border-radius:6px;}';
    var s = doc.createElement('style'); s.id='ic-a2key-style'; s.type='text/css'; s.appendChild(doc.createTextNode(css));
    (doc.head || doc.documentElement).appendChild(s);
  }

  function findAnchor(doc, orderNumber){
    if (!orderNumber && orderNumber !== 0) return null;
    doc = doc || document;
    // Typical visible number element in question body
    var el = doc.querySelector('span.order-number[id^="scorableItem-"][id$="_'+orderNumber+'"]')
          || doc.querySelector('[id^="scorableItem-"][id$="_'+orderNumber+'"]');
    if (el) return el;
    try {
      // Hidden focus element: id="<revision>-<n>" derived from footer metadata
      var btn = doc.querySelector('.subQuestion.scorable-item[data-ordernumber="'+orderNumber+'"]');
      var rid = btn && btn.getAttribute('data-contentrevisionid');
      if (rid){
        var hidden = doc.getElementById(rid+'-'+orderNumber);
        if (hidden) return hidden;
      }
    } catch(e) {}
    // Fallback: footer button itself
    return doc.querySelector('.subQuestion.scorable-item[data-ordernumber="'+orderNumber+'"]');
  }

  function getSectionContent(doc){
    doc = doc || document;
    return doc.querySelector('#sectionContent') || doc.querySelector('.DisplayTypeContainer__sectionContent___2HSJ0');
  }

  function scrollToQuestion(doc, orderNumber){
    doc = doc || document;
    ensureStyles(doc);
    var anchor = findAnchor(doc, orderNumber);
    if (!anchor) return false;
    var container = getSectionContent(doc);
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
      if (container) container.scrollTop = (anchor.offsetTop || 0) - 48; else anchor.scrollIntoView(true);
      return true;
    }
  }

  function markActiveQuestion(doc, orderNumber){
    doc = doc || document;
    ensureStyles(doc);
    Array.prototype.forEach.call(doc.querySelectorAll('.order-number.ic-on'), function(x){ x.classList.remove('ic-on'); });
    Array.prototype.forEach.call(doc.querySelectorAll('.ic-active-question'), function(x){ x.classList.remove('ic-active-question'); });
    var anchor = findAnchor(doc, orderNumber);
    if (!anchor) return;
    if (anchor.classList) anchor.classList.add('ic-on');
    var container = anchor.closest ? (anchor.closest('.choiceInteraction__choiceInteraction___3W0MH') || anchor.closest('.QuestionDisplay__question___') || anchor.parentElement) : anchor.parentElement;
    if (container) container.classList.add('ic-active-question');
  }

  function updateRangesFromDoc(doc){
    doc = doc || document;
    try{
      var wrappers = doc.querySelectorAll('.footer__questionWrapper___1tZ46');
      var ranges = [];
      wrappers.forEach(function(w){
        var partEl = w.querySelector('.sectionNr');
        var part = partEl ? parseInt(partEl.textContent.trim(),10) : null;
        var qs = Array.from(w.querySelectorAll('.subQuestion.scorable-item'))
          .map(function(b){ return parseInt(b.getAttribute('data-ordernumber'),10); })
          .filter(function(n){ return !isNaN(n); });
        if(part && qs.length){
          var min = Math.min.apply(null, qs);
          var max = Math.max.apply(null, qs);
          ranges.push({part: part, min: min, max: max});
        }
      });
      if(ranges.length){ ranges.sort(function(a,b){ return a.part-b.part; }); }
      return ranges;
    }catch(e){ return []; }
  }

  function getCurrentPartFromDoc(doc){
    doc = doc || document;
    try{
      var el = doc.querySelector('.footer__questionWrapper___1tZ46.selected .sectionNr');
      var n = el ? parseInt(el.textContent.trim(), 10) : null;
      return isNaN(n) ? null : n;
    }catch(e){ return null; }
  }

  function getActiveQuestionAbs(doc){
    doc = doc || document;
    var el = doc.querySelector('.footer__questionWrapper___1tZ46.selected .subQuestion.active.scorable-item') || doc.querySelector('.subQuestion.active.scorable-item');
    return el ? parseInt(el.getAttribute('data-ordernumber'),10) : null;
  }

  window.A2KeyShared = {
    qs: qs,
    qsa: qsa,
    ensureStyles: ensureStyles,
    findAnchor: findAnchor,
    scrollToQuestion: scrollToQuestion,
    markActiveQuestion: markActiveQuestion,
    updateRangesFromDoc: updateRangesFromDoc,
    getSectionContent: getSectionContent,
    getCurrentPartFromDoc: getCurrentPartFromDoc,
    getActiveQuestionAbs: getActiveQuestionAbs
  };
})();

