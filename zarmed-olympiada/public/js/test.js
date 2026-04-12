/* Zarmed Olympiada — Test Runner (ADR-039)
 * Cambridge-authentic single-part-at-a-time state machine.
 * Supports all 8 CAE Reading parts, all 4 Listening parts (including
 * taskGroups for Part 4). Strict listening: pre-play modal, auto-play,
 * no controls, no rewind. No yellow global counter. No Secure Mode badge.
 */

(function () {
  'use strict';

  // ---------- session bootstrap ----------
  const urlParams = new URLSearchParams(window.location.search);
  const moduleParam = (urlParams.get('module') || '').toLowerCase();
  const storedSkill = localStorage.getItem('olympiada:skill');
  const skill = moduleParam || storedSkill || 'reading';
  const lang = localStorage.getItem('olympiada:lang') || 'english-c1';
  const studentId = localStorage.getItem('olympiada:studentId') || '';
  const studentName = localStorage.getItem('olympiada:student') || localStorage.getItem('olympiada:studentName') || '';
  let sessionId = localStorage.getItem('olympiada:sessionId') || '';
  let sessionToken = localStorage.getItem('olympiada:sessionToken') || '';

  // Helper: add session token to fetch requests. All session-scoped API calls
  // must use this instead of raw fetch() to include the X-Session-Token header.
  function sessionFetch(url, opts = {}) {
    const headers = { ...(opts.headers || {}) };
    if (sessionToken) headers['X-Session-Token'] = sessionToken;
    return fetch(url, { ...opts, headers });
  }

  if (!studentName || !lang) {
    window.location.href = 'index.html';
    return;
  }

  // ---------- i18n ----------
  // German C1 students should see German chrome end-to-end — the real
  // Goethe Hören/Lesen interface is German throughout. Previously the
  // error modals, banner fallbacks, and static header strings leaked
  // English into German sessions. Pre-play, confirm, and listening-gate
  // strings were already localized inline; this object centralizes the
  // rest so future strings stay consistent.
  const isDe = lang === 'german-c1';
  const t = isDe ? {
    audioPlaying:      'Audio läuft',
    audioFinished:     'Audio beendet',
    candidateId:       'Kandidaten-ID',
    loading:           'Lädt …',
    problemTitle:      'Problem',
    ok:                'OK',
    errorBanner:       'Fehler',
    submitConfirmTitle:'Test beenden?',
    submitConfirmBody: 'Sie können nach der Abgabe nicht mehr zurückkehren. Sind Sie sicher, dass Sie alle Antworten überprüft haben?',
    submitConfirmYes:  'Ja, abgeben',
    submitConfirmNo:   'Abbrechen',
    audioUnavailable:  'Audio ist für diesen Teil nicht verfügbar. Bitte sagen Sie Ihrer Aufsicht Bescheid. Sie können die Fragen weiterhin beantworten, werden aber den Ton nicht hören.',
    audioFailed:       (msg) => 'Audio konnte nicht gestartet werden: ' + msg + '. Bitte sagen Sie Ihrer Aufsicht Bescheid.',
    submitFailed:      (msg) => 'Abgabe fehlgeschlagen: ' + msg + '. Bitte sagen Sie Ihrer Aufsicht Bescheid. Ihre Antworten sind weiterhin auf dem Server gespeichert.',
    loadFailed:        (msg) => 'Test konnte nicht geladen werden. Bitte sagen Sie Ihrer Aufsicht Bescheid. (' + msg + ')',
  } : {
    audioPlaying:      'Audio is playing',
    audioFinished:     'Audio finished',
    candidateId:       'Candidate ID',
    loading:           'Loading …',
    problemTitle:      'Problem',
    ok:                'OK',
    errorBanner:       'Error',
    submitConfirmTitle:'Finish this test?',
    submitConfirmBody: "You can't come back after submitting. Are you sure you've reviewed all your answers?",
    submitConfirmYes:  'Yes, submit',
    submitConfirmNo:   'Cancel',
    audioUnavailable:  'Audio is unavailable for this part. Please tell your invigilator. You may continue to answer the questions, but you will not hear the audio.',
    audioFailed:       (msg) => 'Unable to start audio: ' + msg + '. Please tell your invigilator.',
    submitFailed:      (msg) => 'Submit failed: ' + msg + '. Please tell the invigilator. Your answers are still saved on the server.',
    loadFailed:        (msg) => 'Failed to load the test. Please tell your invigilator. (' + msg + ')',
  };

  // Set the document lang attribute so assistive tech pronounces the
  // static German strings below correctly, and swap the static English
  // strings authored in test.html to their German equivalents in one
  // pass on boot.
  document.documentElement.lang = isDe ? 'de' : 'en';
  (function localizeStaticStrings() {
    const idLabel = document.querySelector('.ct-header-id-label');
    if (idLabel) idLabel.textContent = t.candidateId;
    const audioLabel = document.querySelector('.ct-audio-status span:last-child');
    if (audioLabel) audioLabel.textContent = t.audioPlaying;
    const bannerTitle = document.getElementById('ct-banner-title');
    if (bannerTitle && bannerTitle.textContent === 'Loading…') {
      bannerTitle.textContent = t.loading;
    }
    // Aria-labels on static nav elements — German screen readers should
    // announce "Verbleibende Zeit" / "Zurück" / "Weiter" / "Beenden"
    // instead of the English defaults authored in test.html.
    const timerEl = document.getElementById('ct-timer');
    if (timerEl) timerEl.setAttribute('aria-label', isDe ? 'Verbleibende Zeit' : 'Time remaining');
    const prevBtn = document.getElementById('ct-prev');
    if (prevBtn) prevBtn.setAttribute('aria-label', isDe ? 'Zurück' : 'Previous');
    const nextBtn = document.getElementById('ct-next');
    if (nextBtn) nextBtn.setAttribute('aria-label', isDe ? 'Weiter' : 'Next');
    const finishBtn = document.getElementById('ct-finish');
    if (finishBtn) finishBtn.setAttribute('aria-label', isDe ? 'Beenden' : 'Finish');
    // Browser tab title — must be set BEFORE startTimer() captures
    // originalTitle, so the timer's "(MM:SS) Prüfung" countdown prefix
    // uses the localized base title instead of the English default.
    document.title = isDe ? 'Zarmed Olympiada — Prüfung' : 'Zarmed Olympiada — Test';
  })();

  // ---------- anti-autocomplete ----------
  // Browsers (Chrome, Edge) aggressively remember text input values and
  // offer dropdown suggestions even when autocomplete="off". In an exam
  // this leaks previous students' answers on shared machines. Defence:
  //   1. autocomplete="one-time-code" — browsers respect this more than "off"
  //   2. randomized name — browsers key saved values by input name
  const _acSalt = Math.random().toString(36).slice(2, 8);
  function examInput(input, qid) {
    input.autocomplete = 'one-time-code';
    input.name = 'x-' + (qid || '') + '-' + _acSalt;
  }

  // ---------- state ----------
  const state = {
    content: null,          // loaded from /api/content
    parts: [],              // [{ part, flatQuestions, taskGroupFor }]
    flatQuestions: [],      // [{ partIndex, partId, qid, question, options }]
    qIndexById: {},         // qid -> flat index
    currentPartIndex: 0,
    currentQid: null,
    answers: {},
    audioState: {},         // partId -> 'not-started' | 'playing' | 'finished' (per-part audio — rarely used)
    playedAudioSrcs: null,  // Set<string> — audio file srcs (e.g. "audio/part1.m4a") that have
                             // already been played at least once. Replaces the earlier
                             // listeningGate boolean: per-FILE gating, not per-module.
                             // Rationale: real CAE Listening is a single continuous 40-minute
                             // recording covering all four parts, so the modal must fire ONCE
                             // and stay silent for parts 2–4. But real Goethe Hören has FOUR
                             // separate Teil recordings, so the modal must fire once per Teil.
                             // Tracking by src covers both: CAE's 4 parts all reference the same
                             // file (modal fires once), Goethe's 4 Teile reference distinct
                             // files (modal fires once per file).
                             // Initialized to a new Set() when content loads (below).
    listeningGate: 'closed', // legacy compat — kept as 'opened' shim for any code still reading it
    audioElement: null,     // currently live Audio instance (if any)
    audioFinishedHideTimer: null, // setTimeout id for the "Audio finished" brief announcement;
                                  // cleared when new audio plays, part changes, or on error
    activeSlotQid: null,    // for gapped-text: which slot is selected for assignment
    bookmarks: {},          // qid -> true (toggled by student; visually flags questions for review)
    timerEndMs: null,
    timerHandle: null,
    submitting: false,
  };

  // ---------- load content and start session ----------
  async function loadContent() {
    const res = await fetch('/api/content/' + encodeURIComponent(lang) + '/' + encodeURIComponent(skill));
    if (!res.ok) throw new Error('content load failed (' + res.status + ')');
    state.content = await res.json();
    state.playedAudioSrcs = new Set();

    // Build flat question list + index
    state.parts = state.content.parts.map((part, partIndex) => {
      const flat = [];
      if (Array.isArray(part.taskGroups) && part.taskGroups.length) {
        for (const tg of part.taskGroups) {
          for (const q of (tg.questions || [])) {
            flat.push({ partIndex, partId: part.id, qid: q.id, question: q, taskGroup: tg });
          }
        }
      } else {
        for (const q of (part.questions || [])) {
          flat.push({ partIndex, partId: part.id, qid: q.id, question: q, taskGroup: null });
        }
      }
      return { part, flatQuestions: flat };
    });
    state.flatQuestions = state.parts.flatMap(p => p.flatQuestions);
    state.flatQuestions.forEach((fq, idx) => { state.qIndexById[fq.qid] = idx; });

    if (state.flatQuestions.length) {
      state.currentQid = state.flatQuestions[0].qid;
      state.currentPartIndex = 0;
    }
  }

  // Persist the current position (part index + qid) so a refresh lands
  // the student back where they were instead of Part 1 Q1.
  function savePosition() {
    if (!sessionId) return;
    try {
      localStorage.setItem('olympiada:pos:' + sessionId, JSON.stringify({
        partIndex: state.currentPartIndex,
        qid: state.currentQid,
      }));
    } catch (e) {}
  }
  function restorePosition() {
    if (!sessionId) return;
    try {
      const raw = localStorage.getItem('olympiada:pos:' + sessionId);
      if (!raw) return;
      const pos = JSON.parse(raw);
      // Only restore if the saved qid still exists in the current flat list
      // (guards against stale state from a content/schema change)
      if (pos && typeof pos.partIndex === 'number' && typeof pos.qid === 'string'
          && pos.partIndex >= 0 && pos.partIndex < state.parts.length
          && state.qIndexById[pos.qid] != null) {
        state.currentPartIndex = pos.partIndex;
        state.currentQid = pos.qid;
      }
    } catch (e) {}
  }

  async function ensureSession() {
    if (sessionId && sessionToken) {
      // verify session still exists server-side
      try {
        const res = await sessionFetch('/api/session/' + encodeURIComponent(sessionId));
        if (res.ok) {
          const body = await res.json();
          if (body.meta && body.meta.skill === skill) {
            state.answers = body.answers || {};
            return;
          }
        }
      } catch (e) {}
      sessionId = '';
      sessionToken = '';
    }
    const res = await fetch('/api/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId,
        student: studentName,
        testTakerId: localStorage.getItem('olympiada:testTakerId') || '',
        lang,
        skill,
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      if (res.status === 409) {
        // Module already completed — bounce to dashboard
        window.location.href = 'dashboard.html';
        return;
      }
      throw new Error(body.error || 'session start failed');
    }
    sessionId = body.sessionId;
    sessionToken = body.token || '';
    localStorage.setItem('olympiada:sessionId', sessionId);
    localStorage.setItem('olympiada:sessionToken', sessionToken);
  }

  // ---------- answer persistence ----------
  async function saveAnswer(qid, value) {
    // Update state and UI SYNCHRONOUSLY — the nav counter should reflect
    // the student's input immediately, not after the network round-trip.
    // On slow networks (lab wifi, satellite) the old "await fetch then
    // renderBottomNav" pattern caused a visible lag between the student
    // picking a radio and the "X of Y" counter updating.
    state.answers[qid] = value;
    try {
      localStorage.setItem('olympiada:ans:' + sessionId + ':' + qid, JSON.stringify(value));
    } catch (e) {}
    renderBottomNav();
    // Fire-and-forget the server save. localStorage is the immediate
    // persistence layer; the server JSONL is the durable one (ADR-035).
    // Failures are logged but don't affect the UI.
    try {
      await sessionFetch('/api/session/' + encodeURIComponent(sessionId) + '/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qid, value }),
      });
    } catch (e) {
      console.warn('answer save network failed:', e);
    }
  }

  // ---------- per-part renderers ----------

  function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null) e.textContent = text;
    return e;
  }

  function addBookmark(node, qid) {
    const b = el('span', 'ct-bookmark');
    if (state.bookmarks[qid]) b.classList.add('ct-bookmark--active');
    b.setAttribute('role', 'button');
    b.setAttribute('aria-label', 'Bookmark');
    b.setAttribute('aria-pressed', state.bookmarks[qid] ? 'true' : 'false');
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      state.bookmarks[qid] = !state.bookmarks[qid];
      b.classList.toggle('ct-bookmark--active', state.bookmarks[qid]);
      b.setAttribute('aria-pressed', state.bookmarks[qid] ? 'true' : 'false');
      // Update nav bar bookmark dot
      const navBtn = document.querySelector('.ct-nav-num[data-qid="' + qid + '"]');
      if (navBtn) navBtn.classList.toggle('ct-nav-num--bookmarked', state.bookmarks[qid]);
    });
    node.appendChild(b);
    return node;
  }

  // Build a question prompt element with an authentic Cambridge-style
  // number BADGE (bordered square) on the left + the question text as bold.
  // Replaces the plain "1. Which aspect..." dot-prefix with `[1] Which aspect...`
  // where [1] is rendered as a .ct-q-num-badge. Matches cae/examples/l1.png,
  // l3.png, 5.png, 6.png, 8.png active-question rendering.
  function buildQuestionPrompt(q) {
    const prompt = el('div', 'ct-q-prompt');
    const qNum = extractQuestionNumber(q);
    let promptText = q.prompt || q.id;
    // Strip a leading "N. " or "N " prefix if present so the badge carries
    // the number cleanly without duplicating it in the text.
    if (qNum) {
      const re = new RegExp('^' + qNum + '\\.?\\s+');
      promptText = promptText.replace(re, '');
    }
    if (qNum) {
      const badge = el('span', 'ct-q-num-badge', qNum);
      prompt.appendChild(badge);
    }
    prompt.appendChild(document.createTextNode(promptText));
    addBookmark(prompt, q.id);
    return prompt;
  }

  // Shared: multi-choice radio group (used by many parts)
  function renderMCQuestion(q) {
    const wrap = el('div', 'ct-question');
    wrap.dataset.qid = q.id;
    if (state.currentQid === q.id) wrap.classList.add('ct-question--active');
    wrap.appendChild(buildQuestionPrompt(q));
    const opts = el('div', 'ct-q-options');
    (q.options || []).forEach((opt) => {
      const label = el('label', 'ct-q-option');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'q-' + q.id;
      radio.value = opt.key;
      if (state.answers[q.id] === opt.key) radio.checked = true;
      radio.addEventListener('change', () => {
        saveAnswer(q.id, opt.key);
        state.currentQid = q.id;
        refreshActiveHighlight();
      });
      const keySpan = el('span', 'ct-q-option-key', opt.key);
      const textSpan = el('span', null, opt.text);
      label.appendChild(radio);
      label.appendChild(keySpan);
      label.appendChild(textSpan);
      opts.appendChild(label);
    });
    wrap.appendChild(opts);
    return wrap;
  }

  function renderTrueFalse(q) {
    const wrap = el('div', 'ct-question');
    wrap.dataset.qid = q.id;
    if (state.currentQid === q.id) wrap.classList.add('ct-question--active');
    wrap.appendChild(buildQuestionPrompt(q));
    const opts = el('div', 'ct-q-options');
    // Option set is language-dependent. Goethe C1 (German) uses 2-option
    // Richtig/Falsch — there is no "not given". CAE / IELTS-style uses
    // the 3-option set with human-readable labels. Internal value keys
    // stay ASCII ('true'/'false'/'not-given') so scoring is stable across
    // languages; only the displayed label changes.
    const isDe = state.content && state.content.language === 'de';
    const optionSet = isDe
      ? [{ value: 'true', label: 'Richtig' }, { value: 'false', label: 'Falsch' }]
      : [{ value: 'true', label: 'True' }, { value: 'false', label: 'False' }, { value: 'not-given', label: 'Not Given' }];
    optionSet.forEach(({ value, label: labelText }) => {
      const label = el('label', 'ct-q-option');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'q-' + q.id;
      radio.value = value;
      if (state.answers[q.id] === value) radio.checked = true;
      radio.addEventListener('change', () => { saveAnswer(q.id, value); state.currentQid = q.id; refreshActiveHighlight(); });
      label.appendChild(radio);
      label.appendChild(el('span', null, labelText));
      opts.appendChild(label);
    });
    wrap.appendChild(opts);
    return wrap;
  }

  // Part 1: multiple-choice cloze — passage with inline MC <select>
  // Visual: Cambridge-authentic bordered box with the number prefix inside
  // the left side and the <select> blended into the right side. When no
  // option is selected, the box appears blank. When selected, only the
  // chosen letter (A/B/C/D) is visible.
  function renderPart1(part) {
    const wrap = el('div', 'ct-part');
    wrap.appendChild(renderPassageHeading(part));
    const passage = renderPassageWithInlineGaps(part, (q) => {
      const inline = el('span', 'ct-inline-mc');
      const qNum = extractQuestionNumber(q) || q.id;
      inline.appendChild(el('span', 'ct-inline-mc-num', qNum));
      const select = document.createElement('select');
      select.className = 'ct-inline-mc-select';
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = '';
      select.appendChild(placeholder);
      (q.options || []).forEach((opt) => {
        const o = document.createElement('option');
        o.value = opt.key;
        o.textContent = opt.key + '  ' + opt.text;
        if (state.answers[q.id] === opt.key) o.selected = true;
        select.appendChild(o);
      });
      select.addEventListener('change', () => {
        saveAnswer(q.id, select.value);
        state.currentQid = q.id;
        refreshActiveHighlight();
      });
      select.addEventListener('focus', () => {
        state.currentQid = q.id;
        refreshActiveHighlight();
      });
      inline.appendChild(select);
      return inline;
    });
    wrap.appendChild(passage);
    return wrap;
  }

  // Part 2 / general open-cloze: passage with inline text inputs
  function renderPart2(part) {
    const wrap = el('div', 'ct-part');
    wrap.appendChild(renderPassageHeading(part));
    const passage = renderPassageWithInlineGaps(part, (q) => renderGapInput(q));
    wrap.appendChild(passage);
    return wrap;
  }

  // Part 3: word-formation — 2-col with passage + keyword list
  function renderPart3(part) {
    const grid = el('div', 'ct-two-col ct-two-col--wide-left');
    const left = el('div', 'ct-col');
    left.appendChild(renderPassageHeading(part));
    left.appendChild(renderPassageWithInlineGaps(part, (q) => renderGapInput(q)));
    grid.appendChild(left);

    const right = el('div', 'ct-col');
    const kl = el('div', 'ct-keyword-list');
    kl.appendChild(el('h4', null, isDe ? 'Schlüsselwörter' : 'Keyword List'));
    const ol = document.createElement('ol');
    (part.questions || []).forEach((q) => {
      const li = document.createElement('li');
      li.dataset.kwQid = q.id;
      if (state.currentQid === q.id) li.classList.add('ct-kw-active');
      li.appendChild(el('span', 'ct-kw-num', extractQuestionNumber(q) || q.id));
      li.appendChild(el('span', 'ct-kw-word', q.rootWord || '?'));
      // Click to jump to the matching gap in the passage
      li.addEventListener('click', () => {
        state.currentQid = q.id;
        const gapInput = document.querySelector('[data-qid="' + q.id + '"] input, .ct-gap input[data-qid="' + q.id + '"]');
        const gapEl = document.querySelector('.ct-passage [data-qid-inline="' + q.id + '"]');
        refreshActiveHighlight();
        refreshKeywordListHighlight();
      });
      ol.appendChild(li);
    });
    kl.appendChild(ol);
    right.appendChild(kl);
    grid.appendChild(right);

    const wrap = el('div', 'ct-part');
    wrap.appendChild(grid);
    return wrap;
  }

  // Part 4: key-word transformation — left-aligned, inline input in the leadIn
  // Authentic Cambridge layout: first sentence, bold keyword, then the lead-in
  // sentence with the blank replaced by a bordered input box whose number prefix
  // sits inside the same box (matches cae/examples/4.png exactly).
  function renderPart4(part) {
    const wrap = el('div', 'ct-part');
    // ONE-AT-A-TIME rendering — matches authentic Cambridge CAE Part 4
    // (see cae/examples/4.png): only the currently-selected KWT question
    // is on screen at a time. The other questions are navigated via the
    // numbered buttons in the active bottom-nav segment (25 26 27 28 29 30)
    // or via the ←/→ arrows. This prevents q30 from being pushed below the
    // fixed bottom nav on initial load with real 6-question content, and
    // matches the focused single-question feel of the real exam.
    const questions = part.questions || [];
    if (!questions.length) return wrap;
    const q = questions.find(x => x.id === state.currentQid) || questions[0];

    const block = el('div', 'ct-kwt-block');
    block.dataset.qid = q.id;
    // Always active — it's the only question on screen
    block.classList.add('ct-question--active');

    // First sentence (plain)
    if (q.prompt) {
      block.appendChild(el('div', 'ct-kwt-first', q.prompt));
    }
    // Bold UPPERCASE keyword
    if (q.keyWord) {
      block.appendChild(el('div', 'ct-kwt-keyword', q.keyWord));
    }

    // Lead-in sentence with inline input replacing the blank. Accept several
    // blank patterns seen in content (______, _______, __________, etc.).
    const leadRow = el('div', 'ct-kwt-lead-row');
    const leadText = q.leadIn || '';
    const blankMatch = leadText.match(/_{3,}/);
    const qNum = extractQuestionNumber(q) || q.id;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'ct-kwt-input';
    examInput(input, q.id);
    input.spellcheck = false;
    input.maxLength = 150;
    input.value = state.answers[q.id] || '';
    input.dataset.qnum = qNum;
    input.addEventListener('input', () => {
      saveAnswer(q.id, input.value);
      state.currentQid = q.id;
      refreshActiveHighlight();
    });
    input.addEventListener('focus', () => {
      state.currentQid = q.id;
      refreshActiveHighlight();
    });

    // Build the inline input wrapper — number prefix inside the same box
    const gap = el('span', 'ct-kwt-gap');
    gap.appendChild(el('span', 'ct-kwt-gap-num', qNum));
    gap.appendChild(input);

    if (blankMatch) {
      const before = leadText.slice(0, blankMatch.index);
      const after = leadText.slice(blankMatch.index + blankMatch[0].length);
      if (before) leadRow.appendChild(document.createTextNode(before));
      leadRow.appendChild(gap);
      if (after) leadRow.appendChild(document.createTextNode(after));
    } else {
      // No blank token in leadIn — render text then input after it
      if (leadText) leadRow.appendChild(document.createTextNode(leadText + ' '));
      leadRow.appendChild(gap);
    }

    // Bookmark icon on the far right of the lead row
    const bookmarkCell = el('span', 'ct-kwt-bookmark');
    addBookmark(bookmarkCell, q.id);
    leadRow.appendChild(bookmarkCell);

    block.appendChild(leadRow);
    wrap.appendChild(block);
    return wrap;
  }

  // Part 5, Part 8 generic multi-choice reading — 2-col passage + questions
  function renderTwoColReading(part) {
    const grid = el('div', 'ct-two-col');
    const left = el('div', 'ct-col');
    left.appendChild(renderPassageHeading(part));
    const passageEl = el('div', 'ct-passage');
    // Render passage with bold paragraph letters (A, B, C, D etc.)
    const passageText = passageBody(part);
    const paraPattern = /^([A-H])\s*(—|–|-)/gm;
    let cursor = 0, paraMatch;
    let hasParagraphLetters = false;
    while ((paraMatch = paraPattern.exec(passageText)) !== null) {
      hasParagraphLetters = true;
      const before = passageText.slice(cursor, paraMatch.index);
      if (before) passageEl.appendChild(document.createTextNode(before));
      const bold = document.createElement('strong');
      bold.textContent = paraMatch[0];
      passageEl.appendChild(bold);
      cursor = paraPattern.lastIndex;
    }
    if (hasParagraphLetters) {
      const rest = passageText.slice(cursor);
      if (rest) passageEl.appendChild(document.createTextNode(rest));
    } else {
      passageEl.textContent = passageText;
    }
    left.appendChild(passageEl);
    grid.appendChild(left);

    const right = el('div', 'ct-col');
    const list = el('div', 'ct-question-list');
    (part.questions || []).forEach((q) => {
      if (q.type === 'matching') {
        list.appendChild(renderMatchingQuestion(q, part.matchingOptions || []));
      } else {
        list.appendChild(renderMCQuestion(q));
      }
    });
    right.appendChild(list);
    grid.appendChild(right);

    const wrap = el('div', 'ct-part');
    wrap.appendChild(grid);
    return wrap;
  }

  function renderMatchingQuestion(q, options) {
    const wrap = el('div', 'ct-question');
    wrap.dataset.qid = q.id;
    if (state.currentQid === q.id) wrap.classList.add('ct-question--active');
    wrap.appendChild(buildQuestionPrompt(q));
    const opts = el('div', 'ct-q-options');
    options.forEach((opt) => {
      const label = el('label', 'ct-q-option');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'q-' + q.id;
      radio.value = opt.key;
      if (state.answers[q.id] === opt.key) radio.checked = true;
      radio.addEventListener('change', () => { saveAnswer(q.id, opt.key); state.currentQid = q.id; refreshActiveHighlight(); });
      label.appendChild(radio);
      label.appendChild(el('span', 'ct-q-option-key', opt.key));
      label.appendChild(el('span', null, opt.text));
      opts.appendChild(label);
    });
    wrap.appendChild(opts);
    return wrap;
  }

  // Part 7: gapped text — passage with [[SLOT:qN]] markers + paragraph bank
  function renderPart7(part) {
    const grid = el('div', 'ct-two-col');
    const left = el('div', 'ct-col');
    left.appendChild(renderPassageHeading(part));

    const passage = el('div', 'ct-passage');
    const text = passageBody(part);
    const pattern = /\[\[SLOT:([^\]]+)\]\]/g;
    let lastIndex = 0, match;
    while ((match = pattern.exec(text)) !== null) {
      const before = text.slice(lastIndex, match.index);
      if (before) passage.appendChild(document.createTextNode(before));
      const qid = match[1];
      const q = (part.questions || []).find(x => x.id === qid);
      const slot = el('div', 'ct-slot');
      slot.dataset.qid = qid;
      // Show just the question number as the slot marker (authentic Cambridge
      // look in cae/examples/7.png — no helper text like "click here, then
      // click a paragraph". The click affordance is implicit via hover state.)
      slot.appendChild(el('span', 'ct-slot-number', extractQuestionNumber(q) || qid));
      const assigned = state.answers[qid];
      if (assigned) {
        const paraText = (part.paragraphBank || []).find(p => p.key === assigned);
        if (paraText) {
          slot.classList.add('ct-slot--filled');
          slot.appendChild(el('span', 'ct-para-key', assigned));
          slot.appendChild(document.createTextNode(paraText.text));
        }
      }
      if (state.activeSlotQid === qid) slot.classList.add('ct-slot--active');
      slot.addEventListener('click', () => handleSlotClick(qid));
      passage.appendChild(slot);
      lastIndex = pattern.lastIndex;
    }
    const rest = text.slice(lastIndex);
    if (rest) passage.appendChild(document.createTextNode(rest));
    left.appendChild(passage);
    grid.appendChild(left);

    const right = el('div', 'ct-col');
    const bank = el('div', 'ct-paragraph-bank');
    bank.appendChild(el('h4', null, isDe ? 'Absätze' : 'Paragraphs'));
    const part7Qids = new Set((part.questions || []).map(q => q.id));
    (part.paragraphBank || []).forEach((p) => {
      const card = el('div', 'ct-para-card');
      // Only check answers belonging to THIS part's questions — avoids
      // cross-part contamination where Part 8's "A"/"B" answers block
      // Part 7's paragraph cards with matching keys.
      const usedBy = Object.entries(state.answers).find(([qid, v]) => part7Qids.has(qid) && v === p.key);
      if (usedBy) card.classList.add('ct-para-card--used');
      card.appendChild(el('span', 'ct-para-key', p.key));
      card.appendChild(document.createTextNode(p.text));
      card.addEventListener('click', () => handleParagraphClick(p.key));
      bank.appendChild(card);
    });
    right.appendChild(bank);
    grid.appendChild(right);

    const wrap = el('div', 'ct-part');
    wrap.appendChild(grid);
    return wrap;
  }

  function handleSlotClick(qid) {
    // If slot is already filled, clear it (release the paragraph)
    if (state.answers[qid]) {
      saveAnswer(qid, '');
      state.activeSlotQid = null;
      renderCurrentPart(true);
      return;
    }
    state.activeSlotQid = qid;
    renderCurrentPart(true);
  }
  function handleParagraphClick(paraKey) {
    if (!state.activeSlotQid) return;
    // If this paragraph is already used by another slot in the SAME part,
    // don't let it be reused. Scoped to current part's questions to avoid
    // false positives from other parts (e.g. Part 8 answers sharing keys).
    const currentPart = state.parts[state.currentPartIndex].part;
    const partQids = new Set((currentPart.questions || []).map(q => q.id));
    const usedBy = Object.entries(state.answers).find(([qid, v]) => partQids.has(qid) && v === paraKey);
    if (usedBy && usedBy[0] !== state.activeSlotQid) return;
    const target = state.activeSlotQid;
    state.activeSlotQid = null;
    saveAnswer(target, paraKey);
    renderCurrentPart(true);
  }

  // Listening part renderer (handles taskGroups + pre-play modal)
  function renderListeningPart(part) {
    const wrap = el('div', 'ct-part');
    wrap.dataset.partId = part.id;

    // Pre-play gate — shown ONLY ONCE for the entire listening module.
    // After the student clicks "Play" on the first part, all subsequent
    // parts auto-play their audio without modal interruption. This covers
    // both CAE (single file, 4 parts) and Goethe (4 separate files, 4 Teile).
    const audioSrc = part.audio && part.audio.src;
    const anyAudioPlayed = state.playedAudioSrcs && state.playedAudioSrcs.size > 0;
    if (audioSrc && !anyAudioPlayed) {
      const modal = buildPrePlayModal(part);
      wrap.appendChild(modal);
    } else if (audioSrc && !state.playedAudioSrcs.has(audioSrc)) {
      // Auto-start this part's audio (no modal) — student already accepted
      // the listening gate on the first part. Only auto-start if no other
      // audio is currently playing (avoid overlapping playback).
      const isPlaying = state.audioElement && !state.audioElement.paused && !state.audioElement.ended;
      if (!isPlaying) {
        setTimeout(() => startAudio(part), 100);
      }
    }

    if (Array.isArray(part.taskGroups) && part.taskGroups.length) {
      // Compact two-column layout per Cambridge reference l5.png:
      //   Left = speaker rows with select inputs + question number
      //   Right = reference options panel (A-H list, read-only)
      part.taskGroups.forEach((tg) => {
        const tgEl = el('div', 'ct-task-group');
        tgEl.appendChild(el('div', 'ct-task-group-instructions', tg.instructions || ''));

        const layout = el('div', 'ct-task-layout');

        // Left column — speaker rows
        const speakers = el('div', 'ct-task-speakers');
        (tg.questions || []).forEach((q) => {
          const row = el('div', 'ct-task-speaker');
          row.dataset.qid = q.id;
          if (state.currentQid === q.id) row.classList.add('ct-task-speaker--active');

          const label = el('span', 'ct-task-speaker-label', q.prompt || q.id);
          row.appendChild(label);

          const select = document.createElement('select');
          select.className = 'ct-task-speaker-select';
          const placeholder = document.createElement('option');
          placeholder.value = '';
          placeholder.textContent = '—';
          select.appendChild(placeholder);
          (tg.options || []).forEach((opt) => {
            const o = document.createElement('option');
            o.value = opt.key;
            o.textContent = opt.key + '  ' + opt.text;
            if (state.answers[q.id] === opt.key) o.selected = true;
            select.appendChild(o);
          });
          select.addEventListener('change', () => {
            saveAnswer(q.id, select.value);
            state.currentQid = q.id;
            // Update active row highlight in place (avoid full re-render)
            document.querySelectorAll('.ct-task-speaker--active').forEach(n => n.classList.remove('ct-task-speaker--active'));
            row.classList.add('ct-task-speaker--active');
          });
          select.addEventListener('focus', () => {
            state.currentQid = q.id;
            document.querySelectorAll('.ct-task-speaker--active').forEach(n => n.classList.remove('ct-task-speaker--active'));
            row.classList.add('ct-task-speaker--active');
          });
          row.appendChild(select);

          const num = el('span', 'ct-task-speaker-num', extractQuestionNumber(q) || '');
          row.appendChild(num);

          speakers.appendChild(row);
        });
        layout.appendChild(speakers);

        // Right column — options reference panel (read-only visual aid)
        const panel = el('div', 'ct-task-options-panel');
        const olist = document.createElement('ol');
        olist.className = 'ct-task-options-list';
        (tg.options || []).forEach((opt) => {
          const li = document.createElement('li');
          li.appendChild(el('span', 'ct-task-opt-key', opt.key));
          li.appendChild(el('span', null, opt.text));
          olist.appendChild(li);
        });
        panel.appendChild(olist);
        layout.appendChild(panel);

        tgEl.appendChild(layout);
        wrap.appendChild(tgEl);
      });
    } else {
      const list = el('div', 'ct-question-list');
      (part.questions || []).forEach((q) => {
        if (q.type === 'matching') list.appendChild(renderMatchingQuestion(q, part.matchingOptions || []));
        else if (q.type === 'true-false') list.appendChild(renderTrueFalse(q));
        else if (q.type === 'multiple-choice') list.appendChild(renderMCQuestion(q));
        else if (q.type === 'sentence-completion' || q.type === 'gap-fill' || q.type === 'open-cloze') {
          // Authentic Cambridge Listening Part 2 (cae/examples/l2.png): the
          // sentence has an INLINE bordered input box where the blank goes,
          // with the question number prefix INSIDE the same box. Parse the
          // prompt for `______` (3+ underscores) and render the input in
          // place of the underscores instead of rendering the raw text.
          const block = el('div', 'ct-question ct-listen-sc-row');
          block.dataset.qid = q.id;
          if (state.currentQid === q.id) block.classList.add('ct-question--active');
          const promptText = q.prompt || q.id;
          const blankMatch = promptText.match(/_{3,}/);
          const qNum = extractQuestionNumber(q) || q.id;

          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'ct-kwt-input';
          examInput(input, q.id);
          input.spellcheck = false;
          input.maxLength = 100;
          input.value = state.answers[q.id] || '';
          input.addEventListener('input', () => { saveAnswer(q.id, input.value); state.currentQid = q.id; refreshActiveHighlight(); });
          input.addEventListener('focus', () => { state.currentQid = q.id; refreshActiveHighlight(); });

          const gap = el('span', 'ct-kwt-gap');
          gap.appendChild(el('span', 'ct-kwt-gap-num', qNum));
          gap.appendChild(input);

          const row = el('div', 'ct-kwt-lead-row');
          if (blankMatch) {
            const before = promptText.slice(0, blankMatch.index);
            const after = promptText.slice(blankMatch.index + blankMatch[0].length);
            if (before) row.appendChild(document.createTextNode(before));
            row.appendChild(gap);
            if (after) row.appendChild(document.createTextNode(after));
          } else {
            if (promptText) row.appendChild(document.createTextNode(promptText + ' '));
            row.appendChild(gap);
          }
          const bookmarkCell = el('span', 'ct-kwt-bookmark');
          addBookmark(bookmarkCell, q.id);
          row.appendChild(bookmarkCell);

          block.appendChild(row);
          list.appendChild(block);
        } else {
          list.appendChild(renderMCQuestion(q));
        }
      });
      wrap.appendChild(list);
    }

    return wrap;
  }

  function buildPrePlayModal(part) {
    const overlay = el('div', 'ct-preplay-overlay');
    const card = el('div', 'ct-preplay-card');
    const icon = el('div', 'ct-preplay-icon');
    icon.setAttribute('aria-hidden', 'true');
    card.appendChild(icon);
    // Localized copy — German C1 students get the full German instructions
    // so the listening gate doesn't break language immersion. Real Goethe
    // Hören uses German strings throughout the interface.
    const isDe = state.content && state.content.language === 'de';
    const preplayText = isDe
      ? 'Sie werden während dieses Tests eine Audiodatei hören. Sie können die Aufnahme nicht anhalten oder zurückspulen, während Sie die Fragen beantworten. Klicken Sie auf „Wiedergabe", um fortzufahren.'
      : 'You will be listening to an audio clip during this test. You will not be permitted to pause or rewind the audio while answering the questions. To continue, click Play.';
    card.appendChild(el('p', 'ct-preplay-text', preplayText));
    const btn = document.createElement('button');
    btn.className = 'ct-preplay-btn';
    btn.textContent = isDe ? 'Wiedergabe' : 'Play';
    btn.addEventListener('click', () => startAudio(part));
    card.appendChild(btn);
    overlay.appendChild(card);
    // Auto-focus the Play button so a keyboard user can hit Enter to
    // start audio immediately. setTimeout(0) defers until after the
    // caller has appended the overlay to the DOM — you can't focus a
    // detached element.
    setTimeout(() => {
      try { btn.focus(); } catch (e) { /* focus() can throw if removed */ }
    }, 0);
    // Focus trap: without this, Tab escapes to inputs behind the backdrop
    // and the student could pre-type answers before clicking Play. Strict
    // listening requires the modal to own focus entirely until dismissed.
    // No Escape binding — the student MUST click Play to proceed.
    trapFocus(overlay, null);
    return overlay;
  }

  // Start audio for a part (strict: auto-play, no controls). Flips the
  // listeningGate permanently so subsequent listening parts don't re-prompt.
  function startAudio(part) {
    if (state.audioElement) {
      try { state.audioElement.pause(); } catch (e) {}
      state.audioElement = null;
    }
    // Clear any pending "Audio finished" hide timer from a previous part —
    // we're starting fresh, so the stale timer shouldn't flicker the status
    // label back to hidden mid-playback.
    if (state.audioFinishedHideTimer) {
      clearTimeout(state.audioFinishedHideTimer);
      state.audioFinishedHideTimer = null;
    }
    state.listeningGate = 'opened'; // legacy compat
    if (part.audio && part.audio.src) {
      if (!state.playedAudioSrcs) state.playedAudioSrcs = new Set();
      state.playedAudioSrcs.add(part.audio.src);
    }
    state.audioState[part.id] = 'playing';
    // Log to server — used for refresh-sneakiness integrity flag
    sessionFetch('/api/session/' + encodeURIComponent(sessionId) + '/audio-play', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partId: part.id }),
    }).catch(() => {});
    const src = part.audio.src || '';
    const filename = src.split('/').pop();
    const audio = new Audio('/api/audio/' + encodeURIComponent(lang) + '/' + encodeURIComponent(filename));
    audio.preload = 'auto';
    state.audioElement = audio;

    // Guard flag: audio.play() rejection AND the element's 'error' event can
    // both fire for the same failure. Without this guard the user sees TWO
    // error modals stacked. handleFailure() is idempotent per-audio.
    let failureHandled = false;
    const handleFailure = (reason) => {
      if (failureHandled) return;
      failureHandled = true;
      if (stallTimer) clearTimeout(stallTimer);
      if (state.audioFinishedHideTimer) {
        clearTimeout(state.audioFinishedHideTimer);
        state.audioFinishedHideTimer = null;
      }
      state.audioState[part.id] = 'finished';
      const statusEl = document.getElementById('ct-audio-status');
      statusEl.classList.remove('ct-audio-status--visible');
      // Restore the default "Audio is playing" label so next successful
      // play doesn't render a stale "Audio finished" before the playing
      // handler fires.
      const label = statusEl.querySelector('span:last-child');
      if (label) label.textContent = t.audioPlaying;
      showErrorModal(reason);
      renderCurrentPart();
      renderBottomNav();
    };

    let stallTimer = null;
    const startStallTimer = () => {
      if (stallTimer) clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        console.warn('[audio] stall timeout — forcing finished');
        if (failureHandled) return;
        failureHandled = true;
        state.audioState[part.id] = 'finished';
        document.getElementById('ct-audio-status').classList.remove('ct-audio-status--visible');
        renderCurrentPart();
        renderBottomNav();
      }, 30000);
    };

    audio.addEventListener('playing', () => {
      const statusEl = document.getElementById('ct-audio-status');
      // Reset label in case a previous part left it in the "Audio finished"
      // state (the hide-timer may have been cancelled before it could restore).
      const label = statusEl.querySelector('span:last-child');
      if (label) label.textContent = t.audioPlaying;
      statusEl.classList.add('ct-audio-status--visible');
      startStallTimer();
    });
    audio.addEventListener('ended', () => {
      if (stallTimer) clearTimeout(stallTimer);
      // Mark ALL parts that share this audio src as finished, not just the
      // one that started playback. Covers both single-file CAE listening
      // (4 parts, 1 file) and multi-file Goethe Hören (4 parts, 4 files).
      const endedSrc = part.audio && part.audio.src;
      state.parts.forEach((pe) => {
        if (pe.part.audio && pe.part.audio.src === endedSrc) {
          state.audioState[pe.part.id] = 'finished';
        }
      });
      state.audioState[part.id] = 'finished';
      // Brief "Audio finished" confirmation instead of silent hide.
      // The aria-live="polite" region announces the text change to screen
      // readers, closing the loop on the earlier "Audio is playing" message
      // (a student with a screen reader otherwise has no auditory cue that
      // playback ended vs. stalled vs. silent mid-clip). Keep the label
      // visible for ~2.5s so sighted students get the confirmation too,
      // then collapse back. See round 22d.
      const statusEl = document.getElementById('ct-audio-status');
      const label = statusEl.querySelector('span:last-child');
      if (label) label.textContent = t.audioFinished;
      if (state.audioFinishedHideTimer) clearTimeout(state.audioFinishedHideTimer);
      state.audioFinishedHideTimer = setTimeout(() => {
        statusEl.classList.remove('ct-audio-status--visible');
        if (label) label.textContent = t.audioPlaying; // restore for next play
        state.audioFinishedHideTimer = null;
      }, 2500);
      renderCurrentPart();
      renderBottomNav();

      // Auto-chain: if the student's current part has its own unplayed audio
      // (German Goethe with separate files per Teil), start it automatically
      // so the listening flows without interruption.
      const currentPart = state.parts[state.currentPartIndex] && state.parts[state.currentPartIndex].part;
      if (currentPart && currentPart.audio && currentPart.audio.src &&
          !state.playedAudioSrcs.has(currentPart.audio.src)) {
        setTimeout(() => startAudio(currentPart), 500);
      }
    });
    audio.addEventListener('error', () => {
      handleFailure(t.audioUnavailable);
    });
    audio.addEventListener('stalled', startStallTimer);
    audio.addEventListener('waiting', startStallTimer);
    audio.play().catch((e) => {
      console.error('[audio] play failed', e);
      // Trim any trailing period so we don't end up with ".."
      const msg = String(e.message || 'unknown error').replace(/\.+\s*$/, '');
      handleFailure(t.audioFailed(msg));
    });

    renderCurrentPart(); // remove overlay
    renderBottomNav();
  }

  function showErrorModal(text) {
    const overlay = el('div', 'ct-error-modal');
    const card = el('div', 'ct-error-card');
    card.appendChild(el('h3', null, t.problemTitle));
    card.appendChild(el('p', null, text));
    const btn = document.createElement('button');
    btn.textContent = t.ok;
    btn.addEventListener('click', () => overlay.remove());
    card.appendChild(btn);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    trapFocus(overlay, () => overlay.remove());
    setTimeout(() => btn.focus(), 30);
  }

  // Keyboard focus trap for modal overlays. Without this, pressing Tab
  // inside the pre-play modal escapes to inputs BEHIND the dimmed
  // backdrop — which breaks strict-listening (student could pre-type
  // answers before clicking Play) AND traps keyboard users outside
  // the modal they're supposed to interact with.
  //
  // Cycles Tab / Shift+Tab between the modal's own focusable elements
  // (buttons, inputs, selects, etc.). Also wires Escape → onEscape
  // callback so keyboard users can dismiss without reaching for a
  // mouse. Returns the keydown handler so callers don't need to
  // clean it up — the overlay.remove() drops the listener with the
  // element.
  function trapFocus(overlay, onEscape) {
    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    function getFocusables() {
      return Array.from(overlay.querySelectorAll(focusableSelector))
        .filter(el => !el.disabled && el.offsetParent !== null);
    }
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && typeof onEscape === 'function') {
        e.preventDefault();
        onEscape();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusables = getFocusables();
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      // If focus somehow escaped the overlay, yank it back to the first
      // focusable inside. Covers the edge case where focus landed on
      // <body> or on an element outside the modal.
      if (!overlay.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
        return;
      }
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  // Styled confirm dialog that matches the rest of the test chrome — replaces
  // the native window.confirm() on submit so the visual language stays
  // consistent with the pre-play modal and error modal.
  function showConfirmModal(title, body, yesLabel, noLabel, onYes) {
    const overlay = el('div', 'ct-confirm-modal');
    const card = el('div', 'ct-confirm-card');
    card.appendChild(el('h3', null, title));
    card.appendChild(el('p', null, body));
    const actions = el('div', 'ct-confirm-actions');
    const noBtn = document.createElement('button');
    noBtn.className = 'ct-confirm-btn ct-confirm-btn--ghost';
    noBtn.textContent = noLabel;
    noBtn.addEventListener('click', () => overlay.remove());
    const yesBtn = document.createElement('button');
    yesBtn.className = 'ct-confirm-btn ct-confirm-btn--primary';
    yesBtn.textContent = yesLabel;
    yesBtn.addEventListener('click', () => {
      overlay.remove();
      onYes();
    });
    actions.appendChild(noBtn);
    actions.appendChild(yesBtn);
    card.appendChild(actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    // Focus the primary action so Enter submits immediately for keyboard users
    setTimeout(() => yesBtn.focus(), 30);
    // Focus trap + Escape shortcut → cancel (same as clicking "No").
    // Tab cycles between noBtn and yesBtn; can't escape to elements
    // behind the backdrop.
    trapFocus(overlay, () => overlay.remove());
  }

  // ---------- passage helpers ----------
  function shouldHoistHeading(content) {
    const firstLine = content.split('\n')[0];
    return !!(
      firstLine &&
      content.split('\n').length > 1 &&
      firstLine.length < 80 &&
      !firstLine.includes('[[GAP') &&
      !firstLine.includes('[[SLOT')
    );
  }
  function renderPassageHeading(part) {
    // If the passage starts with a title line, hoist it as <h3>
    const content = (part.passage && part.passage.content) || '';
    if (shouldHoistHeading(content)) {
      return el('h3', null, content.split('\n')[0]);
    }
    return document.createDocumentFragment();
  }
  // Returns the passage content with the hoisted heading removed, so callers
  // can render the body without duplicating the first line.
  function passageBody(part) {
    const content = (part.passage && part.passage.content) || '';
    if (!shouldHoistHeading(content)) return content;
    const firstLine = content.split('\n')[0];
    // +1 for the newline; also trim leading blank lines so the body starts clean.
    return content.slice(firstLine.length + 1).replace(/^\n+/, '');
  }
  function renderPassageWithInlineGaps(part, buildInlineEl) {
    const passage = el('div', 'ct-passage');
    const pattern = /\[\[GAP:([^\]]+)\]\]/g;
    let lastIndex = 0, match;
    let started = false;
    const body = passageBody(part);
    while ((match = pattern.exec(body)) !== null) {
      const before = body.slice(lastIndex, match.index);
      if (before) passage.appendChild(document.createTextNode(before));
      const qid = match[1];
      const q = findQuestionInPart(part, qid);
      if (q) passage.appendChild(buildInlineEl(q));
      lastIndex = pattern.lastIndex;
      started = true;
    }
    const rest = body.slice(lastIndex);
    if (rest) passage.appendChild(document.createTextNode(rest));
    // If no inline gaps were found, also render questions below the passage
    if (!started) {
      (part.questions || []).forEach((q) => {
        const wrap = el('div', 'ct-question');
        wrap.dataset.qid = q.id;
        wrap.appendChild(el('div', 'ct-q-prompt', q.prompt || q.id));
        wrap.appendChild(buildInlineEl(q));
        passage.appendChild(wrap);
      });
    }
    return passage;
  }
  function findQuestionInPart(part, qid) {
    if (Array.isArray(part.questions)) {
      const found = part.questions.find(q => q.id === qid);
      if (found) return found;
    }
    if (Array.isArray(part.taskGroups)) {
      for (const tg of part.taskGroups) {
        const found = (tg.questions || []).find(q => q.id === qid);
        if (found) return found;
      }
    }
    return null;
  }
  function renderGapInput(q) {
    const gap = el('span', 'ct-gap');
    gap.appendChild(el('span', 'ct-gap-num', (q.prompt || q.id)));
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'ct-gap-input';
    examInput(input, q.id);
    input.spellcheck = false;
    // Single-word gaps (open-cloze, word-formation) — 50 chars is a
    // generous single-word allowance and prevents accidental paste-bombs.
    input.maxLength = 50;
    input.value = state.answers[q.id] || '';
    input.addEventListener('input', () => {
      saveAnswer(q.id, input.value);
      state.currentQid = q.id;
      refreshActiveHighlight();
    });
    gap.appendChild(input);
    return gap;
  }

  // ---------- part dispatcher ----------
  function renderCurrentPart(skipScroll) {
    const partEntry = state.parts[state.currentPartIndex];
    if (!partEntry) return;
    const part = partEntry.part;
    const main = document.getElementById('ct-main');
    main.innerHTML = '';

    // Banner (Questions N-M + instructions). Localized header word comes
    // from the content's `language` field — German C1 students should
    // see "Fragen 1–30", not "Questions 1–30". Everything else in the
    // banner body (instructions) is already localized in the content JSON.
    const firstQ = partEntry.flatQuestions[0];
    const lastQ = partEntry.flatQuestions[partEntry.flatQuestions.length - 1];
    const firstNum = extractQuestionNumber(firstQ && firstQ.question);
    const lastNum = extractQuestionNumber(lastQ && lastQ.question);
    const questionsLabel = (state.content && state.content.language === 'de') ? 'Fragen' : 'Questions';
    const title = firstNum && lastNum ? questionsLabel + ' ' + firstNum + '–' + lastNum : part.title;
    document.getElementById('ct-banner-title').textContent = title;
    document.getElementById('ct-banner-body').textContent = part.instructions || '';

    // Content-driven dispatch — routes based on actual question types and
    // passage markers rather than part.id, so German Goethe parts (which
    // reuse the same part1–part4 IDs as English CAE but have different
    // question formats) render with the correct UI.
    const passageContent = (part.passage && part.passage.content) || '';
    const hasGaps = /\[\[GAP:/.test(passageContent);
    const hasSlots = /\[\[SLOT:/.test(passageContent);
    const partQuestions = part.questions || [];
    const firstQType = partQuestions[0] && partQuestions[0].type;
    const hasRootWords = partQuestions.some(q => q.rootWord);
    const hasParagraphBank = Array.isArray(part.paragraphBank) && part.paragraphBank.length > 0;

    let rendered;
    if (part.audio) {
      rendered = renderListeningPart(part);
    } else if (hasSlots && hasParagraphBank) {
      // Gapped text with paragraph bank (CAE Part 7, Goethe Teil 3)
      rendered = renderPart7(part);
    } else if (hasGaps && firstQType === 'multiple-choice') {
      // MC cloze with inline selects (CAE Part 1, Goethe Teil 1)
      rendered = renderPart1(part);
    } else if (hasGaps && hasRootWords) {
      // Word-formation with keyword list (CAE Part 3)
      rendered = renderPart3(part);
    } else if (hasGaps) {
      // Open-cloze with inline text inputs (CAE Part 2)
      rendered = renderPart2(part);
    } else if (partQuestions.some(q => q.keyWord && q.leadIn)) {
      // Key-word transformation, one-at-a-time (CAE Part 4)
      rendered = renderPart4(part);
    } else {
      // MC, matching, true-false, etc. — 2-col reading (CAE Parts 5/6/8,
      // Goethe Teil 2 MC, Goethe Teil 4 matching)
      rendered = renderTwoColReading(part);
    }
    main.appendChild(rendered);
    refreshActiveHighlight();
    if (!skipScroll) window.scrollTo({ top: 0 });
  }

  function extractQuestionNumber(q) {
    if (!q) return null;
    // Prefer the id (which is canonical like "q25") over the prompt text
    // (which can be a full sentence with no digits, e.g., Part 4 KWT).
    const fromId = String(q.id || '').match(/\d+/);
    if (fromId) return fromId[0];
    const fromPrompt = String(q.prompt || '').match(/\d+/);
    return fromPrompt ? fromPrompt[0] : null;
  }

  function refreshActiveHighlight() {
    document.querySelectorAll('.ct-question--active').forEach(e => e.classList.remove('ct-question--active'));
    if (state.currentQid) {
      const node = document.querySelector('[data-qid="' + state.currentQid + '"]');
      if (node) node.classList.add('ct-question--active');
    }
    refreshKeywordListHighlight();
  }

  // Part 3 (word formation) keyword list follows the active question — when
  // the student tabs into a gap input or clicks a keyword row, the matching
  // keyword row in the right column gets a pale teal highlight. Matches
  // cae/examples/3.png where the current question's row is highlighted.
  function refreshKeywordListHighlight() {
    document.querySelectorAll('.ct-keyword-list .ct-kw-active').forEach(e => e.classList.remove('ct-kw-active'));
    if (!state.currentQid) return;
    const row = document.querySelector('.ct-keyword-list [data-kw-qid="' + state.currentQid + '"]');
    if (row) row.classList.add('ct-kw-active');
  }

  // ---------- bottom navigator ----------
  function countAnsweredInPart(partEntry) {
    return partEntry.flatQuestions.filter(fq => {
      const v = state.answers[fq.qid];
      return v != null && v !== '' && !(Array.isArray(v) && v.length === 0);
    }).length;
  }

  function renderBottomNav() {
    const host = document.getElementById('ct-nav-parts');
    host.innerHTML = '';
    state.parts.forEach((pe, i) => {
      const isActive = i === state.currentPartIndex;
      // Inactive part segments are <button> elements so keyboard users can
      // Tab to them and Enter/Space to jump directly to that part. The
      // active segment is a <div> because it contains its own nested
      // <button> elements (question numbers) — nesting buttons is invalid.
      const seg = document.createElement(isActive ? 'div' : 'button');
      if (!isActive) seg.type = 'button';
      seg.className = 'ct-nav-part';
      seg.dataset.partIndex = String(i);
      if (isActive) seg.classList.add('ct-nav-part--active');
      const label = el('span', 'ct-nav-part-label', shortPartLabel(pe.part));
      seg.appendChild(label);
      if (isActive) {
        const nums = el('span', 'ct-nav-part-numbers');
        pe.flatQuestions.forEach((fq) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'ct-nav-num';
          btn.textContent = extractQuestionNumber(fq.question) || fq.qid;
          btn.dataset.qid = fq.qid;
          const answered = state.answers[fq.qid];
          if (answered != null && answered !== '') btn.classList.add('ct-nav-num--answered');
          if (state.bookmarks[fq.qid]) btn.classList.add('ct-nav-num--bookmarked');
          if (fq.qid === state.currentQid) btn.classList.add('ct-nav-num--active');
          btn.addEventListener('click', () => {
            state.currentQid = fq.qid;
            goToPart(i);
            scrollToQuestion(fq.qid);
          });
          nums.appendChild(btn);
        });
        seg.appendChild(nums);
      } else {
        const answered = countAnsweredInPart(pe);
        const total = pe.flatQuestions.length;
        seg.appendChild(el('span', 'ct-nav-part-count', answered + (isDe ? ' von ' : ' of ') + total));
        seg.addEventListener('click', () => {
          goToPart(i);
        });
      }
      host.appendChild(seg);
    });

    // Arrow enabled state
    document.getElementById('ct-prev').disabled = state.currentPartIndex === 0 && isCurrentFirstQuestion();
    const advanceLocked = isCurrentListeningAwaitingAudio();
    document.getElementById('ct-next').disabled = state.currentPartIndex === state.parts.length - 1 && isCurrentLastQuestion() || advanceLocked;
    document.getElementById('ct-finish').disabled = advanceLocked || state.submitting;

    // Ensure the active part is visible in the horizontally-scrollable nav.
    // At narrow viewports (after resize or at zoom), the active part can
    // end up clipped outside .ct-nav-parts's visible area. scrollIntoView
    // on its parent scroll container brings it back in view.
    const activeSeg = host.querySelector('.ct-nav-part--active');
    if (activeSeg && typeof activeSeg.scrollIntoView === 'function') {
      activeSeg.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'auto' });
    }

    // Persist position on every nav render — single choke point for every
    // position change (goToPart, next/prev, direct nav click, answer change).
    savePosition();
  }

  function shortPartLabel(part) {
    const t = part.title || part.id || '';
    const m = t.match(/Part\s+\w+|Teil\s+\w+/i);
    return m ? m[0] : (part.id || '');
  }

  function isCurrentFirstQuestion() {
    if (!state.currentQid) return true;
    return state.qIndexById[state.currentQid] === 0;
  }
  function isCurrentLastQuestion() {
    if (!state.currentQid) return true;
    return state.qIndexById[state.currentQid] === state.flatQuestions.length - 1;
  }
  function isCurrentListeningAwaitingAudio() {
    const partEntry = state.parts[state.currentPartIndex];
    if (!partEntry) return false;
    if (!partEntry.part.audio) return false;
    // Check if this audio FILE has ever been played (not per-part state).
    // A single CAE listening file covers all 4 parts — once Part 1 starts
    // the audio, Parts 2-4 share the same src and are unlocked.
    const src = partEntry.part.audio.src;
    if (src && state.playedAudioSrcs && state.playedAudioSrcs.has(src)) return false;
    return true;
  }

  function goToPart(i) {
    if (i < 0 || i >= state.parts.length) return;
    if (i !== state.currentPartIndex) {
      // Audio keeps playing across parts — a real CAE/Goethe listening exam
      // is a single continuous recording covering all parts. Students can
      // freely navigate between parts while the audio plays. We only destroy
      // the audio element when the audio itself ends (via the 'ended' event).
      // No pause, no destroy, no state mutation on part switch.
      state.currentPartIndex = i;
      const firstQid = state.parts[i].flatQuestions[0] && state.parts[i].flatQuestions[0].qid;
      state.currentQid = firstQid || null;
    }
    renderCurrentPart();
    renderBottomNav();
  }

  function scrollToQuestion(qid) {
    setTimeout(() => {
      const node = document.querySelector('[data-qid="' + qid + '"]');
      if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }

  // Parts that render one question at a time — navigating between questions
  // within these parts needs a full re-render (not just a scroll), because
  // only the current question's block exists in the DOM. KWT (key-word
  // transformation) parts are the only current one-at-a-time parts; the
  // others all show all questions at once and only need a scrollTo.
  // Detection is content-driven (presence of keyWord + leadIn) rather than
  // ID-driven, because German Teil 4 uses a different question type
  // (matching) despite sharing the "part4" ID.
  function isOneAtATimePart(part) {
    if (!part) return false;
    const qs = part.questions || [];
    return qs.length > 0 && qs.some(q => q.keyWord && q.leadIn);
  }

  function nextQuestion() {
    const idx = state.qIndexById[state.currentQid];
    if (idx == null || idx >= state.flatQuestions.length - 1) return;
    const next = state.flatQuestions[idx + 1];
    state.currentQid = next.qid;
    if (next.partIndex !== state.currentPartIndex) {
      goToPart(next.partIndex);
    } else {
      const curPart = state.parts[state.currentPartIndex].part;
      if (isOneAtATimePart(curPart)) {
        renderCurrentPart();
        renderBottomNav();
      } else {
        renderBottomNav();
        scrollToQuestion(next.qid);
      }
    }
  }
  function prevQuestion() {
    const idx = state.qIndexById[state.currentQid];
    if (idx == null || idx <= 0) return;
    const prev = state.flatQuestions[idx - 1];
    state.currentQid = prev.qid;
    if (prev.partIndex !== state.currentPartIndex) {
      goToPart(prev.partIndex);
    } else {
      const curPart = state.parts[state.currentPartIndex].part;
      if (isOneAtATimePart(curPart)) {
        renderCurrentPart();
        renderBottomNav();
      } else {
        renderBottomNav();
        scrollToQuestion(prev.qid);
      }
    }
  }

  // ---------- timer ----------
  function startTimer() {
    const durationMs = (state.content.durationMinutes || 60) * 60 * 1000;
    const storeKey = 'olympiada:timerEnd:' + sessionId;
    const stored = localStorage.getItem(storeKey);
    // Resume support: if we have server-provided remaining seconds (from
    // a session resume), use that to set the end time accurately. This
    // handles the case where a PC crashed and restarted — the server
    // knows exactly how much time has elapsed since the session started.
    const resumeRaw = localStorage.getItem('olympiada:resume');
    if (resumeRaw) {
      try {
        const resume = JSON.parse(resumeRaw);
        if (typeof resume.remainingSeconds === 'number') {
          state.timerEndMs = Date.now() + resume.remainingSeconds * 1000;
          localStorage.setItem(storeKey, String(state.timerEndMs));
        }
      } catch {}
      // Clear resume data after applying it (one-shot)
      localStorage.removeItem('olympiada:resume');
    } else {
      state.timerEndMs = stored ? Number(stored) : Date.now() + durationMs;
      if (!stored) localStorage.setItem(storeKey, String(state.timerEndMs));
    }
    // Capture the original <title> so we can restore it when the timer
    // leaves the warn/urgent threshold (unlikely in practice — time only
    // moves forward — but defensively correct). When the timer enters
    // the warn/urgent window, we prefix the title with "(MM:SS) " so a
    // student who's backgrounded the tab sees the remaining time in
    // their browser tab-bar at a glance. Matches the "tab title counter"
    // pattern used by Gmail/Calendar/etc. Only the title chrome changes;
    // no new UI.
    const originalTitle = document.title;
    function tick() {
      const remaining = Math.max(0, state.timerEndMs - Date.now());
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      const mmss = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
      const timerEl = document.getElementById('ct-timer');
      timerEl.textContent = mmss;
      // Low-time warning: amber <5 min, red <1 min. Matches real CAE
      // Inspera's timer color cues.
      const isUrgent = remaining > 0 && remaining < 60 * 1000;
      const isWarn = remaining >= 60 * 1000 && remaining < 5 * 60 * 1000;
      timerEl.classList.toggle('ct-timer--urgent', isUrgent);
      timerEl.classList.toggle('ct-timer--warn', isWarn);
      // Tab-bar time prefix for backgrounded students. Only fire when
      // title changes to avoid browser title-change overhead on every tick.
      const desiredTitle = (isWarn || isUrgent) ? ('(' + mmss + ') ' + originalTitle) : originalTitle;
      if (document.title !== desiredTitle) document.title = desiredTitle;
      if (remaining <= 0) {
        clearInterval(state.timerHandle);
        document.title = originalTitle; // clean up before submit redirects
        submit(true);
      }
    }
    tick();
    state.timerHandle = setInterval(tick, 1000);
  }

  // ---------- submit ----------
  async function submit(auto) {
    if (state.submitting) return;
    if (!auto) {
      // Styled confirm modal instead of native browser confirm() so the
      // visual language stays consistent with the pre-play + error modals.
      showConfirmModal(
        t.submitConfirmTitle,
        t.submitConfirmBody,
        t.submitConfirmYes,
        t.submitConfirmNo,
        () => performSubmit()
      );
      return;
    }
    performSubmit();
  }

  async function performSubmit() {
    state.submitting = true;
    const finishBtn = document.getElementById('ct-finish');
    const prevLabel = finishBtn.getAttribute('aria-label') || (isDe ? 'Beenden' : 'Finish');
    finishBtn.disabled = true;
    finishBtn.setAttribute('aria-label', isDe ? 'Wird abgegeben' : 'Submitting');
    finishBtn.textContent = '…';
    // Disable prev/next too so the student can't navigate during submit
    document.getElementById('ct-prev').disabled = true;
    document.getElementById('ct-next').disabled = true;
    try {
      const res = await sessionFetch('/api/session/' + encodeURIComponent(sessionId) + '/submit', { method: 'POST' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'submit failed');
      // Clear local session caches for this student (but keep studentId etc.)
      Object.keys(localStorage)
        .filter(k =>
          k.startsWith('olympiada:ans:') ||
          k.startsWith('olympiada:timerEnd:') ||
          k.startsWith('olympiada:pos:') ||
          k === 'olympiada:sessionId' ||
          k === 'olympiada:sessionToken'
        )
        .forEach(k => localStorage.removeItem(k));
      window.location.href = 'dashboard.html';
    } catch (e) {
      showErrorModal(t.submitFailed(e.message));
      state.submitting = false;
      finishBtn.disabled = false;
      finishBtn.setAttribute('aria-label', prevLabel);
      finishBtn.textContent = '✓';
      renderBottomNav(); // Restore prev/next enabled states
    }
  }

  // ---------- highlight & notes ----------
  // Context menu appears when student selects text in a passage. Supports
  // highlighting selected text and attaching notes — stored per-session in
  // localStorage so highlights survive part navigation and page refresh.

  function initHighlightSystem() {
    // State
    const hlKey = 'olympiada:hl:' + (sessionId || 'tmp');
    let highlights = [];
    try { highlights = JSON.parse(localStorage.getItem(hlKey)) || []; } catch (e) { highlights = []; }

    function saveHighlights() {
      try { localStorage.setItem(hlKey, JSON.stringify(highlights)); } catch (e) {}
    }

    // Context menu element (created once, reused)
    const menu = el('div', 'ct-context-menu');
    menu.style.display = 'none';
    document.body.appendChild(menu);

    function hideMenu() { menu.style.display = 'none'; }

    // Close menu on click outside
    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target)) hideMenu();
    });

    // Show context menu on text selection inside passages
    document.addEventListener('mouseup', (e) => {
      // Small delay to let selection finalize
      setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) return;
        const range = sel.getRangeAt(0);
        // Only allow highlighting inside passage elements
        const passage = range.commonAncestorContainer.nodeType === 1
          ? range.commonAncestorContainer.closest('.ct-passage, .ct-task-group-instructions, .ct-q-prompt')
          : range.commonAncestorContainer.parentElement &&
            range.commonAncestorContainer.parentElement.closest('.ct-passage, .ct-task-group-instructions, .ct-q-prompt');
        if (!passage) return;

        menu.innerHTML = '';
        // Highlight option
        const hlItem = el('div', 'ct-ctx-item');
        hlItem.textContent = isDe ? 'Markieren' : 'Highlight';
        hlItem.addEventListener('click', (ev) => {
          ev.stopPropagation();
          applyHighlight(range, null);
          hideMenu();
        });
        menu.appendChild(hlItem);

        // Note option
        const noteItem = el('div', 'ct-ctx-item');
        noteItem.textContent = isDe ? 'Notiz hinzufügen' : 'Add a note';
        noteItem.addEventListener('click', (ev) => {
          ev.stopPropagation();
          hideMenu();
          const noteText = prompt(isDe ? 'Notiz eingeben:' : 'Enter your note:');
          if (noteText && noteText.trim()) {
            applyHighlight(range, noteText.trim());
          }
        });
        menu.appendChild(noteItem);

        // Check if selection is inside an existing highlight
        const existingHl = range.commonAncestorContainer.nodeType === 1
          ? range.commonAncestorContainer.closest('.ct-hl')
          : range.commonAncestorContainer.parentElement &&
            range.commonAncestorContainer.parentElement.closest('.ct-hl');
        if (existingHl) {
          const clearItem = el('div', 'ct-ctx-item ct-ctx-item--danger');
          clearItem.textContent = isDe ? 'Markierung entfernen' : 'Clear highlight';
          clearItem.addEventListener('click', (ev) => {
            ev.stopPropagation();
            removeHighlightEl(existingHl);
            hideMenu();
          });
          menu.appendChild(clearItem);
        }

        // Position near cursor
        const x = Math.min(e.clientX, window.innerWidth - 180);
        const y = Math.min(e.clientY + 5, window.innerHeight - 120);
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.style.display = 'block';
      }, 10);
    });

    function applyHighlight(range, note) {
      try {
        const span = document.createElement('span');
        span.className = note ? 'ct-hl ct-hl--note' : 'ct-hl';
        if (note) {
          span.setAttribute('data-note', note);
          span.setAttribute('title', note);
        }
        range.surroundContents(span);
        window.getSelection().removeAllRanges();
        // Store highlight data for persistence
        highlights.push({
          text: span.textContent,
          note: note || null,
          partIndex: state.currentPartIndex,
          timestamp: Date.now(),
        });
        saveHighlights();
      } catch (e) {
        // surroundContents can fail if selection spans element boundaries;
        // in that case, silently skip rather than crash.
        console.warn('highlight failed:', e);
      }
    }

    function removeHighlightEl(hlEl) {
      const parent = hlEl.parentNode;
      while (hlEl.firstChild) parent.insertBefore(hlEl.firstChild, hlEl);
      parent.removeChild(hlEl);
      parent.normalize(); // merge adjacent text nodes
    }
  }

  // ---------- options menu ----------
  function buildOptionsPanel() {
    // Overlay backdrop
    const overlay = el('div', 'ct-options-overlay');
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    const panel = el('div', 'ct-options-panel');

    function showMainMenu() {
      panel.innerHTML = '';
      // Header
      const header = el('div', 'ct-options-header');
      header.appendChild(el('h2', null, isDe ? 'Optionen' : 'Options'));
      const close = document.createElement('button');
      close.className = 'ct-options-close';
      close.textContent = '\u00d7';
      close.addEventListener('click', () => overlay.remove());
      header.appendChild(close);
      panel.appendChild(header);

      const body = el('div', 'ct-options-body');

      // Text size option
      const textItem = el('div', 'ct-options-item');
      textItem.appendChild(el('span', 'ct-options-item-icon', 'A'));
      textItem.appendChild(el('span', 'ct-options-item-label', isDe ? 'Textgröße' : 'Text size'));
      textItem.appendChild(el('span', 'ct-options-item-arrow', '\u203a'));
      textItem.addEventListener('click', showTextSizeMenu);
      body.appendChild(textItem);

      panel.appendChild(body);
    }

    function showTextSizeMenu() {
      panel.innerHTML = '';
      // Back header
      const header = el('div', 'ct-options-back');
      const back = document.createElement('button');
      back.className = 'ct-options-back-btn';
      back.textContent = '\u2039 ' + (isDe ? 'Optionen' : 'Options');
      back.addEventListener('click', showMainMenu);
      header.appendChild(back);
      header.appendChild(el('h2', 'ct-options-subheading', isDe ? 'Textgröße' : 'Text Size'));
      panel.appendChild(header);

      const body = el('div', 'ct-options-body');
      const choices = el('div', 'ct-text-size-choices');
      const sizes = [
        { key: 'small', label: isDe ? 'Klein' : 'Small' },
        { key: 'medium', label: isDe ? 'Mittel' : 'Medium' },
        { key: 'large', label: isDe ? 'Groß' : 'Large' },
      ];
      const current = localStorage.getItem('olympiada:textSize') || 'medium';
      sizes.forEach((s) => {
        const btn = document.createElement('button');
        btn.className = 'ct-text-size-btn';
        if (s.key === current) btn.classList.add('ct-text-size-btn--active');
        btn.textContent = s.label;
        btn.addEventListener('click', () => {
          applyTextSize(s.key);
          // Update active state
          choices.querySelectorAll('.ct-text-size-btn').forEach(b => b.classList.remove('ct-text-size-btn--active'));
          btn.classList.add('ct-text-size-btn--active');
        });
        choices.appendChild(btn);
      });
      body.appendChild(choices);
      panel.appendChild(body);
    }

    showMainMenu();
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
  }

  function applyTextSize(size) {
    document.body.classList.remove('ct-text-small', 'ct-text-large');
    if (size === 'small') document.body.classList.add('ct-text-small');
    else if (size === 'large') document.body.classList.add('ct-text-large');
    localStorage.setItem('olympiada:textSize', size);
  }

  // Restore saved text size on load
  function restoreTextSize() {
    const saved = localStorage.getItem('olympiada:textSize');
    if (saved && saved !== 'medium') applyTextSize(saved);
  }

  // ---------- boot ----------
  (async () => {
    try {
      await loadContent();
      await ensureSession();
      // After session is ensured (and sessionId is stable), restore the
      // student's last known position so refreshes don't bounce them to
      // Part 1 Q1. Timer + answers already persist via localStorage +
      // server JSONL respectively.
      restorePosition();
      // Show candidate ID in header — primary is the student name (their
      // canonical identifier in an Olympiada context); session fragment is
      // a tie-breaker shown as a subtitle inside the value.
      const candEl = document.getElementById('ct-candidate-id');
      const candName = studentName || 'Student';
      candEl.textContent = candName;
      // Tooltip so long names that get truncated by CSS ellipsis are still
      // discoverable on hover — matches expected behaviour for ellipsis UI.
      candEl.setAttribute('title', candName);
      if (studentId) {
        const code = document.createElement('small');
        code.className = 'ct-header-id-code';
        code.textContent = studentId.slice(0, 8);
        candEl.appendChild(code);
      }
      renderCurrentPart();
      renderBottomNav();
      startTimer();

      document.getElementById('ct-prev').addEventListener('click', prevQuestion);
      document.getElementById('ct-next').addEventListener('click', nextQuestion);
      document.getElementById('ct-finish').addEventListener('click', () => submit(false));
      document.getElementById('ct-options-btn').addEventListener('click', buildOptionsPanel);
      restoreTextSize();
      initHighlightSystem();

      // Keep the active nav part visible when the student resizes the
      // window. Without this, resizing to a narrower viewport can push
      // the current part off-screen in the horizontally-scrollable nav.
      // Debounced to avoid thrashing on drag-resize.
      let resizeTimer = null;
      window.addEventListener('resize', () => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          const activeSeg = document.querySelector('.ct-nav-part--active');
          if (activeSeg && typeof activeSeg.scrollIntoView === 'function') {
            activeSeg.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'auto' });
          }
        }, 100);
      });
    } catch (e) {
      console.error(e);
      document.getElementById('ct-banner-title').textContent = t.errorBanner;
      document.getElementById('ct-banner-body').textContent = t.loadFailed(e.message);
      // Flag the banner as an error so the CSS modifier kicks in
      // (crimson left border + crimson title). Without this the error
      // banner is visually indistinguishable from a normal "Questions 1-8"
      // prompt, which is confusing — the student sees "Error" as a word
      // but the chrome looks the same as when the test is running fine.
      document.getElementById('ct-banner').classList.add('ct-banner--error');
    }
  })();

  // ============================================================
  // ANTI-CHEAT LOCKDOWN
  // ============================================================

  // Track violations and report to server
  let violationCount = 0;
  function reportViolation(type, detail) {
    violationCount++;
    if (sessionId && sessionToken) {
      sessionFetch('/api/session/' + encodeURIComponent(sessionId) + '/violation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, detail })
      }).catch(() => {});
    }
  }

  // 1. Fullscreen enforcement — request fullscreen on first user interaction
  let fullscreenEntered = false;
  function requestFullscreen() {
    if (fullscreenEntered) return;
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (req) {
      req.call(el).then(() => { fullscreenEntered = true; }).catch(() => {});
    }
  }
  // Enter fullscreen on first click/key
  document.addEventListener('click', requestFullscreen, { once: true });
  document.addEventListener('keydown', requestFullscreen, { once: true });

  // Re-enter fullscreen if exited (unless via secret exit)
  let secretExitActive = false;
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && !secretExitActive) {
      reportViolation('fullscreen-exit', '');
      // Try to re-enter after a short delay
      setTimeout(() => {
        if (!secretExitActive && !document.fullscreenElement) {
          requestFullscreen();
          fullscreenEntered = false; // allow re-request
        }
      }, 500);
    }
  });

  // 2. Block copy, paste, cut, right-click
  function blockEvent(e) { e.preventDefault(); }
  document.addEventListener('copy', blockEvent);
  document.addEventListener('paste', blockEvent);
  document.addEventListener('cut', blockEvent);
  document.addEventListener('contextmenu', blockEvent);

  // 3. Disable text selection on UI chrome (banner, nav) but KEEP selection
  //    enabled on passages and questions — the highlight & notes feature
  //    (initHighlightSystem) relies on window.getSelection() working inside
  //    .ct-passage and .ct-task-group elements.
  const style = document.createElement('style');
  style.textContent = `
    .ct-banner, .ct-bottom-nav, .ct-sidebar, .ct-q-nav {
      -webkit-user-select: none;
      -moz-user-select: none;
      user-select: none;
    }
  `;
  document.head.appendChild(style);

  // 4. Tab switch / visibility detection
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      reportViolation('tab-switch', 'Page became hidden');
    }
  });
  window.addEventListener('blur', () => {
    reportViolation('window-blur', 'Window lost focus');
  });

  // 5. Block keyboard shortcuts (Ctrl+C, Ctrl+V, F12, close-tab, etc.)
  document.addEventListener('keydown', (e) => {
    // Block Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A (select all)
    if (e.ctrlKey && !e.shiftKey && ['c', 'v', 'x', 'a'].includes(e.key.toLowerCase())) {
      // Allow in text inputs for typing convenience (paste into answer fields)
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        reportViolation('keyboard-shortcut', 'Ctrl+' + e.key);
      }
    }
    // Block F12 (DevTools), Ctrl+Shift+I (DevTools), Ctrl+Shift+J (Console)
    if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase()))) {
      e.preventDefault();
      reportViolation('devtools-attempt', e.key);
    }
    // Block Ctrl+U (view source)
    if (e.ctrlKey && e.key.toLowerCase() === 'u') {
      e.preventDefault();
      reportViolation('view-source', '');
    }
    // Block Ctrl+S (save page)
    if (e.ctrlKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
    }
    // Block Ctrl+P (print)
    if (e.ctrlKey && e.key.toLowerCase() === 'p') {
      e.preventDefault();
    }
    // Block Ctrl+W (close tab) and Ctrl+F4 (close tab)
    if (e.ctrlKey && (e.key.toLowerCase() === 'w' || e.key === 'F4')) {
      e.preventDefault();
      reportViolation('close-attempt', 'Ctrl+' + e.key);
    }
    // Block Alt+F4 (close window)
    if (e.altKey && e.key === 'F4') {
      e.preventDefault();
      reportViolation('close-attempt', 'Alt+F4');
    }
    // Block Alt+Tab (cannot fully prevent OS-level, but intercept the keydown)
    if (e.altKey && e.key === 'Tab') {
      e.preventDefault();
      reportViolation('tab-switch-attempt', 'Alt+Tab');
    }
    // Block Ctrl+Tab / Ctrl+Shift+Tab (switch browser tabs)
    if (e.ctrlKey && e.key === 'Tab') {
      e.preventDefault();
      reportViolation('tab-switch-attempt', 'Ctrl+Tab');
    }
    // Block Ctrl+N (new window), Ctrl+T (new tab)
    if (e.ctrlKey && !e.shiftKey && ['n', 't'].includes(e.key.toLowerCase())) {
      e.preventDefault();
      reportViolation('new-window-attempt', 'Ctrl+' + e.key);
    }
    // Block Escape key (prevent fullscreen exit via Esc)
    if (e.key === 'Escape') {
      e.preventDefault();
    }
  });

  // 5b. beforeunload guard — warn if student tries to close/navigate away
  window.addEventListener('beforeunload', (e) => {
    if (!state.submitting && !secretExitActive) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // 6. Detect DevTools open (resize heuristic)
  let devtoolsWarned = false;
  setInterval(() => {
    const widthDiff = window.outerWidth - window.innerWidth;
    const heightDiff = window.outerHeight - window.innerHeight;
    if ((widthDiff > 200 || heightDiff > 200) && !devtoolsWarned) {
      devtoolsWarned = true;
      reportViolation('devtools-resize', 'width:' + widthDiff + ' height:' + heightDiff);
    }
  }, 3000);

  // ============================================================
  // SECRET EXIT — semi-transparent icon + code entry
  // ============================================================
  (function initSecretExit() {
    // Create a small, semi-transparent emblem icon in the bottom-left corner
    const exitBtn = document.createElement('button');
    exitBtn.className = 'ct-secret-exit';
    exitBtn.title = '';
    exitBtn.setAttribute('aria-label', 'Exit');
    exitBtn.innerHTML = '<img src="assets/icon.png" alt="" style="width:24px;height:24px;opacity:0.15;">';
    exitBtn.style.cssText = 'position:fixed;bottom:12px;left:12px;z-index:999;background:none;border:none;cursor:default;padding:4px;opacity:0.3;transition:opacity 0.3s;';
    exitBtn.addEventListener('mouseenter', () => { exitBtn.style.opacity = '0.6'; });
    exitBtn.addEventListener('mouseleave', () => { exitBtn.style.opacity = '0.3'; });

    exitBtn.addEventListener('click', () => {
      // Show exit code modal
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';
      const card = document.createElement('div');
      card.style.cssText = 'background:#fff;padding:28px 32px;border-radius:10px;text-align:center;max-width:340px;box-shadow:0 12px 40px rgba(0,0,0,0.3);';
      card.innerHTML = '<h3 style="margin:0 0 12px;color:#1e40af;">Exit Code</h3><p style="margin:0 0 16px;color:#64748b;font-size:14px;">Enter the invigilator code to exit the exam.</p>';
      const input = document.createElement('input');
      input.type = 'password';
      input.style.cssText = 'width:100%;padding:10px 14px;border:1.5px solid #cbd5e1;border-radius:6px;font-size:16px;text-align:center;margin-bottom:12px;';
      input.placeholder = 'Exit code';
      const btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:10px;justify-content:center;';
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = 'padding:8px 20px;border:1.5px solid #cbd5e1;background:#fff;border-radius:6px;cursor:pointer;font-size:14px;';
      const confirmBtn = document.createElement('button');
      confirmBtn.textContent = 'Exit';
      confirmBtn.style.cssText = 'padding:8px 20px;border:none;background:#1e40af;color:#fff;border-radius:6px;cursor:pointer;font-size:14px;font-weight:600;';

      function tryExit() {
        if (input.value === 'zarmed/out') {
          secretExitActive = true;
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
          overlay.remove();
          // Navigate to a blank page to close the kiosk
          window.location.href = 'about:blank';
        } else {
          input.style.borderColor = '#dc2626';
          input.value = '';
          input.placeholder = 'Wrong code';
          setTimeout(() => { input.style.borderColor = '#cbd5e1'; input.placeholder = 'Exit code'; }, 1500);
        }
      }

      cancelBtn.addEventListener('click', () => overlay.remove());
      confirmBtn.addEventListener('click', tryExit);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryExit(); if (e.key === 'Escape') overlay.remove(); });
      overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

      btnRow.appendChild(cancelBtn);
      btnRow.appendChild(confirmBtn);
      card.appendChild(input);
      card.appendChild(btnRow);
      overlay.appendChild(card);
      document.body.appendChild(overlay);
      setTimeout(() => input.focus(), 100);
    });

    document.body.appendChild(exitBtn);
  })();

})();
