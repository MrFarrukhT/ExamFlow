// Welcome page (ADR-040) — rotation-safe student entry.
// Generates a fresh studentId on submit and navigates to the dashboard.

(function () {
  'use strict';

  // Rotation safety: clear any leftover Olympiada keys from the previous student.
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith('olympiada:'))
      .forEach(k => localStorage.removeItem(k));
    sessionStorage.clear();
  } catch (e) {
    console.warn('storage clear failed:', e);
  }

  const form = document.getElementById('start-form');
  const err = document.getElementById('err');

  function showError(msg) {
    err.textContent = msg;
    err.hidden = false;
  }

  function generateStudentId() {
    // Prefer crypto.randomUUID (desktop Chrome/Edge 92+), fall back to getRandomValues
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const arr = new Uint8Array(16);
      crypto.getRandomValues(arr);
      return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
    }
    // Last-resort fallback (never happens on supported browsers)
    return 'stu-' + Date.now().toString(16) + '-' + Math.random().toString(16).slice(2);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    err.hidden = true;

    const student = document.getElementById('f-name').value.trim();
    const group = document.getElementById('f-group').value.trim();
    const lang = document.getElementById('f-lang').value;

    if (student.length < 2) {
      showError('Please enter your full name.');
      return;
    }
    if (!/^[\p{L}\s\-'.]+$/u.test(student)) {
      showError('Name can only contain letters, spaces, hyphens, dots, and apostrophes.');
      return;
    }

    const studentId = generateStudentId();
    localStorage.setItem('olympiada:studentId', studentId);
    localStorage.setItem('olympiada:student', student);
    localStorage.setItem('olympiada:studentName', student);
    localStorage.setItem('olympiada:studentGroup', group);
    localStorage.setItem('olympiada:lang', lang);

    window.location.href = 'dashboard.html';
  });
})();
