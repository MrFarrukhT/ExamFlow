// True/False/Not Given Questions Handler - Reading
class TrueFalseNotGivenHandler {
    constructor() {
        this.questionType = 'true-false-notgiven';
        this.init();
    }

    init() {
        this.bindEvents();
        console.log('✅ True/False/Not Given handler initialized');
    }

    bindEvents() {
        document.querySelectorAll('.tfng-question input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.handleAnswer(e);
            });
        });
    }

    handleAnswer(event) {
        const questionNumber = this.getQuestionNumber(event.target);
        const selectedValue = event.target.value;
        
        // Update visual styling based on selection
        this.updateVisualFeedback(event.target);
        
        // Update answer status
        this.updateAnswerStatus(questionNumber, selectedValue);
        
        // Trigger global update
        if (typeof updateAllIndicators === 'function') {
            updateAllIndicators();
        }
    }

    updateVisualFeedback(radioElement) {
        const questionContainer = radioElement.closest('.tfng-question');
        const allLabels = questionContainer.querySelectorAll('label');
        
        // Remove previous selections
        allLabels.forEach(label => {
            label.classList.remove('selected');
        });
        
        // Add selection to current
        const selectedLabel = radioElement.closest('label');
        selectedLabel.classList.add('selected');
    }

    getQuestionNumber(element) {
        const name = element.name;
        return name.replace('q', '');
    }

    updateAnswerStatus(questionNumber, value) {
        console.log(`TFNG Question ${questionNumber} answered:`, value);
    }

    // Get answer for checking
    getAnswer(questionNumber) {
        const selectedRadio = document.querySelector(`input[name="q${questionNumber}"]:checked`);
        return selectedRadio ? selectedRadio.value : null;
    }

    // Validate answer format
    isValidAnswer(answer) {
        const validAnswers = ['TRUE', 'FALSE', 'NOT GIVEN'];
        return validAnswers.includes(answer?.toUpperCase());
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.querySelector('.tfng-question')) {
            window.trueFalseNotGivenHandler = new TrueFalseNotGivenHandler();
        }
    });
} else {
    if (document.querySelector('.tfng-question')) {
        window.trueFalseNotGivenHandler = new TrueFalseNotGivenHandler();
    }
}
