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
  const nameInput = document.getElementById('f-name');
  const takerIdInput = document.getElementById('f-taker-id');
  const langSelect = document.getElementById('f-lang');
  const submitBtn = form.querySelector('button[type="submit"]');

  // Bilingual welcome chrome — the labels/button/errors flip to German as soon
  // as the student selects the German dropdown option, so a Goethe-C1 student
  // sees a fully-German welcome form from the moment they pick their language.
  // English stays the default for the neutral first-load state.
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
      // Drop the English "Language" word — "C1 Olympiada" is the brand, used
      // uniformly across test.html's header, admin chrome, and backend tables.
      // "Olympiada" is cross-linguistic (Latin / Slavic roots), so it reads
      // naturally in both languages.
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

  // Swap the static form labels + submit button based on the currently-selected
  // language. The language dropdown option labels themselves stay as they are
  // ("English — C1 Advanced" / "German — C1 (Goethe)") so the student can
  // always find the language picker regardless of which one is currently set.
  // Also keeps <html lang> in sync so screen readers pronounce the labels in
  // the right language and native browser spell-check picks the right dict.
  function applyStrings() {
    const s = currentStrings();
    // Header chrome — h1 and subtitle were previously static English strings.
    // German students picking their language now get the full welcome page
    // in German, including the page title "C1 Olympiada" (drops the English
    // "Language" word) and the "Deutsch & Englisch · Lesen + Hören" sub-line.
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
    // ISO 639-1 code from our content-slug style ("english-c1" → "en", "german-c1" → "de")
    document.documentElement.lang = langSelect.value === 'german-c1' ? 'de' : 'en';
    // Browser tab title — German students should see a German title from
    // the moment they pick their language, not "Zarmed University — C1 Olympiada".
    document.title = langSelect.value === 'german-c1'
      ? 'Zarmed Universität — C1 Olympiada'
      : 'Zarmed University — C1 Olympiada';
  }

  // Keep the browser's native "balloon" message in sync with the current
  // language + field state. setCustomValidity() only overrides the balloon
  // if it's called BEFORE the invalid event fires — so we update on every
  // input + language change, not inside the invalid handler.
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

  // Clear the inline error state as soon as the user starts editing, and
  // refresh the custom-validity balloon text based on the new value.
  nameInput.addEventListener('input', () => {
    if (nameInput.getAttribute('aria-invalid') === 'true') {
      nameInput.removeAttribute('aria-invalid');
      err.hidden = true;
    }
    updateCustomValidity();
  });

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

    const studentId = generateStudentId();
    localStorage.setItem('olympiada:studentId', studentId);
    localStorage.setItem('olympiada:student', student);
    localStorage.setItem('olympiada:studentName', student);
    localStorage.setItem('olympiada:testTakerId', takerId);
    localStorage.setItem('olympiada:lang', lang);

    window.location.href = 'dashboard.html';
  });

  // Auto-focus the Full Name input on page load so a student can start
  // typing immediately without clicking or tabbing. The setTimeout(0)
  // defers to the next frame so screen readers have a chance to
  // announce the page first before focus jumps to the input.
  setTimeout(() => {
    try { nameInput.focus(); } catch (e) { /* focus() can throw on detached */ }
  }, 0);
})();
