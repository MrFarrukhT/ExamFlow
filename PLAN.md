# Cambridge V2 System Restructure

## Overview

Restructure the Cambridge test system to match the quality and structure of the IELTS MOCK system, creating a clean, organized, and user-friendly testing experience.

## Current Issues

- Multiple separate HTML files (Part 1.html through Part 7.html) for A2-Key
- Uses iframe-based navigation which is slow and clunky
- No answer key files
- Inconsistent structure across test levels
- External dependencies causing issues
- No proper folder organization with MOCK subdirectories

## Target Structure

### For A1-Movers and A2-Key (Combined Reading & Writing)

```
Cambridge/MOCKs-Cambridge/A2-Key/
  └── MOCK 1/
      ├── reading-writing.html (single file with all 7 parts)
      ├── listening.html
      └── answers/
          ├── listening-answers.js
          ├── reading-answers.js (for reading parts 1-5)
          └── writing-answers.js (for writing parts 6-7)
```

### For B1-Preliminary and B2-First (Separate Reading & Writing)

```
Cambridge/MOCKs-Cambridge/B1-Preliminary/
  └── MOCK 1/
      ├── reading.html
      ├── writing.html
      ├── listening.html
      └── answers/
          ├── listening-answers.js
          ├── reading-answers.js
          └── writing-answers.js
```

## Implementation Steps

### Phase 1: A2-Key Restructure (Priority)

#### 1. Create MOCK 1 folder structure

- Create `Cambridge/MOCKs-Cambridge/A2-Key/MOCK 1/` directory
- Create `answers/` subdirectory
- Move/copy image assets to MOCK 1 folder

#### 2. Extract content from Part 1-7.html files

Extract the main content sections from each Part file:

- `Part 1.html` - Questions 1-6 (image-based MCQ)
- `Part 2.html` - Questions 7-13 (reading passage + questions)
- `Part 3.html` - Questions 14-18 (reading passage + questions)
- `Part 4.html` - Questions 19-24 (multiple choice cloze)
- `Part 5.html` - Questions 25-30 (open cloze)
- `Part 6.html` - Question 31/32 (email writing task)
- `Part 7.html` - Question 32/33 (story writing with pictures)

Key files to examine: `Cambridge/MOCKs-Cambridge/A2-Key/Part 1.html` through `Part 7.html`

#### 3. Create unified reading-writing.html

Build a single file following IELTS MOCK structure:

- Use `MOCKs/MOCK 1/reading.html` as structural template
- Header with logo, timer, test taker info (matching IELTS style from lines 15-45)
- Part containers with `display: none` for inactive parts
- Footer navigation with Part buttons and question numbers
- Navigation arrows for previous/next

Structure:

```html
<div class="main-container">
  <div class="panels-container">
    <div class="passage-panel">
      <div id="part-1" class="part-container active">
        <!-- Part 1 content -->
      </div>
      <div id="part-2" class="part-container hidden">
        <!-- Part 2 content -->
      </div>
      <!-- ... Parts 3-7 -->
    </div>
    <div class="questions-panel">
      <!-- Questions displayed inline with content -->
    </div>
  </div>
</div>
```

#### 4. Implement JavaScript navigation

Create navigation system matching IELTS functionality:

- `switchToPart(partNumber)` - Show/hide parts
- `goToQuestion(questionNumber)` - Navigate to specific question
- `nextPart()` / `previousPart()` - Arrow navigation
- Track answered questions and update footer counts
- Session management and answer persistence

Reference: `assets/js/universal-functions.js` and `assets/js/core.js`

#### 5. Create answer key files

Generate three answer files in `MOCK 1/answers/`:

**reading-answers.js** (Parts 1-5, Questions 1-30):

```javascript
window.readingAnswers = {
  '1': 'C',
  '2': 'A',
  // ... all reading answers
};
```

**writing-answers.js** (Parts 6-7, Questions 31-33):

```javascript
window.writingAnswers = {
  // Sample answers or rubric criteria
};
```

**listening-answers.js** - To be created when listening tests are added

#### 6. Apply IELTS-quality CSS

Use existing CSS from `assets/css/`:

- Link to `assets/css/reading.css` or create `assets/css/cambridge.css`
- Ensure responsive design
- Match IELTS visual quality and spacing
- Proper typography and colors

#### 7. Update asset paths

Fix all image and resource references:

- Ensure paths point correctly to images (currently in Part X_files/)
- Consolidate assets into proper structure
- Update CSS and JS paths to use `../../../assets/`

### Phase 2: A1-Movers (Same approach as A2-Key)

Apply same process to A1-Movers level with combined reading-writing.html

### Phase 3: B1-Preliminary Restructure

#### 1. Create MOCK 1 folder structure

Same as A2-Key but with separate reading and writing

#### 2. Create separate reading.html and writing.html

- Extract reading content from existing files
- Extract writing content separately
- Follow IELTS MOCK structure for both files

#### 3. Create answer files

Same structure as Phase 1 but with separate concerns

### Phase 4: B2-First Restructure

Same approach as B1-Preliminary

### Phase 5: Integration & Testing

#### 1. Update launcher/dashboard

- Update `Cambridge/launcher-cambridge.html` to point to new MOCK structure
- Update `Cambridge/dashboard-cambridge.html` with proper navigation
- Ensure session management works correctly

#### 2. Clean up old files

- Remove old Part 1-7.html files after verification
- Remove old reading-writing.html iframe version
- Archive or delete `_files` directories if no longer needed

#### 3. Test all functionality

- Test navigation between parts
- Verify answer submission works
- Check timer functionality
- Verify all images load correctly
- Test on different screen sizes
- Ensure session management works

## Key Files to Modify/Create

**New Files:**

- `Cambridge/MOCKs-Cambridge/A2-Key/MOCK 1/reading-writing.html`
- `Cambridge/MOCKs-Cambridge/A2-Key/MOCK 1/answers/reading-answers.js`
- `Cambridge/MOCKs-Cambridge/A2-Key/MOCK 1/answers/writing-answers.js`
- Similar structure for A1-Movers, B1-Preliminary, B2-First

**Reference Files:**

- `MOCKs/MOCK 1/reading.html` - Structure template
- `MOCKs/MOCK 1/listening.html` - Header/footer template
- `MOCKs/MOCK 1/answers/reading-answers.js` - Answer key format
- `assets/js/universal-functions.js` - Navigation functions
- `assets/css/reading.css` - Styling template

## Success Criteria

- Single HTML file for A1/A2 tests with smooth JavaScript navigation
- Separate HTML files for B1/B2 tests
- All tests follow IELTS MOCK quality standards
- Clean folder structure with MOCK subdirectories
- Answer keys in proper format
- No external dependencies or broken links
- Fast, responsive navigation between parts
- Consistent visual design matching IELTS system