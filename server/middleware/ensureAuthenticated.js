// Passport attaches req.isAuthenticated() when session middleware is active.
// Any route wrapped with this returns 401 instead of running if there's no logged-in session.
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated && req.isAuthenticated()) {
        return next();
    }
    return res.status(401).json({ error: 'Authentication required' });
}

module.exports = ensureAuthenticated;