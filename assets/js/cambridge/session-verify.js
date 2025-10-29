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

