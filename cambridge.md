# Integrate Inspera A2 Key Test with Existing Infrastructure

## Overview

Modify the existing `Cambridge/MOCKs-Cambridge/A2-Key/A2 Key RW Digital Sample Test 1_26.04.23.html` file directly to connect it with the backend, session management, and dashboard while keeping all visual styling intact.

## Single File Modification Approach

### File: `Cambridge/MOCKs-Cambridge/A2-Key/A2 Key RW Digital Sample Test 1_26.04.23.html`

All changes will be made directly within this file using find-and-replace operations.

## Changes Required

### 1. Update Asset Paths (Lines 435, 476)

**Current:** External CDN links

```html
<link rel="stylesheet" type="text/css" href="./A2 Key RW Digital Sample Test 1_26.04.23_files/player.css">
<script src="./A2 Key RW Digital Sample Test 1_26.04.23_files/bundle.js.download"></script>
```

**Keep as-is** - These local files already exist in the folder.

### 2. Update Logo Path (Line 441)

**Current:**

```html
<img src="./A2 Key RW Digital Sample Test 1_26.04.23_files/ceq.png" alt="header.logo">
```

**Change to:**

```html
<img src="../../../assets/icons/Logo Big.png" alt="Innovative Centre Logo">
```

### 3. Display Student ID (Line 441)

**Current:** Shows hardcoded "Candidate ID" with no value

**Find:** `<div class="header__name___1Cw2x">Candidate ID</div><div></div>`

**Replace with:**

```html
<div class="header__name___1Cw2x">Candidate ID</div><div id="student-id-display"></div>
```

### 4. Add Timer Functionality

**Current:** Timer area exists but not functional

**Add at end of file (before `</body>`):**

```html
<script>
// Timer functionality
let timeRemaining = 3600; // 60 minutes in seconds
let timerInterval;

function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Update any timer display elements if they exist
    const timerElements = document.querySelectorAll('.timer-display, [data-timer]');
    timerElements.forEach(el => el.textContent = display);
}

function startTimer() {
    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            alert('Time is up! Your answers will be submitted automatically.');
            submitTest();
        }
    }, 1000);
}
</script>
```

### 5. Add Session Management & Authentication

**Add before timer script:**

```html
<script>
// Session Management
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    const studentId = localStorage.getItem('studentId');
    const studentName = localStorage.getItem('studentName');
    const examType = localStorage.getItem('examType');
    
    if (!studentId || !studentName || examType !== 'Cambridge') {
        alert('Session expired. Please log in again.');
        window.location.href = '../../index.html';
        return;
    }
    
    // Display student ID
    const studentIdDisplay = document.getElementById('student-id-display');
    if (studentIdDisplay) {
        studentIdDisplay.textContent = studentId;
    }
    
    // Mark test as in-progress
    localStorage.setItem('reading-writingStatus', 'in-progress');
    if (!localStorage.getItem('reading-writingStartTime')) {
        localStorage.setItem('reading-writingStartTime', new Date().toISOString());
    }
    
    // Load saved answers if any
    loadSavedAnswers();
    
    // Start timer
    startTimer();
    
    // Setup auto-save
    setInterval(saveAnswers, 30000); // Auto-save every 30 seconds
});

function loadSavedAnswers() {
    const saved = localStorage.getItem('reading-writingAnswers');
    if (!saved) return;
    
    const answers = JSON.parse(saved);
    
    // Restore all answers
    Object.keys(answers).forEach(key => {
        if (key.startsWith('q')) {
            const qNum = key.substring(1);
            
            // Try radio button first
            const radio = document.querySelector(`input[name="IA17609397840${qNum}*"][value="${answers[key]}"]`);
            if (radio) {
                radio.checked = true;
                return;
            }
            
            // Try text input
            const input = document.querySelector(`input[type="text"]#q${qNum}, textarea#q${qNum}, textarea[id*="${qNum}"]`);
            if (input) {
                input.value = answers[key];
            }
        }
    });
}
</script>
```

### 6. Add Answer Collection Function

**Add after session management:**

```html
<script>
function collectAnswers() {
    const answers = {};
    
    // Questions 7-13: Radio buttons (Part 2)
    for (let i = 7; i <= 13; i++) {
        const radioName = document.querySelector(`input[type="radio"][id*="-${i}"]`)?.name;
        if (radioName) {
            const selected = document.querySelector(`input[name="${radioName}"]:checked`);
            if (selected) answers[`q${i}`] = selected.value;
        }
    }
    
    // Questions 1-6: Radio buttons (Part 1) - if they exist in the full version
    for (let i = 1; i <= 6; i++) {
        const radioName = document.querySelector(`input[type="radio"][id*="-${i}"]`)?.name;
        if (radioName) {
            const selected = document.querySelector(`input[name="${radioName}"]:checked`);
            if (selected) answers[`q${i}`] = selected.value;
        }
    }
    
    // Text inputs and textareas (gap-fill and writing tasks)
    document.querySelectorAll('input[type="text"], textarea').forEach(input => {
        if (input.value && input.value.trim()) {
            // Try to extract question number from context
            const interactionId = input.closest('[id*="interaction"]')?.id;
            if (interactionId) {
                answers[input.id || interactionId] = input.value;
            }
        }
    });
    
    return answers;
}

