# Cambridge Speaking Test - Implementation Guide

## 🎤 Overview

The Cambridge Speaking Test system allows students to record their speaking responses, which are then evaluated by invigilators at their convenience. This provides flexibility, quality assurance through multiple reviews, and creates an audit trail for assessment.

---

## ✨ Key Features

### For Students
- **Microphone Testing**: Pre-test microphone check ensures audio quality
- **Recording Controls**: Start, pause, resume, and stop recording
- **Playback Review**: Listen to recording before submission
- **Re-recording Option**: Students can re-record if not satisfied
- **Browser Compatibility**: Works on Chrome, Firefox, and Edge
- **Automatic Submission**: Recordings are saved to the database with student information

### For Invigilators
- **Centralized Dashboard**: View all speaking submissions in one place
- **Advanced Filtering**: Filter by level, status, mock test, and date
- **Audio Playback**: Listen to recordings directly in the browser
- **Detailed Evaluation**: Score on multiple criteria (Grammar, Vocabulary, Pronunciation, Fluency)
- **Evaluation History**: Track who evaluated what and when
- **Download Recordings**: Save audio files for external review or archiving

---

## 📂 File Structure

```
Test-System-v2-/
├── assets/js/cambridge/
│   └── audio-recorder.js                      # Audio recording module
├── Cambridge/MOCKs-Cambridge/
│   ├── A1-Movers/speaking.html               # A1 Movers speaking test
│   ├── A2-Key/speaking.html                  # A2 Key speaking test
│   ├── B1-Preliminary/speaking.html          # B1 Preliminary speaking test
│   └── B2-First/speaking.html                # B2 First speaking test
├── cambridge-speaking-evaluations.html        # Invigilator evaluation dashboard
├── cambridge-admin-dashboard.html             # Main admin dashboard (updated)
└── cambridge-database-server.js               # Database server (updated with audio support)
```

---

## 🚀 How to Use

### For Students

#### 1. Login
- Navigate to Cambridge test entry page
- Enter student ID and name
- Select your Cambridge level

#### 2. Access Speaking Test
- From the dashboard, navigate to the Speaking Test for your level
- Click on the speaking test link

#### 3. Microphone Check
- Click **"Test Microphone"**
- Speak into your microphone to verify it's working
- The level bar should move when you speak
- Wait for confirmation that microphone quality is acceptable

#### 4. Start Test
- Click **"Start Speaking Test"**
- Read through the test questions
- When ready, click **"Start Recording"**

#### 5. Recording
- Speak clearly into your microphone
- Answer all questions in the test
- You can pause and resume recording if needed
- Click **"Stop Recording"** when finished

#### 6. Review & Submit
- Listen to your recording using the audio player
- If satisfied, click **"Submit Recording"**
- If not satisfied, click **"Re-record"** to start over
- Once submitted, you'll receive a confirmation message

---

### For Invigilators

#### 1. Access Evaluation Dashboard
- Login to Cambridge Admin Dashboard
- Click **"🎤 Speaking Evaluations"** button
- Or navigate directly to `cambridge-speaking-evaluations.html`

#### 2. View Submissions
- All speaking submissions are displayed as cards
- **Orange border**: Pending evaluation
- **Green border**: Already evaluated
- Use filters to find specific submissions:
  - Filter by Level (A1, A2, B1, B2)
  - Filter by Status (Pending/Evaluated)
  - Filter by Mock Test number

#### 3. Evaluate a Recording

##### Open Evaluation Form
- Click **"Evaluate"** button on any pending submission
- The evaluation modal will open

##### Listen to Recording
- Use the audio player to listen to the student's recording
- You can replay as many times as needed
- Optionally download the recording for external review

##### Score the Performance
Fill in the evaluation form:

1. **Assessment Criteria** (1-5 scale):
   - Grammar & Accuracy
   - Vocabulary
   - Pronunciation
   - Fluency & Coherence

2. **Overall Assessment**:
   - Enter your name as evaluator
   - Assign overall score (0-100)
   - Select grade (A+, A, B+, B, C, D, F)
   - Add detailed feedback notes

##### Submit Evaluation
- Click **"Save Evaluation"**
- Evaluation is immediately saved to database
- Student record is marked as evaluated
- Timestamp and evaluator name are recorded

#### 4. Review Past Evaluations
- Click **"View"** on evaluated submissions
- See previous evaluation details
- Listen to recording again if needed
- View evaluator notes and scores

---

## 🔧 Technical Details

### Audio Recording

**Technology**: MediaRecorder API (Web Audio API)
**Format**: WebM with Opus codec (or browser default)
**Quality**: Mono, 44.1kHz, optimized for voice
**File Size**: Typically 1-5 MB for 10-15 minute recording

### Browser Support
- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari (with limitations)
- ❌ Internet Explorer (not supported)

### Database Schema

New fields added to `cambridge_submissions` table:

```sql
audio_data TEXT                  -- Base64 encoded audio
audio_size DECIMAL(10,2)        -- File size in MB
audio_duration INTEGER           -- Duration in seconds
audio_mime_type VARCHAR(100)    -- Audio format
evaluated BOOLEAN               -- Evaluation status
evaluator_name VARCHAR(200)    -- Who evaluated
evaluation_date TIMESTAMP       -- When evaluated
evaluation_notes TEXT           -- Feedback comments
```

