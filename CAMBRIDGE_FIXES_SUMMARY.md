# Cambridge Test System - Fix Summary

## Issues Found and Solutions

### 1. ✅ Word Count in Parts 6 & 7 (A2 Reading&Writing)

**Issue**: Word count displays "Words: 0" and doesn't update.

**Root Cause**: The word count elements exist in the HTML but there's no JavaScript to update them.

**Solution**: Add word count update functionality to both Part 6 and Part 7 HTML files.

**Implementation**:
Add this script before the closing `</body>` tag in both `Part 6.html` and `Part 7.html`:

```javascript
<script>
// Word count functionality for writing tasks
document.addEventListener('DOMContentLoaded', function() {
    // Find all textareas with word count displays
    const textareas = document.querySelectorAll('textarea[id^="labelText-"]');
    
    textareas.forEach(textarea => {
        // Find the associated word count span
        const wordCountSpan = textarea.parentElement.querySelector('.WordCountText__wordCountText___3QyIr');
        
        if (wordCountSpan) {
            // Function to update word count
            function updateWordCount() {
                const text = textarea.value.trim();
                const words = text ? text.split(/\s+/).length : 0;
                wordCountSpan.textContent = `Words: ${words}`;
            }
            
            // Update on input
            textarea.addEventListener('input', updateWordCount);
            textarea.addEventListener('change', updateWordCount);
            
            // Initial update
            updateWordCount();
        }
    });
});
</script>
```

---

### 2. ⏳ Part 4 Answer Saving (A2 Reading&Writing)

**Issue**: Answers in Part 4 are not being saved to localStorage.

**Root Cause**: Need to verify the answer save event listeners are properly attached to Part 4 input fields.

**Solution**: Add explicit save listeners for Part 4 inputs.

**Implementation** for `Part 4.html`:
Add this script before the closing `</body>` tag:

```javascript
<script>
// Enhanced answer saving for Part 4
document.addEventListener('DOMContentLoaded', function() {
    console.log('Part 4: Initializing answer save listeners');
    
    // Find all input fields in Part 4
    const inputs = document.querySelectorAll('input[type="text"], textarea');
    
    inputs.forEach(input => {
        // Extract question number from input ID
        const questionMatch = input.id.match(/\d+/);
        if (questionMatch) {
            const questionNum = questionMatch[0];
            
            // Add save listeners
            input.addEventListener('input', function() {
                saveAnswer(questionNum, this.value);
            });
            
            input.addEventListener('change', function() {
                saveAnswer(questionNum, this.value);
            });
            
            // Restore saved answer on load
            const savedAnswer = getSavedAnswer(questionNum);
            if (savedAnswer) {
                input.value = savedAnswer;
            }
        }
    });
    
    function saveAnswer(questionNum, answer) {
        if (window.cambridgeAnswerManager) {
            window.cambridgeAnswerManager.saveAnswer(questionNum, answer, 'reading-writing');
            console.log(`Part 4: Saved answer for Q${questionNum}:`, answer);
        }
    }
    
    function getSavedAnswer(questionNum) {
        const answers = JSON.parse(localStorage.getItem('reading-writingAnswers') || '{}');
        return answers[questionNum] || '';
    }
});
</script>
```

---

### 3. 🔧 A2 Listening Navigation from Launcher

**Issue**: Clicking on Listening module in launcher doesn't navigate properly.

**Solution**: Fix the navigation path in `launcher-cambridge.html`.

**File to modify**: `Cambridge/launcher-cambridge.html` (around line 100-150)

**Find this function**:
```javascript
function enterFullscreenMode() {
    // ... existing code ...
    window.location.href = 'index.html';
}
```

**Replace with**:
```javascript
function enterFullscreenMode() {
    const docElement = document.documentElement;
    const fullscreenPromise = docElement.requestFullscreen ? docElement.requestFullscreen() :
                            docElement.webkitRequestFullscreen ? docElement.webkitRequestFullscreen() :
                            docElement.mozRequestFullScreen ? docElement.mozRequestFullScreen() :
                            docElement.msRequestFullscreen ? docElement.msRequestFullscreen() : Promise.resolve();

    Promise.resolve(fullscreenPromise).then(() => {
        setTimeout(() => {
            sessionStorage.setItem('distractionFreeMode', 'true');
            // Navigate to Cambridge entry page (fixed path)
            window.location.href = './index.html';  // Add './' for relative path
        }, 100);
    }).catch(err => {
        console.log('Fullscreen request failed:', err);
        sessionStorage.setItem('distractionFreeMode', 'true');
        window.location.href = './index.html';  // Add './' for relative path
    });
}
```

