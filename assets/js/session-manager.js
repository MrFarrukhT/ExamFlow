// Test Session Management - Simplified// Test Session Management Integration

// Handles test sessions, answer saving, and submission// This script should be included in all test pages (reading.html, listening.html, writing.html)



document.addEventListener('DOMContentLoaded', function() {document.addEventListener('DOMContentLoaded', function() {

    initializeSession();    // Initialize session management

    setupSessionHandlers();    initializeSession();

    setTimeout(restoreAnswersFromSession, 1000);    setupSessionHandlers();

});});



function initializeSession() {function initializeSession() {

    // Validate login    // Check if student is logged in

    const studentId = localStorage.getItem('studentId');    const studentId = localStorage.getItem('studentId');

    const studentName = localStorage.getItem('studentName');    const studentName = localStorage.getItem('studentName');

        

    if (!studentId || !studentName) {    if (!studentId || !studentName) {

        alert('Session expired. Please log in again.');        alert('Session expired. Please log in again.');

        window.location.href = '../../index.html';        window.location.href = '../../index.html';

        return;        return;

    }    }

        

    // Update student info display    // Update student info in header if element exists

    const testTakerInfo = document.querySelector('.test-taker-info');    const testTakerInfo = document.querySelector('.test-taker-info');

    if (testTakerInfo) {    if (testTakerInfo) {

        testTakerInfo.innerHTML = `        testTakerInfo.innerHTML = `

            <div>Test taker ID</div>            <div>Test taker ID</div>

            <div class="test-taker-id"><strong>${studentId}</strong></div>            <div class="test-taker-id"><strong>${studentId}</strong></div>

        `;        `;

    }    }

        

    // Track module start    // Get current module from URL or body dataset

    const currentModule = getCurrentModule();    const currentModule = getCurrentModule();

    if (currentModule) {    if (currentModule) {

        localStorage.setItem(`${currentModule}Status`, 'in-progress');        // Mark as in progress

        if (!localStorage.getItem(`${currentModule}StartTime`)) {        localStorage.setItem(`${currentModule}Status`, 'in-progress');

            localStorage.setItem(`${currentModule}StartTime`, new Date().toISOString());        if (!localStorage.getItem(`${currentModule}StartTime`)) {

        }            localStorage.setItem(`${currentModule}StartTime`, new Date().toISOString());

    }        }

}    }

}

function getCurrentModule() {

    // Get from body dataset or URL pathfunction getCurrentModule() {

    const skill = document.body.dataset.skill;    // Try to get from body dataset

    if (skill) return skill;    const skill = document.body.dataset.skill;

        if (skill) return skill;

    const path = window.location.pathname;    

    if (path.includes('reading.html')) return 'reading';    // Try to get from URL

    if (path.includes('listening.html')) return 'listening';    const path = window.location.pathname;

    if (path.includes('writing.html')) return 'writing';    if (path.includes('reading.html')) return 'reading';

        if (path.includes('listening.html')) return 'listening';

    return null;    if (path.includes('writing.html')) return 'writing';

}    

    return null;

