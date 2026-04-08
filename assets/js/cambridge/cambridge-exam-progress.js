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
        'B2-First':        { 'reading': 32, 'writing': 2, 'listening': 25, 'speaking': null },
        'C1-Advanced':     { 'reading': 56, 'writing': 2, 'listening': 30, 'speaking': null }
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

    // ─────────────────────────────────────────────────────────────
    // Review Modal — shown before submission
    // ─────────────────────────────────────────────────────────────

    function injectModalStyles() {
        if (document.getElementById('cambridge-review-styles')) return;
        const style = document.createElement('style');
        style.id = 'cambridge-review-styles';
        style.textContent = ''
            + '.cambridge-review-overlay {'
            + '  position: fixed; top: 0; left: 0; width: 100%; height: 100%;'
            + '  background: rgba(0,0,0,0.6); backdrop-filter: blur(3px);'
            + '  display: flex; align-items: center; justify-content: center;'
            + '  z-index: 1000000;'
            + '  animation: cReviewFadeIn 0.2s ease-out;'
            + '  font-family: system-ui, -apple-system, sans-serif;'
            + '}'
            + '@keyframes cReviewFadeIn { from { opacity: 0; } to { opacity: 1; } }'
            + '.cambridge-review-modal {'
            + '  background: #fff; border-radius: 12px;'
            + '  max-width: 540px; width: 92%; max-height: 80vh;'
            + '  display: flex; flex-direction: column;'
            + '  box-shadow: 0 20px 60px rgba(0,0,0,0.3);'
            + '  animation: cReviewSlideIn 0.25s ease-out;'
            + '}'
            + '@keyframes cReviewSlideIn {'
            + '  from { opacity: 0; transform: translateY(-30px); }'
            + '  to { opacity: 1; transform: translateY(0); }'
            + '}'
            + '.cambridge-review-header {'
            + '  padding: 20px 24px 12px;'
            + '  border-bottom: 1px solid #e0e0e0;'
            + '}'
            + '.cambridge-review-header h2 {'
            + '  margin: 0 0 4px;'
            + '  font-size: 1.25rem;'
            + '  color: #2c3e50;'
            + '}'
            + '.cambridge-review-summary {'
            + '  display: flex; gap: 16px; flex-wrap: wrap;'
            + '  font-size: 0.9rem; color: #555;'
            + '}'
            + '.cambridge-review-summary .stat { font-weight: 600; }'
            + '.cambridge-review-summary .stat.warning { color: #e65100; }'
            + '.cambridge-review-summary .stat.good { color: #2e7d32; }'
            + '.cambridge-review-body {'
            + '  flex: 1; overflow-y: auto; padding: 16px 24px;'
            + '}'
            + '.cambridge-review-grid {'
            + '  display: grid;'
            + '  grid-template-columns: repeat(auto-fill, minmax(48px, 1fr));'
            + '  gap: 6px;'
            + '}'
            + '.cambridge-review-q {'
            + '  display: flex; align-items: center; justify-content: center;'
            + '  width: 100%; aspect-ratio: 1; border-radius: 8px;'
            + '  font-size: 14px; font-weight: 600;'
            + '  border: 2px solid #e0e0e0;'
            + '  background: #fafafa; color: #999;'
            + '}'
            + '.cambridge-review-q.answered {'
            + '  background: #e8f5e9; color: #2e7d32; border-color: #a5d6a7;'
            + '}'
            + '.cambridge-review-q.unanswered {'
            + '  background: #fff3e0; color: #e65100; border-color: #ffcc80;'
            + '}'
            + '.cambridge-review-footer {'
            + '  padding: 16px 24px;'
            + '  border-top: 1px solid #e0e0e0;'
            + '  display: flex; gap: 12px; justify-content: flex-end;'
            + '}'
            + '.cambridge-review-btn {'
            + '  padding: 10px 24px; border-radius: 6px;'
            + '  font-size: 0.95rem; font-weight: 600;'
            + '  cursor: pointer; border: none;'
            + '  transition: all 0.2s;'
            + '  font-family: inherit;'
            + '}'
            + '.cambridge-review-btn.secondary {'
            + '  background: #f5f5f5; color: #333;'
            + '  border: 1px solid #ddd;'
            + '}'
            + '.cambridge-review-btn.secondary:hover { background: #eee; }'
            + '.cambridge-review-btn.primary {'
            + '  background: #1976d2; color: white;'
            + '}'
            + '.cambridge-review-btn.primary:hover {'
            + '  background: #1565c0;'
            + '  box-shadow: 0 2px 8px rgba(25,118,210,0.3);'
            + '}'
            + '.cambridge-review-note {'
            + '  margin-top: 12px;'
            + '  padding: 10px 14px;'
            + '  border-radius: 8px;'
            + '  font-size: 0.88rem;'
            + '  line-height: 1.4;'
            + '}'
            + '.cambridge-review-note.warning {'
            + '  background: #fff3e0; color: #e65100;'
            + '}'
            + '.cambridge-review-note.success {'
            + '  background: #e8f5e9; color: #2e7d32;'
            + '}';
        document.head.appendChild(style);
    }

    function showReviewModal(skill, onConfirm, onCancel) {
        injectModalStyles();
        const existing = document.querySelector('.cambridge-review-overlay');
        if (existing) existing.remove();

        const total = getTotalQuestions() || 0;
        const answered = countAnswered();
        const unanswered = Math.max(0, total - answered);
        const skillLabel = skill ? (skill.charAt(0).toUpperCase() + skill.slice(1).replace('-', ' & ')) : 'Test';

        // Build question grid (only if total is known and reasonable)
        let gridHTML = '';
        if (total > 0 && total <= 80) {
            const key = 'cambridge-' + (skill || detectModuleFromUrl() || '') + 'Answers';
            let answers = {};
            try { answers = JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) {}
            const answeredSet = new Set();
            Object.keys(answers).forEach(function (k) {
                const v = answers[k];
                if (v == null) return;
                if (typeof v === 'string' && v.trim() === '') return;
                if (typeof v === 'object' && Object.keys(v).length === 0) return;
                // Try to extract numeric question number
                const num = parseInt(String(k).replace(/\D/g, ''), 10);
                if (!isNaN(num)) answeredSet.add(num);
            });
            for (let i = 1; i <= total; i++) {
                gridHTML += '<div class="cambridge-review-q ' + (answeredSet.has(i) ? 'answered' : 'unanswered') + '">' + i + '</div>';
            }
        }

        const noteHTML = unanswered > 0
            ? '<div class="cambridge-review-note warning">You have <strong>' + unanswered + ' unanswered question' + (unanswered > 1 ? 's' : '') + '</strong>. You will not be able to return to this section after submitting.</div>'
            : '<div class="cambridge-review-note success">All questions answered. Ready to submit.</div>';

        const overlay = document.createElement('div');
        overlay.className = 'cambridge-review-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.innerHTML =
            '<div class="cambridge-review-modal">'
            + '<div class="cambridge-review-header">'
            + '<h2>Review &mdash; ' + skillLabel + '</h2>'
            + '<div class="cambridge-review-summary">'
            + '<span>Answered: <span class="stat good">' + answered + '</span></span>'
            + (total > 0 ? '<span>Total: <span class="stat">' + total + '</span></span>' : '')
            + (unanswered > 0 ? '<span>Unanswered: <span class="stat warning">' + unanswered + '</span></span>' : '')
            + '</div>'
            + '</div>'
            + '<div class="cambridge-review-body">'
            + (gridHTML ? '<div class="cambridge-review-grid">' + gridHTML + '</div>' : '')
            + noteHTML
            + '</div>'
            + '<div class="cambridge-review-footer">'
            + '<button class="cambridge-review-btn secondary" id="c-review-cancel">Go Back</button>'
            + '<button class="cambridge-review-btn primary" id="c-review-submit">Submit ' + skillLabel + '</button>'
            + '</div>'
            + '</div>';

        document.body.appendChild(overlay);

        function cleanup() {
            overlay.remove();
            document.removeEventListener('keydown', escHandler);
        }
        function escHandler(e) {
            if (e.key === 'Escape') {
                cleanup();
                if (onCancel) onCancel();
            }
        }
        document.addEventListener('keydown', escHandler);

        document.getElementById('c-review-submit').addEventListener('click', function () {
            cleanup();
            if (onConfirm) onConfirm();
        });
        document.getElementById('c-review-cancel').addEventListener('click', function () {
            cleanup();
            if (onCancel) onCancel();
        });
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) {
                cleanup();
                if (onCancel) onCancel();
            }
        });
    }

    // ─────────────────────────────────────────────────────────────
    // Iframe deliver-button interceptor
    // Polls iframe for deliver-button, hijacks click via capture phase
    // ─────────────────────────────────────────────────────────────

    function setupDeliverInterceptor() {
        const frame = document.getElementById('part-frame');
        if (!frame) return;

        let attached = new WeakSet();

        function attach() {
            try {
                const doc = frame.contentDocument;
                if (!doc) return;
                const btn = doc.getElementById('deliver-button');
                if (!btn || attached.has(btn)) return;
                attached.add(btn);

                // Capture-phase interceptor — runs before existing handlers
                btn.addEventListener('click', function (e) {
                    if (btn.dataset.cambridgeReviewed === 'true') {
                        // User confirmed via review modal — let the original handler run
                        return;
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();

                    const skill = (typeof window.__cambridgeModule === 'string' && window.__cambridgeModule)
                        || detectModuleFromUrl();

                    showReviewModal(skill, function onConfirm() {
                        // Mark as reviewed and re-dispatch the click
                        btn.dataset.cambridgeReviewed = 'true';
                        // Use a fresh click event to trigger the original handler
                        btn.click();
                        // Reset flag after a tick (in case user cancels at next prompt)
                        setTimeout(function () { delete btn.dataset.cambridgeReviewed; }, 1000);
                    }, function onCancel() {
                        // User clicked "Go Back" — do nothing, they can keep editing
                    });
                }, true); // capture phase
            } catch (err) {
                // Cross-origin or DOM access issues — silently skip
            }
        }

        // Poll every 1.5s — picks up the button after iframe navigates between parts
        setInterval(attach, 1500);
        attach();
    }

    function init() {
        const badge = createBadge();
        if (badge) {
            updateBadge(badge);
            window.addEventListener('storage', function () { updateBadge(badge); });
            setInterval(function () { updateBadge(badge); }, 2000);
        }

        // Set up review modal interceptor (works even without badge)
        setupDeliverInterceptor();
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
        getTotalQuestions: getTotalQuestions,
        showReviewModal: showReviewModal
    };
})();
