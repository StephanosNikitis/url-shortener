const { nanoid } = require('nanoid');
const URL = require('../models/url');
const { shortenSchema } = require('../validators/url');
const { isSafeUrl } = require('../utils/validateUrl');

async function handleGenerateShortUrl(req, res) {
    const parseResult = shortenSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0].message });
    }
    const { originalUrl } = parseResult.data;
    const ownerId = req.user.id; // set by ensureAuthenticated + passport session 

    if (!(await isSafeUrl(originalUrl))) {
        return res.status(400).json({ error: 'Invalid or disallowed URL' });
    }

    const existing = await URL.findOne({ redirectUrl: originalUrl, ownerId });
    if (existing) return res.json({ id: existing.shortId });

    const shortId = nanoid(8);

    try {
        await URL.create({
            shortId: shortId,
            redirectUrl: originalUrl,
            ownerId,
            visitHistory: [],
        });
    
        return res.json({ id: shortId });
    } catch (err) {
        if (err.code === 11000) {
            // extremely unlikely nanoid collision - retry once with a fresh id
            const retryId = nanoid(8);
            await URL.create({
                shortId: retryId,
                redirectUrl: originalUrl,
                ownerId,
                visitHistory: [],
            });
            return res.json({ id: retryId });
        }
        throw err;
    }
}

async function handleGetAnalytics(req, res) {
    const shortId = req.params.shortId;
    
    const result = await URL.findOne({ shortId });
    if (!result) return res.status(404).json({ error: 'Short URL not found' });

    if (result.ownerId.toString() !== req.user.id) {
        return res.status(403).json({ error: 'You do not have access to this link' });
    }

    return res.json({ 
        totalClicks: result.visitHistory.length, 
        analytics: result.visitHistory,
    }); 
}

async function handleRedirect(req, res) {
    const { shortId } = req.params;

    const url = await URL.findOneAndUpdate(
        { shortId },
        { $push: { visitHistory: { timestamp: Date.now() } } },
        { new: true }
    );

    if (!url) return res.status(404).json({ error: 'Short URL not found' });

    return res.redirect(url.redirectUrl);
}

async function handleListMyLinks(req, res) {
    const links = await URL.find({ ownerId: req.user.id })
        .sort({ createdAt: -1 })
        .select('shortId redirectUrl createdAt visitHistory');

    return res.json({
        links: links.map((link) => ({
            shortId: link.shortId,
            redirectUrl: link.redirectUrl,
            createdAt: link.createdAt,
            totalClicks: link.visitHistory.length,
        })),
    });
}

module.exports = {
    handleGenerateShortUrl,
    handleGetAnalytics,
    handleRedirect,
    handleListMyLinks,
};