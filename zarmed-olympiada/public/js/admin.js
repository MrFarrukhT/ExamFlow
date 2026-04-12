// Admin results viewer — password-gated, reads from backups/ folder via the server.
// ADR-036: password in sessionStorage for this tab only, cleared on close.

(function () {
  'use strict';

  let token = sessionStorage.getItem('olympiada:admin-token') || '';
  let rows = [];

  const adminPage = document.getElementById('admin-page');
  const loginView = document.getElementById('login-view');
  const listView = document.getElementById('list-view');
  const detailView = document.getElementById('detail-view');
  const emptyState = document.getElementById('empty-state');
  const rowsTable = document.getElementById('rows-table');

  function show(view) {
    loginView.hidden = view !== loginView;
    listView.hidden = view !== listView;
    detailView.hidden = view !== detailView;
    // Narrow the page shell when showing login (centered password form);
    // full width for list/detail which need room for the table. Toggle
    // body.zu-welcome so the login form gets the same vertically-centered
    // composition as index.html/done.html.
    if (view === loginView) {
      adminPage.classList.add('page--narrow');
      document.body.classList.add('zu-welcome');
      // Auto-focus the password input so the invigilator can start
      // typing immediately. setTimeout(0) defers to the next frame so
      // the view swap completes before focus moves.
      setTimeout(() => {
        try {
          const pw = document.getElementById('pw');
          if (pw) pw.focus();
        } catch (e) { /* focus() can throw on detached */ }
      }, 0);
    } else {
      adminPage.classList.remove('page--narrow');
      document.body.classList.remove('zu-welcome');
    }
    // When viewing a submission's detail, the full-size welcome header
    // (logo + h1 + subtitle) wastes ~300px of vertical space before the
    // student's actual answers. Compact the header to a minimal brand
    // strip so the per-question table shows immediately.
    if (view === detailView) {
      document.body.classList.add('zu-admin-detail');
    } else {
      document.body.classList.remove('zu-admin-detail');
    }
  }

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      ...opts,
      headers: { ...(opts.headers || {}), Authorization: 'Bearer ' + token },
    });
    if (res.status === 401) {
      token = '';
      sessionStorage.removeItem('olympiada:admin-token');
      show(loginView);
      throw new Error('unauthorized');
    }
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'request failed');
    return body;
  }

  async function loadRows() {
    try {
      const body = await api('/api/admin/submissions');
      rows = body.rows || [];
      renderRows();
    } catch (e) {
      console.error(e);
    }
  }

  function fmtTime(iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  }

  // Compact date/time for the list column. Full toLocaleString() like
  // "4/11/2026, 11:04:56 PM" wraps to 3 lines in the mobile FINISHED
  // column — this trims to "Apr 11, 11:04 PM" (~16 chars, no seconds,
  // no year). Year is omitted because the results list is always
  // recent and backup files are keyed by server timestamp anyway.
  function fmtTimeShort(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch { return iso; }
  }

  // Humanize a language slug ("english-c1" → "English C1")
  function fmtLang(slug) {
    if (!slug) return '';
    const map = {
      'english-c1': 'English C1',
      'german-c1': 'German C1',
    };
    if (map[slug]) return map[slug];
    return String(slug).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  // Humanize a skill slug ("reading" → "Reading")
  function fmtSkill(slug) {
    if (!slug) return '';
    const map = {
      'reading': 'Reading',
      'listening': 'Listening',
    };
    if (map[slug]) return map[slug];
    return String(slug).charAt(0).toUpperCase() + String(slug).slice(1);
  }

  // Pretty-print a student answer value. Null/undefined/empty → em dash.
  function fmtStudentValue(v) {
    if (v == null || v === '') return '—';
    if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  }

  // Pretty-print a correct answer (handles strings, arrays, and KWT objects)
  function fmtCorrect(v) {
    if (v == null) return '';
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) return v.join(' / ');
    if (typeof v === 'object') {
      // key-word-transformation shape: {required, maxWords, alternatives}
      if (Array.isArray(v.required)) {
        const primary = v.required.join(' ');
        const alts = Array.isArray(v.alternatives)
          ? v.alternatives.map(a => a.join(' ')).join(' / ')
          : '';
        return alts ? primary + ' / ' + alts : primary;
      }
      return JSON.stringify(v);
    }
    return String(v);
  }

  // Humanize question type slugs for admin readability
  function fmtType(slug) {
    const map = {
      'multiple-choice': 'Multiple Choice',
      'multiple-choice-multi': 'Multi-Select',
      'open-cloze': 'Open Cloze',
      'word-formation': 'Word Formation',
      'key-word-transformation': 'Key Word Transform',
      'gap-fill': 'Gap Fill',
      'gapped-text': 'Gapped Text',
      'matching': 'Matching',
      'true-false': 'True / False',
      'sentence-completion': 'Sentence Completion',
    };
    return map[slug] || String(slug).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  // Format a percentage (earned/total → "18%")
  function fmtPct(earned, total) {
    if (!total) return '0%';
    return Math.round((earned / total) * 100) + '%';
  }

  // Format duration between two ISO timestamps ("2m 31s", "1h 5m", etc.)
  function fmtDuration(startIso, endIso) {
    if (!startIso || !endIso) return '';
    try {
      const ms = new Date(endIso) - new Date(startIso);
      if (ms < 0) return '';
      const totalSec = Math.floor(ms / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      if (h > 0) return h + 'h ' + m + 'm';
      if (m > 0) return m + 'm ' + s + 's';
      return s + 's';
    } catch { return ''; }
  }

  // Humanize a partId ("part1" → "Part 1", "part-listening-2" → "Listening 2")
  function fmtPart(partId) {
    if (!partId) return '';
    // "part-listening-2" style
    const match = partId.match(/^part-?(.+?)[-_]?(\d+)$/);
    if (match) {
      const label = match[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      return label + ' ' + match[2];
    }
    // "part1" style
    const simple = partId.match(/^part(\d+)$/);
    if (simple) return 'Part ' + simple[1];
    return partId;
  }

  function renderRows() {
    const tbody = document.getElementById('rows-body');
    tbody.innerHTML = '';
    // Export CSV/JSON only make sense when there are rows to export.
    // Disable them on the empty state so a new invigilator doesn't get
    // an empty file when they click Export by habit.
    const exportCsv = document.getElementById('export-csv');
    const exportJson = document.getElementById('export-json');
    const isEmpty = rows.length === 0;
    if (exportCsv) exportCsv.disabled = isEmpty;
    if (exportJson) exportJson.disabled = isEmpty;
    if (isEmpty) {
      rowsTable.style.display = 'none';
      emptyState.hidden = false;
      return;
    }
    rowsTable.style.display = '';
    emptyState.hidden = true;
    rows.forEach((r) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${fmtTimeShort(r.finishedAt)}</td>
        <td>${escape(r.student)}</td>
        <td>${escape(r.group || '—')}</td>
        <td>${escape(fmtLang(r.lang))}</td>
        <td>${escape(fmtSkill(r.skill))}</td>
        <td>${r.earned ?? '-'} / ${r.total ?? '-'} <span class="zu-pct">(${fmtPct(r.earned, r.total)})</span></td>
      `;
      tr.addEventListener('click', () => openDetail(r));
      tbody.appendChild(tr);
    });
  }

  function escape(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  async function openDetail(row) {
    try {
      const rec = await api('/api/admin/submission/' + encodeURIComponent(row.filename));
      const body = document.getElementById('detail-body');
      const pq = rec.score.perQuestion || [];
      const totalQ = pq.length;
      const answered = pq.filter(q => q.studentValue != null && q.studentValue !== '').length;
      const correct = pq.filter(q => q.earned >= q.possible).length;
      const pct = fmtPct(rec.score.earned, rec.score.total);
      const duration = fmtDuration(rec.startedAt, rec.finishedAt);

      const h = [];

      // Header
      h.push(`<h2>${escape(rec.student)} — ${escape(fmtLang(rec.lang))} / ${escape(fmtSkill(rec.skill))}</h2>`);

      // Summary stats bar
      h.push('<div class="zu-detail-stats">');
      h.push(`<div class="zu-stat"><span class="zu-stat-value">${rec.score.earned} / ${rec.score.total}</span><span class="zu-stat-label">Score (${pct})</span></div>`);
      h.push(`<div class="zu-stat"><span class="zu-stat-value">${answered} / ${totalQ}</span><span class="zu-stat-label">Answered</span></div>`);
      h.push(`<div class="zu-stat"><span class="zu-stat-value">${correct}</span><span class="zu-stat-label">Correct</span></div>`);
      if (duration) h.push(`<div class="zu-stat"><span class="zu-stat-value">${duration}</span><span class="zu-stat-label">Duration</span></div>`);
      h.push('</div>');

      // Timestamps (compact)
      h.push(`<p class="zu-detail-time"><strong>Started:</strong> ${fmtTime(rec.startedAt)} &nbsp; <strong>Finished:</strong> ${fmtTime(rec.finishedAt)}</p>`);

      // Group questions by partId for section headers
      let currentPart = null;
      h.push('<div class="zu-admin-table-wrap"><table class="zu-admin-table zu-admin-table--detail"><thead><tr><th>#</th><th>Type</th><th>Student Answer</th><th>Correct Answer</th><th>Points</th></tr></thead><tbody>');
      pq.forEach((q, i) => {
        // Insert part header row when the part changes
        if (q.partId !== currentPart) {
          currentPart = q.partId;
          // Compute part sub-score
          const partQs = pq.filter(pq2 => pq2.partId === currentPart);
          const partEarned = partQs.reduce((s, pq2) => s + pq2.earned, 0);
          const partTotal = partQs.reduce((s, pq2) => s + pq2.possible, 0);
          h.push(
            `<tr class="zu-part-header">
              <td colspan="4">${escape(fmtPart(currentPart))}</td>
              <td>${partEarned} / ${partTotal}</td>
            </tr>`
          );
        }
        const correctText = fmtCorrect(q.correctAnswer);
        const studentText = fmtStudentValue(q.studentValue);
        const rowClass = q.earned >= q.possible ? 'zu-row-correct'
                       : q.studentValue == null || q.studentValue === '' ? 'zu-row-blank'
                       : 'zu-row-wrong';
        h.push(
          `<tr class="${rowClass}">
            <td>${i + 1}</td>
            <td>${escape(fmtType(q.type))}</td>
            <td>${escape(studentText)}</td>
            <td class="zu-correct-cell">${escape(correctText)}</td>
            <td>${q.earned} / ${q.possible}</td>
          </tr>`
        );
      });
      h.push('</tbody></table></div>');
      body.innerHTML = h.join('');
      show(detailView);
    } catch (e) {
      showAdminError('Failed to open submission: ' + e.message);
    }
  }

  // Lightweight error modal matching the test runner's .ct-error-card style
  // so the admin's failure path doesn't fall back to a native alert().
  function showAdminError(text) {
    const overlay = document.createElement('div');
    overlay.className = 'ct-error-modal';
    const card = document.createElement('div');
    card.className = 'ct-error-card';
    const h = document.createElement('h3');
    h.textContent = 'Problem';
    const p = document.createElement('p');
    p.textContent = text;
    const btn = document.createElement('button');
    btn.textContent = 'OK';
    btn.addEventListener('click', () => overlay.remove());
    card.appendChild(h);
    card.appendChild(p);
    card.appendChild(btn);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  // ---------- events ----------
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pw = document.getElementById('pw').value;
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'login failed');
      token = body.token;
      sessionStorage.setItem('olympiada:admin-token', token);
      show(listView);
      loadRows();
    } catch (err) {
      const e = document.getElementById('login-err');
      e.textContent = err.message;
      e.hidden = false;
    }
  });

  document.getElementById('refresh').addEventListener('click', loadRows);
  document.getElementById('back-btn').addEventListener('click', () => show(listView));

  document.getElementById('export-json').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    triggerDownload(blob, 'olympiada-results.json');
  });

  document.getElementById('export-csv').addEventListener('click', () => {
    const header = ['finishedAt', 'student', 'group', 'lang', 'skill', 'earned', 'total'];
    const lines = [header.join(',')];
    rows.forEach((r) => {
      lines.push(header.map((k) => csv(r[k])).join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    triggerDownload(blob, 'olympiada-results.csv');
  });

  function csv(v) {
    if (v == null) return '';
    const s = String(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function triggerDownload(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  // ---------- boot ----------
  if (token) {
    show(listView);
    loadRows();
  } else {
    show(loginView);
  }
})();
