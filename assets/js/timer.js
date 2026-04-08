/**
 * ExamTimer — Unified countdown timer for all exam types.
 * ADR-019: Merged TestTimer (IELTS) and CambridgeTimer (Cambridge) into one.
 *
 * Two modes:
 *  1. Overlay mode (Cambridge-style): creates floating timer UI.
 *     new ExamTimer(60, 'reading')
 *
 *  2. Embedded mode (IELTS-style): updates an existing DOM element.
 *     new ExamTimer(60, 'reading', { displayElement: el, onTimeUp: fn })
 *
 * Options:
 *   prefix        — localStorage key prefix (default: 'exam')
 *   displayElement — use this element instead of creating overlay
 *   toggleButton   — play/pause toggle (embedded mode)
 *   resetButton    — reset button (embedded mode)
 *   onTimeUp       — callback when timer reaches 0
 *   playIcon       — HTML for play icon (embedded mode)
 *   pauseIcon      — HTML for pause icon (embedded mode)
 */
class ExamTimer {
    constructor(durationMinutes, moduleName, options = {}) {
        ExamTimer.destroyAllTimers();

        this.moduleName = moduleName;
        this.durationMinutes = durationMinutes;
        this.prefix = options.prefix || 'exam';
        this.moduleKey = ExamTimer.normalizeModuleKey(moduleName);

        // Storage keys
        this.statusKey = `${this.prefix}-${this.moduleKey}Status`;
        this.startTimeKey = `${this.prefix}-${this.moduleKey}StartTime`;
        this.storageKey = `${this.prefix}_timer_${this.moduleKey}`;

        // State
        this.timerInterval = null;
        this.isPaused = false;
        this.timeRemaining = null;
        this.startTime = null;
        this.timerElement = null;
        this.styleElement = null;
        this.alertShown = false;
        this.completionHandled = false;

        // Embedded mode options
        this._displayElement = options.displayElement || null;
        this._toggleBtn = options.toggleButton || null;
        this._resetBtn = options.resetButton || null;
        this._onTimeUp = options.onTimeUp || null;
        this._playIcon = options.playIcon || '';
        this._pauseIcon = options.pauseIcon || '';
        this._embeddedMode = !!options.displayElement;

        ExamTimer.trackInstance(this);
        this.setupNavigationCleanup();
        this.init();
    }

    setupNavigationCleanup() {
        this.beforeUnloadHandler = () => {
            const status = localStorage.getItem(this.statusKey);
            if (status !== 'completed') {
                if (this.startTime && this.timeRemaining > 0) {
                    this.saveTimerState({
                        startTime: this.startTime,
                        totalSeconds: this.durationMinutes * 60,
                        isRunning: true,
                        moduleName: this.moduleName,
                        completed: false
                    });
                }
            }
        };

        this.pageHideHandler = () => {
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
        };

        window.addEventListener('beforeunload', this.beforeUnloadHandler);
        window.addEventListener('pagehide', this.pageHideHandler);
    }

    init() {
        const existingStatus = localStorage.getItem(this.statusKey);
        if (existingStatus === 'completed') {
            this.clearState();
            return;
        }

        const testStartTimeStr = localStorage.getItem(this.startTimeKey);

        if (testStartTimeStr) {
            const testStartTime = new Date(testStartTimeStr).getTime();
            const elapsed = Math.floor((Date.now() - testStartTime) / 1000);
            const totalSeconds = this.durationMinutes * 60;
            this.timeRemaining = Math.max(0, totalSeconds - elapsed);
            this.startTime = testStartTime;
        } else {
            this.timeRemaining = this.durationMinutes * 60;
            this.startTime = Date.now();
        }

        this.saveTimerState({
            startTime: this.startTime,
            totalSeconds: this.durationMinutes * 60,
            isRunning: true,
            moduleName: this.moduleName,
            completed: false
        });

        if (!this.timeRemaining || this.timeRemaining < 0) {
            this.timeRemaining = 0;
        }

        if (this._embeddedMode) {
            this.timerElement = this._displayElement;
        } else {
            this.createTimerUI();
        }

        this.startTimer();
    }

    // ── Overlay UI (Cambridge-style) ──────────────────────────────

