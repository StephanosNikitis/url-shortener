import { useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';

export default function AvatarMenu() {
    const { user, logout } = useAuth();
    const [error, setError] = useState('');

    if (!user) return null;

    const initial = user.name?.trim()?.[0]?.toUpperCase() || '?';

    async function handleLogout() {
        setError('');
        try {
            await logout();
        } catch (err) {
            setError(err.message);
        }
    }

    return (
        // tabIndex + focus-within means the dropdown also reveals on keyboard focus, not just mouse hover - so it's usable without a mouse too.
        <div className="avatar-menu" tabIndex={0}>
            <div className="avatar-badge" aria-label={user.name}>
                {initial}
            </div>

            <div className="avatar-dropdown" role="menu">
                <button type="button" className="avatar-dropdown-item" onClick={handleLogout} role="menuitem">
                    <LogoutIcon />
                    Log out
                </button>
                {error && <div className="avatar-dropdown-error">{error}</div>}
            </div>
        </div>
    );
}

function LogoutIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path
                d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}