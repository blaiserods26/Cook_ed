// Cookie management service worker

// Domain utility functions (copied from lib/domains.js for compatibility)
function baseDomainFromHost(hostname) {
    // Strip leading dot and port
    const host = hostname.replace(/^\./, '').split(':')[0];
    const parts = host.split('.');
    if (parts.length <= 2) return host;
    // Heuristic: keep last two labels; handle common 3-part TLDs
    const common3 = new Set(['co.uk','org.uk','gov.uk','ac.uk','com.au','net.au','co.nz','com.br']);
    const last2 = parts.slice(-2).join('.');
    const last3 = parts.slice(-3).join('.');
    return common3.has(last3) ? last3 : last2;
}

function siteKeyFromUrl(url) {
    try {
        const u = new URL(url);
        return baseDomainFromHost(u.hostname);
    } catch (e) {
        return null;
    }
}

// Storage keys
const STORAGE_KEYS = {
    sites: 'cg_sites',
    settings: 'cg_settings',
    lastCleanup: 'cg_lastCleanup'
};

// Default settings
const DEFAULT_SETTINGS = {
    retentionDays: 30,
    whiteliсst: [],
    autoCleanup: true,
    lastCleanup: 0
};

// Utility functions
function now() {
    return Date.now();
}

function days(n) {
    return n * 24 * 60 * 60 * 1000;
}

// Storage functions
async function getSettings() {
    const result = await chrome.storage.local.get(STORAGE_KEYS.settings);
    return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEYS.settings] };
}

async function setSettings(settings) {
    const current = await getSettings();
    const updated = { ...current, ...settings };
    await chrome.storage.local.set({ [STORAGE_KEYS.settings]: updated });
    return updated;
}

async function getSites() {
    const result = await chrome.storage.local.get(STORAGE_KEYS.sites);
    return result[STORAGE_KEYS.sites] || {};
}

async function setSites(sites) {
    await chrome.storage.local.set({ [STORAGE_KEYS.sites]: sites });
}

async function updateSite(baseDomain, updates = {}) {
    const sites = await getSites();
    const current = sites[baseDomain] || { cookieCount: 0, lastVisited: 0, lastConsent: 0 };
    sites[baseDomain] = { ...current, ...updates };
    await setSites(sites);
    return sites[baseDomain];
}

// Cookie counting
async function recountCookies() {
    const cookies = await chrome.cookies.getAll({});
    const sites = {};
    
    for (const cookie of cookies) {
        const base = baseDomainFromHost(cookie.domain);
        if (!sites[base]) {
            sites[base] = { cookieCount: 0, lastVisited: 0, lastConsent: 0 };
        }
        sites[base].cookieCount++;
        
        // Update last access time if cookie is recent
        if (cookie.lastAccessed && cookie.lastAccessed > sites[base].lastVisited) {
            sites[base].lastVisited = cookie.lastAccessed;
        }
    }
    
    await setSites(sites);
    return sites;
}

// Delete cookies for a specific base domain (robust removal)
async function deleteCookiesForBase(baseDomain) {
    const cookies = await chrome.cookies.getAll({});
    let removedCount = 0;

    for (const cookie of cookies) {
        const base = baseDomainFromHost(cookie.domain);
        if (base !== baseDomain) continue;

        const host = cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain;
        const path = cookie.path || '/';

        // Try secure-first if cookie.secure, otherwise try http first; always try both schemes
        const candidateUrls = cookie.secure ? [`https://${host}${path}`, `http://${host}${path}`]
                                            : [`http://${host}${path}`, `https://${host}${path}`];

        let deleted = false;
        for (const url of candidateUrls) {
            try {
                const details = await chrome.cookies.remove({
                    url,
                    name: cookie.name,
                    storeId: cookie.storeId,
                    ...(cookie.partitionKey ? { partitionKey: cookie.partitionKey } : {})
                });
                if (details) {
                    deleted = true;
                    break;
                }
            } catch (e) {
                // ignore and try next candidate
            }
        }
        if (deleted) removedCount++;
    }

    return removedCount;
}

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'cg:consent') {
        handleConsent(message.baseDomain, message.action);
    }
    
    if (message.type === 'cg:getSites') {
        getSites().then(sites => sendResponse({ sites }));
    }
    
    if (message.type === 'cg:recount') {
        recountCookies().then(sites => sendResponse({ sites }));
    }
    
    if (message.type === 'cg:deleteSite') {
        (async () => {
            const count = await deleteCookiesForBase(message.baseDomain);
            const sites = await recountCookies();
            sendResponse({ deleted: count, sites });
        })();
    }
    
    if (message.type === 'cg:getSettings') {
        getSettings().then(settings => sendResponse({ settings }));
    }
    
    if (message.type === 'cg:updateSettings') {
        setSettings(message.settings).then(settings => sendResponse({ settings }));
    }
    
    if (message.type === 'cg:autoCleanup') {
        autoCleanup().then(() => sendResponse({ success: true }));
    }
    
    return true; // Keep channel open for async
});

async function handleConsent(baseDomain, action) {
    await updateSite(baseDomain, { 
        lastConsent: now(),
        [action]: now()
    });
}

// Auto-cleanup functionality
async function autoCleanup() {
    const settings = await getSettings();
    if (!settings.autoCleanup) return;
    
    const sites = await getSites();
    const threshold = now() - days(settings.retentionDays || 30);
    const toDelete = [];
    
    for (const [base, meta] of Object.entries(sites)) {
        const isWhitelisted = settings.whitelist && settings.whitelist.includes(base);
        const lastUsed = Math.max(meta.lastVisited || 0, meta.lastConsent || 0);
        
        if (!isWhitelisted && lastUsed > 0 && lastUsed < threshold) {
            toDelete.push(base);
        }
    }
    
    if (toDelete.length > 0) {
        console.log(`Auto-cleaning ${toDelete.length} sites:`, toDelete);
        for (const base of toDelete) {
            await deleteCookiesForBase(base);
        }
        await recountCookies();
    }
    
    await setSettings({ lastCleanup: now() });
}

// Alarm scheduling
async function scheduleDailyCleanup() {
    await chrome.alarms.clear('cg:daily');
    await chrome.alarms.create('cg:daily', { periodInMinutes: 60 * 24 }); // Daily
}

// Event listeners
chrome.runtime.onInstalled.addListener(async () => {
    await setSettings(DEFAULT_SETTINGS);
    await recountCookies();
    await scheduleDailyCleanup();
});

chrome.runtime.onStartup.addListener(async () => {
    await scheduleDailyCleanup();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'cg:daily') {
        await autoCleanup();
    }
});

// Periodically recount cookies when extension is active
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        const baseDomain = baseDomainFromHost(new URL(tab.url).hostname);
        await updateSite(baseDomain, { lastVisited: now() });
    }
});