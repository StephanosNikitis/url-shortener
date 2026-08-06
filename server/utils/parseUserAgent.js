import { UAParser } from "ua-parser-js";

const KNOWN_BROWSERS = new Map([
    ['Chrome', 'Chrome'],
    ['Chrome Headless', 'Chrome'],
    ['Chromium', 'Chrome'],
    ['Mobile Chrome', 'Chrome'],
    ['Safari', 'Safari'],
    ['Mobile Safari', 'Safari'],
    ['Firefox', 'Firefox'],
    ['Mobile Firefox', 'Firefox'],
    ['Edge', 'Edge'],
    ['Samsung Internet', 'Samsung Internet'],
]);

export function bucketUserAgent(userAgentString) {
    const { device, browser } = new UAParser(userAgentString || '').getResult();

    if (!browser.name) {
        return { deviceBucket: 'Bot/Other', browserBucket: 'Bot/Other' };
    }

    const deviceBucket = device.type === 'mobile' ? 'Mobile' : device.type === 'tablet' ? 'Tablet' : 'Desktop';
    const browserBucket = KNOWN_BROWSERS.get(browser.name) || 'Other';

    return { deviceBucket, browserBucket };
}