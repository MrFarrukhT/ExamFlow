// Centralized session verification for Cambridge modules
// Usage: include early in <head> on test pages.
(function(){
  try {
    var studentId = localStorage.getItem('studentId');
    var studentName = localStorage.getItem('studentName');
    var examType = localStorage.getItem('examType');
    if (!studentId || !studentName || (examType !== 'Cambridge' && examType !== 'Olympiada')) {
      alert('Please log in first to access the test.');
      // Redirect to appropriate login — use absolute path so it works at any nesting depth
      var target = (examType === 'Olympiada') ? '/index.html?exam=olympiada' : '/index.html?exam=cambridge';
      window.location.href = target;
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
          break;
        }
      }
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


