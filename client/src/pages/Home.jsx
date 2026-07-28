import { useState } from 'react';
import { createShortUrl, shortUrlFor } from '../api.js';
import TicketCard from '../components/TicketCard.jsx';

export default function Home() {
    const [originalUrl, setOriginalUrl] = useState('');
    const [ticket, setTicket] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setTicket(null);

        const trimmed = originalUrl.trim();
        if (!trimmed) {
            setError('Paste a URL first.');
            return;
        }

        setLoading(true);
        try {
            const { id } = await createShortUrl(trimmed);
            setTicket({
                shortId: id,
                shortUrl: shortUrlFor(id),
                originalUrl: trimmed,
            });
            setOriginalUrl('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="hero">
            <span className="eyebrow">Paste. Shorten. Redeem.</span>
            <h1>Turn a long link into a claim ticket.</h1>
            <p>
                Drop in any URL and get back a short one that redirects to it -
                plus a running log of every time it's redeemed.
            </p>

            <form className="shorten-form" onSubmit={handleSubmit}>
                <input
                    type="url"
                    inputMode="url"
                    placeholder="https://example.com/a/very/long/path?with=params"
                    value={originalUrl}
                    onChange={(e) => setOriginalUrl(e.target.value)}
                    aria-label="URL to shorten"
                />
                <button type="submit" className="btn" disabled={loading}>
                    {loading ? 'Shortening…' : 'Shorten'}
                </button>
            </form>

            {error && <div className="form-error">{error}</div>}

            {ticket && (
                <TicketCard
                    shortId={ticket.shortId}
                    shortUrl={ticket.shortUrl}
                    originalUrl={ticket.originalUrl}
                />
            )}
        </div>
    );
}
