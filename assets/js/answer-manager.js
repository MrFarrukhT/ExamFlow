// Unified Answer Management System
// Handles IELTS and Cambridge answer storage, history, and export
// ADR-022: Merged from answer-manager.js + cambridge-answer-manager.js

function _safeParseJSON(str, fallback) {
    if (!str) return fallback;
    try {
        return JSON.parse(str);
    } catch (e) {
        console.error('Failed to parse stored data:', e);
        return fallback;
    }
}

// ── Autosave indicator (shared by IELTS + Cambridge) ────────────
// Shows a subtle "Answers saved" toast so students know their work is safe.
// Throttled to once per 12 seconds — frequent enough to reassure students
// during active typing without becoming visual noise.
let _lastCambridgeSaveIndicator = 0;
function showCambridgeSaveIndicator() {
    const now = Date.now();
    if (now - _lastCambridgeSaveIndicator < 12000) return;
    _lastCambridgeSaveIndicator = now;
    const existing = document.getElementById('autosave-indicator');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.id = 'autosave-indicator';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.style.cssText = 'position:fixed;bottom:20px;left:20px;background:rgba(46,125,50,0.92);color:white;padding:8px 16px;border-radius:6px;font-size:13px;font-family:system-ui,-apple-system,sans-serif;z-index:2000;display:flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(0,0,0,0.15);transform:translateY(20px);opacity:0;transition:transform 0.3s ease,opacity 0.3s ease;pointer-events:none;';
    el.innerHTML = '<span style="font-size:15px">&#10003;</span> Answers saved';
    document.body.appendChild(el);
    requestAnimationFrame(() => { el.style.transform = 'translateY(0)'; el.style.opacity = '1'; });
    setTimeout(() => { el.style.transform = 'translateY(20px)'; el.style.opacity = '0'; setTimeout(() => { if (el.parentNode) el.remove(); }, 300); }, 2500);
}

// Friendly alias — the indicator is shared, not Cambridge-specific.
// New code should prefer `showSaveIndicator`. The old name is kept for
// backward compatibility with the 22 existing call sites.
const showSaveIndicator = showCambridgeSaveIndicator;

class AnswerManager {
    constructor(examType = 'ielts') {
        this.examType = examType;
        this.isCambridge = examType === 'cambridge';
        this.maxHistoryEntries = 3;

        // Exam-specific configuration
        this.historyKey = this.isCambridge ? 'cambridgeTestHistory' : 'testHistory';
        this.idPrefix = this.isCambridge ? 'CAMBRIDGE_' : 'TEST_';
        this.mockKey = this.isCambridge ? 'selectedCambridgeMock' : 'selectedMock';
        this.modulePrefix = this.isCambridge ? 'cambridge-' : '';

        this.init();
    }

    init() {
        if (!localStorage.getItem(this.historyKey)) {
            localStorage.setItem(this.historyKey, JSON.stringify([]));
        }
    }

    // --- Cambridge-specific: individual answer save/get ---

    saveAnswer(questionNum, answer, module) {
        try {
            const storageKey = `${module}Answers`;
            const answers = _safeParseJSON(localStorage.getItem(storageKey), {});
            answers[questionNum] = answer;
            localStorage.setItem(storageKey, JSON.stringify(answers));
            return true;
        } catch (error) {
            console.error('Error saving answer:', error);
            return false;
        }
    }

    getAnswer(questionNum, module) {
        try {
            const storageKey = `${module}Answers`;
            const answers = _safeParseJSON(localStorage.getItem(storageKey), {});
            return answers[questionNum] || '';
        } catch (error) {
            console.error('Error getting answer:', error);
            return '';
        }
    }

    // --- History management ---

