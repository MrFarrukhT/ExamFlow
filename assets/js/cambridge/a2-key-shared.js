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
      '.ic-active-question{outline:2px solid rgba(25,118,210,.25);outline-offset:4px;border-radius:6px;}' +
      /* Hide duplicated Inspera header within each Part to avoid repeating header UI */
      '#header, #headerTopBar{display:none !important;}' +
      /* Reclaim space when header is hidden */
      '#appContentContainer{margin-top:0 !important;padding-top:0 !important;}' +
      '#main-screen-content{margin-top:0 !important;padding-top:0 !important;}' +
      /* Ensure body is visible to avoid flash/blank */
      'body{transition:opacity ease-in .2s;opacity:1 !important;display:block !important;overflow:auto !important;position:relative !important;}' +
      'body[unresolved]{opacity:1 !important;}';
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
      var wrappers = Array.prototype.slice.call(doc.querySelectorAll('.footer__questionWrapper___1tZ46'));
      var ranges = [];

      // First pass: collect explicit ranges from multi wrappers with subQuestion buttons
      wrappers.forEach(function(w){
        var partEl = w.querySelector('.sectionNr');
        var part = partEl ? parseInt(partEl.textContent.trim(),10) : null;
        if (!part || isNaN(part)) return;
        var btns = Array.prototype.slice.call(w.querySelectorAll('.subQuestion.scorable-item'));
        var ords = btns
          .map(function(b){ return parseInt(b.getAttribute('data-ordernumber'),10); })
          .filter(function(n){ return !isNaN(n); });
        if (ords.length){
          var min = Math.min.apply(null, ords);
          var max = Math.max.apply(null, ords);
          ranges.push({ part: part, min: min, max: max });
        }
      });

      // Sort by part to allow inference for single-part sections (e.g., writing)
      ranges.sort(function(a,b){ return a.part - b.part; });

      // Helper to get count for a wrapper if it has no explicit subQuestions
      function inferredCount(w){
        // Try to read "0 of N" text
        var attempted = w.querySelector('.attemptedCount');
        if (attempted) {
          var m = attempted.textContent && attempted.textContent.match(/\bof\s+(\d+)\b/);
          var n = m ? parseInt(m[1], 10) : NaN;
          if (!isNaN(n) && n > 0) return n;
        }
        // Single wrappers usually represent 1 item
        if (w.classList && w.classList.contains('single')) return 1;
        return 0;
      }

      // Build a map of part -> wrapper for inference
      var byPart = {};
      wrappers.forEach(function(w){
        var el = w.querySelector('.sectionNr');
        var p = el ? parseInt(el.textContent.trim(),10) : null;
        if (p && !isNaN(p)) byPart[p] = w;
      });

      // Determine missing parts in [1..7]
      var have = ranges.reduce(function(acc, r){ acc[r.part] = true; return acc; }, {});
      var parts = [1,2,3,4,5,6,7];
      // Establish running next order based on known minima
      var nextOrd = null;
      if (ranges.length){
        // nextOrd is last known max + 1
        nextOrd = Math.max.apply(null, ranges.map(function(r){ return r.max; })) + 1;
      } else {
        // no explicit info; try manifest first
        nextOrd = 1;
      }

      parts.forEach(function(p){
        if (have[p]) return; // already known
        var w = byPart[p];
        if (!w) return;
        var cnt = inferredCount(w);
        if (cnt > 0 && nextOrd != null){
          ranges.push({ part: p, min: nextOrd, max: nextOrd + cnt - 1 });
          nextOrd += cnt;
        }
      });

      // If still incomplete, optionally merge with manifest ranges
      if (window.A2KeyManifest && Array.isArray(window.A2KeyManifest.ranges)){
        var byP = ranges.reduce(function(acc,r){ acc[r.part]=r; return acc; }, {});
        window.A2KeyManifest.ranges.forEach(function(mr){
          if (!byP[mr.part]) ranges.push({ part: mr.part, min: mr.min, max: mr.max });
        });
      }

      ranges.sort(function(a,b){ return a.part - b.part; });
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

