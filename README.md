# Official IELTS Modular Test System

## Overview
A scalable, modular IELTS practice test system with consolidated CSS architecture and separate modules for each official IELTS question type. Each MOCK test is organized in its own folder and supports Reading, Listening, and Writing sections.

## 🏗️ Project Structure
```
Test System(v2)/
├── MOCKs/                          # All MOCK tests
│   ├── MOCK 1/
│   │   ├── reading.html            # Reading section
│   │   ├── listening.html          # (Future) Listening section  
│   │   ├── writing.html            # (Future) Writing section
│   │   └── answers/
│   │       ├── reading-answers.js
│   │       ├── listening-answers.js
│   │       └── writing-answers.js
│   └── ... (MOCK 2 through MOCK 10)
│
├── assets/                         # Shared modular resources
│   ├── css/
│   │   ├── reading.css            # Complete reading test styles
│   │   ├── listening.css          # Complete listening test styles  
│   │   ├── writing.css            # Complete writing test styles
│   │   ├── reading/               # Reading question modules
│   │   │   ├── multiple-choice.css
│   │   │   ├── true-false-notgiven.css
│   │   │   ├── yes-no-notgiven.css
│   │   │   ├── sentence-completion.css
│   │   │   ├── matching-info.css
│   │   │   └── ... (other reading types)
│   │   ├── listening/             # Listening question modules
│   │   └── writing/               # Writing modules
│   │
│   ├── js/
│   │   ├── core.js                # Core functionality
│   │   ├── answer-loader.js       # Dynamic module loading
│   │   ├── reading/               # Reading question handlers
│   │   │   ├── multiple-choice.js
│   │   │   ├── true-false-notgiven.js
│   │   │   ├── sentence-completion.js
│   │   │   └── ... (other reading handlers)
│   │   ├── listening/             # Listening question handlers
│   │   └── writing/               # Writing functionality
│   │
│   └── audio/                     # Audio files for listening
│       ├── MOCK 1/
│       └── ... (MOCK 2-10)
│
└── templates/                     # Templates for creating new tests
    ├── reading-template.html      # Reading test template  
    └── writing-template.html      # Writing test template
```

## 🚀 Quick Start

### Testing the Writing System:
1. Open `MOCKs/MOCK 1/writing.html` in your browser
2. Experience the full IELTS Writing test interface:
   - **Split Panel Layout**: Instructions on left, writing area on right
   - **Task Switching**: Click "Task 1" or "Task 2" tabs to switch
   - **Word Counter**: See real-time word count for each task
   - **Timer**: 60-minute countdown with visual alerts
   - **Auto-save**: Your work is automatically saved
   - **Resizable Panels**: Drag the divider to adjust panel sizes

### Testing the Reading System:
1. Open any `MOCKs/MOCK X/reading.html` file
2. Try different question types and see dynamic loading in action

## 🎨 CSS Architecture

### **Consolidated Skill-Based Stylesheets:**
- **`reading.css`** - Complete reading interface (split panels, resizer, timer, approved design)
- **`listening.css`** - Complete listening interface (audio controls, form layout, section navigation)  
- **`writing.css`** - Complete writing interface (task content, writing area, word counter)

### **Question Type Modules:**
- **`css/reading/`** - Specific styling for reading question types
- **`css/listening/`** - Specific styling for listening question types
- **`css/writing/`** - Specific styling for writing tasks

### **Usage Pattern:**
```html
<!-- Reading tests load complete reading styles -->
<link rel="stylesheet" href="../../assets/css/reading.css">

<!-- Listening tests (future) -->
<link rel="stylesheet" href="../../assets/css/listening.css">

<!-- Writing tests (future) -->  
<link rel="stylesheet" href="../../assets/css/writing.css">
```

## 🧩 Official IELTS Question Types Supported

### Reading Section:
- ✅ **Multiple Choice** (single & multiple answers)
- ✅ **True/False/Not Given**
- ✅ **Yes/No/Not Given** 
- ✅ **Sentence Completion**
- ✅ **Matching Information**
- 🔄 **Matching Headings** (planned)
- 🔄 **Matching Features** (planned)
- 🔄 **Summary Completion** (planned)
- 🔄 **Note/Table/Flow-chart Completion** (planned)
- 🔄 **Diagram Labelling** (planned)
- 🔄 **Short Answer Questions** (planned)

