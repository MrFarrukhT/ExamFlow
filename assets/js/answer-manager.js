// Advanced Answer Management System
// Handles downloadable text files, historical data, and persistent storage

class AnswerManager {
    constructor() {
        this.maxHistoryEntries = 3; // Keep last 3 tests
        this.init();
    }

    init() {
        // Initialize history structure if it doesn't exist
        if (!localStorage.getItem('testHistory')) {
            localStorage.setItem('testHistory', JSON.stringify([]));
        }
    }

    // Save current test to history with timestamp
    saveCurrentTestToHistory() {
        const studentId = localStorage.getItem('studentId') || 'Unknown';
        const studentName = localStorage.getItem('studentName') || 'Unknown';
        const mockTest = localStorage.getItem('selectedMock') || '1';
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
            modules: {
                listening: {
                    status: localStorage.getItem('listeningStatus'),
                    startTime: localStorage.getItem('listeningStartTime'),
                    endTime: localStorage.getItem('listeningEndTime'),
                    answers: JSON.parse(localStorage.getItem('listeningAnswers') || '{}')
                },
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
                }
            },
            savedAt: currentTime
        };

        // Get current history
        const history = JSON.parse(localStorage.getItem('testHistory') || '[]');
        
        // Add new entry at the beginning
        history.unshift(testEntry);
        
        // Keep only the last 3 entries
        if (history.length > this.maxHistoryEntries) {
            history.splice(this.maxHistoryEntries);
        }
        
        // Save back to localStorage
        localStorage.setItem('testHistory', JSON.stringify(history));
        
        return testEntry;
    }

    // Generate unique test ID
    generateTestId() {
        return `TEST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Get test history
    getTestHistory() {
        return JSON.parse(localStorage.getItem('testHistory') || '[]');
    }

    // Download current test as formatted text file
    downloadCurrentTestTxt() {
        const testEntry = this.getCurrentTestData();
        const formattedText = this.formatTestDataAsText(testEntry);
        this.downloadTextFile(formattedText, `IELTS_Test_${testEntry.studentInfo.id}_${this.getDateString()}.txt`);
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
        this.downloadTextFile(formattedText, `IELTS_Test_${testEntry.studentInfo.id}_${dateStr}.txt`);
    }

    // Get current test data
    getCurrentTestData() {
        const studentId = localStorage.getItem('studentId') || 'Unknown';
        const studentName = localStorage.getItem('studentName') || 'Unknown';
        const mockTest = localStorage.getItem('selectedMock') || '1';
        const testStartTime = localStorage.getItem('testStartTime');

        return {
            studentInfo: {
                id: studentId,
                name: studentName,
                mockTest: mockTest,
                testStartTime: testStartTime
            },
            modules: {
                listening: {
                    status: localStorage.getItem('listeningStatus'),
                    startTime: localStorage.getItem('listeningStartTime'),
                    answers: JSON.parse(localStorage.getItem('listeningAnswers') || '{}')
                },
                reading: {
                    status: localStorage.getItem('readingStatus'),
                    startTime: localStorage.getItem('readingStartTime'),
                    answers: JSON.parse(localStorage.getItem('readingAnswers') || '{}')
                },
                writing: {
                    status: localStorage.getItem('writingStatus'),
                    startTime: localStorage.getItem('writingStartTime'),
                    answers: JSON.parse(localStorage.getItem('writingAnswers') || '{}')
                }
            },
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
                if (module === 'writing') {
                    // Special formatting for writing tasks
                    if (key.startsWith('task_')) {
                        const taskNumber = key.split('_')[1];
                        result += `    Task ${taskNumber}:\n`;
                        result += `    ${value || 'No response'}\n`;
                        result += `    (Word count: ${this.countWords(value)})\n\n`;
                    }
                } else {
                    // Regular answer formatting for listening/reading
                    if (Array.isArray(value)) {
                        result += `    ${key}: ${value.join(', ')}\n`;
                    } else {
                        result += `    ${key}: ${value || 'No answer'}\n`;
                    }
                }
            });
            
            return result;
        };

        let text = `IELTS TEST RESULTS\n`;
        text += `${'='.repeat(50)}\n\n`;
        
        // Student Information
        text += `STUDENT INFORMATION:\n`;
        text += `-`.repeat(20) + `\n`;
        text += `Student ID: ${testData.studentInfo.id}\n`;
        text += `Full Name: ${testData.studentInfo.name}\n`;
        text += `Mock Test: MOCK ${testData.studentInfo.mockTest}\n`;
        text += `Test Start: ${formatDate(testData.studentInfo.testStartTime)}\n`;
        text += `Export Time: ${formatDate(testData.exportTime || testData.savedAt)}\n\n`;

        // Test Results by Module
        const modules = ['listening', 'reading', 'writing'];
        
        modules.forEach(module => {
            const moduleData = testData.modules[module];
            text += `${module.toUpperCase()} TEST:\n`;
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
        text += `Generated by IELTS Test System v2.0\n`;
        text += `Innovative Centre - IELTS Testing Platform\n`;
        text += `Report generated on: ${new Date().toLocaleString()}\n`;

        return text;
    }

    // Count words in text
    countWords(text) {
        if (!text || typeof text !== 'string') return 0;
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    // Download text file
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

    // Get formatted date string
    getDateString() {
        return new Date().toISOString().split('T')[0];
    }

    // Clear current test session data (but keep history)
    clearCurrentTestSession() {
        const keysToRemove = [
            'studentId', 'studentName', 'selectedMock', 'testStartTime',
            'listeningStatus', 'listeningStartTime', 'listeningEndTime', 'listeningAnswers',
            'readingStatus', 'readingStartTime', 'readingEndTime', 'readingAnswers',
            'writingStatus', 'writingStartTime', 'writingEndTime', 'writingAnswers',
            'distractionFreeMode'
        ];
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });
        
        // Keep testHistory intact
        console.log('Current test session cleared. Historical data preserved.');
    }

    // Clear all data including history (complete reset)
    clearAllData() {
        localStorage.clear();
        console.log('All data cleared including test history.');
    }

    // Get summary of available tests
    getTestSummary() {
        const history = this.getTestHistory();
        return history.map(entry => ({
            id: entry.id,
            studentName: entry.studentInfo.name,
            studentId: entry.studentInfo.id,
            mockTest: entry.studentInfo.mockTest,
            completionDate: new Date(entry.savedAt).toLocaleDateString(),
            completionTime: new Date(entry.savedAt).toLocaleTimeString(),
            modulesCompleted: Object.keys(entry.modules).filter(module => 
                entry.modules[module].status === 'completed'
            ).length
        }));
    }
}

// Create global instance
window.answerManager = new AnswerManager();
