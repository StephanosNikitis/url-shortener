import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyLinks, shortUrlFor } from '../api.js';

export default function MyLinks() {
    const [links, setLinks] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;

        getMyLinks()
            .then((data) => {
                if (!cancelled) setLinks(data.links);
            })
            .catch((err) => {
                if (!cancelled) setError(err.message);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="stats-page">
            <div className="stats-header">
                <div>
                    <span className="eyebrow">Your tickets</span>
                    <h1>My links</h1>
                </div>
                <Link to="/" className="btn btn-ghost new-link-button">
                    <PlusIcon />
                    New link
                </Link>
            </div>

            {error && <p className="status-line error">{error}</p>}

            {links === null && !error && <p className="status-line">Loading your links…</p>}

            {links && links.length === 0 && (
                <div className="visit-log">
                    <div className="empty-state">
                        You haven't created any links yet.{' '}
                        <Link to="/">Shorten your first one</Link>.
                    </div>
                </div>
            )}

            {links && links.length > 0 && (
                <div className="visit-log">
                    <div className="visit-log-title">{links.length} link{links.length !== 1 && 's'}</div>
                    {links.map((link) => (
                        <Link
                            to={`/stats/${link.shortId}`}
                            key={link.shortId}
                            className="visit-row"
                            style={{
                                textDecoration: 'none',
                                color: 'inherit',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                gap: 4,
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ color: 'var(--stamp)' }}>{shortUrlFor(link.shortId)}</span>
                                    {!link.isActive && <span className='status-badge inactive'>Deactivated</span> }
                                </span>
                                <span className="visit-index">{link.totalClicks} click{link.totalClicks !== 1 && 's'}</span>
                            </div>
                            <span style={{ fontSize: '0.78rem', color: 'var(--muted)', wordBreak: 'break-all' }}>
                                {link.redirectUrl}
                            </span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

function PlusIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus-icon lucide-plus">
            <path d="M5 12h14"/><path d="M12 5v14"/>
        </svg>
    )
}