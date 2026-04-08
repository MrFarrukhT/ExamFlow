// Welcome Guide — one-time orientation overlay for first-time students.
// Include on dashboard pages. Shows once per student (tracked in localStorage).

(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        const studentId = localStorage.getItem('studentId');
        if (!studentId) return;

        const key = `welcomeGuideSeen_${studentId}`;
        if (localStorage.getItem(key)) return;

        const examType = localStorage.getItem('examType') || 'IELTS';
        showWelcomeGuide(examType, key);
    });

    function showWelcomeGuide(examType, storageKey) {
        const isIELTS = examType === 'IELTS';
        const examName = isIELTS ? 'IELTS Academic' : 'Cambridge English';
        const modulesText = isIELTS
            ? 'Listening (~30 min), Reading (60 min), and Writing (60 min)'
            : 'the modules shown on your dashboard (timing varies by level)';

        const overlay = document.createElement('div');
        overlay.id = 'welcome-guide-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Welcome guide');
        overlay.style.cssText = `
            position: fixed; inset: 0;
            background: rgba(0,0,0,0.6);
            backdrop-filter: blur(4px);
            z-index: 10000;
            display: flex; align-items: center; justify-content: center;
            animation: wgFadeIn 0.3s ease-out;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        `;

        overlay.innerHTML = `
            <style>
                @keyframes wgFadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes wgSlideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
                .wg-card {
                    background: #fff; border-radius: 16px; max-width: 520px; width: 90%;
                    padding: 32px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    animation: wgSlideUp 0.4s ease-out;
                    max-height: 90vh; overflow-y: auto;
                }
                .wg-header { text-align: center; margin-bottom: 24px; }
                .wg-icon { font-size: 48px; margin-bottom: 8px; display: block; }
                .wg-title { font-size: 22px; font-weight: 700; color: #1a237e; margin: 0 0 4px; }
                .wg-subtitle { font-size: 14px; color: #757575; margin: 0; }
                .wg-steps { list-style: none; padding: 0; margin: 0 0 24px; }
                .wg-step {
                    display: flex; align-items: flex-start; gap: 12px;
                    padding: 12px 0; border-bottom: 1px solid #f0f0f0;
                }
                .wg-step:last-child { border-bottom: none; }
                .wg-step-icon {
                    flex-shrink: 0; width: 36px; height: 36px;
                    background: #e3f2fd; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 18px;
                }
                .wg-step-text { flex: 1; }
                .wg-step-title { font-weight: 600; color: #333; font-size: 14px; margin-bottom: 2px; }
                .wg-step-desc { font-size: 13px; color: #666; line-height: 1.4; }
                .wg-reassurance {
                    background: #e8f5e9; border-radius: 8px; padding: 12px 16px;
                    margin-bottom: 24px; font-size: 13px; color: #2e7d32; line-height: 1.5;
                    display: flex; align-items: flex-start; gap: 8px;
                }
                .wg-reassurance-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
                .wg-btn {
                    display: block; width: 100%; padding: 14px;
                    background: linear-gradient(135deg, #1976d2, #1565c0);
                    color: #fff; border: none; border-radius: 8px;
                    font-size: 16px; font-weight: 600; cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .wg-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(25,118,210,0.35); }
                .wg-btn:active { transform: translateY(0); }
            </style>
            <div class="wg-card">
                <div class="wg-header">
                    <span class="wg-icon" aria-hidden="true">&#128075;</span>
                    <h2 class="wg-title">Welcome to Your ${examName} Test</h2>
                    <p class="wg-subtitle">Here's what you need to know before you begin</p>
                </div>
                <ul class="wg-steps">
                    <li class="wg-step">
                        <div class="wg-step-icon" aria-hidden="true">&#128196;</div>
                        <div class="wg-step-text">
                            <div class="wg-step-title">Your Test Modules</div>
                            <div class="wg-step-desc">You will complete ${modulesText}. You can do them in any order.</div>
                        </div>
                    </li>
                    <li class="wg-step">
                        <div class="wg-step-icon" aria-hidden="true">&#128190;</div>
                        <div class="wg-step-text">
                            <div class="wg-step-title">Your Answers Are Saved Automatically</div>
                            <div class="wg-step-desc">Every 30 seconds, your work is saved. You'll see a small confirmation at the bottom of the screen. Don't worry about losing your answers.</div>
                        </div>
                    </li>
                    <li class="wg-step">
                        <div class="wg-step-icon" aria-hidden="true">&#9202;</div>
                        <div class="wg-step-text">
                            <div class="wg-step-title">Watch the Timer</div>
                            <div class="wg-step-desc">Each module is timed. You'll get warnings at 10 minutes, 5 minutes, and 1 minute before time runs out.</div>
                        </div>
                    </li>
                    <li class="wg-step">
                        <div class="wg-step-icon" aria-hidden="true">&#9989;</div>
                        <div class="wg-step-text">
                            <div class="wg-step-title">Submit When Ready</div>
                            <div class="wg-step-desc">When you finish a module, click Submit. You'll see a summary of your answers before confirming. After submitting, you'll return here to start the next module.</div>
                        </div>
                    </li>
                </ul>
                <div class="wg-reassurance">
                    <span class="wg-reassurance-icon" aria-hidden="true">&#128274;</span>
                    <span>If anything goes wrong (internet drops, page refreshes), your answers are safely stored on this device. Just log back in and continue where you left off.</span>
                </div>
                <button class="wg-btn" id="wg-start-btn" autofocus>Got it — let's start</button>
            </div>
        `;

        document.body.appendChild(overlay);

        // Focus the button
        const btn = document.getElementById('wg-start-btn');
        if (btn) {
            btn.focus();
            btn.addEventListener('click', function () {
                localStorage.setItem(storageKey, 'true');
                overlay.style.opacity = '0';
                overlay.style.transition = 'opacity 0.25s ease';
                setTimeout(function () { if (overlay.parentNode) overlay.remove(); }, 250);
            });
        }

        // Close on Escape
        overlay.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                btn.click();
            }
        });
    }
})();
