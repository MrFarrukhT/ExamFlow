// Cambridge Test Timer System
// Manages countdown timers for Cambridge tests with alerts when time is up

class CambridgeTimer {
    constructor(durationMinutes, moduleName) {
        this.moduleName = moduleName;
        this.durationMinutes = durationMinutes;
        this.moduleKey = CambridgeTimer.normalizeModuleKey(moduleName);
        this.statusKey = `${this.moduleKey}Status`;
        this.startTimeKey = `${this.moduleKey}StartTime`;
        this.storageKey = CambridgeTimer.getTimerStateKey(moduleName);
        this.timerInterval = null;
        this.isPaused = false;
        this.timeRemaining = null;
        this.startTime = null;
        this.timerElement = null;
        this.alertShown = false;
        this.completionHandled = false;
        CambridgeTimer.trackInstance(this);
        this.init();
    }

    init() {
        console.log('рџ•ђ Initializing timer:', this.durationMinutes, 'minutes for', this.moduleName);
        
        const existingStatus = localStorage.getItem(this.statusKey);
        if (existingStatus === 'completed') {
            // Module already marked as finished - ensure no stray timer state remains
            CambridgeTimer.clearTimerState(this.moduleName);
            return;
        }
        
        // Try to get the actual test start time from module storage
        const testStartTimeStr = localStorage.getItem(this.startTimeKey);
        
        if (testStartTimeStr) {
            // Test is in progress - calculate time based on actual test start
            const testStartTime = new Date(testStartTimeStr).getTime();
            const elapsed = Math.floor((Date.now() - testStartTime) / 1000);
            const totalSeconds = this.durationMinutes * 60;
            this.timeRemaining = Math.max(0, totalSeconds - elapsed);
            this.startTime = testStartTime;
            
            console.log('рџ“‚ Restored from test start time:', {
                testStarted: testStartTimeStr,
                elapsed: Math.floor(elapsed / 60) + ' minutes',
                remaining: Math.floor(this.timeRemaining / 60) + ' minutes'
            });
            
            // Save state
            this.saveTimerState({
                startTime: this.startTime,
                totalSeconds: totalSeconds,
                isRunning: true,
                moduleName: this.moduleName,
                completed: false
            });
        } else {
            // New timer
            this.timeRemaining = this.durationMinutes * 60;
            this.startTime = Date.now();
            this.saveTimerState({
                startTime: this.startTime,
                totalSeconds: this.timeRemaining,
                isRunning: true,
                moduleName: this.moduleName,
                completed: false
            });
            console.log('вњЁ Started new timer:', this.timeRemaining, 'seconds');
        }

        // Ensure timeRemaining is valid
        if (!this.timeRemaining || this.timeRemaining < 0) {
            console.warn('вљ пёЏ Timer expired or invalid');
            this.timeRemaining = 0;
        }

        this.createTimerUI();
        this.startTimer();
    }

