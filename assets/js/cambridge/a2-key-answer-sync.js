// Cambridge A2 Key unified answer syncing for Reading & Writing parts
// Saves radio/text answers keyed by absolute question number in localStorage 'reading-writingAnswers'
// Enhanced with seamless real-time autosave (no visual indicators)
(function(){
  if (window.__A2AnswerSyncLoaded) return; window.__A2AnswerSyncLoaded = true;

  var STORAGE_KEY = 'reading-writingAnswers';
  var saveTimers = {}; // Debounce timers for text inputs
  var AUTOSAVE_DELAY = 500; // ms delay for text field autosave (while typing)
  var PERIODIC_SAVE_INTERVAL = 5000; // Background save every 5 seconds

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

  function saveAnswer(qNum, value, silent){
    if (qNum == null) {
      console.warn('⚠️ Attempted to save answer but question number is null');
      return;
    }
    var answers = loadAnswers();
    answers[String(qNum)] = value;
    saveAnswers(answers);
    markAnswered(qNum, !!value);
    
    // Debug logging (silent to user, visible in console)
    if (value && value.length > 0) {
      var displayVal = typeof value === 'string' && value.length > 20 ? value.substring(0, 20) + '...' : value;
      console.log('💾 Saved Q' + qNum + ':', displayVal);
    }
    
    // Silent mode: no notifications or visual feedback
    if (!silent) {
      // Future: could add optional save indicators here
    }
  }

  function markAnswered(qNum, answered){
    try{
      var btn = document.querySelector('.subQuestion.scorable-item[data-ordernumber="'+qNum+'"]');
      if (btn){ if (answered) btn.classList.add('answered'); else btn.classList.remove('answered'); }
    }catch(e){}
  }

  function parseOrderNumberFromContainer(container){
    // Method 1: Try to find an order-number element (Parts 1-4)
    var el = container.querySelector && (container.querySelector('.order-number.active') || container.querySelector('.order-number'));
    if (!el) {
      // Look up a bit if needed
      var p = container.closest && container.closest('.QuestionDisplay__question___') || container.parentElement;
      el = p && (p.querySelector('.order-number.active') || p.querySelector('.order-number'));
    }
    if (el) {
      var id = el.id || '';
      var m = /_(\d+)$/.exec(id);
      if (m) return parseInt(m[1],10);
      var txt = (el.textContent||'').trim();
      var n = parseInt(txt,10);
      if (!isNaN(n)) return n;
    }
    
    // Method 2: Check for scorableItem ID in parent elements (Parts 5-7)
    var current = container;
    while (current && current !== document) {
      if (current.id && current.id.includes('scorableItem')) {
        var match = current.id.match(/scorableItem[^_]*_(\d+)/);
        if (match) return parseInt(match[1], 10);
      }
      current = current.parentElement;
    }
    
    // Method 3: Check input placeholder (Part 5)
    if (container.placeholder) {
      var placeholderNum = parseInt(container.placeholder, 10);
      if (!isNaN(placeholderNum)) return placeholderNum;
    }
    
    // Method 4: Check for scorableItem in nearby elements
    var scorableParent = container.closest && container.closest('[id*="scorableItem"]');
    if (scorableParent && scorableParent.id) {
      var match2 = scorableParent.id.match(/scorableItem[^_]*_(\d+)/);
      if (match2) return parseInt(match2[1], 10);
    }
    
    return null;
  }

  function getQuestionContainerFromInput(input){
    if (!input || !input.closest) return input || document;
    // Parts 5-7: Check for scorableItem container first
    var scorableContainer = input.closest('[id*="scorableItem"]');
    if (scorableContainer) return scorableContainer;
    // Parts 1-4: Check for standard containers
    return input.closest('.choiceInteraction__choiceInteraction___3W0MH')
        || input.closest('.interaction-container')
        || input.closest('.QuestionDisplay__question___')
        || input;
  }

  function getQuestionNumberFromInput(t){
    var container = getQuestionContainerFromInput(t);
    var q = parseOrderNumberFromContainer(container);
    if (q == null && window.A2KeyShared) q = A2KeyShared.getActiveQuestionAbs(document);
    return q;
  }

  function applySavedAnswers(){
    var answers = loadAnswers();
    var restoredCount = 0;
    
    // Get all questions that ACTUALLY exist in current part's content (not footer buttons!)
    // Find ALL elements that indicate a question number
    var allOrderElements = document.querySelectorAll('#sectionContent .order-number, #sectionContent [id*="scorableItem"]');
    var existingQuestions = [];
    
    Array.from(allOrderElements).forEach(function(orderEl){
      var qNum = null;
      
      // Method 1: Text content (Parts 1-4)
      var orderText = orderEl.textContent.trim();
      if (orderText && !isNaN(parseInt(orderText, 10))) {
        qNum = parseInt(orderText, 10);
      }
      
      // Method 2: ID attribute (Parts 5-6)
      if (!qNum && orderEl.id) {
        var match = orderEl.id.match(/scorableItem[^_]*_(\d+)/);
        if (match) {
          qNum = parseInt(match[1], 10);
        }
      }
      
      // Method 3: Placeholder in child input (Part 5)
      if (!qNum) {
        var input = orderEl.querySelector('input[placeholder]');
        if (input && input.placeholder) {
          var placeholderNum = parseInt(input.placeholder, 10);
          if (!isNaN(placeholderNum)) {
            qNum = placeholderNum;
          }
        }
      }
      
      if (qNum && existingQuestions.indexOf(qNum) === -1) {
        existingQuestions.push(qNum);
      }
    });
    
    // Sort the questions numerically
    existingQuestions.sort(function(a, b){ return a - b; });
    
    console.log('🔄 Attempting to restore answers for questions:', existingQuestions);
    
    Object.keys(answers).forEach(function(k){
      var q = parseInt(k,10); 
      if (isNaN(q)) return;
      
      // Skip if this question doesn't exist in current part
      if (existingQuestions.indexOf(q) === -1) return;
      
      var val = answers[k];
      if (!val) return;
      
      try{
        // Find the element for this question in the content
        var orderEl = null;
        var allOrderEls = document.querySelectorAll('#sectionContent .order-number, #sectionContent [id*="scorableItem"]');
        for (var i=0; i<allOrderEls.length; i++) {
          var el = allOrderEls[i];
          
          // Check text content (Parts 1-4)
          var text = el.textContent.trim();
          if (parseInt(text, 10) === q) {
            orderEl = el;
            break;
          }
          
          // Check ID (Parts 5-6)
          var id = el.id || '';
          if (id.includes('_'+q) || id.includes('-'+q)) {
            orderEl = el;
            break;
          }
          
          // Check placeholder in child input (Part 5)
          var input = el.querySelector('input[placeholder="'+q+'"]');
          if (input) {
            orderEl = el;
            break;
          }
        }
        
        if (!orderEl) {
          console.warn('Could not find element for question', q);
          return;
        }
        
        // For Parts 5-6, the orderEl IS the interaction container
        // For Parts 1-4, we need to find the closest container
        var qWrapper = orderEl;
        if (orderEl.classList.contains('order-number')) {
          // Parts 1-4: find parent container
          qWrapper = orderEl.closest('.interaction-container') || 
                     orderEl.closest('.choiceInteraction__choiceInteraction___3W0MH') ||
                     orderEl.closest('.QuestionDisplay__questionDisplayWrapper___1n_b0') ||
                     orderEl.closest('.question-wrapper') ||
                     orderEl;
        }
        
        if (!qWrapper) {
          console.warn('Could not find wrapper for question', q);
          return;
        }
        
        // Restore radio buttons (Parts 1-4)
        var radios = qWrapper.querySelectorAll('input[type="radio"]');
        if (radios.length > 0 && typeof val === 'string' && val.length <= 3) {
          for (var i=0; i<radios.length; i++) {
            if (radios[i].value === val) {
              radios[i].checked = true;
              restoredCount++;
              console.log('✓ Restored Q'+q+':', val);
              break;
            }
          }
        } else {
          // Restore text inputs (Part 5)
          var textInput = qWrapper.querySelector('input[type="text"]');
          if (textInput) {
            textInput.value = val;
            // Trigger input event to update any word count or validation
            var evt = new Event('input', { bubbles: true });
            textInput.dispatchEvent(evt);
            restoredCount++;
            console.log('✓ Restored Q'+q+' (text):', val.substring(0, 30)+'...');
          }
          
          // Restore textareas (Part 6-7)
          var textarea = qWrapper.querySelector('textarea');
          if (textarea) {
            textarea.value = val;
            // Trigger input event to update word count
            var evt2 = new Event('input', { bubbles: true });
            textarea.dispatchEvent(evt2);
            restoredCount++;
            var displayVal = val.substring(0, 30);
            console.log('✓ Restored Q'+q+' (textarea):', displayVal + (val.length > 30 ? '...' : ''));
          }
        }
        
        markAnswered(q, true);
      }catch(e){
        console.error('Error restoring Q'+q+':', e);
      }
    });
    
    if (restoredCount > 0) {
      console.log('📂 Successfully restored', restoredCount, 'answer(s) for this part');
    } else {
      console.log('ℹ️ No answers to restore for questions:', existingQuestions);
    }
  }

  // Handle immediate saves (radio buttons)
  function onChange(e){
    var t = e.target;
    if (!t) return;
    if (t.matches && t.matches('input[type="radio"]')){
      var q = getQuestionNumberFromInput(t);
      if (q == null) return;
      if (t.checked) saveAnswer(q, t.value, true);
    }
  }

  // Handle real-time autosave (text inputs, textareas) with debouncing
  function onInput(e){
    var t = e.target;
    if (!t) return;
    if (t.matches && t.matches('input[type="text"], textarea')){
      var q = getQuestionNumberFromInput(t);
      if (q == null) {
        console.warn('⚠️ Input detected but could not determine question number', t);
        return;
      }
      
      // Clear existing timer for this question
      if (saveTimers[q]) clearTimeout(saveTimers[q]);
      
      // Set new debounced save
      saveTimers[q] = setTimeout(function(){
        saveAnswer(q, t.value || '', true);
        delete saveTimers[q];
      }, AUTOSAVE_DELAY);
    }
  }

  // Periodic background save for any active text fields
  function periodicSave(){
    var textFields = document.querySelectorAll('input[type="text"], textarea');
    var savedCount = 0;
    textFields.forEach(function(field){
      if (field.value && field.value.trim()) {
        var q = getQuestionNumberFromInput(field);
        if (q != null) {
          saveAnswer(q, field.value, true);
          savedCount++;
        } else {
          console.warn('⚠️ Periodic save: Could not determine question number for field', field);
        }
      }
    });
    if (savedCount > 0) {
      console.log('🔄 Periodic save completed:', savedCount, 'answer(s)');
    }
  }

  // Save on visibility change (tab switch, minimize)
  function onVisibilityChange(){
    if (document.hidden) {
      periodicSave(); // Save everything when tab is hidden
    }
  }

  // Save on page unload
  function onBeforeUnload(){
    // Flush any pending saves
    Object.keys(saveTimers).forEach(function(q){
      clearTimeout(saveTimers[q]);
    });
    periodicSave();
  }

  // Force immediate save of all current answers (bypass debounce)
  function forceSaveAll(){
    var savedCount = 0;
    
    // Cancel any pending debounced saves
    Object.keys(saveTimers).forEach(function(q){
      clearTimeout(saveTimers[q]);
      delete saveTimers[q];
    });
    
    // Immediately save all text fields with content
    var textFields = document.querySelectorAll('input[type="text"], textarea');
    textFields.forEach(function(field){
      if (field.value && field.value.trim()) {
        var q = getQuestionNumberFromInput(field);
        if (q != null) {
          saveAnswer(q, field.value, true);
          savedCount++;
        }
      }
    });
    
    // Save all checked radio buttons
    var radios = document.querySelectorAll('input[type="radio"]:checked');
    radios.forEach(function(radio){
      var q = getQuestionNumberFromInput(radio);
      if (q != null) {
        saveAnswer(q, radio.value, true);
        savedCount++;
      }
    });
    
    if (savedCount > 0) {
      console.log('💾 Force-saved', savedCount, 'answer(s) to localStorage');
    }
    
    return savedCount;
  }

  function init(){
    // Listen for immediate changes (radio buttons)
    document.addEventListener('change', onChange, true);
    
    // Listen for real-time input (text fields, textareas)
    document.addEventListener('input', onInput, true);
    
    // Periodic background save
    setInterval(periodicSave, PERIODIC_SAVE_INTERVAL);
    
    // Save when tab hidden or window closed
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('beforeunload', onBeforeUnload);
    
    // Load saved answers after DOM is ready (multiple attempts to ensure it works)
    setTimeout(applySavedAnswers, 100);  // First attempt
    setTimeout(applySavedAnswers, 500);  // Second attempt after render
    setTimeout(applySavedAnswers, 1000); // Third attempt to be sure
    
    // Expose force save function globally for wrapper coordination
    window.__A2_forceSaveAll = forceSaveAll;
    window.__A2_applySavedAnswers = applySavedAnswers; // Also expose restore function
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

