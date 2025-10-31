# Cambridge Question Marking & Highlighting System

## Overview

The Cambridge tests now include a comprehensive question marking and highlighting system that helps students keep track of their progress and identify questions they want to review.

## Features

### 1. **Automatic Answer Highlighting (Blue)**
- When you answer any question, a **blue indicator bar** appears at the top of the question button in the navigation
- This helps you quickly see which questions you've already answered
- Updates automatically as you type or select answers
- Persists across page navigation (moving between parts)

### 2. **Mark for Review (Orange)**
- **Right-click** on any question button in the navigation to mark it for review
- Marked questions show:
  - **Orange indicator bar** at the top of the button
  - **Flag emoji (🚩)** in the corner
- Orange marking takes priority over blue (answered) highlighting
- Useful for questions you're unsure about and want to come back to

### 3. **Context Menu Options**
When you right-click on a question button, you get these options:
- **Mark for Review** / **Unmark Question** - Toggle the review flag
- **Clear Answer** - Remove your answer for that question

### 4. **Persistent State**
- All markings and answer status are saved automatically
- Data persists when you:
  - Switch between parts
  - Close and reopen the test
  - Navigate back and forth
- Each test (A2-Key, B1-Preliminary, etc.) has separate storage

## How to Use

### Marking a Question for Review
1. Right-click on any question number in the footer navigation
2. Click "Mark for Review"
3. The question will now show an orange indicator bar and a flag 🚩

### Unmarking a Question
1. Right-click on the marked question
2. Click "Unmark Question"
3. The orange indicator and flag will be removed

### Viewing Your Progress
- **Blue bars** = Questions you've answered
- **Orange bars** = Questions marked for review
- **No indicator** = Questions not yet attempted

### Clearing an Answer
1. Right-click on the question button
2. Click "Clear Answer"
3. Your answer will be removed and the blue indicator will disappear

## Visual Indicators

```
┌─────────────────────────────────────┐
│  Navigation Footer                  │
├─────────────────────────────────────┤
│  [1] [2] [3] [4] [5] [6] ...       │
│  ▔▔▔  ▔▔▔  ▔▔▔                      │
│  Blue Orange (none)                 │
└─────────────────────────────────────┘

Blue = Answered
Orange = Marked for review
Orange + Flag (🚩) = Marked question
```

## Technical Details

### Storage Keys
- Marked questions: `cambridge_{test}_{skill}_marked`
- Answered questions: `cambridge_{test}_{skill}_answered`

### Supported Tests
- ✅ A2 Key (Reading & Writing)
- 🔄 B1 Preliminary (coming soon)
- 🔄 B2 First (coming soon)
- 🔄 A1 Movers (coming soon)

### Browser Compatibility
- Works in all modern browsers
- Requires localStorage support
- JavaScript must be enabled

## Tips

1. **Use marking strategically** - Mark questions you want to review at the end
2. **Check indicators regularly** - Glance at the navigation to see your progress
3. **Right-click is your friend** - All question management is done via right-click
4. **Review before submitting** - Look for orange flags to find questions you marked

## Troubleshooting

### Indicators not showing?
- Refresh the page
- Make sure you've actually answered the question
- Check browser console for errors

### Marks not persisting?
- Check if localStorage is enabled in your browser
- Make sure you're using the same browser/device
- Clear cache and reload if issues persist

### Context menu not appearing?
- Make sure you're right-clicking directly on the question button
- Try clicking on the button number itself
- Ensure JavaScript is enabled

## Future Enhancements

- [ ] Add keyboard shortcuts for marking
- [ ] Show summary of marked questions before submit
- [ ] Export marked questions list
- [ ] Add "Review marked only" mode
- [ ] Support for other Cambridge test levels

---

**Last Updated:** October 31, 2025  
**Version:** 1.0.0

