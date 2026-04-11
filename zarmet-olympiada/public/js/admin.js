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
    // full width for list/detail which need room for the table.
    if (view === loginView) {
      adminPage.classList.add('page--narrow');
    } else {
      adminPage.classList.remove('page--narrow');
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

  function renderRows() {
    const tbody = document.getElementById('rows-body');
    tbody.innerHTML = '';
    if (rows.length === 0) {
      rowsTable.style.display = 'none';
      emptyState.hidden = false;
      return;
    }
    rowsTable.style.display = '';
    emptyState.hidden = true;
    rows.forEach((r) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${fmtTime(r.finishedAt)}</td>
        <td>${escape(r.student)}</td>
        <td>${escape(r.group || '—')}</td>
        <td>${escape(fmtLang(r.lang))}</td>
        <td>${escape(fmtSkill(r.skill))}</td>
        <td>${r.earned ?? '-'} / ${r.total ?? '-'}</td>
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
      const parts = [];
      parts.push(`<h2>${escape(rec.student)} — ${escape(fmtLang(rec.lang))} / ${escape(fmtSkill(rec.skill))}</h2>`);
      parts.push(`<p><strong>Score:</strong> ${rec.score.earned} / ${rec.score.total}</p>`);
      parts.push(`<p><strong>Started:</strong> ${fmtTime(rec.startedAt)} &nbsp; <strong>Finished:</strong> ${fmtTime(rec.finishedAt)}</p>`);
      parts.push('<table class="zu-admin-table"><thead><tr><th>Q</th><th>Type</th><th>Student</th><th>Correct</th><th>Points</th></tr></thead><tbody>');
      (rec.score.perQuestion || []).forEach((q) => {
        const correctText = fmtCorrect(q.correctAnswer);
        const studentText = fmtStudentValue(q.studentValue);
        const rowClass = q.earned >= q.possible ? 'zu-row-correct'
                       : q.studentValue == null || q.studentValue === '' ? 'zu-row-blank'
                       : 'zu-row-wrong';
        parts.push(
          `<tr class="${rowClass}">
            <td>${escape(q.qid)}</td>
            <td>${escape(q.type)}</td>
            <td>${escape(studentText)}</td>
            <td>${escape(correctText)}</td>
            <td>${q.earned} / ${q.possible}</td>
          </tr>`
        );
      });
      parts.push('</tbody></table>');
      body.innerHTML = parts.join('');
      show(detailView);
    } catch (e) {
      alert('Failed to open submission: ' + e.message);
    }
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
