// Module selection dashboard (ADR-040).
// Shows module cards, reflects completed state from server, fires 4-corner
// invigilator gate when all modules are done.

(function () {
  'use strict';

  const studentId = localStorage.getItem('olympiada:studentId');
  const studentName = localStorage.getItem('olympiada:student') || localStorage.getItem('olympiada:studentName');
  const studentGroup = localStorage.getItem('olympiada:studentGroup') || '';
  const lang = localStorage.getItem('olympiada:lang');

  if (!studentId || !studentName || !lang) {
    window.location.href = 'index.html';
    return;
  }

  const MODULES = [
    {
      key: 'reading',
      titleEn: 'Reading & Use of English',
      titleDe: 'Lesen',
      durationEn: '90 minutes',
      durationDe: '65 minutes',
    },
    {
      key: 'listening',
      titleEn: 'Listening',
      titleDe: 'Hören',
      durationEn: '40 minutes',
      durationDe: '40 minutes',
    },
  ];

  function render(completed) {
    document.getElementById('welcome-name').textContent = 'Welcome, ' + studentName;
    const langLabel = lang === 'german-c1' ? 'German C1 (Goethe)' : 'English C1 (Cambridge)';
    document.getElementById('welcome-meta').textContent =
      (studentGroup ? 'Group: ' + studentGroup + ' · ' : '') + 'Language: ' + langLabel;

    const grid = document.getElementById('modules-grid');
    grid.innerHTML = '';
    const isGerman = lang === 'german-c1';

    let completedCount = 0;
    MODULES.forEach((m) => {
      const card = document.createElement('div');
      card.className = 'zu-module-card';
      const isDone = !!(completed && completed[m.key] && completed[m.key].done);
      if (isDone) {
        card.classList.add('zu-module-card--complete');
        completedCount += 1;
      }
      const title = document.createElement('h3');
      title.textContent = isGerman ? m.titleDe : m.titleEn;
      card.appendChild(title);
      const dur = document.createElement('div');
      dur.className = 'zu-module-duration';
      dur.textContent = 'Duration: ' + (isGerman ? m.durationDe : m.durationEn);
      card.appendChild(dur);
      if (isDone) {
        const status = document.createElement('div');
        status.className = 'zu-module-duration';
        status.textContent = 'Submitted.';
        card.appendChild(status);
      } else {
        card.addEventListener('click', () => {
          // Navigate to the test with the selected module
          window.location.href = 'test.html?module=' + encodeURIComponent(m.key);
        });
      }
      grid.appendChild(card);
    });

    // When all modules complete, show completion banner instead of grid
    if (completedCount >= MODULES.length) {
      document.getElementById('modules-section').hidden = true;
      document.getElementById('completion-section').hidden = false;
    }
  }

  async function loadStatus() {
    try {
      const res = await fetch('/api/student-status?studentId=' + encodeURIComponent(studentId));
      if (!res.ok) throw new Error('status ' + res.status);
      const body = await res.json();
      render(body.completed || {});
    } catch (e) {
      console.warn('student-status fetch failed, rendering empty:', e);
      render({});
    }
  }

  // 4-corner invigilator gate — same pattern as done.html, returns to welcome
  (function setupInvigilatorGate() {
    const corners = ['TL', 'TR', 'BR', 'BL'];
    let progress = [];
    let timer = null;
    function reset() { progress = []; if (timer) { clearTimeout(timer); timer = null; } }
    document.addEventListener('click', (e) => {
      const w = window.innerWidth, h = window.innerHeight;
      const edge = 80;
      let corner = null;
      if (e.clientX < edge && e.clientY < edge) corner = 'TL';
      else if (e.clientX > w - edge && e.clientY < edge) corner = 'TR';
      else if (e.clientX > w - edge && e.clientY > h - edge) corner = 'BR';
      else if (e.clientX < edge && e.clientY > h - edge) corner = 'BL';
      if (!corner) { reset(); return; }
      if (corners[progress.length] === corner) {
        progress.push(corner);
        if (!timer) timer = setTimeout(reset, 3000);
        if (progress.length === corners.length) {
          reset();
          // Full rotation: clear all Olympiada keys and go to welcome
          Object.keys(localStorage).filter(k => k.startsWith('olympiada:')).forEach(k => localStorage.removeItem(k));
          sessionStorage.clear();
          window.location.href = 'index.html';
        }
      } else {
        reset();
      }
    });
  })();

  loadStatus();
})();
