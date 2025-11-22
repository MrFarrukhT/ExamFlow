// Test Session Management Integration
// This script should be included in all test pages (reading.html, listening.html, writing.html)

document.addEventListener('DOMContentLoaded', function () {
    initializeSession();
    setupSessionHandlers();
    setTimeout(restoreAnswersFromSession, 1000);
});

function initializeSession() {
    // Check if student is logged in
    const studentId = localStorage.getItem('studentId');
    const studentName = localStorage.getItem('studentName');

    if (!studentId || !studentName) {
        alert('Session expired. Please log in again.');
        window.location.href = '../../index.html';
        return;
    }

    // Update student info in header if element exists
    const testTakerInfo = document.querySelector('.test-taker-info');
    if (testTakerInfo) {
        testTakerInfo.innerHTML = `
            <div>Test taker ID</div>
            <div class="test-taker-id"><strong>${studentId}</strong></div>
        `;
    }

    // Get current module from URL or body dataset
    const currentModule = getCurrentModule();
    if (currentModule) {
        // Mark as in progress
        localStorage.setItem(`${currentModule}Status`, 'in-progress');
        if (!localStorage.getItem(`${currentModule}StartTime`)) {
            localStorage.setItem(`${currentModule}StartTime`, new Date().toISOString());
        }
    }
}

function getCurrentModule() {
    // Try to get from body dataset
    const skill = document.body.dataset.skill;
    if (skill) return skill;

    // Try to get from URL
    const path = window.location.pathname;
    if (path.includes('reading.html')) return 'reading';
    if (path.includes('listening.html')) return 'listening';
    if (path.includes('writing.html')) return 'writing';
    return null;
}

function setupSessionHandlers() {
    const currentModule = getCurrentModule();

    // Override the existing deliver button functionality
    const deliverButton = document.getElementById('deliver-button');
    if (deliverButton) {
        // For listening tests, the listening.js handles the submit button
        // For writing tests, the writing-handler.js handles it
        // Only override for reading tests or if no specific handler exists
        if (currentModule === 'reading') {
            // Remove existing event listeners by cloning the button
            const newDeliverButton = deliverButton.cloneNode(true);

            // Remove the onclick attribute to prevent double submission
            newDeliverButton.removeAttribute('onclick');

            deliverButton.parentNode.replaceChild(newDeliverButton, deliverButton);

            // Add our new event listener
            newDeliverButton.addEventListener('click', handleTestCompletion);
        }
    }

    // Prevent back navigation
    window.history.pushState(null, null, window.location.href);
    window.addEventListener('popstate', function (event) {
        window.history.pushState(null, null, window.location.href);
        alert('Please use the navigation buttons within the test.');
    });

    // Save answers periodically
    setInterval(saveAnswersToSession, 30000); // Every 30 seconds
}

async function handleTestCompletion() {
    const currentModule = getCurrentModule();
    if (!currentModule) return;

    // Special handling for writing test - use the writing handler
    if (currentModule === 'writing' && window.writingHandler) {
        window.writingHandler.submitWriting();
        return;
    }

    const examType = localStorage.getItem('examType');
    const dashboardPath = examType === 'Cambridge' ? '../../dashboard-cambridge.html' : '../../dashboard.html';

    if (confirm('Are you sure you want to submit this section? You will not be able to return to it.')) {
        try {
            // Save final answers
            saveAnswersToSession();

            // Mark as completed first (in case database fails)
            localStorage.setItem(`${currentModule}Status`, 'completed');
            localStorage.setItem(`${currentModule}EndTime`, new Date().toISOString());

            // Use appropriate answer manager based on exam type
            if (examType === 'Cambridge' && window.cambridgeAnswerManager) {
                await window.cambridgeAnswerManager.submitTestToDatabase();
            } else {
                // Get test data for submission (IELTS)
                const testData = await collectTestData(currentModule);

                // Save to database
                await saveTestToDatabase(testData);

                // Save to history if answer manager is available
                if (window.answerManager) {
                    window.answerManager.saveCurrentTestToHistory();
                }
            }

            // Show completion message
            alert(`${currentModule.charAt(0).toUpperCase() + currentModule.slice(1)} section completed successfully!`);

            // Return to appropriate dashboard
            window.location.href = dashboardPath;

        } catch (error) {
            console.error('Error submitting test:', error);
            // Still allow completion even if database save fails (already marked as completed above)
            alert(`${currentModule.charAt(0).toUpperCase() + currentModule.slice(1)} section completed successfully!\nNote: There was an issue saving to the database, but your answers are saved locally.`);
            window.location.href = dashboardPath;
        }
    }
}

