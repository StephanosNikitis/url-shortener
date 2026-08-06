export function bucketReferrer(referrerHeader) {
    if (!referrerHeader) return 'Direct';

    try {
        const hostname = new URL(referrerHeader).hostname.toLowerCase();
        return hostname.startsWith('www.') ? hostname.slice(4) : hostname;
    } catch {
        return 'Direct';
    }
}