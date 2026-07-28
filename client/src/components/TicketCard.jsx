import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function TicketCard({ shortId, shortUrl, originalUrl }) {
    const [copied, setCopied] = useState(false);

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(shortUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // clipboard API can fail on non-HTTPS/http contexts - fall back silently,
            // the URL is still selectable/visible on the ticket itself
        }
    }

    return (
        <div className="ticket-wrap">
            <div className="ticket">
                <div className="ticket-main">
                    <div className="ticket-label">Redeem at</div>
                    <div className="ticket-short-url">{shortUrl}</div>
                    <div className="ticket-original">{originalUrl}</div>

                    <div className="ticket-actions">
                        <button type="button" className="btn" onClick={handleCopy}>
                            {copied ? 'Copied' : 'Copy link'}
                        </button>
                        <Link to={`/stats/${shortId}`} className="btn btn-ghost">
                            View activity
                        </Link>
                    </div>
                </div>

                <div className="ticket-stub" aria-hidden="true">
                    <span className="ticket-stub-code">{shortId}</span>
                </div>
            </div>
        </div>
    );
}
