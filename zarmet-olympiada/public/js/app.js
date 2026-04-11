// Welcome page — rotation-safe student start
// ADR-036: clear previous student state on load, then capture fresh entry.

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

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.hidden = true;

    const student = document.getElementById('f-name').value.trim();
    const group = document.getElementById('f-group').value.trim();
    const lang = document.getElementById('f-lang').value;
    const skill = document.getElementById('f-skill').value;

    if (student.length < 2) {
      showError('Please enter your full name.');
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;

    try {
      const res = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student, group, lang, skill }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to start');

      // Persist the active session so test.html can pick it up
      localStorage.setItem('olympiada:sessionId', body.sessionId);
      localStorage.setItem('olympiada:lang', lang);
      localStorage.setItem('olympiada:skill', skill);
      localStorage.setItem('olympiada:student', student);

      window.location.href = 'test.html';
    } catch (e) {
      showError(e.message);
      btn.disabled = false;
    }
  });
})();
