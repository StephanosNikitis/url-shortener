import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAnalytics, deleteLink, shortUrlFor } from '../api.js';

function formatDayLabel(isoDate) {
    return new Date(isoDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function Stats() {
    const { shortId } = useParams();
    const navigate = useNavigate();

    const [lookupValue, setLookupValue] = useState(shortId || '');

    const [summary, setSummary] = useState(null);
    const [visits, setVisits] = useState([]);
    const [nextCursor, setNextCursor] = useState(null);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState(''); 
    const [confirmOpen, setConfirmOpen] = useState(false);

    useEffect(() => {
        if (!shortId) {
            setSummary(null);
            setVisits([]);
            setNextCursor(null);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError('');

        getAnalytics(shortId)
            .then((result) => {
                if (cancelled) return;
                setSummary({ totalClicks: result.totalClicks, dailyBuckets: result.dailyBuckets });
                setVisits(result.visits);
                setNextCursor(result.nextCursor);
            })
            .catch((err) => {
                if (!cancelled) {
                    setError(err.message);
                    setSummary(null);
                    setVisits([]);
                    setNextCursor(null);
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

    async function handleLoadMore() {
        if (!nextCursor) return;
        setLoadingMore(true);
        try {
            const result = await getAnalytics(shortId, { before: nextCursor });
            setVisits((prev) => [...prev, ...result.visits]);
            setNextCursor(result.nextCursor);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingMore(false);
        }
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

    const bars = summary?.dailyBuckets || [];
    const maxCount = Math.max(1, ...bars.map((b) => b.count));

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

            {summary && (
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
                                        Deleting this link will <strong>permanently</strong> remove its {summary.totalClicks} redemption{summary.totalClicks !== 1 ? 's' : ''}.
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
                                            className="btn-danger"
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
                            {summary.totalClicks}
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
                            <div className="chart-title">Redemptions per day (last 14 days)</div>
                            <div className="bars">
                                {bars.map((b) => (
                                    <div className="bar-col" key={b.date}>
                                        <div
                                            className="bar"
                                            style={{ height: `${(b.count / maxCount) * 100}%` }}
                                            title={`${b.count} on ${formatDayLabel(b.date)}`}
                                        />
                                        <span className="bar-date">{formatDayLabel(b.date)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="visit-log">
                        <div className="visit-log-title">
                            Recent redemptions
                        </div>
                        {visits.length === 0 ? (
                            <div className="empty-state">No redemptions yet. Share the link to see activity here.</div>
                        ) : (
                            <>
                                {visits.map((visit, i) => (
                                    <div className="visit-row" key={visit.timestamp + '-' + i}>
                                        <span className="visit-index">#{visits.length - i}</span>
                                        <span>{new Date(visit.timestamp).toLocaleString()}</span>
                                    </div>
                                ))}
                                {nextCursor && (
                                    <button
                                        type="button"
                                        className="btn btn-ghost"
                                        onClick={handleLoadMore}
                                        disabled={loadingMore}
                                        style={{ width: '100%', borderRadius: 0, borderTop: '1px solid var(--line)' }}
                                    >
                                        {loadingMore ? 'Loading…' : 'Load more'}
                                    </button>
                                )}
                            </>
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