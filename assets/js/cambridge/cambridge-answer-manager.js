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

    // Save current Cambridge test to history
    saveCurrentTestToHistory() {
        const studentId = localStorage.getItem('studentId') || 'Unknown';
        const studentName = localStorage.getItem('studentName') || 'Unknown';
        const level = localStorage.getItem('cambridgeLevel') || 'Unknown';
        const testStartTime = localStorage.getItem('testStartTime');
        const currentTime = new Date().toISOString();

        const testEntry = {
            id: this.generateTestId(),
            examType: 'Cambridge',
            studentInfo: {
                id: studentId,
                name: studentName,
                level: level,
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
    getModulesData(level) {
        if (level === 'A1-Movers' || level === 'A2-Key') {
            return {
                'reading-writing': {
                    status: localStorage.getItem('reading-writingStatus'),
                    startTime: localStorage.getItem('reading-writingStartTime'),
                    endTime: localStorage.getItem('reading-writingEndTime'),
                    answers: JSON.parse(localStorage.getItem('reading-writingAnswers') || '{}')
                },
                listening: {
                    status: localStorage.getItem('listeningStatus'),
                    startTime: localStorage.getItem('listeningStartTime'),
                    endTime: localStorage.getItem('listeningEndTime'),
                    answers: JSON.parse(localStorage.getItem('listeningAnswers') || '{}')
                }
            };
        } else {
            return {
                reading: {
                    status: localStorage.getItem('readingStatus'),
                    startTime: localStorage.getItem('readingStartTime'),
                    endTime: localStorage.getItem('readingEndTime'),
                    answers: JSON.parse(localStorage.getItem('readingAnswers') || '{}')
                },
                writing: {
                    status: localStorage.getItem('writingStatus'),
                    startTime: localStorage.getItem('writingStartTime'),
                    endTime: localStorage.getItem('writingEndTime'),
                    answers: JSON.parse(localStorage.getItem('writingAnswers') || '{}')
                },
                listening: {
                    status: localStorage.getItem('listeningStatus'),
                    startTime: localStorage.getItem('listeningStartTime'),
                    endTime: localStorage.getItem('listeningEndTime'),
                    answers: JSON.parse(localStorage.getItem('listeningAnswers') || '{}')
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
        this.downloadTextFile(formattedText, `Cambridge_${level}_${testEntry.studentInfo.id}_${this.getDateString()}.txt`);
    }

    // Get current test data
    getCurrentTestData() {
        const studentId = localStorage.getItem('studentId') || 'Unknown';
        const studentName = localStorage.getItem('studentName') || 'Unknown';
        const level = localStorage.getItem('cambridgeLevel') || 'Unknown';
        const testStartTime = localStorage.getItem('testStartTime');

        return {
            examType: 'Cambridge',
            studentInfo: {
                id: studentId,
                name: studentName,
                level: level,
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
        text += `Test Start: ${formatDate(testData.studentInfo.testStartTime)}\n`;
        text += `Export Time: ${formatDate(testData.exportTime || testData.savedAt)}\n\n`;

        // Test Results by Module
        const modules = Object.keys(testData.modules);

        modules.forEach(module => {
            const moduleData = testData.modules[module];
            text += `${module.toUpperCase().replace('-', ' & ')} TEST:\n`;
            text += `-`.repeat(15) + `\n`;
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
            'listeningStatus', 'listeningStartTime', 'listeningEndTime', 'listeningAnswers', 'listeningTestStarted',
            'readingStatus', 'readingStartTime', 'readingEndTime', 'readingAnswers',
            'writingStatus', 'writingStartTime', 'writingEndTime', 'writingAnswers',
            'reading-writingStatus', 'reading-writingStartTime', 'reading-writingEndTime', 'reading-writingAnswers',
            'distractionFreeMode'
        ];

        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });

        console.log('Current Cambridge test session cleared. Historical data preserved.');
    }

    // Submit test to database with fallback to local storage
    async submitTestToDatabase() {
        const testData = this.getCurrentTestData();
        let success = false;

        // Try multiple database endpoints
        try {
            // First try: Cambridge dedicated server endpoint (port 3003)
            const response = await fetch('http://localhost:3003/cambridge-submissions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    studentId: testData.studentInfo.id,
                    studentName: testData.studentInfo.name,
                    level: testData.studentInfo.level,
                    skill: this.determineSkillFromModules(testData.modules),
                    answers: this.flattenAnswers(testData.modules),
                    score: null,
                    grade: null,
                    startTime: testData.studentInfo.testStartTime,
                    endTime: new Date().toISOString()
                })
            });

            if (response.ok) {
                console.log('✅ Cambridge test submitted to database successfully');
                success = true;
            }
        } catch (error) {
            console.log('Cambridge database server not available, using fallback storage...');
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
                testStartTime: testData.studentInfo.testStartTime,
                completionTime: new Date().toISOString(),
                modules: testData.modules,
                saved_locally: !success,
                created_at: new Date().toISOString()
            };

            submissions.push(newSubmission);
            localStorage.setItem('test_submissions_database', JSON.stringify(submissions));

            console.log('✅ Cambridge test saved to local database storage');
            
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
        this.downloadTextFile(formattedText, `Cambridge_${level}_${testEntry.studentInfo.id}_${dateStr}.txt`);
    }

    // Clear all data including history
    clearAllData() {
        localStorage.clear();
        console.log('All Cambridge data cleared including test history.');
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
    determineSkillFromModules(modules) {
        const moduleNames = Object.keys(modules);
        if (moduleNames.includes('reading-writing')) return 'reading-writing';
        if (moduleNames.includes('reading-use-of-english')) return 'reading-use-of-english';
        if (moduleNames.length > 0) return moduleNames[0];
        return 'unknown';
    }

    // Helper to flatten nested module answers into single object
    flattenAnswers(modules) {
        const allAnswers = {};
        Object.keys(modules).forEach(moduleName => {
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