### Writing Section:
- ✅ **Task 1** (Academic) - Data description, charts, graphs (150+ words)
- ✅ **Task 2** (Academic) - Essay writing (250+ words)
- ✅ **Split Panel Interface** - Task instructions and writing area side-by-side
- ✅ **Task Switching** - Easy navigation between Task 1 and Task 2
- ✅ **Word Counter** - Real-time word count for both tasks
- ✅ **Auto-save** - Automatic saving of work in progress
- ✅ **Timer Integration** - 60-minute countdown with visual alerts
- ✅ **Resizable Panels** - Adjustable instruction/writing area split
- ✅ **Sample Answers** - High-quality model responses and scoring rubrics
- ✅ **Text Highlighting** - Highlight instructions, charts, and task content
- ✅ **Note Taking** - Add notes to highlighted text with tooltips

### Listening Section:
- 🎨 **Base Layout Ready** - Audio controls, form-based interface, section navigation
- 🔄 **Multiple Choice** (planned)
- 🔄 **Form/Note/Table Completion** (planned)
- 🔄 **Map/Plan Labelling** (planned)
- 🔄 **Sentence Completion** (planned)
- 🔄 **Short Answer Questions** (planned)

### Writing Section:
- ✅ **Complete Writing Interface** - Split layout, task switching, resizable panels
- ✅ **Task 1** - Chart/graph/table analysis (150+ words)
- ✅ **Task 2** - Essay writing (250+ words)
- ✅ **Professional Features** - Timer, word counter, auto-save, dark mode
- ✅ **Task Navigation** - Seamless switching between tasks
- ✅ **Word Count Tracking** - Color-coded feedback (warning/good)
- ✅ **Auto-save Functionality** - Saves progress every 30 seconds
- ✅ **Sample Answers** - High-quality reference responses

## 🚀 How It Works

### 1. **Skill-Based CSS Loading**
Each HTML file loads a complete stylesheet for its skill:
```html
<!-- Reading tests -->
<link rel="stylesheet" href="../../assets/css/reading.css">
```

### 2. **Dynamic Module Loading**  
Question-specific modules are loaded automatically based on question types detected in the HTML.

### 3. **Dynamic Answer Loading**  
Answers are loaded dynamically based on the MOCK test and section:
- `MOCK 1/reading.html` → loads `MOCK 1/answers/reading-answers.js`
- `MOCK 1/listening.html` → loads `MOCK 1/answers/listening-answers.js`

### 4. **Modular Question Handlers**
Each question type has its own JavaScript handler with specific functionality:
- Input validation
- Visual feedback
- Answer collection
- Scoring integration

## 🎯 Current Implementation Status

### ✅ **Completed:**
- **MOCK Structure**: 10 MOCK tests with organized folder structure
- **Reading System**: Complete reading interface with approved design
- **Writing System**: Complete writing interface with professional features
- **Dynamic Loading**: Automatic answer and module loading system
- **Question Types**: 4 core reading question type modules + writing handler
- **CSS Architecture**: Consolidated skill-based stylesheets
- **Templates**: Reading and writing templates available

### 🎨 **Layout Systems Ready:**
- **Reading**: Split panel layout with resizable divider (approved design) ✅
- **Writing**: Split layout with task switching, timer, and word counter (approved design) ✅
- **Listening**: Form-based layout with audio controls and section navigation

### 🔄 **Next Steps:**
- Create listening HTML templates and modules
- Implement additional reading question types
- Audio integration for listening tests
- Advanced writing assessment features

## 📝 Creating New Tests

### Option 1: Use Templates
1. Copy `templates/reading-template.html` or `templates/writing-template.html`
2. Place in `MOCKs/MOCK X/reading.html` or `MOCKs/MOCK X/writing.html`
3. Update data attributes: `data-mock="X"`
4. Add your content and questions
5. Create corresponding answer file

### Option 2: Copy Existing Test
1. Copy an existing MOCK folder
2. Rename to new MOCK number
3. Update HTML content and answer files
4. Test and verify

## 🛠️ Development Workflow

### Adding New Question Types:
1. Create CSS file: `assets/css/reading/new-type.css`
2. Create JS handler: `assets/js/reading/new-type.js`  
3. Add detection logic to `answer-loader.js`
4. Test with sample questions
5. Update templates

### Adding New MOCK Tests:
1. Create directory: `MOCKs/MOCK X/`
2. Add HTML files: `reading.html`, `listening.html`, `writing.html`
3. Create answer files in `answers/` subdirectory
4. Add audio files if needed: `assets/audio/MOCK X/`

