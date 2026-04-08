// Cambridge A1 Movers unified answer syncing for Reading & Writing parts
// Updates footer navigation with "X of Y" counts and highlighting
(function(){
  if (window.__A1MoversSyncLoaded) return; window.__A1MoversSyncLoaded = true;

  const MOVERS_STRUCTURE = {
    1: 5,
    2: 6,
    3: 6,
    4: 5,
    5: 7,
    6: 6
  };

  // Function to get the localStorage key for a specific question
  function getStorageKey(part, question) {
    return `movers_rw_p${part}_q${question}`;
  }

  // Check if a question is answered
  function isAnswered(part, question) {
    const key = getStorageKey(part, question);
    return !!localStorage.getItem(key);
  }

  // Update the footer UI
  function updateFooterUI() {
    let totalAnswered = 0;
    let totalQuestions = 0;

    // Iterate over each part
    for (const [partStr, count] of Object.entries(MOVERS_STRUCTURE)) {
      const part = parseInt(partStr);
      let partAnswered = 0;

      // Check each question in the part
      for (let q = 1; q <= count; q++) {
        if (isAnswered(part, q)) {
          partAnswered++;
        }
      }

      totalAnswered += partAnswered;
      totalQuestions += count;

      // Update "X of Y" text for this part
      updatePartCounter(part, partAnswered, count);

      // Update individual question buttons (highlight answered)
      updateQuestionButtons(part, count);
    }
  }

  // Update the "X of Y" counter for a specific part button
  function updatePartCounter(part, answered, total) {
    // Find the part button in the footer
    const partBtns = document.querySelectorAll('.footer__questionNo___3WNct');
    
    partBtns.forEach(btn => {
      const sectionNr = btn.querySelector('.sectionNr');
      if (sectionNr && parseInt(sectionNr.textContent.trim()) === part) {
        let countSpan = btn.querySelector('.attemptedCount');
        
        // Create span if it doesn't exist
        if (!countSpan) {
          countSpan = document.createElement('span');
          countSpan.className = 'attemptedCount';
          countSpan.setAttribute('aria-hidden', 'true');
          countSpan.style.marginLeft = '8px';
          countSpan.style.color = '#666';
          countSpan.style.fontWeight = '400';
          countSpan.style.fontSize = '0.9em';
          
          // Insert after sectionNr
          if (sectionNr.nextSibling) {
            btn.insertBefore(countSpan, sectionNr.nextSibling);
          } else {
            btn.appendChild(countSpan);
          }
        }
        
        // Update text
        countSpan.textContent = `${answered} of ${total}`;
      }
    });
  }

  // Update the highlighting of individual question buttons
  function updateQuestionButtons(part, count) {
    // The buttons have data-part="P" and data-question="Q"
    for (let q = 1; q <= count; q++) {
        const answered = isAnswered(part, q);
        const btns = document.querySelectorAll(`.subQuestion[data-part="${part}"][data-question="${q}"]`);
        
        btns.forEach(btn => {
            if (answered) {
                btn.classList.add('answered');
                // Add visual style for answered state if CSS class doesn't exist
                // (We'll assume the CSS handles .answered, or we inject styles)
                if (!document.getElementById('movers-sync-styles')) {
                   injectStyles();
                }
            } else {
                btn.classList.remove('answered');
            }
        });
    }
  }

  function injectStyles() {
      if (document.getElementById('movers-sync-styles')) return;
      const style = document.createElement('style');
      style.id = 'movers-sync-styles';
      style.textContent = `
          .subQuestion.answered {
              background-color: #e3f2fd; /* Light blue background */
              color: #1976d2;
              font-weight: bold;
              border-color: #2196F3;
          }
          .subQuestion.active {
              background-color: #2196F3 !important;
              color: white !important;
              border-color: #1976d2 !important;
          }
          .attemptedCount {
              font-size: 12px;
              opacity: 0.8;
          }
      `;
      document.head.appendChild(style);
  }

  // Add/remove .filled class on text inputs for visual feedback
  function updateInputFilledState(input) {
    if (input && (input.classList.contains('answer-input') || input.classList.contains('gap-input'))) {
      if (input.value && input.value.trim()) {
        input.classList.add('filled');
      } else {
        input.classList.remove('filled');
      }
    }
  }

  // Mark all inputs that already have saved values
  function initInputFilledStates() {
    document.querySelectorAll('.answer-input, .gap-input').forEach(updateInputFilledState);
  }

  // Listen for changes to update UI immediately
  function initListeners() {
    // Listen for any input change (radio or text)
    document.addEventListener('change', (e) => {
        setTimeout(() => {
            updateFooterUI();
            consolidateAnswers();
        }, 50);
        updateInputFilledState(e.target);
    });

    // Also listen on 'input' for real-time updates as student types
    document.addEventListener('input', (e) => {
        setTimeout(() => {
            updateFooterUI();
            consolidateAnswers();
        }, 50);
        updateInputFilledState(e.target);
    });

    // Listen for localStorage changes (cross-tab syncing)
    window.addEventListener('storage', (e) => {
        if (e.key && e.key.startsWith('movers_rw_')) {
            updateFooterUI();
            consolidateAnswers();
        }
    });
  }

  // Consolidate all movers_rw_* answers into reading-writingAnswers
  function consolidateAnswers() {
    const consolidated = {};
    let questionNumber = 1;
    
    // Go through all parts in order
    for (const [partStr, count] of Object.entries(MOVERS_STRUCTURE)) {
      const part = parseInt(partStr);
      
      // Get all questions from this part
      for (let q = 1; q <= count; q++) {
        const key = getStorageKey(part, q);
        const answer = localStorage.getItem(key);
        
        if (answer && answer.trim()) {
          consolidated[`q${questionNumber}`] = answer.trim();
        }
        questionNumber++;
      }
    }
    
    // Save consolidated answers to the expected localStorage key
    localStorage.setItem('cambridge-reading-writingAnswers', JSON.stringify(consolidated));

    return consolidated;
  }
  
  // Expose consolidateAnswers globally so it can be called before submission
  window.consolidateMoversAnswers = consolidateAnswers;
  
  // Auto-consolidate every 5 seconds to keep reading-writingAnswers in sync
  setInterval(consolidateAnswers, 5000);
  
  // Consolidate immediately on load
  setTimeout(consolidateAnswers, 1000);

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initListeners();
        setTimeout(() => { updateFooterUI(); initInputFilledStates(); }, 200);
    });
  } else {
    initListeners();
    updateFooterUI();
    initInputFilledStates();
  }

})();




