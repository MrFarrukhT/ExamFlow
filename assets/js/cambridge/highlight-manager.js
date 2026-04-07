/**
 * Cambridge Highlight Management System
 * Saves and restores highlights when navigating between parts
 */
class CambridgeHighlightManager {
    constructor() {
        this.storageKey = 'cambridge_highlights';
        this.currentPart = this.getCurrentPart();
        this.init();
    }
    
    init() {
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
        // Restore highlights first
        this.restoreHighlights();
        
        // Listen for highlight creation (Hypothesis annotations)
        this.setupHighlightListeners();
        
        // Save before navigating away
        window.addEventListener('beforeunload', () => {
            this.saveHighlights();
        });
        
        // Save periodically
        setInterval(() => {
            this.saveHighlights();
        }, 5000);
        
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
    
    saveHighlights() {
        const highlights = [];
        
        // Find all hypothesis highlights - use multiple selectors
        const hypothesisSelectors = [
            '.hypothesis-highlight',
            'hypothesis-highlight', 
            '.annotator-hl',
            'mark[class*="hypothesis"]',
            '[data-annotation-id]',
            '.annotator-hl-temporary'
        ];
        
        hypothesisSelectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    // Get the actual text node and parent context
                    const range = this.getElementRange(el);
                    const highlightData = {
                        text: el.textContent.trim(),
                        xpath: this.getXPath(el),
                        parentXPath: el.parentElement ? this.getXPath(el.parentElement) : '',
                        className: el.className,
                        color: window.getComputedStyle(el).backgroundColor,
                        startOffset: range.startOffset,
                        endOffset: range.endOffset,
                        selector: selector,
                        timestamp: Date.now()
                    };
                    
                    // Avoid duplicates
                    if (!highlights.find(h => h.xpath === highlightData.xpath && h.text === highlightData.text)) {
                        highlights.push(highlightData);
                    }
                });
            } catch (e) {
                // Could not find elements with selector
            }
        });
        
        // Find manual highlights (mark tags)
        const markHighlights = document.querySelectorAll('mark, .highlighted');
        
        markHighlights.forEach(el => {
            const highlightData = {
                text: el.textContent.trim(),
                xpath: this.getXPath(el),
                parentXPath: el.parentElement ? this.getXPath(el.parentElement) : '',
                className: el.className,
                color: window.getComputedStyle(el).backgroundColor,
                tag: el.tagName.toLowerCase(),
                timestamp: Date.now()
            };
            
            // Avoid duplicates
            if (!highlights.find(h => h.xpath === highlightData.xpath && h.text === highlightData.text)) {
                highlights.push(highlightData);
            }
        });
        
        // Save to localStorage
        const allHighlights = this.getAllHighlights();
        allHighlights[this.currentPart] = highlights;
        localStorage.setItem(this.storageKey, JSON.stringify(allHighlights));
        
    }
    
    getElementRange(element) {
        try {
            const range = document.createRange();
            range.selectNodeContents(element);
            return {
                startOffset: range.startOffset,
                endOffset: range.endOffset
            };
        } catch (e) {
            return { startOffset: 0, endOffset: 0 };
        }
    }
    
    restoreHighlights() {
        const allHighlights = this.getAllHighlights();
        const highlights = allHighlights[this.currentPart] || [];
        
        if (highlights.length === 0) {
            return;
        }
        
        let restoredCount = 0;
        
        highlights.forEach((highlight, index) => {
            try {
                let element = this.getElementByXPath(highlight.xpath);
                
                // Try parent XPath if direct XPath fails
                if (!element && highlight.parentXPath) {
                    const parent = this.getElementByXPath(highlight.parentXPath);
                    if (parent) {
                        // Find text within parent
                        const walker = document.createTreeWalker(
                            parent,
                            NodeFilter.SHOW_TEXT,
                            null,
                            false
                        );
                        
                        let node;
                        while (node = walker.nextNode()) {
                            if (node.textContent.includes(highlight.text)) {
                                element = node.parentElement;
                                break;
                            }
                        }
                    }
                }
                
                if (element) {
                    // Check if text matches (allow partial match)
                    const elementText = element.textContent.trim();
                    const highlightText = highlight.text.trim();
                    
                    if (elementText === highlightText || elementText.includes(highlightText)) {
                        // Apply highlight styling
                        element.style.backgroundColor = highlight.color || '#ffff00';
                        
                        if (highlight.className) {
                            // Preserve existing classes and add highlight classes
                            const existingClasses = element.className.split(' ').filter(c => !c.includes('highlight'));
                            const highlightClasses = highlight.className.split(' ').filter(c => c.includes('highlight') || c.includes('annotator'));
                            element.className = [...existingClasses, ...highlightClasses].join(' ');
                        } else {
                            element.classList.add('highlighted');
                        }
                        
                        restoredCount++;
                    } else {
                        // Text mismatch for highlight
                    }
                }
            } catch (e) {
                // Error restoring highlight
            }
        });
        
    }
    
    setupHighlightListeners() {
        // Listen for text selection and highlighting
        document.addEventListener('mouseup', () => {
            setTimeout(() => {
                this.saveHighlights();
            }, 300);
        });
        
        // Listen for any DOM mutations (highlights being added)
        const observer = new MutationObserver((mutations) => {
            let shouldSave = false;
            
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if it's a highlight element
                        if (node.classList && (
                            node.classList.contains('hypothesis-highlight') ||
                            node.classList.contains('annotator-hl') ||
                            node.tagName === 'HYPOTHESIS-HIGHLIGHT' ||
                            node.tagName === 'MARK'
                        )) {
                            shouldSave = true;
                        }
                    }
                });
            });
            
            if (shouldSave) {
                setTimeout(() => this.saveHighlights(), 500);
            }
        });
        
        // Observe the entire document body for changes
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style']
        });
        
        // Listen for Hypothesis annotation events
        document.addEventListener('hypothesis:annotationCreated', () => {
            setTimeout(() => this.saveHighlights(), 500);
        });
        
        document.addEventListener('hypothesis:annotationUpdated', () => {
            setTimeout(() => this.saveHighlights(), 500);
        });
        
        // Listen for manual highlight button clicks
        document.addEventListener('click', (e) => {
            const target = e.target.closest('.annotator-adder-actions__button, #highlight-adder-button, button[aria-label*="highlight" i]');
            if (target) {
                setTimeout(() => this.saveHighlights(), 500);
            }
        });
        
    }
    
    getAllHighlights() {
        try {
            return JSON.parse(localStorage.getItem(this.storageKey) || '{}');
        } catch (e) {
            console.error('Error loading highlights:', e);
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
            return null;
        }
    }
    
    clearHighlights() {
        const allHighlights = this.getAllHighlights();
        delete allHighlights[this.currentPart];
        localStorage.setItem(this.storageKey, JSON.stringify(allHighlights));
        
        // Remove highlight styling from page
        document.querySelectorAll('.highlighted, .hypothesis-highlight, .annotator-hl, mark').forEach(el => {
            el.style.backgroundColor = '';
            el.classList.remove('highlighted');
        });
        
    }

    clearAllHighlights() {
        localStorage.removeItem(this.storageKey);
    }
}

// Initialize highlight manager when script loads
if (typeof window !== 'undefined') {
    window.cambridgeHighlightManager = new CambridgeHighlightManager();
}
