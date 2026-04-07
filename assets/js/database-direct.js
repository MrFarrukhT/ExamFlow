// Database connector for saving test submissions
// Routes through the local API server - no direct database access from browser

class DatabaseConnector {
    constructor() {
        this.isAvailable = false;
        this.checkAvailability();
    }

    async checkAvailability() {
        if (typeof fetch !== 'undefined') {
            this.isAvailable = true;
        }
    }

    async saveTestSubmission(testData) {
        if (!this.isAvailable) {
            return { success: false, message: 'Database connector not available' };
        }

        try {
            const response = await this.tryLocalAPI(testData);
            if (response.success) {
                return response;
            }

            return this.saveToEnhancedLocalStorage(testData);
        } catch (error) {
            console.error('Database save failed:', error);
            return {
                success: false,
                message: 'Database connection failed: ' + error.message
            };
        }
    }

    async tryLocalAPI(testData) {
        try {
            const response = await fetch('/submissions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(testData)
            });

            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            // Local API not available, will fall back to localStorage
        }

        return { success: false };
    }

    async saveToEnhancedLocalStorage(testData) {
        try {
            const existingData = localStorage.getItem('test_submissions_database') || '[]';
            const submissions = JSON.parse(existingData);

            const newSubmission = {
                id: Date.now(),
                ...testData,
                saved_locally: true,
                created_at: new Date().toISOString()
            };

            submissions.push(newSubmission);
            localStorage.setItem('test_submissions_database', JSON.stringify(submissions));

            return {
                success: true,
                message: 'Saved to local database storage',
                id: newSubmission.id
            };
        } catch (error) {
            console.error('Enhanced local storage failed:', error);
            return { success: false, message: 'All storage methods failed' };
        }
    }

    async getSubmissions() {
        try {
            const data = localStorage.getItem('test_submissions_database');
            if (data) {
                return JSON.parse(data);
            }
            return [];
        } catch (error) {
            console.error('Failed to retrieve submissions:', error);
            return [];
        }
    }
}

window.databaseConnector = new DatabaseConnector();
