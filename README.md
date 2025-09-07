# Dynamic Answer Loading System - Documentation

## Overview
This system allows you to have 10 different MOCK test versions while sharing the same CSS and JavaScript files. Each MOCK test loads unique answers dynamically, and the structure is ready for you to add listening and writing sections later.

## File Structure
```
Test System(v2)/
├── MOCK1.html - MOCK10.html       # 10 MOCK test versions (Reading only for now)
├── styles.css                     # Shared CSS (unchanged)
├── script.js                      # Shared JS with dynamic loading
├── answers/                       # Answer files directory
│   ├── mock1-answers.js           # Answers for MOCK1.html
│   ├── mock2-answers.js           # Answers for MOCK2.html
│   ├── ...                        
│   └── mock10-answers.js          # Answers for MOCK10.html
└── helper scripts...              # PowerShell scripts for maintenance
```

## How It Works

1. **HTML Files**: Each MOCK file has a `data-test-version` attribute:
   - MOCK1.html: `<body data-test-version="1">`
   - MOCK2.html: `<body data-test-version="2">`
   - etc.

2. **JavaScript**: The main script.js automatically:
   - Detects the test version from the MOCK HTML file
   - Loads the corresponding mock#-answers.js file
   - Uses those answers for the grading system

3. **Answer Files**: Each mock#-answers.js file contains a complete set of answers for that test version.

## Customizing Answers

To customize answers for any MOCK test:

1. Open the corresponding file in the `answers/` directory
2. Edit the answers as needed
3. Save the file

Example (mock2-answers.js):
```javascript
// Answer key for MOCK TEST 2
window.testAnswers = {
  '1': 'TRUE',          // Change FALSE to TRUE
  '2': 'FALSE',         // Change TRUE to FALSE
  '7': 'soldiers',      // Change 'army' to 'soldiers'
  // ... etc
};
```

## Adding New MOCK Tests

1. Create new HTML file: `MOCK11.html` (copy from MOCK1.html)
2. Update the data attribute: `<body data-test-version="11">`
3. Create new answer file: `answers/mock11-answers.js`
4. Customize the answers in the new file

## Testing Different MOCK Tests

- Open MOCK1.html → Uses mock1-answers.js
- Open MOCK2.html → Uses mock2-answers.js
- Open MOCK3.html → Uses mock3-answers.js
- etc.

## Current Structure

- **mock1-answers.js**: Original answers from your script.js
- **mock2-answers.js - mock10-answers.js**: Template answers (ready for customization)

⚠️ **Important**: Files mock2-answers.js through mock10-answers.js contain template answers. You should customize these with your actual desired answers for each MOCK test.

## Future Expansion

This structure is perfect for adding:
- **Listening sections** to each MOCK test
- **Writing sections** to each MOCK test
- **Speaking sections** if needed

Each MOCK file can be expanded to include all four IELTS skills while maintaining the same answer loading system.

## Benefits

✅ **Shared Code**: CSS and main JS logic shared across all MOCK tests
✅ **Easy Maintenance**: Update functionality in one place (script.js)
✅ **Unique Answers**: Each MOCK test has completely different answers
✅ **Scalable**: Easy to add more MOCK tests
✅ **Clean Structure**: Organized and ready for listening/writing expansion
✅ **Professional Naming**: MOCK1-MOCK10 clearly indicates complete practice tests

## Troubleshooting

If answers don't load:
1. Check browser console for errors
2. Verify the mock#-answers.js file exists
3. Ensure the data-test-version attribute matches the mock number
4. Make sure the answers file has the correct format

Console messages to look for:
- `✅ Loaded answers for MOCK#` - Success
- `❌ Failed to load answers file` - File not found or error
