# Autosave Testing & Debugging Guide

## 🔧 Recent Fixes Applied

### Problem Identified
Answers were being lost when switching between parts because:
- The debounced save (500ms delay) wasn't completing before navigation
- The 100ms wait time was insufficient for saves to complete

### Solution Implemented
1. **Force-Save Function**: Added `__A2_forceSaveAll()` that bypasses debouncing
2. **Synchronous Saves**: All saves complete immediately before part switching
3. **Multiple Save Triggers**: Save on every possible navigation event
4. **Debug Logging**: Added console messages to track save/restore operations

---

## 🧪 How to Test the Autosave

### Test 1: Basic Autosave
1. Open the Reading & Writing test
2. Answer Question 1 (select a radio button)
3. **Open Browser Console** (F12 → Console tab)
4. You should see: `💾 Force-saved 1 answer(s) to localStorage` (within 500ms)
5. Answer Question 2
6. You should see another save message

✅ **Expected**: Each answer triggers a save message in console

---

### Test 2: Part Switching with Autosave
1. Go to Part 1
2. Answer questions 1, 2, and 3
3. **Open Console** (F12)
4. Click the **"2"** button to switch to Part 2
5. **Watch console** - you should see:
   ```
   ✓ Force-saved all answers before switching to Part 2
   💾 Force-saved 3 answer(s) to localStorage
   ```
6. Switch back to Part 1 (click "1" button)
7. **Watch console** - you should see:
   ```
   📂 Restored 3 saved answer(s) from localStorage
   ```

✅ **Expected**: Answers are saved before switching and restored when returning

---

