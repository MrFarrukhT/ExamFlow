# Official IELTS Modular Test System

## Overview
A scalable, modular IELTS practice test system with separate CSS/JS modules for each official IELTS question type. Each MOCK test is organized in its own folder and supports Reading, Listening, and Writing sections.

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
│   │   ├── base.css               # Core styling, layout, timer
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
    └── reading-template.html      # Reading test template
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

### Listening Section (Future):
- 🔄 **Multiple Choice**
- 🔄 **Form/Note/Table Completion**
- 🔄 **Map/Plan Labelling**
- 🔄 **Sentence Completion**
- 🔄 **Short Answer Questions**

### Writing Section (Future):
- 🔄 **Task 1** (Academic: graphs/charts, General: letters)
- 🔄 **Task 2** (Essay writing)

## 🚀 How It Works

### 1. **Automatic Module Detection**
Each HTML file automatically detects which question types are present and loads only the necessary CSS/JS modules.

### 2. **Dynamic Answer Loading**  
Answers are loaded dynamically based on the MOCK test and section:
- `MOCK 1/reading.html` → loads `MOCK 1/answers/reading-answers.js`
- `MOCK 1/listening.html` → loads `MOCK 1/answers/listening-answers.js`

### 3. **Modular Question Handlers**
Each question type has its own JavaScript handler with specific functionality:
- Input validation
- Visual feedback
- Answer collection
- Scoring integration

## 📝 Creating New Tests

### Option 1: Use Templates
1. Copy `templates/reading-template.html`
2. Place in `MOCKs/MOCK X/reading.html`
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

## 🎯 Benefits

✅ **Official IELTS Compliance**: Matches real test question types exactly
✅ **Modular Architecture**: Easy to maintain and extend
✅ **Dynamic Loading**: Only loads necessary resources
✅ **Scalable**: Easy to add new MOCKs and question types  
✅ **Clean Organization**: Each MOCK test is self-contained
✅ **Future-Ready**: Prepared for Listening and Writing expansion
✅ **Template-Based**: Quick test creation using templates

## 🧪 Testing

### Current Status:
- **MOCK 1-10**: Reading sections created and functional
- **Answer Loading**: Dynamic answer system working
- **Question Modules**: Core question types implemented
- **Templates**: Reading template available

### To Test:
1. Open any `MOCKs/MOCK X/reading.html` file
2. Check browser console for successful module loading
3. Test question interactions and answer submission
4. Verify unique answers load for each MOCK

## 🔧 Configuration

### HTML Data Attributes:
```html
<body data-test-version="1" data-skill="reading" data-mock="1">
```
- `data-test-version`: Question numbering reference
- `data-skill`: Section type (reading/listening/writing)  
- `data-mock`: MOCK test number

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

**Modules not loading?**
- Check file paths are correct
- Verify question type classes exist in HTML
- Check browser console for errors

**Answers not loading?**
- Ensure answer file exists: `MOCK X/answers/reading-answers.js`
- Check data attributes on body element
- Verify answer file format

**Styling issues?**
- Ensure base.css loads first
- Check if question-specific CSS modules load
- Verify CSS class names match JavaScript selectors
