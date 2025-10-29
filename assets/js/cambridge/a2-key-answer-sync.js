// Cambridge A2 Key unified answer syncing for Reading & Writing parts
// Saves radio/text answers keyed by absolute question number in localStorage 'reading-writingAnswers'
(function(){
  if (window.__A2AnswerSyncLoaded) return; window.__A2AnswerSyncLoaded = true;

  var STORAGE_KEY = 'reading-writingAnswers';

  function loadAnswers(){
    try{
      var raw = localStorage.getItem(STORAGE_KEY);
      var obj = raw ? JSON.parse(raw) : {};
      // Backward compatibility: migrate keys like 'part1_q1' -> '1'
      var migrated = false;
      Object.keys(obj).forEach(function(k){
        var m = /^part\d+_q(\d+)$/.exec(k);
        if (m) { obj[m[1]] = obj[k]; delete obj[k]; migrated = true; }
      });
      if (migrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
      return obj;
    }catch(e){ return {}; }
  }

  function saveAnswers(obj){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); }catch(e){}
  }

  function saveAnswer(qNum, value){
    if (qNum == null) return;
    var answers = loadAnswers();
    answers[String(qNum)] = value;
    saveAnswers(answers);
    markAnswered(qNum, !!value);
  }

  function markAnswered(qNum, answered){
    try{
      var btn = document.querySelector('.subQuestion.scorable-item[data-ordernumber="'+qNum+'"]');
      if (btn){ if (answered) btn.classList.add('answered'); else btn.classList.remove('answered'); }
    }catch(e){}
  }

  function parseOrderNumberFromContainer(container){
    // Try to find an order-number element inside or near the container
    var el = container.querySelector && (container.querySelector('.order-number.active') || container.querySelector('.order-number'));
    if (!el) {
      // Look up a bit if needed
      var p = container.closest && container.closest('.QuestionDisplay__question___') || container.parentElement;
      el = p && (p.querySelector('.order-number.active') || p.querySelector('.order-number'));
    }
    if (!el) return null;
    var id = el.id || '';
    var m = /_(\d+)$/.exec(id);
    if (m) return parseInt(m[1],10);
    var txt = (el.textContent||'').trim();
    var n = parseInt(txt,10);
    return isNaN(n) ? null : n;
  }

  function getQuestionContainerFromInput(input){
    if (!input || !input.closest) return document;
    return input.closest('.choiceInteraction__choiceInteraction___3W0MH')
        || input.closest('.QuestionDisplay__question___')
        || document;
  }

  function applySavedRadios(){
    var answers = loadAnswers();
    Object.keys(answers).forEach(function(k){
      var q = parseInt(k,10); if (isNaN(q)) return;
      var val = answers[k];
      try{
        if (window.A2KeyShared) {
          var anchor = A2KeyShared.findAnchor(document, q);
          var container = anchor && (anchor.closest('.choiceInteraction__choiceInteraction___3W0MH') || anchor.closest('.QuestionDisplay__question___') || anchor.parentElement) || document;
          if (typeof val === 'string'){
            var radio = container.querySelector('input[type="radio"][value="'+CSS.escape(val)+'"]');
            if (radio) radio.checked = true;
          }
        }
        markAnswered(q, !!val);
      }catch(e){}
    });
  }

  function onChange(e){
    var t = e.target;
    if (!t) return;
    if (t.matches && t.matches('input[type="radio"], input[type="text"], textarea')){
      var container = getQuestionContainerFromInput(t);
      var q = parseOrderNumberFromContainer(container);
      if (q == null && window.A2KeyShared) q = A2KeyShared.getActiveQuestionAbs(document);
      if (q == null) return;
      if (t.type === 'radio'){
        if (t.checked) saveAnswer(q, t.value);
      } else {
        saveAnswer(q, t.value || '');
      }
    }
  }

  function init(){
    document.addEventListener('change', onChange, true);
    // Load saved answers on first paint
    setTimeout(applySavedRadios, 0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

