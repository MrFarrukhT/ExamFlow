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
      durationMinEn: 90,
      durationMinDe: 65,
    },
    {
      key: 'listening',
      titleEn: 'Listening',
      titleDe: 'Hören',
      durationMinEn: 40,
      durationMinDe: 40,
    },
  ];

  // Language-aware UI strings. German C1 students are taking a Goethe-style
  // exam in German, so the dashboard chrome should be German end-to-end —
  // the language dropdown labels, module titles, and instructions are already
  // localized in dashboard.html + MODULES above; this object covers the
  // remaining static + interpolated strings.
  const isGerman = lang === 'german-c1';
  const i18n = isGerman ? {
    welcome: 'Willkommen, ',
    group: 'Gruppe: ',
    language: 'Sprache: ',
    id: 'ID: ',
    duration: 'Dauer: ',
    minutes: ' Minuten',
    submitted: 'Abgegeben.',
    langLabel: 'Deutsch C1 (Goethe)',
    // Drop the English "Language" word for German students. "C1 Olympiada"
    // is the brand name used uniformly across test.html's header and all
    // backend chrome. Matches app.js's welcome page title.
    pageTitle: 'C1 Olympiada',
    subtitle: 'Bitte wählen Sie ein Modul',
    selectH2: 'Wählen Sie ein Modul',
    completionH2: 'Alle Prüfungsteile abgeschlossen',
    completionP: 'Sie haben alle Testmodule beendet. Bitte bleiben Sie sitzen und warten Sie auf die Aufsicht.',
  } : {
    welcome: 'Welcome, ',
    group: 'Group: ',
    language: 'Language: ',
    id: 'ID: ',
    duration: 'Duration: ',
    minutes: ' minutes',
    submitted: 'Submitted.',
    langLabel: 'English C1 Advanced',
    pageTitle: 'C1 Language Olympiada',
    subtitle: 'Select a module to begin',
    selectH2: 'Select a Module to Begin',
    completionH2: 'All Sections Complete',
    completionP: 'You have finished all test modules. Please remain seated and wait for your invigilator.',
  };

  // Swap the static HTML strings that were authored in English. Running
  // once on boot is enough — the dashboard never re-localizes mid-session.
  // Also sets <html lang> so screen readers pronounce the labels in the
  // right language and native browser spell-check picks the right dict.
  function localizeStaticStrings() {
    document.documentElement.lang = isGerman ? 'de' : 'en';
    // Header h1 — previously a static English string. German students now
    // see "C1 Olympiada" (brand-only, drops the English "Language" word).
    const pageH1 = document.querySelector('.zu-header h1');
    if (pageH1) pageH1.textContent = i18n.pageTitle;
    const subtitle = document.querySelector('.zu-header .zu-subtitle');
    if (subtitle) subtitle.textContent = i18n.subtitle;
    const modulesH2 = document.querySelector('#modules-section h2');
    if (modulesH2) modulesH2.textContent = i18n.selectH2;
    const completionH2 = document.querySelector('.zu-completion-banner h2');
    if (completionH2) completionH2.textContent = i18n.completionH2;
    const completionP = document.querySelector('.zu-completion-banner p');
    if (completionP) completionP.textContent = i18n.completionP;
  }

  function render(completed) {
    document.getElementById('welcome-name').textContent = i18n.welcome + studentName;
    // Intent plan (2026-04-11): "Welcome, {name} + ID: {studentId} + C1 Advanced — English".
    // Show a short 8-char fragment of the UUID (same pattern as the test.html candidate-id),
    // so the invigilator can verify the student is at the right station without exposing the full UUID.
    const idShort = (studentId || '').slice(0, 8).toUpperCase();
    document.getElementById('welcome-meta').textContent =
      (studentGroup ? i18n.group + studentGroup + ' · ' : '') +
      i18n.language + i18n.langLabel +
      (idShort ? ' · ' + i18n.id + idShort : '');

    const grid = document.getElementById('modules-grid');
    grid.innerHTML = '';

    let completedCount = 0;
    MODULES.forEach((m) => {
      const isDone = !!(completed && completed[m.key] && completed[m.key].done);
      // Use <button> for keyboard accessibility: Tab focuses it, Enter/Space
      // triggers click. Completed modules become <div> since they're not
      // actionable (no interaction beyond visual state).
      const card = document.createElement(isDone ? 'div' : 'button');
      if (!isDone) card.type = 'button';
      card.className = 'zu-module-card';
      if (isDone) {
        card.classList.add('zu-module-card--complete');
        completedCount += 1;
      }
      const title = document.createElement('h3');
      title.textContent = isGerman ? m.titleDe : m.titleEn;
      card.appendChild(title);
      const dur = document.createElement('div');
      dur.className = 'zu-module-duration';
      const minutes = isGerman ? m.durationMinDe : m.durationMinEn;
      dur.textContent = i18n.duration + minutes + i18n.minutes;
      card.appendChild(dur);
      if (isDone) {
        const status = document.createElement('div');
        status.className = 'zu-module-duration';
        status.textContent = i18n.submitted;
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

  localizeStaticStrings();
  loadStatus();
})();
