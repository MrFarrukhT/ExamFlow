/**
 * Cambridge Notes Management System
 * Saves and restores notes when navigating between parts
 */
class CambridgeNotesManager {
    constructor() {
        this.storageKey = 'cambridge_notes';
        this.currentPart = this.getCurrentPart();
        this.notesElement = null;
        this.init();
    }
    
    init() {
        console.log('📝 Initializing Cambridge Notes Manager for:', this.currentPart);
        
        // Wait for page to fully load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setup();
            });
        } else {
            this.setup();
        }
    }
    
    setup() {
        // Find notes element
        this.notesElement = this.findNotesElement();
        
        if (this.notesElement) {
            console.log('Found notes element:', this.notesElement);
            
            // Restore saved notes
            this.restoreNotes();
            
            // Setup save listeners
            this.setupSaveListeners();
            
            console.log('✅ Notes Manager initialized');
        } else {
            console.log('⚠️ No notes element found on this page');
            
            // Still try to restore hypothesis notes
            this.restoreHypothesisNotes();
        }
    }
    
    getCurrentPart() {
        // Get current part from URL
        const path = window.location.pathname;
        const match = path.match(/Part\s*(\d+)\.html|Listening-Part-(\d+)\.html/i);
        if (match) {
            return `Part ${match[1] || match[2]}`;
        }
        
        // Try to get from filename
        const filename = path.split('/').pop();
        if (filename) {
            return filename.replace('.html', '');
        }
        
        return 'unknown-part';
    }
    
    findNotesElement() {
        // Look for common notes elements
        const selectors = [
            'textarea[id*="notes"]',
            'textarea[id*="Notes"]',
            'textarea.notes',
            'textarea.notes-input',
            'input[id*="notes"]',
            'div[contenteditable="true"][id*="notes"]',
            '#notes',
            '#Notes',
            '.notes-input',
            '.notes-textarea',
            '[data-notes="true"]',
            'textarea[placeholder*="notes" i]',
            'textarea[placeholder*="Notes" i]',
            // Hypothesis sidebar textarea
            'textarea.annotator-note-input',
            'textarea[placeholder*="Add a note" i]',
            '.hypothesis-note-input'
        ];
        
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                console.log(`📝 Found notes element with selector: ${selector}`);
                return element;
            }
        }
        
        // Check for hypothesis notes
        const hypothesisNotes = document.querySelector('.hypothesis-notes, .annotator-note, .hypothesis-annotation-body');
        if (hypothesisNotes) {
            console.log('📝 Found Hypothesis notes element');
            return hypothesisNotes;
        }
        
        console.log('⚠️ No notes element found, will still track Hypothesis annotations');
        return null;
    }
    
    saveNotes() {
        let notesContent = '';
        
        if (this.notesElement) {
            // Save from notes element
            notesContent = this.notesElement.value || this.notesElement.textContent || '';
        }
        
        // Also save hypothesis notes
        const hypothesisNotes = this.getHypothesisNotes();
        
        // Combine all notes
        const allNotes = this.getAllNotes();
        allNotes[this.currentPart] = {
            content: notesContent,
            hypothesisNotes: hypothesisNotes,
            timestamp: Date.now()
        };
        
        localStorage.setItem(this.storageKey, JSON.stringify(allNotes));
        
        if (notesContent || hypothesisNotes.length > 0) {
            console.log(`💾 Saved notes for ${this.currentPart} (${notesContent.length} chars, ${hypothesisNotes.length} annotations)`);
        }
    }
    
    restoreNotes() {
        const allNotes = this.getAllNotes();
        const savedNotes = allNotes[this.currentPart];
        
        if (!savedNotes) {
            console.log('No notes to restore for', this.currentPart);
            return;
        }
        
        // Restore to notes element
        if (this.notesElement && savedNotes.content) {
            if (this.notesElement.value !== undefined) {
                this.notesElement.value = savedNotes.content;
            } else {
                this.notesElement.textContent = savedNotes.content;
            }
            console.log(`✅ Restored ${savedNotes.content.length} characters of notes`);
        }
        
        // Restore hypothesis notes
        if (savedNotes.hypothesisNotes && savedNotes.hypothesisNotes.length > 0) {
            this.restoreHypothesisNotes(savedNotes.hypothesisNotes);
        }
    }
    
    getHypothesisNotes() {
        const notes = [];
        
        // Find all hypothesis annotations/notes with multiple selectors
        const selectors = [
            '.annotator-note',
            '.hypothesis-annotation',
            '[data-hypothesis-annotation]',
            '.hypothesis-annotation-body',
            '.annotator-annotation',
            'hypothesis-annotation',
            '.annotation-body'
        ];
        
        selectors.forEach(selector => {
            try {
                const annotationElements = document.querySelectorAll(selector);
                annotationElements.forEach(el => {
                    const text = el.textContent || el.innerText || '';
                    if (text.trim()) {
                        const noteData = {
                            text: text.trim(),
                            xpath: this.getXPath(el),
                            selector: selector,
                            timestamp: Date.now()
                        };
                        // Avoid duplicates
                        if (!notes.find(n => n.text === noteData.text && n.xpath === noteData.xpath)) {
                            notes.push(noteData);
                        }
                    }
                });
            } catch (e) {
                console.warn(`Could not query selector: ${selector}`);
            }
        });
        
        if (notes.length > 0) {
            console.log(`📝 Found ${notes.length} Hypothesis notes`);
        }
        
        return notes;
    }
    
    restoreHypothesisNotes(notes) {
        if (!notes) {
            const allNotes = this.getAllNotes();
            const savedNotes = allNotes[this.currentPart];
            notes = savedNotes?.hypothesisNotes || [];
        }
        
        if (notes.length === 0) return;
        
        let restoredCount = 0;
        
        notes.forEach(note => {
            try {
                const element = this.getElementByXPath(note.xpath);
                if (element) {
                    // Try to restore the note content
                    if (element.textContent !== note.text) {
                        if (element.value !== undefined) {
                            element.value = note.text;
                        } else {
                            element.textContent = note.text;
                        }
                    }
                    restoredCount++;
                }
            } catch (e) {
                console.warn('Could not restore note:', e);
            }
        });
        
        if (restoredCount > 0) {
            console.log(`✅ Restored ${restoredCount}/${notes.length} hypothesis notes`);
        }
    }
    
    setupSaveListeners() {
        console.log('📝 Setting up notes save listeners');
        
        if (this.notesElement) {
            // Save on input
            this.notesElement.addEventListener('input', () => {
                console.log('📝 Notes input detected');
                this.saveNotes();
            });
            
            this.notesElement.addEventListener('change', () => {
                console.log('📝 Notes change detected');
                this.saveNotes();
            });
        }
        
        // Save before navigating away
        window.addEventListener('beforeunload', () => {
            this.saveNotes();
        });
        
        // Save periodically
        setInterval(() => {
            this.saveNotes();
        }, 5000);
        
        // Listen for DOM mutations (notes being added via Hypothesis)
        const observer = new MutationObserver((mutations) => {
            let shouldSave = false;
            
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if it's a note/annotation element
                        if (node.classList && (
                            node.classList.contains('hypothesis-annotation') ||
                            node.classList.contains('annotator-note') ||
                            node.classList.contains('annotation-body')
                        )) {
                            shouldSave = true;
                            console.log('📝 New note detected:', node);
                        }
                    }
                });
            });
            
            if (shouldSave) {
                setTimeout(() => this.saveNotes(), 500);
            }
        });
        
        // Observe the document for changes
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
        
        // Listen for hypothesis annotation events
        document.addEventListener('hypothesis:annotationCreated', () => {
            console.log('📝 Hypothesis annotation created event');
            setTimeout(() => this.saveNotes(), 500);
        });
        
        document.addEventListener('hypothesis:annotationUpdated', () => {
            console.log('📝 Hypothesis annotation updated event');
            setTimeout(() => this.saveNotes(), 500);
        });
        
        // Listen for note button clicks
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[aria-label*="note" i], [title*="note" i], .note-button, button[aria-label*="New page note"]');
            if (target) {
                console.log('📝 Note button clicked');
                setTimeout(() => this.saveNotes(), 500);
            }
        });
        
        console.log('✅ Notes save listeners attached');
    }
    
    getAllNotes() {
        try {
            return JSON.parse(localStorage.getItem(this.storageKey) || '{}');
        } catch (e) {
            console.error('Error loading notes:', e);
            return {};
        }
    }
    
    getXPath(element) {
        if (!element) return '';
        
        if (element.id) {
            return `//*[@id="${element.id}"]`;
        }
        
        const parts = [];
        while (element && element.nodeType === Node.ELEMENT_NODE) {
            let index = 0;
            let sibling = element.previousSibling;
            
            while (sibling) {
                if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === element.nodeName) {
                    index++;
                }
                sibling = sibling.previousSibling;
            }
            
            const tagName = element.nodeName.toLowerCase();
            const pathIndex = index > 0 ? `[${index + 1}]` : '';
            parts.unshift(tagName + pathIndex);
            
            element = element.parentNode;
        }
        
        return parts.length ? '/' + parts.join('/') : '';
    }
    
    getElementByXPath(xpath) {
        try {
            return document.evaluate(
                xpath, 
                document, 
                null, 
                XPathResult.FIRST_ORDERED_NODE_TYPE, 
                null
            ).singleNodeValue;
        } catch (e) {
            console.warn('Error evaluating XPath:', xpath, e);
            return null;
        }
    }
    
    clearNotes() {
        const allNotes = this.getAllNotes();
        delete allNotes[this.currentPart];
        localStorage.setItem(this.storageKey, JSON.stringify(allNotes));
        
        if (this.notesElement) {
            if (this.notesElement.value !== undefined) {
                this.notesElement.value = '';
            } else {
                this.notesElement.textContent = '';
            }
        }
        
        console.log(`🗑️ Cleared notes for ${this.currentPart}`);
    }
    
    clearAllNotes() {
        localStorage.removeItem(this.storageKey);
        console.log('🗑️ Cleared all notes for all parts');
    }
}

// Initialize notes manager when script loads
if (typeof window !== 'undefined') {
    window.cambridgeNotesManager = new CambridgeNotesManager();
}