    createTimerUI() {
        // Remove any existing timer container first
        const existingContainer = document.getElementById('cambridge-timer-container');
        if (existingContainer) {
            existingContainer.remove();
        }
        
        // Create timer container
        const timerContainer = document.createElement('div');
        timerContainer.id = 'cambridge-timer-container';
        timerContainer.innerHTML = `
            <div class="cambridge-timer">
                <span class="timer-display" id="cambridge-timer-display">
                    ${this.formatTime(this.timeRemaining)}
                </span>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            #cambridge-timer-container {
                position: fixed;
                top: 12px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 999999;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            }

            .cambridge-timer {
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .timer-display {
                font-size: 18px;
                font-weight: 600;
                color: #333;
                letter-spacing: 0.5px;
                text-align: center;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
            }

            .cambridge-timer.warning .timer-display {
                color: #f57c00;
                animation: pulse-warning 2s ease-in-out infinite;
            }

            .cambridge-timer.critical .timer-display {
                color: #d32f2f;
                font-weight: 700;
                animation: pulse-critical 1s ease-in-out infinite;
            }

            @keyframes pulse-warning {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }

            @keyframes pulse-critical {
                0%, 100% { 
                    transform: scale(1);
                    text-shadow: 0 1px 2px rgba(211, 47, 47, 0.3);
                }
                50% { 
                    transform: scale(1.1);
                    text-shadow: 0 2px 4px rgba(211, 47, 47, 0.6);
                }
            }

            /* Time's up modal */
            .times-up-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.85);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999999;
                backdrop-filter: blur(5px);
            }

            .times-up-content {
                background: white;
                padding: 40px;
                border-radius: 16px;
                text-align: center;
                max-width: 500px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                animation: slideIn 0.3s ease-out;
            }

            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateY(-50px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .times-up-icon {
                font-size: 64px;
                margin-bottom: 20px;
            }

            .times-up-title {
                font-size: 32px;
                font-weight: bold;
                color: #d32f2f;
                margin-bottom: 15px;
            }

            .times-up-message {
                font-size: 18px;
                color: #555;
                margin-bottom: 30px;
                line-height: 1.6;
            }

            .times-up-button {
                background: linear-gradient(135deg, #0066cc, #0052a3);
                color: white;
                border: none;
                padding: 15px 40px;
                font-size: 16px;
                font-weight: bold;
                border-radius: 8px;
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
            }

            .times-up-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0, 102, 204, 0.4);
            }

            .times-up-button:active {
                transform: translateY(0);
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(timerContainer);
        this.timerElement = document.getElementById('cambridge-timer-display');
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
        return `${minutes}:${String(secs).padStart(2, '0')}`;
    }

    startTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        this.timerInterval = setInterval(() => {
            if (!this.isPaused) {
                if (this.checkForExternalCompletion()) {
                    return;
                }
                // Recalculate time remaining from start time (more accurate, survives PC reboot)
                const totalSeconds = this.durationMinutes * 60;
                const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
                this.timeRemaining = Math.max(0, totalSeconds - elapsed);
                
                this.updateDisplay();

                // Update saved state periodically (every 10 seconds)
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
                const timerContainer = document.querySelector('.cambridge-timer');
                if (timerContainer) {
                    if (this.timeRemaining <= 60 && this.timeRemaining > 0) {
                        // Last minute - critical
                        timerContainer.classList.add('critical');
                        timerContainer.classList.remove('warning');
                    } else if (this.timeRemaining <= 300) {
                        // Last 5 minutes - warning
                        timerContainer.classList.add('warning');
                        timerContainer.classList.remove('critical');
                    } else {
                        timerContainer.classList.remove('warning', 'critical');
                    }
                }

                // Time's up (only show alert once)
                if (this.timeRemaining === 0 && elapsed > 0 && !this.alertShown) {
                    this.alertShown = true;
                    this.onTimeUp();
                }
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

        // Stop any global audio player (important for listening tests)
        const audioPlayer = document.getElementById('global-audio-player');
        if (audioPlayer) {
            try {
                audioPlayer.pause();
                audioPlayer.currentTime = 0;
            } catch (e) {
                console.warn('Could not stop audio on timer expiry:', e);
            }
        }

        this.saveTimerState({
            startTime: this.startTime,
            totalSeconds: this.durationMinutes * 60,
            isRunning: false,
            moduleName: this.moduleName,
            completed: true
        });

        // Play alert sound (optional - using beep)
        this.playAlertSound();

        // Show time's up modal
        this.showTimesUpModal();
    }

    playAlertSound() {
        try {
            // Create a simple beep sound using Web Audio API
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
        } catch (e) {
            console.log('Could not play alert sound:', e);
        }
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

        // Auto-close after 10 seconds if not manually closed
        setTimeout(() => {
            if (modal && modal.parentElement) {
                modal.remove();
            }
        }, 10000);
    }

    checkForExternalCompletion() {
        const status = localStorage.getItem(this.statusKey);
        if (status === 'completed') {
            this.handleExternalCompletion('status-update');
            return true;
        }
        return false;
    }

    handleExternalCompletion(reason = 'status-update') {
        if (this.completionHandled) {
            return;
        }
        this.completionHandled = true;
        console.log('CambridgeTimer: external completion detected for', this.moduleName, 'via', reason);
        this.destroy();
        CambridgeTimer.clearTimerState(this.moduleName);
    }

    pause() {
        this.isPaused = true;
    }

    resume() {
        this.isPaused = false;
    }

    destroy() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        CambridgeTimer.untrackInstance(this);
        const container = document.getElementById('cambridge-timer-container');
        if (container) {
            container.remove();
        }
        console.log('рџ§№ Timer destroyed for', this.moduleName);
    }
    // Static method to destroy all existing timers
    static destroyAllTimers() {
        if (CambridgeTimer.activeTimers && CambridgeTimer.activeTimers.size) {
            Array.from(CambridgeTimer.activeTimers).forEach(timer => timer.destroy());
            CambridgeTimer.activeTimers.clear();
        }
        const container = document.getElementById('cambridge-timer-container');
        if (container) {
            container.remove();
        }
        console.log('?? Cleared all timer displays');
    }
    saveTimerState(state) {
        localStorage.setItem(this.storageKey, JSON.stringify(state));
    }

    loadTimerState() {
        let saved = localStorage.getItem(this.storageKey);
        if (!saved) {
            const legacyKey = `cambridge_timer_${this.moduleName}`;
            saved = localStorage.getItem(legacyKey);
        }
        return saved ? JSON.parse(saved) : null;
    }
    // Static method to clear timer state (call when test is completed)
    static clearTimerState(moduleName) {
        const normalizedKey = CambridgeTimer.getTimerStateKey(moduleName);
        localStorage.removeItem(normalizedKey);
        const legacyKey = `cambridge_timer_${moduleName}`;
        if (legacyKey !== normalizedKey) {
            localStorage.removeItem(legacyKey);
        }
        console.log('?? Cleared timer state for:', moduleName);
    }
    // Static method to clear all Cambridge timer states
    static clearAllTimerStates() {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('cambridge_timer_')) {
                localStorage.removeItem(key);
                console.log('рџ—‘пёЏ Cleared:', key);
            }
        });
    }

    static getTimerStateKey(moduleIdentifier) {
        const normalized = CambridgeTimer.normalizeModuleKey(moduleIdentifier);
        return `cambridge_timer_${normalized}`;
    }

    static normalizeModuleKey(value) {
        const text = (value || '').toString().toLowerCase().trim();
        const slug = text
            .replace(/&/g, ' ')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        return slug || 'module';
    }

    static trackInstance(instance) {
        if (!CambridgeTimer.activeTimers) {
            CambridgeTimer.activeTimers = new Set();
        }
        CambridgeTimer.activeTimers.add(instance);
    }

    static untrackInstance(instance) {
        if (CambridgeTimer.activeTimers) {
            CambridgeTimer.activeTimers.delete(instance);
        }
    }
    // Static method to get timer configurations for different test types
    static getTimerDuration(level, module) {
        const durations = {
            'A1-Movers': {
                'reading-writing': 60,  // 60 minutes
                'listening': 30,        // 30 minutes
                'speaking': 7           // 7 minutes
            },
            'A2-Key': {
                'reading-writing': 60,  // 60 minutes
                'listening': 30,        // 30 minutes
                'speaking': 10          // 10 minutes
            },
            'B1-Preliminary': {
                'reading': 45,          // 45 minutes
                'writing': 45,          // 45 minutes
                'reading-writing': 90,  // 90 minutes (combined)
                'listening': 40,        // 40 minutes
                'speaking': 12          // 12 minutes
            },
            'B2-First': {
                'reading': 75,          // 75 minutes (Reading & Use of English)
                'writing': 80,          // 80 minutes
                'listening': 40,        // 40 minutes
                'speaking': 14          // 14 minutes
            }
        };

        return durations[level]?.[module] || 60; // Default to 60 minutes
    }
}

CambridgeTimer.activeTimers = new Set();

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.CambridgeTimer = CambridgeTimer;
}






