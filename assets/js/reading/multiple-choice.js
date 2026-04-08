// Multiple Choice Questions Handler - Reading
class MultipleChoiceHandler {
    constructor() {
        this.questionType = 'multiple-choice';
        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        // Handle single-choice questions
        document.querySelectorAll('.multiple-choice-single input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.handleSingleChoice(e);
            });
        });

        // Handle multi-choice questions
        document.querySelectorAll('.multiple-choice-multi input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.handleMultiChoice(e);
            });
        });
    }

    handleSingleChoice(event) {
        const questionNumber = this.getQuestionNumber(event.target);
        const selectedValue = event.target.value;
        
        // Update visual feedback
        this.updateAnswerStatus(questionNumber, selectedValue);
        
        // Trigger global update
        if (typeof updateAllIndicators === 'function') {
            updateAllIndicators();
        }
    }

    handleMultiChoice(event) {
        const questionNumber = this.getQuestionNumber(event.target);
        const selectedValues = this.getSelectedValues(questionNumber);
        
        // Update visual feedback
        this.updateAnswerStatus(questionNumber, selectedValues);
        
        // Trigger global update
        if (typeof updateAllIndicators === 'function') {
            updateAllIndicators();
        }
    }

    getQuestionNumber(element) {
        const name = element.name;
        return name.replace('q', '');
    }

    getSelectedValues(questionNumber) {
        const checkboxes = document.querySelectorAll(`input[name="q${questionNumber}"]:checked`);
        return Array.from(checkboxes).map(cb => cb.value);
    }

    updateAnswerStatus(questionNumber, value) {
        // This can be extended for visual feedback
    }

    // Get answer for checking
    getAnswer(questionNumber) {
        const singleRadio = document.querySelector(`input[name="q${questionNumber}"][type="radio"]:checked`);
        if (singleRadio) {
            return singleRadio.value;
        }

        const multiCheckboxes = document.querySelectorAll(`input[name="q${questionNumber}"][type="checkbox"]:checked`);
        if (multiCheckboxes.length > 0) {
            return Array.from(multiCheckboxes).map(cb => cb.value);
        }

        return null;
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.querySelector('.multiple-choice-single, .multiple-choice-multi')) {
            window.multipleChoiceHandler = new MultipleChoiceHandler();
        }
    });
} else {
    if (document.querySelector('.multiple-choice-single, .multiple-choice-multi')) {
        window.multipleChoiceHandler = new MultipleChoiceHandler();
    }
}