---

### 4. 📥 TXT Download in Cambridge Invigilator

**Issue**: The .txt download button doesn't work.

**Solution**: Implement the `downloadCurrentTestTxt()` method in cambridge-answer-manager.js

**File to modify**: `assets/js/cambridge/cambridge-answer-manager.js`

**Add this method to the CambridgeAnswerManager class** (after line 100):

```javascript
// Download current test as formatted text file
downloadCurrentTestTxt() {
    const data = this.getCurrentTestData();
    const content = this.formatTestDataAsText(data);
    
    const filename = `Cambridge_${data.studentInfo.level}_${data.studentInfo.id}_${this.getDateString()}.txt`;
    this.downloadTextFile(content, filename);
}

// Get current test data
getCurrentTestData() {
    const studentId = localStorage.getItem('studentId') || 'Unknown';
    const studentName = localStorage.getItem('studentName') || 'Unknown';
    const level = localStorage.getItem('cambridgeLevel') || 'Unknown';
    const mockTest = localStorage.getItem('selectedCambridgeMock') || '1';
    
    return {
        examType: 'Cambridge',
        studentInfo: {
            id: studentId,
            name: studentName,
            level: level,
            mockTest: mockTest,
            testStartTime: localStorage.getItem('testStartTime'),
            exportTime: new Date().toISOString()
        },
        modules: this.getModulesData(level)
    };
}

// Format test data as text
formatTestDataAsText(data) {
    let text = '========================================\n';
    text += '  CAMBRIDGE GENERAL ENGLISH TEST REPORT\n';
    text += '========================================\n\n';
    
    text += 'STUDENT INFORMATION\n';
    text += '-------------------\n';
    text += `Student ID: ${data.studentInfo.id}\n`;
    text += `Name: ${data.studentInfo.name}\n`;
    text += `Level: ${data.studentInfo.level}\n`;
    text += `Mock Test: ${data.studentInfo.mockTest}\n`;
    text += `Test Start: ${data.studentInfo.testStartTime ? new Date(data.studentInfo.testStartTime).toLocaleString() : 'N/A'}\n`;
    text += `Export Time: ${new Date(data.studentInfo.exportTime).toLocaleString()}\n\n`;
    
    // Add module data
    for (const [moduleName, moduleData] of Object.entries(data.modules)) {
        text += `\n${'='.repeat(50)}\n`;
        text += `MODULE: ${this.formatModuleName(moduleName).toUpperCase()}\n`;
        text += `${'='.repeat(50)}\n`;
        text += `Status: ${moduleData.status || 'not-started'}\n`;
        text += `Start Time: ${moduleData.startTime ? new Date(moduleData.startTime).toLocaleString() : 'N/A'}\n`;
        text += `End Time: ${moduleData.endTime ? new Date(moduleData.endTime).toLocaleString() : 'N/A'}\n\n`;
        
        text += 'ANSWERS:\n';
        text += '--------\n';
        
        if (moduleData.answers && Object.keys(moduleData.answers).length > 0) {
            for (const [question, answer] of Object.entries(moduleData.answers)) {
                text += `Q${question}: ${answer}\n`;
            }
        } else {
            text += '(No answers recorded)\n';
        }
    }
    
    text += `\n${'='.repeat(50)}\n`;
    text += 'END OF REPORT\n';
    text += `${'='.repeat(50)}\n`;
    
    return text;
}

// Format module name
formatModuleName(module) {
    const names = {
        'reading-writing': 'Reading & Writing',
        'reading': 'Reading',
        'writing': 'Writing',
        'listening': 'Listening'
    };
    return names[module] || module;
}

// Download text file helper
downloadTextFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Download historical test as TXT
downloadHistoricalTestTxt(testId) {
    const history = this.getTestHistory();
    const test = history.find(t => t.id === testId);
    
    if (test) {
        const content = this.formatTestDataAsText(test);
        const filename = `Cambridge_${test.studentInfo.level}_${test.studentInfo.id}_${this.getDateString()}.txt`;
        this.downloadTextFile(content, filename);
    } else {
        alert('Test not found in history!');
    }
}

// Get date string helper
getDateString() {
    return new Date().toISOString().split('T')[0];
}
```

