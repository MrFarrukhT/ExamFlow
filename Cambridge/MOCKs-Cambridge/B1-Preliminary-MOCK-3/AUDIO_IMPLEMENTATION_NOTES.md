# A2 Key Listening - Background Audio Implementation

## Overview
The A2 Key listening test now features background audio playback similar to the IELTS listening system. The audio plays continuously in the background while students navigate between different parts of the test.

## Key Features

### 1. Global Audio Player
- Audio player is managed at the container level (`listening.html`)
- Continues playing even when students switch between parts
- Uses IELTS MOCK 2 audio temporarily (path: `../../../MOCKs/MOCK 2/IC002 Listening (mp3cut.net).mp3`)
- Can be replaced with A2 Key specific audio later

### 2. Audio Start Popup
- Displays a professional popup before the test starts
- Features:
  - Headphone icon
  - Clear instructions about non-pausable audio
  - Play button to start the test
  - Only shows once at the beginning

### 3. Audio Controls Prevention
- Students cannot pause, rewind, or control audio
- Keyboard shortcuts disabled (Media keys, Ctrl+M, Spacebar)
- Right-click on audio element disabled
- Ensures fair test conditions

### 4. Session Persistence
- Uses `localStorage` to track if audio has started
- If student refreshes or navigates back, popup doesn't reappear
- Audio continues from where it was

## Files Modified

### 1. `listening.html` (Container)
**Changes:**
- Added audio popup overlay with styling
- Added global `<audio>` element with IELTS audio source
- Implemented `startListeningTest()` function
- Added keyboard shortcut prevention
- Added navigation message listener for iframe communication

### 2. `Listening-Part-1.html`
**Changes:**
- Removed local audio player (now uses parent's global player)
- Removed audio popup (managed by parent)
- Removed audio-related JavaScript functions
- Removed audio-related CSS styles
- Kept all question functionality intact

## How It Works

1. **Initial Load:**
   - Container (`listening.html`) loads with audio popup visible
   - Part 1 iframe loads inside the container
   
2. **Starting Audio:**
   - Student clicks "Play" button on popup
   - Popup hides, audio starts playing
   - `listeningTestStarted` flag set in localStorage
   
3. **Navigation:**
   - Student can navigate between parts using footer buttons
   - Audio continues playing in background
   - Each part iframe communicates with parent via `postMessage`
   
4. **Persistence:**
   - If page reloads, checks `listeningTestStarted` flag
   - Hides popup if test already started
   - Attempts to resume audio if applicable

## Auto-Navigation Feature (Optional)

The container includes commented code for automatic part navigation based on audio timestamps:

```javascript
// Example timestamps (adjust based on actual audio):
// Part 1: 0:00 - 10:00
// Part 2: 10:00 - 20:00
// Part 3: 20:00 - 30:00
```

To enable, uncomment the `timeupdate` event listener code and set appropriate timestamps.

## Completed Updates

All listening part files have been updated:
- ✅ `Listening-Part-1.html` - Cleaned up
- ✅ `Listening-Part-2.html` - Cleaned up
- ✅ `Listening-Part-3.html` - Already clean (minimal audio references)
- ✅ `Listening-Part-4.html` - Already clean (minimal audio references)
- ✅ `Listening-Part-5.html` - Cleaned up

Removed from each applicable part:
- ✅ Local audio player elements
- ✅ Audio popup HTML
- ✅ Audio-related JavaScript functions
- ✅ Audio-related CSS styles

## Replacing Audio File

When A2 Key specific audio is ready:

1. Replace the source in `listening.html`:
```html
<audio id="global-audio-player" preload="auto" style="display: none;">
  <source src="YOUR_A2_KEY_AUDIO_PATH_HERE.mp3" type="audio/mpeg">
</audio>
```

2. If different parts have separate audio files, modify the logic to handle multiple sources or use timestamps to navigate parts automatically.

## Benefits

✅ Consistent experience like IELTS
✅ Audio can't be paused or manipulated
✅ Professional test environment
✅ Easy to maintain (audio managed in one place)
✅ Works across all parts seamlessly

## Testing Checklist

- [ ] Audio popup appears on first load
- [ ] Audio starts when "Play" is clicked
- [ ] Popup doesn't reappear after starting
- [ ] Audio continues when navigating between parts
- [ ] Keyboard shortcuts don't affect audio
- [ ] Right-click on audio is disabled
- [ ] Answers save correctly in all parts
- [ ] Submit button works at the end

---

**Implementation Date:** November 9, 2025
**Status:** ✅ COMPLETE - All parts updated with background audio system

