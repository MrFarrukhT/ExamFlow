# Cambridge Speaking Test - Complete Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CAMBRIDGE SPEAKING TEST SYSTEM                    │
│                         Complete Workflow                            │
└─────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════
                            SETUP PHASE
═══════════════════════════════════════════════════════════════════════

┌─────────────────┐
│  Administrator  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Start Database Server          │
│  (cambridge-database-server.js) │
│  Port: 3003                     │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  System Ready for:              │
│  • Student Recordings           │
│  • Invigilator Evaluations      │
└─────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════
                        STUDENT WORKFLOW
═══════════════════════════════════════════════════════════════════════

┌─────────────┐
│   Student   │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────┐
│  1. Login to Cambridge System        │
│     • Enter Student ID               │
│     • Enter Full Name                │
│     • Select Level (A1/A2/B1/B2)     │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  2. Navigate to Speaking Test        │
│     Cambridge/MOCKs-Cambridge/       │
│     └─ [Level]/speaking.html         │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  3. Microphone Check                 │
│     ✓ Click "Test Microphone"        │
│     ✓ Speak to test                  │
│     ✓ See visual level indicator     │
│     ✓ Verify quality (good/fair)     │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  4. Start Test                       │
│     • Read test questions            │
│     • Click "Start Recording"        │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  5. Recording Phase                  │
│     🔴 Recording indicator active    │
│     ⏱️  Timer running                │
│     • Answer all questions           │
│     • Can pause/resume if needed     │
│     • Click "Stop" when finished     │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  6. Review Recording                 │
│     🎧 Listen to playback            │
│     ❓ Satisfied?                    │
│        Yes → Continue                │
│        No  → Re-record               │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  7. Submit Recording                 │
│     • Audio saved to database        │
│     • Metadata recorded              │
│     • Confirmation message           │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  ✓ SUBMISSION COMPLETE               │
│    Status: Pending Evaluation        │
└──────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════
                     INVIGILATOR WORKFLOW
═══════════════════════════════════════════════════════════════════════

┌──────────────┐
│  Invigilator │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│  1. Access Evaluation Dashboard      │
│     cambridge-speaking-evaluations   │
│     .html                            │
│     OR via Admin Dashboard button    │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  2. View Submissions                 │
│     📊 Statistics:                   │
│        • Total submissions           │
│        • Pending evaluations         │
│        • Completed evaluations       │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  3. Filter/Search (Optional)         │
│     • By Level (A1/A2/B1/B2)        │
│     • By Status (Pending/Evaluated)  │
│     • By Mock Test Number            │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  4. Select Submission                │
│     Click "Evaluate" button          │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  5. Listen to Recording              │
│     🎧 Audio player                  │
│     • Play/Pause/Seek                │
│     • Can replay multiple times      │
│     • Optional: Download file        │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  6. Score on Criteria (1-5 scale)    │
│     ✓ Grammar & Accuracy             │
│     ✓ Vocabulary                     │
│     ✓ Pronunciation                  │
│     ✓ Fluency & Coherence            │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  7. Overall Assessment               │
│     • Enter evaluator name           │
│     • Assign overall score (0-100)   │
│     • Select grade (A+ to F)         │
│     • Add feedback notes             │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  8. Save Evaluation                  │
│     • Click "Save Evaluation"        │
│     • Evaluation stored in database  │
│     • Timestamp recorded             │
│     • Status → "Evaluated"           │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  ✓ EVALUATION COMPLETE               │
│    Available for review              │
└──────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════
                        DATA FLOW DIAGRAM
═══════════════════════════════════════════════════════════════════════

┌─────────────┐          ┌──────────────────┐          ┌──────────────┐
│   Student   │─────────▶│  Audio Recorder  │─────────▶│   Browser    │
│  Interface  │          │     Module       │          │   Storage    │
└─────────────┘          └──────────────────┘          └──────┬───────┘
                                                               │
                                                               ▼
                                                        ┌──────────────┐
                                                        │    Base64    │
                                                        │   Encoding   │
                                                        └──────┬───────┘
                                                               │
                                                               ▼
                         ┌─────────────────────────────────────────────┐
                         │         HTTP POST /submit-speaking          │
                         └─────────────────┬───────────────────────────┘
                                          │
                                          ▼
                         ┌─────────────────────────────────────────────┐
                         │    Cambridge Database Server (Port 3003)    │
                         │                                             │
                         │  Endpoints:                                 │
                         │  • POST   /submit-speaking                  │
                         │  • GET    /cambridge-submissions            │
                         │  • PATCH  /submissions/:id/evaluate         │
                         └─────────────────┬───────────────────────────┘
                                          │
                                          ▼
                         ┌─────────────────────────────────────────────┐
                         │         PostgreSQL Database (Neon)          │
                         │                                             │
                         │  Table: cambridge_submissions               │
                         │  Columns:                                   │
                         │  • id, student_id, student_name             │
                         │  • level, mock_test, skill                  │
                         │  • audio_data (base64)                      │
                         │  • audio_size, audio_duration               │
                         │  • score, grade                             │
                         │  • evaluated, evaluator_name                │
                         │  • evaluation_date, evaluation_notes        │
                         └─────────────────┬───────────────────────────┘
                                          │
                                          ▼
                         ┌─────────────────────────────────────────────┐
                         │      GET /cambridge-submissions             │
                         │             ?skill=speaking                 │
                         └─────────────────┬───────────────────────────┘
                                          │
                                          ▼
                         ┌─────────────────────────────────────────────┐
                         │      Evaluation Dashboard                   │
                         │  • Display submissions                      │
                         │  • Decode base64 → Blob                     │
                         │  • Create audio URL                         │
                         │  • Audio playback                           │
                         └─────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════
                        FILE STRUCTURE
