/**
 * Cambridge Bridge - Adapter for IELTS Universal Functions
 * 
 * This script adapts Cambridge's HTML structure to work with IELTS universal functions.
 * It maps Cambridge-specific elements to IELTS expectations and handles multi-page state.
 * 
 * Usage: Include this script AFTER universal-functions.js and BEFORE cambridge-specific scripts
 */

class CambridgeBridge {
    constructor() {
        this.initialized = false;
        this.currentPart = this.detectCurrentPart();
        this.highlightedRanges = [];
        this.notes = {};
        
        console.log('🌉 Cambridge Bridge initializing...');
        this.init();
    }

    init() {
        if (this.initialized) return;
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        console.log('🔧 Cambridge Bridge setting up adapters...');
        
        // 1. Map Cambridge header elements to IELTS structure
        this.setupHeaderAdapters();
        
        // 2. Create popup overlay if missing
        this.ensurePopupStructure();
        
        // 3. Setup context menu for highlighting
        this.setupContextMenuAdapter();
        
        // 4. Setup answer tracking across parts
        this.setupAnswerTracking();
        
        // 5. Load saved highlights and notes
        this.loadHighlightsAndNotes();
        
        // 6. Setup cross-page state management
        this.setupCrossPageState();
        
        // 7. Wire up Cambridge-specific events
        this.wireUpCambridgeEvents();
        
        this.initialized = true;
        console.log('✅ Cambridge Bridge ready!');
    }

    // ==================== HEADER ADAPTERS ====================
    
