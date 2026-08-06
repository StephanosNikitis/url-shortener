import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAnalytics, deleteLink, renameLink, setLinkActive, shortUrlFor } from '../api.js';
import BreakdownList from '../components/BreakdownList.jsx';

function formatDayLabel(isoDate) {
    return new Date(isoDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function buildSummary(result) {
    return {
        totalClicks: result.totalClicks,
        dailyBuckets: result.dailyBuckets,
        isActive: result.isActive,
        topReferrers: result.topReferrers,
        deviceBreakdown: result.deviceBreakdown,
        browserBreakdown: result.browserBreakdown,
        breakdownWindowDays: result.breakdownWindowDays,
    };
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

    const [editingId, setEditingId] = useState(false);
    const [newShortIdValue, setNewShortIdValue] = useState('');
    const [renaming, setRenaming] = useState(false);
    const [renameError, setRenameError] = useState('');

    const [togglingActive, setTogglingActive] = useState(false);
    const [toggleError, setToggleError] = useState('');

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
                setSummary(buildSummary(result));
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

    useEffect(() => {
        if (!shortId) return;

        let cancelled = false;
        let intervalId;

        async function poll() {
            try {
                if (cancelled) return;
                const result = await getAnalytics(shortId);
                setSummary(buildSummary(result));
                setVisits((prev) => {
                    const newestKnown = prev[0]?.timestamp;
                    const freshOnes = newestKnown ? result.visits.filter((v) => v.timestamp > newestKnown) : result.visits;
                    return freshOnes.length > 0 ? [...freshOnes, ...prev] : prev;
                });
            } catch {
                // a background refresh failing silently is fine
            }
        } 

        const handleVisibilityChange = () => {
            if (document.hidden) {
                clearInterval(intervalId);
            } else {
                poll();
                intervalId = setInterval(poll, 30000);
            }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange);
        handleVisibilityChange(); // run on mount to start polling if visible

        return () => {
            cancelled = true;
            clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
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

    function startEditingId() {
        setNewShortIdValue(shortId);
        setRenameError('');
        setEditingId(true);
    }

    function cancelEditingId() {
        setEditingId(false);
        setRenameError('');
    }

    async function submitRename(e) {
        e.preventDefault();
        const trimmed = newShortIdValue.trim();

        if (!trimmed || trimmed === shortId) {
            setEditingId(false);
            return;
        }

        setRenaming(true);
        setRenameError('');
        try {
            const { id } = await renameLink(shortId, trimmed);
            setEditingId(false);
            navigate(`/stats/${id}`, { replace: true });
        } catch (err) {
            setRenameError(err.message);
        } finally {
            setRenaming(false);
        }
    }

    async function toggleActive() {
        setTogglingActive(true);
        setToggleError('');
        try {
            const result = await setLinkActive(shortId, !summary.isActive);
            setSummary((prev) => ({ ...prev, isActive: result.isActive }));
        } catch (err) {
            setToggleError(err.message);
        } finally {
            setTogglingActive(false);
        }
    }

    const bars = summary?.dailyBuckets || [];
    const maxCount = Math.max(1, ...bars.map((b) => b.count));
    const windowLabel = `last ${summary?.breakdownWindowDays ?? 14} days`;

    return (
        <div className="stats-page">
            <div className="stats-header">
                <div>
                    <span className="eyebrow">Ticket activity</span>

                    {shortId && !editingId && (
                        <h1 className="shortid-display">
                            {shortId}
                            <button
                                type="button"
                                className="icon-btn-inline"
                                onClick={startEditingId}
                                aria-label="Edit short link"
                            >
                                <PencilIcon />
                            </button>
                        </h1>
                    )}

                    {shortId && editingId && (
                        <form className="shortid-edit-form" onSubmit={submitRename}>
                            <input
                                type="text"
                                value={newShortIdValue}
                                onChange={(e) => setNewShortIdValue(e.target.value)}
                                aria-label="Custom short link"
                                autoFocus
                                disabled={renaming}
                                minLength={3}
                                maxLength={20}
                            />
                            <button type="submit" className="btn" disabled={renaming}>
                                {renaming ? 'Saving…' : 'Save'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={cancelEditingId}
                                disabled={renaming}
                            >
                                Cancel
                            </button>
                        </form>
                    )}
                    {editingId && renameError && <div className="form-error">{renameError}</div>}
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

                        <div className="active-toggle-row">
                            <span className={summary.isActive ? 'status-badge active' : 'status-badge inactive'}>
                                {summary.isActive ? 'Active' : 'Deactivated' }
                            </span>
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={toggleActive}
                                disabled={togglingActive}
                            >
                                {togglingActive
                                    ? 'Saving…'
                                    : summary.isActive
                                      ? 'Deactivate Link'
                                      : 'Reactivate Link'}
                            </button>
                        </div>
                        {toggleError && <div className="form-error" style={{ marginTop: 10 }}>{toggleError}</div>}

                        {!summary.isActive && (
                            <p className="deactivated-banner">
                                This link is deactivated. Anyone who visits it gets a 403 instead of
                                being redirected. Reactivate it any time to restore access.
                            </p>
                        )}
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

                    {summary.topReferrers?.length > 0 && (
                        <div className="chart-card">
                            <div className="chart-title">Where redemptions came from ({windowLabel})</div>
                            <BreakdownList items={summary.topReferrers} />
                        </div>
                    )}

                    {(summary.deviceBreakdown?.length > 0 || summary.browserBreakdown?.length > 0) && (
                        <div className="chart-card">
                            <div className="chart-title">Devices &amp; browsers ({windowLabel})</div>
                            <div className="breakdown-columns">
                                <div className="breakdown-column">
                                    <BreakdownList items={summary.deviceBreakdown || []} />
                                </div>
                                <div className="breakdown-column">
                                    <BreakdownList items={summary.browserBreakdown || []} />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="visit-log">
                        <div className="visit-log-title">
                            Recent redemptions
                            <span className="live-dot" title="Updates automatically" aria-hidden="true" />
                        </div>
                        {visits.length === 0 ? (
                            <div className="empty-state">No redemptions yet. Share the link to see activity here.</div>
                        ) : (
                            <>
                                {visits.map((visit, i) => (
                                    <div
                                        className="visit-row"
                                        key={visit.timestamp + '-' + i}
                                        style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                            <span className="visit-index">#{visits.length - i}</span>
                                            <span>{new Date(visit.timestamp).toLocaleString()}</span>
                                        </div>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                                            {visit.referrerHost} · {visit.deviceBucket} · {visit.browserBucket}
                                        </span>
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
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="#C82C28" 
            stroke-width="2" 
            stroke-linecap="round" 
            stroke-linejoin="round" 
            class="lucide lucide-circle-alert-icon lucide-circle-alert"
        >
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" x2="12" y1="8" y2="12"/>
            <line x1="12" x2="12.01" y1="16" y2="16"/>
        </svg>
    )
}

function PencilIcon() {
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="28" 
            height="28" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="2" 
            stroke-linecap="round" 
            stroke-linejoin="round" 
            class="lucide lucide-square-pen-icon lucide-square-pen"
        >
            <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/>
        </svg>
    );
}