function saveAnswers() {
    const answers = collectAnswers();
    localStorage.setItem('reading-writingAnswers', JSON.stringify(answers));
    console.log('Answers auto-saved:', Object.keys(answers).length, 'items');
}
</script>
```

### 7. Connect Submit Button

**Find:** `<button id="deliver-button"` (line 761)

**Add click handler after answer collection script:**

```html
<script>
async function submitTest() {
    // Collect final answers
    const answers = collectAnswers();
    
    // Save to localStorage
    localStorage.setItem('reading-writingAnswers', JSON.stringify(answers));
    localStorage.setItem('reading-writingStatus', 'completed');
    localStorage.setItem('reading-writingEndTime', new Date().toISOString());
    
    // Prepare submission data
    const studentId = localStorage.getItem('studentId');
    const studentName = localStorage.getItem('studentName');
    const level = localStorage.getItem('cambridgeLevel') || 'A2-Key';
    const startTime = localStorage.getItem('reading-writingStartTime');
    const endTime = new Date().toISOString();
    
    const submissionData = {
        studentId: studentId,
        studentName: studentName,
        level: level,
        module: 'reading-writing',
        answers: answers,
        score: 0,
        startTime: startTime,
        endTime: endTime
    };
    
    try {
        // Submit to backend
        const response = await fetch('http://localhost:3000/api/cambridge-submissions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(submissionData)
        });
        
        if (response.ok) {
            console.log('Test submitted successfully');
        } else {
            console.error('Submission failed');
        }
    } catch (error) {
        console.error('Error submitting test:', error);
    }
    
    // Return to dashboard
    alert('Test submitted successfully!');
    window.location.href = '../../dashboard-cambridge.html';
}

// Attach to deliver button
document.addEventListener('DOMContentLoaded', function() {
    const deliverBtn = document.getElementById('deliver-button');
    if (deliverBtn) {
        deliverBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('Are you sure you want to submit your test? You cannot return after submission.')) {
                clearInterval(timerInterval);
                submitTest();
            }
        });
    }
});
</script>
```

### 8. Remove Inspera Infrastructure

**Find and remove/comment out (Lines 14-366):**

- TrackJS initialization (lines 15-34)
- Service worker registration (lines 300-365)
- External tracking URLs

**Replace with:**

```html
<!-- Inspera tracking and service worker removed for local deployment -->
<script>
    // Minimal configuration for standalone operation
    window.assetRoot = './A2 Key RW Digital Sample Test 1_26.04.23_files';
    window.marketplaceProperties = {
        ENABLE_PLAYER_SERVICE_WORKER_CACHE: false,
        // ... keep only essential properties
    };
</script>
```

### 9. Prevent Navigation Away

**Add:**

```html
<script>
// Prevent accidental navigation
window.addEventListener('beforeunload', function(e) {
    if (localStorage.getItem('reading-writingStatus') === 'in-progress') {
        e.preventDefault();
        e.returnValue = '';
        return 'Your test is in progress. Are you sure you want to leave?';
    }
});

// Prevent back button
window.history.pushState(null, null, window.location.href);
window.addEventListener('popstate', function(event) {
    window.history.pushState(null, null, window.location.href);
    alert('Please use the navigation buttons within the test.');
});
</script>
```

## Implementation Steps

1. **Backup** - Copy original file to `A2 Key RW Digital Sample Test 1_26.04.23.html.backup`
2. **Rename** - Rename `A2 Key RW Digital Sample Test 1_26.04.23.html` to `reading-writing.html`
3. **Modify** - Make all changes listed above directly in the file
4. **Test** - Launch from dashboard and verify all functionality

## Testing Checklist

- [ ] File renamed to `reading-writing.html`
- [ ] Logo displays Innovative Centre logo
- [ ] Student ID displays correctly from localStorage
- [ ] Timer counts down from 60:00
- [ ] All radio buttons work and save answers
- [ ] Text inputs and textareas save values
- [ ] Auto-save works every 30 seconds
- [ ] Submit button triggers confirmation
- [ ] Submission posts to backend at localhost:3000
- [ ] Returns to dashboard after submission
- [ ] Dashboard shows "completed" status

## Key Preservation Points

✅ Keep ALL Inspera CSS classes unchanged

✅ Keep ALL Inspera HTML structure unchanged

✅ Keep ALL visual styling (colors, fonts, layout) unchanged

✅ Only ADD scripts at the end of the file

✅ Only MODIFY specific elements (logo, student ID display, button handlers)

## File Structure After Changes

```
Cambridge/MOCKs-Cambridge/A2-Key/
├── reading-writing.html (renamed from A2 Key RW Digital Sample Test 1_26.04.23.html)
├── A2 Key RW Digital Sample Test 1_26.04.23.html.backup (backup)
└── A2 Key RW Digital Sample Test 1_26.04.23_files/
    ├── player.css
    ├── bundle.js.download
    ├── ceq.png (can be deleted after logo update)
    └── ... (other assets kept as-is)
```