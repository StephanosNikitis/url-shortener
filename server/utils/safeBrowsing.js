const logger = require('../config/logger');

const SAFE_BROWSING_URL = 'https://safebrowsing.googleapis.com/v4/threatMatches:find';
const CHECK_TIMEOUT_MS = 3000;

async function checkUrlSafety(targetUrl) {
    const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
    if (!apiKey) {
        return { flagged: false, checked: false };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

    try {
        const response = await fetch(`${SAFE_BROWSING_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
                client: { clientId: 'ticketify-url-shortener', clientVersion: '1.0.0' },
                threatInfo: {
                    threatTypes: [
                        'MALWARE',
                        'SOCIAL_ENGINEERING',
                        'UNWANTED_SOFTWARE',
                        'POTENTIALLY_HARMFUL_APPLICATION',
                    ],
                    platformTypes: ['ANY_PLATFORM'],
                    threatEntryTypes: ['URL'],
                    threatEntries: [{ url: targetUrl }],
                },
            }),
        });

        if (!response.ok) {
            logger.error({ status: response.status }, 'Safe Browsing API returned a non-OK status');
            return { flagged: false, checked: false };
        }

        const data = await response.json();
        const matches = data.matches || []; // Google returns {} (no `matches` key at all) when a URL is clean

        return {
            flagged: matches.length > 0,
            checked: true,
            threatTypes: matches.map((m) => m.threatType),
        };
    } catch (err) {
        // Covers both a genuine network/API error AND our own timeout abort (AbortError) — either way, fail open rather than block link creation on a third-party dependency being slow or unreachable.
        logger.error({ err, targetUrl }, 'Safe Browsing check failed — allowing URL through (fail-open)');
        return { flagged: false, checked: false };
    } finally {
        clearTimeout(timeoutId);
    }
}

module.exports = { checkUrlSafety };