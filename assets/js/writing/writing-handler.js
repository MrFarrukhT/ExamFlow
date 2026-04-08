// Writing Task Handler - Core functionality for writing tests
class WritingHandler {
    constructor() {
        this.currentTask = 1;
        this.timeRemaining = 3600; // 60 minutes
        this.timerInterval = null;
        this.isTimerRunning = false;
        this.autosaveInterval = null;

        // Store references for cleanup in destroy()
        this._boundHandlers = {
            textareaListeners: [],  // { element, event, handler } entries
            submitBtn: null,
            submitHandler: null,
            timerToggle: null,
            timerToggleHandler: null,
            timerReset: null,
            timerResetHandler: null,
            resizerMousedown: null,
            resizerTouchstart: null,
            resizerEl: null,
            beforeunloadHandler: null
        };

        this.init();
    }

    init() {
        this.bindEvents();
        this.initializeTimer();
        this.initializeResizer();
        this.initializeAutoSave();
        this.updateWordCounts();
    }

    bindEvents() {
        // Task switching buttons
        document.querySelectorAll('[onclick*="switchTask"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const taskNum = btn.textContent.includes('1') || btn.id.includes('1') ? 1 : 2;
                this.switchTask(taskNum);
            });
        });

        // Submit button
        const submitBtn = document.getElementById('deliver-button');
        if (submitBtn) {
            const submitHandler = (e) => {
                e.preventDefault();
                this.submitWriting();
            };
            submitBtn.addEventListener('click', submitHandler);
            this._boundHandlers.submitBtn = submitBtn;
            this._boundHandlers.submitHandler = submitHandler;
        }

        // Timer controls
        const timerToggle = document.getElementById('timer-toggle-btn');
        const timerReset = document.getElementById('timer-reset-btn');

        if (timerToggle) {
            const toggleHandler = () => this.toggleTimer();
            timerToggle.addEventListener('click', toggleHandler);
            this._boundHandlers.timerToggle = timerToggle;
            this._boundHandlers.timerToggleHandler = toggleHandler;
        }

        if (timerReset) {
            const resetHandler = () => this.resetTimer();
            timerReset.addEventListener('click', resetHandler);
            this._boundHandlers.timerReset = timerReset;
            this._boundHandlers.timerResetHandler = resetHandler;
        }

        // Word count updates with limit enforcement
        document.querySelectorAll('.writing-area').forEach(textarea => {
            const inputHandler = (e) => {
                const taskId = e.target.id.includes('1') ? 'task1' : 'task2';
                this.updateWordCount(taskId);
            };
            textarea.addEventListener('input', inputHandler);
            this._boundHandlers.textareaListeners.push({ element: textarea, event: 'input', handler: inputHandler });

            // Disable copy and paste
            const copyHandler = (e) => {
                e.preventDefault();
            };
            textarea.addEventListener('copy', copyHandler);
            this._boundHandlers.textareaListeners.push({ element: textarea, event: 'copy', handler: copyHandler });

            const pasteHandler = (e) => {
                e.preventDefault();
            };
            textarea.addEventListener('paste', pasteHandler);
            this._boundHandlers.textareaListeners.push({ element: textarea, event: 'paste', handler: pasteHandler });

            const cutHandler = (e) => {
                e.preventDefault();
            };
            textarea.addEventListener('cut', cutHandler);
            this._boundHandlers.textareaListeners.push({ element: textarea, event: 'cut', handler: cutHandler });
        });
    }

    switchTask(taskNumber) {
        this.currentTask = taskNumber;
        
        // Hide all task sets
        document.querySelectorAll('.task-set').forEach(el => el.classList.remove('active'));
        
        // Show selected task sets
        document.getElementById(`task-${taskNumber}`).classList.add('active');
        document.getElementById(`writing-${taskNumber}`).classList.add('active');
        
        // Update button states
        document.querySelectorAll('.task-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`bottomTask${taskNumber}Btn`).classList.add('active');
        
        // Update navigation buttons opacity
        document.querySelectorAll('.task-nav-btn').forEach(btn => btn.style.opacity = '0.7');
        document.getElementById(`task${taskNumber}Btn`).style.opacity = '1';
        
    }

    updateWordCount(taskId) {
        const textarea = document.getElementById(`${taskId}-textarea`);
        const wordCountEl = document.getElementById(`${taskId}-word-count`);
        const bottomCountEl = document.getElementById(`bottom-${taskId}-count`);
        
        if (!textarea || !wordCountEl) return;
        
        let text = textarea.value.trim();
        let wordCount = text === '' ? 0 : text.split(/\s+/).length;
        const maxWords = 500; // 500 word limit
        
        // Enforce 500 word limit - show warning and prevent further input (do NOT delete existing text)
        if (wordCount > maxWords) {
            // Store the previous valid text if not already stored
            if (!textarea.dataset.lastValidText) {
                const words = text.split(/\s+/);
                textarea.dataset.lastValidText = words.slice(0, maxWords).join(' ');
            }
            // Restore to the last valid text (prevents new words, keeps existing text)
            textarea.value = textarea.dataset.lastValidText;
            wordCount = maxWords;
        } else {
            // Update the last valid text whenever we're within the limit
            textarea.dataset.lastValidText = text;
        }

        // Show or hide the word limit warning message
        let warningEl = textarea.parentElement.querySelector('.word-limit-warning');
        if (wordCount >= maxWords) {
            if (!warningEl) {
                warningEl = document.createElement('div');
                warningEl.className = 'word-limit-warning';
                warningEl.style.cssText = 'color: #e74c3c; font-weight: bold; padding: 6px 10px; margin-top: 4px; background: #fdecea; border: 1px solid #e74c3c; border-radius: 4px; font-size: 13px;';
                textarea.parentElement.appendChild(warningEl);
            }
            warningEl.textContent = 'Word limit reached (500 words). Please remove some words before adding new text.';
            warningEl.style.display = 'block';
        } else if (warningEl) {
            warningEl.style.display = 'none';
        }

        // Update main word count display with limit
        const limitMessage = wordCount >= maxWords ? ' (Limit reached)' : '';
        wordCountEl.textContent = `Word count: ${wordCount}/500${limitMessage}`;
        
        // Update bottom navigation count
        if (bottomCountEl) {
            bottomCountEl.textContent = `(${wordCount} words)`;
        }
        
        // Color coding for word count
        const minWords = taskId === 'task1' ? 150 : 250;
        
        if (wordCount >= maxWords) {
            wordCountEl.className = 'word-count limit';
        } else if (wordCount < minWords) {
            wordCountEl.className = 'word-count warning';
        } else if (wordCount >= maxWords * 0.9) {
            // Warning when approaching limit (90% = 450 words)
            wordCountEl.className = 'word-count warning';
        } else {
            wordCountEl.className = 'word-count good';
        }
        
        return wordCount;
    }

    updateWordCounts() {
        this.updateWordCount('task1');
        this.updateWordCount('task2');
    }

    initializeTimer() {
        this.updateTimerDisplay();
        // Auto-start timer
        this.startTimer();
    }

    startTimer() {
        if (this.timerInterval) return;
        
        this.isTimerRunning = true;
        this.updateTimerButton(true);
        
        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();
            
            if (this.timeRemaining <= 0) {
                this.timeUp();
            }
        }, 1000);
    }

    pauseTimer() {
        this.isTimerRunning = false;
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.updateTimerButton(false);
    }

    toggleTimer() {
        if (this.isTimerRunning) {
            this.pauseTimer();
        } else {
            this.startTimer();
        }
    }

    resetTimer() {
        this.pauseTimer();
        this.timeRemaining = 3600; // Reset to 60 minutes
        this.updateTimerDisplay();
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        const timerEl = document.querySelector('.timer-display');
        if (timerEl) {
            timerEl.textContent = display;
        }
        
        // Change color when time is running low
        if (timerEl) {
            if (this.timeRemaining <= 300) { // Last 5 minutes
                timerEl.style.color = '#e74c3c';
            } else if (this.timeRemaining <= 600) { // Last 10 minutes
                timerEl.style.color = '#f39c12';
            } else {
                timerEl.style.color = '#333';
            }
        }
    }

    updateTimerButton(isRunning) {
        const btn = document.getElementById('timer-toggle-btn');
        if (!btn) return;
        
        if (isRunning) {
            btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
            btn.title = 'Pause Timer';
        } else {
            btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M8 5v14l11-7L8 5z"/></svg>';
            btn.title = 'Start Timer';
        }
    }

    timeUp() {
        this.pauseTimer();
        alert('Time is up! Your writing test will be submitted automatically.');
        this.submitWriting();
    }

    initializeResizer() {
        const resizer = document.getElementById('resizer');
        const taskPanel = document.querySelector('.task-panel');
        const writingPanel = document.querySelector('.writing-panel');

        if (!resizer || !taskPanel || !writingPanel) return;

        this._boundHandlers.resizerEl = resizer;
        let isResizing = false;

        const handleResize = (e) => {
            if (!isResizing) return;

            const container = document.querySelector('.panels-container');
            const containerRect = container.getBoundingClientRect();
            const percentage = ((e.clientX - containerRect.left) / containerRect.width) * 100;

            if (percentage > 20 && percentage < 80) {
                taskPanel.style.flex = `0 0 ${percentage}%`;
                writingPanel.style.flex = `0 0 ${100 - percentage}%`;
            }
        };

        const handleTouchResize = (e) => {
            if (!isResizing) return;

            const touch = e.touches[0];
            const container = document.querySelector('.panels-container');
            const containerRect = container.getBoundingClientRect();
            const percentage = ((touch.clientX - containerRect.left) / containerRect.width) * 100;

            if (percentage > 20 && percentage < 80) {
                taskPanel.style.flex = `0 0 ${percentage}%`;
                writingPanel.style.flex = `0 0 ${100 - percentage}%`;
            }
        };

        const stopResize = () => {
            isResizing = false;
            document.removeEventListener('mousemove', handleResize);
            document.removeEventListener('mouseup', stopResize);
            document.removeEventListener('touchmove', handleTouchResize);
            document.removeEventListener('touchend', stopResize);
        };

        const mousedownHandler = (e) => {
            isResizing = true;
            document.addEventListener('mousemove', handleResize);
            document.addEventListener('mouseup', stopResize);
            e.preventDefault();
        };

        const touchstartHandler = (e) => {
            isResizing = true;
            document.addEventListener('touchmove', handleTouchResize);
            document.addEventListener('touchend', stopResize);
            e.preventDefault();
        };

        resizer.addEventListener('mousedown', mousedownHandler);
        resizer.addEventListener('touchstart', touchstartHandler);

        this._boundHandlers.resizerMousedown = mousedownHandler;
        this._boundHandlers.resizerTouchstart = touchstartHandler;
    }

    initializeAutoSave() {
        // Auto-save every 30 seconds
        this.autosaveInterval = setInterval(() => {
            this.autoSave();
        }, 30000);

        // Save on page unload (store reference for cleanup)
        this._boundHandlers.beforeunloadHandler = () => {
            this.autoSave();
        };
        window.addEventListener('beforeunload', this._boundHandlers.beforeunloadHandler);

        // Load saved content
        this.loadSavedContent();
    }

    autoSave() {
        const task1Content = document.getElementById('task1-textarea')?.value || '';
        const task2Content = document.getElementById('task2-textarea')?.value || '';
        
        localStorage.setItem('ielts-writing-mock1-task1', task1Content);
        localStorage.setItem('ielts-writing-mock1-task2', task2Content);
        localStorage.setItem('ielts-writing-mock1-time', this.timeRemaining.toString());
        
    }

    loadSavedContent() {
        const savedTask1 = localStorage.getItem('ielts-writing-mock1-task1');
        const savedTask2 = localStorage.getItem('ielts-writing-mock1-task2');
        const savedTime = localStorage.getItem('ielts-writing-mock1-time');
        
        if (savedTask1) {
            const task1Textarea = document.getElementById('task1-textarea');
            if (task1Textarea) {
                task1Textarea.value = savedTask1;
                this.updateWordCount('task1');
            }
        }
        
        if (savedTask2) {
            const task2Textarea = document.getElementById('task2-textarea');
            if (task2Textarea) {
                task2Textarea.value = savedTask2;
                this.updateWordCount('task2');
            }
        }
        
        if (savedTime) {
            this.timeRemaining = parseInt(savedTime);
            this.updateTimerDisplay();
        }
    }

    async submitWriting() {
        const task1Text = document.getElementById('task1-textarea')?.value.trim() || '';
        const task2Text = document.getElementById('task2-textarea')?.value.trim() || '';

        const task1Words = task1Text ? task1Text.split(/\s+/).length : 0;
        const task2Words = task2Text ? task2Text.split(/\s+/).length : 0;

        // Validation
        let warnings = [];

        if (task1Words < 150) {
            warnings.push(`Task 1 has only ${task1Words} words (minimum 150 required)`);
        }

        if (task2Words < 250) {
            warnings.push(`Task 2 has only ${task2Words} words (minimum 250 required)`);
        }

        if (warnings.length > 0) {
            const proceed = confirm(`Warning:\n${warnings.join('\n')}\n\nDo you want to submit anyway?`);
            if (!proceed) return;
        }

        // Stop timer and auto-save
        this.pauseTimer();
        clearInterval(this.autosaveInterval);

        try {
            // Prepare writing data for database submission
            const writingData = await this.prepareWritingData(task1Text, task1Words, task2Text, task2Words);

            // Save to database using session manager
            if (typeof saveTestToDatabase === 'function') {
                await saveTestToDatabase(writingData);
            }

            // Save answers to session manager for local backup
            if (typeof saveAnswersToSession === 'function') {
                saveAnswersToSession();
            }

            // Mark as completed
            const currentModule = 'writing';
            localStorage.setItem(`${currentModule}Status`, 'completed');
            localStorage.setItem(`${currentModule}EndTime`, new Date().toISOString());

            // Save to history if answer manager is available
            if (window.answerManager) {
                window.answerManager.saveCurrentTestToHistory();
            }

            // Clear saved content
            localStorage.removeItem('ielts-writing-mock1-task1');
            localStorage.removeItem('ielts-writing-mock1-task2');
            localStorage.removeItem('ielts-writing-mock1-time');

            alert('Writing section completed successfully!');
            window.location.href = '../../dashboard.html';

        } catch (error) {
            console.error('❌ Error submitting writing test:', error);

            // Still save locally and continue
            if (typeof saveAnswersToSession === 'function') {
                saveAnswersToSession();
            }

            localStorage.setItem('writingStatus', 'completed');
            localStorage.setItem('writingEndTime', new Date().toISOString());

            alert('Writing section completed successfully!\nNote: There was an issue saving to the database, but your answers are saved locally.');
            window.location.href = '../../dashboard.html';
        }
    }

    async prepareWritingData(task1Text, task1Words, task2Text, task2Words) {
        const studentId = localStorage.getItem('studentId');
        const studentName = localStorage.getItem('studentName');
        const selectedMock = localStorage.getItem('selectedMock') || '1';
        const startTime = localStorage.getItem('writingStartTime');
        const endTime = new Date().toISOString();

        // Format answers with word counts for admin panel display
        const answers = {
            task_1: {
                text: task1Text,
                word_count: task1Words,
                display: `Task 1 { ${task1Text.substring(0, 100)}${task1Text.length > 100 ? '...' : ''} - ${task1Words} words}`
            },
            task_2: {
                text: task2Text,
                word_count: task2Words,
                display: `Task 2 { ${task2Text.substring(0, 100)}${task2Text.length > 100 ? '...' : ''} - ${task2Words} words}`
            },
            summary: {
                task1_words: task1Words,
                task2_words: task2Words,
                total_words: task1Words + task2Words,
                time_used_minutes: Math.floor((3600 - this.timeRemaining) / 60)
            }
        };

        // Calculate a basic score (for display purposes)
        const score = this.calculateScore(task1Text, task1Words, task2Text, task2Words);
        const bandScore = this.calculateWritingBandScore(score, task1Words, task2Words);

        return {
            studentId,
            studentName,
            mockNumber: parseInt(selectedMock),
            skill: 'writing',
            answers,
            score,
            bandScore,
            startTime,
            endTime
        };
    }

    calculateWritingBandScore(score, task1Words, task2Words) {
        // Basic band score calculation for writing
        let band = 0;

        // Word count requirements
        if (task1Words >= 150 && task2Words >= 250) {
            band += 2;
        } else if (task1Words >= 120 && task2Words >= 200) {
            band += 1.5;
        } else if (task1Words >= 100 && task2Words >= 150) {
            band += 1;
        }

        // Content completeness (basic scoring)
        if (score >= 35) band += 6;
        else if (score >= 30) band += 5.5;
        else if (score >= 25) band += 5;
        else if (score >= 20) band += 4.5;
        else if (score >= 15) band += 4;
        else if (score >= 10) band += 3.5;
        else band += 3;

        return Math.min(9, band).toFixed(1);
    }

    calculateScore(task1Text, task1Words, task2Text, task2Words) {
        let score = 0;
        
        // Task 1 scoring (0-20 points)
        if (task1Text && task1Words >= 150) {
            score += Math.min(20, Math.floor(task1Words / 10));
        } else if (task1Text && task1Words >= 100) {
            score += Math.min(15, Math.floor(task1Words / 8));
        } else if (task1Text && task1Words >= 50) {
            score += Math.min(10, Math.floor(task1Words / 6));
        }
        
        // Task 2 scoring (0-20 points) - more important
        if (task2Text && task2Words >= 250) {
            score += Math.min(20, Math.floor(task2Words / 15));
        } else if (task2Text && task2Words >= 200) {
            score += Math.min(15, Math.floor(task2Words / 12));
        } else if (task2Text && task2Words >= 150) {
            score += Math.min(10, Math.floor(task2Words / 10));
        }
        
        return Math.min(40, score);
    }

    showResults(score, task1Words, task2Words) {
        const percentage = Math.round((score / 40) * 100);
        let grade;
        
        if (percentage >= 90) grade = 'Excellent';
        else if (percentage >= 80) grade = 'Very Good';
        else if (percentage >= 70) grade = 'Good';
        else if (percentage >= 60) grade = 'Satisfactory';
        else grade = 'Needs Improvement';
        
        const results = `
IELTS Writing Test Results - MOCK 1

Final Score: ${score}/40 (${percentage}%)
Grade: ${grade}

Task Breakdown:
• Task 1: ${task1Words} words
• Task 2: ${task2Words} words
• Time used: ${Math.floor((3600 - this.timeRemaining) / 60)} minutes

${percentage >= 70 ? 'Well done!' : 'Keep practicing to improve your score.'}
        `;
        
        alert(results);
    }

    // Cleanup method - removes ALL event listeners and intervals to prevent memory leaks
    destroy() {
        // Clear intervals
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        if (this.autosaveInterval) {
            clearInterval(this.autosaveInterval);
            this.autosaveInterval = null;
        }

        // Remove beforeunload listener
        if (this._boundHandlers.beforeunloadHandler) {
            window.removeEventListener('beforeunload', this._boundHandlers.beforeunloadHandler);
            this._boundHandlers.beforeunloadHandler = null;
        }

        // Remove submit button listener
        if (this._boundHandlers.submitBtn && this._boundHandlers.submitHandler) {
            this._boundHandlers.submitBtn.removeEventListener('click', this._boundHandlers.submitHandler);
            this._boundHandlers.submitBtn = null;
            this._boundHandlers.submitHandler = null;
        }

        // Remove timer control listeners
        if (this._boundHandlers.timerToggle && this._boundHandlers.timerToggleHandler) {
            this._boundHandlers.timerToggle.removeEventListener('click', this._boundHandlers.timerToggleHandler);
            this._boundHandlers.timerToggle = null;
            this._boundHandlers.timerToggleHandler = null;
        }
        if (this._boundHandlers.timerReset && this._boundHandlers.timerResetHandler) {
            this._boundHandlers.timerReset.removeEventListener('click', this._boundHandlers.timerResetHandler);
            this._boundHandlers.timerReset = null;
            this._boundHandlers.timerResetHandler = null;
        }

        // Remove all textarea listeners (input, copy, paste, cut)
        for (const entry of this._boundHandlers.textareaListeners) {
            entry.element.removeEventListener(entry.event, entry.handler);
        }
        this._boundHandlers.textareaListeners = [];

        // Remove resizer listeners
        if (this._boundHandlers.resizerEl) {
            if (this._boundHandlers.resizerMousedown) {
                this._boundHandlers.resizerEl.removeEventListener('mousedown', this._boundHandlers.resizerMousedown);
                this._boundHandlers.resizerMousedown = null;
            }
            if (this._boundHandlers.resizerTouchstart) {
                this._boundHandlers.resizerEl.removeEventListener('touchstart', this._boundHandlers.resizerTouchstart);
                this._boundHandlers.resizerTouchstart = null;
            }
            this._boundHandlers.resizerEl = null;
        }
    }
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.writingHandler = new WritingHandler();
    });
} else {
    window.writingHandler = new WritingHandler();
}

// Make functions globally available for onclick handlers
window.switchTask = function(taskNumber) {
    if (window.writingHandler) {
        window.writingHandler.switchTask(taskNumber);
    }
};

window.updateWordCount = function(taskId) {
    if (window.writingHandler) {
        return window.writingHandler.updateWordCount(taskId);
    }
};

window.submitWriting = function() {
    if (window.writingHandler) {
        window.writingHandler.submitWriting();
    }
};
