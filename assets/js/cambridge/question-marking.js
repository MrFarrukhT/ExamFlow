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
            
            // Setup bookmark button interactions
            this.setupBookmarkButtons();
            
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
                
                /* Bookmark button styles */
                .ic-bookmark-button {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    font-size: 20px;
                    color: #999;
                    transition: color 0.3s ease, transform 0.2s ease;
                    z-index: 10;
                    padding: 5px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .ic-bookmark-button:hover {
                    color: #FF9800;
                    transform: scale(1.1);
                }
                
                .ic-bookmark-button.marked {
                    color: #FF9800;
                }
                
                .ic-bookmark-button.marked .fa-bookmark-o::before {
                    content: "\\f02e"; /* fa-bookmark (filled) */
                    font-family: "FontAwesome";
                }
                
                .ic-bookmark-button.marked i.fa-bookmark-o:before {
                    content: "\\f02e";
                }
                
                /* Question wrapper positioning for bookmark */
                .question-wrapper {
                    position: relative;
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

        setupBookmarkButtons() {
            // Setup existing bookmark buttons (Cambridge standard format)
            this.setupStandardBookmarkButtons();
            
            // Setup custom bookmark buttons in question wrappers
            this.setupCustomBookmarkButtons();
            
            // Watch for dynamically added question wrappers
            this.observeDynamicContent();
        }

        observeDynamicContent() {
            // Use MutationObserver to watch for dynamically added question wrappers
            const observer = new MutationObserver((mutations) => {
                let shouldUpdate = false;
                
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                            // Check if it's a question wrapper or contains one
                            if (node.classList && node.classList.contains('question-wrapper')) {
                                shouldUpdate = true;
                            } else if (node.querySelector && node.querySelector('.question-wrapper')) {
                                shouldUpdate = true;
                            }
                            
                            // Check for bookmark buttons
                            if (node.classList && (node.classList.contains('QuestionDisplay__txtButton___3AYy9') || 
                                node.classList.contains('QuestionDisplay__visibleFlag___AmAom') ||
                                node.classList.contains('QuestionDisplay__hiddenFlag___m4NOE'))) {
                                shouldUpdate = true;
                            }
                        }
                    });
                });
                
                if (shouldUpdate) {
                    // Debounce updates
                    clearTimeout(this.updateTimeout);
                    this.updateTimeout = setTimeout(() => {
                        this.setupStandardBookmarkButtons();
                        this.setupCustomBookmarkButtons();
                    }, 100);
                }
            });
            
            // Start observing
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            // Store observer for cleanup if needed
            this.bookmarkObserver = observer;
        }

        setupStandardBookmarkButtons() {
            // Handle standard Cambridge bookmark buttons
            const bookmarkButtons = document.querySelectorAll('.QuestionDisplay__txtButton___3AYy9, .QuestionDisplay__visibleFlag___AmAom, .QuestionDisplay__hiddenFlag___m4NOE');
            
            bookmarkButtons.forEach(button => {
                // Get question number from tabindex or other attributes
                let questionNumber = null;
                
                // Try tabindex first
                const tabindex = button.getAttribute('tabindex');
                if (tabindex && !isNaN(parseInt(tabindex, 10))) {
                    questionNumber = parseInt(tabindex, 10);
                }
                
                // Try id attribute (format: "143659692-1" or similar)
                if (!questionNumber) {
                    const id = button.getAttribute('id');
                    if (id) {
                        const match = id.match(/-(\d+)$/);
                        if (match) {
                            questionNumber = parseInt(match[1], 10);
                        }
                    }
                }
                
                // Try data attributes
                if (!questionNumber) {
                    const dataQ = button.getAttribute('data-question');
                    if (dataQ) {
                        questionNumber = parseInt(dataQ, 10);
                    }
                }
                
                if (questionNumber && !isNaN(questionNumber)) {
                    // Remove existing listeners by cloning
                    const newButton = button.cloneNode(true);
                    button.parentNode.replaceChild(newButton, button);
                    
                    newButton.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        if (this.markedQuestions.has(questionNumber)) {
                            this.unmarkQuestion(questionNumber);
                        } else {
                            this.markQuestion(questionNumber);
                        }
                        
                        // Update button state
                        this.updateBookmarkButton(newButton, questionNumber);
                    });
                    
                    // Update initial state
                    this.updateBookmarkButton(newButton, questionNumber);
                }
            });
        }

        setupCustomBookmarkButtons() {
            // Find all question wrappers and add bookmark buttons if they don't exist
            // Use multiple selectors to catch different question structures
            const selectors = [
                '.question-wrapper[id^="question-"]',
                '.note-field',
                '.question-wrapper'
            ];
            
            const questionWrappers = [];
            selectors.forEach(selector => {
                document.querySelectorAll(selector).forEach(el => {
                    // Only add if it contains a question number indicator
                    const hasQuestionNumber = el.querySelector('.question-number') || 
                                           el.querySelector('input[name*="question"]') ||
                                           el.querySelector('input[id^="answer_"]') ||
                                           el.id && el.id.match(/question-\d+/);
                    if (hasQuestionNumber && !questionWrappers.includes(el)) {
                        questionWrappers.push(el);
                    }
                });
            });
            
            questionWrappers.forEach(wrapper => {
                // Skip if already processed
                if (wrapper.dataset.bookmarkProcessed === 'true') {
                    return;
                }
                
                // Try multiple methods to extract question number
                let questionNumber = null;
                
                // Method 1: Extract from wrapper ID (e.g., "question-1" -> 1)
                if (wrapper.id) {
                    const idMatch = wrapper.id.match(/question-(\d+)/);
                    if (idMatch) {
                        questionNumber = parseInt(idMatch[1], 10);
                    }
                }
                
                // Method 2: Extract from input name attribute (e.g., name="question_5" or name="q5" or id="answer_6")
                if (!questionNumber || isNaN(questionNumber)) {
                    const input = wrapper.querySelector('input[name^="question_"], input[name^="q"], input[id^="answer_"]');
                    if (input) {
                        const name = input.getAttribute('name') || '';
                        const id = input.getAttribute('id') || '';
                        
                        // Try name first
                        if (name) {
                            const nameMatch = name.match(/(?:question_|q)(\d+)/);
                            if (nameMatch) {
                                questionNumber = parseInt(nameMatch[1], 10);
                            }
                        }
                        
                        // Try id if name didn't work
                        if ((!questionNumber || isNaN(questionNumber)) && id) {
                            const idMatch = id.match(/answer_(\d+)/);
                            if (idMatch) {
                                questionNumber = parseInt(idMatch[1], 10);
                            }
                        }
                    }
                }
                
                // Method 3: Extract from displayed question number text (e.g., "(6)" or "5")
                // BUT prioritize scorableItem ID which has the actual question number
                if (!questionNumber || isNaN(questionNumber)) {
                    // First try to find scorableItem ID (most reliable)
                    const scorableItem = wrapper.querySelector('[id^="scorableItem-"], .order-number[id*="_"]');
                    if (scorableItem && scorableItem.id) {
                        const scorableMatch = scorableItem.id.match(/scorableItem[^_]*_(\d+)/) || 
                                             scorableItem.id.match(/scorableItem-(\d+)/);
                        if (scorableMatch) {
                            questionNumber = parseInt(scorableMatch[1], 10);
                        }
                    }
                    
                    // If still not found, try order-number text content
                    if (!questionNumber || isNaN(questionNumber)) {
                        const questionNumberEl = wrapper.querySelector('.order-number, .question-number');
                        if (questionNumberEl) {
                            const text = questionNumberEl.textContent || '';
                            const textMatch = text.match(/(\d+)/);
                            if (textMatch) {
                                questionNumber = parseInt(textMatch[1], 10);
                            }
                        }
                    }
                }
                
                // Method 4: Check for data attributes
                if (!questionNumber || isNaN(questionNumber)) {
                    const dataQ = wrapper.getAttribute('data-question') || wrapper.getAttribute('data-ordernumber');
                    if (dataQ) {
                        questionNumber = parseInt(dataQ, 10);
                    }
                }
                
                if (!questionNumber || isNaN(questionNumber)) {
                    return; // Skip if we can't determine question number
                }
                
                // Mark as processed
                wrapper.dataset.bookmarkProcessed = 'true';
                
                // Store question number on wrapper for debugging
                wrapper.dataset.detectedQuestion = questionNumber;
                
                console.log(`🔖 Found question ${questionNumber} in wrapper:`, {
                    wrapperId: wrapper.id,
                    wrapperClass: wrapper.className,
                    detectedNumber: questionNumber
                });
                
                // Check if bookmark button already exists
                let bookmarkBtn = wrapper.querySelector('.ic-bookmark-button');
                
                if (!bookmarkBtn) {
                    // Create bookmark button
                    bookmarkBtn = document.createElement('button');
                    bookmarkBtn.className = 'ic-bookmark-button';
                    bookmarkBtn.setAttribute('data-question', questionNumber);
                    bookmarkBtn.setAttribute('aria-label', `Bookmark question ${questionNumber}`);
                    bookmarkBtn.innerHTML = '<i class="fa fa-bookmark-o" aria-hidden="true"></i>';
                    
                    // Store question number on button for easy access
                    bookmarkBtn._questionNumber = questionNumber;
                    bookmarkBtn._hasHandler = true;
                    
                    // Add click handler - use closure to capture the correct questionNumber
                    const self = this;
                    (function(qNum) {
                        bookmarkBtn.addEventListener('click', function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            // Use the captured qNum from closure, fallback to button attributes
                            const finalQNum = qNum || bookmarkBtn._questionNumber || parseInt(bookmarkBtn.getAttribute('data-question'), 10);
                            console.log(`🔖 Bookmark clicked! Question number: ${finalQNum}`);
                            console.log(`📌 Button data:`, {
                                closureQNum: qNum,
                                _questionNumber: bookmarkBtn._questionNumber,
                                dataQuestion: bookmarkBtn.getAttribute('data-question'),
                                finalQNum: finalQNum
                            });
                            
                            if (!finalQNum || isNaN(finalQNum)) {
                                console.warn('⚠️ Could not determine question number from bookmark button');
                                return;
                            }
                            
                            if (self.markedQuestions.has(finalQNum)) {
                                console.log(`🏳️ Unmarking question ${finalQNum}`);
                                self.unmarkQuestion(finalQNum);
                            } else {
                                console.log(`🚩 Marking question ${finalQNum}`);
                                self.markQuestion(finalQNum);
                            }
                            
                            // Update button state
                            self.updateBookmarkButton(bookmarkBtn, finalQNum);
                        });
                    })(questionNumber);
                    
                    wrapper.appendChild(bookmarkBtn);
                } else {
                    // Check if button already has a handler (avoid duplicate listeners)
                    if (bookmarkBtn._hasHandler) {
                        // Just update the state
                        const existingQNum = bookmarkBtn._questionNumber || parseInt(bookmarkBtn.getAttribute('data-question'), 10) || questionNumber;
                        bookmarkBtn._questionNumber = existingQNum;
                        this.updateBookmarkButton(bookmarkBtn, existingQNum);
                        return;
                    }
                    
                    // Update existing button - add handler if not already present
                    const existingQNum = bookmarkBtn._questionNumber || parseInt(bookmarkBtn.getAttribute('data-question'), 10) || questionNumber;
                    bookmarkBtn._questionNumber = existingQNum;
                    bookmarkBtn.setAttribute('data-question', existingQNum);
                    bookmarkBtn._hasHandler = true;
                    
                    bookmarkBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const qNum = bookmarkBtn._questionNumber || parseInt(bookmarkBtn.getAttribute('data-question'), 10);
                        if (!qNum || isNaN(qNum)) {
                            console.warn('⚠️ Could not determine question number from bookmark button');
                            return;
                        }
                        
                        if (this.markedQuestions.has(qNum)) {
                            this.unmarkQuestion(qNum);
                        } else {
                            this.markQuestion(qNum);
                        }
                        
                        this.updateBookmarkButton(bookmarkBtn, qNum);
                    });
                }
                
                // Update initial state
                const qNum = bookmarkBtn._questionNumber || questionNumber;
                this.updateBookmarkButton(bookmarkBtn, qNum);
            });
        }

        updateBookmarkButton(button, questionNumber) {
            if (!button) return;
            
            const icon = button.querySelector('i.fa-bookmark-o, i.fa-bookmark');
            
            if (this.markedQuestions.has(questionNumber)) {
                button.classList.add('marked');
                button.setAttribute('aria-pressed', 'true');
                
                // Change icon to filled bookmark
                if (icon) {
                    icon.classList.remove('fa-bookmark-o');
                    icon.classList.add('fa-bookmark');
                }
            } else {
                button.classList.remove('marked');
                button.setAttribute('aria-pressed', 'false');
                
                // Change icon back to outline bookmark
                if (icon) {
                    icon.classList.remove('fa-bookmark');
                    icon.classList.add('fa-bookmark-o');
                }
            }
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
            if (!questionNumber || isNaN(questionNumber)) {
                console.warn('⚠️ Invalid question number:', questionNumber);
                return;
            }
            
            this.markedQuestions.add(questionNumber);
            this.saveMarkedQuestions();
            this.updateIndicator(questionNumber);
            this.updateBookmarkButtons(questionNumber);
            
            console.log(`🚩 Marked question ${questionNumber} for review`);
            
            // Show toast notification if available
            if (window.ieltsUniversal && window.ieltsUniversal.showToast) {
                window.ieltsUniversal.showToast(`Question ${questionNumber} marked for review`, 'info');
            }
        }

        unmarkQuestion(questionNumber) {
            if (!questionNumber || isNaN(questionNumber)) {
                console.warn('⚠️ Invalid question number:', questionNumber);
                return;
            }
            
            this.markedQuestions.delete(questionNumber);
            this.saveMarkedQuestions();
            this.updateIndicator(questionNumber);
            this.updateBookmarkButtons(questionNumber);
            
            console.log(`🏳️ Unmarked question ${questionNumber}`);
            
            if (window.ieltsUniversal && window.ieltsUniversal.showToast) {
                window.ieltsUniversal.showToast(`Question ${questionNumber} unmarked`, 'info');
            }
        }

        updateBookmarkButtons(questionNumber) {
            // Update all bookmark buttons for this question
            const bookmarkButtons = document.querySelectorAll(`[data-question="${questionNumber}"].ic-bookmark-button, .QuestionDisplay__txtButton___3AYy9[tabindex="${questionNumber}"], .QuestionDisplay__txtButton___3AYy9[id*="-${questionNumber}"]`);
            
            bookmarkButtons.forEach(button => {
                this.updateBookmarkButton(button, questionNumber);
            });
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
                        // Only update this specific question's indicator
                        this.updateIndicator(qNum);
                        this.saveAnsweredQuestions();
                    } else if (!isAnswered && this.answeredQuestions.has(qNum)) {
                        this.answeredQuestions.delete(qNum);
                        // Only update this specific question's indicator
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
            if (!questionNumber || isNaN(questionNumber)) {
                console.warn('⚠️ Invalid question number in updateIndicator:', questionNumber);
                return;
            }
            
            console.log(`🔍 updateIndicator called for question ${questionNumber}`);
            console.log(`📍 Current context: ${window.self === window.top ? 'parent' : 'iframe'}`);
            
            // Try multiple strategies to find the navigation button
            let button = null;
            
            // Strategy 1: Search in current document (works if we're in iframe)
            button = document.querySelector(`.subQuestion.scorable-item[data-ordernumber="${questionNumber}"]`);
            if (button) {
                console.log(`✅ Found button in current document`);
                this.updateButtonClasses(button, questionNumber);
                return;
            }
            
            // Strategy 2: If we're in parent, try to access iframe contentDocument
            if (window.self === window.top) {
                const iframes = document.querySelectorAll('iframe#part-frame, iframe.part-frame, iframe');
                console.log(`🔍 Found ${iframes.length} iframe(s) in parent`);
                
                for (let iframe of iframes) {
                    try {
                        // Try to access iframe content
                        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                        if (iframeDoc) {
                            button = iframeDoc.querySelector(`.subQuestion.scorable-item[data-ordernumber="${questionNumber}"]`);
                            if (button) {
                                console.log(`✅ Found button in iframe contentDocument`);
                                this.updateButtonClasses(button, questionNumber);
                                return;
                            }
                        }
                    } catch (e) {
                        console.log(`⚠️ Cannot access iframe content (cross-origin?):`, e.message);
                    }
                }
            }
            
            // Strategy 3: Try alternative selectors in current document
            button = document.querySelector(`[data-ordernumber="${questionNumber}"].subQuestion`) ||
                     document.querySelector(`.subQuestion[data-ordernumber="${questionNumber}"]`) ||
                     document.querySelector(`button[data-ordernumber="${questionNumber}"]`);
            
            if (button) {
                console.log(`✅ Found button with alternative selector`);
                this.updateButtonClasses(button, questionNumber);
                return;
            }
            
            // Strategy 4: Try parent window if we're in iframe
            if (window.self !== window.top) {
                try {
                    button = window.parent.document.querySelector(`.subQuestion.scorable-item[data-ordernumber="${questionNumber}"]`);
                    if (button) {
                        console.log(`✅ Found button in parent document`);
                        this.updateButtonClasses(button, questionNumber);
                        return;
                    }
                } catch (e) {
                    console.log(`⚠️ Cannot access parent document:`, e.message);
                }
            }
            
            // If still not found, log all available navigation buttons for debugging
            const allButtons = document.querySelectorAll('.subQuestion, [data-ordernumber]');
            console.log(`❌ Navigation button not found for question ${questionNumber}`);
            console.log(`📊 Found ${allButtons.length} potential navigation buttons in current document`);
            if (allButtons.length > 0) {
                console.log(`📋 Available ordernumbers:`, Array.from(allButtons).map(b => b.getAttribute('data-ordernumber')).filter(Boolean));
            }
        }

        updateButtonClasses(button, questionNumber) {
            if (!button || !questionNumber || isNaN(questionNumber)) {
                console.warn(`⚠️ updateButtonClasses: Invalid parameters`, { button, questionNumber });
                return;
            }
            
            // Verify this button actually corresponds to this question number
            const buttonQNum = parseInt(button.getAttribute('data-ordernumber'), 10);
            if (buttonQNum !== questionNumber) {
                console.warn(`⚠️ Mismatch: button has ordernumber ${buttonQNum} but updating for ${questionNumber}`);
                return;
            }
            
            const isMarked = this.markedQuestions.has(questionNumber);
            const isAnswered = this.answeredQuestions.has(questionNumber);
            
            console.log(`🎨 Updating button ${questionNumber}:`, {
                isMarked,
                isAnswered,
                currentClasses: button.className,
                markedQuestions: Array.from(this.markedQuestions)
            });
            
            // Remove existing classes
            button.classList.remove('ic-answered', 'ic-marked');
            
            // Add appropriate classes - marked takes priority (orange)
            if (isMarked) {
                button.classList.add('ic-marked');
                console.log(`✅ Added 'ic-marked' class to button ${questionNumber}`);
            }
            
            if (isAnswered) {
                button.classList.add('ic-answered');
                console.log(`✅ Added 'ic-answered' class to button ${questionNumber}`);
            }
            
            // Verify classes were added
            const finalClasses = button.className;
            console.log(`📋 Final classes for button ${questionNumber}:`, finalClasses);
            console.log(`🔍 Has ic-marked?`, button.classList.contains('ic-marked'));
            console.log(`🔍 Has ic-answered?`, button.classList.contains('ic-answered'));
        }

        updateAllIndicators() {
            // Determine which document to search in (handle iframe context)
            let targetDocument = document;
            
            // Check if we're in parent and navigation buttons are in iframe
            if (window.self === window.top) {
                const iframe = document.querySelector('iframe#part-frame, iframe.part-frame');
                if (iframe && iframe.contentDocument) {
                    targetDocument = iframe.contentDocument;
                }
            }
            
            // Update all question buttons in the correct document
            const questionButtons = targetDocument.querySelectorAll('.subQuestion.scorable-item[data-ordernumber]');
            
            // Also check current document if different
            if (targetDocument !== document) {
                document.querySelectorAll('.subQuestion.scorable-item[data-ordernumber]').forEach(button => {
                    const qNum = parseInt(button.getAttribute('data-ordernumber'), 10);
                    if (!isNaN(qNum)) {
                        this.updateIndicator(qNum);
                        this.updateBookmarkButtons(qNum);
                    }
                });
            }
            
            questionButtons.forEach(button => {
                const qNum = parseInt(button.getAttribute('data-ordernumber'), 10);
                if (!isNaN(qNum)) {
                    this.updateIndicator(qNum);
                    this.updateBookmarkButtons(qNum);
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

