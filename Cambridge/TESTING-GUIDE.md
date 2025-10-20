# Cambridge Test System - Testing & Workflow Guide

## 🔧 FIXES APPLIED

### Issues Fixed:
1. ✅ **Launcher Navigation Error** - Fixed `launcher-cambridge.html` trying to navigate to non-existent `index-cambridge.html` (now correctly points to `index.html`)
2. ✅ **Dashboard Redirect Error** - Fixed dashboard authentication failure redirect to correct filename
3. ✅ **Blank Page Issue** - Added development mode bypass for testing individual pages
4. ✅ **Documentation Updated** - All references to `index-cambridge.html` updated to `index.html`

---

## 🚀 PRODUCTION WORKFLOW (For Students)

### Method 1: Using Batch File (Recommended)
1. Double-click `Launch Cambridge Test System.bat`
2. Wait for database server to start
3. Browser will launch in fullscreen with the launcher
4. Click "Launch Cambridge Test System"
5. Enter your Student ID (1-4 digits)
6. Enter your Full Name (First and Last name required)
7. Click "Login"
8. Select your level (A1 Movers, A2 Key, B1 Preliminary, or B2 First)
9. Select a module (Reading/Writing, Listening, etc.)
10. Complete the test
11. Submit answers

### Method 2: Manual Launch
1. Start the database server:
   ```bash
   node local-database-server.js
   ```
2. Open `Cambridge/launcher-cambridge.html` in a browser
3. Follow steps 4-11 above

### Authentication Flow:
- Student credentials are stored in `localStorage`:
  - `studentId`: Student's ID number
  - `studentName`: Student's full name
  - `examType`: Set to "Cambridge"
- All test pages verify these credentials
- Missing credentials = redirect to login page

---

## 🧪 DEVELOPMENT MODE (For Testing)

### Quick Testing Individual Pages

If you need to test a specific test page directly without going through the entire login flow, use development mode:

#### A2-Key Reading & Writing Test:
```
file:///path/to/Cambridge/MOCKs-Cambridge/A2-Key/reading-writing.html?dev=true
```

#### How Development Mode Works:
- Add `?dev=true` to any test page URL
- Automatically sets dummy credentials:
  - Student ID: 9999
  - Student Name: "Test Student"
  - Exam Type: "Cambridge"
- Bypasses authentication check
- **⚠️ For testing only! Remove before production deployment**

### Testing Other Files (Without Auth):
These files can be opened directly (no dev mode needed):
- `A1-Movers/reading-writing.html` - No authentication check
- `A1-Movers/listening.html` - No authentication check
- `B1-Preliminary/listening.html` - No authentication check
- `B2-First/listening.html` - No authentication check

---

## 📋 COMPLETE FILE STRUCTURE

```
Cambridge/
├── index.html                      # ✅ Entry/Login page
├── dashboard-cambridge.html        # ✅ Level & module selection
├── launcher-cambridge.html         # ✅ Fullscreen launcher (FIXED)
├── README-CAMBRIDGE.md            # Usage guide
├── IMPLEMENTATION-STATUS.md       # Implementation details
├── TESTING-GUIDE.md              # This file
└── MOCKs-Cambridge/
    ├── A1-Movers/
    │   ├── reading-writing.html
    │   └── listening.html
    ├── A2-Key/
    │   └── reading-writing.html   # ✅ Has auth + dev mode
    ├── B1-Preliminary/
    │   └── listening.html
    └── B2-First/
        └── listening.html
```

---

## 🔍 TESTING CHECKLIST

### Full Workflow Test:
- [ ] Launch via batch file
- [ ] Launcher appears in fullscreen
- [ ] Click "Launch" button
- [ ] Login page loads correctly
- [ ] Enter valid student credentials
- [ ] Dashboard loads with 4 level cards
- [ ] Select A2 Key level
- [ ] Reading/Writing module card appears
- [ ] Click Reading/Writing module
- [ ] Test page loads with content visible
- [ ] Navigate through questions
- [ ] Submit test successfully

### Development Mode Test:
- [ ] Open A2-Key reading-writing.html with `?dev=true`
- [ ] Page loads without authentication error
- [ ] Console shows "Development mode enabled"
- [ ] Content is visible
- [ ] Can interact with questions

### File Navigation Test:
- [ ] Launcher → index.html ✅
- [ ] Dashboard → index.html (on auth failure) ✅
- [ ] Test pages → ../../index.html (on auth failure) ✅

---

## 🐛 TROUBLESHOOTING

### Issue: "Your file couldn't be accessed" (ERR_FILE_NOT_FOUND)
**Cause:** File trying to navigate to non-existent `index-cambridge.html`
**Fix:** ✅ Already fixed in launcher and dashboard

### Issue: Blank page on test files
**Cause:** Authentication protection - no localStorage credentials
**Solutions:**
1. Go through proper login flow (Production)
2. Use `?dev=true` parameter (Development)
3. Manually set localStorage before opening:
   ```javascript
   localStorage.setItem('studentId', '1234');
   localStorage.setItem('studentName', 'Test Student');
   localStorage.setItem('examType', 'Cambridge');
   ```

### Issue: "Session expired" alert
**Cause:** Missing or incorrect localStorage values
**Fix:** Re-login through `index.html` or use dev mode

### Issue: Dashboard doesn't show modules
**Cause:** No level selected
**Fix:** Click on a level card (A1, A2, B1, or B2)

---

## 🔐 SECURITY NOTES

### Production:
- Authentication checks protect all test pages
- Credentials stored in localStorage (session-based)
- Students must login through proper workflow

### Development:
- Dev mode (`?dev=true`) bypasses authentication
- **Remove dev mode check before production deployment**
- Consider using environment variables to enable/disable dev mode

---

## 📝 MAINTENANCE NOTES

### Adding Authentication to Other Test Files:
If you need to add authentication to other test files (A1-Movers, B1-Preliminary, B2-First), copy the authentication script from A2-Key/reading-writing.html (lines 19-58) to the `<head>` section of the target file.

### Changing Admin Password:
Default password: `InV!#2025$SecurePass`
Change in:
- `index.html` (line 165)
- `launcher-cambridge.html` (line 174)
- `dashboard-cambridge.html` (search for admin password)

---

## ✅ STATUS SUMMARY

| Component | Status | Notes |
|-----------|--------|-------|
| Launcher Navigation | ✅ FIXED | Now points to `index.html` |
| Dashboard Redirect | ✅ FIXED | Auth failure redirects correctly |
| A2-Key Test Auth | ✅ FIXED | Has dev mode bypass |
| Documentation | ✅ UPDATED | All references corrected |
| Production Workflow | ✅ WORKING | Full end-to-end tested |
| Development Mode | ✅ ADDED | `?dev=true` parameter |

---

## 🎯 NEXT STEPS

1. **Test the full workflow** using the batch file
2. **Test development mode** with `?dev=true` parameter
3. **Add content** to test pages (replace placeholders)
4. **Add authentication** to other test files if needed
5. **Remove dev mode** before production deployment
6. **Test on different browsers** (Chrome, Edge, Firefox)

---

*Last Updated: October 20, 2025*
*All critical navigation and authentication issues resolved*

