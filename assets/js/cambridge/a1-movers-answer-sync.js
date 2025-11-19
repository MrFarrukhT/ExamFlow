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
    
    console.log(`✅ Footer updated: ${totalAnswered}/${totalQuestions} answered`);
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

  // Listen for changes to update UI immediately
  function initListeners() {
    // Listen for any input change (radio or text)
    document.addEventListener('change', (e) => {
        // We wait a brief moment to allow the inline script to save to localStorage
        setTimeout(updateFooterUI, 50);
    });
    
    // Listen for localStorage changes (cross-tab syncing)
    window.addEventListener('storage', (e) => {
        if (e.key && e.key.startsWith('movers_rw_')) {
            updateFooterUI();
        }
    });
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initListeners();
        setTimeout(updateFooterUI, 200); // Delay slightly to ensure DOM is ready
    });
  } else {
    initListeners();
    updateFooterUI();
  }

})();