═══════════════════════════════════════════════════════════════════════

Test-System-v2-/
│
├── 📁 assets/js/cambridge/
│   └── 📄 audio-recorder.js              ← Audio recording module
│
├── 📁 Cambridge/MOCKs-Cambridge/
│   ├── 📁 A1-Movers/
│   │   └── 📄 speaking.html              ← A1 speaking test
│   ├── 📁 A2-Key/
│   │   └── 📄 speaking.html              ← A2 speaking test
│   ├── 📁 B1-Preliminary/
│   │   └── 📄 speaking.html              ← B1 speaking test
│   └── 📁 B2-First/
│       └── 📄 speaking.html              ← B2 speaking test
│
├── 📄 cambridge-speaking-evaluations.html ← Evaluation dashboard
├── 📄 cambridge-admin-dashboard.html      ← Admin (with speaking link)
├── 📄 cambridge-database-server.js        ← Server with audio support
│
├── 📄 start-speaking-system.bat           ← Quick start script
├── 📄 SPEAKING-README.md                  ← Quick reference
├── 📄 CAMBRIDGE-SPEAKING-GUIDE.md         ← Full documentation
├── 📄 CAMBRIDGE-SPEAKING-SUMMARY.md       ← Implementation summary
└── 📄 SPEAKING-WORKFLOW.md                ← This file


═══════════════════════════════════════════════════════════════════════
                    AUDIO TECHNICAL DETAILS
═══════════════════════════════════════════════════════════════════════

Recording Format:
┌────────────────────────────────────────────┐
│ Container: WebM                            │
│ Codec: Opus                                │
│ Channels: Mono (1)                         │
│ Sample Rate: 44.1 kHz                      │
│ Bit Rate: Variable (optimized for voice)   │
└────────────────────────────────────────────┘

Storage:
┌────────────────────────────────────────────┐
│ Method: Base64 encoding                    │
│ Location: PostgreSQL database              │
│ Field: TEXT (can handle large data)        │
│ Size: ~1-5 MB for 10-15 minute recording   │
└────────────────────────────────────────────┘

Browser Support:
┌────────────────────────────────────────────┐
│ ✅ Chrome/Edge (Recommended)               │
│ ✅ Firefox                                 │
│ ✅ Safari (with limitations)               │
│ ❌ Internet Explorer                       │
└────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════
                   EVALUATION CRITERIA GUIDE
═══════════════════════════════════════════════════════════════════════

┌───────────────────────────────────────────────────────────────────┐
│                    GRAMMAR & ACCURACY (1-5)                       │
├───────────────────────────────────────────────────────────────────┤
│ 5 - Excellent: Perfect or near-perfect grammar                    │
│ 4 - Very Good: Minor errors, doesn't impede communication         │
│ 3 - Good: Some errors but mostly accurate                         │
│ 2 - Fair: Frequent errors, affects understanding                  │
│ 1 - Poor: Many errors, difficult to understand                    │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                      VOCABULARY (1-5)                             │
├───────────────────────────────────────────────────────────────────┤
│ 5 - Excellent: Wide range, sophisticated, precise                 │
│ 4 - Very Good: Good range, appropriate for context                │
│ 3 - Good: Adequate vocabulary, some repetition                    │
│ 2 - Fair: Limited range, frequent basic errors                    │
│ 1 - Poor: Very limited, inappropriate word choice                 │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                    PRONUNCIATION (1-5)                            │
├───────────────────────────────────────────────────────────────────┤
│ 5 - Excellent: Clear, natural stress and intonation               │
│ 4 - Very Good: Generally clear, minor accent                      │
│ 3 - Good: Understandable, some mispronunciation                   │
│ 2 - Fair: Difficult to understand at times                        │
│ 1 - Poor: Very difficult to understand                            │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                  FLUENCY & COHERENCE (1-5)                        │
├───────────────────────────────────────────────────────────────────┤
│ 5 - Excellent: Smooth, natural flow, well-organized               │
│ 4 - Very Good: Generally fluent, minor hesitation                 │
│ 3 - Good: Some hesitation, basic organization                     │
│ 2 - Fair: Frequent pauses, disorganized                           │
│ 1 - Poor: Many long pauses, incoherent                            │
└───────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════
                        SUCCESS METRICS
═══════════════════════════════════════════════════════════════════════

✅ System is successful when:
   • Students can record without technical issues
   • Recordings are clear and audible
   • Submissions save to database
   • Invigilators can access all recordings
   • Evaluations are saved properly
   • No data loss occurs

📊 Monitor these metrics:
   • Submission success rate
   • Average audio quality
   • Evaluation completion time
   • Database storage usage
   • Student feedback on usability
   • Invigilator feedback on efficiency


═══════════════════════════════════════════════════════════════════════
                     TROUBLESHOOTING FLOWCHART
═══════════════════════════════════════════════════════════════════════

Problem: Can't Record
    │
    ├─▶ Check microphone connection
    ├─▶ Allow browser permissions
    ├─▶ Test in system settings
    └─▶ Try different browser

Problem: Can't Submit
    │
    ├─▶ Is server running?
    ├─▶ Check internet connection
    ├─▶ Review browser console
    └─▶ Try again / Contact admin

Problem: Can't Play Recording
    │
    ├─▶ Check browser audio settings
    ├─▶ Try different browser
    ├─▶ Download and play externally
    └─▶ Verify data in database

Problem: Evaluation Won't Save
    │
    ├─▶ Fill all required fields
    ├─▶ Check server connection
    ├─▶ Review browser console
    └─▶ Contact system admin


═══════════════════════════════════════════════════════════════════════
```

**Document Version**: 1.0
**Last Updated**: November 5, 2025
**System**: Cambridge Test System v2 - Speaking Module
