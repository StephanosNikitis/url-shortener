const express = require('express');
const { handleGenerateShortUrl, handleGetAnalytics, handleRedirect, handleListMyLinks } = require('../controllers/url');
const { shortenLimiter, redirectLimiter } = require('../middleware/rateLimiter');
const ensureAuthenticated = require('../middleware/ensureAuthenticated'); 
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.post('/', ensureAuthenticated, shortenLimiter, asyncHandler(handleGenerateShortUrl));

router.get('/analytics/:shortId', ensureAuthenticated, asyncHandler(handleGetAnalytics));

router.get('/links', ensureAuthenticated, asyncHandler(handleListMyLinks));

router.get('/:shortId', redirectLimiter, asyncHandler(handleRedirect));

module.exports = router;