---

### 5. 🎨 Highlight Persistence Between Parts

**Issue**: Highlights are lost when navigating between parts.

**Solution**: Save and restore highlights using localStorage.

**Implementation**: Add this to a new file `assets/js/cambridge/highlight-manager.js`:

```javascript
// Cambridge Highlight Management System
class CambridgeHighlightManager {
    constructor(moduleName) {
        this.moduleName = moduleName;
        this.storageKey = `cambridge_highlights_${moduleName}`;
        this.init();
    }
    
    init() {
        // Load saved highlights on page load
        this.restoreHighlights();
        
        // Save highlights when created
        this.attachHighlightListeners();
    }
    
    saveHighlights() {
        const highlights = [];
        
        // Find all highlighted elements
        const highlightedElements = document.querySelectorAll('[data-highlight-id], .highlighted, mark');
        
        highlightedElements.forEach(el => {
            const highlightData = {
                text: el.textContent,
                xpath: this.getXPath(el),
                color: window.getComputedStyle(el).backgroundColor,
                timestamp: Date.now()
            };
            highlights.push(highlightData);
        });
        
        localStorage.setItem(this.storageKey, JSON.stringify(highlights));
        console.log(`Saved ${highlights.length} highlights for ${this.moduleName}`);
    }
    
    restoreHighlights() {
        const savedHighlights = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
        
        savedHighlights.forEach(highlight => {
            try {
                const element = this.getElementByXPath(highlight.xpath);
                if (element && element.textContent === highlight.text) {
                    element.style.backgroundColor = highlight.color;
                    element.classList.add('highlighted');
                }
            } catch (e) {
                console.warn('Could not restore highlight:', e);
            }
        });
        
        console.log(`Restored ${savedHighlights.length} highlights for ${this.moduleName}`);
    }
    
    attachHighlightListeners() {
        // Listen for highlight events
        document.addEventListener('mouseup', () => {
            setTimeout(() => this.saveHighlights(), 100);
        });
        
        // Save before navigating away
        window.addEventListener('beforeunload', () => {
            this.saveHighlights();
        });
    }
    
    getXPath(element) {
        if (element.id) {
            return `//*[@id="${element.id}"]`;
        }
        
        const parts = [];
        while (element && element.nodeType === Node.ELEMENT_NODE) {
            let index = 0;
            let sibling = element.previousSibling;
            
            while (sibling) {
                if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === element.nodeName) {
                    index++;
                }
                sibling = sibling.previousSibling;
            }
            
            const tagName = element.nodeName.toLowerCase();
            const pathIndex = index > 0 ? `[${index + 1}]` : '';
            parts.unshift(tagName + pathIndex);
            
            element = element.parentNode;
        }
        
        return parts.length ? '/' + parts.join('/') : '';
    }
    
    getElementByXPath(xpath) {
        return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    }
    
    clearHighlights() {
        localStorage.removeItem(this.storageKey);
        document.querySelectorAll('.highlighted, mark').forEach(el => {
            el.style.backgroundColor = '';
            el.classList.remove('highlighted');
        });
    }
}

// Initialize for each part
window.addEventListener('DOMContentLoaded', () => {
    const moduleName = localStorage.getItem('currentModule') || 'reading-writing';
    window.highlightManager = new CambridgeHighlightManager(moduleName);
});
```

**Then add this script tag to each Part HTML file (Part 1-7, Listening-Part 1-5)**:
```html
<script src="../../../assets/js/cambridge/highlight-manager.js"></script>
```

---

### 6. 📝 Notes Persistence Between Parts

**Issue**: Notes are lost when navigating between parts.

**Solution**: Save and restore notes using localStorage.

**Implementation**: Add this to a new file `assets/js/cambridge/notes-manager.js`:

```javascript
// Cambridge Notes Management System
class CambridgeNotesManager {
    constructor(moduleName) {
        this.moduleName = moduleName;
        this.storageKey = `cambridge_notes_${moduleName}`;
        this.init();
    }
    
    init() {
        // Find notes textarea/input
        this.notesElement = this.findNotesElement();
        
        if (this.notesElement) {
            // Restore saved notes
            this.restoreNotes();
            
            // Save on input
            this.notesElement.addEventListener('input', () => {
                this.saveNotes();
            });
            
            // Save before navigating away
            window.addEventListener('beforeunload', () => {
                this.saveNotes();
            });
        }
    }
    
