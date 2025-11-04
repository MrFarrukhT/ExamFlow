# Cambridge A2 Key - Listening Section

## Overview
This directory contains a complete listening section for the Cambridge A2 Key (KET) exam, created to match the structure and format of the existing reading-writing section.

## Files Created

### Main File
- **listening.html** - Main wrapper file that loads listening parts in an iframe (similar to reading-writing.html)

### Test Parts
1. **Listening-Part-1.html** - Questions 1-5 (Multiple Choice - Short Conversations)
2. **Listening-Part-2.html** - Questions 6-11 (Gap Fill / Note Completion)
3. **Listening-Part-3.html** - Questions 12-16 (Multiple Choice - Longer Conversation)
4. **Listening-Part-4.html** - Questions 17-21 (Multiple Choice - Monologue)
5. **Listening-Part-5.html** - Questions 22-26 (Matching Task)

### Answer Key
- **answers/listening-answers.json** - Contains correct answers for all parts

## Structure

### Part 1 (Questions 1-5)
- **Type:** Multiple Choice
- **Format:** Short conversations/announcements
- **Questions:** 5
- **Options:** A, B, C per question

### Part 2 (Questions 6-11)
- **Type:** Gap Fill / Note Completion
- **Format:** Form filling / note-taking from telephone conversation
- **Questions:** 6
- **Answer Format:** One word, number, date, or time

### Part 3 (Questions 12-16)
- **Type:** Multiple Choice
- **Format:** Longer conversation between two people
- **Questions:** 5
- **Options:** A, B, C per question

### Part 4 (Questions 17-21)
- **Type:** Multiple Choice
- **Format:** Monologue or announcement
- **Questions:** 5
- **Options:** A, B, C per question

### Part 5 (Questions 22-26)
- **Type:** Matching
- **Format:** Five short conversations to match with options
- **Questions:** 5
- **Options:** 8 options (A-H) to choose from

## Features

### Integrated Features
✅ Audio player with play, pause, and restart controls
✅ Automatic answer saving to localStorage
✅ Question progress tracking (answered/unattempted)
✅ Part navigation in footer
✅ Previous/Next navigation buttons
✅ Submit/Deliver button with confirmation
✅ Timer (30 minutes for complete listening test)
✅ Responsive design matching Cambridge style
✅ Universal functions integration (messages, options, notes buttons)
✅ Session verification
✅ Distraction-free mode support

### Styling
- Matches the existing Cambridge A2 Key reading-writing design
- CEQ theme styling
- Clean, modern interface
- Accessibility features (ARIA labels, screen reader support)

## Audio Files Required

The listening section requires audio files to be placed in the following location:
```
assets/audio/
├── a2-key-listening-part1.mp3
├── a2-key-listening-part2.mp3
├── a2-key-listening-part3.mp3
├── a2-key-listening-part4.mp3
└── a2-key-listening-part5.mp3
```

**Note:** Audio files are NOT included. You will need to:
1. Record or obtain appropriate audio for each part
2. Place the MP3 files in the `assets/audio/` directory
3. Ensure file names match exactly as listed above

## Test Timing
- **Total Duration:** 30 minutes (1800 seconds)
- **Timer:** Automatically counts down
- **Pause/Resume:** Available via timer controls

## Data Storage
All answers are saved to localStorage under the key: `listeningAnswers`

Format:
```javascript
{
  "L1": "A",
  "L2": "B",
  "L6": "John Smith",
  // ... etc
}
```

## Integration with Dashboard

The listening section integrates with the Cambridge dashboard:
- Status: `listeningStatus` (in-progress/completed)
- Start Time: `listeningStartTime`
- End Time: `listeningEndTime`
- Answers: `listeningAnswers`

## How to Use

### For Students:
1. Open `listening.html` in a browser
2. The test starts automatically
3. Listen to audio and answer questions
4. Navigate between parts using footer buttons
5. Submit test when complete

### For Teachers/Administrators:
1. Add appropriate audio files to `assets/audio/`
2. Customize questions if needed
3. Adjust answer key in `answers/listening-answers.json`
4. Access dashboard to view student results

## Answer Marking

### Mark Scheme:
- **Total Marks:** 26
- **Pass Mark:** 13 (50%)
- **Grade A:** 23-26 marks (88-100%)
- **Grade B:** 18-22 marks (69-85%)
- **Grade C:** 13-17 marks (50-65%)

## Dependencies

### JavaScript Files:
- `assets/js/universal-functions.js`
- `assets/js/cambridge/cambridge-bridge.js`
- `assets/js/distraction-free.js`
- `assets/js/cambridge/cambridge-answer-manager.js`
- `assets/js/cambridge/question-marking.js`
- `assets/js/cambridge/session-verify.js`

### CSS Files:
- `assets/css/base.css`
- `assets/css/universal-popup-styles.css`
- `A2 Key RW Digital Sample Test 1_26.04.23_files/player.css`

## Browser Compatibility
- Chrome (recommended)
- Firefox
- Edge
- Safari
- Requires JavaScript enabled
- Requires HTML5 audio support

## Future Enhancements
- [ ] Add audio transcripts for accessibility
- [ ] Implement audio playback speed controls
- [ ] Add section-by-section audio replay
- [ ] Create alternative audio options for different difficulty levels
- [ ] Add visual timer warnings (e.g., 5 minutes remaining)

## Support
For issues or questions:
1. Check that all audio files are properly placed
2. Verify localStorage is enabled in browser
3. Check browser console for errors
4. Ensure all dependency files are present

## Version
- Version: 1.0
- Created: November 2025
- Compatible with: Cambridge A2 Key format 2024-2025

## License
This is a mock test created for educational purposes. Cambridge English and A2 Key are trademarks of Cambridge Assessment English.