function setupSessionHandlers() {}

    const currentModule = getCurrentModule();

    function setupSessionHandlers() {

    // Override deliver button for reading tests    const currentModule = getCurrentModule();

    const deliverButton = document.getElementById('deliver-button');    

    if (deliverButton && currentModule === 'reading') {    // Override the existing deliver button functionality

        const newButton = deliverButton.cloneNode(true);    const deliverButton = document.getElementById('deliver-button');

        newButton.removeAttribute('onclick');    if (deliverButton) {

        deliverButton.parentNode.replaceChild(newButton, deliverButton);        // For listening tests, the listening.js handles the submit button

        newButton.addEventListener('click', handleTestCompletion);        // For writing tests, the writing-handler.js handles it

    }        // Only override for reading tests or if no specific handler exists

            if (currentModule === 'reading') {

    // Prevent back navigation            // Remove existing event listeners by cloning the button

    window.history.pushState(null, null, window.location.href);            const newDeliverButton = deliverButton.cloneNode(true);

    window.addEventListener('popstate', function() {            

        window.history.pushState(null, null, window.location.href);            // Remove the onclick attribute to prevent double submission

        alert('Please use the navigation buttons within the test.');            newDeliverButton.removeAttribute('onclick');

    });            

                deliverButton.parentNode.replaceChild(newDeliverButton, deliverButton);

    // Auto-save every 30 seconds            

    setInterval(saveAnswersToSession, 30000);            // Add our new event listener

}            newDeliverButton.addEventListener('click', handleTestCompletion);

        }

async function handleTestCompletion() {        // For listening and writing, their respective handlers will manage the button

    const currentModule = getCurrentModule();    }

    if (!currentModule) return;    

    // Prevent back navigation

    // Writing test uses separate handler    window.history.pushState(null, null, window.location.href);

    if (currentModule === 'writing' && window.writingHandler) {    window.addEventListener('popstate', function(event) {

        window.writingHandler.submitWriting();        window.history.pushState(null, null, window.location.href);

        return;        alert('Please use the navigation buttons within the test.');

    }    });

    

    const examType = localStorage.getItem('examType');    // Save answers periodically

    const dashboardPath = examType === 'Cambridge' ? '../../dashboard-cambridge.html' : '../../dashboard.html';    setInterval(saveAnswersToSession, 30000); // Every 30 seconds

}

    if (confirm('Are you sure you want to submit this section? You will not be able to return to it.')) {

        try {async function handleTestCompletion() {

            saveAnswersToSession();    const currentModule = getCurrentModule();

            localStorage.setItem(`${currentModule}Status`, 'completed');    if (!currentModule) return;

            localStorage.setItem(`${currentModule}EndTime`, new Date().toISOString());

    // Special handling for writing test - use the writing handler

            // Submit to appropriate system    if (currentModule === 'writing' && window.writingHandler) {

            if (examType === 'Cambridge' && window.cambridgeAnswerManager) {        // Call the writing handler's submission directly

                await window.cambridgeAnswerManager.submitTestToDatabase();        window.writingHandler.submitWriting();

            } else {        return;

                const testData = await collectTestData(currentModule);    }

                await saveTestToDatabase(testData);

                if (window.answerManager) {    const examType = localStorage.getItem('examType');

                    window.answerManager.saveCurrentTestToHistory();    const dashboardPath = examType === 'Cambridge' ? '../../dashboard-cambridge.html' : '../../dashboard.html';

                }

            }    if (confirm('Are you sure you want to submit this section? You will not be able to return to it.')) {

        try {

            alert(`${currentModule.charAt(0).toUpperCase() + currentModule.slice(1)} section completed successfully!`);            // Save final answers

            window.location.href = dashboardPath;            saveAnswersToSession();



        } catch (error) {            // Mark as completed first (in case database fails)

            console.error('Error submitting test:', error);            localStorage.setItem(`${currentModule}Status`, 'completed');

            alert(`${currentModule.charAt(0).toUpperCase() + currentModule.slice(1)} section completed successfully!\nNote: There was an issue saving to the database, but your answers are saved locally.`);            localStorage.setItem(`${currentModule}EndTime`, new Date().toISOString());

            window.location.href = dashboardPath;

        }            // Use appropriate answer manager based on exam type

    }            if (examType === 'Cambridge' && window.cambridgeAnswerManager) {

}                await window.cambridgeAnswerManager.submitTestToDatabase();

            } else {

async function collectTestData(currentModule) {                // Get test data for submission (IELTS)

    const studentId = localStorage.getItem('studentId');                const testData = await collectTestData(currentModule);

    const studentName = localStorage.getItem('studentName');                // Save to database

    const selectedMock = localStorage.getItem('selectedMock') || '1';                await saveTestToDatabase(testData);

    const startTime = localStorage.getItem(`${currentModule}StartTime`);                // Save to history if answer manager is available

    const endTime = new Date().toISOString();                if (window.answerManager) {

                    window.answerManager.saveCurrentTestToHistory();

    const answersString = localStorage.getItem(`${currentModule}Answers`);                }

    const answers = answersString ? JSON.parse(answersString) : {};            }



    let score = null;            // Show completion message

    let bandScore = null;            alert(`${currentModule.charAt(0).toUpperCase() + currentModule.slice(1)} section completed successfully!`);



    if (currentModule === 'reading' && window.correctAnswers) {            // Return to appropriate dashboard

        score = calculateScore(answers, window.correctAnswers);            window.location.href = dashboardPath;

        bandScore = calculateBandScore(score);

    }        } catch (error) {

            console.error('Error submitting test:', error);

    return {            // Still allow completion even if database save fails (already marked as completed above)

        studentId,            alert(`${currentModule.charAt(0).toUpperCase() + currentModule.slice(1)} section completed successfully!\nNote: There was an issue saving to the database, but your answers are saved locally.`);

        studentName,            window.location.href = dashboardPath;

        mockNumber: parseInt(selectedMock),        }

        skill: currentModule,    }

        answers,}

        score,

        bandScore,// Collect test data for database submission

        startTime,async function collectTestData(currentModule) {

        endTime    const studentId = localStorage.getItem('studentId');

    };    const studentName = localStorage.getItem('studentName');

}    const selectedMock = localStorage.getItem('selectedMock') || '1';

    const startTime = localStorage.getItem(`${currentModule}StartTime`);