### Test 3: Text Field Autosave
1. Go to Part 5 (which has text input fields)
2. Type some text in a gap-fill question
3. **Wait 1 second** (don't click anywhere)
4. **Check console** - you should see:
   ```
   💾 Force-saved 1 answer(s) to localStorage
   ```
5. Switch to Part 6, then back to Part 5
6. Your text should still be there

✅ **Expected**: Text fields save automatically while typing

---

### Test 4: Browser Crash Recovery
1. Start the test
2. Answer several questions across different parts
3. **Force close the browser** (Alt+F4 or close window)
4. **Reopen browser** and go back to the test
5. Navigate to the parts where you answered questions
6. **Check console** when each part loads - you should see:
   ```
   📂 Restored X saved answer(s) from localStorage
   ```

✅ **Expected**: All answers survive browser closure

---

### Test 5: Tab Switch Autosave
1. Answer some questions
2. **Switch to another browser tab** (Ctrl+Tab)
3. **Check console** before switching - should show save
4. Switch back to test tab
5. Answers should still be there

✅ **Expected**: Switching tabs triggers autosave

---

## 🔍 Understanding Console Messages

### Save Messages

| Message | Meaning |
|---------|---------|
| `💾 Force-saved X answer(s)` | Immediate save triggered (bypassed debounce) |
| `✓ Force-saved all answers before switching to Part X` | Save completed before navigation |
| `✓ Saved answers before navigating to question X` | Save triggered by question jump |

### Restore Messages

| Message | Meaning |
|---------|---------|
| `📂 Restored X saved answer(s)` | Answers loaded from localStorage on page load |

### Warning Messages

| Message | Meaning | Action |
|---------|---------|--------|
| `⚠ Force save function not available` | Autosave script not loaded in iframe | Refresh page |
| `Unable to force save before part switch` | Cross-origin or iframe access error | Check if running from file:// (use http:// instead) |

---

## 🐛 Debugging Lost Answers

If answers are still being lost, follow these steps:

### Step 1: Check Console for Errors
1. Open browser console (F12)
2. Answer a question
3. Look for **any red errors**
4. Take a screenshot and report

### Step 2: Verify LocalStorage
1. Open browser console (F12)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Click **Local Storage** → your site URL
4. Look for key: `reading-writingAnswers`
5. Click on it - you should see JSON with your answers:
   ```json
   {
     "1": "A",
     "2": "B",
     "3": "C"
   }
   ```

### Step 3: Test Save Function Manually
1. Open console (F12)
2. Answer a question
3. Type in console:
   ```javascript
   window.__A2_forceSaveAll()
   ```
4. Press Enter
5. You should see: `💾 Force-saved X answer(s)`
6. If you see `undefined`, the function isn't loading

### Step 4: Check Iframe Access
1. Open console
2. Type:
   ```javascript
   document.getElementById('part-frame').contentDocument
   ```
3. If you see an error about "cross-origin" or "blocked", the iframe is blocking access
4. **Solution**: Make sure you're running from `http://localhost` not `file://`

---

## 📊 Expected Console Output During Normal Use

When working through the test, your console should look like this:

```
🔄 Seamless autosave enabled - answers saved continuously
🎓 Cambridge A2 Key - Part 1 Loaded
✅ IELTS Universal Functions: Available
✅ Cambridge Bridge: Available
📂 Restored 0 saved answer(s) from localStorage

[User selects answer to Q1]
💾 Force-saved 1 answer(s) to localStorage

[User selects answer to Q2]
💾 Force-saved 2 answer(s) to localStorage

[User clicks Part 2 button]
✓ Force-saved all answers before switching to Part 2
💾 Force-saved 2 answer(s) to localStorage

🎓 Cambridge A2 Key - Part 2 Loaded
📂 Restored 2 saved answer(s) from localStorage
```

---

## 🎯 Key Save Triggers

The autosave system saves answers in these situations:

### Immediate Saves
- ✅ Radio button selected
- ✅ Clicking part switcher buttons (1-7)
- ✅ Clicking question navigation buttons
- ✅ Clicking prev/next arrows (if switching parts)

### Delayed Saves (500ms debounce)
- ✅ Typing in text fields
- ✅ Typing in textareas

### Periodic Saves
- ✅ Every 3 seconds (background coordinator)
- ✅ Every 5 seconds (within iframe)

### Critical Saves
- ✅ Browser tab hidden/minimized
- ✅ Window closing
- ✅ Page unload

---

## 💡 Tips for Testing

1. **Always have console open** when testing
2. **Look for save messages** after each action
3. **Test across multiple parts** - don't just test Part 1
4. **Test text fields** in Part 5 (gap-fill questions)
5. **Test with slow typing** - wait between keystrokes
6. **Force close browser** to test crash recovery

---

## 🆘 Common Issues & Solutions

### Issue: No console messages appearing
**Solution**: 
- Refresh the page
- Make sure you're in the "Console" tab (F12)
- Clear console and try again (🚫 icon in console)

### Issue: "Force save function not available" warning
**Solution**:
- The script hasn't loaded yet - wait a few seconds
- Refresh the page
- Check if all script files are loading (Network tab in F12)

### Issue: Answers save but don't restore
**Solution**:
- Check localStorage (Application tab → Local Storage)
- Look for `reading-writingAnswers` key
- If it exists with data but answers don't restore, the restore logic may be failing
- Check console for JavaScript errors

### Issue: Answers only save for some questions
**Solution**:
- The question number detection may be failing
- Check console when answering - you should see save messages
- If no save message appears, the question number can't be determined

---

## 📧 Reporting Issues

If autosave is still not working after following this guide, please report:

1. **Browser** (Chrome, Firefox, Edge, etc.)
2. **Which part** the problem occurs in (1-7)
3. **Question numbers** that don't save
4. **Console screenshots** showing errors
5. **LocalStorage screenshot** (Application tab)
6. **Steps to reproduce**

---

## ✅ Success Criteria

Autosave is working correctly if:
- ✅ Console shows save messages after answering
- ✅ Console shows restore messages when loading parts
- ✅ Answers persist after switching parts
- ✅ Answers persist after refreshing page (F5)
- ✅ Answers persist after closing/reopening browser
- ✅ No errors in console
- ✅ LocalStorage contains `reading-writingAnswers` with JSON data

---

**Last Updated**: October 31, 2025  
**Version**: 2.1 - Force-Save Edition with Debug Logging

