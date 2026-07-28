import { useCallback, useEffect, useMemo, useState } from 'react';
import AuthContext from './AuthContext.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_BASE}/auth/me`, { credentials: 'include' })
            .then((res) => res.json())
            .then((data) => setUser(data.authenticated ? data.user : null))
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);

    const login = useCallback(() => {
        window.location.href = `${API_BASE}/auth/google`;
    }, []);

    const logout = useCallback(async () => {
        let res;
        try {
            res = await fetch(`${API_BASE}/auth/logout`, {
                method: 'POST',
                credentials: 'include',
            });
        } catch {
            throw new Error('Could not reach the server. Check your connection and try again.');
        }

        if(!res.ok) {
            throw new Error('Logout failed. Please try again.')
        }

        setUser(null);
    }, []);

    const value = useMemo(
        () => ({ user, loading, login, logout }),
        [user, loading, login, logout]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}