### Creating New Writing Tests:
1. Use `templates/writing-template.html` as base
2. Replace placeholder content with new tasks:
   - Task 1: Chart/graph description (150+ words)
   - Task 2: Essay response (250+ words)
3. Create corresponding `writing-answers.js` with sample responses
4. Test functionality: task switching, word count, timer

### Creating Listening Templates:
1. Copy base layout from CSS file
2. Integrate with `core.js` functionality
3. Add skill-specific question modules
4. Test with sample content

## 🎯 Benefits

✅ **Official IELTS Compliance**: Matches real test question types exactly
✅ **Consolidated Architecture**: Clean, maintainable skill-based CSS structure
✅ **No Confusion**: One CSS file per skill - simple and clear
✅ **Dynamic Loading**: Only loads necessary question modules
✅ **Scalable**: Easy to add new MOCKs and question types  
✅ **Clean Organization**: Each MOCK test is self-contained
✅ **Future-Ready**: Layout systems prepared for all three skills
✅ **Template-Based**: Quick test creation using templates
✅ **Approved Design**: Reading interface preserves exact approved styling

## 🧪 Testing

### Current Status:
- **MOCK 1-10**: ✅ Reading sections created and functional
- **CSS Architecture**: ✅ Consolidated skill-based stylesheets
- **Answer Loading**: ✅ Dynamic answer system working
- **Question Modules**: ✅ Core question types implemented
- **Layout Systems**: ✅ Reading (approved), Listening (ready), Writing (ready)
- **Templates**: ✅ Reading template available

### To Test Reading:
1. Open any `MOCKs/MOCK X/reading.html` file
2. Verify approved design loads correctly
3. Check browser console for successful module loading
4. Test question interactions and answer submission
5. Verify unique answers load for each MOCK
6. Test resizable panel functionality

### To Test CSS Architecture:
1. Check that only `reading.css` loads for reading tests
2. Verify no console errors or missing styles
3. Confirm responsive design works on mobile
4. Test that all MOCK tests have consistent styling

## 🔧 Configuration

### HTML Data Attributes:
```html
<body data-test-version="1" data-skill="reading" data-mock="1">
```
- `data-test-version`: Question numbering reference
- `data-skill`: Section type (reading/listening/writing)  
- `data-mock`: MOCK test number

### CSS Loading Pattern:
```html
<!-- Reading Test -->
<link rel="stylesheet" href="../../assets/css/reading.css">

<!-- Listening Test (Future) -->
<link rel="stylesheet" href="../../assets/css/listening.css">

<!-- Writing Test (Future) -->
<link rel="stylesheet" href="../../assets/css/writing.css">
```

### Answer File Format:
```javascript
// Answer key for MOCK TEST X
window.testAnswers = {
  '1': 'TRUE',
  '2': 'FALSE', 
  '3': 'NOT GIVEN',
  // ... etc
};
```

## 🚨 Troubleshooting

**Reading tests not loading correctly?**
- Ensure `reading.css` exists and loads without errors
- Check file paths are correct relative to HTML location
- Verify browser console for CSS loading errors

**Question modules not working?**
- Check if question type classes exist in HTML
- Verify question-specific CSS modules in `css/reading/`
- Check browser console for JavaScript errors

**Answers not loading?**
- Ensure answer file exists: `MOCK X/answers/reading-answers.js`
- Check data attributes on body element match answer path
- Verify answer file format and variable names

**Styling inconsistencies?**
- Ensure only one skill CSS file loads per page
- Check if specific question CSS modules conflict
- Verify CSS class names match JavaScript selectors

**Performance issues?**
- Check if unnecessary CSS files are loading
- Verify dynamic loading is working correctly
- Monitor browser network tab for excessive requests

## 📋 File Checklist

### For Each MOCK Test:
- [ ] `MOCKs/MOCK X/reading.html` exists
- [ ] HTML loads `../../assets/css/reading.css`
- [ ] Data attributes set correctly on body tag
- [ ] `MOCKs/MOCK X/answers/reading-answers.js` exists
- [ ] Answer file has correct format and question numbers
- [ ] Questions use proper CSS classes for module detection

### CSS Architecture:
- [ ] `assets/css/reading.css` - Complete reading styles
- [ ] `assets/css/listening.css` - Complete listening styles
- [ ] `assets/css/writing.css` - Complete writing styles
- [ ] Question modules in respective skill folders
- [ ] No duplicate or conflicting CSS files
