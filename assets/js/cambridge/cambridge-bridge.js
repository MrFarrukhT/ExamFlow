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
        this.savedSelection = null; // Store selection when context menu opens
        this.savedRange = null;
        
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
        // Create or toggle the notes sidebar
        let sidebar = document.getElementById('notes-sidebar');
        const toggleBtn = document.getElementById('toggleSidebarButton');
        
        if (!sidebar) {
            // Create notes sidebar
            sidebar = document.createElement('div');
            sidebar.id = 'notes-sidebar';
            sidebar.className = 'notes-sidebar';
            sidebar.innerHTML = `
                <div class="notes-sidebar-header">
                    <h3>Notes</h3>
                    <button class="notes-close-btn" onclick="cambridgeBridge.toggleNotesSidebar()">&times;</button>
                </div>
                <div class="notes-sidebar-content">
                    <p class="notes-empty-message">No notes yet. Select text and use the context menu to add notes.</p>
                    <div id="notes-list"></div>
                </div>
            `;
            document.body.appendChild(sidebar);
            
            // Add sidebar styles
            if (!document.getElementById('notes-sidebar-styles')) {
                const style = document.createElement('style');
                style.id = 'notes-sidebar-styles';
                style.textContent = `
                    .notes-sidebar {
                        position: fixed;
                        top: 60px;
                        right: -350px;
                        width: 350px;
                        height: calc(100vh - 60px);
                        background: white;
                        border-left: 2px solid #e0e0e0;
                        box-shadow: -2px 0 10px rgba(0,0,0,0.1);
                        transition: right 0.3s ease;
                        z-index: 1500;
                        overflow-y: auto;
                    }
                    .notes-sidebar.open {
                        right: 0;
                    }
                    .notes-sidebar-header {
                        padding: 15px;
                        border-bottom: 1px solid #e0e0e0;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        background: #f8f9fa;
                    }
                    .notes-sidebar-header h3 {
                        margin: 0;
                        font-size: 1.2rem;
                    }
                    .notes-close-btn {
                        background: none;
                        border: none;
                        font-size: 2rem;
                        cursor: pointer;
                        color: #666;
                        line-height: 1;
                        padding: 0;
                        width: 30px;
                        height: 30px;
                    }
                    .notes-close-btn:hover {
                        color: #000;
                    }
                    .notes-sidebar-content {
                        padding: 15px;
                    }
                    .notes-empty-message {
                        color: #999;
                        font-style: italic;
                        text-align: center;
                        padding: 20px;
                    }
                    .note-item {
                        padding: 10px;
                        margin-bottom: 10px;
                        background: #fff9e6;
                        border-left: 3px solid #ff9800;
                        border-radius: 4px;
                    }
                    .note-text {
                        font-weight: bold;
                        margin-bottom: 5px;
                        color: #333;
                    }
                    .note-content {
                        color: #666;
                        font-size: 0.9rem;
                    }
                    .note-actions {
                        margin-top: 8px;
                        display: flex;
                        gap: 8px;
                    }
                    .note-action-btn {
                        padding: 4px 8px;
                        font-size: 0.85rem;
                        border: none;
                        background: #2196F3;
                        color: white;
                        border-radius: 3px;
                        cursor: pointer;
                    }
                    .note-action-btn:hover {
                        background: #1976D2;
                    }
                    .note-action-btn.delete {
                        background: #f44336;
                    }
                    .note-action-btn.delete:hover {
                        background: #d32f2f;
                    }
                    body.dark-mode .notes-sidebar {
                        background: #1a1a1a;
                        border-left-color: #333;
                    }
                    body.dark-mode .notes-sidebar-header {
                        background: #222;
                        color: #fff;
                    }
                    body.dark-mode .note-item {
                        background: #2a2a2a;
                        color: #fff;
                    }
                `;
                document.head.appendChild(style);
            }
        }
        
        // Toggle sidebar visibility
        const isOpen = sidebar.classList.contains('open');
        if (isOpen) {
            sidebar.classList.remove('open');
            if (toggleBtn) {
                toggleBtn.setAttribute('aria-expanded', 'false');
            }
        } else {
            sidebar.classList.add('open');
            if (toggleBtn) {
                toggleBtn.setAttribute('aria-expanded', 'true');
            }
            this.updateNotesList();
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
        
        // Ensure context menu exists - use existing one or create new
        let contextMenu = document.getElementById('contextMenu');
        if (!contextMenu) {
            this.createContextMenu();
            contextMenu = document.getElementById('contextMenu');
        } else {
            // Context menu exists in HTML, attach event listeners to it
            console.log('✓ Using existing context menu from HTML');
            this.attachContextMenuListeners(contextMenu);
        }
        
        // Ensure context menu has correct styling
        if (contextMenu && !document.getElementById('context-menu-styles')) {
            this.addContextMenuStyles();
        }
        
        // Setup context menu for Cambridge's text structure
        // Target all text-containing elements more broadly
        const textContainers = [
            document.getElementById('sectionContent'),
            document.getElementById('stimulus-content'),
            ...Array.from(document.querySelectorAll('.DisplayTypeContainer__sectionContent___2HSJ0')),
            ...Array.from(document.querySelectorAll('.StimulusDisplay__stimulusContent___2KVn5')),
            ...Array.from(document.querySelectorAll('.QuestionDisplay__questionBody___ZOMJ7')),
            ...Array.from(document.querySelectorAll('.QTIAssessmentItem__QTIAssessmentItem___cfGlV')),
            ...Array.from(document.querySelectorAll('.container.generic')),
            ...Array.from(document.querySelectorAll('.container.inlineChoice')),
            ...Array.from(document.querySelectorAll('p, div, span')),
            document.body
        ].filter(el => el !== null);
        
        // Use a single delegated event listener on document for better performance
        document.addEventListener('contextmenu', (e) => {
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();
            
            // Only show menu if there's selected text
            if (selectedText.length > 0) {
                e.preventDefault();
                e.stopPropagation();
                
                // IMPORTANT: Save the selection and range before showing menu
                // because clicking the menu will clear the selection
                this.savedSelection = selectedText;
                if (selection.rangeCount > 0) {
                    this.savedRange = selection.getRangeAt(0).cloneRange();
                    console.log('✓ Saved selection:', selectedText.substring(0, 50) + '...');
                }
                
                this.showContextMenu(e.clientX, e.clientY);
            }
        }, true); // Use capture phase to catch all events
        
        // Hide context menu when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#contextMenu')) {
                this.hideContextMenu();
            }
        }, true);
        
        // Enable text selection globally (override any user-select: none)
        this.enableTextSelection();
        
        console.log('✓ Context menu adapter ready');
    }
    
    enableTextSelection() {
        // Check if this page has both reading passage and questions (split view)
        const hasReadingPassage = document.querySelector('.StimulusDisplay__stimulusContent___2KVn5');
        const hasQuestions = document.querySelector('.QuestionDisplay__questionBody___ZOMJ7');
        const isSplitView = hasReadingPassage && hasQuestions;
        
        // Check if this is Part 1 (disable highlighting for Part 1)
        // Try multiple detection methods
        let isPart1 = false;
        
        // Method 1: Check for currentPart variable in page
        if (typeof window.currentPart !== 'undefined') {
            isPart1 = window.currentPart === 1;
        }
        
        // Method 2: Check URL
        if (!isPart1) {
            isPart1 = window.location.href.includes('Part 1.html') || 
                      window.location.pathname.includes('Part 1.html') ||
                      window.location.href.includes('Part%201.html');
        }
        
        // Method 3: Check for specific Part 1 structure (no reading passage)
        if (!isPart1 && hasQuestions && !hasReadingPassage) {
            // If there are questions but no reading passage, check if it's Part 1 by looking for specific elements
            const questionCount = document.querySelectorAll('.question-wrapper').length;
            // Part 1 typically has 6 questions
            if (questionCount === 6) {
                isPart1 = true;
            }
        }
        
        console.log('Text selection setup:', { 
            hasReadingPassage: !!hasReadingPassage, 
            hasQuestions: !!hasQuestions, 
            isSplitView, 
            isPart1,
            currentPartVariable: window.currentPart,
            questionCount: document.querySelectorAll('.question-wrapper').length,
            url: window.location.href,
            pathname: window.location.pathname
        });
        
        // Add CSS to enable text selection
        if (!document.getElementById('text-selection-styles')) {
            const style = document.createElement('style');
            style.id = 'text-selection-styles';
            
            if (isSplitView || isPart1) {
                // Split view OR Part 1: Only enable selection in reading passage (if exists), not in questions
                style.textContent = `
                    /* Disable selection everywhere first (Part 1 or split view) */
                    body, body *,
                    .QuestionDisplay__questionBody___ZOMJ7,
                    .QuestionDisplay__questionBody___ZOMJ7 *,
                    .QuestionDisplay__mainQuestionWrapper___3P0CZ,
                    .QuestionDisplay__mainQuestionWrapper___3P0CZ *,
                    .choiceInteraction__choiceInteraction___3W0MH,
                    .choiceInteraction__choiceInteraction___3W0MH *,
                    .interaction-prompt,
                    .interaction-container {
                        -webkit-user-select: none !important;
                        -moz-user-select: none !important;
                        -ms-user-select: none !important;
                        user-select: none !important;
                        cursor: default !important;
                    }
                    
                    /* Then enable ONLY in reading passages (overrides above for split view with reading) */
                    .StimulusDisplay__stimulusContent___2KVn5,
                    .StimulusDisplay__stimulusContent___2KVn5 *,
                    .StimulusDisplay__stimulusContent___2KVn5 p,
                    .StimulusDisplay__stimulusContent___2KVn5 div,
                    .StimulusDisplay__stimulusContent___2KVn5 span,
                    .StimulusDisplay__stimulusContent___2KVn5 strong,
                    .StimulusDisplay__stimulusContent___2KVn5 em {
                        -webkit-user-select: text !important;
                        -moz-user-select: text !important;
                        -ms-user-select: text !important;
                        user-select: text !important;
                        cursor: text !important;
                    }
                    
                    /* Disable on form elements */
                    input[type="radio"],
                    input[type="checkbox"],
                    input[type="button"],
                    input[type="submit"],
                    button,
                    select,
                    textarea,
                    .footer__footer___1NlzQ,
                    .footer__footer___1NlzQ *,
                    .header__header___3v_A5,
                    .header__header___3v_A5 * {
                        -webkit-user-select: none !important;
                        -moz-user-select: none !important;
                        -ms-user-select: none !important;
                        user-select: none !important;
                        cursor: default !important;
                    }
                `;
            } else {
                // Question-only view: Enable selection everywhere
                style.textContent = `
                    /* Enable text selection EVERYWHERE in question-only parts */
                    body, body *,
                    .DisplayTypeContainer__sectionContent___2HSJ0,
                    .QuestionDisplay__questionBody___ZOMJ7,
                    .QuestionDisplay__mainQuestionWrapper___3P0CZ,
                    .QuestionDisplay__questionContentOverflow___3e0FA,
                    .QTIAssessmentItem__QTIAssessmentItemWrapper___3W6-C,
                    .QTIAssessmentItem__QTIAssessmentItem___cfGlV,
                    .choiceInteraction__choiceInteraction___3W0MH,
                    .choiceInteraction__choiceInteraction___3W0MH *,
                    .choiceInteraction__choiceInteraction___3W0MH ul,
                    .choiceInteraction__choiceInteraction___3W0MH li,
                    .choiceInteraction__choiceInteraction___3W0MH label,
                    .choiceInteraction__choiceInteraction___3W0MH label *,
                    .choiceInteraction__choiceInteraction___3W0MH label span,
                    .choiceInteraction__choiceInteraction___3W0MH .text,
                    .interaction-prompt,
                    .interaction-container,
                    .container.generic,
                    .container.inlineChoice,
                    .container.accordionChoice,
                    .question-rubric,
                    .scorableItemHeadline,
                    .QuestionDisplay__rubricContent___1byNW,
                    ul, li, label, label *,
                    p, div, span, h1, h2, h3, h4, h5, h6, strong, em {
                        -webkit-user-select: text !important;
                        -moz-user-select: text !important;
                        -ms-user-select: text !important;
                        user-select: text !important;
                        cursor: text !important;
                    }
                    
                    /* FORCE text selection on answer choice labels and text */
                    label[for], 
                    label[for] *,
                    label[for] span,
                    .choiceInteraction__choiceInteraction___3W0MH label[for],
                    .choiceInteraction__choiceInteraction___3W0MH label[for] *,
                    ul.vertical li label,
                    ul.vertical li label *,
                    ul.vertical li label span,
                    ul.vertical li label .text {
                        -webkit-user-select: text !important;
                        -moz-user-select: text !important;
                        -ms-user-select: text !important;
                        user-select: text !important;
                        cursor: text !important;
                        pointer-events: auto !important;
                    }
                    
                    /* But keep user-select: none on actual interactive form elements */
                    input[type="radio"],
                    input[type="checkbox"],
                    input[type="button"],
                    input[type="submit"],
                    button:not(.context-menu-item),
                    select,
                    textarea,
                    .footer__footer___1NlzQ,
                    .footer__footer___1NlzQ *,
                    .header__header___3v_A5,
                    .header__header___3v_A5 * {
                        -webkit-user-select: none !important;
                        -moz-user-select: none !important;
                        -ms-user-select: none !important;
                        user-select: none !important;
                    }
                    
                    /* Override any pointer-events that might block text selection */
                    .choiceInteraction__choiceInteraction___3W0MH label span,
                    .choiceInteraction__choiceInteraction___3W0MH .text {
                        pointer-events: auto !important;
                    }
                `;
            }
            
            document.head.appendChild(style);
        }
    }
    
    addContextMenuStyles() {
        if (document.getElementById('context-menu-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'context-menu-styles';
        style.textContent = `
            #contextMenu.context-menu {
                position: fixed !important;
                background: white !important;
                border: 1px solid #ccc !important;
                border-radius: 4px !important;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2) !important;
                z-index: 10000 !important;
                min-width: 150px !important;
                display: none !important;
                padding: 4px 0 !important;
            }
            #contextMenu.context-menu.show {
                display: block !important;
            }
            .context-menu-item {
                padding: 10px 15px !important;
                cursor: pointer !important;
                transition: background 0.2s !important;
                color: #333 !important;
                font-size: 14px !important;
                white-space: nowrap !important;
            }
            .context-menu-item:hover {
                background: #f0f0f0 !important;
            }
            .context-menu-item:active {
                background: #e0e0e0 !important;
            }
            .highlight {
                background-color: #ffff00 !important;
                cursor: pointer !important;
                padding: 2px 0 !important;
                border-radius: 2px !important;
            }
            .highlight-with-note {
                background-color: #ffeb3b !important;
                border-bottom: 2px dotted #ff9800 !important;
                padding: 2px 0 !important;
            }
            body.dark-mode .context-menu {
                background: #2a2a2a !important;
                border-color: #444 !important;
            }
            body.dark-mode .context-menu-item {
                color: #fff !important;
            }
            body.dark-mode .context-menu-item:hover {
                background: #3a3a3a !important;
            }
        `;
        document.head.appendChild(style);
    }

    attachContextMenuListeners(menu) {
        // Attach event listeners to existing menu items
        const items = menu.querySelectorAll('.context-menu-item');
        items.forEach(item => {
            const text = item.textContent.trim().toLowerCase();
            
            // Remove any existing onclick handlers
            item.removeAttribute('onclick');
            
            // Add new event listener
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log(`Context menu "${text}" clicked`);
                
                if (text.includes('highlight') && !text.includes('clear')) {
                    if (window.highlightText) window.highlightText();
                } else if (text.includes('note')) {
                    if (window.addNote) window.addNote();
                } else if (text.includes('clear all')) {
                    if (window.clearAllHighlights) window.clearAllHighlights();
                } else if (text.includes('clear')) {
                    if (window.clearHighlight) window.clearHighlight();
                }
            });
        });
        console.log(`✓ Attached listeners to ${items.length} context menu items`);
    }
    
    createContextMenu() {
        const menu = document.createElement('div');
        menu.id = 'contextMenu';
        menu.className = 'context-menu';
        menu.style.display = 'none';
        
        // Create menu items with event listeners
        const highlightItem = document.createElement('div');
        highlightItem.className = 'context-menu-item';
        highlightItem.textContent = 'Highlight';
        highlightItem.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Highlight menu item clicked');
            if (window.highlightText) window.highlightText();
        });
        
        const noteItem = document.createElement('div');
        noteItem.className = 'context-menu-item';
        noteItem.textContent = 'Note';
        noteItem.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Note menu item clicked');
            if (window.addNote) window.addNote();
        });
        
        const clearItem = document.createElement('div');
        clearItem.className = 'context-menu-item';
        clearItem.textContent = 'Clear';
        clearItem.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Clear menu item clicked');
            if (window.clearHighlight) window.clearHighlight();
        });
        
        const clearAllItem = document.createElement('div');
        clearAllItem.className = 'context-menu-item';
        clearAllItem.textContent = 'Clear All';
        clearAllItem.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Clear All menu item clicked');
            if (window.clearAllHighlights) window.clearAllHighlights();
        });
        
        menu.appendChild(highlightItem);
        menu.appendChild(noteItem);
        menu.appendChild(clearItem);
        menu.appendChild(clearAllItem);
        
        document.body.appendChild(menu);
        console.log('✓ Context menu created with event listeners');
    }

    showContextMenu(x, y) {
        const menu = document.getElementById('contextMenu');
        if (menu) {
            // Position menu, ensuring it stays on screen
            const menuWidth = 150;
            const menuHeight = 150;
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            
            let left = x;
            let top = y;
            
            // Adjust if menu would go off screen
            if (left + menuWidth > windowWidth) {
                left = windowWidth - menuWidth - 10;
            }
            if (top + menuHeight > windowHeight) {
                top = windowHeight - menuHeight - 10;
            }
            if (left < 0) left = 10;
            if (top < 0) top = 10;
            
            menu.style.left = left + 'px';
            menu.style.top = top + 'px';
            menu.style.display = 'block';
            menu.classList.add('show');
        }
    }

    hideContextMenu() {
        const menu = document.getElementById('contextMenu');
        if (menu) {
            menu.style.display = 'none';
            menu.classList.remove('show');
        }
    }

    highlightSelection() {
        console.log('highlightSelection() executing...');
        
        // Use saved range instead of current selection (which may be cleared)
        let range = this.savedRange;
        let selectedText = this.savedSelection;
        
        // Fallback to current selection if saved range doesn't exist
        if (!range) {
            console.log('No saved range, trying current selection');
            const selection = window.getSelection();
            if (selection.rangeCount === 0) {
                console.error('No selection found');
                if (window.ieltsUniversal) {
                    window.ieltsUniversal.showToast('Please select text first', 'error');
                }
                this.hideContextMenu();
                return;
            }
            range = selection.getRangeAt(0);
            selectedText = selection.toString().trim();
        }
        
        console.log('Using text:', selectedText?.substring(0, 50));
        
        if (!selectedText || selectedText.length === 0) {
            if (window.ieltsUniversal) {
                window.ieltsUniversal.showToast('Please select text first', 'error');
            }
            this.hideContextMenu();
            return;
        }
        
        // Limit selection to first paragraph if multiple paragraphs selected
        range = this.limitToFirstParagraph(range);
        selectedText = range.toString().trim();
        console.log('After limiting to first paragraph:', selectedText?.substring(0, 50));
        
        // Check if selection is already highlighted
        const container = range.commonAncestorContainer;
        const parentElement = container.nodeType === 3 ? container.parentElement : container;
        if (parentElement && parentElement.closest('.highlight')) {
            if (window.ieltsUniversal) {
                window.ieltsUniversal.showToast('Text is already highlighted', 'info');
            }
            const selection = window.getSelection();
            if (selection) selection.removeAllRanges();
            this.savedRange = null;
            this.savedSelection = null;
            this.hideContextMenu();
            return;
        }
        
        try {
            // Try to highlight using surroundContents
            const span = document.createElement('span');
            const highlightId = Date.now();
            span.className = 'highlight';
            span.setAttribute('data-highlight-id', highlightId);
            span.setAttribute('data-part', this.currentPart);
            
            try {
                range.surroundContents(span);
            } catch (surroundError) {
                // If surroundContents fails, try a different approach
                const contents = range.extractContents();
                span.appendChild(contents);
                range.insertNode(span);
            }
            
            this.highlightedRanges.push({
                id: String(highlightId),
                text: selectedText,
                part: this.currentPart
            });
            this.saveHighlightsToStorage();
            
            // No toast notification for successful highlight (as requested)
            
            // Clear selection and saved range
            const selection = window.getSelection();
            if (selection) selection.removeAllRanges();
            this.savedRange = null;
            this.savedSelection = null;
            this.hideContextMenu();
        } catch (e) {
            console.error('Error highlighting text:', e);
            if (window.ieltsUniversal) {
                window.ieltsUniversal.showToast('Could not highlight selection. Try selecting simpler text.', 'error');
            }
            const selection = window.getSelection();
            if (selection) selection.removeAllRanges();
            this.savedRange = null;
            this.savedSelection = null;
            this.hideContextMenu();
        }
    }

    limitToFirstParagraph(range) {
        // Check if selection spans multiple paragraphs or block elements
        const startContainer = range.startContainer;
        const endContainer = range.endContainer;
        
        // Find the first block-level parent (p, div, li, etc.)
        const blockElements = ['P', 'DIV', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'TD', 'TH'];
        
        function findBlockParent(node) {
            while (node && node.nodeType !== 9) { // 9 = DOCUMENT_NODE
                if (node.nodeType === 1 && blockElements.includes(node.nodeName)) {
                    return node;
                }
                node = node.parentNode;
            }
            return null;
        }
        
        const startBlock = findBlockParent(startContainer);
        const endBlock = findBlockParent(endContainer);
        
        // If selection spans multiple blocks, limit to first block
        if (startBlock && endBlock && startBlock !== endBlock) {
            console.log('Selection spans multiple paragraphs, limiting to first paragraph');
            
            const newRange = document.createRange();
            newRange.setStart(range.startContainer, range.startOffset);
            
            // Set end to the end of the first block
            newRange.setEndAfter(startBlock.lastChild || startBlock);
            
            if (window.ieltsUniversal) {
                window.ieltsUniversal.showToast('Multi-paragraph selection - highlighting first paragraph only', 'info');
            }
            
            return newRange;
        }
        
        // Selection is within single paragraph, return as-is
        return range;
    }
    
    addNoteToSelection() {
        console.log('addNoteToSelection() executing...');
        
        // Use saved range instead of current selection (which may be cleared)
        let range = this.savedRange;
        let text = this.savedSelection;
        
        // Fallback to current selection if saved range doesn't exist
        if (!range) {
            console.log('No saved range, trying current selection');
            const selection = window.getSelection();
            if (selection.rangeCount === 0) {
                console.error('No selection found');
                if (window.ieltsUniversal) {
                    window.ieltsUniversal.showToast('Please select text first', 'error');
                }
                this.hideContextMenu();
                return;
            }
            range = selection.getRangeAt(0);
            text = selection.toString().trim();
        }
        
        console.log('Using text for note:', text?.substring(0, 50));
        
        if (!text || text.length === 0) {
            if (window.ieltsUniversal) {
                window.ieltsUniversal.showToast('Please select text first', 'error');
            }
            this.hideContextMenu();
            return;
        }
        
        // Limit selection to first paragraph if multiple paragraphs selected
        range = this.limitToFirstParagraph(range);
        text = range.toString().trim();
        console.log('After limiting to first paragraph:', text?.substring(0, 50));
        
        const note = prompt('Enter your note:', '');
        
        if (!note || note.trim().length === 0) {
            this.savedRange = null;
            this.savedSelection = null;
            this.hideContextMenu();
            return;
        }
        
        try {
            const span = document.createElement('span');
            const noteId = Date.now();
            span.className = 'highlight highlight-with-note';
            span.setAttribute('data-highlight-id', noteId);
            span.setAttribute('data-part', this.currentPart);
            span.title = note.trim();
            
            try {
                range.surroundContents(span);
            } catch (surroundError) {
                // If surroundContents fails, try a different approach
                const contents = range.extractContents();
                span.appendChild(contents);
                range.insertNode(span);
            }
            
            this.highlightedRanges.push({
                id: String(noteId),
                text: text,
                note: note.trim(),
                part: this.currentPart
            });
            
            this.notes[String(noteId)] = note.trim();
            this.saveHighlightsToStorage();
            
            // No toast notification for note added (keep it clean)
            
            // Update notes sidebar if open
            this.updateNotesList();
        } catch (e) {
            console.error('Could not add note:', e);
            if (window.ieltsUniversal) {
                window.ieltsUniversal.showToast('Could not add note. Try selecting simpler text.', 'error');
            }
        }
        
        // Clear selection and saved range
        const selection = window.getSelection();
        if (selection) selection.removeAllRanges();
        this.savedRange = null;
        this.savedSelection = null;
        this.hideContextMenu();
    }
    
    updateNotesList() {
        const notesList = document.getElementById('notes-list');
        const emptyMessage = document.querySelector('.notes-empty-message');
        
        if (!notesList) return;
        
        // Get all notes with content
        const notesWithContent = this.highlightedRanges.filter(h => h.note);
        
        if (notesWithContent.length === 0) {
            if (emptyMessage) emptyMessage.style.display = 'block';
            notesList.innerHTML = '';
            return;
        }
        
        if (emptyMessage) emptyMessage.style.display = 'none';
        
        // Build notes HTML
        notesList.innerHTML = notesWithContent.map(noteData => `
            <div class="note-item" data-note-id="${noteData.id}">
                <div class="note-text">"${this.truncateText(noteData.text, 50)}"</div>
                <div class="note-content">${noteData.note}</div>
                <div class="note-actions">
                    <button class="note-action-btn" onclick="cambridgeBridge.jumpToNote('${noteData.id}')">
                        <i class="fa fa-eye"></i> Find
                    </button>
                    <button class="note-action-btn delete" onclick="cambridgeBridge.deleteNote('${noteData.id}')">
                        <i class="fa fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    jumpToNote(noteId) {
        const highlightSpan = document.querySelector(`[data-highlight-id="${noteId}"]`);
        if (highlightSpan) {
            highlightSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Briefly flash the highlight
            highlightSpan.style.transition = 'background-color 0.3s';
            const originalBg = highlightSpan.style.backgroundColor;
            highlightSpan.style.backgroundColor = '#ff9800';
            setTimeout(() => {
                highlightSpan.style.backgroundColor = originalBg;
            }, 1000);
            
            if (window.ieltsUniversal) {
                window.ieltsUniversal.showToast('Note found', 'success');
            }
        } else {
            if (window.ieltsUniversal) {
                window.ieltsUniversal.showToast('Note not found on this page', 'error');
            }
        }
    }
    
    deleteNote(noteId) {
        if (!confirm('Delete this note?')) return;
        
        // Find and remove the highlight span
        const highlightSpan = document.querySelector(`[data-highlight-id="${noteId}"]`);
        if (highlightSpan) {
            const text = highlightSpan.textContent;
            highlightSpan.replaceWith(text);
        }
        
        // Remove from data structures
        this.highlightedRanges = this.highlightedRanges.filter(h => h.id !== noteId);
        delete this.notes[noteId];
        this.saveHighlightsToStorage();
        
        // Update the notes list
        this.updateNotesList();
        
        if (window.ieltsUniversal) {
            window.ieltsUniversal.showToast('Note deleted', 'success');
        }
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
            
            // Update notes sidebar if open
            this.updateNotesList();
            
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
        
        // Update notes sidebar if open
        this.updateNotesList();
        
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
                
                // Restore highlights visually after a short delay to ensure DOM is ready
                setTimeout(() => {
                    this.restoreHighlightsForCurrentPage();
                }, 500);
            } catch (e) {
                console.warn('Error loading highlights:', e);
            }
        }
        
        if (savedNotes) {
            try {
                this.notes = JSON.parse(savedNotes);
                console.log(`Loaded ${Object.keys(this.notes).length} notes`);
                
                // Restore notes list
                setTimeout(() => {
                    this.updateNotesList();
                }, 500);
            } catch (e) {
                console.warn('Error loading notes:', e);
            }
        }
    }
    
    restoreHighlightsForCurrentPage() {
        console.log(`🎨 Restoring ${this.highlightedRanges.length} highlights visually...`);
        
        let restoredCount = 0;
        
        this.highlightedRanges.forEach((range, index) => {
            try {
                // Find text in the current page
                const walker = document.createTreeWalker(
                    document.body,
                    NodeFilter.SHOW_TEXT,
                    null,
                    false
                );
                
                let node;
                while (node = walker.nextNode()) {
                    const text = node.textContent;
                    if (text.includes(range.text)) {
                        // Found the text, apply highlight
                        const parent = node.parentElement;
                        if (parent && !parent.classList.contains('highlighted-text')) {
                            const span = document.createElement('span');
                            span.className = 'highlighted-text';
                            span.style.backgroundColor = range.color || '#ffff00';
                            span.textContent = range.text;
                            span.dataset.highlightIndex = index;
                            
                            // Replace the text node with highlighted span
                            const startIndex = text.indexOf(range.text);
                            if (startIndex !== -1) {
                                const before = text.substring(0, startIndex);
                                const after = text.substring(startIndex + range.text.length);
                                
                                const beforeNode = document.createTextNode(before);
                                const afterNode = document.createTextNode(after);
                                
                                parent.insertBefore(beforeNode, node);
                                parent.insertBefore(span, node);
                                parent.insertBefore(afterNode, node);
                                parent.removeChild(node);
                                
                                restoredCount++;
                                console.log(`✅ Restored highlight ${index + 1}: "${range.text.substring(0, 30)}..."`);
                                break; // Move to next highlight
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn(`Could not restore highlight ${index + 1}:`, e);
            }
        });
        
        console.log(`✅ Restored ${restoredCount}/${this.highlightedRanges.length} highlights visually`);
        
        // Also restore notes visually if any
        this.restoreNotesVisually();
    }
    
    restoreNotesVisually() {
        const noteCount = Object.keys(this.notes).length;
        if (noteCount > 0) {
            console.log(`📝 ${noteCount} notes are available in storage`);
            // Notes are displayed in the notes sidebar, which is managed separately
            this.updateNotesList();
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
            
            // Find part button by iterating (can't use :contains in vanilla JS)
            const sectionNumbers = document.querySelectorAll('[data-sectionid] .sectionNr');
            const partButton = Array.from(sectionNumbers).find(el => el.textContent.trim() === String(i));
            
            if (partButton) {
                const attemptedSpan = partButton.parentElement.querySelector('.attemptedCount');
                // Counter is already updated by a2-key-answer-sync.js updateFooterCounter()
                // Just ensure it's visible if answers exist
                if (attemptedSpan && answerCount > 0) {
                    // Don't change color - keep default styling
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
        console.log('✅ Context menu functions available');
    }
    return window.cambridgeBridge;
}

// Try immediate initialization
try {
    initCambridgeBridge();
} catch (e) {
    console.warn('Could not initialize immediately:', e);
}

// Initialize immediately if DOM is ready, otherwise wait
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCambridgeBridge);
} else {
    // DOM is already loaded, try init
    setTimeout(initCambridgeBridge, 50);
}

// Also try on window load as backup
window.addEventListener('load', () => {
    if (!window.cambridgeBridge) {
        initCambridgeBridge();
    }
});

// ==================== GLOBAL WRAPPER FUNCTIONS ====================
// These functions are called by inline onclick handlers in the HTML

// Global wrapper function for highlighting text
window.highlightText = function() {
    console.log('highlightText() called');
    if (window.cambridgeBridge) {
        console.log('Calling cambridgeBridge.highlightSelection()');
        try {
            window.cambridgeBridge.highlightSelection();
        } catch (e) {
            console.error('Error in highlightSelection:', e);
            alert('Error highlighting text: ' + e.message);
        }
    } else {
        console.error('cambridgeBridge not initialized');
        alert('System not ready. Please refresh the page.');
    }
};

// Global wrapper function for adding a note
window.addNote = function() {
    console.log('addNote() called');
    if (window.cambridgeBridge) {
        console.log('Calling cambridgeBridge.addNoteToSelection()');
        try {
            window.cambridgeBridge.addNoteToSelection();
        } catch (e) {
            console.error('Error in addNoteToSelection:', e);
            alert('Error adding note: ' + e.message);
        }
    } else {
        console.error('cambridgeBridge not initialized');
        alert('System not ready. Please refresh the page.');
    }
};

// Global wrapper function for clearing a highlight
window.clearHighlight = function() {
    console.log('clearHighlight() called');
    if (window.cambridgeBridge) {
        console.log('Calling cambridgeBridge.clearHighlightAtCursor()');
        try {
            window.cambridgeBridge.clearHighlightAtCursor();
        } catch (e) {
            console.error('Error in clearHighlightAtCursor:', e);
            alert('Error clearing highlight: ' + e.message);
        }
    } else {
        console.error('cambridgeBridge not initialized');
        alert('System not ready. Please refresh the page.');
    }
};

// Global wrapper function for clearing all highlights
window.clearAllHighlights = function() {
    console.log('clearAllHighlights() called');
    if (window.cambridgeBridge) {
        console.log('Calling cambridgeBridge.clearAllHighlights()');
        try {
            window.cambridgeBridge.clearAllHighlights();
        } catch (e) {
            console.error('Error in clearAllHighlights:', e);
            alert('Error clearing all highlights: ' + e.message);
        }
    } else {
        console.error('cambridgeBridge not initialized');
        alert('System not ready. Please refresh the page.');
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CambridgeBridge;
}

