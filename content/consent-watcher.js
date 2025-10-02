// Cookie consent watcher content script
(function() {
    'use strict';
    
    // Include domain utility function directly in content script
    function baseDomainFromHost(hostname) {
        // Strip leading dot and port
        const host = hostname.replace(/^\./, '').split(':')[0];
        const parts = host.split('.');
        if (parts.length <= 2) return host;
        
        // Heuristic: keep last two labels; handle common 3-part TLDs
        const common3 = new Set([
            'co.uk', 'org.uk', 'gov.uk', 'ac.uk', 
            'com.au', 'net.au', 'co.nz', 'com.br'
        ]);
        const last2 = parts.slice(-2).join('.');
        const last3 = parts.slice(-3).join('.');
        return common3.has(last3) ? last3 : last2;
    }
    
    // Keywords that indicate consent acceptance
    const ACTION_WORDS = ['accept', 'agree', 'allow all', 'consent', 'thanks', 'okay', 'proceed', 'continue', 'yes'];
    
    // Check if element looks like an accept button
    function looksLikeAccept(element) {
        if (!element || !element.textContent) return false;
        
        const text = element.textContent.trim().toLowerCase();
        
        // Check for accept keywords
        const hasAcceptWords = ACTION_WORDS.some(word => text.includes(word));
        
        // Check for common reject/deny keywords to avoid false positives
        const rejectWords = ['reject', 'deny', 'decline', 'no thanks', 'decline all'];
        const hasRejectWords = rejectWords.some(word => text.includes(word));
        
        // Additional checks for button types, classes, etc.
        const hasAcceptClass = element.classList.value.toLowerCase().includes('accept') || 
                              element.classList.value.toLowerCase().includes('consent');
        
        const isButton = element.tagName === 'BUTTON' || 
                        element.getAttribute('role') === 'button' ||
                        element.onclick !== null;
        
        return hasAcceptWords && !hasRejectWords && (hasAcceptClass || isButton);
    }
    
    // Send consent message to background script
    function send(action) {
        try {
            const base = baseDomainFromHost(location.hostname);
            chrome.runtime.sendMessage({
                type: 'cg:consent',
                baseDomain: base,
                action: action,
                url: location.href,
                timestamp: Date.now()
            });
        } catch (e) {
            console.warn('Failed to send consent message:', e);
        }
    }
    
    // Handle click events
    document.addEventListener('click', (event) => {
        const path = event.composedPath ? event.composedPath() : [event.target];
        
        for (const node of path) {
            if (node instanceof HTMLElement && looksLikeAccept(node)) {
                send('accept');
                break;
            }
        }
    }, true);
    
    // Watch for dynamically added consent banners
    const mutationObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node instanceof HTMLElement) {
                    // Check the node itself
                    if (looksLikeAccept(node)) {
                        node.addEventListener('click', () => send('accept'), { once: true, capture: true });
                    }
                    
                    // Check child buttons
                    const buttons = node.querySelectorAll('button, a[role="button"], [onclick]');
                    for (const button of buttons) {
                        if (looksLikeAccept(button)) {
                            button.addEventListener('click', () => send('accept'), { once: true, capture: true });
                        }
                    }
                }
            }
        }
    });
    
    // Start observing
    mutationObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
    
    // Also check for existing consent banners on page load
    setTimeout(() => {
        const existingButtons = document.querySelectorAll('button, a[role="button"], [onclick]');
        for (const button of existingButtons) {
            if (looksLikeAccept(button)) {
                button.addEventListener('click', () => send('accept'), { once: true, capture: true });
            }
        }
    }, 1000);
    
})();