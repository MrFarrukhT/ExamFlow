// Context Menu Manager — highlights, notes, and clearing
// Extracted from core.js for reusability across test types

class ContextMenuManager {
    constructor({ menuElement, panels }) {
        this.menuElement = menuElement;
        this.panels = (panels || []).filter(p => p != null);
        this.selectedRange = null;

        if (this.menuElement && this.panels.length > 0) {
            this._initialize();
        }

        // Expose global functions (used by inline onclick handlers in HTML)
        window.highlightText = () => this.highlightText();
        window.addNote = () => this.addNote();
        window.clearHighlight = () => this.clearHighlight();
        window.clearAllHighlights = () => this.clearAllHighlights();
    }

    _initialize() {
        // Track text selection changes within panels
        document.addEventListener('selectionchange', () => {
            const selection = window.getSelection();
            if (selection && !selection.isCollapsed && selection.toString().trim().length > 0) {
                const range = selection.getRangeAt(0);
                if (this.panels.some(panel => panel.contains(range.commonAncestorContainer))) {
                    this.selectedRange = range;
                }
            }
        });

        const showContextMenu = (e) => {
            const target = e.target;
            const isClickOnHighlight = target.closest('.highlight, .comment-highlight');
            const isSelectionActive = this.selectedRange && this.selectedRange.toString().trim().length > 0;

            let showMenu = false;

            if (isClickOnHighlight) {
                document.getElementById('menu-highlight').style.display = 'none';
                document.getElementById('menu-note').style.display = 'none';
                document.getElementById('menu-clear').style.display = 'block';
                document.getElementById('menu-clear-all').style.display = 'block';
                this.menuElement.targetElementForClear = isClickOnHighlight;
                showMenu = true;
            } else if (isSelectionActive && this.panels.some(panel => panel.contains(this.selectedRange.commonAncestorContainer))) {
                document.getElementById('menu-highlight').style.display = 'flex';
                document.getElementById('menu-note').style.display = 'flex';
                document.getElementById('menu-clear').style.display = 'none';
                document.getElementById('menu-clear-all').style.display = 'block';
                showMenu = true;
            } else {
                // No highlight menu — check if right-click should be blocked
                if (window.distractionFreeMode && window.distractionFreeMode.isEnabled) {
                    const currentSkill = window.distractionFreeMode.getCurrentSkill();
                    if (currentSkill !== 'reading' && currentSkill !== 'listening') {
                        e.preventDefault();
                        window.distractionFreeMode.showActionBlockedMessage('Right-click menu is disabled during the test');
                        return false;
                    }
                }
                return true;
            }

            if (showMenu) {
                e.preventDefault();
                const menuHeight = this.menuElement.offsetHeight;
                const menuWidth = this.menuElement.offsetWidth;
                let left = e.pageX;
                let top = e.pageY;
                if (left + menuWidth > window.innerWidth) left = window.innerWidth - menuWidth - 5;
                top = e.pageY - menuHeight - 5;

                this.menuElement.style.display = 'block';
                this.menuElement.style.left = `${left}px`;
                this.menuElement.style.top = `${top}px`;
            }
        };

        this.panels.forEach(panel => {
            panel.addEventListener('contextmenu', showContextMenu);
        });

        document.addEventListener('click', (e) => {
            if (this.menuElement.style.display === 'block' && !this.menuElement.contains(e.target)) {
                this.close();
            }
        });
    }

    close() {
        this.menuElement.style.display = 'none';
        this.selectedRange = null;
    }

    _unwrapElement(element) {
        const parent = element.parentNode;
        if (!parent) return;
        while (element.firstChild) {
            parent.insertBefore(element.firstChild, element);
        }
        parent.removeChild(element);
        parent.normalize();
    }

    _getLastTextNode(element) {
        let lastText = null;
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    if (node.textContent.trim().length > 0) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_SKIP;
                }
            }
        );
        while (walker.nextNode()) {
            lastText = walker.currentNode;
        }
        return lastText;
    }

    highlightText() {
        if (this.selectedRange && !this.selectedRange.collapsed) {
            try {
                const startContainer = this.selectedRange.startContainer;
                const endContainer = this.selectedRange.endContainer;
                const startParagraph = startContainer.nodeType === Node.TEXT_NODE
                    ? startContainer.parentElement.closest('p')
                    : startContainer.closest('p');
                const endParagraph = endContainer.nodeType === Node.TEXT_NODE
                    ? endContainer.parentElement.closest('p')
                    : endContainer.closest('p');

                // Restrict multi-paragraph selections to first paragraph
                if (startParagraph && endParagraph && startParagraph !== endParagraph) {
                    const restrictedRange = document.createRange();
                    restrictedRange.setStart(this.selectedRange.startContainer, this.selectedRange.startOffset);
                    const lastTextNode = this._getLastTextNode(startParagraph);
                    if (lastTextNode) {
                        restrictedRange.setEnd(lastTextNode, lastTextNode.length);
                    } else {
                        restrictedRange.setEndAfter(startParagraph.lastChild || startParagraph);
                    }
                    this.selectedRange = restrictedRange;
                }

                const span = document.createElement('span');
                span.className = 'highlight';

                if (this.selectedRange.commonAncestorContainer.nodeType === Node.TEXT_NODE ||
                    this.selectedRange.toString().indexOf('\n') === -1) {
                    this.selectedRange.surroundContents(span);
                } else {
                    const contents = this.selectedRange.extractContents();
                    span.appendChild(contents);
                    this.selectedRange.insertNode(span);
                }
            } catch (e) {
                const span = document.createElement('span');
                span.className = 'highlight';
                const contents = this.selectedRange.extractContents();
                span.appendChild(contents);
                this.selectedRange.insertNode(span);
            }
        }
        this.close();
        window.getSelection().removeAllRanges();
    }

    addNote() {
        const note = prompt('Enter your note:');
        if (note && this.selectedRange && !this.selectedRange.collapsed) {
            try {
                const span = document.createElement('span');
                span.className = 'comment-highlight';
                const tooltip = document.createElement('span');
                tooltip.className = 'comment-tooltip';
                tooltip.textContent = note;

                if (this.selectedRange.commonAncestorContainer.nodeType === Node.TEXT_NODE ||
                    this.selectedRange.toString().indexOf('\n') === -1) {
                    this.selectedRange.surroundContents(span);
                    span.appendChild(tooltip);
                } else {
                    const contents = this.selectedRange.extractContents();
                    span.appendChild(contents);
                    span.appendChild(tooltip);
                    this.selectedRange.insertNode(span);
                }
            } catch (e) {
                const span = document.createElement('span');
                span.className = 'comment-highlight';
                const tooltip = document.createElement('span');
                tooltip.className = 'comment-tooltip';
                tooltip.textContent = note;
                const contents = this.selectedRange.extractContents();
                span.appendChild(contents);
                span.appendChild(tooltip);
                this.selectedRange.insertNode(span);
            }
        }
        this.close();
        window.getSelection().removeAllRanges();
    }

    clearHighlight() {
        const elementToClear = this.menuElement.targetElementForClear;
        if (elementToClear) {
            this._unwrapElement(elementToClear);
        }
        this.close();
        window.getSelection().removeAllRanges();
    }

    clearAllHighlights() {
        document.querySelectorAll('.highlight, .comment-highlight').forEach(el => this._unwrapElement(el));
        this.close();
        window.getSelection().removeAllRanges();
    }
}

window.ContextMenuManager = ContextMenuManager;
