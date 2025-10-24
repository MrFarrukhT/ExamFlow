# Combine All 7 Parts into Single HTML File

## Overview

Transform `reading-writing.html` into a unified test file containing all 7 parts (Parts 1-7) with dynamic JavaScript navigation that shows/hides content based on user clicks in the footer navigation.

## Implementation Steps

### 1. Extract Content Sections from Each Part File

From each Part file (Part 1.html through Part 7.html), extract the main content section:

- **Location**: Between `<div id="appContentContainer"` and `</div><div class="App__footerWrapper___2el50">`
- This includes the entire question display wrapper and content for each part

**Part structures:**

- Part 1: Questions 1-6 (image-based MCQ, single column layout)
- Part 2: Questions 7-13 (reading passage left, questions right, split layout)
- Part 3: Questions 14-18 (reading passage left, questions right, split layout)
- Part 4: Questions 19-24 (multiple choice cloze)
- Part 5: Questions 25-30 (open cloze/gap fill)
- Part 6: Question 31/32 (writing section with email prompt)
- Part 7: Question 32/33 (writing section with story pictures)

### 2. Wrap Each Part in Container Divs

Wrap each extracted content section in a container:

```html
<div class="part-container" id="part-1" data-part="1">
  <!-- Part 1 content here -->
</div>
<div class="part-container" id="part-2" data-part="2" style="display: none;">
  <!-- Part 2 content here -->
</div>
<!-- ... repeat for all 7 parts -->
```

### 3. Modify reading-writing.html Structure

In `reading-writing.html`:

- Replace the current single content section (currently Part 1 copy) with all 7 wrapped part containers
- Keep the header unchanged
- Keep the footer navigation unchanged
- Insert all part containers between the header closing tag and footer opening tag

### 4. Add Navigation JavaScript

Add a `<script>` tag before the closing `</body>` tag with JavaScript to:

**Core functionality:**

- Listen for clicks on Part buttons (`.footer__questionNo___3WNct[data-sectionid]`)
- Listen for clicks on individual question buttons (`.subQuestion`)
- Show the clicked part and hide all others
- Update the "selected" class on footer buttons
- Handle Previous/Next arrow buttons based on current visible part
- Maintain smooth transitions

**Key functions:**

```javascript
function showPart(partNumber) {
  // Hide all parts
  // Show requested part
  // Update footer button states
}

function navigateToQuestion(partNumber, questionNumber) {
  // Show the part containing the question
  // Optional: scroll to question
}
```

### 5. Add CSS for Part Visibility

Add inline `<style>` tag in the `<head>` section:

```css
.part-container {
  display: none;
}
.part-container.active {
  display: block;
}
```

### 6. Update Asset References

Ensure image and CSS file references work correctly:

- Part 1 uses `./Part 1_files/`
- Part 2 uses `./Part 2_files/`
- Each part's asset paths should remain pointing to their respective `_files` directories

### 7. Testing Checklist

After implementation, verify:

- Part 1 shows by default on page load
- Clicking Part buttons in footer switches content
- Individual question buttons navigate to correct part
- Previous/Next buttons work correctly
- All images load properly for each part
- Footer navigation state updates correctly

## Files to Modify

- `Cambridge/MOCKs-Cambridge/A2-Key/reading-writing.html` - Main file to update

## Files to Read

- `Cambridge/MOCKs-Cambridge/A2-Key/Part 1.html` - Extract Part 1 content
- `Cambridge/MOCKs-Cambridge/A2-Key/Part 2.html` - Extract Part 2 content
- `Cambridge/MOCKs-Cambridge/A2-Key/Part 3.html` - Extract Part 3 content
- `Cambridge/MOCKs-Cambridge/A2-Key/Part 4.html` - Extract Part 4 content
- `Cambridge/MOCKs-Cambridge/A2-Key/Part 5.html` - Extract Part 5 content
- `Cambridge/MOCKs-Cambridge/A2-Key/Part 6.html` - Extract Part 6 content
- `Cambridge/MOCKs-Cambridge/A2-Key/Part 7.html` - Extract Part 7 content