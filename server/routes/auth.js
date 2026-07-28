const express = require('express');
const router = express.Router();

router.get('/me', (req, res) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
        return res.json({
            authenticated: true,
            user: {
                id: req.user.id,
                name: req.user.name,
                email: req.user.email,
                avatar: req.user.avatar,
            },
        });
    }
    return res.json({ authenticated: false, user: null });
});

router.post('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        req.session.destroy(() => {
            res.clearCookie('connect.sid');
            res.json({ success: true });
        });
    });
});

module.exports = router;