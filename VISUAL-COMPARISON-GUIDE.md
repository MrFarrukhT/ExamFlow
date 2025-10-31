# 📸 Visual Comparison Guide - IELTS vs Cambridge

## 🎯 Purpose
This guide helps you verify that Cambridge test pages now look **IDENTICAL** to IELTS test pages for all universal features.

---

## 🔍 What to Compare

### 1. **Options Menu** (Hamburger Icon)

**IELTS File:** `MOCKs/MOCK 1/reading.html`  
**Cambridge File:** `Cambridge/MOCKs-Cambridge/A2-Key/Part 2.html`

#### Expected Appearance:
```
┌─────────────────────────────────────────┐
│  Options                            × │
├─────────────────────────────────────────┤
│  🚀 Go to submission page           › │  <- RED BACKGROUND
├─────────────────────────────────────────┤
│  ◐ Contrast                         › │
├─────────────────────────────────────────┤
│  🔍 Text size                       › │
└─────────────────────────────────────────┘
```

**Should be identical in both IELTS and Cambridge!**

---

### 2. **Contrast Menu (Dark Mode)**

**How to Access:**
1. Click hamburger menu (☰)
2. Click "Contrast"

#### Expected Appearance:
```
┌─────────────────────────────────────────┐
│  ← Back         Contrast            × │
├─────────────────────────────────────────┤
│                                          │
│  ┌──────────────┐   ┌──────────────┐  │
│  │              │   │              │  │
│  │ White on     │   │ White on     │  │
│  │ white        │   │ black        │  │  <- BLACK BOX
│  │              │   │              │  │
│  └──────────────┘   └──────────────┘  │
│                                          │
└─────────────────────────────────────────┘
```

**Click "White on black"** and verify:

---

### 3. **Dark Mode Appearance**

#### BEFORE (Incomplete Dark Mode)
```
┌────────────────────────────────────────────┐
│  ⚠️ Problems:                              │
│  - Scrollbars invisible or default         │
│  - Some text still black                   │
│  - Question buttons wrong colors           │
│  - Logo doesn't switch                     │
│  - Icons still black                       │
└────────────────────────────────────────────┘
```

#### AFTER (Complete Dark Mode) ✅
```
┌────────────────────────────────────────────┐
│  ⬛ Header: Black with white text          │
│  🖼️ Logo: WHITE version (switches auto)    │
│  ⏱️ Timer: White text                      │
│  📶 Icons: All white                       │
├────────────────────────────────────────────┤
│  ⬛ Reading Passage:                       │
│     - Background: Pure black (#000000)     │
│     - Text: Pure white (#ffffff)           │
│     - Scrollbar: WHITE/VISIBLE             │
│                                             │
│  ⬛ Questions Panel:                       │
│     - Background: Pure black (#000000)     │
│     - Text: Pure white (#ffffff)           │
│     - Input fields: Black with white text  │
│     - Scrollbar: WHITE/VISIBLE             │
├────────────────────────────────────────────┤
│  ⬛ Navigation Bar (Bottom):               │
│     ┌──────┐ ┌──────┐ ┌──────┐           │
│     │ [1] │ │ [2] │ │ [3] │           │
│     └──────┘ └──────┘ └──────┘           │
│     Unanswered: Black with white border    │
│                                             │
│     ┌──────┐                               │
│     │ [4] │  <- Answered: Dark gray        │
│     └──────┘                               │
│                                             │
│     ┌──────┐                               │
│     │ [5] │  <- Active: Dark blue          │
│     └──────┘                               │
└────────────────────────────────────────────┘
```

---

### 4. **Scrollbars in Dark Mode** (Critical!)

#### What to Look For:
1. Enable dark mode
2. Scroll through reading passage
3. **Expected:** Scrollbar should be **VISIBLE** and **WHITE/LIGHT COLORED**

#### Technical Details:
- **Background:** rgba(255, 255, 255, 0.1) - Light gray
- **Thumb:** rgba(255, 255, 255, 0.8) - White/very light
- **Width:** 100px (thick, easy to see)
- **Hover:** rgba(255, 255, 255, 0.5) - Slightly darker

