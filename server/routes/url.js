const express = require('express');
const { 
    handleGenerateShortUrl, 
    handleGetAnalytics, 
    handleRedirect, 
    handleListMyLinks, 
    handleRenameShortUrl,
    handleDeleteUrl 
} = require('../controllers/url');
const { shortenLimiter, redirectLimiter } = require('../middleware/rateLimiter');
const ensureAuthenticated = require('../middleware/ensureAuthenticated'); 
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.post('/', ensureAuthenticated, shortenLimiter, asyncHandler(handleGenerateShortUrl));

router.get('/analytics/:shortId', ensureAuthenticated, asyncHandler(handleGetAnalytics));

router.get('/links', ensureAuthenticated, asyncHandler(handleListMyLinks));

router.patch('/:shortId', ensureAuthenticated, shortenLimiter, asyncHandler(handleRenameShortUrl));

router.get('/:shortId', redirectLimiter, asyncHandler(handleRedirect));

router.delete('/:shortId', ensureAuthenticated, asyncHandler(handleDeleteUrl));

module.exports = router;