import { useSearchParams, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export default function Login() {
    const { login, user, loading } = useAuth();
    const [searchParams] = useSearchParams();
    const authFailed = searchParams.get('error') === 'auth_failed';

    if (loading) {
        return <p className="status-line">Checking session...</p>;
    }

    if (user) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="hero">
            <span className="eyebrow">Sign in required</span>
            <h1>Log in to create and track ticket links.</h1>
            <p>
                Ticket links and their activity are only visible to signed-in
                users. Sign in with Google to continue.
            </p>

            <button type="button" className="btn" onClick={login}>
                Continue with Google
            </button>

            {authFailed && (
                <p className="status-line error" style={{ marginTop: 16 }}>
                    Sign-in didn't complete — please try again.
                </p>
            )}
        </div>
    );
}