    createTimerUI() {
        const existingContainer = document.getElementById('exam-timer-container');
        if (existingContainer) existingContainer.remove();

        const timerContainer = document.createElement('div');
        timerContainer.id = 'exam-timer-container';
        timerContainer.innerHTML = `
            <div class="exam-timer">
                <span class="timer-display" id="exam-timer-display">
                    ${this.formatTime(this.timeRemaining)}
                </span>
            </div>
        `;

        const style = document.createElement('style');
        style.id = 'exam-timer-styles';
        style.textContent = `
            #exam-timer-container {
                position: fixed;
                top: 12px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 999999;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            }
            .exam-timer {
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .exam-timer .timer-display, #exam-timer-container .timer-display {
                font-size: 18px;
                font-weight: 600;
                color: #333;
                letter-spacing: 0.5px;
                text-align: center;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
            }
            .exam-timer.warning .timer-display {
                color: #f57c00;
                animation: exam-timer-pulse-warning 2s ease-in-out infinite;
            }
            .exam-timer.critical .timer-display {
                color: #d32f2f;
                font-weight: 700;
                animation: exam-timer-pulse-critical 1s ease-in-out infinite;
            }
            @keyframes exam-timer-pulse-warning {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
            @keyframes exam-timer-pulse-critical {
                0%, 100% { transform: scale(1); text-shadow: 0 1px 2px rgba(211, 47, 47, 0.3); }
                50% { transform: scale(1.1); text-shadow: 0 2px 4px rgba(211, 47, 47, 0.6); }
            }
            .times-up-modal {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.85);
                display: flex; align-items: center; justify-content: center;
                z-index: 9999999; backdrop-filter: blur(5px);
            }
            .times-up-content {
                background: white; padding: 40px; border-radius: 16px;
                text-align: center; max-width: 500px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                animation: exam-timer-slideIn 0.3s ease-out;
            }
            @keyframes exam-timer-slideIn {
                from { opacity: 0; transform: translateY(-50px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .times-up-title {
                font-size: 32px; font-weight: bold; color: #d32f2f; margin-bottom: 15px;
            }
            .times-up-message {
                font-size: 18px; color: #555; margin-bottom: 30px; line-height: 1.6;
            }
            .times-up-button {
                background: linear-gradient(135deg, #0066cc, #0052a3);
                color: white; border: none; padding: 15px 40px;
                font-size: 16px; font-weight: bold; border-radius: 8px;
                cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;
            }
            .times-up-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0, 102, 204, 0.4);
            }
            .times-up-button:active { transform: translateY(0); }
        `;

        const existingStyle = document.getElementById('exam-timer-styles');
        if (existingStyle) existingStyle.remove();

        document.head.appendChild(style);
        document.body.appendChild(timerContainer);
        this.timerElement = document.getElementById('exam-timer-display');
        this.styleElement = style;
    }

