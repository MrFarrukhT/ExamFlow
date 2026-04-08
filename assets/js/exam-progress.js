// Exam Progress — progress badge + review modal for reading/listening tests
// Shows "X/40 answered" in the header and provides a review modal before submission.
(function () {
    'use strict';

    const TOTAL_QUESTIONS = 40;

    // --- Progress Badge ---

    function createProgressBadge() {
        const timerContainer = document.querySelector('.timer-container');
        if (!timerContainer) return null;

        const badge = document.createElement('div');
        badge.id = 'progress-badge';
        badge.setAttribute('aria-live', 'polite');
        badge.title = 'Questions answered';
        badge.textContent = '0 / 40';

        // Insert after timer container
        timerContainer.parentNode.insertBefore(badge, timerContainer.nextSibling);

        // Inject styles once
        if (!document.getElementById('exam-progress-styles')) {
            const style = document.createElement('style');
            style.id = 'exam-progress-styles';
            style.textContent = `
                #progress-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 4px 12px;
                    border-radius: 16px;
                    font-size: 13px;
                    font-weight: 600;
                    font-family: inherit;
                    background: #e3f2fd;
                    color: #1565c0;
                    border: 1px solid #bbdefb;
                    transition: background 0.3s, color 0.3s;
                    white-space: nowrap;
                    margin-left: 10px;
                }
                #progress-badge.all-done {
                    background: #e8f5e9;
                    color: #2e7d32;
                    border-color: #a5d6a7;
                }
                #progress-badge.low {
                    background: #fff3e0;
                    color: #e65100;
                    border-color: #ffcc80;
                }

                /* Review Modal */
                .review-overlay {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.6);
                    backdrop-filter: blur(3px);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 100000;
                    animation: reviewFadeIn 0.2s ease-out;
                }
                @keyframes reviewFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .review-modal {
                    background: #fff;
                    border-radius: 12px;
                    max-width: 540px;
                    width: 92%;
                    max-height: 80vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    animation: reviewSlideIn 0.25s ease-out;
                }
                @keyframes reviewSlideIn {
                    from { opacity: 0; transform: translateY(-30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .review-header {
                    padding: 20px 24px 12px;
                    border-bottom: 1px solid #e0e0e0;
                }
                .review-header h2 {
                    margin: 0 0 4px;
                    font-size: 1.25rem;
                    color: #2c3e50;
                }
                .review-summary {
                    display: flex; gap: 16px; flex-wrap: wrap;
                    font-size: 0.9rem; color: #555;
                }
                .review-summary .stat {
                    font-weight: 600;
                }
                .review-summary .stat.warning { color: #e65100; }
                .review-summary .stat.good { color: #2e7d32; }
                .review-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 16px 24px;
                }
                .review-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(48px, 1fr));
                    gap: 6px;
                }
                .review-q {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    aspect-ratio: 1;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    border: 2px solid #e0e0e0;
                    background: #fafafa;
                    color: #999;
                    transition: all 0.15s;
                }
                .review-q.answered {
                    background: #e8f5e9;
                    color: #2e7d32;
                    border-color: #a5d6a7;
                }
                .review-q.unanswered {
                    background: #fff3e0;
                    color: #e65100;
                    border-color: #ffcc80;
                }
                .review-footer {
                    padding: 16px 24px;
                    border-top: 1px solid #e0e0e0;
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                }
                .review-btn {
                    padding: 10px 24px;
                    border-radius: 6px;
                    font-size: 0.95rem;
                    font-weight: 600;
                    cursor: pointer;
                    border: none;
                    transition: all 0.2s;
                }
                .review-btn.secondary {
                    background: #f5f5f5;
                    color: #333;
                    border: 1px solid #ddd;
                }
                .review-btn.secondary:hover {
                    background: #eee;
                }
                .review-btn.primary {
                    background: #1976d2;
                    color: white;
                }
                .review-btn.primary:hover {
                    background: #1565c0;
                    box-shadow: 0 2px 8px rgba(25,118,210,0.3);
                }
                .review-unanswered-note {
                    margin-top: 12px;
                    padding: 10px 14px;
                    border-radius: 8px;
                    background: #fff3e0;
                    color: #e65100;
                    font-size: 0.88rem;
                    line-height: 1.4;
                }
                .review-all-done-note {
                    margin-top: 12px;
                    padding: 10px 14px;
                    border-radius: 8px;
                    background: #e8f5e9;
                    color: #2e7d32;
                    font-size: 0.88rem;
                    line-height: 1.4;
                }
            `;
            document.head.appendChild(style);
        }

        return badge;
    }

    function countAnswered() {
        const navButtons = document.querySelectorAll('.subQuestion.answered');
        return navButtons.length;
    }

    function updateBadge(badge) {
        const answered = countAnswered();
        badge.textContent = answered + ' / ' + TOTAL_QUESTIONS;

        badge.classList.remove('all-done', 'low');
        if (answered === TOTAL_QUESTIONS) {
            badge.classList.add('all-done');
        } else if (answered < TOTAL_QUESTIONS / 2) {
            badge.classList.add('low');
        }
    }

    // --- Review Modal ---

    function showReviewModal(onSubmit, onCancel) {
        // Remove any existing modal
        const existing = document.querySelector('.review-overlay');
        if (existing) existing.remove();

        const answered = countAnswered();
        const unanswered = TOTAL_QUESTIONS - answered;
        const skill = document.body.dataset.skill || 'test';
        const skillLabel = skill.charAt(0).toUpperCase() + skill.slice(1);

        const overlay = document.createElement('div');
        overlay.className = 'review-overlay';

        // Build question grid
        let gridHTML = '';
        const navButtons = document.querySelectorAll('.subQuestion');
        const answeredSet = new Set();
        navButtons.forEach(function (btn) {
            const qNum = parseInt(btn.textContent, 10);
            if (btn.classList.contains('answered')) answeredSet.add(qNum);
        });

        for (let i = 1; i <= TOTAL_QUESTIONS; i++) {
            const isAnswered = answeredSet.has(i);
            gridHTML += '<div class="review-q ' + (isAnswered ? 'answered' : 'unanswered') + '">' + i + '</div>';
        }

        let noteHTML = '';
        if (unanswered > 0) {
            noteHTML = '<div class="review-unanswered-note">You have <strong>' + unanswered +
                ' unanswered question' + (unanswered > 1 ? 's' : '') +
                '</strong>. You will not be able to return to this section after submitting.</div>';
        } else {
            noteHTML = '<div class="review-all-done-note">All questions answered. Ready to submit.</div>';
        }

        overlay.innerHTML =
            '<div class="review-modal">' +
                '<div class="review-header">' +
                    '<h2>Review — ' + skillLabel + ' Test</h2>' +
                    '<div class="review-summary">' +
                        '<span>Answered: <span class="stat good">' + answered + '</span></span>' +
                        (unanswered > 0 ? '<span>Unanswered: <span class="stat warning">' + unanswered + '</span></span>' : '') +
                        '<span>Total: <span class="stat">' + TOTAL_QUESTIONS + '</span></span>' +
                    '</div>' +
                '</div>' +
                '<div class="review-body">' +
                    '<div class="review-grid">' + gridHTML + '</div>' +
                    noteHTML +
                '</div>' +
                '<div class="review-footer">' +
                    '<button class="review-btn secondary" id="review-cancel-btn">Go Back</button>' +
                    '<button class="review-btn primary" id="review-submit-btn">Submit ' + skillLabel + '</button>' +
                '</div>' +
            '</div>';

        document.body.appendChild(overlay);

        document.getElementById('review-submit-btn').addEventListener('click', function () {
            overlay.remove();
            if (onSubmit) onSubmit();
        });

        document.getElementById('review-cancel-btn').addEventListener('click', function () {
            overlay.remove();
            if (onCancel) onCancel();
        });

        // Close on overlay background click
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) {
                overlay.remove();
                if (onCancel) onCancel();
            }
        });

        // Close on Escape
        function handleEscape(e) {
            if (e.key === 'Escape') {
                overlay.remove();
                if (onCancel) onCancel();
                document.removeEventListener('keydown', handleEscape);
            }
        }
        document.addEventListener('keydown', handleEscape);
    }

    // --- Init ---

    function init() {
        const badge = createProgressBadge();
        if (!badge) return;

        // Update immediately and on input/change
        updateBadge(badge);
        document.body.addEventListener('input', function () { updateBadge(badge); });
        document.body.addEventListener('change', function () { updateBadge(badge); });

        // Also poll every 2 seconds (catches drag-drop and programmatic changes)
        setInterval(function () { updateBadge(badge); }, 2000);
    }

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // Delay slightly to let other scripts set up nav buttons
        setTimeout(init, 500);
    }

    // Expose for submission flows
    window.examProgress = {
        showReviewModal: showReviewModal,
        countAnswered: countAnswered
    };
})();
