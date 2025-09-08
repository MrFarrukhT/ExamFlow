// Writing Task Handler - Core functionality for writing tests
class WritingHandler {
    constructor() {
        this.currentTask = 1;
        this.timeRemaining = 3600; // 60 minutes
        this.timerInterval = null;
        this.isTimerRunning = false;
        this.autosaveInterval = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.initializeTimer();
        this.initializeResizer();
        this.initializeAutoSave();
        this.updateWordCounts();
        console.log('✅ Writing handler initialized');
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
            submitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.submitWriting();
            });
        }

        // Timer controls
        const timerToggle = document.getElementById('timer-toggle-btn');
        const timerReset = document.getElementById('timer-reset-btn');
        
        if (timerToggle) {
            timerToggle.addEventListener('click', () => this.toggleTimer());
        }
        
        if (timerReset) {
            timerReset.addEventListener('click', () => this.resetTimer());
        }

        // Word count updates
        document.querySelectorAll('.writing-area').forEach(textarea => {
            textarea.addEventListener('input', (e) => {
                const taskId = e.target.id.includes('1') ? 'task1' : 'task2';
                this.updateWordCount(taskId);
            });
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
        
        console.log(`Switched to Task ${taskNumber}`);
    }

    updateWordCount(taskId) {
        const textarea = document.getElementById(`${taskId}-textarea`);
        const wordCountEl = document.getElementById(`${taskId}-word-count`);
        const bottomCountEl = document.getElementById(`bottom-${taskId}-count`);
        
        if (!textarea || !wordCountEl) return;
        
        const text = textarea.value.trim();
        const wordCount = text === '' ? 0 : text.split(/\s+/).length;
        
        // Update main word count display
        wordCountEl.textContent = `Word count: ${wordCount}`;
        
        // Update bottom navigation count
        if (bottomCountEl) {
            bottomCountEl.textContent = `(${wordCount} words)`;
        }
        
        // Color coding for word count
        const minWords = taskId === 'task1' ? 150 : 250;
        
        if (wordCount < minWords) {
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
        console.log('Timer reset to 60 minutes');
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
        
        let isResizing = false;

        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            document.addEventListener('mousemove', handleResize);
            document.addEventListener('mouseup', stopResize);
            e.preventDefault();
        });

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

        const stopResize = () => {
            isResizing = false;
            document.removeEventListener('mousemove', handleResize);
            document.removeEventListener('mouseup', stopResize);
        };

        // Touch support for mobile
        resizer.addEventListener('touchstart', (e) => {
            isResizing = true;
            document.addEventListener('touchmove', handleTouchResize);
            document.addEventListener('touchend', stopResize);
            e.preventDefault();
        });

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
    }

    initializeAutoSave() {
        // Auto-save every 30 seconds
        this.autosaveInterval = setInterval(() => {
            this.autoSave();
        }, 30000);
        
        // Save on page unload
        window.addEventListener('beforeunload', () => {
            this.autoSave();
        });
        
        // Load saved content
        this.loadSavedContent();
    }

    autoSave() {
        const task1Content = document.getElementById('task1-textarea')?.value || '';
        const task2Content = document.getElementById('task2-textarea')?.value || '';
        
        localStorage.setItem('ielts-writing-mock1-task1', task1Content);
        localStorage.setItem('ielts-writing-mock1-task2', task2Content);
        localStorage.setItem('ielts-writing-mock1-time', this.timeRemaining.toString());
        
        console.log('Auto-saved writing content');
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

    submitWriting() {
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
        
        // Calculate basic score
        let score = this.calculateScore(task1Text, task1Words, task2Text, task2Words);
        
        // Stop timer and auto-save
        this.pauseTimer();
        clearInterval(this.autosaveInterval);
        
        // Clear saved content
        localStorage.removeItem('ielts-writing-mock1-task1');
        localStorage.removeItem('ielts-writing-mock1-task2');
        localStorage.removeItem('ielts-writing-mock1-time');
        
        // Submit to backend or show results
        this.showResults(score, task1Words, task2Words);
        
        console.log('Writing submitted:', { score, task1Words, task2Words });
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

    // Cleanup method
    destroy() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        if (this.autosaveInterval) {
            clearInterval(this.autosaveInterval);
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