    // ── Timer Logic ───────────────────────────────────────────────

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hours > 0) {
            return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
        return `${minutes}:${String(secs).padStart(2, '0')}`;
    }

    getTimeRemaining() {
        return this.timeRemaining;
    }

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);

        if (this._toggleBtn) {
            this._toggleBtn.innerHTML = this._pauseIcon;
        }

        this.timerInterval = setInterval(() => {
            if (this.isPaused) return;

            if (this.checkForExternalCompletion()) return;

            // Recalculate from start time (accurate, survives refresh)
            const totalSeconds = this.durationMinutes * 60;
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            this.timeRemaining = Math.max(0, totalSeconds - elapsed);

            this.updateDisplay();

            // Save state periodically (every 10 seconds)
            if (elapsed % 10 === 0) {
                this.saveTimerState({
                    startTime: this.startTime,
                    totalSeconds: totalSeconds,
                    isRunning: true,
                    moduleName: this.moduleName,
                    completed: false
                });
            }

            // Warning states
            if (this._embeddedMode) {
                // Embedded mode: add classes to the timer container
                const container = this.timerElement ? this.timerElement.closest('.timer-container') : null;
                if (container) {
                    container.classList.toggle('warning', this.timeRemaining <= 600 && this.timeRemaining > 300);
                    container.classList.toggle('critical', this.timeRemaining <= 300 && this.timeRemaining > 60);
                    container.classList.toggle('urgent', this.timeRemaining <= 60 && this.timeRemaining > 0);
                }
            } else {
                // Overlay mode: style the floating timer
                const timerContainer = document.querySelector('.exam-timer');
                if (timerContainer) {
                    if (this.timeRemaining <= 60 && this.timeRemaining > 0) {
                        timerContainer.classList.add('critical');
                        timerContainer.classList.remove('warning');
                    } else if (this.timeRemaining <= 300) {
                        timerContainer.classList.add('warning');
                        timerContainer.classList.remove('critical');
                    } else {
                        timerContainer.classList.remove('warning', 'critical');
                    }
                }
            }

            // Time's up
            if (this.timeRemaining === 0 && elapsed > 0 && !this.alertShown) {
                this.alertShown = true;
                this.onTimeUp();
            }
        }, 1000);
    }

    updateDisplay() {
        if (this.timerElement) {
            this.timerElement.textContent = this.formatTime(this.timeRemaining);
        }
    }

    onTimeUp() {
        clearInterval(this.timerInterval);
        this.timerInterval = null;

        // Stop any global audio player
        const audioPlayer = document.getElementById('global-audio-player');
        if (audioPlayer) {
            try { audioPlayer.pause(); audioPlayer.currentTime = 0; } catch (e) {}
        }

        this.saveTimerState({
            startTime: this.startTime,
            totalSeconds: this.durationMinutes * 60,
            isRunning: false,
            moduleName: this.moduleName,
            completed: true
        });

        if (this._onTimeUp) {
            this._onTimeUp();
        }

        if (!this._embeddedMode) {
            this.playAlertSound();
            this.showTimesUpModal();
        } else if (this.timerElement) {
            this.timerElement.textContent = "Time's up!";
        }
    }

    playAlertSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {}
    }

    showTimesUpModal() {
        const modal = document.createElement('div');
        modal.className = 'times-up-modal';
        modal.innerHTML = `
            <div class="times-up-content">
                <div class="times-up-title">Time's Up!</div>
                <div class="times-up-message">
                    Your time for the ${this.moduleName} test has ended.<br>
                    Please review your answers and submit when ready.
                </div>
                <button class="times-up-button" onclick="this.parentElement.parentElement.remove()">
                    I Understand
                </button>
            </div>
        `;
        document.body.appendChild(modal);
        setTimeout(() => { if (modal.parentElement) modal.remove(); }, 10000);
    }

    // ── Embedded mode controls (IELTS-style) ─────────────────────

    start() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.isPaused = false;
        this.startTimer();
    }

    pause() {
        this.isPaused = true;
        if (this._toggleBtn) {
            this._toggleBtn.innerHTML = this._playIcon;
        }
    }

    resume() {
        this.isPaused = false;
        if (this._toggleBtn) {
            this._toggleBtn.innerHTML = this._pauseIcon;
        }
    }

    toggle() {
        if (this.isPaused) {
            this.resume();
        } else {
            this.pause();
        }
    }

    reset() {
        if (!confirm('Are you sure you want to reset the timer?')) return;
        this.timeRemaining = this.durationMinutes * 60;
        this.startTime = Date.now();
        if (this.timerElement) {
            this.timerElement.textContent = this.formatTime(this.timeRemaining);
        }
        this.start();
    }

    // ── State persistence ─────────────────────────────────────────

    checkForExternalCompletion() {
        const status = localStorage.getItem(this.statusKey);
        if (status === 'completed') {
            this.handleExternalCompletion();
            return true;
        }
        return false;
    }

    handleExternalCompletion() {
        if (this.completionHandled) return;
        this.completionHandled = true;
        this.destroy();
        this.clearState();
    }

    saveTimerState(state) {
        localStorage.setItem(this.storageKey, JSON.stringify(state));
    }

    loadTimerState() {
        const saved = localStorage.getItem(this.storageKey);
        return saved ? JSON.parse(saved) : null;
    }

    clearState() {
        localStorage.removeItem(this.storageKey);
        // Also clear legacy key format
        const legacyKey = `cambridge_timer_${this.moduleKey}`;
        if (legacyKey !== this.storageKey) {
            localStorage.removeItem(legacyKey);
        }
    }

    // ── Lifecycle ─────────────────────────────────────────────────

    destroy() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        if (this.beforeUnloadHandler) {
            window.removeEventListener('beforeunload', this.beforeUnloadHandler);
            this.beforeUnloadHandler = null;
        }
        if (this.pageHideHandler) {
            window.removeEventListener('pagehide', this.pageHideHandler);
            this.pageHideHandler = null;
        }

        if (!this._embeddedMode) {
            const container = document.getElementById('exam-timer-container');
            if (container) container.remove();
            if (this.styleElement && this.styleElement.parentNode) {
                this.styleElement.remove();
                this.styleElement = null;
            }
            const styleById = document.getElementById('exam-timer-styles');
            if (styleById) styleById.remove();
            const timesUpModal = document.querySelector('.times-up-modal');
            if (timesUpModal) timesUpModal.remove();
        }

        ExamTimer.untrackInstance(this);
    }

    // ── Static methods ────────────────────────────────────────────

    static destroyAllTimers() {
        if (ExamTimer.activeTimers && ExamTimer.activeTimers.size) {
            Array.from(ExamTimer.activeTimers).forEach(t => t.destroy());
            ExamTimer.activeTimers.clear();
        }
        // Cleanup orphaned overlay elements
        const container = document.getElementById('exam-timer-container');
        if (container) container.remove();
        const style = document.getElementById('exam-timer-styles');
        if (style) style.remove();
        const modal = document.querySelector('.times-up-modal');
        if (modal) modal.remove();
    }

    static clearTimerState(moduleName) {
        const key = `exam_timer_${ExamTimer.normalizeModuleKey(moduleName)}`;
        localStorage.removeItem(key);
        // Also clear legacy Cambridge keys
        const legacyKey = `cambridge_timer_${ExamTimer.normalizeModuleKey(moduleName)}`;
        localStorage.removeItem(legacyKey);
    }

    static clearAllTimerStates() {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('exam_timer_') || key.startsWith('cambridge_timer_')) {
                localStorage.removeItem(key);
            }
        });
    }

    static normalizeModuleKey(value) {
        const text = (value || '').toString().toLowerCase().trim();
        return text
            .replace(/&/g, ' ')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '') || 'module';
    }

    static trackInstance(instance) {
        if (!ExamTimer.activeTimers) ExamTimer.activeTimers = new Set();
        ExamTimer.activeTimers.add(instance);
    }

    static untrackInstance(instance) {
        if (ExamTimer.activeTimers) ExamTimer.activeTimers.delete(instance);
    }

    static getTimerStateKey(moduleIdentifier) {
        return `exam_timer_${ExamTimer.normalizeModuleKey(moduleIdentifier)}`;
    }

    // Cambridge-specific duration lookup (kept for backward compat)
    static getTimerDuration(level, module) {
        const durations = {
            'A1-Movers': { 'reading-writing': 35, 'listening': 30, 'speaking': 7 },
            'A2-Key':    { 'reading-writing': 60, 'listening': 30, 'speaking': 10 },
            'B1-Preliminary': { 'reading': 45, 'writing': 45, 'reading-writing': 90, 'listening': 40, 'speaking': 12 },
            'B2-First':  { 'reading': 75, 'writing': 80, 'listening': 40, 'speaking': 14 }
        };
        return durations[level]?.[module] || 60;
    }
}

