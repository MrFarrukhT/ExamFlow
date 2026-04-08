/**
 * TestTimer - Reusable countdown timer for test pages.
 *
 * Usage:
 *   const timer = new TestTimer({
 *       durationSeconds: 3600,
 *       displayElement: document.querySelector('.timer-display'),
 *       toggleButton: document.getElementById('timer-toggle-btn'),
 *       resetButton: document.getElementById('timer-reset-btn'),
 *       onTimeUp: () => checkAnswers(),
 *       playIcon: '<svg ...>',
 *       pauseIcon: '<svg ...>'
 *   });
 *   timer.start();
 */
(function () {
    'use strict';

    class TestTimer {
        /**
         * @param {Object} options
         * @param {number}      options.durationSeconds  - total countdown seconds
         * @param {HTMLElement}  options.displayElement   - element whose textContent shows mm:ss
         * @param {HTMLElement}  [options.toggleButton]   - play/pause toggle button
         * @param {HTMLElement}  [options.resetButton]    - reset button
         * @param {Function}    [options.onTimeUp]       - callback when timer reaches 0
         * @param {string}      [options.playIcon]       - HTML/SVG for the play icon
         * @param {string}      [options.pauseIcon]      - HTML/SVG for the pause icon
         */
        constructor(options) {
            this._duration = options.durationSeconds;
            this._remaining = options.durationSeconds;
            this._display = options.displayElement;
            this._toggleBtn = options.toggleButton || null;
            this._resetBtn = options.resetButton || null;
            this._onTimeUp = options.onTimeUp || null;
            this._playIcon = options.playIcon || '';
            this._pauseIcon = options.pauseIcon || '';
            this._interval = null;
        }

        /**
         * Format seconds into "MM:SS" string.
         * @param {number} totalSeconds
         * @returns {string}
         */
        formatTime(totalSeconds) {
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            return minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
        }

        /**
         * Returns how many seconds are left on the clock.
         * @returns {number}
         */
        getTimeRemaining() {
            return this._remaining;
        }

        /**
         * Start (or resume) the countdown.
         */
        start() {
            if (this._interval) clearInterval(this._interval);

            this._interval = setInterval(() => {
                this._remaining--;
                if (this._display) {
                    this._display.textContent = this.formatTime(this._remaining);
                    const container = this._display.closest('.timer-container');
                    if (container) {
                        container.classList.toggle('warning', this._remaining <= 600 && this._remaining > 300);
                        container.classList.toggle('critical', this._remaining <= 300 && this._remaining > 60);
                        container.classList.toggle('urgent', this._remaining <= 60 && this._remaining > 0);
                    }
                }
                if (this._remaining <= 0) {
                    clearInterval(this._interval);
                    this._interval = null;
                    if (this._display) {
                        this._display.textContent = "Time's up!";
                    }
                    if (this._onTimeUp) {
                        this._onTimeUp();
                    }
                }
            }, 1000);

            if (this._toggleBtn) {
                this._toggleBtn.innerHTML = this._pauseIcon;
            }
        }

        /**
         * Pause the countdown.
         */
        pause() {
            clearInterval(this._interval);
            this._interval = null;
            if (this._toggleBtn) {
                this._toggleBtn.innerHTML = this._playIcon;
            }
        }

        /**
         * Toggle between running and paused states.
         */
        toggle() {
            // Check based on the icon currently displayed (pause icon path = running)
            if (this._toggleBtn && this._toggleBtn.innerHTML.includes('M6 19h4V5H6v14z')) {
                this.pause();
            } else {
                this.start();
            }
        }

        /**
         * Reset the timer back to the original duration and restart.
         * Prompts the user for confirmation before resetting.
         */
        reset() {
            if (!confirm('Are you sure you want to reset the timer?')) {
                return;
            }
            this._remaining = this._duration;
            if (this._display) {
                this._display.textContent = this.formatTime(this._remaining);
            }
            this.start();
            if (this._toggleBtn) {
                this._toggleBtn.innerHTML = this._pauseIcon;
            }
        }
    }

    window.TestTimer = TestTimer;
})();
