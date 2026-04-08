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
            
            // Ctrl+U (view source)
            if (e.ctrlKey && e.key === 'u') {
                e.preventDefault();
                return false;
            }
        });

        // Prevent accidental back navigation
        history.pushState(null, null, location.href);
        window.addEventListener('popstate', () => {
            history.pushState(null, null, location.href);
        });
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
