# Visual Guide: Question Marking & Highlighting

## Feature Overview

This guide shows you exactly what the marking and highlighting features look like and how to use them.

---

## 1. Question Navigation Footer (Before)

```
┌────────────────────────────────────────────────────────────────┐
│  Part 1: Reading & Writing                                     │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐                         │
│  │ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 │ │ 6 │   ← Plain buttons      │
│  └───┘ └───┘ └───┘ └───┘ └───┘ └───┘                         │
└────────────────────────────────────────────────────────────────┘
```

---

## 2. Answered Questions (Blue Indicator)

When you answer a question, a **blue bar** appears at the top:

```
┌────────────────────────────────────────────────────────────────┐
│  Part 1: Reading & Writing                                     │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐                         │
│  │▔▔▔│ │▔▔▔│ │   │ │▔▔▔│ │   │ │   │                         │
│  │ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 │ │ 6 │                         │
│  └───┘ └───┘ └───┘ └───┘ └───┘ └───┘                         │
│   ▲     ▲             ▲                                        │
│   Blue  Blue         Blue                                      │
│  (Answered questions)                                          │
└────────────────────────────────────────────────────────────────┘
```

**Questions 1, 2, and 4 have been answered** ✓

---

## 3. Marked Questions (Orange Indicator + Flag)

Right-click a question and select "Mark for Review":

```
┌────────────────────────────────────────────────────────────────┐
│  Part 1: Reading & Writing                                     │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐                         │
│  │▔▔▔│ │▔▔▔│ │▔▔▔│ │▔▔▔│ │   │ │   │                         │
│  │ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 │ │ 6 │  🚩                     │
│  └───┘ └───┘ └───┘ └───┘ └───┘ └───┘                         │
│   ▲     ▲     ▲     ▲                                          │
│   Blue  Blue Orange Orange                                     │
│              (Marked)                                          │
└────────────────────────────────────────────────────────────────┘
```

**Questions 3 and 4 are marked for review** 🚩

---

## 4. Context Menu (Right-Click)

Right-click on any question button:

```
     ┌───┐
     │ 5 │  ← Right-click here
     └───┘
        │
        └─────────────────────┐
                              ▼
              ┌───────────────────────────┐
              │  🚩 Mark for Review       │
              │  🗑️ Clear Answer          │
              └───────────────────────────┘
                    Context Menu
```

---

## 5. Complete Example

Here's what a real test session might look like:

```
┌────────────────────────────────────────────────────────────────────────┐
│  A2 Key – Reading & Writing              Timer: 55:30        [Submit]  │
├────────────────────────────────────────────────────────────────────────┤
│  Part Navigation: [1] [2] [3] [4] [5] [6] [7]                         │
│                    ▲                                                   │
│                  Active                                                │
├────────────────────────────────────────────────────────────────────────┤
│  Questions for Part 1:                                                 │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐                                │
│  │▔▔▔│ │▔▔▔│ │▔▔▔│ │▔▔▔│ │   │ │▔▔▔│                                │
│  │ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 │ │ 6 │  🚩  🚩                        │
│  └───┘ └───┘ └───┘ └───┘ └───┘ └───┘                                │
│   ✓     ✓     ?     ?           ✓                                     │
│  Blue  Blue Orange Orange      Blue                                   │
│                                                                        │
│  Status:                                                               │
│  • Questions 1, 2, 6: Answered ✓                                      │
│  • Questions 3, 4: Marked for review (uncertain) 🚩                   │
│  • Question 5: Not attempted yet                                       │
└────────────────────────────────────────────────────────────────────────┘
```

**Legend:**
- Blue bar = Answered
- Orange bar = Marked for review
- 🚩 = Flag icon (marked)
- No bar = Not attempted

---

## 6. How to Use: Step-by-Step

### Marking a Question

1. **Find the question** you want to mark in the footer navigation
   ```
   ┌───┐
   │ 3 │  ← This is question 3
   └───┘
   ```

2. **Right-click** on the button
   ```
   [Right-click]
        ↓
   ┌───┐
   │ 3 │
   └───┘
   ```

3. **Select "Mark for Review"**
   ```
   ┌───────────────────┐
   │ 🚩 Mark for Review │ ← Click here
   │ 🗑️ Clear Answer    │
   └───────────────────┘
   ```

