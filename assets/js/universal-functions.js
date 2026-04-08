// XSS escape utility for dynamic content
function escapeHTML(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// IELTS Universal Functions - Shared across Reading, Listening, Writing
// Composes ModalManager and OptionsMenu (extracted in ADR-014).
class IELTSUniversalFunctions {
    constructor() {
        this.wifiStatus = true;
        this.notifications = [
            { id: 1, title: "Test Information", message: "Your test session will be saved automatically every 30 seconds.", time: "2 minutes ago" },
            { id: 2, title: "System Update", message: "All systems are operating normally. Good luck with your test!", time: "5 minutes ago" }
        ];

        // Compose extracted modules
        this.modalManager = new ModalManager();
        this.optionsMenu = new OptionsMenu(this.modalManager, 'ieltsUniversal');

        this.init();
    }

    init() {
        this.bindEvents();
        this.updateWifiStatus();
        this.optionsMenu.loadUserPreferences();
    }

    bindEvents() {
        const bellNotification = document.querySelector('.bell-notification');
        if (bellNotification) {
            bellNotification.addEventListener('click', () => this.showNotifications());
        }

        const optionsMenu = document.querySelector('.options-menu');
        if (optionsMenu) {
            optionsMenu.addEventListener('click', () => this.showOptionsMenu());
        }
    }

    // --- WiFi & Notifications (kept here — tightly coupled to this class) ---

    toggleWifi() {
        this.wifiStatus = !this.wifiStatus;
        this.updateWifiStatus();
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
                ${this.notifications.map(n => `
                    <div class="notification-item">
                        <div class="notification-title">${escapeHTML(n.title)}</div>
                        <div class="notification-message">${escapeHTML(n.message)}</div>
                        <div class="notification-time">${escapeHTML(n.time)}</div>
                    </div>
                `).join('')}
                ${this.notifications.length === 0 ?
                    '<div class="notification-item"><div class="notification-message">No new notifications</div></div>' :
                    ''}
            </div>
        `;
        this.showPopup(content);
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
        const notification = { id: Date.now(), title, message, time: 'Just now' };
        this.notifications.unshift(notification);
        this.updateNotificationBadge();
        this.showToast(`New notification: ${escapeHTML(title)}`, 'info');
    }

    // --- Delegation to ModalManager ---

    showPopup(content, additionalClass) { this.modalManager.showPopup(content, additionalClass); }
    closePopup()                        { this.modalManager.closePopup(); }
    showToast(message, type)            { this.modalManager.showToast(message, type); }

    // --- Delegation to OptionsMenu ---

    showOptionsMenu()                   { this.optionsMenu.showOptionsMenu(); }
    showContrastOptions()               { this.optionsMenu.showContrastOptions(); }
    showTextSizeOptions()               { this.optionsMenu.showTextSizeOptions(); }
    setTheme(theme, notify)             { this.optionsMenu.setTheme(theme, notify); }
    setTextSize(size, notify)           { this.optionsMenu.setTextSize(size, notify); }
    goToSubmission()                    { this.optionsMenu.goToSubmission(); }

    // Expose for backward compatibility
    get currentTheme()    { return this.optionsMenu.currentTheme; }
    get currentTextSize() { return this.optionsMenu.currentTextSize; }
}

// Initialize universal functions when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.ieltsUniversal = new IELTSUniversalFunctions();
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        if (!window.ieltsUniversal) {
            window.ieltsUniversal = new IELTSUniversalFunctions();
        }
    });
} else {
    if (!window.ieltsUniversal) {
        window.ieltsUniversal = new IELTSUniversalFunctions();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = IELTSUniversalFunctions;
}
