import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAnalytics, deleteLink, shortUrlFor } from '../api.js';

function bucketByDay(visits) {
    const buckets = new Map();

    for (const visit of visits) {
        const date = new Date(visit.timestamp);
        const key = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        buckets.set(key, (buckets.get(key) || 0) + 1);
    }

    // keep chronological order and cap to the last 14 days of activity shown
    return Array.from(buckets.entries()).slice(-14);
}

export default function Stats() {
    const { shortId } = useParams();
    const navigate = useNavigate();

    const [lookupValue, setLookupValue] = useState(shortId || '');
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState(''); 
    const [confirmOpen, setConfirmOpen] = useState(false);

    useEffect(() => {
        if (!shortId) {
            setData(null);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError('');

        getAnalytics(shortId)
            .then((result) => {
                if (!cancelled) setData(result);
            })
            .catch((err) => {
                if (!cancelled) {
                    setError(err.message);
                    setData(null);
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [shortId]);

    function handleLookup(e) {
        e.preventDefault();
        const trimmed = lookupValue.trim();
        if (trimmed) navigate(`/stats/${trimmed}`);
    }

    async function confirmDelete() {
        setDeleting(true);
        setDeleteError('');
        try {
            await deleteLink(shortId);
            navigate('/my-links');
        } catch (err) {
            setDeleteError(err.message);
            setDeleting(false);
        }
    }

    const bars = data ? bucketByDay(data.analytics) : [];
    const maxCount = Math.max(1, ...bars.map(([, count]) => count));
    const recentVisits = data ? [...data.analytics].reverse().slice(0, 25) : [];

    return (
        <div className="stats-page">
            <div className="stats-header">
                <div>
                    <span className="eyebrow">Ticket activity</span>
                    {shortId && <h1>{shortId}</h1>}
                </div>
            </div>

            <form className="stats-lookup" onSubmit={handleLookup}>
                <input
                    type="text"
                    placeholder="Enter a ticket code, e.g. aZ3kLmN9"
                    value={lookupValue}
                    onChange={(e) => setLookupValue(e.target.value)}
                    aria-label="Short link code"
                />
                <button type="submit" className="btn">
                    Look up
                </button>
            </form>

            {loading && <p className="status-line">Fetching activity…</p>}
            {error && <p className="status-line error">{error}</p>}

            {data && (
                <>
                    <div className="big-number-card">
                        <button
                            type="button"
                            className="card-icon-btn"
                            onClick={() => {
                                setConfirmOpen((open) => !open);
                                setDeleteError('');
                            }}
                            aria-label="Delete this link"
                            aria-expanded={confirmOpen}
                        >
                            <TrashIcon />
                        </button>

                        {confirmOpen && (
                            <>
                                <div className="popover-backdrop" onClick={() => setConfirmOpen(false)} />
                                <div className="delete-popover" role="dialog" aria-label="Confirm delete">
                                    <div className='confirm-deletion'>
                                        <AlertIcon />
                                        <p>Confirm Deletion</p>
                                    </div>
                                    <p className="delete-popover-text">
                                        Deleting this link will <strong>permanently</strong> remove its {data.totalClicks} redemption{data.totalClicks !== 1 ? 's' : ''}.
                                    </p>
                                    <div className="delete-popover-actions">
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-cancel"
                                            onClick={() => setConfirmOpen(false)}
                                            disabled={deleting}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-danger"
                                            onClick={confirmDelete}
                                            disabled={deleting}
                                        >
                                            {deleting ? 'Deleting…' : 'Delete'}
                                        </button>
                                    </div>
                                    {deleteError && <div className="form-error">{deleteError}</div>}
                                </div>
                            </>
                        )}

                        <div className="big-number">
                            {data.totalClicks}
                        </div>
                        <div className="big-number-label">
                            Total redemptions
                        </div>
                        <div className="status-line" style={{ marginTop: 16 }}>
                            Redirects to {shortUrlFor(shortId)}
                        </div>
                    </div>

                    {bars.length > 0 && (
                        <div className="chart-card">
                            <div className="chart-title">Redemptions per day</div>
                            <div className="bars">
                                {bars.map(([date, count]) => (
                                    <div className="bar-col" key={date}>
                                        <div
                                            className="bar"
                                            style={{ height: `${(count / maxCount) * 100}%` }}
                                            title={`${count} on ${date}`}
                                        />
                                        <span className="bar-date">{date}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="visit-log">
                        <div className="visit-log-title">
                            Recent redemptions {data.analytics.length > 25 && '(latest 25)'}
                        </div>
                        {recentVisits.length === 0 ? (
                            <div className="empty-state">No redemptions yet. Share the link to see activity here.</div>
                        ) : (
                            recentVisits.map((visit, i) => (
                                <div className="visit-row" key={visit.timestamp + '-' + i}>
                                    <span className="visit-index">#{data.analytics.length - i}</span>
                                    <span>{new Date(visit.timestamp).toLocaleString()}</span>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

function TrashIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash2-icon lucide-trash-2">
            <path d="M10 11v6"/>
            <path d="M14 11v6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
            <path d="M3 6h18"/>
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
    )
}

function AlertIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C82C28" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-alert-icon lucide-circle-alert">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" x2="12" y1="8" y2="12"/>
            <line x1="12" x2="12.01" y1="16" y2="16"/>
        </svg>
    )
}