function calculateScore(userAnswers, correctAnswers) {    const endTime = new Date().toISOString();

    let score = 0;

    // Get answers

    for (const [questionId, correctAnswer] of Object.entries(correctAnswers)) {    const answersString = localStorage.getItem(`${currentModule}Answers`);

        const userAnswer = userAnswers[questionId] || userAnswers[`q${questionId}`];    const answers = answersString ? JSON.parse(answersString) : {};



        if (userAnswer && typeof userAnswer === 'string') {    // Calculate score if possible (for reading/listening tests)

            const normalizedUser = userAnswer.toLowerCase().trim();    let score = null;

            const normalizedCorrect = Array.isArray(correctAnswer)    let bandScore = null;

                ? correctAnswer.map(ans => ans.toLowerCase().trim())

                : [correctAnswer.toLowerCase().trim()];    if (currentModule === 'reading' && window.correctAnswers) {

        score = calculateScore(answers, window.correctAnswers);

            if (normalizedCorrect.includes(normalizedUser)) {        bandScore = calculateBandScore(score);

                score++;    }

            }

        }    return {

    }        studentId,

        studentName,

    return score;        mockNumber: parseInt(selectedMock),

}        skill: currentModule,

        answers,

function calculateBandScore(score) {        score,

    if (!score) return null;        bandScore,

        startTime,

    const bandMapping = {        endTime

        40: '9.0', 39: '9.0', 38: '8.5', 37: '8.5', 36: '8.0', 35: '8.0', 34: '7.5',    };

        33: '7.5', 32: '7.0', 31: '7.0', 30: '7.0', 29: '6.5', 28: '6.5', 27: '6.5',}

        26: '6.0', 25: '6.0', 24: '6.0', 23: '5.5', 22: '5.5', 21: '5.5', 20: '5.5',

        19: '5.0', 18: '5.0', 17: '5.0', 16: '5.0', 15: '5.0', 14: '4.5', 13: '4.5',// Calculate score for reading/listening tests

        12: '4.0', 11: '4.0', 10: '4.0', 9: '3.5', 8: '3.5', 7: '3.0', 6: '3.0',function calculateScore(userAnswers, correctAnswers) {

        5: '2.5', 4: '2.5'    let score = 0;

    };

    for (const [questionId, correctAnswer] of Object.entries(correctAnswers)) {

    if (score <= 0) return '0.0';        const userAnswer = userAnswers[questionId] || userAnswers[`q${questionId}`];

    if (score === 1) return '1.0';

    if (score <= 3) return '2.0';        if (userAnswer && typeof userAnswer === 'string') {

            const normalizedUser = userAnswer.toLowerCase().trim();

    return bandMapping[score] || '0.0';            const normalizedCorrect = Array.isArray(correctAnswer)

}                ? correctAnswer.map(ans => ans.toLowerCase().trim())

                : [correctAnswer.toLowerCase().trim()];

async function saveTestToDatabase(testData) {

    try {            if (normalizedCorrect.includes(normalizedUser)) {

        const response = await fetch('http://localhost:3002/submissions', {                score++;

            method: 'POST',            }

            headers: { 'Content-Type': 'application/json' },        }

            body: JSON.stringify(testData)    }

        });

    return score;

        if (response.ok) {}

            const result = await response.json();

            console.log('✅ Test data saved to database:', result.id);// Calculate band score based on raw score

            return result;function calculateBandScore(score) {

        } else {    if (!score) return null;

            throw new Error(`Server responded with status: ${response.status}`);

        }    const bandMapping = {

        40: '9.0', 39: '9.0', 38: '8.5', 37: '8.5', 36: '8.0', 35: '8.0', 34: '7.5',

    } catch (error) {        33: '7.5', 32: '7.0', 31: '7.0', 30: '7.0', 29: '6.5', 28: '6.5', 27: '6.5',

        console.warn('⚠️ Database not available, saving locally:', error.message);        26: '6.0', 25: '6.0', 24: '6.0', 23: '5.5', 22: '5.5', 21: '5.5', 20: '5.5',

        return await saveToLocalStorage(testData);        19: '5.0', 18: '5.0', 17: '5.0', 16: '5.0', 15: '5.0', 14: '4.5', 13: '4.5',

    }        12: '4.0', 11: '4.0', 10: '4.0', 9: '3.5', 8: '3.5', 7: '3.0', 6: '3.0',

}        5: '2.5', 4: '2.5'

    };

