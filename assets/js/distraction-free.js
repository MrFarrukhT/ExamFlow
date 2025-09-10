// Distraction-Free Mode Manager
// This script provides a native app-like experience with security features

class DistractionFreeMode {
    constructor() {
        this.isEnabled = sessionStorage.getItem('distractionFreeMode') === 'true';
        this.init();
    }

    init() {
        if (this.isEnabled) {
            this.enableDistractionFreeMode();
        }
        this.preventUnwantedActions();
    }

    enableDistractionFreeMode() {
        // Add visual indicators first
        this.addDistractionFreeIndicators();
        
        // Hide browser UI elements
        this.hideBrowserUI();
        
        // Monitor fullscreen state
        this.monitorFullscreen();
        
        // Try to enter fullscreen immediately if possible
        if (!document.fullscreenElement && !document.webkitFullscreenElement && 
            !document.mozFullScreenElement && !document.msFullscreenElement) {
            this.requestFullscreen();
        }
        
        // Also set up a user interaction listener as backup
        this.setupUserInteractionFullscreen();
    }
    
    setupUserInteractionFullscreen() {
        const ensureFullscreenOnInteraction = () => {
            if (!document.fullscreenElement && !document.webkitFullscreenElement && 
                !document.mozFullScreenElement && !document.msFullscreenElement) {
                this.requestFullscreen();
            }
            // Remove the listener after first successful attempt
            document.removeEventListener('click', ensureFullscreenOnInteraction);
            document.removeEventListener('keydown', ensureFullscreenOnInteraction);
        };
        
        document.addEventListener('click', ensureFullscreenOnInteraction);
        document.addEventListener('keydown', ensureFullscreenOnInteraction);
    }

    requestFullscreen() {
        const docElement = document.documentElement;
        
        // Check if already in fullscreen
        if (document.fullscreenElement || document.webkitFullscreenElement || 
            document.mozFullScreenElement || document.msFullscreenElement) {
            return Promise.resolve();
        }
        
        let fullscreenPromise;
        
        if (docElement.requestFullscreen) {
            fullscreenPromise = docElement.requestFullscreen();
        } else if (docElement.webkitRequestFullscreen) {
            fullscreenPromise = docElement.webkitRequestFullscreen();
        } else if (docElement.mozRequestFullScreen) {
            fullscreenPromise = docElement.mozRequestFullScreen();
        } else if (docElement.msRequestFullscreen) {
            fullscreenPromise = docElement.msRequestFullscreen();
        } else {
            return Promise.reject('Fullscreen not supported');
        }
        
        return Promise.resolve(fullscreenPromise).catch(err => {
            console.log(`Fullscreen request failed: ${err.message || err}`);
            // Don't throw the error, just log it
        });
    }

    addDistractionFreeIndicators() {
        // Note: Secure Test Mode indicator removed per user request to reduce visual clutter
        // Security features are still active, just no visual indicator shown
    }

    hideBrowserUI() {
        // Hide scroll bars when in fullscreen
        const style = document.createElement('style');
        style.textContent = `
            html:fullscreen, html:-webkit-full-screen, html:-moz-full-screen {
                overflow: hidden;
            }
            body:fullscreen, body:-webkit-full-screen, body:-moz-full-screen {
                overflow-y: auto;
                scrollbar-width: none;
                -ms-overflow-style: none;
            }
            body:fullscreen::-webkit-scrollbar, 
            body:-webkit-full-screen::-webkit-scrollbar,
            body:-moz-full-screen::-webkit-scrollbar {
                display: none;
            }
        `;
        document.head.appendChild(style);
    }

