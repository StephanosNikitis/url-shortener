import express from 'express';
import {
    handleGenerateShortUrl,
    handleGetAnalytics,
    handleRedirect,
    handleListMyLinks,
    handleRenameShortUrl,
    handleSetActiveStatus,
    handleDeleteUrl,
} from '../controllers/url.controller.js';
import { shortenLimiter, redirectLimiter } from '../middleware/rateLimiter.js';
import ensureAuthenticated from '../middleware/ensureAuthenticated.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = express.Router();

router.post('/', ensureAuthenticated, shortenLimiter, asyncHandler(handleGenerateShortUrl));
router.get('/analytics/:shortId', ensureAuthenticated, asyncHandler(handleGetAnalytics));
router.get('/links', ensureAuthenticated, asyncHandler(handleListMyLinks));
router.patch('/:shortId', ensureAuthenticated, shortenLimiter, asyncHandler(handleRenameShortUrl));
router.patch('/:shortId/status', ensureAuthenticated, shortenLimiter, asyncHandler(handleSetActiveStatus));
router.get('/:shortId', redirectLimiter, asyncHandler(handleRedirect));
router.delete('/:shortId', ensureAuthenticated, asyncHandler(handleDeleteUrl));

export default router;