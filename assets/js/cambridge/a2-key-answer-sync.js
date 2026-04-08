// Cambridge A2 Key unified answer syncing for Reading & Writing parts
// Saves radio/text answers keyed by absolute question number in localStorage 'reading-writingAnswers'
// Enhanced with seamless real-time autosave (no visual indicators)
(function(){
  if (window.__A2AnswerSyncLoaded) return; window.__A2AnswerSyncLoaded = true;

  // Dynamically determine storage key based on data-skill attribute
  // Use cambridge- prefix to avoid collision with IELTS storage keys
  function getStorageKey() {
    var skill = document.body.getAttribute('data-skill');
    if (skill === 'reading') return 'cambridge-readingAnswers';
    if (skill === 'writing') return 'cambridge-writingAnswers';
    return 'cambridge-reading-writingAnswers'; // Default for combined tests
  }
  
  var STORAGE_KEY = getStorageKey();
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
      return;
    }
    var answers = loadAnswers();
    answers[String(qNum)] = value;
    saveAnswers(answers);
    markAnswered(qNum, !!value);
    
    // Update footer counter after saving
    updateFooterCounter();
    
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

  // Detect question ranges based on exam level from URL path
  function detectRangesFromLevel() {
    var path = window.location.pathname;
    if (path.indexOf('B1-Preliminary') !== -1 || path.indexOf('B2-First') !== -1) {
      return [
        { part: 1, min: 1,  max: 5 },
        { part: 2, min: 6,  max: 10 },
        { part: 3, min: 11, max: 15 },
        { part: 4, min: 16, max: 20 },
        { part: 5, min: 21, max: 26 },
        { part: 6, min: 27, max: 32 }
      ];
    }
    // Default: A2 Key / A1 Movers ranges
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

  function updateFooterCounter(){
    // Update the "X of Y" counter in the footer navigation
    // This works by updating the attemptedCount spans without rebuilding the entire footer
    try{
      var ranges = window.A2KeyManifest && Array.isArray(window.A2KeyManifest.ranges)
        ? window.A2KeyManifest.ranges.slice()
        : detectRangesFromLevel();
      
      var answers = loadAnswers();
      
      // Determine which document contains the footer (could be parent if we're in iframe)
      var targetDoc = document;
      var inIframe = false;
      try {
        inIframe = window.self !== window.top && window.parent && window.parent.document;
        if (inIframe) {
          // Check if parent has the footer navigation
          var parentFooter = window.parent.document.querySelector('#rw-footer-nav, .footer-nav, [class*="footer"]');
          if (parentFooter) {
            targetDoc = window.parent.document;
          }
        }
      } catch(e) {
        // Cross-origin iframe, can't access parent
      }
      
      // Update each part's counter
      ranges.forEach(function(r){
        var attempted = 0;
        Object.keys(answers).forEach(function(k){
          var q = parseInt(k, 10);
          if (!isNaN(q) && q >= r.min && q <= r.max && answers[k]) {
            attempted++;
          }
        });
        
        var total = r.max - r.min + 1;
        
        // Find and update the attemptedCount span for this part
        var sectionNrs = targetDoc.querySelectorAll('.sectionNr');
        for (var i = 0; i < sectionNrs.length; i++) {
          if (sectionNrs[i].textContent.trim() === String(r.part)) {
            var parentSpan = sectionNrs[i].parentElement;
            var attemptedSpan = parentSpan.querySelector('.attemptedCount');
            
            if (attemptedSpan) {
              // Update existing span
              attemptedSpan.textContent = attempted + ' of ' + total;
            } else {
              // For selected parts, the attemptedCount span might not exist
              // Create it dynamically and insert after sectionNr
              attemptedSpan = targetDoc.createElement('span');
              attemptedSpan.className = 'attemptedCount';
              attemptedSpan.setAttribute('aria-hidden', 'true');
              attemptedSpan.textContent = attempted + ' of ' + total;
              attemptedSpan.style.marginLeft = '8px'; // Add some spacing
              attemptedSpan.style.color = '#666'; // Match default gray color from CSS
              attemptedSpan.style.fontWeight = '400'; // Normal weight (400)
              
              // Insert after the sectionNr span
              if (sectionNrs[i].nextSibling) {
                parentSpan.insertBefore(attemptedSpan, sectionNrs[i].nextSibling);
              } else {
                parentSpan.appendChild(attemptedSpan);
              }
            }
            break;
          }
        }
      });
      
    }catch(e){
    }
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
          return;
        }
        
        // Restore radio buttons (Parts 1-4)
        var radios = qWrapper.querySelectorAll('input[type="radio"]');
        if (radios.length > 0 && typeof val === 'string' && val.length <= 3) {
          for (var i=0; i<radios.length; i++) {
            if (radios[i].value === val) {
              radios[i].checked = true;
              restoredCount++;
              break;
            }
          }
        } else {
          // Restore text inputs (Part 5)
          var textInput = qWrapper.querySelector('input[type="text"]');
          if (textInput) {
            textInput.value = val;
            updateFilledState(textInput);
            // Trigger input event to update any word count or validation
            var evt = new Event('input', { bubbles: true });
            textInput.dispatchEvent(evt);
            restoredCount++;
          }

          // Restore textareas (Part 6-7)
          var textarea = qWrapper.querySelector('textarea');
          if (textarea) {
            textarea.value = val;
            updateFilledState(textarea);
            // Trigger input event to update word count
            var evt2 = new Event('input', { bubbles: true });
            textarea.dispatchEvent(evt2);
            restoredCount++;
          }
        }
        
        markAnswered(q, true);
      }catch(e){
        console.error('Error restoring Q'+q+':', e);
      }
    });
    
  }

  // Handle immediate saves (radio buttons, selects)
  function onChange(e){
    var t = e.target;
    if (!t) return;
    if (t.matches && t.matches('input[type="radio"]')){
      var q = getQuestionNumberFromInput(t);
      if (q == null) return;
      if (t.checked) saveAnswer(q, t.value, true);
    }
    if (t.matches && t.matches('select')){
      updateFilledState(t);
      var q = getQuestionNumberFromInput(t);
      if (q == null) return;
      saveAnswer(q, t.value, true);
    }
  }

  // Toggle .filled visual state on text inputs and textareas
  function updateFilledState(el){
    if (!el || !el.classList) return;
    if (el.value && el.value.trim()) {
      el.classList.add('filled');
    } else {
      el.classList.remove('filled');
    }
  }

  // Handle real-time autosave (text inputs, textareas) with debouncing
  function onInput(e){
    var t = e.target;
    if (!t) return;
    if (t.matches && t.matches('input[type="text"], textarea')){
      updateFilledState(t);
      var q = getQuestionNumberFromInput(t);
      if (q == null) {
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
        }
      }
    });
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
    
    return savedCount;
  }

  function injectFilledStyles(){
    if (document.getElementById('ic-a2key-filled-style')) return;
    var css = '.textEntryInteractionValue.filled{border-color:#16a34a !important;background-color:#f0fdf4 !important;}' +
      'textarea.filled{border-color:#16a34a !important;background-color:#f0fdf4 !important;}' +
      'select.inline-choice-select.filled{border-color:#16a34a !important;background-color:#f0fdf4 !important;}';
    var s = document.createElement('style'); s.id='ic-a2key-filled-style'; s.appendChild(document.createTextNode(css));
    (document.head || document.documentElement).appendChild(s);
  }

  function init(){
    injectFilledStyles();

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
    
    // Update footer counters on page load
    setTimeout(updateFooterCounter, 200);
    setTimeout(updateFooterCounter, 600);
    setTimeout(updateFooterCounter, 1200);
    
    // Expose force save function globally for wrapper coordination
    window.__A2_forceSaveAll = forceSaveAll;
    window.__A2_applySavedAnswers = applySavedAnswers; // Also expose restore function
    window.__A2_updateFooterCounter = updateFooterCounter; // Expose counter update function
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