ExamTimer.activeTimers = new Set();

/**
 * TestTimer — backward-compatible wrapper for IELTS test pages.
 * API: new TestTimer({ durationSeconds, displayElement, toggleButton, resetButton, onTimeUp, playIcon, pauseIcon })
 */
class TestTimer {
    constructor(options) {
        const durationMinutes = (options.durationSeconds || 3600) / 60;
        this._timer = new ExamTimer(durationMinutes, 'ielts-test', {
            prefix: 'ielts',
            displayElement: options.displayElement,
            toggleButton: options.toggleButton,
            resetButton: options.resetButton,
            onTimeUp: options.onTimeUp,
            playIcon: options.playIcon || '',
            pauseIcon: options.pauseIcon || ''
        });
    }
    formatTime(s) { return this._timer.formatTime(s); }
    getTimeRemaining() { return this._timer.getTimeRemaining(); }
    start() { this._timer.start(); }
    pause() { this._timer.pause(); }
    toggle() { this._timer.toggle(); }
    reset() { this._timer.reset(); }
}

/**
 * CambridgeTimer — backward-compatible wrapper.
 * API: new CambridgeTimer(durationMinutes, moduleName)
 */
class CambridgeTimer {
    constructor(durationMinutes, moduleName) {
        this._timer = new ExamTimer(durationMinutes, moduleName, { prefix: 'cambridge' });
    }
    pause()  { this._timer.pause(); }
    resume() { this._timer.resume(); }
    destroy(){ this._timer.destroy(); }
    static destroyAllTimers()         { ExamTimer.destroyAllTimers(); }
    static clearTimerState(mod)       { ExamTimer.clearTimerState(mod); }
    static clearAllTimerStates()      { ExamTimer.clearAllTimerStates(); }
    static getTimerStateKey(mod)      { return ExamTimer.getTimerStateKey(mod); }
    static normalizeModuleKey(val)    { return ExamTimer.normalizeModuleKey(val); }
    static getTimerDuration(lvl, mod) { return ExamTimer.getTimerDuration(lvl, mod); }
}

CambridgeTimer.activeTimers = ExamTimer.activeTimers;

// Expose globally
if (typeof window !== 'undefined') {
    window.ExamTimer = ExamTimer;
    window.TestTimer = TestTimer;
    window.CambridgeTimer = CambridgeTimer;
}
