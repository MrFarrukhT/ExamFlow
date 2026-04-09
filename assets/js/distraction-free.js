// Distraction-Free Mode Manager
// Provides secure test environment with fullscreen mode + visible monitoring + accurate violation tracking

class DistractionFreeMode {
    constructor() {
        this.isEnabled = sessionStorage.getItem('distractionFreeMode') === 'true';
        // Anti-cheat counters — persisted across page navigations via sessionStorage
        this.counters = this._loadCounters();
        this._injectStyles();
        if (this.isEnabled) {
            this.init();
            this._mountSecureBadge();
        }
        // Always track focus/visibility events even if fullscreen disabled
        this._setupViolationTracking();
    }

    _loadCounters() {
        try {
            const raw = sessionStorage.getItem('antiCheatCounters');
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return {
            tabSwitches: 0,
            windowBlurs: 0,
            fullscreenExits: 0,
            copyAttempts: 0,
            pasteAttempts: 0,
            rightClickAttempts: 0,
            blockedShortcuts: 0,
            backNavAttempts: 0,
            firstViolationAt: null,
            lastViolationAt: null
        };
    }

    // Public: clear all counters. Called from launcher when starting a fresh test session
    // so violations from a previous test in the same browser tab don't pollute the new one.
    static resetCounters() {
        try { sessionStorage.removeItem('antiCheatCounters'); } catch (e) {}
    }

    _saveCounters() {
        try {
            sessionStorage.setItem('antiCheatCounters', JSON.stringify(this.counters));
        } catch (e) {}
    }

    _recordViolation(type) {
        if (typeof this.counters[type] === 'number') this.counters[type]++;
        const now = new Date().toISOString();
        if (!this.counters.firstViolationAt) this.counters.firstViolationAt = now;
        this.counters.lastViolationAt = now;
        this._saveCounters();
    }

    _setupViolationTracking() {
        // Tab switch / page visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) this._recordViolation('tabSwitches');
        });
        // Window blur (clicked outside the browser)
        window.addEventListener('blur', () => this._recordViolation('windowBlurs'));
    }

    init() {
        this.requestFullscreen();
        this.preventUnwantedActions();
        this.monitorFullscreen();
    }

    requestFullscreen() {
        const elem = document.documentElement;
        
        if (document.fullscreenElement) return;
        
        const request = elem.requestFullscreen || 
                       elem.webkitRequestFullscreen || 
                       elem.mozRequestFullScreen || 
                       elem.msRequestFullscreen;
        
        if (request) {
            request.call(elem).catch(err => {});
        }
    }

    monitorFullscreen() {
        const isInFullscreen = () => !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        );

        const checkFullscreen = () => {
            if (!isInFullscreen()) {
                this._recordViolation('fullscreenExits');
                this.showFullscreenWarning();
            } else {
                // Student returned to fullscreen on their own (e.g. via F11) — clear the warning.
                this.dismissFullscreenWarning();
            }
        };

        document.addEventListener('fullscreenchange', checkFullscreen);
        document.addEventListener('webkitfullscreenchange', checkFullscreen);
        document.addEventListener('mozfullscreenchange', checkFullscreen);
    }

    showFullscreenWarning() {
        if (document.getElementById('fullscreen-warning')) return;

        const warning = document.createElement('div');
        warning.id = 'fullscreen-warning';
        warning.className = 'dfm-overlay';
        warning.innerHTML = `
            <div class="dfm-overlay-card" role="alertdialog" aria-labelledby="dfm-warn-title" aria-describedby="dfm-warn-desc">
                <div class="dfm-overlay-icon" aria-hidden="true">!</div>
                <h3 id="dfm-warn-title">Fullscreen mode required</h3>
                <p id="dfm-warn-desc">Your test must run in fullscreen. Press the button below or hit <kbd>F11</kbd> to return.</p>
                <button type="button" class="dfm-overlay-btn" data-dfm-action="resume-fullscreen">
                    Return to fullscreen
                </button>
                <p class="dfm-overlay-note">This event has been recorded.</p>
            </div>
        `;
        document.body.appendChild(warning);

        const btn = warning.querySelector('[data-dfm-action="resume-fullscreen"]');
        if (btn) {
            btn.addEventListener('click', () => {
                this.requestFullscreen();
                // The fullscreenchange handler will dismiss the warning once fullscreen is granted.
                // If the request silently fails, the overlay stays — student gets a clear retry path.
            });
        }
    }

    dismissFullscreenWarning() {
        const warning = document.getElementById('fullscreen-warning');
        if (warning && warning.parentNode) warning.parentNode.removeChild(warning);
    }

    preventUnwantedActions() {
        // Prevent context menu (right-click)
        document.addEventListener('contextmenu', e => {
            e.preventDefault();
            this._recordViolation('rightClickAttempts');
            this._showBlockedToast('Right-click is disabled during the test');
        });

        // Prevent common keyboard shortcuts.
        // Use lowercased e.key so CapsLock doesn't defeat the comparison
        // (with CapsLock on, Ctrl+R produces e.key === 'R', not 'r').
        const blockShortcut = (e, label) => {
            e.preventDefault();
            this._recordViolation('blockedShortcuts');
            this._showBlockedToast(`${label} is disabled during the test`);
            return false;
        };
        document.addEventListener('keydown', e => {
            const k = (e.key || '').toLowerCase();
            // F5, Ctrl+R (refresh)
            if (k === 'f5' || (e.ctrlKey && k === 'r')) return blockShortcut(e, 'Refresh');
            // F12, Ctrl+Shift+I (dev tools)
            if (k === 'f12' || (e.ctrlKey && e.shiftKey && k === 'i')) return blockShortcut(e, 'Developer tools');
            // Ctrl+Shift+J (console)
            if (e.ctrlKey && e.shiftKey && k === 'j') return blockShortcut(e, 'Developer console');
            // Ctrl+Shift+C (element picker)
            if (e.ctrlKey && e.shiftKey && k === 'c') return blockShortcut(e, 'Element inspector');
            // Ctrl+U (view source)
            if (e.ctrlKey && k === 'u') return blockShortcut(e, 'View source');
            // Ctrl+P (print)
            if (e.ctrlKey && k === 'p') return blockShortcut(e, 'Print');
            // Ctrl+S (save page)
            if (e.ctrlKey && k === 's') return blockShortcut(e, 'Save page');
        });

        // Prevent copy/paste in test input fields (writing tasks exempt)
        document.addEventListener('copy', e => {
            if (!e.target.closest('textarea')) {
                e.preventDefault();
                this._recordViolation('copyAttempts');
                this._showBlockedToast('Copying from the test is disabled');
            }
        });
        document.addEventListener('paste', e => {
            if (e.target.closest('textarea')) return; // allow paste in writing tasks
            e.preventDefault();
            this._recordViolation('pasteAttempts');
            this._showBlockedToast('Pasting into the test is disabled');
        });

        // Prevent accidental back navigation. Track each blocked attempt so the
        // metric reflects user intent rather than failing silently.
        history.pushState(null, null, location.href);
        window.addEventListener('popstate', () => {
            this._recordViolation('backNavAttempts');
            this._showBlockedToast('Back navigation is disabled during the test');
            history.pushState(null, null, location.href);
        });
    }

    // Brief, non-blocking feedback when an action is intercepted. The student
    // needs to understand *why* their keystroke did nothing, otherwise the test
    // feels broken.
    _showBlockedToast(message) {
        const existing = document.getElementById('dfm-toast');
        if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
        const toast = document.createElement('div');
        toast.id = 'dfm-toast';
        toast.className = 'dfm-toast';
        toast.setAttribute('role', 'status');
        toast.textContent = message;
        document.body.appendChild(toast);
        // Trigger CSS transition on next frame
        requestAnimationFrame(() => toast.classList.add('dfm-toast--show'));
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => {
            toast.classList.remove('dfm-toast--show');
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 220);
        }, 1800);
    }

    // Small persistent indicator so the student knows monitoring is active.
    // Transparency reduces "surprise penalty" frustration and signals to honest
    // students that the system is working as expected.
    _mountSecureBadge() {
        if (document.getElementById('dfm-secure-badge')) return;
        const badge = document.createElement('div');
        badge.id = 'dfm-secure-badge';
        badge.className = 'dfm-secure-badge';
        badge.setAttribute('aria-label', 'Secure exam mode is active');
        badge.innerHTML = `
            <span class="dfm-secure-dot" aria-hidden="true"></span>
            <span class="dfm-secure-text">Secure Mode</span>
        `;
        // Wait for body to exist (script may run in <head> on some pages)
        const append = () => {
            if (document.body) document.body.appendChild(badge);
            else setTimeout(append, 16);
        };
        append();
    }

    _injectStyles() {
        if (document.getElementById('dfm-styles')) return;
        const style = document.createElement('style');
        style.id = 'dfm-styles';
        style.textContent = `
            .dfm-secure-badge {
                position: fixed;
                bottom: 14px;
                left: 14px;
                z-index: 999990;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 7px 12px;
                background: rgba(20, 30, 48, 0.78);
                color: #fff;
                font: 600 12px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                letter-spacing: 0.03em;
                border-radius: 999px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.18);
                backdrop-filter: blur(6px);
                -webkit-backdrop-filter: blur(6px);
                user-select: none;
                pointer-events: none;
                opacity: 0;
                transform: translateY(8px);
                animation: dfmBadgeIn 380ms cubic-bezier(.2,.8,.2,1) 600ms forwards;
            }
            .dfm-secure-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #2ecc71;
                box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.55);
                animation: dfmPulse 2s ease-out infinite;
            }
            @keyframes dfmBadgeIn {
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes dfmPulse {
                0%   { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.55); }
                70%  { box-shadow: 0 0 0 8px rgba(46, 204, 113, 0); }
                100% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0); }
            }
            .dfm-toast {
                position: fixed;
                left: 50%;
                bottom: 28px;
                transform: translate(-50%, 12px);
                z-index: 999995;
                padding: 11px 18px;
                background: rgba(20, 30, 48, 0.92);
                color: #fff;
                font: 500 14px/1.3 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                border-radius: 10px;
                box-shadow: 0 6px 24px rgba(0,0,0,0.28);
                opacity: 0;
                transition: opacity 200ms ease, transform 200ms ease;
                pointer-events: none;
                max-width: min(86vw, 460px);
                text-align: center;
            }
            .dfm-toast--show {
                opacity: 1;
                transform: translate(-50%, 0);
            }
            .dfm-overlay {
                position: fixed;
                inset: 0;
                background: rgba(10, 16, 28, 0.94);
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: dfmOverlayIn 200ms ease both;
            }
            @keyframes dfmOverlayIn { from { opacity: 0; } to { opacity: 1; } }
            .dfm-overlay-card {
                text-align: center;
                background: linear-gradient(180deg, #2c3e50 0%, #233141 100%);
                padding: 2.4rem 2.6rem;
                border-radius: 16px;
                color: #fff;
                box-shadow: 0 24px 60px rgba(0,0,0,0.5);
                max-width: 420px;
                font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            .dfm-overlay-icon {
                width: 64px;
                height: 64px;
                margin: 0 auto 1rem;
                border-radius: 50%;
                background: rgba(231, 76, 60, 0.18);
                color: #e74c3c;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 36px;
                font-weight: 700;
                border: 2px solid rgba(231, 76, 60, 0.45);
            }
            .dfm-overlay-card h3 {
                font-size: 1.5rem;
                margin: 0 0 0.6rem;
                color: #fff;
                font-weight: 700;
            }
            .dfm-overlay-card p {
                font-size: 1rem;
                margin: 0 0 1.4rem;
                color: rgba(255,255,255,0.85);
            }
            .dfm-overlay-card kbd {
                display: inline-block;
                padding: 1px 7px;
                font: 600 12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
                background: rgba(255,255,255,0.14);
                border: 1px solid rgba(255,255,255,0.25);
                border-bottom-width: 2px;
                border-radius: 5px;
                color: #fff;
            }
            .dfm-overlay-btn {
                background: #3498db;
                border: none;
                color: white;
                padding: 0.8rem 2rem;
                border-radius: 25px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: background 160ms ease, transform 160ms ease;
            }
            .dfm-overlay-btn:hover { background: #2c87c6; transform: translateY(-1px); }
            .dfm-overlay-btn:active { transform: translateY(0); }
            .dfm-overlay-note {
                margin: 1rem 0 0 !important;
                font-size: 0.78rem !important;
                color: rgba(255,255,255,0.55) !important;
                letter-spacing: 0.04em;
            }
        `;
        // Append once DOM is ready enough
        const append = () => {
            const target = document.head || document.documentElement;
            if (target) target.appendChild(style);
            else setTimeout(append, 16);
        };
        append();
    }

    getAntiCheatData() {
        // Returns the full anti-cheat profile for submission to the server.
        // Includes both the fullscreen state and the persisted violation counters.
        return Object.assign({
            distractionFreeEnabled: this.isEnabled
        }, this.counters);
    }
}

// Initialize distraction-free mode
const distractionFreeMode = new DistractionFreeMode();

// Global function for entering fullscreen mode (called from launcher)
function enterFullscreenMode() {
    sessionStorage.setItem('distractionFreeMode', 'true');
    const elem = document.documentElement;
    const request = elem.requestFullscreen || 
                   elem.webkitRequestFullscreen || 
                   elem.mozRequestFullScreen || 
                   elem.msRequestFullscreen;
    
    if (request) {
        request.call(elem).catch(err => {});
    }
}
