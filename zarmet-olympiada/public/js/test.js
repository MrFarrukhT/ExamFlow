/* Zarmet Olympiada — Test Runner (ADR-039)
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

  if (!studentName || !lang) {
    window.location.href = 'index.html';
    return;
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
    audioState: {},         // partId -> 'not-started' | 'playing' | 'finished'
    audioElement: null,     // currently live Audio instance (if any)
    activeSlotQid: null,    // for gapped-text: which slot is selected for assignment
    timerEndMs: null,
    timerHandle: null,
    submitting: false,
  };

  // ---------- load content and start session ----------
  async function loadContent() {
    const res = await fetch('/api/content/' + encodeURIComponent(lang) + '/' + encodeURIComponent(skill));
    if (!res.ok) throw new Error('content load failed (' + res.status + ')');
    state.content = await res.json();

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

  async function ensureSession() {
    if (sessionId) {
      // verify session still exists server-side
      try {
        const res = await fetch('/api/session/' + encodeURIComponent(sessionId));
        if (res.ok) {
          const body = await res.json();
          if (body.meta && body.meta.skill === skill) {
            state.answers = body.answers || {};
            return;
          }
        }
      } catch (e) {}
      sessionId = '';
    }
    const res = await fetch('/api/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId,
        student: studentName,
        group: localStorage.getItem('olympiada:studentGroup') || '',
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
    localStorage.setItem('olympiada:sessionId', sessionId);
  }

  // ---------- answer persistence ----------
  async function saveAnswer(qid, value) {
    state.answers[qid] = value;
    try {
      localStorage.setItem('olympiada:ans:' + sessionId + ':' + qid, JSON.stringify(value));
    } catch (e) {}
    try {
      await fetch('/api/session/' + encodeURIComponent(sessionId) + '/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qid, value }),
      });
    } catch (e) {
      console.warn('answer save network failed:', e);
    }
    renderBottomNav();
  }

  // ---------- per-part renderers ----------

  function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null) e.textContent = text;
    return e;
  }

  function addBookmark(node) {
    const b = el('span', 'ct-bookmark');
    b.setAttribute('aria-hidden', 'true');
    node.appendChild(b);
    return node;
  }

  // Shared: multi-choice radio group (used by many parts)
  function renderMCQuestion(q) {
    const wrap = el('div', 'ct-question');
    wrap.dataset.qid = q.id;
    if (state.currentQid === q.id) wrap.classList.add('ct-question--active');
    const prompt = el('div', 'ct-q-prompt', q.prompt || q.id);
    addBookmark(prompt);
    wrap.appendChild(prompt);
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
    const prompt = el('div', 'ct-q-prompt', q.prompt || q.id);
    addBookmark(prompt);
    wrap.appendChild(prompt);
    const opts = el('div', 'ct-q-options');
    ['true', 'false', 'not-given'].forEach((v) => {
      const label = el('label', 'ct-q-option');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'q-' + q.id;
      radio.value = v;
      if (state.answers[q.id] === v) radio.checked = true;
      radio.addEventListener('change', () => { saveAnswer(q.id, v); state.currentQid = q.id; refreshActiveHighlight(); });
      label.appendChild(radio);
      label.appendChild(el('span', null, v));
      opts.appendChild(label);
    });
    wrap.appendChild(opts);
    return wrap;
  }

  // Part 1: multiple-choice cloze — passage with inline MC <select>
  function renderPart1(part) {
    const wrap = el('div', 'ct-part');
    wrap.appendChild(renderPassageHeading(part));
    const passage = renderPassageWithInlineGaps(part, (q) => {
      const inline = el('span', 'ct-inline-mc');
      const num = el('span', null, (q.prompt || q.id) + '. ');
      inline.appendChild(num);
      const select = document.createElement('select');
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = '—';
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
    kl.appendChild(el('h4', null, 'Keyword List'));
    const ol = document.createElement('ol');
    (part.questions || []).forEach((q) => {
      const li = document.createElement('li');
      li.appendChild(el('span', 'ct-kw-num', (q.prompt || '').replace(/\D/g, '') || q.id));
      li.appendChild(el('span', 'ct-kw-word', q.rootWord || '?'));
      ol.appendChild(li);
    });
    kl.appendChild(ol);
    right.appendChild(kl);
    grid.appendChild(right);

    const wrap = el('div', 'ct-part');
    wrap.appendChild(grid);
    return wrap;
  }

  // Part 4: key-word transformation — centered blocks
  function renderPart4(part) {
    const wrap = el('div', 'ct-part');
    (part.questions || []).forEach((q) => {
      const block = el('div', 'ct-kwt-block');
      block.dataset.qid = q.id;
      if (state.currentQid === q.id) block.classList.add('ct-question--active');
      block.appendChild(el('div', 'ct-q-prompt', q.prompt || q.id));
      if (q.keyWord) block.appendChild(el('div', 'ct-kwt-keyword', q.keyWord));
      if (q.leadIn) block.appendChild(el('div', 'ct-kwt-lead', q.leadIn));
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'ct-kwt-input';
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.value = state.answers[q.id] || '';
      input.addEventListener('input', () => {
        saveAnswer(q.id, input.value);
        state.currentQid = q.id;
        refreshActiveHighlight();
      });
      block.appendChild(input);
      wrap.appendChild(block);
    });
    return wrap;
  }

  // Part 5, Part 8 generic multi-choice reading — 2-col passage + questions
  function renderTwoColReading(part) {
    const grid = el('div', 'ct-two-col');
    const left = el('div', 'ct-col');
    left.appendChild(renderPassageHeading(part));
    const passageEl = el('div', 'ct-passage');
    passageEl.textContent = passageBody(part);
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
    const prompt = el('div', 'ct-q-prompt', q.prompt || q.id);
    addBookmark(prompt);
    wrap.appendChild(prompt);
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
      slot.appendChild(el('span', 'ct-slot-number', q ? q.prompt : qid));
      const assigned = state.answers[qid];
      if (assigned) {
        const paraText = (part.paragraphBank || []).find(p => p.key === assigned);
        if (paraText) {
          slot.classList.add('ct-slot--filled');
          slot.appendChild(el('span', 'ct-para-key', assigned));
          slot.appendChild(document.createTextNode(paraText.text));
        }
      } else {
        slot.appendChild(document.createTextNode('Click here, then click a paragraph to assign it'));
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
    bank.appendChild(el('h4', null, 'Paragraphs'));
    (part.paragraphBank || []).forEach((p) => {
      const card = el('div', 'ct-para-card');
      const usedBy = Object.entries(state.answers).find(([qid, v]) => v === p.key);
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
      renderCurrentPart();
      return;
    }
    state.activeSlotQid = qid;
    renderCurrentPart();
  }
  function handleParagraphClick(paraKey) {
    if (!state.activeSlotQid) return;
    // If this paragraph is already used, don't let it be reused (unless clicking to free)
    const usedBy = Object.entries(state.answers).find(([, v]) => v === paraKey);
    if (usedBy && usedBy[0] !== state.activeSlotQid) return;
    const target = state.activeSlotQid;
    state.activeSlotQid = null;
    saveAnswer(target, paraKey);
    renderCurrentPart();
  }

  // Listening part renderer (handles taskGroups + pre-play modal)
  function renderListeningPart(part) {
    const wrap = el('div', 'ct-part');
    wrap.dataset.partId = part.id;

    // Check if pre-play modal needed
    const audioState = state.audioState[part.id] || 'not-started';
    if (part.audio && audioState === 'not-started') {
      const modal = buildPrePlayModal(part);
      wrap.appendChild(modal);
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
        if (q.type === 'true-false') list.appendChild(renderTrueFalse(q));
        else if (q.type === 'multiple-choice') list.appendChild(renderMCQuestion(q));
        else if (q.type === 'sentence-completion' || q.type === 'gap-fill' || q.type === 'open-cloze') {
          const block = el('div', 'ct-question');
          block.dataset.qid = q.id;
          if (state.currentQid === q.id) block.classList.add('ct-question--active');
          const prompt = el('div', 'ct-q-prompt', q.prompt || q.id);
          addBookmark(prompt);
          block.appendChild(prompt);
          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'ct-kwt-input';
          input.autocomplete = 'off';
          input.spellcheck = false;
          input.value = state.answers[q.id] || '';
          input.addEventListener('input', () => { saveAnswer(q.id, input.value); state.currentQid = q.id; refreshActiveHighlight(); });
          block.appendChild(input);
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
    card.appendChild(el('p', 'ct-preplay-text',
      'You will be listening to an audio clip during this test. You will not be permitted to pause or rewind the audio while answering the questions. To continue, click Play.'));
    const btn = document.createElement('button');
    btn.className = 'ct-preplay-btn';
    btn.textContent = 'Play';
    btn.addEventListener('click', () => startAudio(part));
    card.appendChild(btn);
    overlay.appendChild(card);
    return overlay;
  }

  // Start audio for a part (strict: auto-play, no controls)
  function startAudio(part) {
    if (state.audioElement) {
      try { state.audioElement.pause(); } catch (e) {}
      state.audioElement = null;
    }
    state.audioState[part.id] = 'playing';
    // Log to server — used for refresh-sneakiness integrity flag
    fetch('/api/session/' + encodeURIComponent(sessionId) + '/audio-play', {
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
      state.audioState[part.id] = 'finished';
      document.getElementById('ct-audio-status').classList.remove('ct-audio-status--visible');
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
      document.getElementById('ct-audio-status').classList.add('ct-audio-status--visible');
      startStallTimer();
    });
    audio.addEventListener('ended', () => {
      if (stallTimer) clearTimeout(stallTimer);
      state.audioState[part.id] = 'finished';
      document.getElementById('ct-audio-status').classList.remove('ct-audio-status--visible');
      renderCurrentPart();
      renderBottomNav();
    });
    audio.addEventListener('error', () => {
      handleFailure('Audio is unavailable for this part. Please tell your invigilator. You may continue to answer the questions, but you will not hear the audio.');
    });
    audio.addEventListener('stalled', startStallTimer);
    audio.addEventListener('waiting', startStallTimer);
    audio.play().catch((e) => {
      console.error('[audio] play failed', e);
      // Trim any trailing period so we don't end up with ".."
      const msg = String(e.message || 'unknown error').replace(/\.+\s*$/, '');
      handleFailure('Unable to start audio: ' + msg + '. Please tell your invigilator.');
    });

    renderCurrentPart(); // remove overlay
    renderBottomNav();
  }

  function showErrorModal(text) {
    const overlay = el('div', 'ct-error-modal');
    const card = el('div', 'ct-error-card');
    card.appendChild(el('h3', null, 'Problem'));
    card.appendChild(el('p', null, text));
    const btn = document.createElement('button');
    btn.textContent = 'OK';
    btn.addEventListener('click', () => overlay.remove());
    card.appendChild(btn);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
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
    input.autocomplete = 'off';
    input.spellcheck = false;
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
  function renderCurrentPart() {
    const partEntry = state.parts[state.currentPartIndex];
    if (!partEntry) return;
    const part = partEntry.part;
    const main = document.getElementById('ct-main');
    main.innerHTML = '';

    // Banner (Questions N-M + instructions)
    const firstQ = partEntry.flatQuestions[0];
    const lastQ = partEntry.flatQuestions[partEntry.flatQuestions.length - 1];
    const firstNum = extractQuestionNumber(firstQ && firstQ.question);
    const lastNum = extractQuestionNumber(lastQ && lastQ.question);
    const title = firstNum && lastNum ? 'Questions ' + firstNum + '–' + lastNum : part.title;
    document.getElementById('ct-banner-title').textContent = title;
    document.getElementById('ct-banner-body').textContent = part.instructions || '';

    // Dispatch by part.id
    const id = part.id || '';
    let rendered;
    if (part.audio) {
      rendered = renderListeningPart(part);
    } else if (id === 'part1') {
      rendered = renderPart1(part);
    } else if (id === 'part2') {
      rendered = renderPart2(part);
    } else if (id === 'part3') {
      rendered = renderPart3(part);
    } else if (id === 'part4') {
      rendered = renderPart4(part);
    } else if (id === 'part7') {
      rendered = renderPart7(part);
    } else if (id === 'part5' || id === 'part6' || id === 'part8') {
      rendered = renderTwoColReading(part);
    } else {
      // Fallback: 2-col reading
      rendered = renderTwoColReading(part);
    }
    main.appendChild(rendered);
    refreshActiveHighlight();
    window.scrollTo({ top: 0 });
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
      const seg = el('div', 'ct-nav-part');
      seg.dataset.partIndex = String(i);
      const isActive = i === state.currentPartIndex;
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
        seg.appendChild(el('span', 'ct-nav-part-count', answered + ' of ' + total));
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
    const s = state.audioState[partEntry.part.id] || 'not-started';
    return s !== 'finished';
  }

  function goToPart(i) {
    if (i < 0 || i >= state.parts.length) return;
    if (i !== state.currentPartIndex) {
      // Stop any playing audio on part change
      if (state.audioElement) {
        try { state.audioElement.pause(); } catch (e) {}
        state.audioElement = null;
        // If we leave during 'playing', treat as abandoned — mark finished to avoid re-modal
        const oldPart = state.parts[state.currentPartIndex].part;
        if (oldPart.audio && state.audioState[oldPart.id] === 'playing') {
          state.audioState[oldPart.id] = 'finished';
        }
      }
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

  function nextQuestion() {
    const idx = state.qIndexById[state.currentQid];
    if (idx == null || idx >= state.flatQuestions.length - 1) return;
    const next = state.flatQuestions[idx + 1];
    state.currentQid = next.qid;
    if (next.partIndex !== state.currentPartIndex) {
      goToPart(next.partIndex);
    } else {
      renderBottomNav();
      scrollToQuestion(next.qid);
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
      renderBottomNav();
      scrollToQuestion(prev.qid);
    }
  }

  // ---------- timer ----------
  function startTimer() {
    const durationMs = (state.content.durationMinutes || 60) * 60 * 1000;
    const storeKey = 'olympiada:timerEnd:' + sessionId;
    const stored = localStorage.getItem(storeKey);
    state.timerEndMs = stored ? Number(stored) : Date.now() + durationMs;
    if (!stored) localStorage.setItem(storeKey, String(state.timerEndMs));
    function tick() {
      const remaining = Math.max(0, state.timerEndMs - Date.now());
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      document.getElementById('ct-timer').textContent =
        String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
      if (remaining <= 0) {
        clearInterval(state.timerHandle);
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
      if (!confirm("Finish this test? You can't come back.")) return;
    }
    state.submitting = true;
    document.getElementById('ct-finish').disabled = true;
    try {
      const res = await fetch('/api/session/' + encodeURIComponent(sessionId) + '/submit', { method: 'POST' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'submit failed');
      // Clear local session caches for this student (but keep studentId etc.)
      Object.keys(localStorage)
        .filter(k => k.startsWith('olympiada:ans:') || k.startsWith('olympiada:timerEnd:') || k === 'olympiada:sessionId')
        .forEach(k => localStorage.removeItem(k));
      window.location.href = 'dashboard.html';
    } catch (e) {
      alert('Submit failed: ' + e.message + '\n\nPlease tell the invigilator. Your answers are still saved on the server.');
      state.submitting = false;
      document.getElementById('ct-finish').disabled = false;
    }
  }

  // ---------- boot ----------
  (async () => {
    try {
      await loadContent();
      await ensureSession();
      // Show candidate ID in header — primary is the student name (their
      // canonical identifier in an Olympiada context); session fragment is
      // a tie-breaker shown as a subtitle inside the value.
      const candEl = document.getElementById('ct-candidate-id');
      candEl.textContent = studentName || 'Student';
      if (studentId) {
        const code = document.createElement('small');
        code.style.cssText = 'display:block;font-weight:400;font-size:10px;color:var(--ct-text-muted);letter-spacing:0.05em;text-transform:uppercase;';
        code.textContent = studentId.slice(0, 8);
        candEl.appendChild(code);
      }
      renderCurrentPart();
      renderBottomNav();
      startTimer();

      document.getElementById('ct-prev').addEventListener('click', prevQuestion);
      document.getElementById('ct-next').addEventListener('click', nextQuestion);
      document.getElementById('ct-finish').addEventListener('click', () => submit(false));
    } catch (e) {
      console.error(e);
      document.getElementById('ct-banner-title').textContent = 'Error';
      document.getElementById('ct-banner-body').textContent = 'Failed to load the test. Please tell your invigilator. (' + e.message + ')';
    }
  })();
})();