async function collectTestData(currentModule) {
    const studentId = localStorage.getItem('studentId');
    const studentName = localStorage.getItem('studentName');
    const selectedMock = localStorage.getItem('selectedMock') || '1';
    const startTime = localStorage.getItem(`${currentModule}StartTime`);
    const endTime = new Date().toISOString();

    const answersString = localStorage.getItem(`${currentModule}Answers`);
    const answers = answersString ? JSON.parse(answersString) : {};

    // Calculate score if possible (for reading/listening tests)
    let score = null;
    let bandScore = null;

    if (currentModule === 'reading' && window.correctAnswers) {
        score = calculateScore(answers, window.correctAnswers);
        bandScore = calculateBandScore(score);
    }

    return {
        studentId,
        studentName,
        mockNumber: parseInt(selectedMock),
        skill: currentModule,
        answers,
        score,
        bandScore,
        startTime,
        endTime
    };
}

// Calculate score for reading/listening tests
function calculateScore(userAnswers, correctAnswers) {
    let score = 0;

    for (const [questionId, correctAnswer] of Object.entries(correctAnswers)) {
        const userAnswer = userAnswers[questionId] || userAnswers[`q${questionId}`];

        if (userAnswer && typeof userAnswer === 'string') {
            const normalizedUser = userAnswer.toLowerCase().trim();
            const normalizedCorrect = Array.isArray(correctAnswer)
                ? correctAnswer.map(ans => ans.toLowerCase().trim())
                : [correctAnswer.toLowerCase().trim()];

            if (normalizedCorrect.includes(normalizedUser)) {
                score++;
            }
        }
    }
    return score;
}

