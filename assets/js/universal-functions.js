// IELTS Universal Functions - Shared across Reading, Listening, Writing
class IELTSUniversalFunctions {
    constructor() {
        this.wifiStatus = true;
        this.notifications = [
            {
                id: 1,
                title: "Test Information",
                message: "Your test session will be saved automatically every 30 seconds.",
                time: "2 minutes ago"
            },
            {
                id: 2,
                title: "System Update",
                message: "All systems are operating normally. Good luck with your test!",
                time: "5 minutes ago"
            }
        ];
        this.currentTheme = 'light';
        this.currentTextSize = 'medium';
        
        this.init();
    }

    init() {
        this.createPopupStructure();
        this.bindEvents();
        this.updateWifiStatus();
        this.loadUserPreferences();
    }

    createPopupStructure() {
        // Create popup overlay if it doesn't exist
        if (!document.getElementById('popup-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'popup-overlay';
            overlay.className = 'popup-overlay';
            overlay.innerHTML = `
                <div class="popup-content" id="popup-content">
                    <!-- Dynamic content will be inserted here -->
                </div>
            `;
            document.body.appendChild(overlay);

            // Popup can only be closed with X button
            // No click-outside or Escape key closing
        }
    }

    bindEvents() {
        // WiFi indicator - just shows status, not clickable
        // No event listener needed for WiFi icon

        // Bell notification
        const bellNotification = document.querySelector('.bell-notification');
        if (bellNotification) {
            bellNotification.addEventListener('click', () => this.showNotifications());
        }

        // Options menu
        const optionsMenu = document.querySelector('.options-menu');
        if (optionsMenu) {
            optionsMenu.addEventListener('click', () => this.showOptionsMenu());
        }

        // Keyboard shortcuts removed - popup only closes with X button
    }

    toggleWifi() {
        this.wifiStatus = !this.wifiStatus;
        this.updateWifiStatus();
        
        // Show notification
        this.showToast(`WiFi ${this.wifiStatus ? 'Connected' : 'Disconnected'}`, 
                      this.wifiStatus ? 'success' : 'error');
    }

    updateWifiStatus() {
        const wifiIcon = document.querySelector('.wifi-icon');
        if (wifiIcon) {
            wifiIcon.className = `wifi-icon ${this.wifiStatus ? 'connected' : 'disconnected'}`;
            wifiIcon.innerHTML = this.wifiStatus ? 
                `<svg viewBox="0 0 24 24">
                    <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.07 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/>
                </svg>` :
                `<svg viewBox="0 0 24 24">
                    <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.07 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/>
                    <path d="M3.5 21l17-17" stroke="currentColor" stroke-width="2"/>
                </svg>`;
            
            wifiIcon.title = this.wifiStatus ? 'WiFi Connected' : 'WiFi Disconnected';
        }
    }

    showNotifications() {
        const content = `
            <div class="popup-header">
                <div class="popup-title">Notifications</div>
                <button class="popup-close" onclick="ieltsUniversal.closePopup()">&times;</button>
            </div>
            <div class="popup-body">
                ${this.notifications.map(notification => `
                    <div class="notification-item">
                        <div class="notification-title">${notification.title}</div>
                        <div class="notification-message">${notification.message}</div>
                        <div class="notification-time">${notification.time}</div>
                    </div>
                `).join('')}
                ${this.notifications.length === 0 ? 
                    '<div class="notification-item"><div class="notification-message">No new notifications</div></div>' : 
                    ''}
            </div>
        `;
        this.showPopup(content);
    }

    showOptionsMenu() {
        const content = `
            <div class="popup-header">
                <div class="popup-title">Options</div>
                <button class="popup-close" onclick="ieltsUniversal.closePopup()">&times;</button>
            </div>
            <div class="popup-body options-popup">
                <div class="option-item submit-option" onclick="ieltsUniversal.goToSubmission()">
                    <div class="option-icon">
                        <i class="fa fa-send" aria-hidden="true"></i>
                    </div>
                    <div class="option-text">Go to submission page</div>
                    <div class="option-arrow">
                        <i class="fa fa-chevron-right" aria-hidden="true"></i>
                    </div>
                </div>
                <div class="option-item" onclick="ieltsUniversal.showContrastOptions()">
                    <div class="option-icon">
                        <i class="fa fa-info-circle" aria-hidden="true"></i>
                    </div>
                    <div class="option-text">Contrast</div>
                    <div class="option-arrow">
                        <i class="fa fa-chevron-right" aria-hidden="true"></i>
                    </div>
                </div>
                <div class="option-item" onclick="ieltsUniversal.showTextSizeOptions()">
                    <div class="option-icon">
                        <i class="fa fa-search" aria-hidden="true"></i>
                    </div>
                    <div class="option-text">Text size</div>
                    <div class="option-arrow">
                        <i class="fa fa-chevron-right" aria-hidden="true"></i>
                    </div>
                </div>
            </div>
        `;
        this.showPopup(content, 'options-popup');
    }

    showContrastOptions() {
        const content = `
            <div class="popup-header">
                <button class="popup-back" onclick="ieltsUniversal.showOptionsMenu()">
                    <i class="fa fa-chevron-left" aria-hidden="true"></i>
                    <span>Options</span>
                </button>
                <div class="popup-title">Display Contrast</div>
                <div style="width: 40px;"></div>
            </div>
            <div class="popup-body">
                <div class="contrast-options">
                    <div class="contrast-option ${this.currentTheme === 'light' ? 'active' : ''}" 
                         onclick="ieltsUniversal.setTheme('light')">
                        <div>Black on white</div>
                    </div>
                    <div class="contrast-option dark-preview ${this.currentTheme === 'dark' ? 'active' : ''}" 
                         onclick="ieltsUniversal.setTheme('dark')">
                        <div>White on black</div>
                    </div>
                </div>
            </div>
        `;
        this.showPopup(content);
    }

    showTextSizeOptions() {
        const content = `
            <div class="popup-header">
                <button class="popup-back" onclick="ieltsUniversal.showOptionsMenu()">
                    <i class="fa fa-chevron-left" aria-hidden="true"></i>
                    <span>Options</span>
                </button>
                <div class="popup-title">Text Size</div>
                <div style="width: 40px;"></div>
            </div>
            <div class="popup-body">
                <div class="text-size-options">
                    <div class="text-size-option small ${this.currentTextSize === 'small' ? 'active' : ''}" 
                         onclick="ieltsUniversal.setTextSize('small')">
                        Small
                    </div>
                    <div class="text-size-option medium ${this.currentTextSize === 'medium' ? 'active' : ''}" 
                         onclick="ieltsUniversal.setTextSize('medium')">
                        Medium
                    </div>
                    <div class="text-size-option large ${this.currentTextSize === 'large' ? 'active' : ''}" 
                         onclick="ieltsUniversal.setTextSize('large')">
                        Large
                    </div>
                </div>
            </div>
        `;
        this.showPopup(content);
    }

    setTheme(theme) {
        this.currentTheme = theme;
        document.body.className = document.body.className.replace(/dark-mode|light-mode/g, '');
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
        }
        this.saveUserPreferences();
        this.showToast(`Theme changed to ${theme} mode`, 'success');
        
        // Update contrast options
        document.querySelectorAll('.contrast-option').forEach(option => {
            option.classList.remove('active');
        });
        document.querySelector(`.contrast-option:nth-child(${theme === 'light' ? '1' : '2'})`).classList.add('active');
    }

