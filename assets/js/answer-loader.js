// Dynamic Answer and Module Loader
class AnswerLoader {
    constructor() {
        this.loadedModules = new Set();
        this.correctAnswers = {};
        this.init();
    }

    init() {
        this.detectQuestionTypes();
        this.loadAnswers();
        console.log('✅ Answer Loader initialized');
    }

    // Detect what question types are present on the page
    detectQuestionTypes() {
        const questionTypes = [];

        // Reading question types
        if (document.querySelector('.multiple-choice-single, .multiple-choice-multi')) {
            questionTypes.push({ skill: 'reading', type: 'multiple-choice' });
        }
        if (document.querySelector('.tfng-question')) {
            questionTypes.push({ skill: 'reading', type: 'true-false-notgiven' });
        }
        if (document.querySelector('.ynng-question')) {
            questionTypes.push({ skill: 'reading', type: 'yes-no-notgiven' });
        }
        if (document.querySelector('.sentence-completion')) {
            questionTypes.push({ skill: 'reading', type: 'sentence-completion' });
        }
        if (document.querySelector('.matching-question')) {
            questionTypes.push({ skill: 'reading', type: 'matching-info' });
        }

        // Future: Listening question types detection
        // if (document.querySelector('.listening-multiple-choice')) {
        //     questionTypes.push({ skill: 'listening', type: 'multiple-choice' });
        // }

        this.loadQuestionModules(questionTypes);
        return questionTypes;
    }

    // Load CSS and JS modules for detected question types
    async loadQuestionModules(questionTypes) {
        for (const questionType of questionTypes) {
            await this.loadModule(questionType);
        }
    }

    async loadModule(questionType) {
        const moduleKey = `${questionType.skill}-${questionType.type}`;
        
        if (this.loadedModules.has(moduleKey)) {
            return; // Already loaded
        }

        try {
            // Load CSS
            await this.loadCSS(`../../assets/css/${questionType.skill}/${questionType.type}.css`);
            
            // Load JS
            await this.loadJS(`../../assets/js/${questionType.skill}/${questionType.type}.js`);
            
            this.loadedModules.add(moduleKey);
            console.log(`✅ Loaded module: ${moduleKey}`);
            
        } catch (error) {
            console.warn(`⚠️ Failed to load module: ${moduleKey}`, error);
        }
    }

    loadCSS(href) {
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = resolve;
            link.onerror = reject;
            document.head.appendChild(link);
        });
    }

    loadJS(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Load answers for current test
    async loadAnswers() {
        const testInfo = this.getTestInfo();
        const answersPath = `./answers/${testInfo.skill}-answers.js`;
        
        try {
            await this.loadJS(answersPath);
            
            if (window.testAnswers) {
                this.correctAnswers = window.testAnswers;
                window.correctAnswers = this.correctAnswers; // Make globally available
                console.log(`✅ Loaded answers for MOCK ${testInfo.mock} - ${testInfo.skill.toUpperCase()}`);
                delete window.testAnswers; // Clean up
            }
            
        } catch (error) {
            console.error(`❌ Failed to load answers: ${answersPath}`, error);
        }
    }

    getTestInfo() {
        const mockNumber = document.body.getAttribute('data-mock') || '1';
        const skill = document.body.getAttribute('data-skill') || 'reading';
        
        return { mock: mockNumber, skill: skill };
    }

    // Get correct answer for a question
    getCorrectAnswer(questionNumber) {
        return this.correctAnswers[questionNumber.toString()];
    }

    // Check if all required modules are loaded
    isReady() {
        return this.correctAnswers && Object.keys(this.correctAnswers).length > 0;
    }
}

// Initialize Answer Loader
window.answerLoader = new AnswerLoader();
