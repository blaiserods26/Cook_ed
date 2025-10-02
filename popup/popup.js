// Popup functionality for cookie management
document.addEventListener('DOMContentLoaded', async () => {
    const sitesTable = document.getElementById('sites');
    const searchInput = document.getElementById('search');
    const retentionInput = document.getElementById('retention');
    const cleanNowBtn = document.getElementById('cleanNow');
    const openOptionsBtn = document.getElementById('openOptions');
    const optionsLink = document.getElementById('optionsLink');
    
    let sitesData = {};
    let settings = {};
    
    // Load data
    await loadData();
    
    // Event listeners
    searchInput.addEventListener('input', filterSites);
    retentionInput.addEventListener('change', updateRetention);
    cleanNowBtn.addEventListener('click', performCleanup);
    openOptionsBtn.addEventListener('click', openOptions);
    optionsLink.addEventListener('click', openOptions);

    // Load sites and settings data
    async function loadData() {
        try {
            const [sitesResponse, settingsResponse] = await Promise.all([
                sendMessage({ type: 'cg:getSites' }),
                sendMessage({ type: 'cg:getSettings' })
            ]);
            
            sitesData = sitesResponse.sites || {};
            settings = settingsResponse.settings || {};
            
            retentionInput.value = settings.retentionDays || 30;
            renderSites();
        } catch (error) {
            console.error('Failed to load data:', error);
            showError('Failed to load cookie data');
        }
    }
    
    // Render sites table
    function renderSites(sitesToShow = null) {
        const tbody = sitesTable.querySelector('tbody');
        tbody.innerHTML = '';
        
        const sites = sitesToShow || Object.entries(sitesData);
        
        if (sites.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#666;">No cookies found</td></tr>';
            return;
        }
        
        // Sort sites by cookie count (descending)
        sites.sort((a, b) => {
            const aCount = Array.isArray(a) ? a[1].cookieCount : a.cookieCount;
            const bCount = Array.isArray(b) ? b[1].cookieCount : b.cookieCount;
            return bCount - aCount;
        });
        
        sites.forEach(([domain, data]) => {
            const row = createSiteRow(domain, data);
            tbody.appendChild(row);
        });
    }
    
    // Create site row
    function createSiteRow(domain, data) {
        const row = document.createElement('tr');
        
        const lastUsed = Math.max(data.lastVisited || 0, data.lastConsent || 0);
        const isStale = lastUsed > 0 && (Date.now() - lastUsed) > (settings.retentionDays || 30) * 24 * 60 * 60 * 1000;
        const daysAgo = lastUsed ? Math.floor((Date.now() - lastUsed) / (1000 * 60 * 60 * 24)) : 'Never';
        
        row.innerHTML = `
            <td>
                <span class="domain" title="${domain}">${domain}</span>
                ${isStale ? '<span class="stale-indicator" title="May be stale">⚠</span>' : ''}
            </td>
            <td>
                <span class="cookie-count">${data.cookieCount || 0}</span>
            </td>
            <td>
                <span class="last-used" title="${formatDate(lastUsed)}">${daysAgo} day${daysAgo !== 'Never' && daysAgo !== 1 ? 's' : ''}</span>
            </td>
            <td>
                <input type="checkbox" class="whitelist-checkbox" ${settings.whitelist && settings.whitelist.includes(domain) ? 'checked' : ''} data-domain="${domain}">
            </td>
            <td>
                <button class="delete-btn" data-domain="${domain}" title="Delete all cookies for this site">🗑️</button>
            </td>
        `;
        
        // Add event listeners
        const whitelistCheckbox = row.querySelector('.whitelist-checkbox');
        const deleteBtn = row.querySelector('button');
        
        whitelistCheckbox.addEventListener('change', () => toggleWhitelist(domain));
        deleteBtn.addEventListener('click', () => deleteSite(domain));
        
        return row;
    }
    
    // Filter sites based on search
    function filterSites() {
        const query = searchInput.value.trim().toLowerCase();
        if (!query) {
            renderSites();
            return;
        }
        
        const filtered = Object.entries(sitesData).filter(([domain]) => 
            domain.toLowerCase().includes(query)
        );
        renderSites(filtered);
    }
    
    // Update retention days
    async function updateRetention() {
        const days = parseInt(retentionInput.value);
        if (days < 1) {
            retentionInput.value = 30;
            return;
        }
        
        const newSettings = { ...settings, retentionDays: days };
        await sendMessage({ type: 'cg:updateSettings', settings: newSettings });
        settings = newSettings;
        renderSites();
    }
    
    // Toggle whitelist status
    async function toggleWhitelist(domain) {
        const whitelist = settings.whitelist || [];
        const isWhitelisted = whitelist.includes(domain);
        
        const newWhitelist = isWhitelisted 
            ? whitelist.filter(d => d !== domain)
            : [...whitelist, domain];
        
        const newSettings = { ...settings, whitelist: newWhitelist };
        await sendMessage({ type: 'cg:updateSettings', settings: newSettings });
        settings = newSettings;
    }
    
    // Delete site cookies
    async function deleteSite(domain) {
        if (!confirm(`Delete all cookies for ${domain}? This cannot be undone.`)) {
            return;
        }
        
        try {
            const response = await sendMessage({ type: 'cg:deleteSite', baseDomain: domain });
            const deleted = response && typeof response.deleted === 'number' ? response.deleted : 0;
            if (deleted === 0) {
                showError(`No cookies were removed for ${domain}. Some cookies may be protected or not accessible.`);
            } else {
                showMessage(`Deleted ${deleted} cookies from ${domain}`);
            }
            // Use updated sites if provided, otherwise reload
            if (response && response.sites) {
                sitesData = response.sites;
                renderSites();
            } else {
                await refreshData();
            }
        } catch (error) {
            console.error('Failed to delete site:', error);
            showError('Failed to delete cookies');
        }
    }
    
    // Perform cleanup
    async function performCleanup() {
        cleanNowBtn.disabled = true;
        cleanNowBtn.textContent = 'Cleaning...';
        
        try {
            const response = await sendMessage({ type: 'cg:recount' });
            sitesData = response.sites || {};
            
            // Trigger auto cleanup
            await sendMessage({ type: 'cg:autoCleanup' });
            
            showMessage('Cleanup completed!');
            renderSites();
        } catch (error) {
            console.error('Cleanup failed:', error);
            showError('Cleanup failed');
        } finally {
            cleanNowBtn.disabled = false;
            cleanNowBtn.textContent = 'Clean Now';
        }
    }
    
    // Refresh data
    async function refreshData() {
        await loadData();
    }
    
    // Open options page
    function openOptions() {
        chrome.runtime.openOptionsPage();
    }
    
    // Show message
    function showMessage(message) {
        const messageEl = document.createElement('div');
        messageEl.className = 'message success';
        messageEl.textContent = message;
        document.body.appendChild(messageEl);
        
        setTimeout(() => {
            messageEl.remove();
        }, 3000);
    }
    
    // Show error
    function showError(message) {
        const errorEl = document.createElement('div');
        errorEl.className = 'message error';
        errorEl.textContent = message;
        document.body.appendChild(errorEl);
        
        setTimeout(() => {
            errorEl.remove();
        }, 5000);
    }
    
    // Send message to background script
    function sendMessage(message) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage(message, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Chrome runtime error:', chrome.runtime.lastError);
                }
                resolve(response || {});
            });
        });
    }
    
    // Format date for display
    function formatDate(timestamp) {
        if (!timestamp) return 'Never';
        return new Date(timestamp).toLocaleString();
    }
});
