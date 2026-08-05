import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyLinks, shortUrlFor } from '../api.js';

const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'clicks-desc', label: 'Most clicks' },
    { value: 'clicks-asc', label: 'Fewest clicks' },
];

export default function MyLinks() {
    const [links, setLinks] = useState(null);
    const [error, setError] = useState('');

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const [sortBy, setSortBy] = useState('newest');

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

    const visibleLinks = useMemo(() => {
        if (!links) return null;

        const query = search.trim().toLowerCase();

        const filtered = links.filter((link) => {
            if (statusFilter === 'active' && !link.isActive) return false;
            if (statusFilter === 'inactive' && link.isActive) return false;

            if (query) {
                const matchesShortId = link.shortId.toLowerCase().includes(query);
                const matchesUrl = link.redirectUrl.toLowerCase().includes(query);
                if (!matchesShortId && !matchesUrl) return false;
            }

            return true;
        });

        return filtered.sort((a, b) => {
            switch (sortBy) {
                case 'oldest': 
                    return new Date(a.createdAt) - new Date(b.createdAt);
                case 'clicks-desc':
                    return b.totalClicks - a.totalClicks || new Date(b.createdAt) - new Date(a.createdAt);
                case 'clicks-asc':
                    return a.totalClicks - b.totalClicks || new Date(b.createdAt) - new Date(a.createdAt);
                case 'newest':
                default:
                    return new Date(b.createdAt) - new Date(a.createdAt);
            }
        });
    }, [links, search, statusFilter, sortBy]);

    function clearFilters() {
        setSearch('');
        setStatusFilter('all');
    }

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
                <>
                    <div className="links-toolbar">
                        <div className="search-input-wrapper">
                            <SearchIcon />
                            <input
                                type="text"
                                placeholder="Search by URL or code…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                aria-label="Search links"
                            />
                            {search && (
                                <button
                                    type="button"
                                    className="clear-search-btn"
                                    onClick={() => setSearch('')}
                                    aria-label="Clear search"
                                >
                                    <XIcon />
                                </button>
                            )}
                        </div>

                        <div className="toolbar-controls">
                            <div className="filter-segment" role="group" aria-label="Filter by status">
                                {['all', 'active', 'inactive'].map((option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        className={statusFilter === option ? 'active' : ''}
                                        onClick={() => setStatusFilter(option)}
                                    >
                                        {option === 'all' ? 'All' : option === 'active' ? 'Active' : 'Inactive'}
                                    </button>
                                ))}
                            </div>

                            <select
                                className="sort-select"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                aria-label="Sort links"
                            >
                                {SORT_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="visit-log">
                        <div className="visit-log-title">
                            {visibleLinks.length === links.length
                                ? `${links.length} link${links.length !== 1 ? 's' : ''}`
                                : `${visibleLinks.length} of ${links.length} links`}
                        </div>

                        {visibleLinks.length === 0 && (
                            <div className="empty-state">
                                No links match your search.{' '}
                                <button type="button" className="inline-link-btn" onClick={clearFilters}>
                                    Clear filters
                                </button>
                            </div>
                        )}

                        {visibleLinks.map((link) => (
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
                </>
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

function SearchIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search-icon lucide-search"><path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/></svg>
    )
}

function XIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-icon lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
    )
}