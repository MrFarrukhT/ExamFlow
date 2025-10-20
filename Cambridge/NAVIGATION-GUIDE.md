# Cambridge A2-Key Test - Navigation System Guide

## ✅ Navigation System Enabled!

The Cambridge A2-Key Reading/Writing test now has a **fully functional navigation system** that allows students to easily move between questions.

---

## 🎯 Navigation Features

### 1. **Click Question Numbers**
Click on any question number (7-13) in the footer navigation bar to instantly jump to that question.

**How it works:**
- Click "7", "8", "9", etc. in the bottom navigation
- The page smoothly scrolls to that question
- The selected question is highlighted
- Footer button shows as active

### 2. **Previous/Next Buttons**
Use the arrow buttons at the top of the footer to navigate sequentially.

**Buttons:**
- ← **Previous**: Go to the previous question
- → **Next**: Go to the next question

**Behavior:**
- At Question 7: Previous button shows warning "Already at first question"
- At Question 13: Next button shows warning "Already at last question"

### 3. **Keyboard Navigation** ⌨️
Use arrow keys for quick navigation without clicking.

**Keyboard Shortcuts:**
- `←` or `↑` : Previous question
- `→` or `↓` : Next question

**Note:** This makes it super fast to review all answers!

### 4. **Part Navigation**
Click on Part buttons (Part 1, Part 2, etc.) to switch between different test sections.

**Current Status:**
- **Part 2 (Questions 7-13)**: ✅ Active and loaded
- **Other Parts**: Show notification "Content not loaded yet"

---

## 📊 Visual Feedback

### Active Question Highlighting:
```
✓ Question number is highlighted in bold
✓ Footer button turns blue/active
✓ Current question displayed prominently
```

### Answer Status Tracking:
```
✓ "Not attempted" → Changes to "Attempted" after answering
✓ Console logs each answer recorded
✓ Answer count updated in real-time
```

---

## 🎮 Console Debug Commands

Open browser console (F12) to use these debugging commands:

### Available Commands:
```javascript
// Jump to specific question
cambridgeNavigation.goto(10);  // Jump to Question 10

// Navigate next
cambridgeNavigation.next();    // Go to next question

// Navigate previous
cambridgeNavigation.prev();    // Go to previous question

// Check current question
cambridgeNavigation.current();  // Returns current question number

// View all answers
cambridgeNavigation.answers();  // Returns studentAnswers object
```

### Example Usage:
```javascript
// In browser console (F12):
> cambridgeNavigation.goto(8)
👉 Navigated to question 8

> cambridgeNavigation.current()
8

> cambridgeNavigation.answers()
{
  "IA17609397840806dd7e02f58b04302084cc7b79bc2e79a": "C",
  "IA1760939784088391ae45976fd4f17169efe4714239d5f": "B"
}
```

---

## 🧪 Testing the Navigation

### Test Procedure:

1. **Open the test page:**
   ```
   Cambridge/MOCKs-Cambridge/A2-Key/reading-writing.html?dev=true
   ```

2. **Test Question Number Clicks:**
   - Click "8" in footer → Should scroll to Question 8
   - Click "10" in footer → Should scroll to Question 10
   - Click "7" in footer → Should scroll back to Question 7

3. **Test Arrow Buttons:**
   - Click → (Next) → Should go from Q7 to Q8
   - Click ← (Previous) → Should go from Q8 to Q7
   - Keep clicking Next until Q13 → Should show warning

4. **Test Keyboard:**
   - Press → key → Should advance to next question
   - Press ← key → Should go to previous question
   - Press ↓ key → Should advance (same as →)
   - Press ↑ key → Should go back (same as ←)

5. **Test Answer Tracking:**
   - Select answer for Q7 → Console should log "✓ Answer recorded for Q7"
   - Check footer → Q7 button should change from "Not attempted" to "Attempted"
   - Continue with other questions

---

## 📱 User Experience

### What Students See:

1. **Initial Load:**
   - Page loads with Question 7 active
   - Footer shows Part 2 expanded with Q7-13
   - Q7 button highlighted

2. **When Clicking Question:**
   - Smooth scroll animation
   - Question centered on screen
   - Number badge highlighted
   - Footer button turns blue

3. **When Answering:**
   - Radio button selection works normally
   - Console logs confirmation
   - Footer status updates
   - Answer saved to `window.studentAnswers`