**This was the MAIN missing piece!**

---

### 5. **Text Size Menu**

**How to Access:**
1. Click hamburger menu (☰)
2. Click "Text size"

#### Expected Appearance:
```
┌─────────────────────────────────────────┐
│  ← Back         Text size           × │
├─────────────────────────────────────────┤
│                                          │
│  ┌─────┐  ┌─────────┐  ┌──────────┐   │
│  │Small│  │ Medium │  │  Large  │   │
│  │     │  │        │  │         │   │
│  └─────┘  └─────────┘  └──────────┘   │
│   14px       16px         18px         │
│                                          │
└─────────────────────────────────────────┘
```

**Click each and verify text resizes!**

---

### 6. **Context Menu (Right-Click)**

**How to Access:**
1. Select any text in reading passage
2. Right-click

#### Expected Appearance (Light Mode):
```
┌─────────────────┐
│ Highlight       │
├─────────────────┤
│ Note            │
├─────────────────┤
│ Clear           │
├─────────────────┤
│ Clear All       │
└─────────────────┘
```

**Click "Highlight":**
- Light mode: **Yellow** (#ffff00)
- Dark mode: **Light blue** (#87ceeb)

---

### 7. **Question Button States**

**In Navigation Bar (Bottom):**

| State | Light Mode | Dark Mode |
|-------|-----------|-----------|
| **Unanswered** | White with gray border | Black with white border |
| **Answered** | Light gray | Dark gray (#2a2a2a) |
| **Active** | Blue (#4a90e2) | Dark blue (#003366) |
| **Correct** | Green | Dark green (#004d00) |
| **Incorrect** | Red | Dark red (#660000) |

---

## ✅ Checklist for Testing

### Open Both Files:
- [ ] `MOCKs/MOCK 1/reading.html` (IELTS)
- [ ] `Cambridge/MOCKs-Cambridge/A2-Key/Part 2.html` (Cambridge)

### Test Each Feature:
- [ ] Options menu appearance
- [ ] Dark mode activation
- [ ] Dark mode scrollbars (visible?)
- [ ] Dark mode text (all white?)
- [ ] Dark mode navigation (proper colors?)
- [ ] Dark mode logo (switches to white?)
- [ ] Dark mode icons (all white?)
- [ ] Text size changes
- [ ] Context menu
- [ ] Highlighting (yellow in light, blue in dark)
- [ ] Question button states

### Cross-Browser Testing:
- [ ] Chrome
- [ ] Edge
- [ ] Firefox

### Cross-Page Persistence:
- [ ] Enable dark mode in Part 2
- [ ] Navigate to Part 3
- [ ] Verify dark mode persists
- [ ] Try the same with text size

---

## 🐛 If You Find Differences

1. **Take a screenshot** of both IELTS and Cambridge side-by-side
2. **Note the specific feature** that's different
3. **Check the browser console** for any JavaScript errors
4. **Verify the CSS file path** is correct:
   ```html
   <link rel="stylesheet" href="../../../assets/css/universal-popup-styles.css">
   ```

---

## 🎯 Expected Outcome

**After this update, you should NOT be able to tell the difference between IELTS and Cambridge** when it comes to:
- Options menu styling
- Dark mode (white on black)
- Text size
- Highlighting
- Context menu

**They should look and feel IDENTICAL!** ✨

---

## 📊 Success Criteria

| Feature | IELTS | Cambridge | Match? |
|---------|-------|-----------|--------|
| Options Menu | ✅ | ✅ | ✅ |
| Dark Mode Background | ✅ | ✅ | ✅ |
| Dark Mode Text | ✅ | ✅ | ✅ |
| Dark Mode Scrollbars | ✅ | ✅ | ✅ |
| Dark Mode Navigation | ✅ | ✅ | ✅ |
| Dark Mode Icons | ✅ | ✅ | ✅ |
| Text Size | ✅ | ✅ | ✅ |
| Context Menu | ✅ | ✅ | ✅ |
| Highlighting | ✅ | ✅ | ✅ |

**All checkmarks = Success!** 🎉

