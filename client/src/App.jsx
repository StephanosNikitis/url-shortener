import { useEffect } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider.jsx';
import Topbar from './components/Topbar.jsx';

export default function App() {
    const location = useLocation();
    const isHomePage = location.pathname === '/';
    
    useEffect(() => {
        if (isHomePage) {
            document.body.classList.add('home');
        } else {
            document.body.classList.remove('home');
        }

        return () => {
            document.body.classList.remove('home');
        };
    }, [isHomePage]);
    return (
        <AuthProvider>
            <div className="app-shell">
                <Topbar />

                <main>{<Outlet />}</main>

                <footer className="footer">
                    <a target="_blank" rel="noopener noreferrer" href="https://icons8.com/icon/81972/ticket">Ticket</a> icon by <a target="_blank" rel="noopener noreferrer" href="https://icons8.com">Icons8</a>
                </footer>
            </div>
        </AuthProvider>
    );
}