    monitorFullscreen() {
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement && this.isEnabled) {
                this.showFullscreenWarning();
            }
        });

        document.addEventListener('webkitfullscreenchange', () => {
            if (!document.webkitFullscreenElement && this.isEnabled) {
                this.showFullscreenWarning();
            }
        });

        document.addEventListener('mozfullscreenchange', () => {
            if (!document.mozFullScreenElement && this.isEnabled) {
                this.showFullscreenWarning();
            }
        });
    }

    showFullscreenWarning() {
        const warning = document.createElement('div');
        warning.id = 'fullscreen-warning';
        warning.innerHTML = `
            <div class="warning-content">
                <div class="warning-icon">⚠️</div>
                <h3>Fullscreen Mode Required</h3>
                <p>Please return to fullscreen mode to continue your test securely.</p>
                <button onclick="distractionFreeMode.requestFullscreen()">Return to Fullscreen</button>
            </div>
        `;

        const styles = document.createElement('style');
        styles.textContent = `
            #fullscreen-warning {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.95);
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-family: 'Segoe UI', sans-serif;
            }
            .warning-content {
                text-align: center;
                background: #2c3e50;
                padding: 3rem;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            }
            .warning-icon {
                font-size: 4rem;
                margin-bottom: 1rem;
            }
            .warning-content h3 {
                font-size: 1.8rem;
                margin-bottom: 1rem;
                color: #e74c3c;
            }
            .warning-content p {
                font-size: 1.1rem;
                margin-bottom: 2rem;
                color: #bdc3c7;
            }
            .warning-content button {
                background: #3498db;
                border: none;
                color: white;
                padding: 0.8rem 2rem;
                border-radius: 25px;
                font-size: 1rem;
                cursor: pointer;
                transition: background 0.3s;
            }
            .warning-content button:hover {
                background: #2980b9;
            }
        `;
        
        document.head.appendChild(styles);
        document.body.appendChild(warning);

        // Auto-remove warning when fullscreen is restored
        const checkFullscreen = setInterval(() => {
            if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement) {
                warning.remove();
                styles.remove();
                clearInterval(checkFullscreen);
            }
        }, 500);
    }

    preventUnwantedActions() {
        // Prevent refresh, developer tools, and other shortcuts
        document.addEventListener('keydown', (e) => {
            // Prevent F5, Ctrl+R (refresh)
            if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
                e.preventDefault();
                this.showActionBlockedMessage('Page refresh is disabled during the test');
                return false;
            }
            
            // Prevent F12, Ctrl+Shift+I (developer tools)
            if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
                e.preventDefault();
                this.showActionBlockedMessage('Developer tools are disabled during the test');
                return false;
            }
            
            // Prevent Ctrl+Shift+J (console)
            if (e.ctrlKey && e.shiftKey && e.key === 'J') {
                e.preventDefault();
                this.showActionBlockedMessage('Console access is disabled during the test');
                return false;
            }
            
            // Prevent Ctrl+U (view source)
            if (e.ctrlKey && e.key === 'u') {
                e.preventDefault();
                this.showActionBlockedMessage('View source is disabled during the test');
                return false;
            }

            // Prevent Alt+Tab (if possible - limited browser support)
            if (e.altKey && e.key === 'Tab') {
                e.preventDefault();
                this.showActionBlockedMessage('Switching applications is discouraged during the test');
                return false;
            }

            // Prevent Ctrl+Tab (tab switching)
            if (e.ctrlKey && e.key === 'Tab') {
                e.preventDefault();
                this.showActionBlockedMessage('Tab switching is disabled during the test');
                return false;
            }
        });

        // Note: Right-click context menu handling is done in core.js to work with highlights
        // This avoids conflicts with the highlight system
        // Fallback for pages without core.js (dashboard, index, etc.)
        
        // Wait a moment to see if core.js loads, then add fallback if needed
        setTimeout(() => {
            if (!window.coreJSLoaded) {
                console.log('Core.js not detected, adding fallback context menu handler');
                this.addFallbackContextMenuHandler();
            } else {
                console.log('Core.js detected, skipping fallback context menu handler');
            }
        }, 1500); // Increased timeout to give more time for core.js to load

        // Prevent external drag and drop (but allow internal question drag and drop)
        document.addEventListener('dragstart', (e) => {
            // Allow drag and drop for IELTS question elements
            const isDragItem = e.target.classList.contains('drag-item');
            const isPillElement = e.target.classList.contains('pill');
            const isInsideTestArea = e.target.closest('.test-content, .question-container, .question, .drag-options-container, .drop-zone, .dd-questions');
            
            if ((isDragItem || isPillElement) && isInsideTestArea) {
                // Allow drag for test questions
                return true;
            }
            
            // Prevent external drag and drop for security
            e.preventDefault();
            return false;
        });

        // Prevent text selection in certain areas (optional)
        document.addEventListener('selectstart', (e) => {
            if (e.target.classList.contains('no-select')) {
                e.preventDefault();
                return false;
            }
        });

        // Monitor for window blur (user switching away)
        window.addEventListener('blur', () => {
            if (this.isEnabled) {
                this.showFocusWarning();
            }
        });

        // Monitor for window focus return
        window.addEventListener('focus', () => {
            const warningElement = document.getElementById('focus-warning');
            if (warningElement) {
                warningElement.remove();
            }
        });
    }

    getCurrentSkill() {
        // Try to get from body dataset
        const skill = document.body.dataset.skill;
        if (skill) return skill;
        
        // Try to get from URL
        const path = window.location.pathname;
        if (path.includes('reading.html')) return 'reading';
        if (path.includes('listening.html')) return 'listening';
        if (path.includes('writing.html')) return 'writing';
        if (path.includes('dashboard.html')) return 'dashboard';
        
        return null;
    }

    addFallbackContextMenuHandler() {
        // This should only run on pages that DON'T have core.js (like dashboard)
        // For reading/listening pages with core.js, the context menu is handled by core.js
        document.addEventListener('contextmenu', (e) => {
            const currentSkill = this.getCurrentSkill();
            
            // For writing, dashboard, and other sections, block right-click
            if (currentSkill === 'writing' || currentSkill === 'dashboard' || !currentSkill) {
                e.preventDefault();
                this.showActionBlockedMessage('Right-click menu is disabled during the test');
                return false;
            }
            
            // For reading/listening without core.js, allow (but this shouldn't happen normally)
            return true;
        });
    }

    showActionBlockedMessage(message) {
        // Create a temporary toast notification
        const toast = document.createElement('div');
        toast.className = 'action-blocked-toast';
        toast.textContent = message;
        
        const styles = document.createElement('style');
        styles.textContent = `
            .action-blocked-toast {
                position: fixed;
                top: 50px;
                right: 20px;
                background: #e74c3c;
                color: white;
                padding: 12px 20px;
                border-radius: 5px;
                z-index: 10001;
                font-size: 0.9rem;
                font-weight: 500;
                box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
                animation: slideInOut 3s ease-in-out;
            }
            @keyframes slideInOut {
                0% { transform: translateX(100%); opacity: 0; }
                10%, 90% { transform: translateX(0); opacity: 1; }
                100% { transform: translateX(100%); opacity: 0; }
            }
        `;
        
        document.head.appendChild(styles);
        document.body.appendChild(toast);
        
        // Remove after animation
        setTimeout(() => {
            toast.remove();
            styles.remove();
        }, 3000);
    }

    showFocusWarning() {
        if (document.getElementById('focus-warning')) return; // Already showing

        const warning = document.createElement('div');
        warning.id = 'focus-warning';
        warning.innerHTML = `
            <div class="focus-warning-content">
                <div class="focus-warning-icon">👀</div>
                <h3>Please Stay Focused</h3>
                <p>Return to the test window to continue</p>
            </div>
        `;

        const styles = document.createElement('style');
        styles.textContent = `
            #focus-warning {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: #f39c12;
                color: white;
                padding: 1rem 2rem;
                border-radius: 10px;
                z-index: 10002;
                text-align: center;
                box-shadow: 0 4px 15px rgba(243, 156, 18, 0.4);
                animation: pulseWarning 1s ease-in-out infinite;
            }
            .focus-warning-content h3 {
                margin: 0.5rem 0;
                font-size: 1.1rem;
            }
            .focus-warning-content p {
                margin: 0;
                font-size: 0.9rem;
            }
            .focus-warning-icon {
                font-size: 1.5rem;
            }
            @keyframes pulseWarning {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
        `;
        
        document.head.appendChild(styles);
        document.body.appendChild(warning);
    }

    // Method to disable distraction-free mode (for admin/debug purposes)
    disable() {
        sessionStorage.removeItem('distractionFreeMode');
        this.isEnabled = false;
        
        // Remove indicators
        const indicator = document.getElementById('distraction-free-indicator');
        if (indicator) indicator.remove();
        
        // Exit fullscreen
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
    }
}

// Initialize distraction-free mode
const distractionFreeMode = new DistractionFreeMode();

// Make it globally available for debugging (admin only)
window.distractionFreeMode = distractionFreeMode;
