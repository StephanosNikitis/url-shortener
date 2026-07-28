const validUrl = require('valid-url');
const { URL } = require('url');
const dns = require('dns').promises;
const net = require('net');

const BLOCKED_HOSTNAMES = ['localhost', '0.0.0.0'];

function isPrivateIp(ip) {
    if (net.isIP(ip) === 0) return false;
    // covers 10.x, 172.16-31.x, 192.168.x, 127.x (loopback), 169.254.x (link-local/cloud metadata)

    if (net.isIPv4(ip)) {
        return (
            /^10\./.test(ip) ||
            /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
            /^192\.168\./.test(ip) ||
            /^127\./.test(ip) ||
            /^169\.254\./.test(ip)
        );
    }

    // IPv6 loopback and unique local addresses
    return ip === '::1' || /^f[cd][0-9a-f]{2}:/i.test(ip);
}

async function isSafeUrl(rawUrl) {
    if (!validUrl.isWebUri(rawUrl)) return false; // requires http(s) scheme specifically
    let parsed;
    try {
        parsed = new URL(rawUrl);
    } catch (error) {
        return false;
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    if (BLOCKED_HOSTNAMES.includes(parsed.hostname)) return false;
    if (isPrivateIp(parsed.hostname)) return false;

    // resolve the hostname and check the actual IP too —
    // stops DNS-rebinding tricks like "attacker-controlled-domain.com" resolving to 127.0.0.1
    try {
        const addresses = await dns.resolve4(parsed.hostname).catch(() => []);
        const addresses6 = await dns.resolve6(parsed.hostname).catch(() => []);
        const all = [...addresses, ...addresses6];
        if (all.length === 0) return false;
        if (all.some(isPrivateIp)) return false;
    } catch {
        // DNS resolution failure - treat as invalid
        return false;
    }

    return true;
}

module.exports = { isSafeUrl };