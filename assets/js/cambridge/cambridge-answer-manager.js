// Cambridge Answer Management System
// Handles Cambridge-specific answer storage and submission

class CambridgeAnswerManager {
    constructor() {
        this.maxHistoryEntries = 3;
        this.init();
    }

    init() {
        if (!localStorage.getItem('cambridgeTestHistory')) {
            localStorage.setItem('cambridgeTestHistory', JSON.stringify([]));
        }
    }
    
    // Save individual answer to localStorage
    saveAnswer(questionNum, answer, module) {
        try {
            const storageKey = `${module}Answers`;
            const answers = JSON.parse(localStorage.getItem(storageKey) || '{}');
            answers[questionNum] = answer;
            localStorage.setItem(storageKey, JSON.stringify(answers));
            return true;
        } catch (error) {
            console.error('Error saving answer:', error);
            return false;
        }
    }
    
    // Get saved answer from localStorage
    getAnswer(questionNum, module) {
        try {
            const storageKey = `${module}Answers`;
            const answers = JSON.parse(localStorage.getItem(storageKey) || '{}');
            return answers[questionNum] || '';
        } catch (error) {
            console.error('Error getting answer:', error);
            return '';
        }
    }

    // Save current Cambridge test to history
    saveCurrentTestToHistory() {
        const studentId = localStorage.getItem('studentId') || 'Unknown';
        const studentName = localStorage.getItem('studentName') || 'Unknown';
        const level = localStorage.getItem('cambridgeLevel') || 'Unknown';
        const mockTest = localStorage.getItem('selectedCambridgeMock') || '1';
        const testStartTime = localStorage.getItem('testStartTime');
        const currentTime = new Date().toISOString();

        const testEntry = {
            id: this.generateTestId(),
            examType: 'Cambridge',
            studentInfo: {
                id: studentId,
                name: studentName,
                level: level,
                mockTest: mockTest,
                testStartTime: testStartTime,
                completionTime: currentTime
            },
            modules: this.getModulesData(level),
            savedAt: currentTime
        };

        const history = JSON.parse(localStorage.getItem('cambridgeTestHistory') || '[]');
        history.unshift(testEntry);

        if (history.length > this.maxHistoryEntries) {
            history.splice(this.maxHistoryEntries);
        }

        localStorage.setItem('cambridgeTestHistory', JSON.stringify(history));
        return testEntry;
    }

    // Get modules data based on level
    // Uses cambridge- prefixed keys to avoid collision with IELTS storage
    getModulesData(level) {
        if (level === 'A1-Movers' || level === 'A2-Key') {
            // For A1-Movers, consolidate scattered answers before retrieving
            if (level === 'A1-Movers' && typeof window.consolidateMoversAnswers === 'function') {
                window.consolidateMoversAnswers();
            }

            return {
                'reading-writing': {
                    status: localStorage.getItem('cambridge-reading-writingStatus'),
                    startTime: localStorage.getItem('cambridge-reading-writingStartTime'),
                    endTime: localStorage.getItem('cambridge-reading-writingEndTime'),
                    answers: JSON.parse(localStorage.getItem('cambridge-reading-writingAnswers') || '{}')
                },
                listening: {
                    status: localStorage.getItem('cambridge-listeningStatus'),
                    startTime: localStorage.getItem('cambridge-listeningStartTime'),
                    endTime: localStorage.getItem('cambridge-listeningEndTime'),
                    answers: JSON.parse(localStorage.getItem('cambridge-listeningAnswers') || '{}')
                }
            };
        } else {
            return {
                reading: {
                    status: localStorage.getItem('cambridge-readingStatus'),
                    startTime: localStorage.getItem('cambridge-readingStartTime'),
                    endTime: localStorage.getItem('cambridge-readingEndTime'),
                    answers: JSON.parse(localStorage.getItem('cambridge-readingAnswers') || '{}')
                },
                writing: {
                    status: localStorage.getItem('cambridge-writingStatus'),
                    startTime: localStorage.getItem('cambridge-writingStartTime'),
                    endTime: localStorage.getItem('cambridge-writingEndTime'),
                    answers: JSON.parse(localStorage.getItem('cambridge-writingAnswers') || '{}')
                },
                listening: {
                    status: localStorage.getItem('cambridge-listeningStatus'),
                    startTime: localStorage.getItem('cambridge-listeningStartTime'),
                    endTime: localStorage.getItem('cambridge-listeningEndTime'),
                    answers: JSON.parse(localStorage.getItem('cambridge-listeningAnswers') || '{}')
                }
            };
        }
    }