4. **When Navigating:**
   - Previous/Next buttons responsive
   - Keyboard shortcuts work instantly
   - Current position always visible

---

## 🔧 Technical Details

### How It Works:

#### 1. Question Detection:
```javascript
// Finds all questions by their ID pattern
var orderNumbers = document.querySelectorAll('.order-number[id^="scorableItem-"]');
```

#### 2. Navigation State:
```javascript
var currentQuestionNumber = 7;  // Tracks current position
```

#### 3. Smooth Scrolling:
```javascript
container.scrollIntoView({ 
    behavior: 'smooth',  // Smooth animation
    block: 'center'      // Center the question
});
```

#### 4. Active Highlighting:
```javascript
// Removes old active classes
document.querySelectorAll('.order-number').forEach(el => {
    el.classList.remove('active');
});

// Adds new active class
targetElement.classList.add('active');
```

---

## 📋 Navigation Flow Chart

```
User Action                Navigation System                Result
═══════════════════════════════════════════════════════════════════════

Click Q8 in footer  →  scrollToQuestion(8)         →  Scroll to Q8
                       highlightQuestion(8)            Highlight Q8
                       console.log('Navigated')        Log to console

Click Next button   →  gotoNextQuestion()          →  Increment number
                       scrollToQuestion(current+1)     Scroll to next
                       
Press → key         →  Keyboard handler            →  Same as Next
                       gotoNextQuestion()

Select answer       →  Radio change handler        →  Save to object
                       Update footer status            Log to console
```

---

## 🚀 Performance

### Optimizations:
- ✅ Event delegation for efficiency
- ✅ Smooth scrolling (CSS hardware acceleration)
- ✅ Minimal DOM queries
- ✅ Cached question elements array
- ✅ Prevents default browser actions

### Browser Compatibility:
- ✅ Chrome/Edge: Full support
- ✅ Firefox: Full support
- ✅ Safari: Full support
- ✅ Mobile browsers: Touch-friendly

---

## 🎓 For Developers

### Adding More Questions:

If you add content for other parts (Part 1, 3-7), the navigation will automatically work! Just ensure:

1. **Question IDs follow pattern:**
   ```html
   <span id="scorableItem-144044610_14">14</span>
   ```

2. **Footer buttons have data attributes:**
   ```html
   <button data-ordernumber="14" class="subQuestion scorable-item">
   ```

3. **Update question range in script:**
   ```javascript
   // Change from:
   if (currentQuestionNumber < 13)
   
   // To:
   if (currentQuestionNumber < 32)  // For all questions 7-32
   ```

### Customization:

**Change initial question:**
```javascript
var currentQuestionNumber = 7;  // Change to desired start
```

**Disable keyboard navigation:**
```javascript
// Comment out this section:
document.addEventListener('keydown', function(e) {
    // ... keyboard handler code
});
```

**Add custom navigation events:**
```javascript
function scrollToQuestion(questionNum) {
    // Existing code...
    
    // Add your custom code here:
    console.log('Custom: Navigated to Q' + questionNum);
    // Fire analytics event, etc.
}
```

---

## ✅ Checklist: Is Navigation Working?

Test these to confirm everything works:

- [ ] Click question number in footer → Scrolls to question
- [ ] Previous button → Goes to previous question
- [ ] Next button → Goes to next question
- [ ] Arrow keys → Navigate between questions
- [ ] Active question highlighted in bold
- [ ] Footer button shows as active (blue)
- [ ] Console logs navigation messages
- [ ] Answer selection updates status
- [ ] Submit button counts answers correctly
- [ ] Debug commands work in console

---

## 🎉 Summary

**The navigation system provides:**
- ✅ Click-to-navigate question numbers
- ✅ Previous/Next arrow buttons
- ✅ Keyboard shortcuts (arrow keys)
- ✅ Visual highlighting of active question
- ✅ Answer tracking and status updates
- ✅ Console debugging commands
- ✅ Smooth scrolling animations
- ✅ Mobile-friendly touch interface

**Students can now:**
- Jump to any question instantly
- Navigate with keyboard or mouse
- See their progress clearly
- Review answers easily
- Submit with confidence

---

*Navigation System Version: 1.0*
*Last Updated: October 20, 2025*
*Status: Fully Functional* ✅