async function saveToLocalStorage(testData) {

    try {    if (score <= 0) return '0.0';

        const existingData = localStorage.getItem('test_submissions_database') || '[]';    if (score === 1) return '1.0';

        const submissions = JSON.parse(existingData);    if (score <= 3) return '2.0';



        const newSubmission = {    return bandMapping[score] || '0.0';

            id: Date.now(),}

            student_id: testData.studentId,

            student_name: testData.studentName,// Save test data to database

            mock_number: testData.mockNumber,async function saveTestToDatabase(testData) {

            skill: testData.skill,    try {

            answers: testData.answers,        // Try local database server first (preferred method)

            score: testData.score,        console.log('🔄 Attempting to save to local database server...');

            band_score: testData.bandScore,

            start_time: testData.startTime,        const response = await fetch('http://localhost:3002/submissions', {

            end_time: testData.endTime,            method: 'POST',

            created_at: new Date().toISOString()            headers: {

        };                'Content-Type': 'application/json',

            },

        submissions.push(newSubmission);            body: JSON.stringify(testData)

        localStorage.setItem('test_submissions_database', JSON.stringify(submissions));        });



        console.log('✅ Test data saved to local storage');        if (response.ok) {

            const result = await response.json();

        return {            console.log('✅ Test data saved to local database server:', result.id);

            success: true,            return result;

            message: 'Saved to local storage',        } else {

            id: newSubmission.id            throw new Error(`Local server responded with status: ${response.status}`);

        };        }



    } catch (error) {    } catch (error) {

        console.error('❌ Local storage failed:', error);        console.warn('⚠️ Local database server not available:', error.message);

        throw error;

    }        // Fallback 1: Try Vercel API if available

}        try {

            console.log('🔄 Trying Vercel API as fallback...');

function saveAnswersToSession() {            const VERCEL_API = 'https://innovative-centre-admin.vercel.app/api'; // Update with actual URL when deployed

    const currentModule = getCurrentModule();

    if (!currentModule) return;            const response = await fetch(`${VERCEL_API}/submissions`, {

                    method: 'POST',

    const answers = {};                headers: {

                        'Content-Type': 'application/json',

    if (currentModule === 'reading') {                },

        // Text, radio, select inputs                body: JSON.stringify(testData)

        const inputs = document.querySelectorAll('input[type="text"], input[type="hidden"], input[type="radio"]:checked, select, textarea');            });

        inputs.forEach(input => {

            const questionId = input.id || input.name;            if (response.ok) {

            if (questionId && input.value && input.value.trim()) {                const result = await response.json();

                if (input.type === 'radio') {                console.log('✅ Test data saved to Vercel database');

                    answers[input.name] = input.value;                return result;

                } else {            }

                    answers[questionId] = input.value.trim();        } catch (vercelError) {

                }            console.warn('⚠️ Vercel API also failed:', vercelError.message);

            }        }

        });

                // Fallback 2: Enhanced local storage (database format)

        // Checkboxes        console.log('🔄 Using enhanced local storage as final fallback...');

        const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');        return await saveToEnhancedLocalStorage(testData);

        checkboxes.forEach(checkbox => {    }

            if (checkbox.name) {}

                if (!answers[checkbox.name]) answers[checkbox.name] = [];

                answers[checkbox.name].push(checkbox.value);// Enhanced local storage that mimics database structure

            }async function saveToEnhancedLocalStorage(testData) {

        });    try {

                // Get existing submissions

    } else if (currentModule === 'writing') {        const existingData = localStorage.getItem('test_submissions_database') || '[]';

        const textareas = document.querySelectorAll('textarea');        const submissions = JSON.parse(existingData);

        textareas.forEach((textarea, index) => {

            if (textarea.value.trim()) {        // Add new submission with database-like structure

                answers[`task_${index + 1}`] = textarea.value.trim();        const newSubmission = {

            }            id: Date.now(),

        });            student_id: testData.studentId,

                    student_name: testData.studentName,

    } else if (currentModule === 'listening') {            mock_number: testData.mockNumber,

        const allInputs = document.querySelectorAll('.answer-input');            skill: testData.skill,

        allInputs.forEach(input => {            answers: testData.answers,

            const questionId = input.id || input.name;            score: testData.score,

                        band_score: testData.bandScore,

            if (input.type === 'radio') {            start_time: testData.startTime,

                if (input.checked && input.value) {            end_time: testData.endTime,

                    answers[input.name] = input.value;            created_at: new Date().toISOString(),

                }            saved_locally: true

            } else if (input.type === 'text' || input.tagName.toLowerCase() === 'select') {        };

                if (questionId && input.value && input.value.trim()) {

                    answers[questionId] = input.value.trim();        submissions.push(newSubmission);

                }

            }        // Save back to localStorage

        });        localStorage.setItem('test_submissions_database', JSON.stringify(submissions));

    }

            console.log('✅ Test data saved to enhanced local storage (database format)');

    localStorage.setItem(`${currentModule}Answers`, JSON.stringify(answers));

}        // Also trigger a sync attempt in the background

        setTimeout(() => syncLocalDataToDatabase(), 5000);

function restoreAnswersFromSession() {

    const currentModule = getCurrentModule();        return {

    if (!currentModule) return;            success: true,

                message: 'Saved to local storage (will sync when database is available)',

    const savedAnswers = localStorage.getItem(`${currentModule}Answers`);            id: newSubmission.id

    if (!savedAnswers) return;        };

    

    try {    } catch (error) {

        const answers = JSON.parse(savedAnswers);        console.error('❌ Enhanced local storage failed:', error);

                throw error;

        Object.entries(answers).forEach(([key, value]) => {    }

            const element = document.getElementById(key) || document.querySelector(`[name="${key}"]`);}

            if (element) {

                if (element.type === 'radio') {// Background sync function

                    const radioButton = document.querySelector(`input[name="${key}"][value="${value}"]`);async function syncLocalDataToDatabase() {

                    if (radioButton) radioButton.checked = true;    try {

                } else if (element.type === 'checkbox') {        const localData = localStorage.getItem('test_submissions_database');

                    if (Array.isArray(value)) {        if (!localData) return;

                        value.forEach(val => {

                            const checkbox = document.querySelector(`input[name="${key}"][value="${val}"]`);        const submissions = JSON.parse(localData);

                            if (checkbox) checkbox.checked = true;        const unsynced = submissions.filter(sub => sub.saved_locally);

                        });

                    }        if (unsynced.length === 0) return;

                } else {

                    element.value = value;        console.log(`🔄 Attempting to sync ${unsynced.length} local submissions...`);

                }

            }        // Try to sync each submission

        });        for (const submission of unsynced) {

    } catch (e) {            try {

        console.error('Error restoring answers:', e);                const response = await fetch('http://localhost:3002/submissions', {

    }                    method: 'POST',

}                    headers: { 'Content-Type': 'application/json' },

                    body: JSON.stringify({

// Auto-save on page unload                        studentId: submission.student_id,

window.addEventListener('beforeunload', saveAnswersToSession);                        studentName: submission.student_name,

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
window.addEventListener('beforeunload', function() {
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

// Call restore function after page loads
setTimeout(restoreAnswersFromSession, 1000);