### API Endpoints

#### Submit Speaking Test
```
POST /submit-speaking
Body: {
  studentId, studentName, level, mockTest, skill,
  audioData, audioSize, duration, mimeType,
  startTime, endTime
}
```

#### Evaluate Speaking Test
```
PATCH /cambridge-submissions/:id/evaluate
Body: {
  score, grade, evaluatorName, evaluationNotes
}
```

#### Get Speaking Submissions
```
GET /cambridge-submissions?skill=speaking
```

---

## ⚙️ Configuration

### Server Requirements
- Node.js server must be running on port 3003
- PostgreSQL database connection
- Adequate storage for audio files (base64 encoded)

### Starting the Server
```bash
# Navigate to project directory
cd C:\Users\User\Desktop\Test-System-v2-

# Start Cambridge database server
node cambridge-database-server.js
```

Or use the batch file:
```bash
start-cambridge-server.bat
```

### Database Migration
If you have an existing Cambridge database, the audio fields will be automatically added when you restart the server. The migration is handled in the `initializeCambridgeTables()` function.

---

## 🎯 Best Practices

### For Students
1. **Test your microphone** before starting the actual recording
2. **Find a quiet environment** with minimal background noise
3. **Speak clearly** and at a normal pace
4. **Review your recording** before submitting
5. **Use headphones** to avoid feedback when testing

### For Invigilators
1. **Use good headphones** for accurate assessment
2. **Listen to entire recording** before scoring
3. **Provide constructive feedback** in notes
4. **Be consistent** in grading criteria
5. **Double-check scores** before submission
6. **Download important recordings** for archival

---

## 🔍 Troubleshooting

### Student Issues

**"Microphone permission denied"**
- Click the microphone icon in browser address bar
- Allow microphone access for this site
- Refresh the page and try again

**"No microphone found"**
- Check that microphone is properly connected
- Check system sound settings
- Try a different browser

**"Poor audio quality detected"**
- Move closer to microphone
- Reduce background noise
- Check microphone volume in system settings
- Consider using a better microphone

**"Submission failed"**
- Check internet connection
- Ensure database server is running
- Try submitting again
- Contact invigilator if problem persists

### Invigilator Issues

**"Audio won't play"**
- Check browser audio settings
- Try different browser
- Download and play in external player
- Check that audio data exists in database

**"Can't see submissions"**
- Verify database server is running
- Check network connection
- Clear filters to see all submissions
- Refresh the page

**"Evaluation won't save"**
- Check all required fields are filled
- Verify server connection
- Try again after a moment
- Check browser console for errors

---

## 📊 Grading Guidelines

### Overall Score Mapping
- **90-100**: A+ (Exceptional)
- **80-89**: A (Excellent)
- **70-79**: B+ (Very Good)
- **60-69**: B (Good)
- **50-59**: C (Satisfactory)
- **40-49**: D (Pass)
- **0-39**: F (Fail)

### Assessment Criteria

**Grammar & Accuracy (1-5)**
- Correct use of tenses
- Sentence structure
- Agreement and word order

**Vocabulary (1-5)**
- Range of vocabulary
- Appropriate word choice
- Idiomatic expressions

**Pronunciation (1-5)**
- Clarity and intelligibility
- Word and sentence stress
- Intonation patterns

**Fluency & Coherence (1-5)**
- Speaking pace and flow
- Use of linking words
- Logical organization

---

## 🔐 Security Considerations

1. **Audio Data**: Stored as base64 in database (consider encryption for production)
2. **Access Control**: Only authenticated invigilators can access evaluations
3. **Data Privacy**: Student recordings should be handled according to data protection laws
4. **Secure Connection**: Use HTTPS in production
5. **Backup**: Regular database backups recommended

---

## 🚀 Future Enhancements

### Potential Improvements
1. **Audio Compression**: Reduce storage size with better compression
2. **Cloud Storage**: Store audio files in S3/Azure instead of database
3. **Automatic Transcription**: AI-powered speech-to-text for analysis
4. **Multiple Evaluators**: Allow double-marking for quality assurance
5. **Student Feedback**: Show evaluation results to students
6. **Progress Tracking**: Track student improvement over time
7. **Mobile App**: Native mobile app for better recording quality
8. **Video Recording**: Add video recording for A2+ levels

---

## 📝 Notes

- Audio recordings are stored in base64 format in the database
- Large audio files may take a few seconds to load
- Recommended to evaluate recordings within 1-2 days of submission
- Students cannot see their evaluations by default (feature can be added)
- Each submission is uniquely identified and timestamped

---

## 📞 Support

For technical issues or questions:
1. Check this documentation first
2. Review troubleshooting section
3. Check browser console for error messages
4. Contact system administrator

---

## ✅ Quick Start Checklist

### Initial Setup
- [ ] Start cambridge-database-server.js
- [ ] Verify database connection
- [ ] Test microphone in a speaking test
- [ ] Submit a test recording
- [ ] Access evaluation dashboard
- [ ] Complete a test evaluation

### For Each Test Session
- [ ] Ensure server is running
- [ ] Brief students on speaking test process
- [ ] Monitor submissions in admin dashboard
- [ ] Evaluate recordings promptly
- [ ] Provide feedback to students

---

**Last Updated**: November 5, 2025
**Version**: 1.0
**System**: Cambridge Test System v2
