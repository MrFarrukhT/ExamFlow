// Admin results viewer — password-gated, reads from backups/ folder via the server.
// ADR-036: password in localStorage for this session only, cleared on tab close.

(function () {
  'use strict';

  let token = sessionStorage.getItem('olympiada:admin-token') || '';
  let rows = [];

  const loginView = document.getElementById('login-view');
  const listView = document.getElementById('list-view');
  const detailView = document.getElementById('detail-view');

  function show(view) {
    loginView.hidden = view !== loginView;
    listView.hidden = view !== listView;
    detailView.hidden = view !== detailView;
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

  function renderRows() {
    const tbody = document.getElementById('rows-body');
    tbody.innerHTML = '';
    rows.forEach((r) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${fmtTime(r.finishedAt)}</td>
        <td>${escape(r.student)}</td>
        <td>${escape(r.group || '')}</td>
        <td>${escape(r.lang || '')}</td>
        <td>${escape(r.skill || '')}</td>
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
      parts.push(`<h2>${escape(rec.student)} — ${escape(rec.lang)} / ${escape(rec.skill)}</h2>`);
      parts.push(`<p><strong>Score:</strong> ${rec.score.earned} / ${rec.score.total}</p>`);
      parts.push(`<p><strong>Started:</strong> ${fmtTime(rec.startedAt)} &nbsp; <strong>Finished:</strong> ${fmtTime(rec.finishedAt)}</p>`);
      parts.push('<table class="zu-admin-table"><thead><tr><th>Q</th><th>Type</th><th>Student</th><th>Correct</th><th>Points</th></tr></thead><tbody>');
      (rec.score.perQuestion || []).forEach((q) => {
        parts.push(
          `<tr>
            <td>${escape(q.qid)}</td>
            <td>${escape(q.type)}</td>
            <td>${escape(JSON.stringify(q.studentValue))}</td>
            <td>${escape(JSON.stringify(q.correctAnswer))}</td>
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
