// Sentence Completion Handler - Reading
class SentenceCompletionHandler {
    constructor() {
        this.questionType = 'sentence-completion';
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupWordLimits();
        console.log('✅ Sentence Completion handler initialized');
    }

    bindEvents() {
        document.querySelectorAll('.sentence-completion input[type="text"]').forEach(input => {
            input.addEventListener('input', (e) => {
                this.handleInput(e);
            });

            input.addEventListener('blur', (e) => {
                this.validateInput(e);
            });

            // Auto-resize input based on content
            input.addEventListener('input', (e) => {
                this.autoResize(e.target);
            });
        });
    }

    setupWordLimits() {
        document.querySelectorAll('.sentence-completion').forEach(question => {
            const wordLimit = question.dataset.wordLimit || '1';
            const inputs = question.querySelectorAll('input[type="text"]');
            
            inputs.forEach(input => {
                input.setAttribute('data-word-limit', wordLimit);
                input.setAttribute('placeholder', `${wordLimit} word${wordLimit > 1 ? 's' : ''} max`);
            });
        });
    }

    handleInput(event) {
        const input = event.target;
        const questionNumber = this.getQuestionNumber(input);
        
        // Check word limit
        this.checkWordLimit(input);
        
        // Update answer status
        this.updateAnswerStatus(questionNumber, input.value.trim());
        
        // Trigger global update
        if (typeof updateAllIndicators === 'function') {
            updateAllIndicators();
        }
    }

    checkWordLimit(input) {
        const wordLimit = parseInt(input.getAttribute('data-word-limit')) || 1;
        const words = input.value.trim().split(/\s+/).filter(word => word.length > 0);
        
        if (words.length > wordLimit) {
            input.classList.add('over-limit');
            this.showWordLimitWarning(input, wordLimit);
        } else {
            input.classList.remove('over-limit');
            this.hideWordLimitWarning(input);
        }
    }

    showWordLimitWarning(input, limit) {
        let warning = input.nextElementSibling;
        if (!warning || !warning.classList.contains('word-limit-warning')) {
            warning = document.createElement('span');
            warning.className = 'word-limit-warning';
            warning.style.color = '#dc3545';
            warning.style.fontSize = '0.8em';
            input.parentNode.insertBefore(warning, input.nextSibling);
        }
        warning.textContent = `Max ${limit} word${limit > 1 ? 's' : ''}`;
    }

    hideWordLimitWarning(input) {
        const warning = input.nextElementSibling;
        if (warning && warning.classList.contains('word-limit-warning')) {
            warning.remove();
        }
    }

    validateInput(event) {
        const input = event.target;
        const value = input.value.trim();
        
        // Basic validation - can be extended
        if (value) {
            input.classList.add('answered');
        } else {
            input.classList.remove('answered');
        }
    }

    autoResize(input) {
        const minWidth = 100;
        const maxWidth = 200;
        const testSpan = document.createElement('span');
        
        testSpan.style.visibility = 'hidden';
        testSpan.style.position = 'absolute';
        testSpan.style.fontSize = window.getComputedStyle(input).fontSize;
        testSpan.style.fontFamily = window.getComputedStyle(input).fontFamily;
        testSpan.textContent = input.value || input.placeholder;
        
        document.body.appendChild(testSpan);
        const width = Math.min(Math.max(testSpan.offsetWidth + 20, minWidth), maxWidth);
        document.body.removeChild(testSpan);
        
        input.style.width = width + 'px';
    }

    getQuestionNumber(element) {
        const id = element.id;
        return id.replace('q', '');
    }

    updateAnswerStatus(questionNumber, value) {
        console.log(`Sentence Completion Question ${questionNumber} answered:`, value);
    }

    // Get answer for checking
    getAnswer(questionNumber) {
        const input = document.getElementById(`q${questionNumber}`);
        return input ? input.value.trim() : null;
    }

    // Validate word count
    isWithinWordLimit(questionNumber) {
        const input = document.getElementById(`q${questionNumber}`);
        if (!input) return false;
        
        const wordLimit = parseInt(input.getAttribute('data-word-limit')) || 1;
        const words = input.value.trim().split(/\s+/).filter(word => word.length > 0);
        
        return words.length <= wordLimit;
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.querySelector('.sentence-completion')) {
            window.sentenceCompletionHandler = new SentenceCompletionHandler();
        }
    });
} else {
    if (document.querySelector('.sentence-completion')) {
        window.sentenceCompletionHandler = new SentenceCompletionHandler();
    }
}
