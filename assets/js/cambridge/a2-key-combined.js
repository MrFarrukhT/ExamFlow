// A2 Key Reading & Writing combined (no iframe)
// - Loads Part 1..7 HTML, extracts #sectionContent, and injects into this page
// - Renders Cambridge-style footer navigation and wires prev/next + submit
(function(){
  if (window.__A2CombinedLoaded) return; window.__A2CombinedLoaded = true;

  function byId(id){ return document.getElementById(id); }
  function qs(sel, root){ return (root||document).querySelector(sel); }

  function partPath(n){ return './Part ' + n + '.html'; }

  function getRanges(){
    if (window.A2KeyManifest && Array.isArray(window.A2KeyManifest.ranges)) {
      return window.A2KeyManifest.ranges.slice();
    }
    // Fallback
    return [
      { part: 1, min: 1,  max: 6 },
      { part: 2, min: 7,  max: 13 },
      { part: 3, min: 14, max: 18 },
      { part: 4, min: 19, max: 24 },
      { part: 5, min: 25, max: 30 },
      { part: 6, min: 31, max: 31 },
      { part: 7, min: 32, max: 32 }
    ];
  }

  function getRangeForPart(p){ var r = getRanges(); for (var i=0;i<r.length;i++) if (r[i].part===p) return r[i]; return null; }

  function countAttempted(range){
    try{
      var raw = localStorage.getItem('reading-writingAnswers');
      var obj = raw ? JSON.parse(raw) : {};
      var n = 0; Object.keys(obj).forEach(function(k){ var q=parseInt(k,10); if(!isNaN(q) && q>=range.min && q<=range.max && obj[k]) n++; });
      return n;
    }catch(e){ return 0; }
  }

  function buildFooter(selectedPart, activeAbs){
    var wrap = byId('rw-footer-nav'); if (!wrap) return;
    while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
    var ranges = getRanges();
    ranges.forEach(function(r){
      var p = r.part; var total = r.max - r.min + 1; var attempted = countAttempted(r);
      var wrapper = document.createElement('div');
      wrapper.className = 'footer__questionWrapper___1tZ46' + (total>1?' multiple':' single') + (p===selectedPart?' selected':'');
      var tabBtn = document.createElement('button'); tabBtn.setAttribute('role','tab'); tabBtn.className='footer__questionNo___3WNct';
      tabBtn.innerHTML = '<span><span aria-hidden="true" class="section-prefix">Part </span><span class="sectionNr" aria-hidden="true">'+p+'</span><span class="attemptedCount" aria-hidden="true">'+attempted+' of '+total+'</span><span class="sr-only">Part '+p+'. '+attempted+' of '+total+' questions attempted.</span></span>';
      tabBtn.addEventListener('click', function(){ renderForPart(p); });
      wrapper.appendChild(tabBtn);
      if (p===selectedPart){
        var subs = document.createElement('div'); subs.className='footer__subquestionWrapper___9GgoP';
        for (var n=r.min; n<=r.max; n++){
          var b = document.createElement('button'); b.className='subQuestion scorable-item'+(activeAbs===n?' active':''); b.setAttribute('data-ordernumber', String(n));
          b.innerHTML = '<span class="sr-only">Question '+n+'</span><span aria-hidden="true">'+n+'</span><span class="sr-only">'+(activeAbs===n?'Selected':'Not attempted')+'</span>';
          (function(nn){ b.addEventListener('click', function(e){ e.preventDefault(); scrollToAbs(nn); setActive(nn); }); })(n);
          subs.appendChild(b);
        }
        wrapper.appendChild(subs);
      }
      wrap.appendChild(wrapper);
    });
    // Place deliver button at end
    var deliver = byId('deliver-button'); if (deliver && deliver.parentNode!==wrap){ wrap.appendChild(deliver); }
  }

  function currentSelectedPart(){
    var sp = parseInt(sessionStorage.getItem('a2key-rw-active')||'1',10); return isNaN(sp)?1:sp;
  }
  function setSelectedPart(p){ try{ sessionStorage.setItem('a2key-rw-active', String(p)); }catch(e){} }

  function renderForPart(p){
    setSelectedPart(p);
    var r = getRangeForPart(p) || {min:1,max:1};
    var cur = Math.max(r.min, Math.min(r.max, getActiveAbs()||r.min));
    buildFooter(p, cur);
    scrollToAbs(cur);
  }

  function getActiveAbs(){ var v = parseInt(sessionStorage.getItem('a2key-active-abs')||'0',10); return isNaN(v)?null:v; }
  function setActive(n){ try{ sessionStorage.setItem('a2key-active-abs', String(n)); }catch(e){} buildFooter(currentSelectedPart(), n); }

  function scrollToAbs(n){
    A2KeyShared.scrollToQuestion(document, n);
    A2KeyShared.markActiveQuestion(document, n);
  }

  function wireArrows(){
    var prev = byId('footer-nav-button-previous');
    var next = byId('footer-nav-button-next');
    if (prev) prev.onclick = function(){ var a=getActiveAbs(); if (a!=null) { setActive(a-1); scrollToAbs(a-1); } };
    if (next) next.onclick = function(){ var a=getActiveAbs(); if (a!=null) { setActive(a+1); scrollToAbs(a+1); } };
    var deliver = byId('deliver-button');
    if (deliver) deliver.onclick = function(){
      if (confirm('Are you sure you want to submit your reading-writing test?')){
        try{ var m = window.cambridgeAnswerManager; if (m && typeof m.submitTestToDatabase==='function'){ m.submitTestToDatabase(); } }catch(e){}
        localStorage.setItem('reading-writingStatus','completed');
        localStorage.setItem('reading-writingEndTime', new Date().toISOString());
        alert('Test submitted successfully!');
        window.location.href='../../dashboard-cambridge.html';
      }
    };
  }

  function injectSection(part, node){
    var host = byId('combined-parts'); if (!host) return;
    var sec = document.createElement('section'); sec.className='a2-combined-part'; sec.setAttribute('data-part', String(part));
    try { var h = node.querySelector('#header'); if (h) h.parentNode.removeChild(h); } catch(e){}
    sec.appendChild(node);
    host.appendChild(sec);
  }

  function extractSection(doc){
    return doc.querySelector('#sectionContent') || doc.querySelector('.DisplayTypeContainer__sectionContent___2HSJ0') || doc.body;
  }

  function loadPartsThenInit(){
    var parts=[1,2,3,4,5,6,7]; var i=0;
    function next(){
      if (i>=parts.length){
        A2KeyShared.ensureStyles(document);
        wireArrows();
        renderForPart(currentSelectedPart());
        return;
      }
      var p = parts[i++]; fetch(partPath(p)).then(function(res){ return res.text(); }).then(function(html){
        var d = new DOMParser().parseFromString(html, 'text/html');
        var sec = extractSection(d).cloneNode(true);
        injectSection(p, sec);
        setTimeout(next, 0);
      }).catch(function(){ setTimeout(next, 0); });
    }
    next();
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', loadPartsThenInit); else loadPartsThenInit();
})();

