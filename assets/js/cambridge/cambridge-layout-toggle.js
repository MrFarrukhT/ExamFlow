/**
 * Cambridge Layout Toggle - Provides quick layout switching for Cambridge reading tests
 * 
 * This script adds layout toggle functionality that works with Cambridge's HTML structure.
 * It creates a toggle button in the header that cycles through different layout modes.
 */

(function() {
    'use strict';
    
    class CambridgeLayoutToggle {
        constructor() {
            this.currentMode = 0; // 0 = default side-by-side
            this.modes = [
                { name: 'Side by Side', mode: 'side-by-side' },
                { name: 'Reading Focus', mode: 'reading-focus' },
                { name: 'Questions Focus', mode: 'questions-focus' },
                { name: 'Full Reading', mode: 'full-reading' },
                { name: 'Full Questions', mode: 'full-questions' }
            ];
            
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
            // Check if this is Part 1 - if so, disable layout toggle
            const isPart1 = this.detectPart1();
            if (isPart1) {
                console.log('📐 Cambridge Layout Toggle: Disabled for Part 1');
                return;
            }
            
            // Check if this page has reading passages with questions (split view layout)
            // Two types of layouts:
            // 1. Part 1/2: .container.partWidth (image/text) + .interaction-container (questions) - PART 1 EXCLUDED
            // 2. Part 3+: .StimulusDisplay (reading passage) + resizable divider + questions
            
            const hasPartWidthLayout = document.querySelector('.container.partWidth');
            const hasStimulusLayout = document.querySelector('.StimulusDisplay__stimulusContent___2KVn5, .StimulusDisplay__sectionStimulus___dxXPc');
            const hasResizableDivider = document.querySelector('.DisplayTypeContainer__divider___yWedB');
            const hasQuestions = document.querySelector('.choiceInteraction__choiceInteraction___3W0MH, .textEntryInteraction__textEntryInteraction___FTYMz');
            
            // Determine layout type
            if (hasPartWidthLayout && hasQuestions) {
                this.layoutType = 'part-width';
                console.log('📐 Detected Part 2 style layout (side-by-side)');
            } else if (hasStimulusLayout && hasResizableDivider && hasQuestions) {
                this.layoutType = 'stimulus';
                console.log('📐 Detected Part 3+ style layout (resizable split-view)');
            } else {
                console.log('📐 Cambridge Layout Toggle: Not applicable for this page');
                return;
            }
            
            // Add toggle button to header
            this.createToggleButton();
            
            // Add CSS for layout modes
            this.addLayoutStyles();
            
            console.log('✅ Cambridge Layout Toggle initialized');
        }
        
        detectPart1() {
            // Multiple ways to detect Part 1:
            // 1. Check URL/filename (most reliable)
            const pathname = window.location.pathname;
            if (pathname.includes('Part 1.html') || pathname.includes('Part%201.html')) {
                return true;
            }
            
            // 2. Check for Part 1 specific question numbers (Questions 1-6 exactly)
            const questionHeadline = document.querySelector('.scorableItemHeadline');
            if (questionHeadline) {
                const text = questionHeadline.textContent.trim();
                // Match "Questions 1-6" or "Questions 1–6" (different dash types)
                if (text.match(/Questions\s+1[\s\-–—]+6/i)) {
                    return true;
                }
            }
            
            // 3. Check if first scorable item is exactly question 1 (not 11, 14, etc.)
            const firstScorableItem = document.querySelector('[id*="scorableItem"]');
            if (firstScorableItem) {
                const itemText = firstScorableItem.textContent.trim();
                // Must be exactly "1", not "14", "11", etc.
                if (itemText === '1') {
                    // Also verify it has the Part 1 style short image layout
                    const hasShortImageLayout = document.querySelector('.container.percentwidth-30');
                    if (hasShortImageLayout) {
                        return true;
                    }
                }
            }
            
            return false;
        }
        
        createToggleButton() {
            const header = document.getElementById('headerTopBar');
            if (!header) return;
            
            const buttonContainer = header.querySelector('.header__connectionAndButtonContainer___1t_Gd');
            if (!buttonContainer) return;
            
            // Create toggle button
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'header__optionsButton___1BF6Z';
            toggleBtn.id = 'layoutToggleButton';
            toggleBtn.setAttribute('aria-label', 'Toggle layout');
            toggleBtn.innerHTML = `
                <span class="header__icon___1ECrT">
                    <span class="sr-only">Toggle layout</span>
                    <i class="fa fa-columns fa-3" aria-hidden="true"></i>
                </span>
            `;
            
            // Add click handler
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleLayout();
            });
            
            // Insert before the messages button
            const messagesBtn = document.getElementById('messagesMenuButton');
            if (messagesBtn) {
                buttonContainer.insertBefore(toggleBtn, messagesBtn);
            } else {
                buttonContainer.appendChild(toggleBtn);
            }
        }
        
        toggleLayout() {
            // Cycle to next layout mode
            this.currentMode = (this.currentMode + 1) % this.modes.length;
            const mode = this.modes[this.currentMode];
            
            // Remove all layout classes
            document.body.classList.remove('layout-side-by-side', 'layout-reading-focus', 'layout-questions-focus', 'layout-full-reading', 'layout-full-questions');
            
            // Add current layout class
            document.body.classList.add(`layout-${mode.mode}`);
            
            // Show toast notification
            this.showToast(mode.name);
            
            // Update button icon
            this.updateButtonIcon(mode.mode);
            
            console.log(`📐 Cambridge Layout: ${mode.name}`);
        }
        
        updateButtonIcon(mode) {
            const button = document.getElementById('layoutToggleButton');
            if (!button) return;
            
            const icon = button.querySelector('.fa');
            if (!icon) return;
            
            // Update icon based on mode
            icon.className = 'fa fa-3';
            switch (mode) {
                case 'side-by-side':
                    icon.classList.add('fa-columns');
                    break;
                case 'reading-focus':
                    icon.classList.add('fa-align-left');
                    break;
                case 'questions-focus':
                    icon.classList.add('fa-align-right');
                    break;
                case 'full-reading':
                    icon.classList.add('fa-file-text-o');
                    break;
                case 'full-questions':
                    icon.classList.add('fa-list-ul');
                    break;
            }
        }
        
        addLayoutStyles() {
            if (document.getElementById('cambridge-layout-toggle-styles')) return;
            
            const style = document.createElement('style');
            style.id = 'cambridge-layout-toggle-styles';
            style.textContent = `
                /* =============================================== */
                /* PART 1/2 STYLE: Side-by-side with partWidth */
                /* =============================================== */
                
                /* Reading Focus - 70/30 */
                body.layout-reading-focus .container.generic {
                    display: flex;
                    flex-wrap: nowrap;
                }
                body.layout-reading-focus .container.partWidth {
                    flex: 0 0 70% !important;
                    max-width: 70% !important;
                    width: 70% !important;
                }
                body.layout-reading-focus .interaction-container {
                    flex: 0 0 30% !important;
                    max-width: 30% !important;
                }
                
                /* Questions Focus - 30/70 */
                body.layout-questions-focus .container.generic {
                    display: flex;
                    flex-wrap: nowrap;
                }
                body.layout-questions-focus .container.partWidth {
                    flex: 0 0 30% !important;
                    max-width: 30% !important;
                    width: 30% !important;
                }
                body.layout-questions-focus .interaction-container {
                    flex: 0 0 70% !important;
                    max-width: 70% !important;
                }
                
                /* Full Reading - Hide questions */
                body.layout-full-reading .interaction-container {
                    display: none !important;
                }
                body.layout-full-reading .container.partWidth {
                    flex: 1 !important;
                    max-width: 100% !important;
                    width: 100% !important;
                }
                
                /* Full Questions - Hide reading */
                body.layout-full-questions .container.partWidth {
                    display: none !important;
                }
                body.layout-full-questions .interaction-container {
                    flex: 1 !important;
                    max-width: 100% !important;
                }
                
                /* =============================================== */
                /* PART 3+ STYLE: Resizable split-view with StimulusDisplay */
                /* =============================================== */
                
                /* Reading Focus - 70/30 */
                body.layout-reading-focus .StimulusDisplay__sectionStimulusWrapper___6IhoB {
                    width: 70% !important;
                }
                body.layout-reading-focus .DisplayTypeContainer__sectionContent___2HSJ0 {
                    flex: 1 !important;
                }
                
                /* Questions Focus - 30/70 */
                body.layout-questions-focus .StimulusDisplay__sectionStimulusWrapper___6IhoB {
                    width: 30% !important;
                }
                body.layout-questions-focus .DisplayTypeContainer__sectionContent___2HSJ0 {
                    flex: 1 !important;
                }
                
                /* Full Reading - Hide questions */
                body.layout-full-reading .DisplayTypeContainer__sectionContent___2HSJ0 {
                    display: none !important;
                }
                body.layout-full-reading .DisplayTypeContainer__divider___yWedB {
                    display: none !important;
                }
                body.layout-full-reading .StimulusDisplay__sectionStimulusWrapper___6IhoB {
                    width: 100% !important;
                }
                
                /* Full Questions - Hide reading */
                body.layout-full-questions .StimulusDisplay__sectionStimulusWrapper___6IhoB {
                    display: none !important;
                }
                body.layout-full-questions .DisplayTypeContainer__divider___yWedB {
                    display: none !important;
                }
                body.layout-full-questions .DisplayTypeContainer__sectionContent___2HSJ0 {
                    width: 100% !important;
                    max-width: 100% !important;
                }
                
                /* Smooth transitions for all elements */
                .container.generic,
                .container.partWidth,
                .interaction-container,
                .StimulusDisplay__sectionStimulusWrapper___6IhoB,
                .DisplayTypeContainer__sectionContent___2HSJ0,
                .DisplayTypeContainer__divider___yWedB {
                    transition: flex 0.3s ease, max-width 0.3s ease, width 0.3s ease, opacity 0.2s ease !important;
                }
            `;
            document.head.appendChild(style);
        }
        
        showToast(message) {
            // Remove existing toast if any
            const existingToast = document.getElementById('cambridge-layout-toast');
            if (existingToast) {
                existingToast.remove();
            }
            
            // Create toast element
            const toast = document.createElement('div');
            toast.id = 'cambridge-layout-toast';
            toast.className = 'cambridge-layout-toast';
            toast.textContent = message;
            
            // Add styles if not already present
            if (!document.getElementById('cambridge-layout-toast-styles')) {
                const style = document.createElement('style');
                style.id = 'cambridge-layout-toast-styles';
                style.textContent = `
                    .cambridge-layout-toast {
                        position: fixed;
                        bottom: 80px;
                        left: 50%;
                        transform: translateX(-50%);
                        background: rgba(0, 0, 0, 0.85);
                        color: white;
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-size: 14px;
                        font-weight: 500;
                        z-index: 10000;
                        pointer-events: none;
                        animation: cambridge-toast-fade 2s ease;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                    }
                    
                    @keyframes cambridge-toast-fade {
                        0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
                        15% { opacity: 1; transform: translateX(-50%) translateY(0); }
                        85% { opacity: 1; transform: translateX(-50%) translateY(0); }
                        100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                    }
                    
                    body.dark-mode .cambridge-layout-toast {
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
    
    // Initialize Cambridge layout toggle
    window.cambridgeLayoutToggle = new CambridgeLayoutToggle();
    
})();

