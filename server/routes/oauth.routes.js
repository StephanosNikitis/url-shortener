import express from 'express';
import passport from 'passport';

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL;

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
    '/google/callback',
    passport.authenticate('google', {
        failureRedirect: `${FRONTEND_URL}/login?error=auth_failed`,
        session: true,
    }),
    (req, res) => {
        // successful login — session cookie is already set by this point
        res.redirect(FRONTEND_URL);
    }
);

export default router;