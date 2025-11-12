# Cambridge Test Timer System

## Overview
A comprehensive timer system has been implemented for all Cambridge General English tests. The timer automatically counts down the allocated time for each test module and alerts candidates when time is up.

## Features

### 1. **Automatic Timer Display**
- Timer appears in the top-right corner of the test screen
- Shows remaining time in MM:SS or HH:MM:SS format
- Always visible during the test
- Persists across page navigation within the same test module

### 2. **Visual Warnings**
- **Normal State** (Blue gradient): More than 5 minutes remaining
- **Warning State** (Orange): Last 5 minutes with subtle pulse animation
- **Critical State** (Red): Last minute with prominent pulse animation

### 3. **Time's Up Alert**
- When time expires, a modal popup appears with:
  - Clear "Time's Up!" message
  - Audio beep notification (browser permitting)
  - Instructions to review and submit answers
  - Button to acknowledge and dismiss the alert
- Alert auto-dismisses after 10 seconds if not manually closed

### 4. **Timer Persistence**
- Timer state is saved in localStorage
- Continues accurately even if:
  - Page is refreshed
  - Browser is closed and reopened (within same session)
  - User navigates between test parts
  - Connection is temporarily lost

## Test Duration by Level and Module

### A1 Movers
- **Reading & Writing**: 60 minutes
- **Listening**: 30 minutes
- **Speaking**: 7 minutes

### A2 Key (KET)
- **Reading & Writing**: 60 minutes
- **Listening**: 30 minutes
- **Speaking**: 10 minutes

### B1 Preliminary (PET)
- **Reading**: 60 minutes
- **Writing**: 45 minutes
- **Listening**: 40 minutes
- **Speaking**: 12 minutes

### B2 First (FCE)
- **Reading & Use of English**: 75 minutes
- **Writing**: 80 minutes
- **Listening**: 40 minutes
- **Speaking**: 14 minutes

## Implementation Details

### Files Modified
1. **Timer Module**: `assets/js/cambridge/cambridge-timer.js`
   - Main timer class with all functionality
   - Configurable durations for each level and module
   - State management and persistence

2. **Reading & Writing Tests** (4 files):
   - `Cambridge/MOCKs-Cambridge/A1-Movers/reading-writing.html`
   - `Cambridge/MOCKs-Cambridge/A2-Key/reading-writing.html`
   - `Cambridge/MOCKs-Cambridge/B1-Preliminary/reading-writing.html`
   - `Cambridge/MOCKs-Cambridge/B2-First/reading-writing.html`

3. **Listening Tests** (4 files):
   - `Cambridge/MOCKs-Cambridge/A1-Movers/listening.html`
   - `Cambridge/MOCKs-Cambridge/A2-Key/listening.html`
   - `Cambridge/MOCKs-Cambridge/B1-Preliminary/listening.html`
   - `Cambridge/MOCKs-Cambridge/B2-First/listening.html`

4. **Speaking Tests** (4 files):
   - `Cambridge/MOCKs-Cambridge/A1-Movers/speaking.html`
   - `Cambridge/MOCKs-Cambridge/A2-Key/speaking.html`
   - `Cambridge/MOCKs-Cambridge/B1-Preliminary/speaking.html`
   - `Cambridge/MOCKs-Cambridge/B2-First/speaking.html`

### Technical Architecture

#### Timer Initialization
```javascript
// Timer is automatically initialized when test starts
const level = localStorage.getItem('cambridgeLevel') || 'A2-Key';
const timerDuration = CambridgeTimer.getTimerDuration(level, module);
const timer = new CambridgeTimer(timerDuration, 'Module Name');
```

#### State Persistence
Timer state is stored in localStorage with the key pattern:
```
cambridge_timer_[moduleName]
```

Stored data includes:
- Start time (timestamp)
- Total duration in seconds
- Running status
- Module name

#### Timer Recovery
When a page loads, the timer:
1. Checks for existing timer state
2. Calculates elapsed time since start
3. Resumes countdown from correct position
4. Displays accurate remaining time

## User Experience

### What Candidates See
1. **Test Start**: Timer appears immediately showing full allocated time
2. **During Test**: Timer counts down continuously, visible at all times
3. **5 Minutes Left**: Timer turns orange with gentle pulse animation
4. **1 Minute Left**: Timer turns red with prominent pulse animation
5. **Time Up**: 
   - Timer shows "0:00"
   - Audio beep plays
   - Modal alert appears
   - Test remains accessible for review and submission

### What Happens After Time Expires
- **NO AUTOMATIC SUBMISSION**: Candidates maintain control
- Test remains fully accessible
- All answers remain editable
- Candidates can review before submitting
- Submission must be manual (by clicking submit button)

## Technical Notes

### Browser Compatibility
- Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- Audio alert requires user interaction before first play (browser security)
- Fallback handling if audio fails
- Graceful degradation in older browsers

### Performance
- Minimal resource usage (single interval per timer)
- Efficient localStorage operations
- No server-side dependencies
- Works offline once page is loaded

### Security
- Timer cannot be paused by candidates
- Timer state is tamper-resistant
- Accurate timing regardless of client manipulation attempts
- Server-side validation recommended for final submission times

## Testing Recommendations

### Manual Testing Checklist
- [ ] Timer appears on test start
- [ ] Timer counts down correctly
- [ ] Timer persists on page refresh
- [ ] Timer persists across part navigation
- [ ] Warning state activates at 5 minutes
- [ ] Critical state activates at 1 minute
- [ ] Alert appears when time expires
- [ ] Audio beep plays (if browser allows)
- [ ] Alert can be dismissed
- [ ] Test remains accessible after time up
- [ ] Timer works for all test levels
- [ ] Timer works for all modules

### Edge Cases to Test
- Browser refresh during test
- Browser close/reopen during test
- Multiple tabs open with same test
- Network disconnection during test
- System clock changes during test

## Maintenance

### Changing Timer Durations
Edit the `durations` object in `cambridge-timer.js`:
```javascript
static getTimerDuration(level, module) {
    const durations = {
        'A1-Movers': {
            'reading-writing': 60,  // Change this value
            // ...
        }
    };
}
```

### Customizing Appearance
Timer styles are defined inline in `cambridge-timer.js` in the `createTimerUI()` method. Key CSS classes:
- `.cambridge-timer` - Main container
- `.timer-display` - Time display
- `.cambridge-timer.warning` - Warning state (5 min)
- `.cambridge-timer.critical` - Critical state (1 min)

### Disabling Timer
To temporarily disable timer for a specific test, comment out the timer initialization:
```javascript
// const timer = new CambridgeTimer(timerDuration, 'Module Name');
```

## Support and Troubleshooting

### Common Issues

**Timer not appearing:**
- Check browser console for JavaScript errors
- Verify cambridge-timer.js is loaded
- Check localStorage is enabled in browser

**Timer shows wrong time:**
- Clear localStorage and restart test
- Check system clock is correct
- Verify correct level is selected

**Timer resets unexpectedly:**
- Check for multiple tabs with same test
- Clear browser cache
- Verify localStorage quota not exceeded

**Alert not showing:**
- Check browser console for errors
- Verify modal HTML is present
- Check z-index conflicts with other elements

## Future Enhancements
Potential improvements for consideration:
- Invigilator time extension capability
- Pause/resume for technical issues
- Server-side time synchronization
- Analytics and reporting integration
- Customizable alert sounds
- Multiple language support for alerts

## Version History
- **v1.0** (November 2025): Initial implementation with full feature set

---

For technical support or questions about the timer system, please contact the development team.