    generateTestId() {
        return `CAMBRIDGE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getTestHistory() {
        return JSON.parse(localStorage.getItem('cambridgeTestHistory') || '[]');
    }

    // Download current test as formatted text file
    downloadCurrentTestTxt() {
        const testEntry = this.getCurrentTestData();
        const formattedText = this.formatTestDataAsText(testEntry);
        const level = testEntry.studentInfo.level.replace('-', '_');
        const mockTest = testEntry.studentInfo.mockTest || '1';
        this.downloadTextFile(formattedText, `Cambridge_${level}_Mock${mockTest}_${testEntry.studentInfo.id}_${this.getDateString()}.txt`);
    }

    // Get current test data
    getCurrentTestData() {
        const studentId = localStorage.getItem('studentId') || 'Unknown';
        const studentName = localStorage.getItem('studentName') || 'Unknown';
        const level = localStorage.getItem('cambridgeLevel') || 'Unknown';
        const mockTest = localStorage.getItem('selectedCambridgeMock') || '1';
        const testStartTime = localStorage.getItem('testStartTime');

        return {
            examType: 'Cambridge',
            studentInfo: {
                id: studentId,
                name: studentName,
                level: level,
                mockTest: mockTest,
                testStartTime: testStartTime
            },
            modules: this.getModulesData(level),
            exportTime: new Date().toISOString()
        };
    }

    // Format test data as readable text
    formatTestDataAsText(testData) {
        const formatDate = (dateStr) => {
            if (!dateStr) return 'Not started';
            return new Date(dateStr).toLocaleString();
        };

        const formatAnswers = (answers, module) => {
            let result = '';
            const entries = Object.entries(answers);

            if (entries.length === 0) {
                return '    No answers recorded\n';
            }

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

        let text = `CAMBRIDGE GENERAL ENGLISH TEST RESULTS\n`;
        text += `${'='.repeat(50)}\n\n`;

        // Student Information
        text += `STUDENT INFORMATION:\n`;
        text += `-`.repeat(20) + `\n`;
        text += `Student ID: ${testData.studentInfo.id}\n`;
        text += `Full Name: ${testData.studentInfo.name}\n`;
        text += `Level: ${testData.studentInfo.level}\n`;
        text += `Mock Test: ${testData.studentInfo.mockTest || '1'}\n`;
        text += `Test Start: ${formatDate(testData.studentInfo.testStartTime)}\n`;
        text += `Export Time: ${formatDate(testData.exportTime || testData.savedAt)}\n\n`;

        // Test Results by Module
        const modules = Object.keys(testData.modules);
        const level = testData.studentInfo.level;

        modules.forEach(module => {
            const moduleData = testData.modules[module];
            const moduleName = module.toUpperCase().replace('-', ' & ');
            text += `${level} - ${moduleName} TEST:\n`;
            text += `-`.repeat(30) + `\n`;
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
        text += `Generated by Cambridge Test System v1.0\n`;
        text += `Innovative Centre - Cambridge General English Platform\n`;
        text += `Report generated on: ${new Date().toLocaleString()}\n`;

        return text;
    }

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

    // Clear current Cambridge test session
    clearCurrentTestSession() {
        const keysToRemove = [
            'studentId', 'studentName', 'cambridgeLevel', 'examType', 'testStartTime',
            // Cambridge-prefixed keys (to avoid collision with IELTS)
            'cambridge-listeningStatus', 'cambridge-listeningStartTime', 'cambridge-listeningEndTime', 'cambridge-listeningAnswers', 'cambridge-listeningTestStarted',
            'cambridge-readingStatus', 'cambridge-readingStartTime', 'cambridge-readingEndTime', 'cambridge-readingAnswers',
            'cambridge-writingStatus', 'cambridge-writingStartTime', 'cambridge-writingEndTime', 'cambridge-writingAnswers',
            'cambridge-reading-writingStatus', 'cambridge-reading-writingStartTime', 'cambridge-reading-writingEndTime', 'cambridge-reading-writingAnswers',
            'distractionFreeMode'
        ];

        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });

    }

    // Submit test to database with fallback to local storage
    async submitTestToDatabase() {
        const testData = this.getCurrentTestData();
        let success = false;

        // Get skill directly from the page's data-skill attribute (most reliable)
        // This works for ALL Cambridge test levels (A1, A2, B1, B2)
        let skill = null;
        if (typeof document !== 'undefined' && document.body) {
            skill = document.body.getAttribute('data-skill');
        }

        // Fallback to module detection if data-skill not found on page
        if (!skill) {
            skill = this.determineSkillFromModules(testData.modules);
        }


        // Try multiple database endpoints
        try {
            // First try: Cambridge dedicated server endpoint (port 3003)
            const response = await fetch('/cambridge-submissions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    studentId: testData.studentInfo.id,
                    studentName: testData.studentInfo.name,
                    level: testData.studentInfo.level,
                    mockTest: testData.studentInfo.mockTest || '1',
                    skill: skill,
                    answers: this.flattenAnswers(testData.modules, skill),
                    score: null,
                    grade: null,
                    startTime: testData.studentInfo.testStartTime,
                    endTime: new Date().toISOString()
                })
            });

            if (response.ok) {
                success = true;
            }
        } catch (error) {
        }

        // Fallback: Save to enhanced local storage (database format)
        try {
            const existingData = localStorage.getItem('cambridge_submissions_database') || '[]';
            const submissions = JSON.parse(existingData);

            const newSubmission = {
                id: Date.now(),
                examType: 'Cambridge',
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
            };

            submissions.push(newSubmission);
            localStorage.setItem('test_submissions_database', JSON.stringify(submissions));

            // Also save to history
            this.saveCurrentTestToHistory();

            return true;
        } catch (error) {
            console.error('Error submitting Cambridge test:', error);
            return false;
        }
    }

    // Download historical test as formatted text file
    downloadHistoricalTestTxt(testId) {
        const history = this.getTestHistory();
        const testEntry = history.find(entry => entry.id === testId);
        
        if (!testEntry) {
            alert('Test not found in history!');
            return;
        }
        
        const formattedText = this.formatTestDataAsText(testEntry);
        const dateStr = new Date(testEntry.savedAt).toISOString().split('T')[0];
        const level = testEntry.studentInfo.level.replace('-', '_');
        const mockTest = testEntry.studentInfo.mockTest || '1';
        this.downloadTextFile(formattedText, `Cambridge_${level}_Mock${mockTest}_${testEntry.studentInfo.id}_${dateStr}.txt`);
    }

    // Clear all data including history
    clearAllData() {
        localStorage.clear();
    }

    getTestSummary() {
        const history = this.getTestHistory();
        return history.map(entry => ({
            id: entry.id,
            examType: 'Cambridge',
            studentName: entry.studentInfo.name,
            studentId: entry.studentInfo.id,
            level: entry.studentInfo.level,
            completionDate: new Date(entry.savedAt).toLocaleDateString(),
            completionTime: new Date(entry.savedAt).toLocaleTimeString(),
            modulesCompleted: Object.keys(entry.modules).filter(module =>
                entry.modules[module].status === 'completed'
            ).length
        }));
    }

    // Helper to determine primary skill from modules
    // For B1-Preliminary and B2-First, multiple modules exist - find the most recently completed one
    determineSkillFromModules(modules) {
        const moduleNames = Object.keys(modules);

        // Check for specific combined skills first (A1-Movers, A2-Key)
        if (moduleNames.includes('reading-writing')) return 'reading-writing';
        if (moduleNames.includes('reading-use-of-english')) return 'reading-use-of-english';

        // For B1-Preliminary and B2-First, find the module that was most recently completed
        // by checking endTime or status
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

        // If we found a recently completed module, return it
        if (mostRecentModule) {
            return mostRecentModule;
        }

        // Fallback: check for any completed module
        for (const moduleName of moduleNames) {
            const moduleData = modules[moduleName];
            if (moduleData && moduleData.status === 'completed') {
                return moduleName;
            }
        }

        // Last fallback: return first module name if any exist
        if (moduleNames.length > 0) return moduleNames[0];
        return 'unknown';
    }

    // Helper to flatten nested module answers into single object
    // If skill is provided, only include answers from that module
    flattenAnswers(modules, skill = null) {
        const allAnswers = {};

        // Map skill to module name
        const skillToModule = {
            'reading': 'reading',
            'writing': 'writing',
            'listening': 'listening',
            'reading-writing': 'reading-writing'
        };

        const targetModule = skill ? skillToModule[skill] : null;

        Object.keys(modules).forEach(moduleName => {
            // If a specific skill/module is requested, only include that module's answers
            if (targetModule && moduleName !== targetModule) {
                return; // Skip other modules
            }

            const moduleAnswers = modules[moduleName].answers || {};
            Object.keys(moduleAnswers).forEach(key => {
                allAnswers[`${moduleName}_${key}`] = moduleAnswers[key];
            });
        });
        return allAnswers;
    }
}

// Create global instance
window.cambridgeAnswerManager = new CambridgeAnswerManager();