    findNotesElement() {
        // Look for common notes elements
        const selectors = [
            'textarea[id*="notes"]',
            'textarea[id*="Notes"]',
            'input[id*="notes"]',
            'div[contenteditable="true"][id*="notes"]',
            '#notes',
            '#Notes',
            '.notes-input',
            '.notes-textarea'
        ];
        
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                console.log(`Found notes element: ${selector}`);
                return element;
            }
        }
        
        console.warn('No notes element found');
        return null;
    }
    
    saveNotes() {
        if (!this.notesElement) return;
        
        const notes = this.notesElement.value || this.notesElement.textContent || '';
        localStorage.setItem(this.storageKey, notes);
        console.log(`Saved notes for ${this.moduleName}`);
    }
    
    restoreNotes() {
        if (!this.notesElement) return;
        
        const savedNotes = localStorage.getItem(this.storageKey) || '';
        
        if (savedNotes) {
            if (this.notesElement.value !== undefined) {
                this.notesElement.value = savedNotes;
            } else {
                this.notesElement.textContent = savedNotes;
            }
            console.log(`Restored notes for ${this.moduleName}`);
        }
    }
    
    clearNotes() {
        localStorage.removeItem(this.storageKey);
        if (this.notesElement) {
            if (this.notesElement.value !== undefined) {
                this.notesElement.value = '';
            } else {
                this.notesElement.textContent = '';
            }
        }
    }
}

// Initialize for each part
window.addEventListener('DOMContentLoaded', () => {
    const moduleName = localStorage.getItem('currentModule') || 'reading-writing';
    window.notesManager = new CambridgeNotesManager(moduleName);
});
```

**Then add this script tag to each Part HTML file (Part 1-7, Listening-Part 1-5)**:
```html
<script src="../../../assets/js/cambridge/notes-manager.js"></script>
```

---

## Implementation Checklist

- [ ] 1. Add word count script to Part 6.html and Part 7.html
- [ ] 2. Add enhanced answer saving to Part 4.html
- [ ] 3. Fix navigation path in launcher-cambridge.html
- [ ] 4. Add download methods to cambridge-answer-manager.js
- [ ] 5. Create highlight-manager.js and add to all Part files
- [ ] 6. Create notes-manager.js and add to all Part files
- [ ] 7. Test word count functionality in Parts 6 & 7
- [ ] 8. Test Part 4 answer saving
- [ ] 9. Test Listening navigation from launcher
- [ ] 10. Test TXT download in cambridge-invigilator
- [ ] 11. Test highlight persistence across parts
- [ ] 12. Test notes persistence across parts

---

## Testing Instructions

### Test Word Count:
1. Navigate to A2-Key Part 6 or Part 7
2. Type in the textarea
3. Verify word count updates in real-time

### Test Part 4 Saving:
1. Navigate to A2-Key Part 4
2. Enter answers
3. Navigate away and come back
4. Verify answers are restored

### Test Listening Navigation:
1. Start from launcher-cambridge.html
2. Launch the system
3. Select A2-Key level
4. Click Start Listening
5. Verify it loads Listening-Part-1.html correctly

### Test TXT Download:
1. Complete a test
2. Go to cambridge-invigilator.html
3. Click "Download Current Test (TXT)"
4. Verify file downloads with correct format

### Test Highlight Persistence:
1. Navigate to Part 3
2. Highlight some text
3. Navigate to Part 4
4. Go back to Part 3
5. Verify highlights are still there

### Test Notes Persistence:
1. Navigate to Part 3
2. Add notes (click notes icon if available)
3. Navigate to Part 4
4. Go back to Part 3
5. Verify notes are still there

---

## Files Modified Summary

1. `/Cambridge/MOCKs-Cambridge/A2-Key/Part 6.html` - Add word count script
2. `/Cambridge/MOCKs-Cambridge/A2-Key/Part 7.html` - Add word count script
3. `/Cambridge/MOCKs-Cambridge/A2-Key/Part 4.html` - Add answer saving script
4. `/Cambridge/launcher-cambridge.html` - Fix navigation path
5. `/assets/js/cambridge/cambridge-answer-manager.js` - Add download methods
6. `/assets/js/cambridge/highlight-manager.js` - NEW FILE
7. `/assets/js/cambridge/notes-manager.js` - NEW FILE
8. All Part HTML files (Part 1-7, Listening-Part 1-5) - Add script tags

---

End of Cambridge Fixes Summary
