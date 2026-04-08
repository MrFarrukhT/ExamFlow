// Modal/Popup Manager — extracted from universal-functions.js (ADR-014)
// Handles popup overlay creation, show/close, and toast notifications.

class ModalManager {
    constructor() {
        this.createPopupStructure();
    }

    createPopupStructure() {
        if (!document.getElementById('popup-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'popup-overlay';
            overlay.className = 'popup-overlay';
            overlay.innerHTML = `
                <div class="popup-content" id="popup-content">
                    <!-- Dynamic content will be inserted here -->
                </div>
            `;
            document.body.appendChild(overlay);
        }
    }

    showPopup(content, additionalClass = '') {
        const overlay = document.getElementById('popup-overlay');
        const popupContent = document.getElementById('popup-content');

        if (overlay && popupContent) {
            popupContent.innerHTML = content;
            popupContent.className = `popup-content ${additionalClass}`;
            overlay.classList.add('show');

            const closeButton = popupContent.querySelector('.popup-close');
            if (closeButton) {
                closeButton.focus();
            }
        }
    }

    closePopup() {
        const overlay = document.getElementById('popup-overlay');
        if (overlay) {
            overlay.classList.remove('show');
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background-color: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 3000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);

        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}
