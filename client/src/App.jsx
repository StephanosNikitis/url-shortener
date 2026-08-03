import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Stats from './pages/Stats.jsx';
import Login from './pages/Login.jsx';
import MyLinks from './pages/MyLinks.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AvatarMenu from './components/AvatarMenu.jsx';
import { AuthProvider } from './context/AuthProvider.jsx';
import { useAuth } from './hooks/useAuth.js';
import ticketIcon from '../assets/ticket-icon.png';

function Topbar() {
    const { user } = useAuth();

    return (
        <header className="topbar">
            <Link to="/" className="brand">
                <img src={ticketIcon} alt="" height={30} width={30} className="brand-mark" aria-hidden="true" />
                Ticketify
            </Link>

            {user ? (
                <div className="topbar-right">
                    <Link to="/my-links" className="nav-link">
                        My links
                    </Link>
                    <AvatarMenu />
                </div>
            ) : (
                <span className="eyebrow">Link shortener</span>
            )}
        </header>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <div className="app-shell">
                <Topbar />

                <main>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route
                            path="/"
                            element={
                                <ProtectedRoute>
                                    <Home />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/my-links"
                            element={
                                <ProtectedRoute>
                                    <MyLinks />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/stats"
                            element={
                                <ProtectedRoute>
                                    <Stats />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/stats/:shortId"
                            element={
                                <ProtectedRoute>
                                    <Stats />
                                </ProtectedRoute>
                            }
                        />
                    </Routes>
                </main>

                <footer className="footer">
                    <a target="_blank" rel="noopener noreferrer" href="https://icons8.com/icon/81972/ticket">Ticket</a> icon by <a target="_blank" rel="noopener noreferrer" href="https://icons8.com">Icons8</a>
                </footer>
            </div>
        </AuthProvider>
    );
}