    setTextSize(size) {
        this.currentTextSize = size;
        document.body.className = document.body.className.replace(/text-small|text-medium|text-large/g, '');
        document.body.classList.add(`text-${size}`);
        this.saveUserPreferences();
        this.showToast(`Text size changed to ${size}`, 'success');
        
        // Update text size options
        document.querySelectorAll('.text-size-option').forEach(option => {
            option.classList.remove('active');
        });
        document.querySelector(`.text-size-option.${size}`).classList.add('active');
    }

    goToSubmission() {
        if (confirm('Are you sure you want to go to the dashboard? This will end your current session.')) {
            // Save current session data before redirecting
            const currentModule = this.getCurrentModule();
            if (currentModule) {
                localStorage.setItem(`${currentModule}Status`, 'completed');
                localStorage.setItem(`${currentModule}EndTime`, new Date().toISOString());
            }
            
            this.showToast('Redirecting to dashboard...', 'info');
            this.closePopup();
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = '../../dashboard.html';
            }, 1000);
        }
    }

    getCurrentModule() {
        // Try to get from body dataset
        const skill = document.body.dataset.skill;
        if (skill) return skill;
        
        // Try to get from URL
        const path = window.location.pathname;
        if (path.includes('reading.html')) return 'reading';
        if (path.includes('listening.html')) return 'listening';
        if (path.includes('writing.html')) return 'writing';
        
        return null;
    }

    showPopup(content, additionalClass = '') {
        const overlay = document.getElementById('popup-overlay');
        const popupContent = document.getElementById('popup-content');
        
        if (overlay && popupContent) {
            popupContent.innerHTML = content;
            popupContent.className = `popup-content ${additionalClass}`;
            overlay.classList.add('show');
            
            // Focus management for accessibility
            const closeButton = popupContent.querySelector('.popup-close');
            if (closeButton) {
                closeButton.focus();
            }
        }
    }

    closePopup() {
        const overlay = document.getElementById('popup-overlay');
        if (overlay) {
            overlay.classList.remove('show');
        }
    }

    showToast(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background-color: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 3000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    saveUserPreferences() {
        const preferences = {
            theme: this.currentTheme,
            textSize: this.currentTextSize
        };
        localStorage.setItem('ielts-preferences', JSON.stringify(preferences));
    }

    loadUserPreferences() {
        const saved = localStorage.getItem('ielts-preferences');
        if (saved) {
            try {
                const preferences = JSON.parse(saved);
                if (preferences.theme) {
                    this.setTheme(preferences.theme);
                }
                if (preferences.textSize) {
                    this.setTextSize(preferences.textSize);
                }
            } catch (e) {
                console.warn('Error loading user preferences:', e);
            }
        }
    }

    updateNotificationBadge() {
        const badge = document.querySelector('.notification-badge');
        if (badge) {
            const count = this.notifications.length;
            badge.textContent = count > 9 ? '9+' : count.toString();
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    }

    addNotification(title, message) {
        const notification = {
            id: Date.now(),
            title,
            message,
            time: 'Just now'
        };
        this.notifications.unshift(notification);
        this.updateNotificationBadge();
        this.showToast(`New notification: ${title}`, 'info');
    }
}

// Initialize universal functions when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.ieltsUniversal = new IELTSUniversalFunctions();
});

// Also try immediate initialization if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        if (!window.ieltsUniversal) {
            window.ieltsUniversal = new IELTSUniversalFunctions();
        }
    });
} else {
    // DOM is already loaded
    if (!window.ieltsUniversal) {
        window.ieltsUniversal = new IELTSUniversalFunctions();
    }
}

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IELTSUniversalFunctions;
}
