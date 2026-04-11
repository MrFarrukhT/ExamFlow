// Test runner — renders a question bank, persists answers live, submits.
// ADR-036: no "unanswered" counter, no post-submit breakdown.

(function () {
  'use strict';

  const sessionId = localStorage.getItem('olympiada:sessionId');
  const lang = localStorage.getItem('olympiada:lang');
  const skill = localStorage.getItem('olympiada:skill');

  if (!sessionId || !lang || !skill) {
    window.location.href = 'index.html';
    return;
  }

  const state = {
    content: null,
    answers: {},
    questionOrder: [],   // flat list of question IDs for nav numbering
    timerEndMs: null,
    timerHandle: null,
  };

  // ---------- load content ----------
  async function loadContent() {
    const res = await fetch(`/api/content/${encodeURIComponent(lang)}/${encodeURIComponent(skill)}`);
    if (!res.ok) throw new Error(`content load failed (${res.status})`);
    state.content = await res.json();
  }

  // ---------- render ----------
  function render() {
    document.getElementById('test-title').textContent = state.content.title;
    const container = document.getElementById('parts');
    container.innerHTML = '';

    state.questionOrder = [];
    state.content.parts.forEach((part, partIdx) => {
      const partEl = document.createElement('section');
      partEl.className = 'zu-part';
      partEl.id = `part-${part.id}`;

      const title = document.createElement('h2');
      title.textContent = part.title;
      partEl.appendChild(title);

      if (part.instructions) {
        const inst = document.createElement('p');
        inst.className = 'zu-part-instructions';
        inst.textContent = part.instructions;
        partEl.appendChild(inst);
      }

      if (part.audio) {
        partEl.appendChild(renderAudio(part.audio));
      }

      if (part.passage) {
        partEl.appendChild(renderPassage(part.passage));
      }

      const matchOpts = part.matchingOptions || null;
      (part.questions || []).forEach((q) => {
        state.questionOrder.push(q.id);
        partEl.appendChild(renderQuestion(q, matchOpts));
      });

      container.appendChild(partEl);
    });

    renderNav();
  }

  function renderPassage(passage) {
    const el = document.createElement('div');
    el.className = 'zu-passage';
    if (passage.type === 'html') {
      // Sanitize: strip <script> tags only; trust the rest (content is ours).
      el.innerHTML = String(passage.content).replace(/<script[\s\S]*?<\/script>/gi, '');
    } else {
      el.textContent = passage.content || '';
    }
    return el;
  }

  function renderAudio(audio) {
    const el = document.createElement('div');
    el.className = 'zu-audio-block';
    if (audio.note) {
      const note = document.createElement('div');
      note.className = 'zu-audio-note';
      note.textContent = audio.note;
      el.appendChild(note);
    }
    const player = document.createElement('audio');
    player.controls = true;
    player.preload = 'metadata';
    player.src = `/api/audio/${encodeURIComponent(lang)}/${encodeURIComponent(audio.src.split('/').pop())}`;
    el.appendChild(player);

    const maxPlays = Number(audio.maxPlays || 2);
    let plays = 0;
    const left = document.createElement('div');
    left.className = 'zu-plays-left';
    left.textContent = `Plays remaining: ${maxPlays}`;
    el.appendChild(left);

    player.addEventListener('ended', () => {
      plays += 1;
      const remaining = Math.max(0, maxPlays - plays);
      left.textContent = `Plays remaining: ${remaining}`;
      if (remaining <= 0) {
        player.controls = false;
        player.removeAttribute('src');
        player.load();
        left.textContent = 'Plays exhausted';
      }
    });

    return el;
  }

  function renderQuestion(q, matchOpts) {
    const el = document.createElement('div');
    el.className = 'zu-question';
    el.id = `q-${q.id}`;

    const prompt = document.createElement('div');
    prompt.className = 'zu-q-prompt';
    prompt.textContent = q.prompt || q.id;
    el.appendChild(prompt);

    const type = q.type;
    if (type === 'multiple-choice' || (type === 'matching' && matchOpts)) {
      const options = type === 'matching' ? matchOpts : q.options;
      const group = document.createElement('div');
      group.className = 'zu-options';
      options.forEach((opt) => {
        const label = document.createElement('label');
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = `q-${q.id}`;
        radio.value = opt.key;
        radio.addEventListener('change', () => saveAnswer(q.id, opt.key));
        label.appendChild(radio);
        const text = document.createElement('span');
        text.textContent = ` ${opt.key}. ${opt.text}`;
        label.appendChild(text);
        group.appendChild(label);
      });
      el.appendChild(group);
    } else if (type === 'multiple-choice-multi') {
      const group = document.createElement('div');
      group.className = 'zu-options';
      (q.options || []).forEach((opt) => {
        const label = document.createElement('label');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = opt.key;
        cb.addEventListener('change', () => {
          const checked = Array.from(group.querySelectorAll('input:checked')).map((i) => i.value);
          saveAnswer(q.id, checked);
        });
        label.appendChild(cb);
        const text = document.createElement('span');
        text.textContent = ` ${opt.key}. ${opt.text}`;
        label.appendChild(text);
        group.appendChild(label);
      });
      el.appendChild(group);
    } else if (type === 'true-false') {
      const group = document.createElement('div');
      group.className = 'zu-options';
      ['true', 'false', 'not-given'].forEach((v) => {
        const label = document.createElement('label');
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = `q-${q.id}`;
        radio.value = v;
        radio.addEventListener('change', () => saveAnswer(q.id, v));
        label.appendChild(radio);
        const text = document.createElement('span');
        text.textContent = ` ${v}`;
        label.appendChild(text);
        group.appendChild(label);
      });
      el.appendChild(group);
    } else {
      // gap-fill / open-cloze / word-formation / key-word-transformation / sentence-completion
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'zu-gap-input';
      input.autocomplete = 'off';
      input.spellcheck = false;
      if (q.rootWord) {
        const hint = document.createElement('span');
        hint.textContent = ` [${q.rootWord}] `;
        el.appendChild(hint);
      }
      if (q.leadIn) {
        const lead = document.createElement('div');
        lead.textContent = q.leadIn;
        el.appendChild(lead);
      }
      if (q.keyWord) {
        const kw = document.createElement('div');
        kw.innerHTML = `Key word: <strong>${q.keyWord}</strong>`;
        el.appendChild(kw);
      }
      input.addEventListener('input', () => saveAnswer(q.id, input.value));
      el.appendChild(input);
    }

    return el;
  }

  function renderNav() {
    const grid = document.getElementById('nav-grid');
    grid.innerHTML = '';
    state.questionOrder.forEach((qid, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = String(idx + 1);
      btn.addEventListener('click', () => {
        const target = document.getElementById(`q-${qid}`);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      grid.appendChild(btn);
    });
  }

  // ---------- answer persistence ----------
  async function saveAnswer(qid, value) {
    state.answers[qid] = value;
    // Second layer: localStorage mirror (network-free fallback)
    try {
      localStorage.setItem(`olympiada:ans:${sessionId}:${qid}`, JSON.stringify(value));
    } catch (e) {}
    try {
      await fetch(`/api/session/${encodeURIComponent(sessionId)}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qid, value }),
      });
    } catch (e) {
      console.warn('answer save network failed (kept in localStorage):', e);
    }
  }

  // ---------- timer ----------
  function startTimer() {
    const durationMs = (state.content.durationMinutes || 60) * 60 * 1000;
    const stored = localStorage.getItem(`olympiada:timerEnd:${sessionId}`);
    state.timerEndMs = stored ? Number(stored) : Date.now() + durationMs;
    if (!stored) localStorage.setItem(`olympiada:timerEnd:${sessionId}`, String(state.timerEndMs));

    function tick() {
      const remaining = Math.max(0, state.timerEndMs - Date.now());
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      document.getElementById('timer').textContent =
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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
    if (!auto) {
      if (!confirm("Finish this test? You can't come back.")) return;
    }
    const btn = document.getElementById('finish-btn');
    btn.disabled = true;
    btn.textContent = 'Submitting…';
    try {
      const res = await fetch(`/api/session/${encodeURIComponent(sessionId)}/submit`, { method: 'POST' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'submit failed');
      // Clear local cache BEFORE navigating
      Object.keys(localStorage).filter(k => k.startsWith('olympiada:')).forEach(k => localStorage.removeItem(k));
      window.location.href = 'done.html';
    } catch (e) {
      alert('Submit failed: ' + e.message + '\n\nPlease tell the invigilator. Your answers are still saved on the server.');
      btn.disabled = false;
      btn.textContent = 'Finish Test';
    }
  }

  // ---------- bootstrap ----------
  (async () => {
    try {
      await loadContent();
      render();
      startTimer();
      document.getElementById('finish-btn').addEventListener('click', () => submit(false));
    } catch (e) {
      console.error(e);
      alert('Failed to load the test. Please tell the invigilator.');
    }
  })();
})();