    setupHeaderAdapters() {
        console.log('🔗 Mapping Cambridge header to IELTS structure...');
        
        // Cambridge uses different IDs for header buttons
        const messagesBtn = document.getElementById('messagesMenuButton');
        const optionsBtn = document.getElementById('optionsMenuButton');
        const notesBtn = document.getElementById('toggleSidebarButton');
        
        // Create wrapper functions that work with IELTS universal functions
        if (messagesBtn && window.ieltsUniversal) {
            messagesBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                window.ieltsUniversal.showNotifications();
            });
            console.log('✓ Messages button mapped');
        }
        
        if (optionsBtn && window.ieltsUniversal) {
            optionsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                window.ieltsUniversal.showOptionsMenu();
            });
            console.log('✓ Options button mapped');
        }
        
        if (notesBtn) {
            notesBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleNotesSidebar();
            });
            console.log('✓ Notes button mapped');
        }

        // Update WiFi status indicator for Cambridge structure
        this.updateWiFiIndicator();
    }

    updateWiFiIndicator() {
        const wifiIcon = document.querySelector('.header__connectionStatusContainer___3YItW .fa-wifi');
        if (wifiIcon) {
            wifiIcon.classList.add('connected');
            wifiIcon.style.color = '#28a745';
        }
    }

    toggleNotesSidebar() {
        // TODO: Implement notes sidebar for Cambridge
        if (window.ieltsUniversal) {
            window.ieltsUniversal.showToast('Notes feature coming soon!', 'info');
        }
    }

    // ==================== POPUP STRUCTURE ====================
    
    ensurePopupStructure() {
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
            console.log('✓ Popup overlay created');
        }
    }

    // ==================== CONTEXT MENU & HIGHLIGHTING ====================
    
    setupContextMenuAdapter() {
        console.log('🎨 Setting up context menu for Cambridge...');
        
        // Ensure context menu exists
        if (!document.getElementById('contextMenu')) {
            this.createContextMenu();
        }
        
        // Setup context menu for Cambridge's text structure
        const textContainers = document.querySelectorAll(
            '.container.generic, ' +
            '.QuestionDisplay__questionBody___ZOMJ7, ' +
            '.QTIAssessmentItem__QTIAssessmentItem___cfGlV, ' +
            '.choiceInteraction__choiceInteraction___3W0MH'
        );
        
        textContainers.forEach(container => {
            // Right-click context menu
            container.addEventListener('contextmenu', (e) => {
                const selection = window.getSelection();
                if (selection.toString().trim().length > 0) {
                    e.preventDefault();
                    this.showContextMenu(e.clientX, e.clientY);
                }
            });
            
            // Also allow selection and highlighting
            container.style.userSelect = 'text';
            container.style.webkitUserSelect = 'text';
        });
        
        // Hide context menu when clicking elsewhere
        document.addEventListener('click', () => this.hideContextMenu());
        
        console.log('✓ Context menu adapter ready');
    }

    createContextMenu() {
        const menu = document.createElement('div');
        menu.id = 'contextMenu';
        menu.className = 'context-menu';
        menu.style.display = 'none';
        menu.innerHTML = `
            <div class="context-menu-item" onclick="cambridgeBridge.highlightSelection()">
                Highlight
            </div>
            <div class="context-menu-item" onclick="cambridgeBridge.addNoteToSelection()">
                Add Note
            </div>
            <div class="context-menu-item" onclick="cambridgeBridge.clearHighlightAtCursor()">
                Clear Highlight
            </div>
            <div class="context-menu-item" onclick="cambridgeBridge.clearAllHighlights()">
                Clear All
            </div>
        `;
        document.body.appendChild(menu);
        
        // Add CSS for context menu if not exists
        if (!document.getElementById('context-menu-styles')) {
            const style = document.createElement('style');
            style.id = 'context-menu-styles';
            style.textContent = `
                .context-menu {
                    position: fixed;
                    background: white;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                    z-index: 10000;
                    min-width: 150px;
                }
                .context-menu-item {
                    padding: 10px 15px;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .context-menu-item:hover {
                    background: #f0f0f0;
                }
                .highlight {
                    background-color: yellow;
                    cursor: pointer;
                }
                .highlight-with-note {
                    background-color: #ffeb3b;
                    border-bottom: 2px dotted #ff9800;
                }
            `;
            document.head.appendChild(style);
        }
    }

    showContextMenu(x, y) {
        const menu = document.getElementById('contextMenu');
        if (menu) {
            menu.style.display = 'block';
            menu.style.left = x + 'px';
            menu.style.top = y + 'px';
        }
    }

    hideContextMenu() {
        const menu = document.getElementById('contextMenu');
        if (menu) {
            menu.style.display = 'none';
        }
    }

    highlightSelection() {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;
        
        const range = selection.getRangeAt(0);
        const span = document.createElement('span');
        span.className = 'highlight';
        span.setAttribute('data-highlight-id', Date.now());
        
        try {
            range.surroundContents(span);
            this.highlightedRanges.push({
                id: span.getAttribute('data-highlight-id'),
                text: span.textContent,
                part: this.currentPart
            });
            this.saveHighlightsToStorage();
            
            if (window.ieltsUniversal) {
                window.ieltsUniversal.showToast('Text highlighted', 'success');
            }
        } catch (e) {
            console.warn('Could not highlight selection:', e);
            if (window.ieltsUniversal) {
                window.ieltsUniversal.showToast('Could not highlight complex selection', 'error');
            }
        }
        
        selection.removeAllRanges();
        this.hideContextMenu();
    }

    addNoteToSelection() {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;
        
        const text = selection.toString().trim();
        const note = prompt('Enter your note:');
        
        if (note) {
            const range = selection.getRangeAt(0);
            const span = document.createElement('span');
            span.className = 'highlight highlight-with-note';
            const noteId = Date.now();
            span.setAttribute('data-highlight-id', noteId);
            span.title = note;
            
            try {
                range.surroundContents(span);
                
                this.highlightedRanges.push({
                    id: noteId,
                    text: text,
                    note: note,
                    part: this.currentPart
                });
                
                this.notes[noteId] = note;
                this.saveHighlightsToStorage();
                
                if (window.ieltsUniversal) {
                    window.ieltsUniversal.showToast('Note added', 'success');
                }
            } catch (e) {
                console.warn('Could not add note:', e);
            }
        }
        
        selection.removeAllRanges();
        this.hideContextMenu();
    }

    clearHighlightAtCursor() {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;
        
        const range = selection.getRangeAt(0);
        let element = range.startContainer.parentElement;
        
        while (element && !element.classList.contains('highlight')) {
            element = element.parentElement;
        }
        
        if (element && element.classList.contains('highlight')) {
            const id = element.getAttribute('data-highlight-id');
            const text = element.textContent;
            element.replaceWith(text);
            
            this.highlightedRanges = this.highlightedRanges.filter(h => h.id !== id);
            delete this.notes[id];
            this.saveHighlightsToStorage();
            
            if (window.ieltsUniversal) {
                window.ieltsUniversal.showToast('Highlight removed', 'success');
            }
        }
        
        this.hideContextMenu();
    }

    clearAllHighlights() {
        if (!confirm('Clear all highlights and notes?')) return;
        
        document.querySelectorAll('.highlight').forEach(span => {
            const text = span.textContent;
            span.replaceWith(text);
        });
        
        this.highlightedRanges = [];
        this.notes = {};
        this.saveHighlightsToStorage();
        
        if (window.ieltsUniversal) {
            window.ieltsUniversal.showToast('All highlights cleared', 'success');
        }
        
        this.hideContextMenu();
    }

    saveHighlightsToStorage() {
        const testKey = this.getTestKey();
        localStorage.setItem(`${testKey}_highlights`, JSON.stringify(this.highlightedRanges));
        localStorage.setItem(`${testKey}_notes`, JSON.stringify(this.notes));
    }

    loadHighlightsAndNotes() {
        const testKey = this.getTestKey();
        const savedHighlights = localStorage.getItem(`${testKey}_highlights`);
        const savedNotes = localStorage.getItem(`${testKey}_notes`);
        
        if (savedHighlights) {
            try {
                this.highlightedRanges = JSON.parse(savedHighlights);
                console.log(`Loaded ${this.highlightedRanges.length} highlights`);
            } catch (e) {
                console.warn('Error loading highlights:', e);
            }
        }
        
        if (savedNotes) {
            try {
                this.notes = JSON.parse(savedNotes);
                console.log(`Loaded ${Object.keys(this.notes).length} notes`);
            } catch (e) {
                console.warn('Error loading notes:', e);
            }
        }
    }

    // ==================== ANSWER TRACKING ====================
    
    setupAnswerTracking() {
        console.log('📝 Setting up answer tracking for Cambridge...');
        
        // Track all input changes
        document.addEventListener('change', (e) => {
            if (e.target.matches('input, select, textarea')) {
                this.saveAnswersForCurrentPart();
            }
        });
        
        // Auto-save periodically
        setInterval(() => this.saveAnswersForCurrentPart(), 10000);
        
        // Load answers for current part
        this.loadAnswersForCurrentPart();
        
        console.log('✓ Answer tracking ready');
    }

    saveAnswersForCurrentPart() {
        const answers = {};
        
        // Collect all answers from current page
        document.querySelectorAll('input[type="radio"]:checked').forEach(input => {
            answers[input.name] = input.value;
        });
        
        document.querySelectorAll('input[type="text"], textarea').forEach(input => {
            if (input.value.trim()) {
                answers[input.id || input.name] = input.value.trim();
            }
        });
        
        document.querySelectorAll('select').forEach(select => {
            if (select.value) {
                answers[select.id || select.name] = select.value;
            }
        });
        
        // Save to unified Cambridge answer storage
        const testKey = this.getTestKey();
        const allAnswers = this.loadAllAnswers();
        allAnswers[`part${this.currentPart}`] = answers;
        
        localStorage.setItem(`${testKey}_answers`, JSON.stringify(allAnswers));
        
        // Also update answer indicators in footer
        this.updateAnswerIndicators();
    }

    loadAnswersForCurrentPart() {
        const testKey = this.getTestKey();
        const allAnswers = this.loadAllAnswers();
        const partAnswers = allAnswers[`part${this.currentPart}`] || {};
        
        // Restore answers
        Object.entries(partAnswers).forEach(([key, value]) => {
            // Try radio buttons
            const radio = document.querySelector(`input[name="${key}"][value="${value}"]`);
            if (radio) {
                radio.checked = true;
                return;
            }
            
            // Try other inputs
            const input = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
            if (input) {
                input.value = value;
            }
        });
        
        this.updateAnswerIndicators();
    }

    loadAllAnswers() {
        const testKey = this.getTestKey();
        const saved = localStorage.getItem(`${testKey}_answers`);
        return saved ? JSON.parse(saved) : {};
    }

    updateAnswerIndicators() {
        // Count answered questions in current part
        const allAnswers = this.loadAllAnswers();
        
        // Update each part's indicator
        for (let i = 1; i <= 7; i++) {
            const partAnswers = allAnswers[`part${i}`] || {};
            const answerCount = Object.keys(partAnswers).length;
            
            const partButton = document.querySelector(`[data-sectionid] .sectionNr:contains("${i}")`);
            if (partButton) {
                const attemptedSpan = partButton.parentElement.querySelector('.attemptedCount');
                if (attemptedSpan && answerCount > 0) {
                    attemptedSpan.style.color = '#28a745';
                    attemptedSpan.style.fontWeight = 'bold';
                }
            }
        }
    }

    // ==================== CROSS-PAGE STATE ====================
    
    setupCrossPageState() {
        console.log('🔄 Setting up cross-page state management...');
        
        // Save current scroll position
        window.addEventListener('beforeunload', () => {
            this.saveAnswersForCurrentPart();
            const scrollPos = window.scrollY;
            sessionStorage.setItem(`cambridge_part${this.currentPart}_scroll`, scrollPos);
        });
        
        // Restore scroll position
        const savedScroll = sessionStorage.getItem(`cambridge_part${this.currentPart}_scroll`);
        if (savedScroll) {
            setTimeout(() => window.scrollTo(0, parseInt(savedScroll)), 100);
        }
        
        console.log('✓ Cross-page state ready');
    }

    // ==================== CAMBRIDGE-SPECIFIC EVENTS ====================
    
    wireUpCambridgeEvents() {
        console.log('⚡ Wiring up Cambridge-specific events...');
        
        // Update answered state when questions are answered
        document.querySelectorAll('.subQuestion').forEach(btn => {
            const observer = new MutationObserver(() => {
                if (btn.classList.contains('answered')) {
                    btn.style.backgroundColor = '#4CAF50';
                    btn.style.color = 'white';
                }
            });
            
            observer.observe(btn, { attributes: true, attributeFilter: ['class'] });
        });
        
        console.log('✓ Cambridge events wired');
    }

    // ==================== UTILITY METHODS ====================
    
    detectCurrentPart() {
        const path = window.location.pathname;
        const match = path.match(/Part (\d+)\.html/i);
        return match ? parseInt(match[1]) : 1;
    }

    getTestKey() {
        const skill = document.body.getAttribute('data-skill') || 'reading-writing';
        const mock = document.body.getAttribute('data-mock') || document.body.getAttribute('data-test-version') || 'A2-Key';
        return `cambridge_${mock}_${skill}`;
    }
}

// ==================== GLOBAL INITIALIZATION ====================

// Initialize Cambridge Bridge when scripts are loaded
function initCambridgeBridge() {
    if (!window.cambridgeBridge) {
        window.cambridgeBridge = new CambridgeBridge();
        console.log('🌉 Cambridge Bridge initialized globally');
    }
}

// Initialize immediately if DOM is ready, otherwise wait
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCambridgeBridge);
} else {
    // Wait a bit for universal-functions.js to load
    setTimeout(initCambridgeBridge, 100);
}

// Also try on window load as backup
window.addEventListener('load', () => {
    if (!window.cambridgeBridge) {
        initCambridgeBridge();
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CambridgeBridge;
}

