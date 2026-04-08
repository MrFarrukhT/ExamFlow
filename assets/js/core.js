    // Flag to indicate core.js has loaded (for distraction-free.js)
    window.coreJSLoaded = true;

    function escapeHTML(str) {
        if (str == null) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }
    
    document.addEventListener('DOMContentLoaded', () => {
        // --- STATE VARIABLES ---
        let currentPassage = 1;
        let currentQuestion = 1;
        let selectedRange = null;
        
        // Set timer duration based on test skill type
        const skill = document.body.getAttribute('data-skill');
        let timeInSeconds;
        if (skill === 'listening') {
            timeInSeconds = 2400; // 40 minutes for listening test
        } else {
            timeInSeconds = 3600; // 60 minutes for reading/writing tests
        }
        
        let timer;
        let draggedItem = null;
        let activeQuestionElement = null;
        let selectedDragItem = null;

        // --- GLOBAL FUNCTIONS ---
        function getFirstQuestionOfPart(part) {
            switch(part) {
                case 1: return 1;
                case 2: return 14;
                case 3: return 27;
                default: return 1;
            }
        }

        // --- DOM ELEMENTS ---
        const timerDisplay = document.querySelector('.timer-display');
        const timerToggleButton = document.getElementById('timer-toggle-btn');
        const timerResetButton = document.getElementById('timer-reset-btn');
        const deliverButton = document.getElementById('deliver-button');
        const resizer = document.getElementById('resizer');
        
        // Detect test type and get appropriate panels
        const testSkill = document.body.dataset.skill;
        let passagePanel, questionsPanel;
        
        
        if (testSkill === 'reading' || testSkill === 'reading-writing') {
            passagePanel = document.getElementById('passage-panel');
            questionsPanel = document.getElementById('questions-panel');
        } else if (testSkill === 'writing') {
            passagePanel = document.querySelector('.task-panel');
            questionsPanel = document.querySelector('.writing-panel');
        }
        
        const contextMenu = document.getElementById('contextMenu');

        // --- ICON SVGs ---
        const playIcon = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M8 5v14l11-7L8 5z"/></svg>';
        const pauseIcon = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';

      
// --- DYNAMIC ANSWER LOADING SYSTEM ---
let correctAnswers = {};

// Function to get test version from HTML page
function getTestVersion() {
    // Get mock number and skill from data attributes
    const mockNumber = document.body.getAttribute('data-mock');
    const skill = document.body.getAttribute('data-skill');
    
    if (mockNumber && skill) {
        return { mock: mockNumber, skill: skill };
    }
    
    // Fallback: check legacy data-test-version
    const version = document.body.getAttribute('data-test-version');
    if (version) {
        return { mock: version, skill: 'reading' }; // Default to reading
    }
    
    // Default fallback
    return { mock: '1', skill: 'reading' };
}

// Function to load answers for the current test version
async function loadAnswers() {
    const testInfo = getTestVersion();
    const answersPath = `./answers/${testInfo.skill}-answers.js`;
    
    try {
        // Create script element to load answers
        const script = document.createElement('script');
        script.src = answersPath;
        script.onload = () => {
            if (window.testAnswers) {
                correctAnswers = window.testAnswers;
                // Clean up global variable
                delete window.testAnswers;
            } else {
                console.error('❌ Failed to load test answers');
                // Fallback to empty object
                correctAnswers = {};
            }
        };
        script.onerror = () => {
            console.error(`❌ Failed to load answers file: ${answersPath}`);
            correctAnswers = {};
        };
        
        document.head.appendChild(script);
        
    } catch (error) {
        console.error('❌ Error loading answers:', error);
        correctAnswers = {};
    }
}


        // --- INITIALIZATION ---
        function initialize() {
            
            // Load answers first, then continue initialization
            loadAnswers();
            
            // Continue with rest of initialization
            timer = new TestTimer({
                durationSeconds: timeInSeconds,
                displayElement: timerDisplay,
                toggleButton: timerToggleButton,
                resetButton: timerResetButton,
                onTimeUp: () => checkAnswers(),
                playIcon: playIcon,
                pauseIcon: pauseIcon
            });
            timer.start();
            preventAutocomplete();
            initializeDragAndDrop();
            setupCheckboxLimits();
            setupExampleHeading();
            switchToPart(1); // Also calls goToQuestion(1) and updateNavigation
            
            document.body.addEventListener('input', updateAllIndicators);
            document.body.addEventListener('change', updateAllIndicators);
            if (deliverButton) {
                deliverButton.addEventListener('click', checkAnswers);
            }
            if (timerToggleButton) {
                timerToggleButton.addEventListener('click', () => timer.toggle());
            }
            if (timerResetButton) {
                timerResetButton.addEventListener('click', () => timer.reset());
            }

            // Auto-close dropdowns for Questions 20-23 on selection
            ['q20','q21','q22','q23'].forEach(id => {
                const sel = document.getElementById(id);
                if (sel) {
                    sel.addEventListener('change', () => sel.blur());
                }
            });

            // Add click listeners to question containers for navigation
            document.querySelectorAll('[data-q-start]').forEach(el => {
                el.addEventListener('click', (event) => {
                    // Stop event propagation to prevent parent container clicks
                    event.stopPropagation();
                    
                    const qNum = parseInt(el.dataset.qStart, 10);
                    const qEnd = parseInt(el.dataset.qEnd, 10);
                    
                    
                    // Handle cases where qNum is NaN
                    if (isNaN(qNum)) {
                        return;
                    }
                    
                    // Only navigate if this is a single question (qStart === qEnd) or if we're clicking on a specific question within a group
                    if (qNum === qEnd || el.classList.contains('tf-question')) {
                        if (currentQuestion !== qNum) {
                            goToQuestion(qNum);
                        }
                    }
                });
            });
            
            // Add specific click listeners for individual question elements to prevent parent container interference
            document.querySelectorAll('.tf-question, .summary-text').forEach(el => {
                el.addEventListener('click', (event) => {
                    event.stopPropagation();
                    const qNum = parseInt(el.dataset.qStart, 10);
                    
                    // Handle cases where qNum is NaN (like .summary-text containers)
                    if (isNaN(qNum)) {
                        return;
                    }
                    
                    if (currentQuestion !== qNum) {
                        goToQuestion(qNum);
                    }
                });
            });

            // Add specific click listeners for individual input elements in questions 33-36
            document.querySelectorAll('.answer-input[id^="q3"]').forEach(input => {
                input.addEventListener('click', (event) => {
                    event.stopPropagation();
                    const qNum = parseInt(input.id.replace('q', ''), 10);
                    
                    if (currentQuestion !== qNum) {
                        goToQuestion(qNum);
                    }
                });
            });

            // Add click listeners for the paragraph elements containing questions 33-36
            document.querySelectorAll('.summary-text p').forEach(p => {
                p.addEventListener('click', (event) => {
                    event.stopPropagation();
                    // Extract question number from the paragraph text (e.g., "33" from "<strong>33</strong>")
                    const strongElement = p.querySelector('strong');
                    if (strongElement) {
                        const qNum = parseInt(strongElement.textContent, 10);
                        
                        if (!isNaN(qNum) && currentQuestion !== qNum) {
                            goToQuestion(qNum);
                        }
                    }
                });
            });

            if (resizer) {
                resizer.addEventListener('mousedown', initResize, false);
                // Add touch support for mobile devices
                resizer.addEventListener('touchstart', initResizeTouch, false);
            }
            
            // Initialize context menu only if it exists
            if (contextMenu) {
                initializeContextMenu();
            }
        }

        // --- PREVENT BROWSER AUTOCOMPLETE ---
        
        function preventAutocomplete() {
            // Generate a unique session ID to make field names unique
            const sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
            
            // Select all answer input fields and textareas
            const answerInputs = document.querySelectorAll('.answer-input, textarea');
            
            
            answerInputs.forEach((input, index) => {
                // Skip radio buttons and checkboxes - they need their original name attribute to work as groups
                if (input.type === 'radio' || input.type === 'checkbox') {
                    // Only apply autocomplete attribute, don't change name or add readonly
                    input.setAttribute('autocomplete', 'off');
                    return;
                }
                
                // Add autocomplete attribute to prevent browser suggestions
                input.setAttribute('autocomplete', 'one-time-code');
                
                // Add a unique name attribute with session ID to prevent cross-session matching
                const uniqueName = `answer_${sessionId}_${input.id || index}`;
                input.setAttribute('name', uniqueName);
                
                // Make input readonly initially to prevent autocomplete dropdown
                input.setAttribute('readonly', true);
                
                // Remove readonly when user focuses on the field
                input.addEventListener('focus', function() {
                    this.removeAttribute('readonly');
                });
                
                // Re-add readonly when user leaves the field (optional, helps prevent suggestions)
                input.addEventListener('blur', function() {
                    // Only add readonly back if the field is empty
                    // This prevents issues with navigation between fields
                    if (!this.value) {
                        this.setAttribute('readonly', true);
                    }
                });
            });
            
        }

        // --- CORE TEST LOGIC ---

        function checkAnswers() {
            // Disable all inputs to prevent changes
            const allInputs = document.querySelectorAll('input, select, textarea');
            allInputs.forEach(input => {
                input.disabled = true;
            });

            // Disable all drag and drop functionality
            document.querySelectorAll('.drag-item').forEach(item => {
                item.setAttribute('draggable', 'false');
                item.style.cursor = 'not-allowed';
                item.style.pointerEvents = 'none';
            });

            document.querySelectorAll('.drop-zone').forEach(zone => {
                zone.style.pointerEvents = 'none';
                zone.classList.add('disabled');
            });

            // Disable submit button
            deliverButton.disabled = true;
            deliverButton.style.cursor = 'not-allowed';
            
            if (timer) timer.pause();
            let score = 0;
            const totalQuestions = 40;
            const resultsDetailsContainer = document.getElementById('results-details');
            resultsDetailsContainer.innerHTML = '';

            document.querySelectorAll('.correct, .incorrect, .correct-answer-highlight').forEach(el => {
                el.classList.remove('correct', 'incorrect', 'correct-answer-highlight');
            });
            document.querySelectorAll('.correct-answer-display').forEach(el => el.remove());
            
            // Re-enable all inputs when results are cleared
            document.querySelectorAll('input, select, textarea').forEach(input => {
                input.disabled = false;
            });
            
            // Re-enable drag and drop functionality when results are cleared
            document.querySelectorAll('.drag-item').forEach(item => {
                item.setAttribute('draggable', 'true');
                item.style.cursor = 'grab';
                item.style.pointerEvents = 'auto';
            });
            document.querySelectorAll('.drop-zone').forEach(zone => {
                zone.style.pointerEvents = 'auto';
                zone.classList.remove('disabled');
            });

            // Re-enable submit button
            deliverButton.disabled = false;
            deliverButton.style.cursor = 'pointer';

            // Helper to evaluate the special TWO-answers checkbox group (Q20 & Q21) - only if present
            const hasQ20to21Group = document.querySelectorAll('input[name="q20-21"]').length > 0;
            function evaluateQ20to21() {
                const checked = Array.from(document.querySelectorAll('input[name="q20-21"]:checked')).map(el => el.value).sort();
                const isCorrect20 = checked.includes('A');
                const isCorrect21 = checked.includes('E');

                // Mark selected labels
                document.querySelectorAll('input[name="q20-21"]').forEach(input => {
                    const label = input.closest('.multi-choice-option');
                    if (!label) return;
                    label.classList.remove('correct', 'incorrect', 'correct-answer-highlight');
                    if (input.checked) {
                        const good = (input.value === 'A' && isCorrect20) || (input.value === 'E' && isCorrect21);
                        label.classList.add(good ? 'correct' : 'incorrect');
                    }
                    if (!isCorrect20 && input.value === 'A') label.classList.add('correct-answer-highlight');
                    if (!isCorrect21 && input.value === 'E') label.classList.add('correct-answer-highlight');
                });

                const selectedText = checked.join(' & ') || 'Not Answered';
                // Q20 row
                resultsDetailsContainer.innerHTML += `
                    <div class="result-row ${isCorrect20 ? '' : 'incorrect'}">
                        <span class="q-num">20</span>
                        <span class="user-ans">${escapeHTML(selectedText)}</span>
                        <span class="correct-ans">A</span>
                    </div>`;
                // Q21 row
                resultsDetailsContainer.innerHTML += `
                    <div class="result-row ${isCorrect21 ? '' : 'incorrect'}">
                        <span class="q-num">21</span>
                        <span class="user-ans">${escapeHTML(selectedText)}</span>
                        <span class="correct-ans">E</span>
                    </div>`;

                // Mark nav buttons
                const nav20 = document.querySelector(`.subQuestion[onclick="goToQuestion(20)"]`);
                if (nav20) { nav20.classList.remove('answered', 'active'); nav20.classList.add(isCorrect20 ? 'correct' : 'incorrect'); }
                const nav21 = document.querySelector(`.subQuestion[onclick="goToQuestion(21)"]`);
                if (nav21) { nav21.classList.remove('answered', 'active'); nav21.classList.add(isCorrect21 ? 'correct' : 'incorrect'); }

                if (isCorrect20) score += 1;
                if (isCorrect21) score += 1;
                return (isCorrect20 || isCorrect21);
            }

            let q20to21Evaluated = false;
            for (let i = 1; i <= totalQuestions; i++) {
                const questionKey = String(i);
                const correctAnswer = correctAnswers[questionKey];
                let userAnswer = '';
                let isCorrect = false;
                
                let userAnswerDisplay = 'Not Answered';
                const correctAnswerText = Array.isArray(correctAnswer) ? correctAnswer.join(' / ') : correctAnswer;

                // Special handling: combined checkbox group for Q20 & Q21
                if ((i === 20 || i === 21) && hasQ20to21Group) {
                    if (!q20to21Evaluated) {
                        evaluateQ20to21();
                        q20to21Evaluated = true;
                    }
                    continue; // Already handled rows, scoring, and marking
                }

                const textInput = document.getElementById(`q${i}`);
                const radioGroup = document.querySelectorAll(`input[name="q${i}"][type="radio"]`);
                
                // Handle Text and Select Inputs
                if (textInput && (textInput.tagName === 'INPUT' || textInput.tagName === 'SELECT')) {
                    const element = textInput.closest('.matching-form-row') || textInput;
                    userAnswer = textInput.value.trim();
                    userAnswerDisplay = userAnswer || 'Not Answered';

                    const normalize = (s) => (s || '')
                        .toString()
                        .toLowerCase()
                        .replace(/[^a-z0-9\s]/g, '')
                        .replace(/\s+/g, ' ')
                        .trim();

                    if (textInput.tagName === 'SELECT') {
                        isCorrect = userAnswer === correctAnswer;
                    } else {
                        const normUser = normalize(userAnswer);
                        if (Array.isArray(correctAnswer)) {
                            isCorrect = correctAnswer.some(ans => normalize(ans) === normUser);
                        } else {
                            isCorrect = normalize(correctAnswer) === normUser;
                        }
                    }
                    
                    if (isCorrect) {
                        score++;
                        element.classList.add('correct');
                    } else {
                        element.classList.add('incorrect');
                        const correctAnswerSpan = document.createElement('span');
                        correctAnswerSpan.className = 'correct-answer-display';
                        correctAnswerSpan.innerHTML = `&nbsp;&#10148;&nbsp;<span class="correct-answer-highlight">${escapeHTML(correctAnswerText)}</span>`;
                        textInput.parentNode.insertBefore(correctAnswerSpan, textInput.nextSibling);
                    }
                }
                // Handle drag and drop questions (any with a drop-zone for this question)
                else if (document.querySelector(`.drop-zone[data-q-start="${i}"]`)) {
                    const dropZone = document.querySelector(`.drop-zone[data-q-start="${i}"]`);
                    const droppedItem = dropZone ? dropZone.querySelector('.drag-item') : null;
                    
                    
                    if (droppedItem) {
                        userAnswer = droppedItem.dataset.value;
                        userAnswerDisplay = userAnswer;
                        isCorrect = userAnswer === correctAnswer;
                        
                        
                        // Mark the drop zone as correct or incorrect
                        dropZone.classList.add(isCorrect ? 'correct' : 'incorrect');
                        
                        if (isCorrect) {
                            score++;
                        }

                        // Show correct answer if wrong
                        if (!isCorrect && correctAnswer) {
                            const correctAnswerSpan = document.createElement('span');
                            correctAnswerSpan.className = 'correct-answer-display';
                            correctAnswerSpan.innerHTML = `&nbsp;&#10148;&nbsp;<span class="correct-answer-highlight">${escapeHTML(correctAnswer)}</span>`;
                            dropZone.appendChild(correctAnswerSpan);
                        }
                    } else {
                        // No answer provided - mark as incorrect
                        if (dropZone) {
                            dropZone.classList.add('incorrect');
                        }
                        if (correctAnswer) {
                            const correctAnswerSpan = document.createElement('span');
                            correctAnswerSpan.className = 'correct-answer-display';
                            correctAnswerSpan.innerHTML = `&nbsp;&#10148;&nbsp;<span class="correct-answer-highlight">${escapeHTML(correctAnswer)}</span>`;
                            dropZone.appendChild(correctAnswerSpan);
                        }
                    }
                }
                // Handle summary drop zone questions (36-40)
                else if (document.querySelector(`.summary-drop-zone[data-question="${i}"]`)) {
                    const summaryDropZone = document.querySelector(`.summary-drop-zone[data-question="${i}"]`);
                    const droppedItem = summaryDropZone ? summaryDropZone.querySelector('.drag-item') : null;
                    
                    
                    if (droppedItem) {
                        userAnswer = droppedItem.dataset.value;
                        userAnswerDisplay = userAnswer;
                        isCorrect = userAnswer === correctAnswer;
                        
                        
                        // Mark the summary drop zone as correct or incorrect
                        summaryDropZone.classList.add(isCorrect ? 'correct' : 'incorrect');
                        
                        if (isCorrect) {
                            score++;
                        }

                        // Show correct answer if wrong
                        if (!isCorrect && correctAnswer) {
                            const correctAnswerSpan = document.createElement('span');
                            correctAnswerSpan.className = 'correct-answer-display';
                            correctAnswerSpan.innerHTML = `&nbsp;&#10148;&nbsp;<span class="correct-answer-highlight">${escapeHTML(correctAnswer)}</span>`;
                            summaryDropZone.appendChild(correctAnswerSpan);
                        }
                    } else {
                        // No answer provided - mark as incorrect
                        if (summaryDropZone) {
                            summaryDropZone.classList.add('incorrect');
                        }
                        if (correctAnswer) {
                            const correctAnswerSpan = document.createElement('span');
                            correctAnswerSpan.className = 'correct-answer-display';
                            correctAnswerSpan.innerHTML = `&nbsp;&#10148;&nbsp;<span class="correct-answer-highlight">${escapeHTML(correctAnswer)}</span>`;
                            summaryDropZone.appendChild(correctAnswerSpan);
                        }
                    }
                }
                // Handle Radio Button Inputs (T/F, MCQs)
                else if (radioGroup.length > 0) {
                    const questionContainer = radioGroup[0]?.closest('.tf-question') || radioGroup[0]?.closest('.multi-choice-question');
                    const checkedRadio = document.querySelector(`input[name="q${i}"]:checked`);

                    if (checkedRadio) {
                        userAnswer = checkedRadio.value;
                        userAnswerDisplay = userAnswer;
                        isCorrect = userAnswer === correctAnswer;

                        const userLabel = checkedRadio.closest('.tf-option, .multi-choice-option');
                        if (userLabel) {
                            userLabel.classList.add(isCorrect ? 'correct' : 'incorrect');
                        }
                        
                        // Handle table radio buttons
                        if (checkedRadio.classList.contains('table-radio')) {
                            const tableCell = checkedRadio.closest('td');
                            if (tableCell) {
                                tableCell.classList.add(isCorrect ? 'correct' : 'incorrect');
                            }
                        }
                    }

                    if (isCorrect) {
                        score++;
                    } else {
                        if (questionContainer){
                            const correctOptionEl = questionContainer.querySelector(`input[name="q${i}"][value="${correctAnswerText}"]`);
                            if (correctOptionEl) {
                                const correctLabel = correctOptionEl.closest('.tf-option, .multi-choice-option');
                                if (correctLabel) {
                                    correctLabel.classList.add('correct-answer-highlight');
                                }
                            }
                        }
                    }
                }
                // Handle clickable-cell matrix questions (generic for any i that has clickable cells)
                else if (document.querySelector(`.clickable-cell[data-question="${i}"]`)) {
                    const selectedCell = document.querySelector(`.clickable-cell[data-question="${i}"][data-selected="true"]`);
                    
                    if (selectedCell) {
                        userAnswer = selectedCell.dataset.answer;
                        userAnswerDisplay = userAnswer;
                        isCorrect = userAnswer === correctAnswer;
                        
                        
                        selectedCell.classList.add(isCorrect ? 'correct' : 'incorrect');
                        
                        if (isCorrect) {
                            score++;
                        }
                    } else {
                        userAnswerDisplay = 'Not Answered';
                    }

                    // Handle highlighting correct answers for incorrect responses
                    if (!isCorrect) {
                        const correctCell = document.querySelector(`.clickable-cell[data-question="${i}"][data-value="${correctAnswerText}"]`);
                        if (correctCell) {
                            correctCell.classList.add('correct-answer-highlight');
                        }
                    }
                }
                // Handle text input questions (33-39)
                else if (i >= 33 && i <= 39) {
                    const textInput = document.getElementById(`q${i}`);
                    
                    if (textInput) {
                        userAnswer = textInput.value.trim().toLowerCase();
                        userAnswerDisplay = userAnswer || 'Not Answered';
                        
                        // Handle special case for question 33 which has two answers
                        if (i === 33) {
                            const answers = userAnswer.split('&').map(ans => ans.trim());
                            isCorrect = answers.includes('breathing') && answers.includes('eating');
                        } else {
                            isCorrect = userAnswer === correctAnswer.toLowerCase();
                        }
                        
                        
                        if (isCorrect) {
                            score++;
                            textInput.classList.add('correct');
                        } else {
                            textInput.classList.add('incorrect');
                        }
                    } else {
                        userAnswerDisplay = 'Not Answered';
                    }
                }
                // Handle question 40 (multiple choice)
                else if (i === 40) {
                    const checkedRadio = document.querySelector(`input[name="q${i}"]:checked`);
                    
                    if (checkedRadio) {
                        userAnswer = checkedRadio.value;
                        userAnswerDisplay = userAnswer;
                        isCorrect = userAnswer === correctAnswer;
                        
                        
                        const userLabel = checkedRadio.closest('.multi-choice-option');
                        if (userLabel) {
                            userLabel.classList.add(isCorrect ? 'correct' : 'incorrect');
                        }
                        
                        if (isCorrect) {
                            score++;
                        } else {
                            
                            // Highlight correct answer
                            const correctOptionEl = document.querySelector(`input[name="q${i}"][value="${correctAnswer}"]`);
                            if (correctOptionEl) {
                                const correctLabel = correctOptionEl.closest('.multi-choice-option');
                                if (correctLabel) {
                                    correctLabel.classList.add('correct-answer-highlight');
                                }
                            }
                        }
                    } else {
                        userAnswerDisplay = 'Not Answered';
                    }
                }
                // Handle Checkbox Inputs (Multiple choice questions like 24-26)

                 
                // For showing results in the modal
                 const resultRow = `
                    <div class="result-row ${isCorrect ? '' : 'incorrect'}">
                        <span class="q-num">${i}</span>
                        <span class="user-ans">${escapeHTML(userAnswerDisplay)}</span>
                        <span class="correct-ans">${escapeHTML(correctAnswerText)}</span>
                    </div>`;
                resultsDetailsContainer.innerHTML += resultRow;
                
                // Update nav button color
                const navButton = document.querySelector(`.subQuestion[onclick="goToQuestion(${i})"]`);
                if (navButton) {
                    navButton.classList.remove('answered', 'active');
                    navButton.classList.add(isCorrect ? 'correct' : 'incorrect');
                }
            }

            document.getElementById('results-score').textContent = score;
            document.getElementById('results-band').textContent = calculateBandScore(score);
            document.body.classList.add('results-mode');
            document.getElementById('results-modal').classList.remove('hidden');
            
            // Change button to "My Result" with green styling
            deliverButton.innerHTML = `<span>My Result</span>`;
            deliverButton.style.backgroundColor = '#4CAF50';
            deliverButton.style.color = 'white';
            deliverButton.style.borderColor = '#4CAF50';
            deliverButton.disabled = false;
            deliverButton.style.cursor = 'pointer';
            deliverButton.removeEventListener('click', checkAnswers);
            deliverButton.addEventListener('click', showResultsModal);
            
            // Highlight correct answers in the passage
            highlightCorrectAnswersInPassage();
        }

        function calculateBandScore(score) {
            if (score >= 39) return '9.0';
            const mapping = {
                40: 9.0, 39: 9.0, 38: 8.5, 37: 8.5, 36: 8.0, 35: 8.0, 34: 7.5,
                33: 7.5, 32: 7.0, 31: 7.0, 30: 7.0, 29: 6.5, 28: 6.5, 27: 6.5,
                26: 6.0, 25: 6.0, 24: 6.0, 23: 5.5, 22: 5.5, 21: 5.5, 20: 5.5,
                19: 5.0, 18: 5.0, 17: 5.0, 16: 5.0, 15: 5.0, 14: 4.5, 13: 4.5,
                12: 4.0, 11: 4.0, 10: 4.0, 9: 3.5, 8: 3.5, 7: 3.0, 6: 3.0,
                5: 2.5, 4: 2.5
            };
            if (score <= 0) return 0.0;
            if (score === 1) return 1.0;
            if (score <= 3) return 2.0;
            if (score <= 5) return 2.5;
            return mapping[score] || 0.0;
        }

        function highlightCorrectAnswersInPassage() {
            // Define the text passages and their corresponding question numbers for Part 1 (Australia's cane toad problem)
            const part1Highlights = [
                { question: 1, text: "beetle", answer: "beetle" },
                { question: 2, text: "roots", answer: "roots" },
                { question: 3, text: "expensive", answer: "expensive" },
                { question: 4, text: "gardeners", answer: "gardeners" },
                { question: 5, text: "moth", answer: "moth" },
                { question: 6, text: "Hawaii", answer: "Hawaii" },
                { question: 7, text: "failure", answer: "failure" },
                { question: 8, text: "immediately obvious", answer: "FALSE" },
                { question: 9, text: "Rabbits were introduced to Australia to control weeds", answer: "FALSE" },
                { question: 10, text: "Walter Froggatt was criticised", answer: "TRUE" },
                { question: 11, text: "average size of cane toads has increased", answer: "FALSE" },
                { question: 12, text: "Australian animals can eat cane toads safely", answer: "FALSE" },
                { question: 13, text: "cane toads are gaining control of the habitats", answer: "TRUE" }
            ];

            // Define the text passages and their corresponding question numbers for Part 2 (Griffith and American films)
            const part2Highlights = [
                { question: 14, text: "gender relations", answer: "iii" },
                { question: 15, text: "star system", answer: "i" },
                { question: 16, text: "government censorship", answer: "v" },
                { question: 17, text: "movie trust", answer: "iv" },
                { question: 18, text: "photographic realism", answer: "ii" },
                { question: 19, text: "Big Five", answer: "vi" },
                { question: 20, text: "completely copy the same system", answer: "D" },
                { question: 21, text: "pressure to change its market", answer: "C" },
                { question: 22, text: "old film company's opposition", answer: "A" },
                { question: 23, text: "huge drop happens among adults", answer: "B" },
                { question: 24, text: "He earns lots of money", answer: "D" },
                { question: 25, text: "Complete copy his theory and methods", answer: "B" },
                { question: 26, text: "Changed its goal market", answer: "C" }
            ];

            // Define the text passages and their corresponding question numbers for Part 3 (Environmentally-friendly vehicles)
            const part3Highlights = [
                { question: 27, text: "Ford Fusion is manufactured at Ford's Hermosillo Stamping & Assembly plant, located in Sonora Mexico. I thought going green was supposed to provide the U.S. with more jobs", answer: "D" },
                { question: 28, text: "Throughout the 1990s, the appeal of fuel-efficient or environmentally friendly cars declined among Americans", answer: "B" },
                { question: 29, text: "GM famously de-activated the few EV1s that were donated to engineering schools and museums", answer: "A" },
                { question: 30, text: "Senior leaders at several large automakers, including Nissan and General Motors, have stated that the Roadster was a catalyst which demonstrated that there is pent-up consumer demand for more efficient vehicles", answer: "C" },
                { question: 31, text: "The automakers were accused of pandering to the wishes of CARB in order to continue to be allowed to sell cars in the lucrative Californian market, while failing to adequately promote their electric vehicles in order to create the impression that the consumers were not interested in the cars", answer: "YES" },
                { question: 32, text: "Toyota offered the last 328 RAV4-EVs for sale to the general public during six months, up until November 22, 2002", answer: "NO" },
                { question: 33, text: "American automakers chose to focus their product lines around the truck-based vehicles, which enjoyed larger profit margins than the smaller cars which were preferred in places like Europe or Japan", answer: "YES" },
                { question: 34, text: "Hybrids, which featured a combined gasoline and electric powertrain, were seen as a balance, offering an environmentally friendly image and improved fuel economy, without being hindered by the low range of electric vehicles, albeit at an increased price over comparable gasoline cars", answer: "NO" },
                { question: 35, text: "GM Vice Chairman Bob Lutz said in 2007 that the Tesla Roadster inspired him to push GM to develop the Chevrolet Volt, a plug-in hybrid sedan prototype that aims to reverse years of dwindling market share and massive financial losses for America's largest automaker", answer: "YES" },
                { question: 36, text: "concept car", answer: "D" },
                { question: 37, text: "United Kingdom", answer: "B" },
                { question: 38, text: "gasoline-electricity", answer: "I" },
                { question: 39, text: "longer distances", answer: "E" },
                { question: 40, text: "cargo space", answer: "K" }
            ];

            // Function to apply highlights to a passage
            function applyHighlights(passageElement, highlights) {
                if (!passageElement) return;

                // Clear any existing highlights
                passageElement.querySelectorAll('.answer-highlight').forEach(el => {
                    const parent = el.parentNode;
                    parent.replaceChild(document.createTextNode(el.textContent), el);
                    parent.normalize();
                });

                // Add highlights for each answer
                highlights.forEach(item => {
                    const paragraphs = passageElement.querySelectorAll('p');
                    paragraphs.forEach(paragraph => {
                        const html = paragraph.innerHTML;
                        if (!html || typeof html !== 'string') return;
                        if (html.includes(item.text)) {
                            const escapeRegExp = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            const re = new RegExp(escapeRegExp(item.text));
                            const replaced = html.replace(
                                re,
                                `<span class="answer-highlight" data-question="${item.question}" style="
                                    background-color: #ffeb3b;
                                    padding: 2px 4px;
                                    border-radius: 3px;
                                    font-weight: bold;
                                    position: relative;
                                ">${item.text}<span style="
                                    position: absolute;
                                    top: -8px;
                                    right: -8px;
                                    background-color: #2196f3;
                                    color: white;
                                    border-radius: 50%;
                                    width: 20px;
                                    height: 20px;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    font-size: 12px;
                                    font-weight: bold;
                                ">${item.question}</span></span>`
                            );
                            paragraph.innerHTML = replaced;
                        }
                    });
                });
            }

            // Apply highlights to Part 1 (Kedgeree)
            const passageText1 = document.getElementById('passage-text-1');
            applyHighlights(passageText1, part1Highlights);

            // Apply highlights to Part 2 (Griffith and American films)
            const passageText2 = document.getElementById('passage-text-2');
            applyHighlights(passageText2, part2Highlights);

            // Apply highlights to Part 3 (Environmentally-friendly vehicles)
            const passageText3 = document.getElementById('passage-text-3');
            applyHighlights(passageText3, part3Highlights);
        }

        function getUserAnswer(qNum) {
            const textInput = document.getElementById(`q${qNum}`);
            const radioInput = document.querySelector(`input[name="q${qNum}"]:checked`);
            const dropZone = document.querySelector(`.drop-zone[data-q-start="${qNum}"]`);

            if (textInput) { // Handles <input type="text"> and <select>
                return { value: textInput.value, text: textInput.value || 'N/A' };
            }
            if (radioInput) {
                return { value: radioInput.value, text: radioInput.value };
            }
            if (dropZone) {
                const droppedItem = dropZone.querySelector('.drag-item');
                return { 
                    value: droppedItem ? droppedItem.dataset.value : null, 
                    text: droppedItem ? droppedItem.textContent.trim() : 'N/A' 
                };
            }
            // Handle clickable cells for questions 23-26
            if (qNum >= 23 && qNum <= 26) {
                const selectedCell = document.querySelector(`.clickable-cell[data-question="${qNum}"][data-selected="true"]`);
                if (selectedCell) {
                    return { value: selectedCell.dataset.answer, text: selectedCell.dataset.answer };
                }
            }
            return { value: null, text: 'N/A' };
        }

        function displayCorrectAnswer(qNum, correctAnswer) {
            // Handle multi-choice group questions (e.g., 24-26, 38-40)
            // No special checkbox groups used; fall through

            // Handle radio button questions by highlighting the correct label
            const correctRadioInput = document.querySelector(`input[name="q${qNum}"][value="${correctAnswer}"]`);
            if (correctRadioInput) {
                const parentOption = correctRadioInput.closest('.tf-option, .multi-choice-option');
                if (parentOption) {
                    parentOption.classList.add('correct-answer-highlight');
                    return;
                }
            }

            // Handle text inputs, select dropdowns, and others by showing the answer next to them
            const inputEl = document.getElementById(`q${qNum}`);
            if (inputEl) {
                const displaySpan = document.createElement('span');
                displaySpan.className = 'correct-answer-display';
                displaySpan.textContent = ` ✓ ${correctAnswer}`;
                inputEl.insertAdjacentElement('afterend', displaySpan);
                return; // Done
            }
            
            // Fallback for questions identified by a container (e.g., some T/F/NG questions)
            const element = findQuestionElement(qNum);
            if (element) {
                const displaySpan = document.createElement('span');
                displaySpan.className = 'correct-answer-display';
                displaySpan.textContent = ` ✓ ${correctAnswer}`;
                const itemContainer = element.querySelector('.tf-question-text');
                if (itemContainer) {
                     itemContainer.appendChild(displaySpan);
                } else {
                     element.appendChild(displaySpan);
                }
            }
        }
        
        function findQuestionElement(qNum) {
             return document.querySelector(`[data-q-start="${qNum}"]`);
        }

        function addResultToModal(qNum, userAnswer, correctAnswer, isCorrect) {
            const resultsDetails = document.getElementById('results-details');
            const row = document.createElement('div');
            row.className = 'result-row';
            if (!isCorrect) {
                row.classList.add('incorrect');
            }
            row.innerHTML = `
                <span class="q-num">${escapeHTML(qNum)}</span>
                <span class="user-ans">${escapeHTML(userAnswer)}</span>
                <span class="correct-ans">${escapeHTML(correctAnswer)}</span>
            `;
            resultsDetails.appendChild(row);
        }

        function showResultsModal() {
            document.getElementById('results-modal').classList.remove('hidden');
        }

        window.closeResultsModal = function() {
            document.getElementById('results-modal').classList.add('hidden');
            document.body.classList.remove('results-mode');
        }
        
        function disableInputs() {
            deliverButton.innerHTML = `<span>Checked! View Results.</span>`;
            deliverButton.removeEventListener('click', checkAnswers);
            deliverButton.onclick = showResultsModal;

            document.querySelectorAll('input, select').forEach(el => {
                el.disabled = true;
                 if (el.matches('input[type=radio], input[type=checkbox]')) {
                     el.style.cursor = 'not-allowed';
                     el.parentElement.style.cursor = 'not-allowed';
                 }
            });
            document.querySelectorAll('.drag-item').forEach(el => {
                el.setAttribute('draggable', 'false');
                el.style.cursor = 'default';
            });
            document.querySelectorAll('.drop-zone').forEach(el => {
                el.classList.add('disabled');
            });
        }

        function checkValue(userValue, correctValue) {
            if (userValue === null || userValue === undefined) return false;
            const formattedUserValue = userValue.trim().toLowerCase();
            if (Array.isArray(correctValue)) {
                return correctValue.map(v => v.toLowerCase()).includes(formattedUserValue);
            } else {
                return formattedUserValue === String(correctValue).toLowerCase();
            }
        }

        function markQuestion(qNum, isCorrect) {
            const subQuestionBtn = document.querySelector(`.subQuestion[onclick="goToQuestion(${qNum})"]`);
            subQuestionBtn?.classList.add(isCorrect ? 'correct' : 'incorrect');

            const elementsToMark = [
                document.querySelector(`.tf-question[data-q-start="${qNum}"]`),
                document.querySelector(`.multi-choice-question[data-q-start="${qNum}"]`),
                document.querySelector(`.matching-question-item[data-q-start="${qNum}"]`),
                document.querySelector(`.drop-zone[data-q-start="${qNum}"]`),
                document.getElementById(`q${qNum}`),
                document.querySelector(`input[name="q${qNum}"]:checked`)?.closest('.tf-option'),
                document.querySelector(`input[name="q${qNum}"]:checked`)?.closest('.multi-choice-option')
            ];
            
            elementsToMark.forEach(el => {
                if (el) el.classList.add(isCorrect ? 'correct' : 'incorrect');
            });

             if (qNum === 14 || qNum === 15) {
                const multiChoiceContainer = document.querySelector('.multi-choice-question[data-q-start="14"]');
                if (multiChoiceContainer) multiChoiceContainer.classList.add(isCorrect ? 'correct' : 'incorrect');
             } else if (qNum >= 1 && qNum <= 5) {
                const pMatchInput = document.getElementById(`q${qNum}`);
                if (pMatchInput) pMatchInput.classList.add(isCorrect ? 'correct' : 'incorrect');
            }
        }

        function switchToPart(partNumber) {
            
            currentPassage = partNumber;

            // Hide all passages and questions
            document.querySelectorAll('.reading-passage, .question-set, .part-header').forEach(el => {
                el.classList.add('hidden');
            });

            // Show the correct passage, questions, and header
            document.getElementById(`passage-text-${partNumber}`).classList.remove('hidden');
            document.getElementById(`questions-${partNumber}`).classList.remove('hidden');
            document.getElementById(`part-header-${partNumber}`).classList.remove('hidden');

            // Update bottom navigation 'selected' state
            document.querySelectorAll('.footer__questionWrapper___1tZ46').forEach((wrapper, index) => {
                wrapper.classList.toggle('selected', (index + 1) === partNumber);
            });

            // Show/hide explanation buttons based on part
            const explanationButton = document.getElementById('show-explanation-btn');
            const explanationButtonPart3 = document.getElementById('show-explanation-btn-part3');
            
            if (explanationButton) {
                if (partNumber === 2) {
                    explanationButton.style.display = 'block';
                } else {
                    explanationButton.style.display = 'none';
                    // Hide explanation section when switching away from part 2
                    const explanationSection = document.getElementById('part-2-explanation');
                    if (explanationSection) {
                        explanationSection.classList.add('hidden');
                        explanationButton.textContent = 'Show Explanation';
                        explanationButton.style.backgroundColor = '#4a90e2';
                    }
                }
            }
            
            if (explanationButtonPart3) {
                if (partNumber === 3) {
                    explanationButtonPart3.style.display = 'block';
                } else {
                    explanationButtonPart3.style.display = 'none';
                    // Hide explanation section when switching away from part 3
                    const explanationSection = document.getElementById('part-3-explanation');
                    if (explanationSection) {
                        explanationSection.classList.add('hidden');
                        explanationButtonPart3.textContent = 'Show Explanation';
                        explanationButtonPart3.style.backgroundColor = '#4a90e2';
                    }
                }
            }

            
            // Only go to first question when switching parts, not when staying in same part
            // This allows goToQuestion to work properly for specific question navigation
            // const firstQuestionOfPart = {1: 1, 2: 14, 3: 27}[partNumber];
            // goToQuestion(firstQuestionOfPart);
        }
        
        function goToQuestion(questionNumber) {
            
            currentQuestion = questionNumber;

            let passageNumber = 1;
            if (questionNumber >= 14 && questionNumber <= 26) passageNumber = 2;
            else if (questionNumber >= 27) passageNumber = 3;
            
            
            if (currentPassage !== passageNumber) {
                switchToPart(passageNumber);
                return; 
            }


            if (activeQuestionElement) {
                // Remove active style from previous block
                activeQuestionElement.classList.remove('active-question', 'active-input');
                // Also remove from the container block if we previously set it
                const prevBlock = activeQuestionElement.closest('[data-q-start]');
                if (prevBlock) prevBlock.classList.remove('active-question');
            }

            // First, try to find the specific input element for questions 33-36
            let targetEl = document.getElementById(`q${questionNumber}`);
            if (targetEl) {
                activeQuestionElement = targetEl;
                targetEl.classList.add('active-input');
                scrollIntoViewIfNeeded(targetEl);
            } else {
                // Fall back to looking for question containers
                targetEl = document.querySelector(`[data-q-start="${questionNumber}"]`);

                if (targetEl) {
                    activeQuestionElement = targetEl;
                    
                    if (targetEl.matches('input[type="text"]') || targetEl.matches('select')) {
                        targetEl.classList.add('active-input');
                    } else {
                        targetEl.classList.add('active-question');
                    }
                    scrollIntoViewIfNeeded(targetEl);
                } else {
                    const pMatch = document.querySelector(`.paragraph-matching-question select[id="q${questionNumber}"]`);
                    if(pMatch) {
                        activeQuestionElement = pMatch;
                        pMatch.classList.add('active-input');
                        scrollIntoViewIfNeeded(pMatch);
                    }
                }
            }

            updateNavigation();
        }
        
        // --- UI & NAVIGATION ---

        function updateNavigation() {
            
            const navButtons = document.querySelectorAll('.subQuestion');
            navButtons.forEach(btn => btn.classList.remove('active'));
            const activeNav = document.querySelector(`.subQuestion[onclick="goToQuestion(${currentQuestion})"]`);
            if (activeNav) {
                activeNav.classList.add('active');
            }

            const inputs = document.querySelectorAll('.answer-input, .drop-zone.filled, .summary-drop-zone.filled');
            inputs.forEach(input => input.classList.remove('active-input'));
            
            const activeInput = document.getElementById(`q${currentQuestion}`);
            if (activeInput) {
                activeInput.classList.add('active-input');
                if (typeof activeInput.focus === 'function') {
                    activeInput.focus();
                }
            } else {
                // Prefer the specific question element for styling (TF/MCQ), fallback to any data-q-start container
                let activeQuestionBlock = document.querySelector(`.tf-question[data-q-start="${currentQuestion}"]`) 
                    || document.querySelector(`.multi-choice-question[data-q-start="${currentQuestion}"]`) 
                    || document.querySelector(`[data-q-start="${currentQuestion}"]`);
                if (activeQuestionBlock) {
                    // Add active-question class to style number badge
                    activeQuestionBlock.classList.add('active-question');
                    const firstInput = activeQuestionBlock.querySelector('input, select');
                    if(firstInput) {
                        firstInput.classList.add('active-input');
                         if (typeof firstInput.focus === 'function') {
                            firstInput.focus();
                        }
                    }
                }
            }
            
        }
        
        function selectDragItem(item) {
            if (selectedDragItem) {
                selectedDragItem.classList.remove('selected');
            }
            selectedDragItem = item;
            if (selectedDragItem) {
                selectedDragItem.classList.add('selected');
            }
        }
        
        window.nextQuestion = () => currentQuestion < 40 && goToQuestion(currentQuestion + 1);
        window.previousQuestion = () => currentQuestion > 1 && goToQuestion(currentQuestion - 1);

        function updateAllIndicators() {
            updateAttemptedCount(1, 1, 13);
            updateAttemptedCount(2, 14, 26);
            updateAttemptedCount(3, 27, 40);
            updateAnsweredNav();
        }
        
            function updateAnsweredNav() {
            const navButtons = document.querySelectorAll('.subQuestion');
            navButtons.forEach(btn => {
                const qNum = parseInt(btn.textContent, 10);
                if (isQuestionAnswered(qNum)) {
                    btn.classList.add('answered');
                } else {
                    btn.classList.remove('answered');
                }
            });
        }
        
            function isQuestionAnswered(qNum) {
            const textInput = document.getElementById(`q${qNum}`);
            if (textInput && (textInput.value.trim() !== '' || (textInput.classList.contains('drop-zone') && textInput.children.length > 0))) {
                return true;
            }
            const radio = document.querySelector(`input[name="q${qNum}"]:checked`);
            if (radio) {
                return true;
            }
            // Special handling for the combined checkbox group (Q20 & Q21)
            if (qNum === 20 || qNum === 21) {
                const checked = document.querySelectorAll('input[name="q20-21"]:checked');
                if (checked.length > 0) return true;
            }
            // Handle drag & drop questions (e.g., 20-23)
            const dz = document.querySelector(`.drop-zone[data-q-start="${qNum}"]`);
            if (dz && dz.querySelector('.drag-item')) {
                return true;
            }
            // Handle summary drop zone questions (e.g., 36-40)
            const summaryDz = document.querySelector(`.summary-drop-zone[data-question="${qNum}"]`);
            if (summaryDz && summaryDz.querySelector('.drag-item')) {
                return true;
            }
            // Handle clickable-cell matrix questions (any question using clickable cells)
                const selectedCell = document.querySelector(`.clickable-cell[data-question="${qNum}"][data-selected="true"]`);
                if (selectedCell) {
                    return true;
            }
            return false;
        }

        function scrollIntoViewIfNeeded(element) {
            const panel = element.closest('.questions-panel, .passage-panel');
            const panelRect = panel.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            if (elementRect.top < panelRect.top || elementRect.bottom > panelRect.bottom) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
        
        // --- DRAG AND DROP ---
        
        function initializeDragAndDrop() {
            document.querySelectorAll('.drag-item').forEach(item => {
                item.addEventListener('dragstart', handleDragStart);
                item.addEventListener('dragend', handleDragEnd);
                item.addEventListener('click', () => selectDragItem(item));
            });
            document.querySelectorAll('.drop-zone, .drag-options-container, .summary-drop-zone').forEach(zone => {
                zone.addEventListener('dragover', handleDragOver);
                zone.addEventListener('dragleave', handleDragLeave);
                zone.addEventListener('drop', handleDrop);
            });
        }

        function handleDragStart(e) {
            draggedItem = e.target;
            setTimeout(() => e.target.classList.add('dragging'), 0);
        }

        function handleDragEnd(e) {
            e.target.classList.remove('dragging');
            draggedItem = null;
        }

        function handleDragOver(e) {
            e.preventDefault();
            const targetZone = e.currentTarget;
            if (draggedItem && draggedItem.dataset.dndGroup === targetZone.dataset.dndGroup) {
                targetZone.classList.add('drag-over');
            }
        }

        function handleDragLeave(e) {
            e.currentTarget.classList.remove('drag-over');
        }

        function handleDrop(e) {
            e.preventDefault();
            const targetZone = e.currentTarget;
            targetZone.classList.remove('drag-over');

            if (!draggedItem || draggedItem.dataset.dndGroup !== targetZone.dataset.dndGroup) {
                return;
            }

            const sourceZone = draggedItem.parentElement;
            if (sourceZone === targetZone) return; // Prevent dropping on itself

            const existingItemInTarget = (targetZone.classList.contains('drop-zone') || targetZone.classList.contains('summary-drop-zone')) 
                ? targetZone.querySelector('.drag-item') 
                : null;

            // First, clear the target drop-zone of any text (like question numbers) before adding the new item.
            if (targetZone.classList.contains('drop-zone') || targetZone.classList.contains('summary-drop-zone')) {
                Array.from(targetZone.childNodes).forEach(node => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        node.remove();
                    }
                });
            }

            // Move the item that was in the target (if any) to the source zone.
            if (existingItemInTarget) {
                sourceZone.appendChild(existingItemInTarget);
            }
            
            // Finally, move the dragged item to the target zone.
            targetZone.appendChild(draggedItem);
            targetZone.classList.add('filled');
            // Lock the pill-like appearance for items dropped into zones
            if (draggedItem) {
                draggedItem.style.cursor = 'default';
            }
            // Hide placeholder text (question number) once filled
            if (targetZone.textContent && /^\d+$/.test(targetZone.textContent.trim())) {
                targetZone.textContent = '';
            }

            // After the move, clean up the source zone if it's a drop-zone and is now empty.
            if ((sourceZone.classList.contains('drop-zone') || sourceZone.classList.contains('summary-drop-zone')) && !sourceZone.querySelector('.drag-item')) {
                 sourceZone.classList.remove('filled');
                 const qNum = sourceZone.dataset.qStart;
                 if (sourceZone.classList.contains('drop-zone')) {
                     sourceZone.innerText = qNum; // Restore the question number
                 }
            }
            
            updateAllIndicators();
        }
        
        // --- MISC HELPERS ---

        function setupCheckboxLimits() {
            const checkboxGroups = [
                { name: 'q20-21', limit: 2 },
                { name: 'q38-40', limit: 3 }
            ];
            checkboxGroups.forEach(group => {
                const checkboxes = document.querySelectorAll(`input[name="${group.name}"]`);
                checkboxes.forEach(checkbox => {
                    checkbox.addEventListener('change', () => {
                        const checkedCount = document.querySelectorAll(`input[name="${group.name}"]:checked`).length;
                        if (checkedCount > group.limit) checkbox.checked = false;
                        updateAllIndicators();
                    });
                });
            });
        }

        function setupExampleHeading() {
            const exampleBox = document.querySelector('.example-box');
            if(exampleBox){
                const title = document.createElement('p');
                title.style.fontWeight = 'bold';
                title.textContent = 'List of Statements';
                // exampleBox.insertBefore(title, exampleBox.firstChild);
            }
        }
        
        function initResize(e) {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = passagePanel.offsetWidth;
            
            const doDrag = (e) => {
                const newWidth = startWidth + e.clientX - startX;
                if (newWidth > 200 && (document.body.clientWidth - newWidth - resizer.offsetWidth) > 200) {
                    passagePanel.style.flex = `0 0 ${newWidth}px`;
                }
            };
            const stopDrag = () => {
                window.removeEventListener('mousemove', doDrag, false);
                window.removeEventListener('mouseup', stopDrag, false);
            };
            
            window.addEventListener('mousemove', doDrag, false);
            window.addEventListener('mouseup', stopDrag, false);
        }
        
        // Touch support for resizer
        function initResizeTouch(e) {
            e.preventDefault();
            const touch = e.touches[0];
            const startX = touch.clientX;
            const startWidth = passagePanel.offsetWidth;
            
            const doDragTouch = (e) => {
                const touch = e.touches[0];
                const newWidth = startWidth + touch.clientX - startX;
                if (newWidth > 200 && (document.body.clientWidth - newWidth - resizer.offsetWidth) > 200) {
                    passagePanel.style.flex = `0 0 ${newWidth}px`;
                }
            };
            const stopDragTouch = () => {
                window.removeEventListener('touchmove', doDragTouch, false);
                window.removeEventListener('touchend', stopDragTouch, false);
            };
            
            window.addEventListener('touchmove', doDragTouch, false);
            window.addEventListener('touchend', stopDragTouch, false);
        }
        
        // --- CONTEXT MENU (Highlighting) ---
        
        function initializeContextMenu() {
            const panels = [passagePanel, questionsPanel].filter(panel => panel !== null && panel !== undefined);
            let targetElementForClear = null;

            // Only initialize if we have valid panels
            if (panels.length === 0) {
                return;
            }

            // This listener simply tracks the last valid text selection in either panel.
            document.addEventListener('selectionchange', () => {
                const selection = window.getSelection();
                if (selection && !selection.isCollapsed && selection.toString().trim().length > 0) {
                    const range = selection.getRangeAt(0);
                    if (panels.some(panel => panel.contains(range.commonAncestorContainer))) {
                        selectedRange = range;
                        targetElementForClear = null; // New selection overrides clearing a specific element
                    }
                }
            });

            const showContextMenu = (e) => {
                const target = e.target;
                const isClickOnHighlight = target.closest('.highlight, .comment-highlight');
                const isSelectionActive = selectedRange && selectedRange.toString().trim().length > 0;
                
                let showMenu = false;

                if (isClickOnHighlight) {
                    document.getElementById('menu-highlight').style.display = 'none';
                    document.getElementById('menu-note').style.display = 'none';
                    document.getElementById('menu-clear').style.display = 'block';
                    document.getElementById('menu-clear-all').style.display = 'block';
                    contextMenu.targetElementForClear = isClickOnHighlight;
                    showMenu = true;
                } else if (isSelectionActive && panels.some(panel => panel.contains(selectedRange.commonAncestorContainer))) {
                    document.getElementById('menu-highlight').style.display = 'flex';
                    document.getElementById('menu-note').style.display = 'flex';
                    document.getElementById('menu-clear').style.display = 'none';
                    document.getElementById('menu-clear-all').style.display = 'block'; // Always show clear all
                    showMenu = true;
                } else {
                    // No highlight menu needed - check if we should block right-click entirely
                    if (window.distractionFreeMode && window.distractionFreeMode.isEnabled) {
                        const currentSkill = window.distractionFreeMode.getCurrentSkill();
                        if (currentSkill !== 'reading' && currentSkill !== 'listening') {
                            // Block context menu for non-reading/listening sections
                            e.preventDefault();
                            window.distractionFreeMode.showActionBlockedMessage('Right-click menu is disabled during the test');
                            return false;
                        }
                    }
                    // In reading/listening sections, allow default context menu if no highlights
                    return true;
                }

                if (showMenu) {
                    e.preventDefault();
                    contextMenu.style.display = 'block';
                    const menuHeight = contextMenu.offsetHeight;
                    const menuWidth = contextMenu.offsetWidth;
                    let left = e.pageX;
                    let top = e.pageY;
                    if (left + menuWidth > window.innerWidth) left = window.innerWidth - menuWidth - 5;
                    if (top + menuHeight > window.innerHeight) top = e.pageY - menuHeight - 5;
                    else top = e.pageY - menuHeight - 5;
                    
                    contextMenu.style.left = `${left}px`;
                    contextMenu.style.top = `${top}px`;
                }
            };

            panels.forEach(panel => {
                panel.addEventListener('contextmenu', showContextMenu);
            });

            document.addEventListener('click', (e) => {
                if (contextMenu.style.display === 'block' && !contextMenu.contains(e.target)) {
                    closeContextMenu();
                }
            });
        }

        function closeContextMenu() {
            contextMenu.style.display = 'none';
            selectedRange = null; // Clear range after menu closes
        }

        function unwrapElement(element) {
            const parent = element.parentNode;
            if (!parent) return;
            while (element.firstChild) {
                parent.insertBefore(element.firstChild, element);
            }
            parent.removeChild(element);
            parent.normalize();
        }

        window.highlightText = () => {
            if (selectedRange && !selectedRange.collapsed) {
                try {
                    // Check if selection spans multiple paragraphs
                    const startContainer = selectedRange.startContainer;
                    const endContainer = selectedRange.endContainer;
                    
                    // Find parent paragraph elements
                    const startParagraph = startContainer.nodeType === Node.TEXT_NODE 
                        ? startContainer.parentElement.closest('p') 
                        : startContainer.closest('p');
                    const endParagraph = endContainer.nodeType === Node.TEXT_NODE 
                        ? endContainer.parentElement.closest('p') 
                        : endContainer.closest('p');
                    
                    // If selection spans multiple paragraphs, restrict to first paragraph only
                    if (startParagraph && endParagraph && startParagraph !== endParagraph) {
                        
                        // Create a new range that ends at the end of the first paragraph
                        const restrictedRange = document.createRange();
                        restrictedRange.setStart(selectedRange.startContainer, selectedRange.startOffset);
                        
                        // Set end to the last text node in the start paragraph
                        const lastTextNode = getLastTextNode(startParagraph);
                        if (lastTextNode) {
                            restrictedRange.setEnd(lastTextNode, lastTextNode.length);
                        } else {
                            restrictedRange.setEndAfter(startParagraph.lastChild || startParagraph);
                        }
                        
                        // Use the restricted range
                        selectedRange = restrictedRange;
                    }
                    
                    const span = document.createElement('span');
                    span.className = 'highlight';

                    // Use surroundContents instead of extractContents + insertNode
                    // This preserves the text structure better across elements
                    if (selectedRange.commonAncestorContainer.nodeType === Node.TEXT_NODE ||
                        selectedRange.toString().indexOf('\n') === -1) {
                        selectedRange.surroundContents(span);
                    } else {
                        // Fallback for complex selections spanning multiple elements
                        const contents = selectedRange.extractContents();
                        span.appendChild(contents);
                        selectedRange.insertNode(span);
                    }
                } catch (e) {
                    // Fallback for selections that can't be surrounded
                    const span = document.createElement('span');
                    span.className = 'highlight';
                    const contents = selectedRange.extractContents();
                    span.appendChild(contents);
                    selectedRange.insertNode(span);
                }
            }
            closeContextMenu();
            window.getSelection().removeAllRanges();
        };
        
        // Helper function to get the last text node in an element
        function getLastTextNode(element) {
            let lastText = null;
            const walker = document.createTreeWalker(
                element,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: function(node) {
                        // Skip empty or whitespace-only text nodes
                        if (node.textContent.trim().length > 0) {
                            return NodeFilter.FILTER_ACCEPT;
                        }
                        return NodeFilter.FILTER_SKIP;
                    }
                }
            );
            
            while (walker.nextNode()) {
                lastText = walker.currentNode;
            }
            
            return lastText;
        }

        window.addNote = () => {
            const note = prompt('Enter your note:');
            if (note && selectedRange && !selectedRange.collapsed) {
                try {
                    const span = document.createElement('span');
                    span.className = 'comment-highlight';
                    const tooltip = document.createElement('span');
                    tooltip.className = 'comment-tooltip';
                    tooltip.textContent = note;

                    // Use surroundContents for better structure preservation
                    if (selectedRange.commonAncestorContainer.nodeType === Node.TEXT_NODE ||
                        selectedRange.toString().indexOf('\n') === -1) {
                        selectedRange.surroundContents(span);
                        span.appendChild(tooltip);
                    } else {
                        // Fallback for complex selections
                        const contents = selectedRange.extractContents();
                        span.appendChild(contents);
                        span.appendChild(tooltip);
                        selectedRange.insertNode(span);
                    }
                } catch (e) {
                    // Fallback for selections that can't be surrounded
                    const span = document.createElement('span');
                    span.className = 'comment-highlight';
                    const tooltip = document.createElement('span');
                    tooltip.className = 'comment-tooltip';
                    tooltip.textContent = note;
                    const contents = selectedRange.extractContents();
                    span.appendChild(contents);
                    span.appendChild(tooltip);
                    selectedRange.insertNode(span);
                }
            }
            closeContextMenu();
            window.getSelection().removeAllRanges();
        };

        window.clearHighlight = () => {
             const elementToClear = contextMenu.targetElementForClear;
             if (elementToClear) {
                 unwrapElement(elementToClear);
             }
             closeContextMenu();
             window.getSelection().removeAllRanges();
        };
        
        window.clearAllHighlights = () => {
            document.querySelectorAll('.highlight, .comment-highlight').forEach(unwrapElement);
            closeContextMenu();
            window.getSelection().removeAllRanges();
        };

        function updateAttemptedCount(part, startQ, endQ) {
            let answeredCount = 0;
            for (let i = startQ; i <= endQ; i++) {
                if (isQuestionAnswered(i)) {
                    answeredCount++;
                }
            }
            const partHeader = document.querySelector(`.footer__questionNo___3WNct[onclick="switchToPart(${part})"]`);
            if (partHeader) {
                const countSpan = partHeader.querySelector('.attemptedCount');
                if (countSpan) {
                     countSpan.textContent = `${answeredCount} of ${endQ - startQ + 1}`;
                }
            }
        }

        // --- GLOBAL FUNCTION EXPOSURE ---
        window.nextQuestion = nextQuestion;
        window.previousQuestion = previousQuestion;
        window.goToQuestion = goToQuestion;
        window.switchToPart = switchToPart;
        window.closeResultsModal = closeResultsModal;
        window.highlightText = highlightText;
        window.addNote = addNote;
        window.clearHighlight = clearHighlight;
        window.clearAllHighlights = clearAllHighlights;
        
        // Explanation toggle function for Part 2
        window.toggleExplanation = function() {
            const explanationSection = document.getElementById('part-2-explanation');
            const button = document.getElementById('show-explanation-btn');
            
            if (explanationSection.classList.contains('hidden')) {
                explanationSection.classList.remove('hidden');
                button.textContent = 'Hide Explanation';
                button.style.backgroundColor = '#dc3545';
            } else {
                explanationSection.classList.add('hidden');
                button.textContent = 'Show Explanation';
                button.style.backgroundColor = '#4a90e2';
            }
        };
        
        // Explanation toggle function for Part 3
        window.toggleExplanationPart3 = function() {
            const explanationSection = document.getElementById('part-3-explanation');
            const button = document.getElementById('show-explanation-btn-part3');
            
            if (explanationSection.classList.contains('hidden')) {
                explanationSection.classList.remove('hidden');
                button.textContent = 'Hide Explanation';
                button.style.backgroundColor = '#dc3545';
            } else {
                explanationSection.classList.add('hidden');
                button.textContent = 'Show Explanation';
                button.style.backgroundColor = '#4a90e2';
            }
        };

        // --- START THE APP ---
        initialize();

        // Add event listeners for table radio buttons
        document.addEventListener('DOMContentLoaded', function() {
            const tableRadios = document.querySelectorAll('.table-radio');
            tableRadios.forEach(radio => {
                radio.addEventListener('change', function() {
                    // Remove background color from all cells in the same row
                    const row = this.closest('tr');
                    const cells = row.querySelectorAll('td:not(.statement)');
                    cells.forEach(cell => {
                        cell.style.backgroundColor = '';
                    });
                    
                    // Add background color to the selected cell
                    if (this.checked) {
                        this.closest('td').style.backgroundColor = '#e3f2fd';
                    }
                    
                    updateAllIndicators();
                });
            });
            
            // Initialize mobile features
            initializeMobileFeatures();
        });
        
        // Mobile-specific improvements
        function initializeMobileFeatures() {
            // Add touch event listeners for mobile
            if ('ontouchstart' in window) {
                
                // Improve touch handling for question navigation
                document.querySelectorAll('.subQuestion').forEach(btn => {
                    btn.addEventListener('touchstart', function(e) {
                        e.preventDefault();
                        this.style.transform = 'scale(0.95)';
                    }, { passive: false });
                    
                    btn.addEventListener('touchend', function(e) {
                        e.preventDefault();
                        this.style.transform = 'scale(1)';
                    }, { passive: false });
                });
                
                // Improve touch handling for part navigation
                document.querySelectorAll('.footer__questionNo___3WNct').forEach(btn => {
                    btn.addEventListener('touchstart', function(e) {
                        e.preventDefault();
                        this.style.transform = 'scale(0.95)';
                    }, { passive: false });
                    
                    btn.addEventListener('touchend', function(e) {
                        e.preventDefault();
                        this.style.transform = 'scale(1)';
                    }, { passive: false });
                });
                
                // Improve touch handling for radio buttons
                document.querySelectorAll('.tf-option, .multi-choice-option').forEach(option => {
                    option.addEventListener('touchstart', function(e) {
                        e.preventDefault();
                        this.style.transform = 'scale(0.98)';
                    }, { passive: false });
                    
                    option.addEventListener('touchend', function(e) {
                        e.preventDefault();
                        this.style.transform = 'scale(1)';
                        // Trigger radio button selection
                        const radio = this.querySelector('input[type="radio"]');
                        if (radio) {
                            radio.checked = true;
                            radio.dispatchEvent(new Event('change'));
                        }
                    }, { passive: false });
                });
                
                // Improve touch handling for text inputs
                document.querySelectorAll('input[type="text"], select').forEach(input => {
                    input.addEventListener('touchstart', function(e) {
                        // Prevent zoom on iOS
                        this.style.fontSize = '16px';
                    });
                });
                
                // Improve touch handling for drag and drop on mobile
                document.querySelectorAll('.drag-item').forEach(item => {
                    item.addEventListener('touchstart', function(e) {
                        e.preventDefault();
                        this.style.transform = 'scale(1.1)';
                        this.style.zIndex = '1000';
                    }, { passive: false });
                    
                    item.addEventListener('touchend', function(e) {
                        e.preventDefault();
                        this.style.transform = 'scale(1)';
                        this.style.zIndex = 'auto';
                    }, { passive: false });
                });
                
                // Improve touch handling for drop zones
                document.querySelectorAll('.drop-zone, .summary-drop-zone').forEach(zone => {
                    zone.addEventListener('touchstart', function(e) {
                        e.preventDefault();
                        this.style.transform = 'scale(1.05)';
                        this.style.borderColor = '#4a90e2';
                    }, { passive: false });
                    
                    zone.addEventListener('touchend', function(e) {
                        e.preventDefault();
                        this.style.transform = 'scale(1)';
                        this.style.borderColor = '#ccc';
                    }, { passive: false });
                });
                
                // Improve touch handling for navigation arrows
                document.querySelectorAll('.nav-arrow').forEach(arrow => {
                    arrow.addEventListener('touchstart', function(e) {
                        e.preventDefault();
                        this.style.transform = 'scale(0.9)';
                    }, { passive: false });
                    
                    arrow.addEventListener('touchend', function(e) {
                        e.preventDefault();
                        this.style.transform = 'scale(1)';
                    }, { passive: false });
                });
                
                // Improve touch handling for check answers button
                const deliverButton = document.getElementById('deliver-button');
                if (deliverButton) {
                    deliverButton.addEventListener('touchstart', function(e) {
                        e.preventDefault();
                        this.style.transform = 'scale(0.95)';
                    }, { passive: false });
                    
                    deliverButton.addEventListener('touchend', function(e) {
                        e.preventDefault();
                        this.style.transform = 'scale(1)';
                    }, { passive: false });
                }
            }
            
            // Add mobile-specific scroll improvements
            if (window.innerWidth <= 768) {
                // Smooth scrolling for mobile
                document.documentElement.style.scrollBehavior = 'smooth';
                
                // Improve scroll performance on mobile
                document.addEventListener('scroll', function() {
                    // Throttle scroll events for better performance
                    if (!window.scrollTimeout) {
                        window.scrollTimeout = setTimeout(function() {
                            window.scrollTimeout = null;
                        }, 16); // ~60fps
                    }
                });
            }
        }

        // Global function for selecting cells
        window.selectCell = function(cell, questionNum, value) {
            
            // Remove selected class from all cells in the same row
            const row = cell.closest('tr');
            const cellsInRow = row.querySelectorAll('.clickable-cell');
            cellsInRow.forEach(c => {
                c.classList.remove('selected');
                c.removeAttribute('data-selected');
                c.removeAttribute('data-answer');
            });
            
            // Add selected class to clicked cell
            cell.classList.add('selected');
            cell.setAttribute('data-selected', 'true');
            cell.setAttribute('data-answer', value);
            
            updateAllIndicators();
        };



        // Note: switchToPart function is defined earlier in the code
        // This duplicate function has been removed to prevent conflicts
    });