# Test Layout Toggle - Quick Guide

## ✅ FIXED! Ready to Test Now

Both IELTS and Cambridge layout toggles are now working correctly.

---

## 🧪 For IELTS Tests (e.g., MOCK 9)

### How to Use:
1. **Open any reading test** (like the MOCK 9 you have open)
2. Find the **resizer** (vertical bar in the middle of the screen)
3. **DOUBLE-CLICK** (click twice quickly) on the resizer
4. Watch the layout change!
5. A toast message will show which layout you're in

### What You Should See:
- First double-click: **Reading Focus** (70/30)
- Second double-click: **Questions Focus** (30/70)
- Third double-click: **Full Reading** (95/5)
- Fourth double-click: **Full Questions** (5/95)
- Fifth double-click: Back to **50/50 Split**

### Console Logs:
Press F12 to open console, you should see:
```
✅ Layout Toggle initialized - Double-click the resizer to toggle layouts
📐 Layout: Reading Focus
```

---

## 🧪 For Cambridge Tests (e.g., Part 3)

### How to Use:
1. **Refresh the page** (F5) to load the updated script
2. Look for the **columns icon button** (📊) in the top-right header
   - It's next to the WiFi, Messages, and Options buttons
3. **Click the button once** to toggle
4. Each click cycles through 5 layout modes
5. Watch the icon change and see the toast notification

### What You Should See in Console:
Press F12, you should now see:
```
📐 Detected Part 3+ style layout (resizable split-view)
✅ Cambridge Layout Toggle initialized
```

Instead of:
```
📐 Cambridge Layout Toggle: Not applicable for this page  ← OLD ERROR
```

### Header Button:
Look in the top-right corner for this button:
```
[WiFi] [Bell] [Bars] [Notes] [📊 COLUMNS] ← NEW BUTTON!
```

---

## 🎯 Quick Test Checklist

### IELTS:
- [ ] Open MOCK 9 reading.html
- [ ] Find resizer in middle of screen
- [ ] Double-click the resizer
- [ ] See layout change
- [ ] See toast notification

### Cambridge:
- [ ] Open Part 3.html
- [ ] Press F5 to refresh
- [ ] Check console for "Detected Part 3+ style layout"
- [ ] Look for columns button in header
- [ ] Click the button
- [ ] See layout change
- [ ] See toast notification

---

## 🐛 Troubleshooting

### "Button not appearing in Cambridge"
- **Refresh the page** (F5) - scripts may be cached
- Check console - should see "Detected Part..." message
- Make sure you're on Parts 1-5 (not 6 or 7)

### "Double-click not working in IELTS"
- Click faster - both clicks within 0.5 seconds
- Click directly on the resizer handle
- Check console for "Layout Toggle initialized" message

### "Still seeing old error messages"
- **Hard refresh**: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
- Clear browser cache
- Close and reopen the browser

---

## 📹 Step-by-Step for Cambridge Part 3

1. **Open** `Cambridge/MOCKs-Cambridge/A2-Key/Part 3.html` in browser
2. **Press F12** to open Developer Console
3. **Press F5** to refresh the page
4. **Look at console logs** - should see:
   ```
   📐 Detected Part 3+ style layout (resizable split-view)
   ✅ Cambridge Layout Toggle initialized
   ```
5. **Look at top-right** of the screen - see the columns icon button
6. **Click the button** - layout should change!
7. **Click again** - cycles to next layout mode
8. **See toast** - small notification at bottom showing mode name

---

**Everything is now fixed and ready to use!** 🚀

If it still doesn't work after refreshing, let me know what error messages you see in the console.

