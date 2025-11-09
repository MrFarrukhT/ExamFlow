// Centralized session verification for Cambridge modules
// Usage: include early in <head> on test pages.
(function(){
  try {
    var studentId = localStorage.getItem('studentId');
    var studentName = localStorage.getItem('studentName');
    var examType = localStorage.getItem('examType');
    if (!studentId || !studentName || examType !== 'Cambridge') {
      alert('Please log in first to access the test.');
      // Try to find appropriate login root from location depth
      var path = window.location.pathname;
      // Default Cambridge login index two levels up from A2-Key dir (../../index.html from wrapper)
      var to = '../../index.html';
      if (path.indexOf('/Cambridge/MOCKs-Cambridge/') !== -1) {
        // inside Cambridge section: go to platform index
        to = '../../index.html';
      } else {
        to = 'index.html';
      }
      window.location.href = to;
    }
  } catch(e) {
    // Non-blocking
  }
})();

// Global function to populate Candidate ID display in header
window.populateCandidateIdDisplay = function() {
  try {
    const studentId = localStorage.getItem('studentId');
    if (studentId) {
      // Populate the header display (the div next to "Candidate ID" label)
      const candidateIdLabel = document.querySelector('.header__name___1Cw2x');
      if (candidateIdLabel && candidateIdLabel.textContent.includes('Candidate ID')) {
        const displayDiv = candidateIdLabel.nextElementSibling;
        if (displayDiv) {
          displayDiv.textContent = studentId;
          displayDiv.style.fontWeight = 'bold';
          console.log('✅ Candidate ID header populated:', studentId);
        }
      }
      
      // Also populate any input fields (specific to Candidate ID fields only)
      const candidateIdInputs = [
        document.querySelector('input[placeholder*="Candidate"]'),
        document.querySelector('input[placeholder*="candidate"]'),
        document.getElementById('candidateId'),
        document.getElementById('candidate-id'),
        document.querySelector('input[name="candidateId"]'),
        document.querySelector('input[name="candidate-id"]')
      ];
      
      for (const input of candidateIdInputs) {
        if (input) {
          input.value = studentId;
          input.readOnly = true;
          console.log('✅ Candidate ID input populated:', studentId);
          break;
        }
      }
    } else {
      console.warn('⚠️ No studentId found in localStorage');
    }
  } catch(e) {
    console.error('Error populating Candidate ID:', e);
  }
};

// Auto-populate when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.populateCandidateIdDisplay);
} else {
  // DOM already loaded
  window.populateCandidateIdDisplay();
}


