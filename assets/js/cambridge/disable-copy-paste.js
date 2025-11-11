// Disable copy and paste in writing textareas for Cambridge tests
(function() {
    'use strict';
    
    function disableCopyPaste() {
        // Find all textareas in the document
        const textareas = document.querySelectorAll('textarea');
        
        textareas.forEach(textarea => {
            // Disable copy
            textarea.addEventListener('copy', function(e) {
                e.preventDefault();
                console.log('Copy disabled in writing test');
            });
            
            // Disable paste
            textarea.addEventListener('paste', function(e) {
                e.preventDefault();
                console.log('Paste disabled in writing test');
            });
            
            // Disable cut
            textarea.addEventListener('cut', function(e) {
                e.preventDefault();
                console.log('Cut disabled in writing test');
            });
        });
        
        console.log('✅ Copy/paste protection enabled for', textareas.length, 'textarea(s)');
    }
    
    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', disableCopyPaste);
    } else {
        disableCopyPaste();
    }
    
    // Also check periodically in case textareas are dynamically added
    setInterval(function() {
        const textareas = document.querySelectorAll('textarea:not([data-copy-paste-disabled])');
        if (textareas.length > 0) {
            textareas.forEach(textarea => {
                textarea.addEventListener('copy', function(e) {
                    e.preventDefault();
                });
                textarea.addEventListener('paste', function(e) {
                    e.preventDefault();
                });
                textarea.addEventListener('cut', function(e) {
                    e.preventDefault();
                });
                textarea.setAttribute('data-copy-paste-disabled', 'true');
            });
            console.log('✅ Copy/paste protection added to', textareas.length, 'new textarea(s)');
        }
    }, 1000);
})();