4. **See the result**
   ```
   ┌───┐
   │▔▔▔│  ← Orange bar appears
   │ 3 │  🚩 ← Flag appears
   └───┘
   ```

### Unmarking a Question

1. **Right-click** the marked question
2. Select **"Unmark Question"**
3. Orange bar and flag disappear

### Clearing an Answer

1. **Right-click** on any question
2. Select **"Clear Answer"**
3. Your answer is removed
4. Blue indicator disappears

---

## 7. Color Reference

### Indicator Colors

```
┌─────────────────────────────────────┐
│  Color Meanings                     │
├─────────────────────────────────────┤
│  ▔▔▔▔▔  BLUE (#2196F3)             │
│         ↳ Question answered ✓       │
│                                     │
│  ▔▔▔▔▔  ORANGE (#FF9800)           │
│         ↳ Marked for review 🚩      │
│                                     │
│  _____  NO COLOR                    │
│         ↳ Not attempted yet         │
└─────────────────────────────────────┘
```

### Priority Rules

When a question is **both answered AND marked**:
- Orange takes priority
- Orange bar shows on top
- Flag still appears
- Blue indicator hidden (but answer is still saved)

```
Answered + Marked = 🚩 Orange bar (not blue)
```

---

## 8. Common Scenarios

### Scenario 1: Working Through a Test

```
Start of test:
┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐
│   │ │   │ │   │ │   │ │   │
│ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 │
└───┘ └───┘ └───┘ └───┘ └───┘

After answering Q1 and Q2:
┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐
│▔▔▔│ │▔▔▔│ │   │ │   │ │   │
│ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 │
└───┘ └───┘ └───┘ └───┘ └───┘

Unsure about Q3, mark it:
┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐
│▔▔▔│ │▔▔▔│ │▔▔▔│ │   │ │   │
│ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 │ 🚩
└───┘ └───┘ └───┘ └───┘ └───┘

Continue with Q4 and Q5:
┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐
│▔▔▔│ │▔▔▔│ │▔▔▔│ │▔▔▔│ │▔▔▔│
│ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 │ 🚩
└───┘ └───┘ └───┘ └───┘ └───┘

At the end, review Q3 (marked):
→ Go back to Q3
→ Review answer
→ Right-click → Unmark (if satisfied)
```

### Scenario 2: Review Strategy

**During Test:**
- Answer all questions you're confident about (they turn blue)
- Mark difficult questions with orange flag
- Skip impossible questions (leave blank)

**Review Phase:**
- Look for orange flags 🚩
- Review only those marked questions
- Unmark when satisfied
- Check any remaining blank questions

**Before Submit:**
```
Ideal state:
┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐
│▔▔▔│ │▔▔▔│ │▔▔▔│ │▔▔▔│ │▔▔▔│
│ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 │
└───┘ └───┘ └───┘ └───┘ └───┘
All blue = All answered ✓
No flags = Nothing marked for review ✓
```

---

## 9. Quick Reference Card

```
╔══════════════════════════════════════════════╗
║  QUICK REFERENCE                             ║
╠══════════════════════════════════════════════╣
║  ACTION          │  HOW TO DO IT             ║
╠══════════════════════════════════════════════╣
║  Mark question   │  Right-click → Mark       ║
║  Unmark          │  Right-click → Unmark     ║
║  Clear answer    │  Right-click → Clear      ║
║  See answered    │  Look for blue bars       ║
║  See marked      │  Look for orange + 🚩     ║
╚══════════════════════════════════════════════╝
```

---

## 10. Troubleshooting Visual Issues

### Can't see indicators?
```
✗ Wrong:  Looking at wrong part
✓ Right:  Check the footer navigation buttons

✗ Wrong:  Question not actually answered
✓ Right:  Make sure input has value

✗ Wrong:  Page needs refresh
✓ Right:  Press F5 to reload
```

### Context menu not showing?
```
✗ Wrong:  Left-clicking
✓ Right:  RIGHT-click on button

✗ Wrong:  Clicking on whitespace
✓ Right:  Click directly on number

✗ Wrong:  Touch/tap on mobile
✓ Right:  Use right-click (desktop only for now)
```

---

**Remember:** 
- 🔵 Blue = Answered
- 🟠 Orange = Marked
- 🚩 Flag = Needs review
- Right-click = Access all features

Happy testing! 🎓