    saveCurrentTestToHistory() {
        const studentId = localStorage.getItem('studentId') || 'Unknown';
        const studentName = localStorage.getItem('studentName') || 'Unknown';
        const mockTest = localStorage.getItem(this.mockKey) || '1';
        const testStartTime = localStorage.getItem('testStartTime');
        const currentTime = new Date().toISOString();

        const testEntry = {
            id: this.generateTestId(),
            studentInfo: {
                id: studentId,
                name: studentName,
                mockTest: mockTest,
                testStartTime: testStartTime,
                completionTime: currentTime
            },
            modules: this.getModulesData(),
            savedAt: currentTime
        };

        if (this.isCambridge) {
            testEntry.examType = 'Cambridge';
            testEntry.studentInfo.level = localStorage.getItem('cambridgeLevel') || 'Unknown';
        }

        const history = _safeParseJSON(localStorage.getItem(this.historyKey), []);
        history.unshift(testEntry);
        if (history.length > this.maxHistoryEntries) {
            history.splice(this.maxHistoryEntries);
        }
        localStorage.setItem(this.historyKey, JSON.stringify(history));
        return testEntry;
    }

    generateTestId() {
        return `${this.idPrefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getTestHistory() {
        return _safeParseJSON(localStorage.getItem(this.historyKey), []);
    }

    // --- Module data retrieval ---

    getModulesData() {
        if (this.isCambridge) {
            return this._getCambridgeModulesData();
        }
        return this._getIeltsModulesData();
    }

    _getIeltsModulesData() {
        const modules = {};
        for (const mod of ['listening', 'reading', 'writing']) {
            modules[mod] = {
                status: localStorage.getItem(`${mod}Status`),
                startTime: localStorage.getItem(`${mod}StartTime`),
                endTime: localStorage.getItem(`${mod}EndTime`),
                answers: _safeParseJSON(localStorage.getItem(`${mod}Answers`), {})
            };
        }
        return modules;
    }

    _getCambridgeModulesData() {
        const level = localStorage.getItem('cambridgeLevel') || '';
        const p = this.modulePrefix; // 'cambridge-'

        // For A1-Movers, consolidate scattered answers before retrieving
        if (level === 'A1-Movers' && typeof window.consolidateMoversAnswers === 'function') {
            window.consolidateMoversAnswers();
        }

        if (level === 'A1-Movers' || level === 'A2-Key') {
            return {
                'reading-writing': {
                    status: localStorage.getItem(`${p}reading-writingStatus`),
                    startTime: localStorage.getItem(`${p}reading-writingStartTime`),
                    endTime: localStorage.getItem(`${p}reading-writingEndTime`),
                    answers: _safeParseJSON(localStorage.getItem(`${p}reading-writingAnswers`), {})
                },
                listening: {
                    status: localStorage.getItem(`${p}listeningStatus`),
                    startTime: localStorage.getItem(`${p}listeningStartTime`),
                    endTime: localStorage.getItem(`${p}listeningEndTime`),
                    answers: _safeParseJSON(localStorage.getItem(`${p}listeningAnswers`), {})
                }
            };
        }

        return {
            reading: {
                status: localStorage.getItem(`${p}readingStatus`),
                startTime: localStorage.getItem(`${p}readingStartTime`),
                endTime: localStorage.getItem(`${p}readingEndTime`),
                answers: _safeParseJSON(localStorage.getItem(`${p}readingAnswers`), {})
            },
            writing: {
                status: localStorage.getItem(`${p}writingStatus`),
                startTime: localStorage.getItem(`${p}writingStartTime`),
                endTime: localStorage.getItem(`${p}writingEndTime`),
                answers: _safeParseJSON(localStorage.getItem(`${p}writingAnswers`), {})
            },
            listening: {
                status: localStorage.getItem(`${p}listeningStatus`),
                startTime: localStorage.getItem(`${p}listeningStartTime`),
                endTime: localStorage.getItem(`${p}listeningEndTime`),
                answers: _safeParseJSON(localStorage.getItem(`${p}listeningAnswers`), {})
            }
        };
    }

    // --- Current test data ---

    getCurrentTestData() {
        const data = {
            studentInfo: {
                id: localStorage.getItem('studentId') || 'Unknown',
                name: localStorage.getItem('studentName') || 'Unknown',
                mockTest: localStorage.getItem(this.mockKey) || '1',
                testStartTime: localStorage.getItem('testStartTime')
            },
            modules: this.getModulesData(),
            exportTime: new Date().toISOString()
        };

        if (this.isCambridge) {
            data.examType = 'Cambridge';
            data.studentInfo.level = localStorage.getItem('cambridgeLevel') || 'Unknown';
        }

        return data;
    }

    // --- Download / Export ---

    downloadCurrentTestTxt() {
        const testEntry = this.getCurrentTestData();
        const formattedText = this.formatTestDataAsText(testEntry);
        let filename;
        if (this.isCambridge) {
            const level = testEntry.studentInfo.level.replace('-', '_');
            const mockTest = testEntry.studentInfo.mockTest || '1';
            filename = `Cambridge_${level}_Mock${mockTest}_${testEntry.studentInfo.id}_${this.getDateString()}.txt`;
        } else {
            filename = `IELTS_Test_${testEntry.studentInfo.id}_${this.getDateString()}.txt`;
        }
        this.downloadTextFile(formattedText, filename);
    }

    downloadHistoricalTestTxt(testId) {
        const history = this.getTestHistory();
        const testEntry = history.find(entry => entry.id === testId);
        if (!testEntry) {
            alert('Test not found in history!');
            return;
        }
        const formattedText = this.formatTestDataAsText(testEntry);
        const dateStr = new Date(testEntry.savedAt).toISOString().split('T')[0];
        let filename;
        if (this.isCambridge) {
            const level = testEntry.studentInfo.level.replace('-', '_');
            const mockTest = testEntry.studentInfo.mockTest || '1';
            filename = `Cambridge_${level}_Mock${mockTest}_${testEntry.studentInfo.id}_${dateStr}.txt`;
        } else {
            filename = `IELTS_Test_${testEntry.studentInfo.id}_${dateStr}.txt`;
        }
        this.downloadTextFile(formattedText, filename);
    }

    formatTestDataAsText(testData) {
        const formatDate = (dateStr) => {
            if (!dateStr) return 'Not started';
            return new Date(dateStr).toLocaleString();
        };

        const formatAnswers = (answers, module) => {
            let result = '';
            const entries = Object.entries(answers);
            if (entries.length === 0) return '    No answers recorded\n';

            entries.forEach(([key, value]) => {
                if (module === 'writing' || module === 'reading-writing') {
                    if (key.startsWith('task_')) {
                        const taskNumber = key.split('_')[1];
                        result += `    Task ${taskNumber}:\n`;
                        result += `    ${value || 'No response'}\n`;
                        result += `    (Word count: ${this.countWords(value)})\n\n`;
                    } else {
                        result += `    ${key}: ${value || 'No answer'}\n`;
                    }
                } else {
                    if (Array.isArray(value)) {
                        result += `    ${key}: ${value.join(', ')}\n`;
                    } else {
                        result += `    ${key}: ${value || 'No answer'}\n`;
                    }
                }
            });
            return result;
        };

        const examLabel = this.isCambridge ? 'CAMBRIDGE GENERAL ENGLISH' : 'IELTS';
        let text = `${examLabel} TEST RESULTS\n`;
        text += `${'='.repeat(50)}\n\n`;

        // Student Information
        text += `STUDENT INFORMATION:\n`;
        text += `-`.repeat(20) + `\n`;
        text += `Student ID: ${testData.studentInfo.id}\n`;
        text += `Full Name: ${testData.studentInfo.name}\n`;
        if (this.isCambridge) {
            text += `Level: ${testData.studentInfo.level}\n`;
            text += `Mock Test: ${testData.studentInfo.mockTest || '1'}\n`;
        } else {
            text += `Mock Test: MOCK ${testData.studentInfo.mockTest}\n`;
        }
        text += `Test Start: ${formatDate(testData.studentInfo.testStartTime)}\n`;
        text += `Export Time: ${formatDate(testData.exportTime || testData.savedAt)}\n\n`;

        // Test Results by Module
        const modules = this.isCambridge ? Object.keys(testData.modules) : ['listening', 'reading', 'writing'];
        const level = testData.studentInfo.level;

        modules.forEach(module => {
            const moduleData = testData.modules[module];
            if (this.isCambridge) {
                const moduleName = module.toUpperCase().replace('-', ' & ');
                text += `${level} - ${moduleName} TEST:\n`;
                text += `-`.repeat(30) + `\n`;
            } else {
                text += `${module.toUpperCase()} TEST:\n`;
                text += `-`.repeat(15) + `\n`;
            }
            text += `Status: ${moduleData.status || 'Not started'}\n`;
            text += `Start Time: ${formatDate(moduleData.startTime)}\n`;
            if (moduleData.endTime) {
                text += `End Time: ${formatDate(moduleData.endTime)}\n`;
            }
            text += `Answers:\n`;
            text += formatAnswers(moduleData.answers, module);
            text += `\n`;
        });

        // Footer
        text += `${'='.repeat(50)}\n`;
        if (this.isCambridge) {
            text += `Generated by Cambridge Test System v1.0\n`;
            text += `Innovative Centre - Cambridge General English Platform\n`;
        } else {
            text += `Generated by IELTS Test System v2.0\n`;
            text += `Innovative Centre - IELTS Testing Platform\n`;
        }
        text += `Report generated on: ${new Date().toLocaleString()}\n`;

        return text;
    }

    // --- Utility methods ---

    countWords(text) {
        if (!text || typeof text !== 'string') return 0;
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    downloadTextFile(content, filename) {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    getDateString() {
        return new Date().toISOString().split('T')[0];
    }

    // --- Session management ---

    clearCurrentTestSession() {
        const keysToRemove = this.isCambridge ? [
            'studentId', 'studentName', 'cambridgeLevel', 'examType', 'testStartTime',
            'cambridge-listeningStatus', 'cambridge-listeningStartTime', 'cambridge-listeningEndTime', 'cambridge-listeningAnswers', 'cambridge-listeningTestStarted',
            'cambridge-readingStatus', 'cambridge-readingStartTime', 'cambridge-readingEndTime', 'cambridge-readingAnswers',
            'cambridge-writingStatus', 'cambridge-writingStartTime', 'cambridge-writingEndTime', 'cambridge-writingAnswers',
            'cambridge-reading-writingStatus', 'cambridge-reading-writingStartTime', 'cambridge-reading-writingEndTime', 'cambridge-reading-writingAnswers',
            'cambridge-speakingStatus', 'cambridge-speakingStartTime', 'cambridge-speakingEndTime',
            'distractionFreeMode'
        ] : [
            'studentId', 'studentName', 'selectedMock', 'testStartTime',
            'listeningStatus', 'listeningStartTime', 'listeningEndTime', 'listeningAnswers',
            'readingStatus', 'readingStartTime', 'readingEndTime', 'readingAnswers',
            'writingStatus', 'writingStartTime', 'writingEndTime', 'writingAnswers',
            'distractionFreeMode'
        ];
        keysToRemove.forEach(key => localStorage.removeItem(key));
    }

    clearAllData() {
        localStorage.clear();
    }

    getTestSummary() {
        const history = this.getTestHistory();
        return history.map(entry => {
            const summary = {
                id: entry.id,
                studentName: entry.studentInfo.name,
                studentId: entry.studentInfo.id,
                completionDate: new Date(entry.savedAt).toLocaleDateString(),
                completionTime: new Date(entry.savedAt).toLocaleTimeString(),
                modulesCompleted: Object.keys(entry.modules).filter(module =>
                    entry.modules[module].status === 'completed'
                ).length
            };
            if (this.isCambridge) {
                summary.examType = 'Cambridge';
                summary.level = entry.studentInfo.level;
            } else {
                summary.mockTest = entry.studentInfo.mockTest;
            }
            return summary;
        });
    }

    // --- Cambridge-specific: database submission ---

    async submitTestToDatabase() {
        const testData = this.getCurrentTestData();
        let success = false;

        // Get skill from page's data-skill attribute (most reliable for Cambridge)
        let skill = null;
        if (typeof document !== 'undefined' && document.body) {
            skill = document.body.getAttribute('data-skill');
        }
        if (!skill) {
            skill = this.determineSkillFromModules(testData.modules);
        }

        // Collect anti-cheat metadata from distraction-free mode
        const antiCheat = (typeof distractionFreeMode !== 'undefined' && distractionFreeMode.getAntiCheatData)
            ? distractionFreeMode.getAntiCheatData()
            : {};

        try {
            const response = await fetch('/cambridge-submissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: testData.studentInfo.id,
                    studentName: testData.studentInfo.name,
                    examType: localStorage.getItem('examType') || 'Cambridge',
                    level: testData.studentInfo.level,
                    mockTest: testData.studentInfo.mockTest || '1',
                    skill: skill,
                    answers: this.flattenAnswers(testData.modules, skill),
                    score: null,
                    grade: null,
                    startTime: testData.studentInfo.testStartTime,
                    endTime: new Date().toISOString(),
                    antiCheat
                })
            });
            if (response.ok) success = true;
        } catch (error) {
            // Fall through to local storage fallback
        }

        try {
            const existingData = localStorage.getItem('cambridge_submissions_database') || '[]';
            const submissions = JSON.parse(existingData);
            submissions.push({
                id: Date.now(),
                examType: localStorage.getItem('examType') || 'Cambridge',
                studentId: testData.studentInfo.id,
                studentName: testData.studentInfo.name,
                level: testData.studentInfo.level,
                mockTest: testData.studentInfo.mockTest || '1',
                skill: skill,
                answers: this.flattenAnswers(testData.modules, skill),
                testStartTime: testData.studentInfo.testStartTime,
                completionTime: new Date().toISOString(),
                modules: testData.modules,
                saved_locally: !success,
                created_at: new Date().toISOString()
            });
            localStorage.setItem('cambridge_submissions_database', JSON.stringify(submissions));
            this.saveCurrentTestToHistory();
            return true;
        } catch (error) {
            console.error('Error submitting Cambridge test:', error);
            return false;
        }
    }

    determineSkillFromModules(modules) {
        const moduleNames = Object.keys(modules);
        if (moduleNames.includes('reading-writing')) return 'reading-writing';
        if (moduleNames.includes('reading-use-of-english')) return 'reading-use-of-english';

        let mostRecentModule = null;
        let mostRecentTime = 0;
        moduleNames.forEach(moduleName => {
            const moduleData = modules[moduleName];
            if (moduleData && moduleData.status === 'completed' && moduleData.endTime) {
                const endTime = new Date(moduleData.endTime).getTime();
                if (endTime > mostRecentTime) {
                    mostRecentTime = endTime;
                    mostRecentModule = moduleName;
                }
            }
        });
        if (mostRecentModule) return mostRecentModule;

        for (const moduleName of moduleNames) {
            if (modules[moduleName] && modules[moduleName].status === 'completed') return moduleName;
        }
        return moduleNames.length > 0 ? moduleNames[0] : 'unknown';
    }

    flattenAnswers(modules, skill = null) {
        const allAnswers = {};
        const skillToModule = {
            'reading': 'reading', 'writing': 'writing',
            'listening': 'listening', 'reading-writing': 'reading-writing'
        };
        const targetModule = skill ? skillToModule[skill] : null;

        Object.keys(modules).forEach(moduleName => {
            if (targetModule && moduleName !== targetModule) return;
            const moduleAnswers = modules[moduleName].answers || {};
            Object.keys(moduleAnswers).forEach(key => {
                allAnswers[`${moduleName}_${key}`] = moduleAnswers[key];
            });
        });
        return allAnswers;
    }
}

// Auto-detect exam type from localStorage and create global instance
const _detectedExamType = (localStorage.getItem('examType') || '').toLowerCase() === 'cambridge' ? 'cambridge' : 'ielts';
window.answerManager = new AnswerManager(_detectedExamType);
// Backward compatibility: Cambridge code references window.cambridgeAnswerManager
if (_detectedExamType === 'cambridge') {
    window.cambridgeAnswerManager = window.answerManager;
}
