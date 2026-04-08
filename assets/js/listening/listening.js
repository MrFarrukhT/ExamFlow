 // Header Icon Functionality
        let isFullscreen = false;
        let isMuted = false;
        let darkMode = localStorage.getItem('darkMode') || 'off';
        let currentTextSize = localStorage.getItem('textSize') || 'medium';

        // Modal functions
        function showWifiModal() {
            document.getElementById('wifi-modal').style.display = 'flex';
            updateWifiStatus();
        }

        function showBellModal() {
            document.getElementById('bell-modal').style.display = 'flex';
        }

        function showNotesModal() {
            document.getElementById('notes-modal').style.display = 'flex';
            loadNotes();
        }

        function closeModal(modalId) {
            document.getElementById(modalId).style.display = 'none';
        }

        // WiFi functionality
        function updateWifiStatus() {
            const indicator = document.getElementById('wifi-indicator');
            const statusText = document.getElementById('wifi-status-text');
            const networkName = document.getElementById('network-name');
            const signalStrength = document.getElementById('signal-strength');
            
            // Simulate WiFi status (in real app, this would check actual connection)
            const isConnected = navigator.onLine;
            
            if (isConnected) {
                indicator.classList.remove('disconnected');
                statusText.textContent = 'Connected';
                networkName.textContent = 'IELTS_Test_Network';
                signalStrength.textContent = 'Excellent';
            } else {
                indicator.classList.add('disconnected');
                statusText.textContent = 'Disconnected';
                networkName.textContent = 'No Network';
                signalStrength.textContent = 'No Signal';
            }
        }

        // Options functionality
        function toggleFullscreen() {
            if (!isFullscreen) {
                if (document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen();
                } else if (document.documentElement.webkitRequestFullscreen) {
                    document.documentElement.webkitRequestFullscreen();
                } else if (document.documentElement.msRequestFullscreen) {
                    document.documentElement.msRequestFullscreen();
                }
                document.getElementById('fullscreen-text').textContent = 'Exit Fullscreen';
                isFullscreen = true;
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                }
                document.getElementById('fullscreen-text').textContent = 'Enter Fullscreen';
                isFullscreen = false;
            }
        }

        function toggleMute() {
            const audioPlayer = document.getElementById('global-audio-player');
            if (audioPlayer) {
                if (isMuted) {
                    audioPlayer.muted = false;
                    document.getElementById('mute-text').textContent = 'Mute Audio';
                    isMuted = false;
                } else {
                    audioPlayer.muted = true;
                    document.getElementById('mute-text').textContent = 'Unmute Audio';
                    isMuted = true;
                }
            }
        }

        // Options functionality
        function goToSubmission() {
            // Close the modal first
            closeModal('options-modal');
            
            if (confirm('Are you sure you want to go to the dashboard? This will end your current session.')) {
                // Save current session data before redirecting
                const currentModule = 'listening'; // We know this is listening.js
                localStorage.setItem(`${currentModule}Status`, 'completed');
                localStorage.setItem(`${currentModule}EndTime`, new Date().toISOString());
                
                // Redirect to dashboard
                setTimeout(() => {
                    window.location.href = '../../student-dashboard.html';
                }, 500);
            }
        }

        function showDarkModeOptions() {
            document.getElementById('dark-mode-modal').style.display = 'flex';
        }

        function showTextSizeOptions() {
            document.getElementById('text-size-modal').style.display = 'flex';
        }

        function setDarkMode(mode) {
            darkMode = mode;
            localStorage.setItem('darkMode', mode);
            
            // Remove existing dark mode class
            document.body.classList.remove('dark-mode');
            
            if (mode === 'dark') {
                document.body.classList.add('dark-mode');
                const dmEl = document.getElementById('dark-mode-text'); if (dmEl) dmEl.textContent = 'Dark mode';
            } else if (mode === 'auto') {
                // Check system preference
                if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    document.body.classList.add('dark-mode');
                }
                const amEl = document.getElementById('dark-mode-text'); if (amEl) amEl.textContent = 'Auto (System)';
            } else {
                const lmEl = document.getElementById('dark-mode-text'); if (lmEl) lmEl.textContent = 'Light mode';
            }
            
            closeModal('dark-mode-modal');
            
            // Show feedback
            const notification = document.createElement('div');
            notification.textContent = `Dark mode: ${mode === 'off' ? 'Light' : mode === 'dark' ? 'Dark' : 'Auto'}`;
            notification.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                background: #333;
                color: white;
                padding: 10px 15px;
                border-radius: 4px;
                z-index: 3000;
                font-size: 14px;
            `;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 2000);
        }

        function setTextSize(size) {
            currentTextSize = size;
            localStorage.setItem('textSize', size);
            
            const sizes = {
                'small': '14px',
                'medium': '16px',
                'large': '18px'
            };
            
            document.body.style.fontSize = sizes[size];
            const tsEl1 = document.getElementById('text-size-text'); if (tsEl1) tsEl1.textContent = `Text size: ${size.charAt(0).toUpperCase() + size.slice(1)}`;
            
            closeModal('text-size-modal');
            
            // Show feedback
            const notification = document.createElement('div');
            notification.textContent = `Text size: ${size.charAt(0).toUpperCase() + size.slice(1)}`;
            notification.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                background: #333;
                color: white;
                padding: 10px 15px;
                border-radius: 4px;
                z-index: 3000;
                font-size: 14px;
            `;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 2000);
        }

        function showHelp() {
            alert('IELTS Listening Test Help:\n\n' +
                  '• Use the navigation arrows to move between questions\n' +
                  '• Click on question numbers at the bottom to jump to specific questions\n' +
                  '• Type your answers in the input boxes\n' +
                  '• Use drag and drop for matching questions\n' +
                  '• Click "Check Answers" when finished\n' +
                  '• You can highlight text and add notes during the test');
        }

        // Notes functionality
        function saveNotes() {
            const notesText = document.getElementById('notes-textarea').value;
            localStorage.setItem('ielts-notes', notesText);
            
            const notification = document.createElement('div');
            notification.textContent = 'Notes saved successfully!';
            notification.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                background: #28a745;
                color: white;
                padding: 10px 15px;
                border-radius: 4px;
                z-index: 3000;
                font-size: 14px;
            `;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 2000);
        }

        function loadNotes() {
            const savedNotes = localStorage.getItem('ielts-notes');
            if (savedNotes) {
                document.getElementById('notes-textarea').value = savedNotes;
            }
        }

        // Close modals when clicking outside
        document.addEventListener('click', function(event) {
            const modals = document.querySelectorAll('.header-modal');
            modals.forEach(modal => {
                if (event.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Close modals with Escape key
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                const modals = document.querySelectorAll('.header-modal');
                modals.forEach(modal => {
                    if (modal.style.display === 'flex') {
                        modal.style.display = 'none';
                    }
                });
            }
        });

        let currentPart = 1;
        let currentQuestion = 1;
        let selectedText = '';
        let selectedRange = null;
        let draggedElement = null;
        let testStarted = false;
        
        // Read timer from HTML display and convert to seconds
        function getInitialTimeInSeconds() {
            const timerDisplay = document.querySelector('.timer-display');
            if (timerDisplay) {
                const timeText = timerDisplay.textContent.trim();
                const [minutes, seconds] = timeText.split(':').map(num => parseInt(num, 10));
                return (minutes * 60) + seconds;
            }
            return 1920; // Default fallback to 32 minutes (32 * 60 = 1920)
        }
        
        let timeInSeconds = 1920; // 32 minutes for listening test - will be updated from HTML
        let isHovering = false;
        let timerInterval;
        let contextElement = null;

        function updateAnsweredIndicators() {
            for (let qNum = 1; qNum <= 40; qNum++) {
                const btn = document.querySelector(`.subQuestion[onclick="goToQuestion(${qNum})"]`);
                if (!btn) continue;

                // Do not change style if it's already marked correct or incorrect
                if (btn.classList.contains('correct') || btn.classList.contains('incorrect')) {
                    continue;
                }

                let isAnswered = false;
                const textInput = document.getElementById(`q${qNum}`);
                const radioInput = document.querySelector(`input[name="q${qNum}"]:checked`);
                const dropZone = document.querySelector(`.drop-zone[data-question-id="${qNum}"]`);
                const clickableCell = document.querySelector(`.clickable-cell[data-question="${qNum}"].selected`);

                if (textInput && textInput.value.trim() !== '') {
                    isAnswered = true;
                } else if (radioInput) {
                    isAnswered = true;
                } else if (dropZone && dropZone.querySelector('.drag-item')) {
                    isAnswered = true;
                } else if (clickableCell) {
                    isAnswered = true;
                } else if (qNum >= 21 && qNum <= 23) {
                    if (document.querySelector('input[name="q21-23"]:checked')) isAnswered = true;
                } else if (qNum >= 27 && qNum <= 28) {
                    if (document.querySelector('input[name="q27-28"]:checked')) isAnswered = true;
                } else if (qNum >= 29 && qNum <= 30) {
                    if (document.querySelector('input[name="q29-30"]:checked')) isAnswered = true;
                }

                if (isAnswered) {
                    btn.classList.add('answered');
                } else {
                    btn.classList.remove('answered');
                }
            }
        }

        const audioPlayer = document.getElementById('global-audio-player');
        const timerContainer = document.querySelector('.timer-container');
        const timerDisplay = document.querySelector('.timer-display');

        // Answers will be loaded from external answer files (e.g., listening-answers.js)
        // This allows the same listening.js to work with all 10 MOCKs
        const correctAnswers = window.testAnswers || {};
        
        // Question types will also be loaded from external files if needed
        // Each MOCK can define its own question types structure
        const questionTypes = window.testQuestionTypes || {};


        function setupCheckboxLimits() {
            const checkboxGroups = [
                { name: 'q21-23', limit: 3 },
                { name: 'q27-28', limit: 2 },
                { name: 'q29-30', limit: 2 },
            ];

            // Track selection order per group to allow robust limiting
            const selectionQueues = {};

            checkboxGroups.forEach(group => {
                selectionQueues[group.name] = [];
                const checkboxes = Array.from(document.querySelectorAll(`input[name="${group.name}"]`));

                // Initialize queue with any pre-checked items (if any)
                checkboxes.forEach(cb => {
                    if (cb.checked) selectionQueues[group.name].push(cb);
                });

                checkboxes.forEach(checkbox => {
                    checkbox.addEventListener('change', (e) => {
                        const name = group.name;
                        const limit = group.limit;

                        // If checked, append to queue; if unchecked, remove from queue
                        if (checkbox.checked) {
                            // Avoid duplicates in queue
                            selectionQueues[name] = selectionQueues[name].filter(cb => cb !== checkbox);
                            selectionQueues[name].push(checkbox);
                        } else {
                            selectionQueues[name] = selectionQueues[name].filter(cb => cb !== checkbox);
                        }

                        // Enforce limit: keep the most recent 'limit' checked, uncheck older ones
                        if (selectionQueues[name].length > limit) {
                            const overflow = selectionQueues[name].length - limit;
                            const toUncheck = selectionQueues[name].splice(0, overflow);
                            toUncheck.forEach(cb => { cb.checked = false; });
                        }

                        updateAnsweredIndicators();
                        updateAttemptedCount(3); // Part 3 affected for q21-23
                    });
                });
            });
        }

        function selectCell(cell, questionNumber, value) {
            // Remove previous selection for this question
            const table = cell.closest('table');
            const row = cell.closest('tr');
            const cells = row.querySelectorAll('.clickable-cell');
            cells.forEach(c => c.classList.remove('selected'));
            
            // Select the clicked cell
            cell.classList.add('selected');
            
            // Update answered indicators
            updateAnsweredIndicators();
        }

        function switchToPart(partNumber, andPlay = false) {
            if (currentPart !== partNumber) {
                const firstQuestionOfPart = (partNumber - 1) * 10 + 1;
                currentQuestion = firstQuestionOfPart;
            }
            
            currentPart = partNumber;

            updateNavigation();
            document.querySelectorAll('.question-part').forEach(part => part.classList.add('hidden'));
            const partToShow = document.getElementById(`part-${partNumber}`);
            if (partToShow) {
                partToShow.classList.remove('hidden');
            }

            if (document.querySelector('.main-container.results-mode')) {
                const transcriptionSource = document.querySelector(`#transcription-data [data-part="${partNumber}"]`);
                const transcriptionTarget = document.getElementById('transcription-text');
                if (transcriptionSource && transcriptionTarget) {
                    transcriptionTarget.innerHTML = transcriptionSource.innerHTML;
                }
            }

            // Scroll to the top of the page when switching parts
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            // Also scroll the left-panel to top (in case it has its own scroll)
            const leftPanel = document.querySelector('.left-panel');
            if (leftPanel) {
                leftPanel.scrollTo({ top: 0, behavior: 'smooth' });
            }

            updateNavigation();
        }

        function updateNavigation() {
            document.querySelectorAll('.footer__questionWrapper___1tZ46').forEach((wrapper, index) => {
                wrapper.classList.remove('selected');
                updateAttemptedCount(index + 1);
            });
            const currentWrapper = document.querySelectorAll('.footer__questionWrapper___1tZ46')[currentPart - 1];
            if (currentWrapper) {
                currentWrapper.classList.add('selected');
            }
            document.getElementById('prevBtn').disabled = currentQuestion === 1;
            document.getElementById('nextBtn').disabled = currentQuestion === 40;
        }

        function goToQuestion(questionNumber) {
            currentQuestion = questionNumber;
            let partNumber = 1;
            if (questionNumber > 10 && questionNumber <= 20) partNumber = 2;
            else if (questionNumber > 20 && questionNumber <= 30) partNumber = 3;
            else if (questionNumber > 30) partNumber = 4;
            if (currentPart !== partNumber) {
                switchToPart(partNumber);
            }
            document.querySelectorAll('.subQuestion').forEach(btn => btn.classList.remove('active'));
            const questionBtn = document.querySelector(`.subQuestion[onclick="goToQuestion(${questionNumber})"]`);
            if (questionBtn) questionBtn.classList.add('active');

            // Scroll to the question
            let questionElement;
            if (questionNumber >= 27 && questionNumber <= 28) {
               questionElement = document.querySelector('input[name="q27-28"]');
            } else if (questionNumber >= 29 && questionNumber <= 30) {
               questionElement = document.querySelector('input[name="q29-30"]');
            } else {
                questionElement = document.getElementById(`q${questionNumber}`) || // text inputs
                                document.querySelector(`[data-question-id="${questionNumber}"]`) || // drag-drop
                                document.querySelector(`input[name="q${questionNumber}"]`); // radio buttons
            }
            
            if (questionElement) {
                const questionContainer = questionElement.closest('.question');
                if(questionContainer) {
                    questionContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    questionContainer.classList.add('flash');
                    setTimeout(() => {
                        questionContainer.classList.remove('flash');
                    }, 1000);
                }
            }
            updateNavigation();
        }

        function nextPart() {
            if (currentQuestion < 40) {
                goToQuestion(currentQuestion + 1);
            }
        }

        function previousPart() {
            if (currentQuestion > 1) {
                goToQuestion(currentQuestion - 1);
            }
        }

        // Make navigation functions globally accessible immediately
        window.goToQuestion = goToQuestion;
        window.switchToPart = switchToPart;
        window.nextPart = nextPart;
        window.previousPart = previousPart;
        
        function highlightText() {
            if (!selectedRange || selectedRange.collapsed) {
                closeContextMenu();
                return;
            }
            
            try {
                // Check if selection spans multiple elements
                const startContainer = selectedRange.startContainer;
                const endContainer = selectedRange.endContainer;
                
                if (startContainer === endContainer && startContainer.nodeType === Node.TEXT_NODE) {
                    // Simple case: selection within a single text node
                    const span = document.createElement('span');
                    span.className = 'highlight';
                    selectedRange.surroundContents(span);
                } else {
                    // Complex case: selection spans multiple elements
                    // Handle partial text selections and complex DOM structures
                    
                    // First, handle partial text at the start
                    const startOffset = selectedRange.startOffset;
                    const endOffset = selectedRange.endOffset;
                    
                    if (startContainer.nodeType === Node.TEXT_NODE && startOffset > 0) {
                        // Split the start text node if selection starts in the middle
                        const startText = startContainer.textContent;
                        const beforeText = startText.substring(0, startOffset);
                        const selectedStartText = startText.substring(startOffset);
                        
                        const beforeNode = document.createTextNode(beforeText);
                        const selectedNode = document.createTextNode(selectedStartText);
                        
                        const parent = startContainer.parentNode;
                        parent.insertBefore(beforeNode, startContainer);
                        parent.insertBefore(selectedNode, startContainer);
                        parent.removeChild(startContainer);
                        
                        // Update the range to start from the new node
                        selectedRange.setStart(selectedNode, 0);
                    }
                    
                    if (endContainer.nodeType === Node.TEXT_NODE && endOffset < endContainer.textContent.length) {
                        // Split the end text node if selection ends in the middle
                        const endText = endContainer.textContent;
                        const selectedEndText = endText.substring(0, endOffset);
                        const afterText = endText.substring(endOffset);
                        
                        const selectedNode = document.createTextNode(selectedEndText);
                        const afterNode = document.createTextNode(afterText);
                        
                        const parent = endContainer.parentNode;
                        parent.insertBefore(selectedNode, endContainer);
                        parent.insertBefore(afterNode, endContainer);
                        parent.removeChild(endContainer);
                        
                        // Update the range to end at the new node
                        selectedRange.setEnd(selectedNode, selectedNode.textContent.length);
                    }
                    
                    // Now extract the contents and highlight all text nodes
                    const fragment = selectedRange.extractContents();
                    
                    // Create a tree walker to find all text nodes
                    const walker = document.createTreeWalker(
                        fragment,
                        NodeFilter.SHOW_TEXT,
                        {
                            acceptNode: function(node) {
                                // Accept text nodes that have content (not just whitespace)
                                return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
                            }
                        },
                        false
                    );
                    
                    const textNodes = [];
                    let node;
                    while (node = walker.nextNode()) {
                        textNodes.push(node);
                    }
                    
                    // Wrap each text node in a highlight span
                    textNodes.forEach(textNode => {
                        const span = document.createElement('span');
                        span.className = 'highlight';
                        const parent = textNode.parentNode;
                        if (parent) {
                            parent.insertBefore(span, textNode);
                            span.appendChild(textNode);
                        }
                    });
                    
                    // Insert the highlighted fragment back
                    selectedRange.insertNode(fragment);
                }
            } catch(err) {
                // Robust fallback for complex selections
                try {
                    const selection = window.getSelection();
                    if (selection.rangeCount > 0) {
                        const range = selection.getRangeAt(0);
                        
                        // Get all nodes in the selection
                        const startContainer = range.startContainer;
                        const endContainer = range.endContainer;
                        const commonAncestor = range.commonAncestorContainer;
                        
                        // Create a temporary range to work with
                        const tempRange = document.createRange();
                        tempRange.selectNodeContents(commonAncestor);
                        
                        // Find the start and end positions
                        const startPos = range.startOffset;
                        const endPos = range.endOffset;
                        
                        // Extract and highlight the content
                        const contents = range.extractContents();
                        
                        // Recursively highlight all text content
                        function highlightAllText(node) {
                            if (node.nodeType === Node.TEXT_NODE) {
                                if (node.textContent.trim()) {
                                    const span = document.createElement('span');
                                    span.className = 'highlight';
                                    span.style.backgroundColor = '#ffff00';
                                    const parent = node.parentNode;
                                    if (parent) {
                                        parent.insertBefore(span, node);
                                        span.appendChild(node);
                                    }
                                }
                            } else if (node.nodeType === Node.ELEMENT_NODE) {
                                Array.from(node.childNodes).forEach(child => {
                                    highlightAllText(child);
                                });
                            }
                        }
                        
                        highlightAllText(contents);
                        range.insertNode(contents);
                    }
                } catch(e2) {
                    // Final fallback - use execCommand
                    try {
                        document.execCommand('backColor', false, 'yellow');
                    } catch(e3) {
                        console.error('All highlighting methods failed:', e3);
                        // Show user feedback
                        alert('Highlighting failed for this selection. Please try selecting smaller portions of text.');
                    }
                }
            }
            
            window.getSelection().removeAllRanges();
            closeContextMenu();
        }

        function addComment() {
            const commentText = prompt('Enter your comment:');
            if (!commentText || !selectedRange || selectedRange.collapsed) {
                closeContextMenu();
                return;
            }
            try {
                const span = document.createElement('span');
                span.className = 'comment-highlight';
                const tooltip = document.createElement('span');
                tooltip.className = 'comment-tooltip';
                tooltip.textContent = commentText;
                span.appendChild(tooltip);
                selectedRange.surroundContents(span);
            }catch(err){
            }
            window.getSelection().removeAllRanges();
            closeContextMenu();
        }

        function clearHighlight() {
           const elementToClear = contextElement;
           if (!elementToClear) {
               closeContextMenu();
               return;
           }
           const parent = elementToClear.parentNode;
           
           while (elementToClear.firstChild) {
               if (!elementToClear.firstChild.classList?.contains('comment-tooltip')) {
                   parent.insertBefore(elementToClear.firstChild, elementToClear);
               } else {
                   elementToClear.removeChild(elementToClear.firstChild);
               }
           }
           parent.removeChild(elementToClear);
           parent.normalize();
           closeContextMenu();
        }

        function clearAllHighlights() {
            document.querySelectorAll('.highlight, .comment-highlight').forEach(element => {
                const parent = element.parentNode;
                const fragment = document.createDocumentFragment();

                while (element.firstChild) {
                    if (element.firstChild.nodeType === 1 && element.firstChild.classList.contains('comment-tooltip')) {
                        element.removeChild(element.firstChild);
                    } else {
                        fragment.appendChild(element.firstChild);
                    }
                }
                parent.replaceChild(fragment, element);
            });
            closeContextMenu();
        }
        
        function closeContextMenu() {
            document.getElementById('contextMenu').style.display = 'none';
            contextElement = null;
        }

        function updateAttemptedCount(partNumber) {
            const partContainer = document.getElementById(`part-${partNumber}`);
            if (!partContainer) return;
            const inputs = partContainer.querySelectorAll('input.answer-input:not([disabled]), input[type="radio"]:not([disabled]), input[type="checkbox"]:not([disabled]), select.answer-input:not([disabled])');
            let answeredCount = 0;
            const answeredGroups = {};
            inputs.forEach(input => {
                if (input.type === 'radio' || input.type === 'checkbox') {
                    if (input.checked && !answeredGroups[input.name]) {
                        answeredCount++;
                        answeredGroups[input.name] = true;
                    }
                } else if (input.tagName.toLowerCase() === 'select') {
                    if (input.value && input.value.trim() !== '') {
                        answeredCount++;
                    }
                } else {
                    if (input.value.trim() !== '') answeredCount++;
                }
            });
            const countDisplay = document.querySelector(`.footer__questionWrapper___1tZ46:nth-child(${partNumber}) .attemptedCount`);
            if (countDisplay) countDisplay.textContent = `${answeredCount} of 10`;
        }

        function checkAnswers() {
            // Save answers to session before checking
            if (typeof saveAnswersToSession === 'function') {
                saveAnswersToSession();
            }
            
            let score = 0;
            let resultsData = [];
            document.querySelectorAll('.correct, .incorrect, .correct-answer-text').forEach(el => el.classList.contains('correct-answer-text') ? el.remove() : el.classList.remove('correct', 'incorrect'));
            
            Object.keys(correctAnswers).forEach(key => {
                const correctAnswer = correctAnswers[key];
                let userAnswer = '';
                let isCorrect = false;
                const questionType = questionTypes[key];
                
                // Handle different question types
                if (key.includes('-')) {
                    // Multi-question keys like 'q11-12', 'q13-14'
                    const [startQ, endQ] = key.split('-').map(q => parseInt(q.replace('q', '')));
                    
                    switch(questionType) {
                        case 'checkbox':
                            const checkedBoxes = document.querySelectorAll(`input[name="${key}"]:checked`);
                            const userAnswers = Array.from(checkedBoxes).map(cb => cb.value).sort();
                            userAnswer = userAnswers.join(', ');
                            const correctAnswersSorted = Array.isArray(correctAnswer) ? correctAnswer.sort() : [correctAnswer];
                            
                            // Count how many correct answers the user selected
                            const correctUserAnswers = userAnswers.filter(ans => correctAnswersSorted.includes(ans));
                            
                            // Additive-only scoring: 1 point per correct selected; no penalty for incorrect
                            const questionScore = correctUserAnswers.length;
                            score += questionScore;
                            
                            // Mark group as fully correct only if all correct options are selected and no extra are selected
                            isCorrect = (correctUserAnswers.length === correctAnswersSorted.length && userAnswers.length === correctAnswersSorted.length);
                            
                            // Mark individual checkboxes
                            checkedBoxes.forEach(cb => {
                                const label = cb.closest('label');
                                if (label) {
                                    if (correctAnswersSorted.includes(cb.value)) {
                                        label.classList.add('correct');
                                    } else {
                                        label.classList.add('incorrect');
                                    }
                                }
                            });
                            
                            // Mark correct answers that weren't selected
                            correctAnswersSorted.forEach(correctVal => {
                                const correctCheckbox = document.querySelector(`input[name="${key}"][value="${correctVal}"]`);
                                if (correctCheckbox && !correctCheckbox.checked) {
                                    const correctLabel = correctCheckbox.closest('label');
                                    if (correctLabel) {
                                        correctLabel.classList.add('correct');
                                    }
                                }
                            });
                            break;
                    }
                    
                    // Mark buttons for the question range
                    for (let qNum = startQ; qNum <= endQ; qNum++) {
                        const btn = document.querySelector(`.subQuestion[onclick="goToQuestion(${qNum})"]`);
                        if (btn) {
                            btn.classList.remove('answered');
                            btn.classList.add(isCorrect ? 'correct' : 'incorrect');
                        }
                    }
                    
                    resultsData.push({
                        question: `${startQ}-${endQ}`,
                        userAnswer: userAnswer || 'No Answer',
                        correctAnswer: Array.isArray(correctAnswer) ? correctAnswer.join(', ') : String(correctAnswer),
                        isCorrect: isCorrect
                    });
                    
                    // For checkbox questions in multi-question keys, score was already added in switch statement
                    // Don't add additional score here - return early to skip the final score increment
                    return;
                } else {
                   const qNum = parseInt(key.replace('q', ''));
                   const btn = document.querySelector(`.subQuestion[onclick="goToQuestion(${qNum})"]`);
                   const element = document.getElementById(key) || document.querySelector(`input[name="${key}"]`);

                   let questionType;
                   if (element?.type === 'text') questionType = 'text';
                   else if (element?.type === 'radio') questionType = 'mcq';
                   else questionType = questionTypes[key]; // Use the questionTypes object for other types
                   
                   switch (questionType) {
                       case 'text':
                           userAnswer = element.value.trim();
                           const acceptedAnswers = Array.isArray(correctAnswer) ? correctAnswer : [String(correctAnswer)];
                           isCorrect = acceptedAnswers.some(ans => ans.toLowerCase() === userAnswer.toLowerCase());
                           element.classList.add(isCorrect ? 'correct' : 'incorrect');
                           if (!isCorrect) {
                               const correctAnswerSpan = document.createElement('span');
                               correctAnswerSpan.className = 'correct-answer-text';
                               correctAnswerSpan.textContent = `(Correct: ${acceptedAnswers.join(' / ')})`;
                               element.parentNode.insertBefore(correctAnswerSpan, element.nextSibling);
                           }
                           break;
                       case 'mcq':
                           const radioChecked = document.querySelector(`input[name="${key}"]:checked`);
                           userAnswer = radioChecked ? radioChecked.value : 'No Answer';
                           isCorrect = userAnswer === correctAnswer;
                           const labels = document.querySelectorAll(`input[name="${key}"]`);
                           labels.forEach(radio => {
                               const label = radio.closest('label');
                               if (radio.value === correctAnswer) {
                                   label.classList.add('correct');
                               } else if (radio.checked) {
                                   label.classList.add('incorrect');
                               }
                           });
                           break;
                       case 'clickable':
                           const selectedCell = document.querySelector(`.clickable-cell[data-question="${qNum}"].selected`);
                           userAnswer = selectedCell ? selectedCell.getAttribute('data-value') : 'No Answer';
                           isCorrect = userAnswer === correctAnswer;
                           
                           // Mark cells as correct/incorrect
                           const allCells = document.querySelectorAll(`.clickable-cell[data-question="${qNum}"]`);
                           allCells.forEach(cell => {
                               if (cell.getAttribute('data-value') === correctAnswer) {
                                   cell.classList.add('correct');
                               } else if (cell.classList.contains('selected')) {
                                   cell.classList.add('incorrect');
                               }
                           });
                           break;
                       case 'checkbox':
                           const checkedBoxes = document.querySelectorAll(`input[name="${key}"]:checked`);
                           const userAnswers = Array.from(checkedBoxes).map(cb => cb.value).sort();
                           userAnswer = userAnswers.join(', ');
                           const correctAnswersSorted = Array.isArray(correctAnswer) ? correctAnswer.sort() : [correctAnswer];
                           
                           // Count how many correct answers the user selected
                           const correctUserAnswers = userAnswers.filter(ans => correctAnswersSorted.includes(ans));
                           
                           // Additive-only scoring: 1 point per correct selected; no penalty for incorrect
                           const questionScore = correctUserAnswers.length;
                           score += questionScore;
                           
                           // Mark group as fully correct only if all correct options are selected and no extra are selected
                           isCorrect = (correctUserAnswers.length === correctAnswersSorted.length && userAnswers.length === correctAnswersSorted.length);
                           
                           // Mark individual checkboxes
                           checkedBoxes.forEach(cb => {
                               const label = cb.closest('label');
                               if (label) {
                                   if (correctAnswersSorted.includes(cb.value)) {
                                       label.classList.add('correct');
                                   } else {
                                       label.classList.add('incorrect');
                                   }
                               }
                           });
                           
                           // Mark correct answers that weren't selected
                           correctAnswersSorted.forEach(correctVal => {
                               const correctCheckbox = document.querySelector(`input[name="${key}"][value="${correctVal}"]`);
                               if (correctCheckbox && !correctCheckbox.checked) {
                                   const correctLabel = correctCheckbox.closest('label');
                                   if (correctLabel) {
                                       correctLabel.classList.add('correct');
                                   }
                               }
                           });
                           break;
                   }

                   if (btn) {
                       btn.classList.remove('answered');
                       btn.classList.add(isCorrect ? 'correct' : 'incorrect');
                   }

                   resultsData.push({
                       question: qNum,
                       userAnswer: userAnswer || 'No Answer',
                       correctAnswer: Array.isArray(correctAnswer) ? correctAnswer.join(' / ') : String(correctAnswer),
                       isCorrect: isCorrect
                   });
               }

               // For checkbox questions, score was already added in the switch statement
               // Only add score for non-checkbox questions
               if (questionType !== 'checkbox' && isCorrect) {
                   score++;
               }
            });

            const deliverButton = document.getElementById('deliver-button');
            const band = (function(raw){
                if(raw>=39) return 9;
                if(raw>=37) return 8.5;
                if(raw>=35) return 8;
                if(raw>=32) return 7.5;
                if(raw>=30) return 7;
                if(raw>=26) return 6.5;
                if(raw>=23) return 6;
                if(raw>=18) return 5.5;
                if(raw>=16) return 5;
                if(raw>=13) return 4.5;
                if(raw>=10) return 4;
                if(raw>=8)  return 3.5;
                if(raw>=6)  return 3;
                if(raw>=4)  return 2.5;
                if(raw>=2)  return 2;
                if(raw===1) return 1.5;
                return 0;
            })(score);

            // Disable all inputs after grading
            document.querySelectorAll('.answer-input, input[type="radio"], input[type="checkbox"], select.answer-input').forEach(input => {
                input.disabled = true;
            });
            document.querySelectorAll('.drag-item').forEach(item => {
                item.setAttribute('draggable', 'false');
                item.style.cursor = 'default';
            });
            document.querySelectorAll('.drop-zone').forEach(zone => {
                zone.classList.remove('drag-over'); // Ensure no lingering hover styles
            });

            // Results mode layout with transcription
            document.querySelector('.main-container').classList.add('results-mode');
            switchToPart(currentPart); // Show the transcription for the current part

            // Populate modal content (but do not force-open yet)
            const modal = document.getElementById('result-modal');
            const scoreSummary = document.getElementById('score-summary');
            const resultDetails = document.getElementById('result-details');
            
            scoreSummary.textContent = `You scored ${score} out of 40 (Band ${band}).`;
            
            const escapeHTML = (str) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

            let tableHTML = '<table><tr><th>Question</th><th>Your Answer</th><th>Correct Answer</th><th>Result</th></tr>';
            resultsData.sort((a,b) => parseInt(a.question, 10) - parseInt(b.question, 10)).forEach(res => {
                tableHTML += `
                    <tr>
                        <td>${escapeHTML(res.question)}</td>
                        <td>${escapeHTML(res.userAnswer)}</td>
                        <td>${escapeHTML(res.correctAnswer)}</td>
                        <td class="${res.isCorrect ? 'result-correct' : 'result-incorrect'}">
                            ${res.isCorrect ? '✔ Correct' : '✖ Incorrect'}
                        </td>
                    </tr>
                `;
            });
            tableHTML += '</table>';
            resultDetails.innerHTML = tableHTML;

            // Hide the deliver button and redirect after submission
            deliverButton.style.display = 'none';
            
            // Instead of showing results, redirect to module selection
            setTimeout(() => {
                window.location.href = `/test/${sessionCode}/modules`;
            }, 2000);
        }
        
        function startTimer() {
            // Prevent multiple timer instances by clearing any existing interval
            if (timerInterval) {
                clearInterval(timerInterval);
            }
            
            // Re-read the timer value from HTML in case it was updated
            timeInSeconds = getInitialTimeInSeconds();
            
            timerInterval = setInterval(() => {
                timeInSeconds--;
                const minutes = Math.floor(timeInSeconds / 60);
                const seconds = timeInSeconds % 60;
                
                // Get timer display element each time to ensure it exists
                const timerDisplayEl = document.querySelector('.timer-display');
                if (timerDisplayEl) {
                    timerDisplayEl.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
                }
                
                if (timeInSeconds <= 0) {
                    clearInterval(timerInterval);
                    if (timerDisplayEl) {
                        timerDisplayEl.textContent = "Time's up!";
                    }

                    // Stop audio if playing when time runs out
                    const audioPlayer = document.getElementById('global-audio-player');
                    if (audioPlayer) {
                        audioPlayer.pause();
                        // reset to start so it doesn't resume if they somehow restart (though unlikely without reload)
                        audioPlayer.currentTime = 0; 
                    }

                    // Timer ended - just display message, don't force submit
                    alert("Time's up! Please submit your test when ready.");
                }
            }, 1000);
        }

        function formatTime(seconds) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = Math.floor(seconds % 60);
            return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
        }

        // Event Listeners
        audioPlayer.addEventListener('ended', () => {
            if (currentPart < 4) {
                switchToPart(currentPart + 1, true);
            }
        });

        // Submit function for listening test
        window.submitListeningTest = async function() {

            try {
                // Stop audio if playing
                const audioPlayer = document.getElementById('global-audio-player');
                if (audioPlayer) {
                    audioPlayer.pause();
                }
                
                // Collect all answers
                const answers = {};
                
                // Get all form inputs (text, radio, select, etc.)
                for (let i = 1; i <= 40; i++) {
                    const textInput = document.getElementById(`q${i}`);
                    const radioButton = document.querySelector(`input[name="q${i}"]:checked`);
                    const selectInput = document.querySelector(`select[name="q${i}"]`);
                    const dropZone = document.querySelector(`.drop-zone[data-q-start="${i}"], .drop-zone[data-question="${i}"]`);
                    
                    if (textInput && textInput.tagName === 'SELECT') {
                        answers[`q${i}`] = textInput.value;
                    } else if (textInput && (textInput.tagName === 'INPUT' || textInput.tagName === 'TEXTAREA')) {
                        answers[`q${i}`] = textInput.value.trim();
                    } else if (selectInput) {
                        answers[`q${i}`] = selectInput.value;
                    } else if (radioButton) {
                        answers[`q${i}`] = radioButton.value;
                    } else if (dropZone) {
                        const droppedItem = dropZone.querySelector('.drag-item');
                        answers[`q${i}`] = droppedItem ? droppedItem.textContent.trim() : '';
                    }
                }
                
                // Calculate score using the correct answers
                let score = 0;
                const totalQuestions = 40;
                
                // Score each question using the same logic as checkAnswers function
                Object.keys(correctAnswers).forEach(key => {
                    const correctAnswer = correctAnswers[key];
                    let userAnswer = '';
                    let isCorrect = false;
                    
                    if (key.includes('-')) {
                        // Handle multi-question keys (not used in current test)
                        return;
                    }
                    
                    const qNum = parseInt(key.replace('q', ''));
                    userAnswer = answers[key] || '';
                    
                    // Check different answer types
                    if (Array.isArray(correctAnswer)) {
                        // Multiple correct answers
                        isCorrect = correctAnswer.some(answer => 
                            userAnswer.toLowerCase().trim() === answer.toLowerCase().trim()
                        );
                    } else if (correctAnswer) {
                        // Single correct answer
                        isCorrect = userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
                    }
                    
                    if (isCorrect) score += 1;
                });
                
                // Disable submit button to prevent double submission
                const submitButton = document.getElementById('deliver-button');
                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.innerHTML = '<span>Submitting...</span>';
                }
                
                // Calculate band score
                const bandScore = calculateBandScore(score);
                
                // Prepare test data for backend submission
                const testData = {
                    studentId: localStorage.getItem('studentId'),
                    studentName: localStorage.getItem('studentName'),
                    mockNumber: parseInt(localStorage.getItem('selectedMock') || '1'),
                    skill: 'listening',
                    answers: answers,
                    score: score,
                    bandScore: bandScore,
                    startTime: localStorage.getItem('listeningStartTime'),
                    endTime: new Date().toISOString()
                };
                
                // Save to localStorage as backup
                localStorage.setItem('listeningScore', score.toString());
                localStorage.setItem('listeningAnswers', JSON.stringify(answers));
                localStorage.setItem('listeningStatus', 'completed');
                localStorage.setItem('listeningEndTime', testData.endTime);
                
                // Determine correct dashboard path
                const examType = localStorage.getItem('examType');
                const dashboardPath = examType === 'Cambridge' ? '../../Cambridge/dashboard-cambridge.html' : '../../student-dashboard.html';

                // Try to submit to backend (admin dashboard)
                try {
                    await saveListeningToDatabase(testData);
                } catch (dbError) {
                    // Answers already saved locally above — proceed to dashboard
                    console.error('Database save failed, continuing with local backup:', dbError);
                }

                // Redirect to dashboard
                window.location.href = dashboardPath;
                
            } catch (error) {
                console.error('Listening submit error:', error);
                // Re-enable button on error so student can retry
                const submitButton = document.getElementById('deliver-button');
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.innerHTML = '<i class="fa fa-paper-plane" aria-hidden="true"></i><span>Submit Test</span>';
                }
            }
        };
        
        // Calculate band score for listening test
        function calculateBandScore(score) {
            if (!score) return '0.0';

            const bandMapping = {
                40: '9.0', 39: '9.0', 38: '8.5', 37: '8.5', 36: '8.0', 35: '8.0', 34: '7.5',
                33: '7.5', 32: '7.0', 31: '7.0', 30: '7.0', 29: '6.5', 28: '6.5', 27: '6.5',
                26: '6.0', 25: '6.0', 24: '6.0', 23: '5.5', 22: '5.5', 21: '5.5', 20: '5.5',
                19: '5.0', 18: '5.0', 17: '5.0', 16: '5.0', 15: '5.0', 14: '4.5', 13: '4.5',
                12: '4.0', 11: '4.0', 10: '4.0', 9: '3.5', 8: '3.5', 7: '3.0', 6: '3.0',
                5: '2.5', 4: '2.5'
            };

            if (score <= 0) return '0.0';
            if (score === 1) return '1.0';
            if (score <= 3) return '2.0';

            return bandMapping[score] || '0.0';
        }
        
        // Save listening test to database with fallbacks
        async function saveListeningToDatabase(testData) {
            try {
                // Try local database server first (preferred method)
                const response = await fetch('/submissions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(testData)
                });

                if (response.ok) {
                    const result = await response.json();
                    return result;
                } else {
                    throw new Error(`Local server responded with status: ${response.status}`);
                }

            } catch (error) {
                // Fallback 1: Try Vercel API if available
                try {
                    const VERCEL_API = 'https://innovative-centre-admin.vercel.app/api';

                    const response = await fetch(`${VERCEL_API}/submissions`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(testData)
                    });

                    if (response.ok) {
                        const result = await response.json();
                        return result;
                    }
                } catch (vercelError) {
                }

                // Fallback 2: Enhanced local storage (database format)
                return await saveToEnhancedLocalStorage(testData);
            }
        }
        
        // Enhanced local storage that mimics database structure
        async function saveToEnhancedLocalStorage(testData) {
            try {
                // Get existing submissions
                const existingData = localStorage.getItem('test_submissions_database') || '[]';
                const submissions = JSON.parse(existingData);

                // Add new submission with database-like structure
                const newSubmission = {
                    id: Date.now(),
                    student_id: testData.studentId,
                    student_name: testData.studentName,
                    mock_number: testData.mockNumber,
                    skill: testData.skill,
                    answers: testData.answers,
                    score: testData.score,
                    band_score: testData.bandScore,
                    start_time: testData.startTime,
                    end_time: testData.endTime,
                    created_at: new Date().toISOString(),
                    saved_locally: true
                };

                submissions.push(newSubmission);

                // Save back to localStorage
                localStorage.setItem('test_submissions_database', JSON.stringify(submissions));

                return {
                    success: true,
                    message: 'Saved to local storage (will sync when database is available)',
                    id: newSubmission.id
                };

            } catch (error) {
                console.error('❌ Enhanced local storage failed:', error);
                throw error;
            }
        }

        document.getElementById('deliver-button').addEventListener('click', function() {
            // Pause audio while confirming to ensure silence
            const audioPlayer = document.getElementById('global-audio-player');
            let wasPlaying = false;
            if (audioPlayer && !audioPlayer.paused) {
                audioPlayer.pause();
                wasPlaying = true;
            }

            function resumeAudio() {
                if (wasPlaying && audioPlayer) {
                    audioPlayer.play().catch(function () {});
                }
            }

            // Use review modal if available, otherwise fall back to confirm
            if (window.examProgress) {
                window.examProgress.showReviewModal(
                    function () { window.submitListeningTest(); },
                    resumeAudio
                );
            } else if (confirm('Are you sure you want to submit your listening test? This action cannot be undone.')) {
                window.submitListeningTest();
            } else {
                resumeAudio();
            }
        });
        
        // Go To Question Widget Logic
        const gotoWidget = document.getElementById('goto-widget');
        const gotoInput = document.getElementById('goto-input');
        const gotoBtn = document.getElementById('goto-btn');

        document.addEventListener('keydown', (e) => {
            if (e.key >= '0' && e.key <= '9' && document.activeElement.tagName !== 'INPUT') {
                e.preventDefault();
                gotoWidget.classList.remove('hidden');
                gotoInput.focus();
                gotoInput.value = e.key;
            }
            if (e.key === 'Enter' && document.activeElement === gotoInput) {
                gotoBtn.click();
            }
            if (e.key === 'Escape') {
                gotoWidget.classList.add('hidden');
                gotoInput.value = '';
            }
        });

        if (gotoBtn) {
            gotoBtn.addEventListener('click', () => {
                const qNum = parseInt(gotoInput.value, 10);
                if (qNum >= 1 && qNum <= 40) {
                    goToQuestion(qNum);
                    gotoWidget.classList.add('hidden');
                    gotoInput.value = '';
                } else {
                    alert('Please enter a number between 1 and 40.');
                }
            });
        }

        // Add listener for the modal close button
        document.getElementById('modal-close-button').addEventListener('click', () => {
            document.getElementById('result-modal').style.display = 'none';
        });

        // === Tap-to-select & tap-to-drop for drag items (mobile support) ===
        document.body.addEventListener('click', function(e){
            const item = e.target.closest('.drag-item');
            if(item && item.getAttribute('draggable')){
                // Toggle selection
                document.querySelectorAll('.drag-item.selected').forEach(i=>i.classList.remove('selected'));
                item.classList.add('selected');
                draggedElement = item;
                return;
            }
            const dz = e.target.closest('.drop-zone');
            if(dz && draggedElement){
                // If already filled, move old back
                const optionsList = document.querySelector('.matching-options-list');
                if(dz.children.length>0 && dz.firstElementChild!==draggedElement){
                    optionsList.appendChild(dz.firstElementChild);
                }
                dz.appendChild(draggedElement);
                draggedElement.classList.remove('selected');
                draggedElement=null;
                updateAnsweredIndicators();
            }
        });

        // === Mobile highlight/comment toolbar ===
        const mobileToolbar = document.getElementById('mobile-selection-menu');
        function positionToolbar(){
            const sel = window.getSelection();
            if(sel.rangeCount===0 || sel.isCollapsed){
                mobileToolbar.classList.add('hidden');
                return;
            }
            const range = sel.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            mobileToolbar.style.top = window.scrollY + rect.top - mobileToolbar.offsetHeight - 8 + 'px';
            mobileToolbar.style.left = window.scrollX + rect.left + 'px';
            mobileToolbar.classList.remove('hidden');
        }
        document.addEventListener('selectionchange', () => {
            const sel = window.getSelection();
            if(sel && sel.rangeCount>0 && !sel.isCollapsed){
                selectedRange = sel.getRangeAt(0);
                selectedText = sel.toString();
            }
            if('ontouchstart' in window || navigator.maxTouchPoints>0){
                setTimeout(positionToolbar, 0);
            }
        });
        document.addEventListener('click', (e)=>{
            if(!e.target.closest('#mobile-selection-menu')){
                mobileToolbar.classList.add('hidden');
            }
        });

        /* ---------------- Drag and Drop for Matching Questions ---------------- */

        (function initDragAndDrop() {
            const container = document.querySelector('.left-panel');
            if (!container) return;

            container.addEventListener('dragstart', (e) => {
                if (e.target.classList.contains('drag-item')) {
                    draggedElement = e.target;
                    setTimeout(() => {
                        e.target.classList.add('dragging');
                    }, 0);
                }
            });

            container.addEventListener('dragend', (e) => {
                if (draggedElement) {
                    draggedElement.classList.remove('dragging');
                    draggedElement = null;
                }
            });

            container.addEventListener('dragover', (e) => {
                e.preventDefault();
                const target = e.target;
                const dropZone = target.closest('.drop-zone');
                const optionsList = target.closest('.matching-options-list');

                if (dropZone || optionsList) {
                    const overElement = dropZone || optionsList;
                    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
                    overElement.classList.add('drag-over');
                }
            });

            container.addEventListener('dragleave', (e) => {
                const target = e.target;
                const dropZone = target.closest('.drop-zone');
                const optionsList = target.closest('.matching-options-list');
                if (dropZone || optionsList) {
                    const overElement = dropZone || optionsList;
                    overElement.classList.remove('drag-over');
                }
            });


            container.addEventListener('drop', (e) => {
                e.preventDefault();
                if (!draggedElement) return;

                const dropTarget = e.target.closest('.drop-zone, .matching-options-list');
                if (!dropTarget) {
                    draggedElement.classList.remove('dragging');
                    draggedElement = null;
                    return;
                }

                document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
                
                const existingItem = dropTarget.matches('.drop-zone') ? dropTarget.querySelector('.drag-item') : null;
                const originalParent = draggedElement.parentNode;

                // If there's an item in the target dropzone, swap them
                if (existingItem) {
                    originalParent.appendChild(existingItem);
                }
                
                dropTarget.appendChild(draggedElement);

                if(dropTarget.matches('.drop-zone')) {
                    const placeholder = dropTarget.querySelector('.placeholder');
                    if (placeholder) placeholder.style.display = 'none';
                }

                draggedElement.classList.remove('dragging');
                draggedElement = null;
                updateAnsweredIndicators();
            });
        })();

        // --- PREVENT BROWSER AUTOCOMPLETE ---
        
        function preventAutocomplete() {
            // Generate a unique session ID to make field names unique
            const sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
            
            // Select all answer input fields
            const answerInputs = document.querySelectorAll('.answer-input');
            
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

        // --- PAGE INITIALIZATION ---


        document.addEventListener('DOMContentLoaded', () => {
            // Initialize timer value from HTML
            timeInSeconds = getInitialTimeInSeconds();
            
            // Timer will be started when audio begins playing or in initializeSync

            // Scroll to top on page load
            window.scrollTo(0, 0);
            
            // Also scroll the left-panel to top
            const leftPanel = document.querySelector('.left-panel');
            if (leftPanel) {
                leftPanel.scrollTo(0, 0);
            }
            
            // Prevent browser autocomplete
            preventAutocomplete();
            
            switchToPart(1);
            goToQuestion(1);
            setupCheckboxLimits();
        });

        // Initial setup on DOM load
        document.addEventListener('DOMContentLoaded', updateAnsweredIndicators);

        document.querySelectorAll('.mcq-table td').forEach(cell => {
            cell.addEventListener('click', (e) => {
                if (e.target.tagName !== 'INPUT') {
                    const radio = cell.querySelector('input[type="radio"]');
                    if (radio && !radio.disabled) {
                        radio.checked = true;
                    }
                }
            });
        });

        document.querySelectorAll('.answer-input, input[type="radio"], input[type="checkbox"], select.answer-input').forEach(input => {
            input.addEventListener('input', updateAnsweredIndicators);
            input.addEventListener('change', updateAnsweredIndicators);
        });

        function initAllDragAndDrop() {
            const dragItems = document.querySelectorAll('.drag-item');
            const dropZones = document.querySelectorAll('.drop-zone');

            dragItems.forEach(item => {
                item.addEventListener('dragstart', handleDragStart);
                item.addEventListener('dragend', handleDragEnd);
            });

            dropZones.forEach(zone => {
                zone.addEventListener('dragover', handleDragOver);
                zone.addEventListener('dragleave', handleDragLeave);
                zone.addEventListener('drop', handleDrop);
            });

            function handleDragStart(e) {
                draggedElement = e.target;
                setTimeout(() => e.target.classList.add('dragging'), 0);
            }

            function handleDragEnd(e) {
                e.target.classList.remove('dragging');
            }

            function handleDragOver(e) {
                e.preventDefault();
                const zone = e.target.closest('.drop-zone');
                if (zone) zone.classList.add('drag-over');
            }

            function handleDragLeave(e) {
                const zone = e.target.closest('.drop-zone');
                if (zone) zone.classList.remove('drag-over');
            }

            function handleDrop(e) {
                e.preventDefault();
                const targetZone = e.target.closest('.drop-zone');
                if (!targetZone || !draggedElement) return;
                
                targetZone.classList.remove('drag-over');

                const sourceContainer = draggedElement.parentNode;
                const itemInTargetZone = targetZone.querySelector('.drag-item');
                
                // Prevent dropping on self or non-droppable area inside zone
                if (e.target.classList.contains('drag-item') && e.target !== draggedElement) {
                    return; // Or handle swap explicitly here if needed
                }
                
                if (itemInTargetZone && itemInTargetZone !== draggedElement) {
                    // If source is an options list, move the existing item back
                    const optionsList = findParentOptionsList(targetZone);
                    if (sourceContainer.classList.contains('matching-options-list') || sourceContainer.classList.contains('map-options-list')) {
                    optionsList.appendChild(itemInTargetZone);
                    } 
                    // If source is another drop zone (swapping)
                    else if (sourceContainer.classList.contains('drop-zone')) {
                        sourceContainer.appendChild(itemInTargetZone);
                    }
                }

                targetZone.appendChild(draggedElement);
                if (targetZone.querySelector('.placeholder')) {
                    targetZone.querySelector('.placeholder').style.display = 'none';
                }
                
                updateAnsweredIndicators();
            }

            function findParentOptionsList(element) {
                // Specific for map
                if (element.closest('#map-drag-container')) {
                    return document.getElementById('map-options-q11-15');
                }
                // Generic for matching
                const container = element.closest('.matching-container');
                if (container) {
                    return container.querySelector('.matching-options-list');
                }
                return null;
            }
        }

        let transcriptionHighlighted = false;
        function highlightAnswersInTranscription() {
            if (transcriptionHighlighted) return;

            const highlightedTranscripts = { 1: '', 2: '', 3: '', 4: '' };

            for (let i = 1; i <= 4; i++) {
                const partElement = document.querySelector(`#transcription-data [data-part="${i}"]`);
                if (partElement) highlightedTranscripts[i] = partElement.innerHTML;
            }

            for (const key in correctAnswers) {
                const answers = Array.isArray(correctAnswers[key]) ? correctAnswers[key] : [correctAnswers[key]];
                if (answers.every(answer => /^[A-G]$/.test(answer))) {
                    continue;
                }

                const qNum = parseInt(key.match(/\d+/)[0]);
                let partNumber = 1;
                if (qNum > 10 && qNum <= 20) partNumber = 2;
                else if (qNum > 20 && qNum <= 30) partNumber = 3;
                else if (qNum > 30) partNumber = 4;

                if (!highlightedTranscripts[partNumber]) continue;

                let answersToHighlight = correctAnswers[key];
                if (!Array.isArray(answersToHighlight)) {
                    answersToHighlight = [answersToHighlight];
                }

                for (const answer of answersToHighlight) {
                    if (/^[A-G]$/.test(answer)) continue;
                    
                    let searchTerm = answer.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    searchTerm = searchTerm.replace(/\\\(s\\\)/g, '(s)?');
                    
                    const regex = new RegExp(`\\b(${searchTerm})\\b`, 'gi');
                    
                    highlightedTranscripts[partNumber] = highlightedTranscripts[partNumber].replace(
                        regex,
                        '<span class="highlight">$1</span>'
                    );
                }
            }

            for (let i = 1; i <= 4; i++) {
                const partElement = document.querySelector(`#transcription-data [data-part="${i}"]`);
                if(partElement) partElement.innerHTML = highlightedTranscripts[i];
            }
            transcriptionHighlighted = true;
        }
        
        // Initialize saved settings
        document.addEventListener('DOMContentLoaded', function() {
            // Apply dark mode setting
            if (darkMode === 'dark') {
                document.body.classList.add('dark-mode');
                const dmEl = document.getElementById('dark-mode-text'); if (dmEl) dmEl.textContent = 'Dark mode';
            } else if (darkMode === 'auto') {
                if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    document.body.classList.add('dark-mode');
                }
                const amEl = document.getElementById('dark-mode-text'); if (amEl) amEl.textContent = 'Auto (System)';
            } else {
                const lmEl = document.getElementById('dark-mode-text'); if (lmEl) lmEl.textContent = 'Light mode';
            }

            // Apply text size setting
            const sizes = {
                'small': '14px',
                'medium': '16px',
                'large': '18px'
            };
            document.body.style.fontSize = sizes[currentTextSize];
            const tsEl2 = document.getElementById('text-size-text'); if (tsEl2) tsEl2.textContent = `Text size: ${currentTextSize.charAt(0).toUpperCase() + currentTextSize.slice(1)}`;

            // Listen for system theme changes
            if (window.matchMedia) {
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
                    if (darkMode === 'auto') {
                        if (e.matches) {
                            document.body.classList.add('dark-mode');
                        } else {
                            document.body.classList.remove('dark-mode');
                        }
                    }
                });
            }
        });

        // Timer control functions for synchronization
        function pauseTimer() {
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
        }
        
        // Enhanced pause function with audio control
        function pauseTimerAndAudio() {
            pauseTimer();
            if (audioPlayer && !audioPlayer.paused) {
                audioPlayer.pause();
            }
        }
        
        // Enhanced resume function with audio control
        function resumeTimerAndAudio() {
            // Only start timer if it's not already running
            if (!timerInterval) {
                startTimer();
            }
            if (audioPlayer && audioPlayer.paused) {
                audioPlayer.play().then(() => {
                }).catch(err => {
                    console.error('Error resuming audio:', err);
                });
            }
        }

        function updateTimer() {
            const minutes = Math.floor(timeInSeconds / 60);
            const seconds = timeInSeconds % 60;
            timerDisplay.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        }

        // Backend Synchronization System
        let sessionCode = '';
        let candidateId = null;
        let syncInterval = null;
        let lastSyncTime = 0;
        let baseTimeRemaining = 3600; // 60 minutes in seconds
        let timeExtensionApplied = 0;
        let isPausedByAdmin = false;
        let isIndividuallyPaused = false;
        let blurOverlay = null;

        // Extract session info from URL
        function initializeSync() {
            // Extract session code from URL like /test/ABC123/listening
            const urlParts = window.location.pathname.split('/');
            if (urlParts.length >= 3 && urlParts[1] === 'test') {
                sessionCode = urlParts[2];

                // Start the timer immediately when test begins
                startTimer();
                
                // Get candidate ID first
                getCandidateId().then(() => {
                    // Update current module to 'listening'
                    updateCurrentModule('listening');
                    
                    // Start polling for session status
                    startBackendSync();
                });
            } else {
            }
        }

        // Get current candidate ID for this session
        function getCandidateId() {
            return fetch(`/api/session/${sessionCode}/current-candidate`)
                .then(response => response.json())
                .then(data => {
                    candidateId = data.candidate_id;
                })
                .catch(error => {
                });
        }

        // Update current module to track which test candidate is taking
        function updateCurrentModule(module) {
            if (!sessionCode || !candidateId) {
                return;
            }
            
            fetch(`/api/session/${sessionCode}/candidate/${candidateId}/current-module`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    module: module
                })
            })
                .then(response => response.json())
                .then(data => {
                })
                .catch(error => {
                });
        }

        // Poll backend for session status every 3 seconds (more responsive)
        function startBackendSync() {
            if (syncInterval) clearInterval(syncInterval);
            syncInterval = setInterval(checkSessionStatus, 3000);
            checkSessionStatus(); // Check immediately
        }

        function checkSessionStatus() {
            if (!sessionCode) return;
            
            // Check session-level status
            fetch(`/api/session/${sessionCode}/status`)
                .then(response => response.json())
                .then(data => {
                    handleSessionStatus(data);
                })
                .catch(error => {
                });

            // Also check candidate-specific status if we have candidate ID
            if (candidateId) {
                fetch(`/api/session/${sessionCode}/candidate/${candidateId}/status`)
                    .then(response => response.json())
                    .then(data => {
                        handleCandidateStatus(data);
                    })
                    .catch(error => {
                    });
            }
        }

        function handleSessionStatus(status) {
            // Handle session pause/resume
            if (status.paused && !isPausedByAdmin) {
                pauseTimerAndAudio(); // Enhanced with audio control
                isPausedByAdmin = true;
                addPauseBlur(); // Add blur effect
                showAdminMessage('⏸️ Test paused by administrator');
            } else if (!status.paused && isPausedByAdmin) {
                resumeTimerAndAudio(); // Enhanced with audio control
                isPausedByAdmin = false;
                removePauseBlur(); // Remove blur effect
                hideAdminMessage();
            }

            // Handle time extensions/reductions
            if (status.time_extended !== timeExtensionApplied) {
                const timeChange = status.time_extended - timeExtensionApplied;
                const changeType = timeChange > 0 ? 'added' : 'reduced';
                const absMinutes = Math.abs(timeChange);

                timeInSeconds += timeChange * 60;
                timeExtensionApplied = status.time_extended;
                showAdminMessage(`⏰ ${absMinutes} minutes ${changeType} by administrator`);
                updateTimer();
                setTimeout(() => hideAdminMessage(), 5000);
                
                // Reset the session time extension to prevent reapplication
                resetSessionTimeExtension();
            }
        }

        function handleCandidateStatus(status) {
            // Handle individual pause/resume
            if (status.individual_paused && !isIndividuallyPaused) {
                pauseTimerAndAudio(); // Enhanced with audio control
                isIndividuallyPaused = true;
                addPauseBlur(); // Add blur effect
                showAdminMessage('⏸️ You have been individually paused by administrator');
            } else if (!status.individual_paused && isIndividuallyPaused) {
                resumeTimerAndAudio(); // Enhanced with audio control
                isIndividuallyPaused = false;
                removePauseBlur(); // Remove blur effect
                showAdminMessage('▶️ You have been individually resumed by administrator');
                setTimeout(() => hideAdminMessage(), 3000);
            }

            // Handle individual time extensions/reductions
            if (status.individual_time_extended !== 0) {
                const timeChange = status.individual_time_extended;
                const changeType = timeChange > 0 ? 'added' : 'reduced';
                const absMinutes = Math.abs(timeChange);
                
                timeInSeconds += timeChange * 60;
                showAdminMessage(`👤 ${absMinutes} minutes ${changeType} individually`);
                updateTimer();
                setTimeout(() => hideAdminMessage(), 5000);
                
                // Reset the individual time extension to prevent reapplication
                resetCandidateTimeExtension();
            }

            // Force submit functionality removed - candidates must submit manually
        }

        function showAdminMessage(message) {
            let msgDiv = document.getElementById('admin-message');
            if (!msgDiv) {
                msgDiv = document.createElement('div');
                msgDiv.id = 'admin-message';
                msgDiv.style.cssText = `
                    position: fixed; top: 10px; left: 50%; transform: translateX(-50%);
                    background: #007cba; color: white; padding: 15px 25px;
                    border-radius: 8px; font-size: 16px; font-weight: bold;
                    z-index: 10001; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                `;
                document.body.appendChild(msgDiv);
            }
            msgDiv.textContent = message;
            msgDiv.style.display = 'block';
        }

        function hideAdminMessage() {
            const msgDiv = document.getElementById('admin-message');
            if (msgDiv) {
                msgDiv.style.display = 'none';
            }
        }

        function addPauseBlur() {
            if (!blurOverlay) {
                blurOverlay = document.createElement('div');
                blurOverlay.id = 'pause-blur-overlay';
            }
            blurOverlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.3); z-index: 10000;
                backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
            `;
            document.body.appendChild(blurOverlay);
        }

        function removePauseBlur() {
            if (blurOverlay && blurOverlay.parentNode) {
                blurOverlay.parentNode.removeChild(blurOverlay);
            }
        }

        // Reset functions to prevent time extension loops
        function resetSessionTimeExtension() {
            if (!sessionCode) return;
            
            fetch(`/api/session/${sessionCode}/reset-time-extension`, {
                method: 'POST'
            })
                .then(response => response.json())
                .then(data => {
                })
                .catch(error => {
                });
        }

        function resetCandidateTimeExtension() {
            if (!sessionCode || !candidateId) return;
            
            fetch(`/api/session/${sessionCode}/candidate/${candidateId}/reset-time-extension`, {
                method: 'POST'
            })
                .then(response => response.json())
                .then(data => {
                })
                .catch(error => {
                });
        }

        // Initialize synchronization when page loads
        // Simple audio initialization with popup
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(() => {
                initializeSync();
                initializeAudio();
                preventAudioManipulation();
                showAudioPopup();
            }, 500);
        });

        // Show the initial audio popup
        function showAudioPopup() {
            const popup = document.getElementById('audio-popup');
            if (popup) {
                popup.classList.remove('hidden');
            }
        }
        
        // Prevent candidates from manipulating audio through browser shortcuts
        function preventAudioManipulation() {
            // Disable common media key shortcuts
            document.addEventListener('keydown', function(e) {
                // Prevent media keys and common audio shortcuts
                if (e.code === 'MediaPlayPause' || 
                    e.code === 'MediaStop' || 
                    e.code === 'MediaTrackNext' || 
                    e.code === 'MediaTrackPrevious' ||
                    (e.ctrlKey && e.key === 'm') || // Ctrl+M (mute)
                    e.key === 'AudioVolumeUp' || 
                    e.key === 'AudioVolumeDown' || 
                    e.key === 'AudioVolumeMute') {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            });
            
            // Disable right-click on audio element
            const audioPlayer = document.getElementById('global-audio-player');
            if (audioPlayer) {
                audioPlayer.addEventListener('contextmenu', function(e) {
                    e.preventDefault();
                    return false;
                });
            }
        }
        
        // Initialize audio (load multiple source paths to ensure one works)
        function initializeAudio() {
            const audioPlayer = document.getElementById('global-audio-player');
            
            if (!audioPlayer) {
                return;
            }
            
        }
        
        // Start listening test - simplified approach
        function startListeningTest() {
            const audioPlayer = document.getElementById('global-audio-player');
            const popup = document.getElementById('audio-popup');

            if (!audioPlayer) {
                console.error('❌ Audio player not found');
                alert('Error: Audio player not found');
                return;
            }
            
            // Hide the popup first
            if (popup) {
                popup.style.display = 'none';
                popup.classList.add('hidden');
            }
            
            // Scroll to top when test starts
            window.scrollTo(0, 0);
            
            // Also scroll the left-panel to top
            const leftPanel = document.querySelector('.left-panel');
            if (leftPanel) {
                leftPanel.scrollTo(0, 0);
            }
            
            // Reset and load the audio
            audioPlayer.currentTime = 0;
            audioPlayer.load();
            
            // Try to play the audio with error handling
            const playPromise = audioPlayer.play();
            
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    // Timer is already started in initializeSync, no need to start again
                    if (!timerInterval) {
                        startTimer(); // Start the timer only if not already running
                    }
                }).catch(error => {
                    console.error('❌ Error starting audio:', error);
                    
                    // Try to reload and play again
                    audioPlayer.load();
                    setTimeout(() => {
                        audioPlayer.play().catch(err => {
                            console.error('❌ Second attempt failed:', err);
                            alert('Unable to start audio. Please check your browser settings and try again.');
                        });
                    }, 1000);
                });
            }
            
            // Listen for audio events
            audioPlayer.addEventListener('ended', function() {
            });
            
            audioPlayer.addEventListener('error', function(e) {
                console.error('❌ Audio error:', e);
                alert('Audio file could not be loaded. Please contact support.');
            });
        }

        // Make function globally accessible
        window.startListeningTest = startListeningTest;
        window.goToQuestion = goToQuestion;
        window.switchToPart = switchToPart;
        window.nextPart = nextPart;
        window.previousPart = previousPart;