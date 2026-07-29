const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const DEFAULT_TIMEOUT_MS = 10000;

async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
        return await fetch(url, { credentials: 'include', ...options, signal: controller.signal });
    } catch (err) {
        if (err.name === 'AbortError') {
            throw new Error('Request timed out - the server took too long to respond.', { cause: err });
        }
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }
}  

async function parseResponse(res) {
    let body = null;
    try {
        body = await res.json();
    } catch {
        // no JSON body - fine for some error responses
    }
    if (!res.ok) {
        const message = body?.error || `Request failed (${res.status})`;
        throw new Error(message);
    }

    return body;
}

export async function createShortUrl(originalUrl) {
    try {
        const res = await fetchWithTimeout(`${API_BASE}/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ originalUrl }),
        });
        return parseResponse(res);
    } catch (err) {
        if (err instanceof TypeError) {
            throw new Error('Failed to create link. The server could not be reached.', { cause: err });
        }
        throw err;
    }
}

export async function getAnalytics(shortId) {
    const res = await fetchWithTimeout(`${API_BASE}/analytics/${encodeURIComponent(shortId)}`);
    return parseResponse(res);
}

export async function getMyLinks() {
    const res = await fetchWithTimeout(`${API_BASE}/links`);
    return parseResponse(res);
}

export async function deleteLink(shortId) {
    try {
        const res = await fetchWithTimeout(`${API_BASE}/${encodeURIComponent(shortId)}`, {
            method: 'DELETE',
        });
        return parseResponse(res);
    } catch (err) {
        // The generic "Failed to fetch" is a TypeError.
        // This will catch network errors, like the server being down.
        if (err instanceof TypeError) {
            throw new Error('Deletion failed. The server could not be reached.', {cause: err});
        }
        // Re-throw other errors (like timeouts or specific errors from the server)
        throw err;
    }
}

export function shortUrlFor(shortId) {
    return `${API_BASE}/${shortId}`;
}