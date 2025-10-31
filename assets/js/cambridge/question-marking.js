/**
 * Cambridge Question Marking & Highlighting System
 * 
 * Features:
 * - Mark/flag questions for review (orange highlight)
 * - Automatic blue highlight when questions are answered
 * - Persistent across page navigation
 * - Visual indicators in navigation footer
 */

(function() {
    'use strict';

    class CambridgeQuestionMarking {
        constructor() {
            this.markedQuestions = new Set();
            this.answeredQuestions = new Set();
            this.testKey = this.getTestKey();
            
            console.log('🔖 Cambridge Question Marking System initializing...');
            this.init();
        }

        init() {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setup());
            } else {
                this.setup();
            }
        }

        setup() {
            // Load saved state
            this.loadMarkedQuestions();
            this.loadAnsweredQuestions();
            
            // Add custom styles
            this.injectStyles();
            
            // Setup question button interactions
            this.setupQuestionButtons();
            
            // Monitor for answer changes
            this.monitorAnswers();
            
            // Apply initial visual indicators
            setTimeout(() => this.updateAllIndicators(), 100);
            
            console.log('✅ Question Marking System ready!');
        }

        injectStyles() {
            if (document.getElementById('ic-question-marking-styles')) return;
            
            const styles = document.createElement('style');
            styles.id = 'ic-question-marking-styles';
            styles.textContent = `
                /* Question button indicator bar at top */
                .subQuestion.scorable-item {
                    position: relative;
                    overflow: visible !important;
                }
                
                /* Top indicator bar */
                .subQuestion.scorable-item::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 3px;
                    background: transparent;
                    transition: background-color 0.3s ease;
                    border-radius: 2px 2px 0 0;
                }
                
                /* Blue indicator for answered questions */
                .subQuestion.scorable-item.ic-answered::before {
                    background: #2196F3;
                }
                
                /* Orange indicator for marked questions */
                .subQuestion.scorable-item.ic-marked::before {
                    background: #FF9800;
                }
                
                /* Marked takes priority over answered */
                .subQuestion.scorable-item.ic-marked.ic-answered::before {
                    background: #FF9800;
                }
                
                /* Flag icon for marked questions */
                .subQuestion.scorable-item.ic-marked::after {
                    content: '🚩';
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    font-size: 12px;
                    z-index: 10;
                    pointer-events: none;
                }
                
                /* Context menu for marking */
                .ic-question-context-menu {
                    position: fixed;
                    background: white;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 10000;
                    padding: 4px 0;
                    min-width: 160px;
                }
                
                .ic-question-context-menu-item {
                    padding: 8px 16px;
                    cursor: pointer;
                    transition: background 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 14px;
                }
                
                .ic-question-context-menu-item:hover {
                    background: #f5f5f5;
                }
                
                .ic-question-context-menu-item .icon {
                    width: 16px;
                    text-align: center;
                }
                
                /* Dark mode support */
                body.dark-mode .ic-question-context-menu {
                    background: #2a2a2a;
                    border-color: #444;
                    color: #fff;
                }
                
                body.dark-mode .ic-question-context-menu-item:hover {
                    background: #3a3a3a;
                }
                
                /* Hover effect on question buttons */
                .subQuestion.scorable-item:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                
                /* Active state */
                .subQuestion.scorable-item.active {
                    font-weight: bold;
                    background: #e3f2fd;
                }
            `;
            
            document.head.appendChild(styles);
        }

        setupQuestionButtons() {
            const questionButtons = document.querySelectorAll('.subQuestion.scorable-item');
            
            questionButtons.forEach(button => {
                // Right-click to show context menu
                button.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const questionNumber = parseInt(button.getAttribute('data-ordernumber'), 10);
                    if (!isNaN(questionNumber)) {
                        this.showContextMenu(e.clientX, e.clientY, questionNumber, button);
                    }
                });
                
                // Prevent default context menu on the whole page
                button.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                }, true);
            });
            
            // Close context menu when clicking elsewhere
            document.addEventListener('click', () => this.hideContextMenu());
            document.addEventListener('contextmenu', (e) => {
                if (!e.target.closest('.subQuestion.scorable-item')) {
                    this.hideContextMenu();
                }
            });
        }

        showContextMenu(x, y, questionNumber, button) {
            // Remove existing menu
            this.hideContextMenu();
            
            const menu = document.createElement('div');
            menu.className = 'ic-question-context-menu';
            menu.id = 'ic-question-context-menu';
            
            const isMarked = this.markedQuestions.has(questionNumber);
            
            menu.innerHTML = `
                <div class="ic-question-context-menu-item" data-action="${isMarked ? 'unmark' : 'mark'}" data-question="${questionNumber}">
                    <span class="icon">${isMarked ? '🏳️' : '🚩'}</span>
                    <span>${isMarked ? 'Unmark Question' : 'Mark for Review'}</span>
                </div>
                <div class="ic-question-context-menu-item" data-action="clear-answer" data-question="${questionNumber}">
                    <span class="icon">🗑️</span>
                    <span>Clear Answer</span>
                </div>
            `;
            
            // Position menu
            menu.style.left = x + 'px';
            menu.style.top = y + 'px';
            
            document.body.appendChild(menu);
            
            // Adjust if menu goes off-screen
            const rect = menu.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                menu.style.left = (x - rect.width) + 'px';
            }
            if (rect.bottom > window.innerHeight) {
                menu.style.top = (y - rect.height) + 'px';
            }
            
            // Add click handlers
            menu.querySelectorAll('.ic-question-context-menu-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = item.getAttribute('data-action');
                    const qNum = parseInt(item.getAttribute('data-question'), 10);
                    
                    if (action === 'mark') {
                        this.markQuestion(qNum);
                    } else if (action === 'unmark') {
                        this.unmarkQuestion(qNum);
                    } else if (action === 'clear-answer') {
                        this.clearAnswer(qNum);
                    }
                    
                    this.hideContextMenu();
                });
            });
        }

        hideContextMenu() {
            const menu = document.getElementById('ic-question-context-menu');
            if (menu) {
                menu.remove();
            }
        }

        markQuestion(questionNumber) {
            this.markedQuestions.add(questionNumber);
            this.saveMarkedQuestions();
            this.updateIndicator(questionNumber);
            
            console.log(`🚩 Marked question ${questionNumber} for review`);
            
            // Show toast notification if available
            if (window.ieltsUniversal && window.ieltsUniversal.showToast) {
                window.ieltsUniversal.showToast(`Question ${questionNumber} marked for review`, 'info');
            }
        }

        unmarkQuestion(questionNumber) {
            this.markedQuestions.delete(questionNumber);
            this.saveMarkedQuestions();
            this.updateIndicator(questionNumber);
            
            console.log(`🏳️ Unmarked question ${questionNumber}`);
            
            if (window.ieltsUniversal && window.ieltsUniversal.showToast) {
                window.ieltsUniversal.showToast(`Question ${questionNumber} unmarked`, 'info');
            }
        }

        clearAnswer(questionNumber) {
            // Find and clear the answer for this question
            const questionElements = document.querySelectorAll(`
                input[name="q${questionNumber}"],
                textarea[id*="${questionNumber}"],
                input[id*="${questionNumber}"]
            `);
            
            questionElements.forEach(el => {
                if (el.type === 'radio' || el.type === 'checkbox') {
                    el.checked = false;
                } else if (el.type === 'text' || el.tagName === 'TEXTAREA') {
                    el.value = '';
                }
            });
            
            // Update answered status
            this.answeredQuestions.delete(questionNumber);
            this.saveAnsweredQuestions();
            this.updateIndicator(questionNumber);
            
            console.log(`🗑️ Cleared answer for question ${questionNumber}`);
            
            if (window.ieltsUniversal && window.ieltsUniversal.showToast) {
                window.ieltsUniversal.showToast(`Answer cleared for question ${questionNumber}`, 'success');
            }
        }

        monitorAnswers() {
            // Monitor all input changes
            const checkAnswers = () => {
                // Get all question buttons with order numbers
                const questionButtons = document.querySelectorAll('.subQuestion.scorable-item[data-ordernumber]');
                
                questionButtons.forEach(button => {
                    const qNum = parseInt(button.getAttribute('data-ordernumber'), 10);
                    if (isNaN(qNum)) return;
                    
                    const isAnswered = this.isQuestionAnswered(qNum);
                    
                    if (isAnswered && !this.answeredQuestions.has(qNum)) {
                        this.answeredQuestions.add(qNum);
                        this.updateIndicator(qNum);
                        this.saveAnsweredQuestions();
                    } else if (!isAnswered && this.answeredQuestions.has(qNum)) {
                        this.answeredQuestions.delete(qNum);
                        this.updateIndicator(qNum);
                        this.saveAnsweredQuestions();
                    }
                });
            };
            
            // Check on input/change events
            document.addEventListener('input', checkAnswers);
            document.addEventListener('change', checkAnswers);
            
            // Periodic check (every 2 seconds)
            setInterval(checkAnswers, 2000);
            
            // Initial check
            setTimeout(checkAnswers, 500);
        }

        isQuestionAnswered(questionNumber) {
            // Check various input types that could contain answers
            
            // Radio buttons
            const radio = document.querySelector(`input[name="q${questionNumber}"]:checked`);
            if (radio) return true;
            
            // Text inputs
            const textInput = document.querySelector(`input[type="text"][id*="${questionNumber}"]`);
            if (textInput && textInput.value.trim()) return true;
            
            // Textareas
            const textarea = document.querySelector(`textarea[id*="${questionNumber}"]`);
            if (textarea && textarea.value.trim()) return true;
            
            // Checkboxes
            const checkbox = document.querySelector(`input[type="checkbox"][name*="${questionNumber}"]:checked`);
            if (checkbox) return true;
            
            // Select dropdowns
            const select = document.querySelector(`select[name*="${questionNumber}"]`);
            if (select && select.value) return true;
            
            // Also check using data attribute approach
            const scorableItem = document.querySelector(`[data-ordernumber="${questionNumber}"]`);
            if (scorableItem && scorableItem.classList.contains('answered')) return true;
            
            return false;
        }

        updateIndicator(questionNumber) {
            const button = document.querySelector(`.subQuestion.scorable-item[data-ordernumber="${questionNumber}"]`);
            if (!button) return;
            
            // Remove existing classes
            button.classList.remove('ic-answered', 'ic-marked');
            
            // Add appropriate classes
            if (this.markedQuestions.has(questionNumber)) {
                button.classList.add('ic-marked');
            }
            
            if (this.answeredQuestions.has(questionNumber)) {
                button.classList.add('ic-answered');
            }
        }

        updateAllIndicators() {
            // Update all question buttons
            const questionButtons = document.querySelectorAll('.subQuestion.scorable-item[data-ordernumber]');
            
            questionButtons.forEach(button => {
                const qNum = parseInt(button.getAttribute('data-ordernumber'), 10);
                if (!isNaN(qNum)) {
                    this.updateIndicator(qNum);
                }
            });
        }

        // Persistence methods
        getTestKey() {
            const skill = document.body.getAttribute('data-skill') || 'reading-writing';
            const mock = document.body.getAttribute('data-mock') || 'cambridge-a2-key';
            return `cambridge_${mock}_${skill}`;
        }

        saveMarkedQuestions() {
            const key = `${this.testKey}_marked`;
            localStorage.setItem(key, JSON.stringify([...this.markedQuestions]));
        }

        loadMarkedQuestions() {
            const key = `${this.testKey}_marked`;
            const saved = localStorage.getItem(key);
            
            if (saved) {
                try {
                    const arr = JSON.parse(saved);
                    this.markedQuestions = new Set(arr);
                    console.log(`📋 Loaded ${this.markedQuestions.size} marked questions`);
                } catch (e) {
                    console.warn('Error loading marked questions:', e);
                }
            }
        }

        saveAnsweredQuestions() {
            const key = `${this.testKey}_answered`;
            localStorage.setItem(key, JSON.stringify([...this.answeredQuestions]));
        }

        loadAnsweredQuestions() {
            const key = `${this.testKey}_answered`;
            const saved = localStorage.getItem(key);
            
            if (saved) {
                try {
                    const arr = JSON.parse(saved);
                    this.answeredQuestions = new Set(arr);
                    console.log(`✅ Loaded ${this.answeredQuestions.size} answered questions`);
                } catch (e) {
                    console.warn('Error loading answered questions:', e);
                }
            }
        }

        // Public API
        getMarkedQuestions() {
            return [...this.markedQuestions];
        }

        getAnsweredQuestions() {
            return [...this.answeredQuestions];
        }

        clearAllMarks() {
            this.markedQuestions.clear();
            this.saveMarkedQuestions();
            this.updateAllIndicators();
            console.log('🧹 All marks cleared');
        }
    }

    // Initialize the system
    function initQuestionMarking() {
        if (!window.cambridgeQuestionMarking) {
            window.cambridgeQuestionMarking = new CambridgeQuestionMarking();
            console.log('🔖 Cambridge Question Marking System initialized globally');
        }
    }

    // Initialize immediately if DOM is ready, otherwise wait
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initQuestionMarking);
    } else {
        initQuestionMarking();
    }

    // Also try on window load as backup
    window.addEventListener('load', () => {
        if (!window.cambridgeQuestionMarking) {
            initQuestionMarking();
        }
    });
})();

