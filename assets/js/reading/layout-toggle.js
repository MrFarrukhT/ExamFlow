/**
 * Reading Layout Toggle - Provides quick layout switching for reading tests
 * 
 * This script adds layout toggle functionality to the resizer element.
 * Click the resizer button to cycle through different layout modes:
 * 1. Split view (50/50)
 * 2. Reading-focused (70/30)
 * 3. Questions-focused (30/70)
 * 4. Full reading (passage only)
 * 5. Full questions (questions only)
 */

(function() {
    'use strict';
    
    class LayoutToggle {
        constructor() {
            this.currentMode = 0; // 0 = default 50/50
            this.modes = [
                { name: '50/50 Split', passage: 50, questions: 50 },
                { name: 'Reading Focus', passage: 70, questions: 30 },
                { name: 'Questions Focus', passage: 30, questions: 70 },
                { name: 'Full Reading', passage: 95, questions: 5 },
                { name: 'Full Questions', passage: 5, questions: 95 }
            ];
            
            this.passagePanel = null;
            this.questionsPanel = null;
            this.resizer = null;
            
            this.init();
        }
        
        init() {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setup());
            } else {
                this.setup();
            }
        }
        
        setup() {
            // Detect test type and get appropriate panels
            const testSkill = document.body.dataset.skill;
            
            if (testSkill === 'reading') {
                this.passagePanel = document.getElementById('passage-panel');
                this.questionsPanel = document.getElementById('questions-panel');
            } else if (testSkill === 'writing') {
                this.passagePanel = document.querySelector('.task-panel');
                this.questionsPanel = document.querySelector('.writing-panel');
            }
            
            this.resizer = document.getElementById('resizer');
            
            // Only initialize if we have all required elements
            if (!this.passagePanel || !this.questionsPanel || !this.resizer) {
                return;
            }
            
            // Use double-click to toggle layout (avoids conflict with drag)
            this.resizer.addEventListener('dblclick', (e) => {
                e.preventDefault();
                this.toggleLayout();
            });
        }
        
        toggleLayout() {
            // Cycle to next layout mode
            this.currentMode = (this.currentMode + 1) % this.modes.length;
            const mode = this.modes[this.currentMode];
            
            // Apply the layout
            this.applyLayout(mode.passage, mode.questions);
            
            // Show toast notification
            this.showToast(mode.name);
        }
        
        applyLayout(passagePercent, questionsPercent) {
            if (!this.passagePanel || !this.questionsPanel) return;
            
            // Apply with smooth transition
            this.passagePanel.style.transition = 'flex 0.3s ease';
            this.questionsPanel.style.transition = 'flex 0.3s ease';
            
            this.passagePanel.style.flex = `0 0 ${passagePercent}%`;
            this.questionsPanel.style.flex = `0 0 ${questionsPercent}%`;
            
            // Remove transition after animation completes
            setTimeout(() => {
                this.passagePanel.style.transition = '';
                this.questionsPanel.style.transition = '';
            }, 300);
        }
        
        showToast(message) {
            // Remove existing toast if any
            const existingToast = document.getElementById('layout-toggle-toast');
            if (existingToast) {
                existingToast.remove();
            }
            
            // Create toast element
            const toast = document.createElement('div');
            toast.id = 'layout-toggle-toast';
            toast.className = 'layout-toggle-toast';
            toast.textContent = message;
            
            // Add styles if not already present
            if (!document.getElementById('layout-toggle-styles')) {
                const style = document.createElement('style');
                style.id = 'layout-toggle-styles';
                style.textContent = `
                    .layout-toggle-toast {
                        position: fixed;
                        bottom: 100px;
                        left: 50%;
                        transform: translateX(-50%);
                        background: rgba(0, 0, 0, 0.8);
                        color: white;
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-size: 14px;
                        font-weight: 500;
                        z-index: 10000;
                        pointer-events: none;
                        animation: toast-fade-in-out 2s ease;
                    }
                    
                    @keyframes toast-fade-in-out {
                        0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
                        15% { opacity: 1; transform: translateX(-50%) translateY(0); }
                        85% { opacity: 1; transform: translateX(-50%) translateY(0); }
                        100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                    }
                    
                    body.dark-mode .layout-toggle-toast {
                        background: rgba(255, 255, 255, 0.9);
                        color: #000;
                    }
                `;
                document.head.appendChild(style);
            }
            
            // Add to document
            document.body.appendChild(toast);
            
            // Remove after animation
            setTimeout(() => {
                toast.remove();
            }, 2000);
        }
    }
    
    // Initialize layout toggle
    window.layoutToggle = new LayoutToggle();
    
})();

