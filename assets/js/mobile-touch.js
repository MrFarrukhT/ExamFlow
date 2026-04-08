// Mobile touch enhancements for IELTS test pages
// Extracted from core.js (ADR-031) — zero dependencies on core.js state

(function () {
    'use strict';

    function initializeMobileFeatures() {
        if (!('ontouchstart' in window)) return;

        // Touch feedback: scale on press for question nav buttons
        document.querySelectorAll('.subQuestion').forEach(btn => {
            btn.addEventListener('touchstart', function (e) {
                e.preventDefault();
                this.style.transform = 'scale(0.95)';
            }, { passive: false });
            btn.addEventListener('touchend', function (e) {
                e.preventDefault();
                this.style.transform = 'scale(1)';
            }, { passive: false });
        });

        // Touch feedback: part navigation
        document.querySelectorAll('.footer__questionNo___3WNct').forEach(btn => {
            btn.addEventListener('touchstart', function (e) {
                e.preventDefault();
                this.style.transform = 'scale(0.95)';
            }, { passive: false });
            btn.addEventListener('touchend', function (e) {
                e.preventDefault();
                this.style.transform = 'scale(1)';
            }, { passive: false });
        });

        // Touch feedback: radio button options (T/F, MCQ)
        document.querySelectorAll('.tf-option, .multi-choice-option').forEach(option => {
            option.addEventListener('touchstart', function (e) {
                e.preventDefault();
                this.style.transform = 'scale(0.98)';
            }, { passive: false });
            option.addEventListener('touchend', function (e) {
                e.preventDefault();
                this.style.transform = 'scale(1)';
                const radio = this.querySelector('input[type="radio"]');
                if (radio) {
                    radio.checked = true;
                    radio.dispatchEvent(new Event('change'));
                }
            }, { passive: false });
        });

        // Prevent iOS zoom on text input focus
        document.querySelectorAll('input[type="text"], select').forEach(input => {
            input.addEventListener('touchstart', function () {
                this.style.fontSize = '16px';
            });
        });

        // Touch feedback: drag items
        document.querySelectorAll('.drag-item').forEach(item => {
            item.addEventListener('touchstart', function (e) {
                e.preventDefault();
                this.style.transform = 'scale(1.1)';
                this.style.zIndex = '1000';
            }, { passive: false });
            item.addEventListener('touchend', function (e) {
                e.preventDefault();
                this.style.transform = 'scale(1)';
                this.style.zIndex = 'auto';
            }, { passive: false });
        });

        // Touch feedback: drop zones
        document.querySelectorAll('.drop-zone, .summary-drop-zone').forEach(zone => {
            zone.addEventListener('touchstart', function (e) {
                e.preventDefault();
                this.style.transform = 'scale(1.05)';
                this.style.borderColor = '#4a90e2';
            }, { passive: false });
            zone.addEventListener('touchend', function (e) {
                e.preventDefault();
                this.style.transform = 'scale(1)';
                this.style.borderColor = '#ccc';
            }, { passive: false });
        });

        // Touch feedback: navigation arrows
        document.querySelectorAll('.nav-arrow').forEach(arrow => {
            arrow.addEventListener('touchstart', function (e) {
                e.preventDefault();
                this.style.transform = 'scale(0.9)';
            }, { passive: false });
            arrow.addEventListener('touchend', function (e) {
                e.preventDefault();
                this.style.transform = 'scale(1)';
            }, { passive: false });
        });

        // Touch feedback: deliver/check button
        const deliverButton = document.getElementById('deliver-button');
        if (deliverButton) {
            deliverButton.addEventListener('touchstart', function (e) {
                e.preventDefault();
                this.style.transform = 'scale(0.95)';
            }, { passive: false });
            deliverButton.addEventListener('touchend', function (e) {
                e.preventDefault();
                this.style.transform = 'scale(1)';
            }, { passive: false });
        }

        // Mobile scroll improvements
        if (window.innerWidth <= 768) {
            document.documentElement.style.scrollBehavior = 'smooth';
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeMobileFeatures);
    } else {
        initializeMobileFeatures();
    }
})();