// Calculate band score based on raw score
function calculateBandScore(score) {
    if (!score) return null;

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

// Save test data to database
async function saveTestToDatabase(testData) {
    try {
        // Try local database server first (preferred method)
        console.log('🔄 Attempting to save to local database server...');
        const response = await fetch('http://localhost:3002/submissions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Test data saved to local database server:', result.id);
            return result;
        } else {
            throw new Error(`Local server responded with status: ${response.status}`);
        }
    } catch (error) {
        console.warn('⚠️ Local database server not available:', error.message);

        // Fallback 1: Try Vercel API if available
        try {
            console.log('🔄 Trying Vercel API as fallback...');
            const VERCEL_API = 'https://innovative-centre-admin.vercel.app/api'; // Update with actual URL when deployed
            const response = await fetch(`${VERCEL_API}/submissions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(testData)
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Test data saved to Vercel database');
                return result;
            }
        } catch (vercelError) {
            console.warn('⚠️ Vercel API also failed:', vercelError.message);
        }

        // Fallback 2: Enhanced local storage (database format)
        console.log('🔄 Using enhanced local storage as final fallback...');
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
        console.log('✅ Test data saved to enhanced local storage (database format)');

        // Also trigger a sync attempt in the background
        setTimeout(() => syncLocalDataToDatabase(), 5000);

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

// Background sync function
async function syncLocalDataToDatabase() {
    try {
        const localData = localStorage.getItem('test_submissions_database');
        if (!localData) return;

        const submissions = JSON.parse(localData);
        const unsynced = submissions.filter(sub => sub.saved_locally);

        if (unsynced.length === 0) return;

        console.log(`🔄 Attempting to sync ${unsynced.length} local submissions...`);

        // Try to sync each submission
        for (const submission of unsynced) {
            try {
                const response = await fetch('http://localhost:3002/submissions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        studentId: submission.student_id,
                        studentName: submission.student_name,
                        mockNumber: submission.mock_number,
                        skill: submission.skill,
                        answers: submission.answers,
                        score: submission.score,
                        bandScore: submission.band_score,
                        startTime: submission.start_time,
                        endTime: submission.end_time
                    })
                });

                if (response.ok) {
                    // Mark as synced
                    submission.saved_locally = false;
                    submission.synced_at = new Date().toISOString();
                    console.log(`✅ Synced submission ${submission.id}`);
                }
            } catch (syncError) {
                console.warn(`⚠️ Failed to sync submission ${submission.id}`);
            }
        }

        // Update localStorage
        localStorage.setItem('test_submissions_database', JSON.stringify(submissions));

    } catch (error) {
        console.warn('Background sync failed:', error);
    }
}

function saveAnswersToSession() {
    const currentModule = getCurrentModule();
    if (!currentModule) return;

    const answers = {};

    // Collect answers based on module type
    if (currentModule === 'reading') {
        // Collect reading answers
        const inputs = document.querySelectorAll('input[type="text"], input[type="hidden"], input[type="radio"]:checked, select, textarea');
        inputs.forEach(input => {
            const questionId = input.id || input.name;
            if (questionId && input.value && input.value.trim()) {
                if (input.type === 'radio') {
                    answers[input.name] = input.value;
                } else {
                    answers[questionId] = input.value.trim();
                }
            }
        });

        // Also collect checkbox answers
        const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
        checkboxes.forEach(checkbox => {
            if (checkbox.name) {
                if (!answers[checkbox.name]) answers[checkbox.name] = [];
                answers[checkbox.name].push(checkbox.value);
            }
        });

    } else if (currentModule === 'writing') {
        // Collect writing answers
        const textareas = document.querySelectorAll('textarea');
        textareas.forEach((textarea, index) => {
            if (textarea.value.trim()) {
                answers[`task_${index + 1}`] = textarea.value.trim();
            }
        });

    } else if (currentModule === 'listening') {
        // Collect listening answers - all input types with answer-input class
        const allInputs = document.querySelectorAll('.answer-input');
        allInputs.forEach(input => {
            const questionId = input.id || input.name;

            if (input.type === 'radio') {
                // Only collect checked radio buttons
                if (input.checked && input.value) {
                    answers[input.name] = input.value;
                }
            } else if (input.type === 'text' || input.tagName.toLowerCase() === 'select') {
                // Collect text inputs and select elements
                if (questionId && input.value && input.value.trim()) {
                    answers[questionId] = input.value.trim();
                }
            }
        });
    }

    // Save to localStorage
    localStorage.setItem(`${currentModule}Answers`, JSON.stringify(answers));
}

// Auto-save on page unload
window.addEventListener('beforeunload', function () {
    saveAnswersToSession();
});

// Restore answers when page loads
function restoreAnswersFromSession() {
    const currentModule = getCurrentModule();
    if (!currentModule) return;

    const savedAnswers = localStorage.getItem(`${currentModule}Answers`);
    if (!savedAnswers) return;

    try {
        const answers = JSON.parse(savedAnswers);

        // Restore answers based on module type
        Object.entries(answers).forEach(([key, value]) => {
            const element = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
            if (element) {
                if (element.type === 'radio') {
                    const radioButton = document.querySelector(`input[name="${key}"][value="${value}"]`);
                    if (radioButton) radioButton.checked = true;
                } else if (element.type === 'checkbox') {
                    if (Array.isArray(value)) {
                        value.forEach(val => {
                            const checkbox = document.querySelector(`input[name="${key}"][value="${val}"]`);
                            if (checkbox) checkbox.checked = true;
                        });
                    }
                } else {
                    element.value = value;
                }
            }
        });
    } catch (e) {
        console.error('Error restoring answers:', e);
    }
}
