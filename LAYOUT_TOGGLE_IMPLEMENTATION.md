# Layout Toggle Implementation Summary

## Overview
Added dynamic layout toggle functionality to both IELTS and Cambridge reading tests, allowing users to quickly switch between different panel layouts for optimal reading and question-answering experience.

## Features Implemented

### 1. IELTS Reading Tests
**File:** `assets/js/reading/layout-toggle.js`

**Functionality:**
- **Double-click** the resizer element to cycle through 5 layout modes:
  1. **50/50 Split** - Equal space for reading and questions (default)
  2. **Reading Focus** - 70% reading passage, 30% questions
  3. **Questions Focus** - 30% reading passage, 70% questions
  4. **Full Reading** - 95% reading passage, minimized questions
  5. **Full Questions** - Minimized reading passage, 95% questions

**Features:**
- Smooth animated transitions between layouts
- Toast notifications showing current layout mode
- Double-click activation (avoids conflict with drag functionality)
- Responsive design that works on all screen sizes

**Files Updated:**
- All IELTS reading.html files in MOCKs folders (MOCK 1-10)

### 2. Cambridge Tests
**File:** `assets/js/cambridge/cambridge-layout-toggle.js`

**Functionality:**
- Adds a toggle button to the header (columns icon)
- Cycles through 5 layout modes tailored for Cambridge's HTML structure
- Icon changes based on current layout mode
- Works with Cambridge's side-by-side image/question layout

**Features:**
- Header button with intuitive icons
- CSS-based layout transitions
- Toast notifications
- Adapts to Cambridge's unique HTML structure
- Smart detection of pages that need layout toggle

**Files Updated:**
- All Cambridge Part files (Parts 1-7) in:
  - A1-Movers
  - A2-Key
  - B1-Preliminary
  - B2-First

## How to Use

### IELTS Tests:
1. Open any reading test
2. **Double-click** on the resizer handle (the middle divider between reading passage and questions)
3. Each double-click cycles to the next layout mode
4. A toast message displays the current layout name
5. You can still single-click and drag for manual adjustments

### Cambridge Tests:
1. Open any reading/writing Part file (Parts 1-5 typically have reading passages)
2. Look for the columns icon (📊) in the header next to WiFi/Messages/Options
3. Click the button to cycle through layouts
4. The icon changes and a toast shows the current layout

## Technical Details

### IELTS Implementation:
- Uses flexbox manipulation
- Applies smooth CSS transitions
- Double-click event listener (avoids conflict with single-click drag)
- Works with both mouse and touch events

### Cambridge Implementation:
- Injects CSS classes dynamically
- Works with Cambridge's `.container.partWidth` structure
- Only activates on pages with both reading passages and questions
- Integrates seamlessly with existing Cambridge Bridge system

## Browser Compatibility
- Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- Touch-friendly for tablets
- Smooth animations with hardware acceleration

## Files Modified
- `assets/js/reading/layout-toggle.js` (new)
- `assets/js/cambridge/cambridge-layout-toggle.js` (new)
- All IELTS MOCKs reading.html files
- All Cambridge Part files across all levels

## Automation Scripts Created
- `add-layout-toggle-to-ielts.ps1` - Automated addition to IELTS tests
- `add-layout-toggle-to-cambridge.ps1` - Automated addition to Cambridge tests

## Testing Recommendations
1. Test resizer double-click in IELTS tests
2. Verify single-click drag still works for manual resizing
3. Verify all 5 layout modes work correctly
4. Check toast notifications appear and disappear
5. Test on different screen sizes
6. Verify Cambridge header button appears and functions
7. Check that layout toggle doesn't interfere with existing functionality

## Future Enhancements
- Remember user's preferred layout (localStorage)
- Keyboard shortcuts for layout switching
- Customizable layout percentages
- Animation speed preferences
- Layout preview thumbnails

