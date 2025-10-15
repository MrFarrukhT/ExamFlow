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
            'listeningStatus', 'listeningStartTime', 'listeningEndTime', 'listeningAnswers',
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

    // Submit test to database
    async submitTestToDatabase() {
        const testData = this.getCurrentTestData();

        try {
            const response = await fetch('http://localhost:3000/api/cambridge-submissions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(testData)
            });

            if (response.ok) {
                console.log('Cambridge test submitted successfully');
                return true;
            } else {
                console.error('Failed to submit Cambridge test');
                return false;
            }
        } catch (error) {
            console.error('Error submitting Cambridge test:', error);
            return false;
        }
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
}

// Create global instance
window.cambridgeAnswerManager = new CambridgeAnswerManager();
