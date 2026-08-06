import { Link } from 'react-router-dom';

export default function NotFound() {
    return (
        <div className="not-found">
            <img src='../../assets/404-not-found.webp' alt='page not found' />
            <h1>Sorry, this path is a dead end.</h1>
            <h1>We couldn't find the page you are looking for.</h1>
            <p>
                Perhaps the link is broken, or the page has been moved or deleted.
            </p>

            <div className='back-home-btn'>
                <Link to="/" className="btn">
                    Back to home
                </Link>
            </div>
        </div>
    );
}