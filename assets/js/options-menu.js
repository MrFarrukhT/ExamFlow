// Options Menu — extracted from universal-functions.js (ADR-014)
// Handles contrast/theme, text size, preferences persistence, and submission navigation.
// Requires: ModalManager instance, a global name string for onclick callbacks (e.g. 'ieltsUniversal').

class OptionsMenu {
    /**
     * @param {ModalManager} modalManager
     * @param {string} globalName — the global variable name used in inline onclick handlers
     */
    constructor(modalManager, globalName) {
        this.modalManager = modalManager;
        this.globalName = globalName;
        this.currentTheme = 'light';
        this.currentTextSize = 'medium';
    }

    showOptionsMenu() {
        const g = this.globalName;
        const content = `
            <div class="popup-header">
                <div class="popup-title">Options</div>
                <button class="popup-close" onclick="${g}.closePopup()">&times;</button>
            </div>
            <div class="popup-body options-popup">
                <div class="option-item submit-option" onclick="${g}.goToSubmission()">
                    <div class="option-icon">
                        <i class="fa fa-send" aria-hidden="true"></i>
                    </div>
                    <div class="option-text">Submit this section</div>
                    <div class="option-arrow">
                        <i class="fa fa-chevron-right" aria-hidden="true"></i>
                    </div>
                </div>
                <div class="option-item" onclick="${g}.showContrastOptions()">
                    <div class="option-icon">
                        <i class="fa fa-info-circle" aria-hidden="true"></i>
                    </div>
                    <div class="option-text">Contrast</div>
                    <div class="option-arrow">
                        <i class="fa fa-chevron-right" aria-hidden="true"></i>
                    </div>
                </div>
                <div class="option-item" onclick="${g}.showTextSizeOptions()">
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
        this.modalManager.showPopup(content, 'options-popup');
    }

    showContrastOptions() {
        const g = this.globalName;
        const content = `
            <div class="popup-header">
                <button class="popup-back" onclick="${g}.showOptionsMenu()">
                    <i class="fa fa-chevron-left" aria-hidden="true"></i>
                    <span>Options</span>
                </button>
                <div class="popup-title">Display Contrast</div>
                <div style="width: 40px;"></div>
            </div>
            <div class="popup-body">
                <div class="contrast-options">
                    <div class="contrast-option ${this.currentTheme === 'light' ? 'active' : ''}"
                         onclick="${g}.setTheme('light')">
                        <div>Black on white</div>
                    </div>
                    <div class="contrast-option dark-preview ${this.currentTheme === 'dark' ? 'active' : ''}"
                         onclick="${g}.setTheme('dark')">
                        <div>White on black</div>
                    </div>
                </div>
            </div>
        `;
        this.modalManager.showPopup(content);
    }

    showTextSizeOptions() {
        const g = this.globalName;
        const content = `
            <div class="popup-header">
                <button class="popup-back" onclick="${g}.showOptionsMenu()">
                    <i class="fa fa-chevron-left" aria-hidden="true"></i>
                    <span>Options</span>
                </button>
                <div class="popup-title">Text Size</div>
                <div style="width: 40px;"></div>
            </div>
            <div class="popup-body">
                <div class="text-size-options">
                    <div class="text-size-option small ${this.currentTextSize === 'small' ? 'active' : ''}"
                         onclick="${g}.setTextSize('small')">
                        Small
                    </div>
                    <div class="text-size-option medium ${this.currentTextSize === 'medium' ? 'active' : ''}"
                         onclick="${g}.setTextSize('medium')">
                        Medium
                    </div>
                    <div class="text-size-option large ${this.currentTextSize === 'large' ? 'active' : ''}"
                         onclick="${g}.setTextSize('large')">
                        Large
                    </div>
                </div>
            </div>
        `;
        this.modalManager.showPopup(content);
    }

    setTheme(theme, showNotification = true) {
        this.currentTheme = theme;
        document.body.className = document.body.className.replace(/dark-mode|light-mode/g, '');
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
        }
        this.saveUserPreferences();
        if (showNotification) {
            this.modalManager.showToast(`Theme changed to ${theme} mode`, 'success');
        }

        document.querySelectorAll('.contrast-option').forEach(option => {
            option.classList.remove('active');
        });
        const activeOption = document.querySelector(`.contrast-option:nth-child(${theme === 'light' ? '1' : '2'})`);
        if (activeOption) {
            activeOption.classList.add('active');
        }
    }

    setTextSize(size, showNotification = true) {
        this.currentTextSize = size;
        document.body.className = document.body.className.replace(/text-small|text-medium|text-large/g, '');
        document.body.classList.add(`text-${size}`);
        this.saveUserPreferences();
        if (showNotification) {
            this.modalManager.showToast(`Text size changed to ${size}`, 'success');
        }

        document.querySelectorAll('.text-size-option').forEach(option => {
            option.classList.remove('active');
        });
        const activeOption = document.querySelector(`.text-size-option.${size}`);
        if (activeOption) {
            activeOption.classList.add('active');
        }
    }

    goToSubmission() {
        // Delegate to the existing deliver button (the green checkmark in the
        // footer). That handler runs the proper submission flow:
        //   - opens the review modal (if examProgress is loaded), so the
        //     student sees how many answers they have before finalizing
        //   - calls _executeSubmission which actually POSTs to the database
        //   - falls back to a confirm() if the review modal isn't available
        // Previously this method just flipped localStorage status to "completed"
        // and redirected, which left the student thinking they had submitted
        // when in fact no database row was created. Both paths now converge.
        this.modalManager.closePopup();

        const deliverBtn = document.getElementById('deliver-button');
        if (deliverBtn) {
            // Use a microtask so the popup-close transition can finish first
            setTimeout(() => deliverBtn.click(), 0);
            return;
        }

        // Fallback: no deliver button on this page (older test pages, edge
        // cases). Use a clearer confirm message and the original flow.
        if (confirm('Submit this section now? You will return to the dashboard and cannot resume this section.')) {
            const currentModule = this.getCurrentModule();
            if (currentModule) {
                localStorage.setItem(`${currentModule}Status`, 'completed');
                localStorage.setItem(`${currentModule}EndTime`, new Date().toISOString());
            }
            this.modalManager.showToast('Redirecting to dashboard...', 'info');
            setTimeout(() => {
                const isCambridge = this.isCambridgeTest();
                window.location.href = isCambridge
                    ? '../../dashboard-cambridge.html'
                    : '../../student-dashboard.html';
            }, 1000);
        }
    }

    isCambridgeTest() {
        const examType = localStorage.getItem('examType');
        if (examType === 'Cambridge') return true;

        const path = window.location.pathname;
        if (path.includes('/Cambridge/') || path.includes('cambridge')) return true;

        const cambridgeLevel = localStorage.getItem('cambridgeLevel');
        if (cambridgeLevel) return true;

        return false;
    }

    getCurrentModule() {
        const skill = document.body.dataset.skill;
        if (skill) return skill;

        const path = window.location.pathname;
        if (path.includes('reading.html')) return 'reading';
        if (path.includes('listening.html')) return 'listening';
        if (path.includes('writing.html')) return 'writing';

        return null;
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
                    this.setTheme(preferences.theme, false);
                }
                if (preferences.textSize) {
                    this.setTextSize(preferences.textSize, false);
                }
            } catch (e) {
                // Error loading user preferences
            }
        }
    }
}
