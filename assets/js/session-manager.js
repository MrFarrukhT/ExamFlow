// Test Session Management Integration
// This script should be included in all test pages (reading.html, listening.html, writing.html)

document.addEventListener('DOMContentLoaded', function() {
    // Initialize session management
    initializeSession();
    setupSessionHandlers();
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
        testTakerInfo.textContent = `${studentName} (${studentId})`;
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
    // Override the existing deliver button functionality
    const deliverButton = document.getElementById('deliver-button');
    if (deliverButton) {
        // Remove existing event listeners by cloning the button
        const newDeliverButton = deliverButton.cloneNode(true);
        deliverButton.parentNode.replaceChild(newDeliverButton, deliverButton);
        
        // Add our new event listener
        newDeliverButton.addEventListener('click', handleTestCompletion);
    }
    
    // Prevent back navigation
    window.history.pushState(null, null, window.location.href);
    window.addEventListener('popstate', function(event) {
        window.history.pushState(null, null, window.location.href);
        alert('Please use the navigation buttons within the test.');
    });
    
    // Save answers periodically
    setInterval(saveAnswersToSession, 30000); // Every 30 seconds
}

function handleTestCompletion() {
    const currentModule = getCurrentModule();
    if (!currentModule) return;
    
    if (confirm('Are you sure you want to submit this section? You will not be able to return to it.')) {
        // Save final answers
        saveAnswersToSession();
        
        // Mark as completed
        localStorage.setItem(`${currentModule}Status`, 'completed');
        localStorage.setItem(`${currentModule}EndTime`, new Date().toISOString());
        
        // Show completion message
        alert(`${currentModule.charAt(0).toUpperCase() + currentModule.slice(1)} section completed successfully!`);
        
        // Return to dashboard
        window.location.href = '../../dashboard.html';
    }
}

function saveAnswersToSession() {
    const currentModule = getCurrentModule();
    if (!currentModule) return;
    
    const answers = {};
    
    // Collect answers based on module type
    if (currentModule === 'reading') {
        // Collect reading answers
        const inputs = document.querySelectorAll('input[type="text"], input[type="radio"]:checked, select, textarea');
        inputs.forEach(input => {
            if (input.name && input.value.trim()) {
                if (input.type === 'radio') {
                    answers[input.name] = input.value;
                } else {
                    answers[input.id || input.name] = input.value.trim();
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
        // Collect listening answers (similar to reading)
        const inputs = document.querySelectorAll('input[type="text"], input[type="radio"]:checked, select');
        inputs.forEach(input => {
            if (input.name && input.value.trim()) {
                if (input.type === 'radio') {
                    answers[input.name] = input.value;
                } else {
                    answers[input.id || input.name] = input.value.trim();
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
