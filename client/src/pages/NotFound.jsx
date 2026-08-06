import { Link } from 'react-router-dom';

export default function NotFound() {
    return (
        <div className="hero">
            <span className="eyebrow">404</span>
            <h1>Page Not Found</h1>
            <p>
                The page you're looking for isn't here - it may have been moved, deleted, or the link was never right to begin with.
            </p>

            <Link to="/" className="btn">
                Back to home
            </Link>
        </div>
    );
}