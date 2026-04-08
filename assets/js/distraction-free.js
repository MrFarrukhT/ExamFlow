// Distraction-Free Mode Manager - Simplified
// Provides secure test environment with fullscreen mode

class DistractionFreeMode {
    constructor() {
        this.isEnabled = sessionStorage.getItem('distractionFreeMode') === 'true';
        // Anti-cheat counters — persisted across page navigations via sessionStorage
        this.counters = this._loadCounters();
        if (this.isEnabled) {
            this.init();
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
            firstViolationAt: null,
            lastViolationAt: null
        };
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
        const checkFullscreen = () => {
            if (!document.fullscreenElement && !document.webkitFullscreenElement &&
                !document.mozFullScreenElement && !document.msFullscreenElement) {
                this._recordViolation('fullscreenExits');
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
        document.addEventListener('contextmenu', e => {
            e.preventDefault();
            this._recordViolation('rightClickAttempts');
        });

        // Prevent common keyboard shortcuts
        const blockShortcut = (e) => {
            e.preventDefault();
            this._recordViolation('blockedShortcuts');
            return false;
        };
        document.addEventListener('keydown', e => {
            // F5, Ctrl+R (refresh)
            if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) return blockShortcut(e);
            // F12, Ctrl+Shift+I (dev tools)
            if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) return blockShortcut(e);
            // Ctrl+Shift+J (console)
            if (e.ctrlKey && e.shiftKey && e.key === 'J') return blockShortcut(e);
            // Ctrl+Shift+C (element picker)
            if (e.ctrlKey && e.shiftKey && e.key === 'C') return blockShortcut(e);
            // Ctrl+U (view source)
            if (e.ctrlKey && e.key === 'u') return blockShortcut(e);
            // Ctrl+P (print)
            if (e.ctrlKey && e.key === 'p') return blockShortcut(e);
            // Ctrl+S (save page)
            if (e.ctrlKey && e.key === 's') return blockShortcut(e);
        });

        // Prevent copy/paste in test input fields (writing tasks exempt)
        document.addEventListener('copy', e => {
            if (!e.target.closest('textarea')) {
                e.preventDefault();
                this._recordViolation('copyAttempts');
            }
        });
        document.addEventListener('paste', e => {
            if (e.target.closest('textarea')) return; // allow paste in writing tasks
            e.preventDefault();
            this._recordViolation('pasteAttempts');
        });

        // Prevent accidental back navigation
        history.pushState(null, null, location.href);
        window.addEventListener('popstate', () => {
            history.pushState(null, null, location.href);
        });
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
