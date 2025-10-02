// Options page functionality
document.addEventListener('DOMContentLoaded', async () => {
    const elements = {
        retentionDays: document.getElementById('retentionDays'),
        autoCleanup: document.getElementById('autoCleanup'),
        showNotifications: document.getElementById('showNotifications'),
        whitelistInput: document.getElementById('whitelistInput'),
        addWhitelist: document.getElementById('addWhitelist'),
        whitelistList: document.getElementById('whitelistList'),
        totalCookies: document.getElementById('totalCookies'),
        totalSites: document.getElementById('totalSites'),
        lastCleanup: document.getElementById('lastCleanup'),
        refreshData: document.getElementById('refreshData'),
        cleanupNow: document.getElementById('cleanupNow'),
        exportData: document.getElementById('exportData')
    };
    
    let settings = {};
    let sitesData = {};
    
    // Initialize
    await loadSettings();
    await loadStats();
    setupEventListeners();
    
    // Load settings from storage
    async function loadSettings() {
        try {
            const response = await sendMessage({ type: 'cg:getSettings' });
            settings = response.settings || {};
            
            // Update UI with current settings
            elements.retentionDays.value = settings.retentionDays || 30;
            elements.autoCleanup.checked = settings.autoCleanup !== false;
            elements.showNotifications.checked = settings.showNotifications || false;
            
            updateWhitelistDisplay();
        } catch (error) {
            console.error('Failed to load settings:', error);
            showError('Failed to load settings');
        }
    }
    
    // Load statistics
    async function loadStats() {
        try {
            const response = await sendMessage({ type: 'cg:getSites' });
            sitesData = response.sites || {};
            
            const totalCookies = Object.values(sitesData).reduce((sum, site) => sum + (site.cookieCount || 0), 0);
            const totalSites = Object.keys(sitesData).length;
            const lastCleanupDate = settings.lastCleanup ? formatDate(settings.lastCleanup) : 'Never';
            
            elements.totalCookies.textContent = totalCookies.toLocaleString();
            elements.totalSites.textContent = totalSites.toLocaleString();
            elements.lastCleanup.textContent = lastCleanupDate;
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    }
    
    // Update whitelist display
    function updateWhitelistDisplay() {
        const whitelist = settings.whitelist || [];
        
        if (whitelist.length === 0) {
            elements.whitelistList.innerHTML = '<p class="empty-message">No sites whitelisted yet</p>';
            return;
        }
        
        elements.whitelistList.innerHTML = whitelist.map(domain => `
            <div class="whitelist-item">
                <span>${domain}</span>
                <button class="remove" data-domain="${domain}">×</button>
            </div>
        `).join('');
        
        // Add click handlers for remove buttons
        elements.whitelistList.querySelectorAll('.remove').forEach(btn => {
            btn.addEventListener('click', () => removeFromWhitelist(btn.dataset.domain));
        });
    }
    
    // Setup event listeners
    function setupEventListeners() {
        elements.retentionDays.addEventListener('change', saveSettings);
        elements.autoCleanup.addEventListener('change', saveSettings);
        elements.showNotifications.addEventListener('change', saveSettings);
        
        elements.addWhitelist.addEventListener('click', addToWhitelist);
        elements.whitelistInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addToWhitelist();
            }
        });
        
        elements.refreshData.addEventListener('click', refreshData);
        elements.cleanupNow.addEventListener('click', performCleanup);
        elements.exportData.addEventListener('click', exportData);
    }
    
    // Save settings
    async function saveSettings() {
        const retentionDays = parseInt(elements.retentionDays.value);
        
        if (retentionDays < 1) {
            elements.retentionDays.value = 30;
            return;
        }
        
        const newSettings = {
            ...settings,
            retentionDays: retentionDays,
            autoCleanup: elements.autoCleanup.checked,
            showNotifications: elements.showNotifications.checked
        };
        
        try {
            const response = await sendMessage({ type: 'cg:updateSettings', settings: newSettings });
            settings = response.settings || newSettings;
            showSuccess('Settings saved successfully!');
        } catch (error) {
            console.error('Failed to save settings:', error);
            showError('Failed to save settings');
        }
    }
    
    // Add to whitelist
    async function addToWhitelist() {
        const domain = elements.whitelistInput.value.trim().toLowerCase();
        
        if (!domain) {
            showError('Please enter a domain name');
            return;
        }
        
        // Basic domain validation
        if (!isValidDomain(domain)) {
            showError('Please enter a valid domain name');
            return;
        }
        
        const whitelist = settings.whitelist || [];
        
        if (whitelist.includes(domain)) {
            showError('Domain is already in the whitelist');
            return;
        }
        
        const newSettings = {
            ...settings,
            whitelist: [...whitelist, domain]
        };
        
        try {
            const response = await sendMessage({ type: 'cg:updateSettings', settings: newSettings });
            settings = response.settings || newSettings;
            
            elements.whitelistInput.value = '';
            updateWhitelistDisplay();
            showSuccess(`Added ${domain} to whitelist`);
        } catch (error) {
            console.error('Failed to add to whitelist:', error);
            showError('Failed to add domain to whitelist');
        }
    }
    
    // Remove from whitelist
    async function removeFromWhitelist(domain) {
        const whitelist = settings.whitelist || [];
        
        if (!whitelist.includes(domain)) {
            return;
        }
        
        const newSettings = {
            ...settings,
            whitelist: whitelist.filter(d => d !== domain)
        };
        
        try {
            const response = await sendMessage({ type: 'cg:updateSettings', settings: newSettings });
            settings = response.settings || newSettings;
            
            updateWhitelistDisplay();
            showSuccess(`Removed ${domain} from whitelist`);
        } catch (error) {
            console.error('Failed to remove from whitelist:', error);
            showError('Failed to remove domain from whitelist');
        }
    }
    
    // Refresh data
    async function refreshData() {
        const btn = elements.refreshData;
        const originalText = btn.textContent;
        
        btn.disabled = true;
        btn.textContent = 'Refreshing...';
        
        try {
            await Promise.all([
                loadSettings(),
                loadStats(),
                recountCookies()
            ]);
            
            showSuccess('Data refreshed successfully!');
        } catch (error) {
            console.error('Failed to refresh data:', error);
            showError('Failed to refresh data');
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }
    
    // Perform cleanup
    async function performCleanup() {
        const btn = elements.cleanupNow;
        const originalText = btn.textContent;
        
        btn.disabled = true;
        btn.textContent = 'Cleaning...';
        
        try {
            // First recount cookies
            const recountResponse = await sendMessage({ type: 'cg:recount' });
            sitesData = recountResponse.sites || {};
            
            // Update stats
            await loadStats();
            
            showSuccess('Cleanup completed successfully!');
        } catch (error) {
            console.error('Failed to perform cleanup:', error);
            showError('Failed to perform cleanup');
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }
    
    // Export data
    function exportData() {
        const exportData = {
            settings: settings,
            sites: sitesData,
            exportDate: new Date().toISOString(),
            version: '1.0.0'
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `cook_ed-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        showSuccess('Data exported successfully!');
    }
    
    // Utility functions
    function isValidDomain(domain) {
        // Basic domain validation regex
        const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
        return domainRegex.test(domain);
    }
    
    function formatDate(timestamp) {
        if (!timestamp) return 'Never';
        return new Date(timestamp).toLocaleString();
    }
    
    async function recountCookies() {
        const response = await sendMessage({ type: 'cg:recount' });
        return response.sites || {};
    }
    
    // Send message to background script
    function sendMessage(message) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage(message, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Chrome runtime error:', chrome.runtime.lastError);
                    resolve({});
                } else {
                    resolve(response || {});
                }
            });
        });
    }
    
    function showSuccess(message) {
        showNotification(message, 'success');
    }
    
    function showError(message) {
        showNotification(message, 'error');
    }
    
    function showNotification(message, type) {
        // Remove existing notifications
        const existing = document.querySelector('.notification');
        if (existing) {
            existing.remove();
        }
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}-message`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
});
