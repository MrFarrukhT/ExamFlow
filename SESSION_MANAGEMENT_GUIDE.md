# IELTS Test Session Management System

## 🎯 Overview
A complete test management system with student registration, module tracking, and administrative controls. Simple, secure, and efficient.

## 🚀 System Flow

### For Students:
1. **Entry Page** (`index.html`) - Enter Student ID and Name → Click "Start"
2. **Dashboard** (`dashboard.html`) - Choose from 3 module cards (Listening/Reading/Writing)
3. **Complete Modules** - Once finished, can't return to that module
4. **Automatic Saving** - Answers saved to localStorage every 30 seconds

### For Invigilators:
1. **Pre-Setup** (`invigilator.html`) - Select which Mock Test (1-10) to use
2. **Monitor Sessions** - See current student progress
3. **Export Results** - Download complete test data (password protected)
4. **Reset System** - Clear all data for next student

## 📁 Key Files Created

### Main System Files:
- `index.html` - Student entry page
- `dashboard.html` - Module selection dashboard  
- `invigilator.html` - Administrative control panel
- `assets/js/session-manager.js` - Session management logic

### Styling:
- `assets/css/entry.css` - Entry page styling
- `assets/css/dashboard.css` - Dashboard styling
- `assets/css/invigilator.css` - Invigilator panel styling

### Integration:
- `integrate-session-manager.ps1` - Script to add session manager to test files

## 🔧 How It Works

### Session Management:
- **localStorage** stores all student data and progress
- **Module Status Tracking**: `not-started` → `in-progress` → `completed`
- **Answer Auto-Save**: Every 30 seconds and on page unload
- **Navigation Control**: Prevents back navigation once module completed

### Data Structure:
```javascript
localStorage items:
- studentId: "12345"
- studentName: "John Doe"
- selectedMock: "1"
- readingStatus: "completed"
- readingAnswers: {...}
- listeningStatus: "in-progress"
// etc for each module
```

### Security Features:
- **Password Protection**: Invigilator functions require password ("ielts2025")
- **Session Validation**: Redirects to login if session expired
- **Module Locking**: Completed modules become inaccessible
- **Export Control**: Only invigilator can download results

## 🎮 Usage Instructions

### 1. Pre-Test Setup (Invigilator):
1. Open `invigilator.html`
2. Select desired Mock Test (1-10)
3. Click "Set Mock Test"

### 2. Student Test Process:
1. Student opens `index.html`
2. Enters Student ID and Name
3. Clicks "Start Test"
4. Dashboard shows 3 module cards
5. Student clicks module to begin
6. Completes test and returns to dashboard
7. Repeats for other modules

### 3. Post-Test Export (Invigilator):
1. Return to `invigilator.html`
2. Click "Export Test Results"
3. Enter password: `ielts2025`
4. JSON file downloads with all student data
5. Click "Reset All Data" to clear for next student

## 📊 Export Data Format
```json
{
  "studentInfo": {
    "id": "12345",
    "name": "John Doe",
    "mockTest": "1",
    "testStartTime": "2025-09-08T..."
  },
  "modules": {
    "listening": {
      "status": "completed",
      "startTime": "...",
      "answers": {...}
    },
    "reading": {...},
    "writing": {...}
  },
  "exportTime": "2025-09-08T..."
}
```

## ⚡ Key Features

### Student Experience:
- ✅ Simple login (just ID + Name)
- ✅ Clear visual progress tracking  
- ✅ Module cards show status (Not Started/In Progress/Completed)
- ✅ Automatic answer saving
- ✅ Cannot return to completed modules
- ✅ Responsive design for tablets

### Invigilator Control:
- ✅ Easy mock test selection
- ✅ Real-time session monitoring
- ✅ Password-protected export
- ✅ One-click data reset
- ✅ Complete test results in JSON format

### Technical:
- ✅ No server required (runs locally)
- ✅ Data persistence via localStorage
- ✅ Integration with existing test structure
- ✅ Session management across all modules
- ✅ Auto-save and recovery

## 🔧 Configuration

### Change Invigilator Password:
Edit line 47 in `invigilator.html`:
```javascript
const INVIGILATOR_PASSWORD = "ielts2025"; // Change this
```

### Customize Timer Defaults:
Module durations displayed on cards (cosmetic only):
- Listening: ~30 minutes
- Reading: 60 minutes  
- Writing: 60 minutes

## 🚨 Important Notes

1. **Browser Compatibility**: Works in all modern browsers
2. **Data Storage**: Uses localStorage - data stays on local machine
3. **Session Security**: Students cannot bypass completed modules
4. **Backup**: Export data regularly - localStorage can be cleared by browser
5. **Network**: No internet required after initial page load

## 🎯 Next Steps

1. Test the complete flow with sample data
2. Customize styling if needed
3. Add any specific validation rules
4. Train invigilators on the system
5. Consider adding automatic backups

The system is now ready for use! 🎉
