// Cambridge Exam Progress — progress badge for Cambridge test wrappers
// Mirrors the IELTS exam-progress.js pattern but adapted for Cambridge:
//  - Counts answers from `cambridge-{module}Answers` localStorage key
//  - Total questions vary by level + skill
//  - Badge added next to fixed-position timer container
(function () {
    'use strict';

    // Total question counts per level + skill
    // These match the actual exam structure (not the per-mock variations)
    const TOTALS = {
        'A1-Movers':       { 'reading-writing': 35, 'listening': 25, 'speaking': null },
        'A2-Key':          { 'reading-writing': 30, 'listening': 25, 'speaking': null },
        'B1-Preliminary':  { 'reading': 32, 'writing': 2, 'listening': 25, 'speaking': null, 'reading-writing': 32 },
        'B2-First':        { 'reading': 32, 'writing': 2, 'listening': 25, 'speaking': null }
    };

    function getTotalQuestions() {
        const level = localStorage.getItem('cambridgeLevel');
        const module = (typeof window.__cambridgeModule === 'string' && window.__cambridgeModule)
            || detectModuleFromUrl();
        if (!level || !module) return null;
        const levelTotals = TOTALS[level];
        if (!levelTotals) return null;
        return levelTotals[module] || null;
    }

    function detectModuleFromUrl() {
        const path = (location.pathname || '').toLowerCase();
        if (path.includes('reading-writing')) return 'reading-writing';
        if (path.includes('listening')) return 'listening';
        if (path.includes('writing')) return 'writing';
        if (path.includes('reading')) return 'reading';
        if (path.includes('speaking')) return 'speaking';
        return null;
    }

    function countAnswered() {
        const module = (typeof window.__cambridgeModule === 'string' && window.__cambridgeModule)
            || detectModuleFromUrl();
        if (!module) return 0;
        const key = 'cambridge-' + module + 'Answers';
        let answers;
        try {
            answers = JSON.parse(localStorage.getItem(key) || '{}');
        } catch (e) {
            return 0;
        }
        if (!answers || typeof answers !== 'object') return 0;
        let count = 0;
        Object.keys(answers).forEach(function (k) {
            const v = answers[k];
            if (v == null) return;
            if (typeof v === 'string' && v.trim() === '') return;
            if (typeof v === 'object' && Object.keys(v).length === 0) return;
            count++;
        });
        return count;
    }

    function createBadge() {
        const existing = document.getElementById('cambridge-progress-badge');
        if (existing) return existing;

        const total = getTotalQuestions();
        if (total === null) return null; // unknown level/skill — skip

        const badge = document.createElement('div');
        badge.id = 'cambridge-progress-badge';
        badge.setAttribute('aria-live', 'polite');
        badge.title = 'Questions answered';
        badge.textContent = '0 / ' + total;

        // Position next to the fixed timer container at top center
        document.body.appendChild(badge);

        // Inject styles once
        if (!document.getElementById('cambridge-progress-styles')) {
            const style = document.createElement('style');
            style.id = 'cambridge-progress-styles';
            style.textContent = ''
                + '#cambridge-progress-badge {'
                + '  position: fixed;'
                + '  top: 14px;'
                + '  right: 20px;'
                + '  padding: 5px 14px;'
                + '  border-radius: 16px;'
                + '  font-size: 13px;'
                + '  font-weight: 600;'
                + '  font-family: system-ui, -apple-system, sans-serif;'
                + '  background: #e3f2fd;'
                + '  color: #1565c0;'
                + '  border: 1px solid #bbdefb;'
                + '  z-index: 999999;'
                + '  transition: background 0.3s, color 0.3s;'
                + '  white-space: nowrap;'
                + '  box-shadow: 0 1px 3px rgba(0,0,0,0.08);'
                + '  pointer-events: none;'
                + '}'
                + '#cambridge-progress-badge.all-done {'
                + '  background: #e8f5e9;'
                + '  color: #2e7d32;'
                + '  border-color: #a5d6a7;'
                + '}'
                + '#cambridge-progress-badge.low {'
                + '  background: #fff3e0;'
                + '  color: #e65100;'
                + '  border-color: #ffcc80;'
                + '}';
            document.head.appendChild(style);
        }

        return badge;
    }

    function updateBadge(badge) {
        if (!badge) return;
        const total = getTotalQuestions();
        if (total === null) return;
        const answered = countAnswered();
        badge.textContent = answered + ' / ' + total;
        badge.classList.remove('all-done', 'low');
        if (answered >= total) {
            badge.classList.add('all-done');
        } else if (answered < total / 2) {
            badge.classList.add('low');
        }
    }

    function init() {
        const badge = createBadge();
        if (!badge) return;
        updateBadge(badge);

        // Update on storage events (covers cross-iframe answer changes)
        window.addEventListener('storage', function () { updateBadge(badge); });

        // Poll every 2 seconds (catches in-iframe localStorage writes)
        setInterval(function () { updateBadge(badge); }, 2000);
    }

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // Delay slightly to let timer.js render its container first
        setTimeout(init, 600);
    }

    // Expose for submission flows
    window.cambridgeExamProgress = {
        countAnswered: countAnswered,
        getTotalQuestions: getTotalQuestions
    };
})();
