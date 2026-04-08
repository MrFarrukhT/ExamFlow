// Distraction-Free Mode Manager - Simplified
// Provides secure test environment with fullscreen mode

class DistractionFreeMode {
    constructor() {
        this.isEnabled = sessionStorage.getItem('distractionFreeMode') === 'true';
        if (this.isEnabled) {
            this.init();
        }
    }

    init() {
        this.requestFullscreen();
        this.preventUnwantedActions();
        this.monitorFullscreen();
        this.monitorTabVisibility();
        this.detectMultipleTabs();
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
        const checkFullscreen = () => {
            if (!document.fullscreenElement && !document.webkitFullscreenElement && 
                !document.mozFullScreenElement && !document.msFullscreenElement) {
                this.showFullscreenWarning();
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
        warning.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.95); 
                        z-index: 999999; display: flex; align-items: center; justify-content: center;">
                <div style="text-align: center; background: #2c3e50; padding: 3rem; border-radius: 15px; color: white;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">⚠️</div>
                    <h3 style="font-size: 1.8rem; margin-bottom: 1rem; color: #e74c3c;">Fullscreen Mode Required</h3>
                    <p style="font-size: 1.1rem; margin-bottom: 2rem;">Please return to fullscreen mode to continue.</p>
                    <button onclick="distractionFreeMode.requestFullscreen(); this.parentElement.parentElement.remove();" 
                            style="background: #3498db; border: none; color: white; padding: 0.8rem 2rem; 
                                   border-radius: 25px; font-size: 1rem; cursor: pointer;">
                        Return to Fullscreen
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(warning);
    }

    preventUnwantedActions() {
        // Prevent context menu (right-click)
        document.addEventListener('contextmenu', e => e.preventDefault());

        // Prevent common keyboard shortcuts
        document.addEventListener('keydown', e => {
            // F5, Ctrl+R (refresh)
            if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
                e.preventDefault();
                return false;
            }

            // F12, Ctrl+Shift+I (dev tools)
            if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
                e.preventDefault();
                return false;
            }

            // Ctrl+Shift+J (console)
            if (e.ctrlKey && e.shiftKey && e.key === 'J') {
                e.preventDefault();
                return false;
            }

            // Ctrl+Shift+C (element picker)
            if (e.ctrlKey && e.shiftKey && e.key === 'C') {
                e.preventDefault();
                return false;
            }

            // Ctrl+U (view source)
            if (e.ctrlKey && e.key === 'u') {
                e.preventDefault();
                return false;
            }

            // Ctrl+P (print — could be used to export test content)
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                return false;
            }

            // Ctrl+S (save page)
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                return false;
            }
        });

        // Prevent copy/paste in test input fields (writing tasks exempt)
        document.addEventListener('copy', e => {
            if (!e.target.closest('textarea')) e.preventDefault();
        });
        document.addEventListener('paste', e => {
            if (e.target.closest('textarea')) return; // allow paste in writing tasks
            e.preventDefault();
        });

        // Prevent accidental back navigation
        history.pushState(null, null, location.href);
        window.addEventListener('popstate', () => {
            history.pushState(null, null, location.href);
        });
    }

    monitorTabVisibility() {
        this.tabSwitchCount = parseInt(sessionStorage.getItem('_dfm_tabSwitches') || '0', 10);

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.tabSwitchCount++;
                console.warn(`⚠️ TAB SWITCH #${this.tabSwitchCount} detected`);

                // Store in sessionStorage (tamper-resistant — resets on tab close, can't be synced across tabs)
                sessionStorage.setItem('_dfm_tabSwitches', String(this.tabSwitchCount));
                // Also keep localStorage copy for submission (student can clear this but sessionStorage is authoritative)
                try {
                    localStorage.setItem('_tabSwitchCount', String(this.tabSwitchCount));
                } catch (e) { /* ignore */ }

                // Show warning after returning
                this._showTabSwitchWarning();
            }
        });

        // Window blur (alt-tab, clicking outside browser)
        window.addEventListener('blur', () => {
            console.warn('⚠️ Window lost focus');
        });
    }

    /**
     * Detect multiple tabs running the test simultaneously using BroadcastChannel.
     * If another tab is detected, show a blocking warning.
     */
    detectMultipleTabs() {
        if (typeof BroadcastChannel === 'undefined') return;

        this._tabChannel = new BroadcastChannel('exam-tab-guard');
        this._tabId = Date.now() + '-' + Math.random().toString(36).slice(2);

        // Announce presence
        this._tabChannel.postMessage({ type: 'ping', tabId: this._tabId });

        // Listen for other tabs
        this._tabChannel.onmessage = (event) => {
            if (event.data.tabId === this._tabId) return;

            if (event.data.type === 'ping') {
                // Another tab just opened — respond and warn both
                this._tabChannel.postMessage({ type: 'pong', tabId: this._tabId });
                this._showMultiTabWarning();
            } else if (event.data.type === 'pong') {
                // We're the new tab and detected an existing one
                this._showMultiTabWarning();
            }
        };
    }

    _showMultiTabWarning() {
        if (document.getElementById('multitab-warning')) return;

        const warning = document.createElement('div');
        warning.id = 'multitab-warning';
        warning.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.97);
                        z-index: 9999999; display: flex; align-items: center; justify-content: center;">
                <div style="text-align: center; background: #7f1d1d; padding: 3rem; border-radius: 15px; color: white; max-width: 500px;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">🚫</div>
                    <h3 style="font-size: 1.8rem; margin-bottom: 1rem; color: #fca5a5;">Multiple Tabs Detected</h3>
                    <p style="font-size: 1.1rem; margin-bottom: 1rem;">You have the exam open in another tab or window.</p>
                    <p style="font-size: 1rem; color: #fca5a5;">This has been recorded and will be reported to the invigilator.</p>
                    <p style="font-size: 0.9rem; margin-top: 1.5rem; color: #d1d5db;">Close the other tab and continue here.</p>
                </div>
            </div>
        `;
        document.body.appendChild(warning);

        // Record multi-tab violation
        sessionStorage.setItem('_dfm_multiTab', 'true');
        try { localStorage.setItem('_multiTabDetected', 'true'); } catch (e) { /* ignore */ }

        // Auto-dismiss after 10 seconds
        setTimeout(() => warning.remove(), 10000);
    }

    _showTabSwitchWarning() {
        // Wait for tab to become visible again, then show warning
        const onVisible = () => {
            if (!document.hidden) {
                document.removeEventListener('visibilitychange', onVisible);
                this._displayWarningBanner(
                    `Tab switch detected (${this.tabSwitchCount} total). This activity is recorded and may be reported to the invigilator.`
                );
            }
        };
        document.addEventListener('visibilitychange', onVisible);
    }

    _displayWarningBanner(message) {
        // Remove existing banner
        const existing = document.getElementById('anticheat-warning');
        if (existing) existing.remove();

        const banner = document.createElement('div');
        banner.id = 'anticheat-warning';
        banner.style.cssText = 'position:fixed;top:0;left:0;right:0;padding:12px 20px;background:#e74c3c;color:white;text-align:center;z-index:999998;font-weight:600;font-size:14px;box-shadow:0 2px 10px rgba(0,0,0,0.3);';
        banner.textContent = message;

        // Auto-dismiss after 8 seconds
        setTimeout(() => banner.remove(), 8000);
        document.body.appendChild(banner);
    }

    /**
     * Returns anti-cheat metadata to include with test submissions.
     * Uses sessionStorage as authoritative source (resistant to localStorage tampering).
     */
    getAntiCheatData() {
        return {
            tabSwitchCount: parseInt(sessionStorage.getItem('_dfm_tabSwitches') || '0', 10),
            multiTabDetected: sessionStorage.getItem('_dfm_multiTab') === 'true',
            distractionFreeEnabled: this.isEnabled
        };
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
