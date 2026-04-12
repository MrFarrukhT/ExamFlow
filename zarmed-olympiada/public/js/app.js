// Welcome page (ADR-040) — rotation-safe student entry.
// Generates a fresh studentId on submit and navigates to the dashboard.
// Also checks for active (unfinished) sessions to enable "continue where you left off".

(function () {
  'use strict';

  // DON'T clear localStorage immediately — check for active sessions first.
  // If there are resumable sessions, the student needs the option to continue.
  // We only clear when starting a FRESH session (in the submit handler).

  const form = document.getElementById('start-form');
  const err = document.getElementById('err');
  const nameInput = document.getElementById('f-name');
  const takerIdInput = document.getElementById('f-taker-id');

  // Anti-autocomplete: randomized name attributes so browsers can't match
  // saved values across students on the same machine.
  const _salt = Math.random().toString(36).slice(2, 8);
  nameInput.name = 'fn-' + _salt;
  takerIdInput.name = 'tid-' + _salt;
  const langSelect = document.getElementById('f-lang');
  const submitBtn = form.querySelector('button[type="submit"]');

  // ---------- resume section ----------
  const resumeSection = document.getElementById('resume-section');
  const resumeList = document.getElementById('resume-list');

  function fmtLang(lang) {
    if (lang === 'english-c1') return 'English C1';
    if (lang === 'german-c1') return 'German C1';
    return lang;
  }
  function fmtSkill(skill) {
    return skill.charAt(0).toUpperCase() + skill.slice(1);
  }
  function fmtTime(seconds) {
    if (seconds <= 0) return 'Expired';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m + ':' + String(s).padStart(2, '0');
  }

  // Fetch active sessions from the server and display resume cards
  async function checkActiveSessions() {
    try {
      const res = await fetch('/api/sessions/active');
      if (!res.ok) return;
      const data = await res.json();
      const sessions = data.sessions || [];
      if (!sessions.length) return;

      resumeList.innerHTML = '';
      sessions.forEach((s) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'zu-resume-card' + (s.expired ? ' zu-resume-card--expired' : '');

        const info = document.createElement('div');
        info.className = 'zu-resume-card-info';
        const name = document.createElement('div');
        name.className = 'zu-resume-card-name';
        name.textContent = s.student;
        const meta = document.createElement('div');
        meta.className = 'zu-resume-card-meta';
        meta.textContent = fmtLang(s.lang) + ' · ' + fmtSkill(s.skill) + ' · ' + s.answeredCount + ' answered';
        info.appendChild(name);
        info.appendChild(meta);

        const time = document.createElement('div');
        time.className = 'zu-resume-card-time';
        time.textContent = s.expired ? 'Time up' : fmtTime(s.remainingSeconds);

        card.appendChild(info);
        card.appendChild(time);

        card.addEventListener('click', () => resumeSession(s));
        resumeList.appendChild(card);
      });

      resumeSection.hidden = false;
    } catch (e) {
      // Server not reachable — that's fine, just show the fresh form
    }
  }

  async function resumeSession(session) {
    try {
      const res = await fetch('/api/session/' + session.sessionId + '/resume', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert('Cannot resume: ' + (body.error || 'unknown error'));
        return;
      }
      const data = await res.json();
      // Store session info in localStorage so test.js can pick it up
      localStorage.setItem('olympiada:studentId', data.meta.studentId || '');
      localStorage.setItem('olympiada:student', data.meta.student);
      localStorage.setItem('olympiada:studentName', data.meta.student);
      localStorage.setItem('olympiada:testTakerId', data.meta.group || '');
      localStorage.setItem('olympiada:lang', data.meta.lang);
      localStorage.setItem('olympiada:sessionId', data.sessionId);
      localStorage.setItem('olympiada:sessionToken', data.token);
      localStorage.setItem('olympiada:skill', session.skill);
      // Store resume state so test.js knows to restore answers + timer
      localStorage.setItem('olympiada:resume', JSON.stringify({
        answers: data.answers,
        remainingSeconds: data.remainingSeconds,
        durationMinutes: data.durationMinutes
      }));
      // Go directly to test page (skip dashboard — already know the skill)
      window.location.href = 'test.html?module=' + session.skill;
    } catch (e) {
      alert('Resume failed: ' + e.message);
    }
  }

  // Check on page load
  checkActiveSessions();

  // ---------- bilingual strings ----------
  const STRINGS = {
    'english-c1': {
      pageTitle: 'C1 Language Olympiada',
      pageSubtitle: 'English & German · Reading + Listening',
      fullName: 'Full name',
      takerId: 'Test Taker ID',
      language: 'Language',
      continueBtn: 'Continue',
      errNameMissing: 'Please enter your full name.',
      errNameShort: 'Please enter your full name.',
      errNameChars: "Name can only contain letters, spaces, hyphens, dots, and apostrophes.",
    },
    'german-c1': {
      pageTitle: 'C1 Olympiada',
      pageSubtitle: 'Deutsch & Englisch · Lesen + Hören',
      fullName: 'Vollständiger Name',
      takerId: 'Prüfungsteilnehmer-ID',
      language: 'Sprache',
      continueBtn: 'Weiter',
      errNameMissing: 'Bitte geben Sie Ihren vollständigen Namen ein.',
      errNameShort: 'Bitte geben Sie Ihren vollständigen Namen ein.',
      errNameChars: 'Der Name darf nur Buchstaben, Leerzeichen, Bindestriche, Punkte und Apostrophe enthalten.',
    },
  };

  function currentStrings() {
    return STRINGS[langSelect.value] || STRINGS['english-c1'];
  }

  function applyStrings() {
    const s = currentStrings();
    const pageH1 = document.querySelector('.zu-header h1');
    const pageSub = document.querySelector('.zu-header .zu-subtitle');
    if (pageH1) pageH1.textContent = s.pageTitle;
    if (pageSub) pageSub.textContent = s.pageSubtitle;

    const nameLabel = form.querySelector('label[for="f-name"]');
    const takerIdLabel = form.querySelector('label[for="f-taker-id"]');
    const langLabel = form.querySelector('label[for="f-lang"]');
    if (nameLabel) nameLabel.textContent = s.fullName;
    if (takerIdLabel) takerIdLabel.textContent = s.takerId;
    if (langLabel) langLabel.textContent = s.language;
    if (submitBtn) submitBtn.textContent = s.continueBtn;
    document.documentElement.lang = langSelect.value === 'german-c1' ? 'de' : 'en';
    document.title = langSelect.value === 'german-c1'
      ? 'Zarmed Universität — C1 Olympiada'
      : 'Zarmed University — C1 Olympiada';
  }

  function updateCustomValidity() {
    const s = currentStrings();
    const val = nameInput.value;
    if (val.length === 0) {
      nameInput.setCustomValidity(s.errNameMissing);
    } else if (val.length < 2) {
      nameInput.setCustomValidity(s.errNameShort);
    } else if (!/^[\p{L}\s\-'.]+$/u.test(val)) {
      nameInput.setCustomValidity(s.errNameChars);
    } else {
      nameInput.setCustomValidity('');
    }
  }

  langSelect.addEventListener('change', () => {
    applyStrings();
    updateCustomValidity();
  });
  applyStrings();
  updateCustomValidity();

  function showError(msg, field) {
    err.textContent = msg;
    err.hidden = false;
    if (field) {
      field.setAttribute('aria-invalid', 'true');
      field.focus();
    }
  }

  nameInput.addEventListener('input', () => {
    if (nameInput.getAttribute('aria-invalid') === 'true') {
      nameInput.removeAttribute('aria-invalid');
      err.hidden = true;
    }
    updateCustomValidity();
  });

  function generateStudentId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const arr = new Uint8Array(16);
      crypto.getRandomValues(arr);
      return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
    }
    return 'stu-' + Date.now().toString(16) + '-' + Math.random().toString(16).slice(2);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    err.hidden = true;

    const student = nameInput.value.trim();
    const takerId = document.getElementById('f-taker-id').value.trim();
    const lang = document.getElementById('f-lang').value;

    const s = currentStrings();
    if (student.length < 2) {
      showError(s.errNameShort, nameInput);
      return;
    }
    if (!/^[\p{L}\s\-'.]+$/u.test(student)) {
      showError(s.errNameChars, nameInput);
      return;
    }

    // Clear old session data for fresh start
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('olympiada:'))
        .forEach(k => localStorage.removeItem(k));
      sessionStorage.clear();
    } catch (e) {
      console.warn('storage clear failed:', e);
    }

    const studentId = generateStudentId();
    localStorage.setItem('olympiada:studentId', studentId);
    localStorage.setItem('olympiada:student', student);
    localStorage.setItem('olympiada:studentName', student);
    localStorage.setItem('olympiada:testTakerId', takerId);
    localStorage.setItem('olympiada:lang', lang);

    window.location.href = 'dashboard.html';
  });

  setTimeout(() => {
    try { nameInput.focus(); } catch (e) { /* focus() can throw on detached */ }
  }, 0);
})();
