// Domain utility functions for browser extension
// Compatible with importScripts() - no ES6 exports

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

