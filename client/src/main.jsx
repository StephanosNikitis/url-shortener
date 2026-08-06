import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import Home from './pages/Home.jsx';
import Stats from './pages/Stats.jsx';
import Login from './pages/Login.jsx';
import MyLinks from './pages/MyLinks.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import NotFound from './pages/NotFound.jsx';

const router = createBrowserRouter([
    {
        path: '/',
        element: <App />,
        children: [
            {
                index: true,
                element: (
                    <ProtectedRoute>
                        <Home />
                    </ProtectedRoute>
                ),
            },
            { path: 'login', element: <Login /> },
            {
                path: 'my-links',
                element: (
                    <ProtectedRoute>
                        <MyLinks />
                    </ProtectedRoute>
                ),
            },
            {
              path: 'stats/:shortId', 
              element: (
                <ProtectedRoute>
                  <Stats />
                </ProtectedRoute> 
              ),
            },
            { path: '*', element: <NotFound /> },
        ],
    },
]);

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <RouterProvider router={router} />
    </StrictMode>,
);
