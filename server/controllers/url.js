const { nanoid } = require('nanoid');
const URL = require('../models/url');
const Visit = require('../models/visit');
const { shortenSchema, renameSchema } = require('../validators/url');
const { isSafeUrl } = require('../utils/validateUrl');
const urlCache = require('../utils/urlCache');
const logger = require('../config/logger');
const { success } = require('zod');

const MAX_ANALYTICS_LIMIT = 100;
const DEFAULT_ANALYTICS_LIMIT = 25;
const DAILY_BUCKET_WINDOW_DAYS = 14;

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
            });
            return res.json({ id: retryId });
        }
        throw err;
    }
}

async function handleGetAnalytics(req, res) {
    const { shortId } = req.params;

    // clamp limit so a client can't request an unbounded page size
    const limit = Math.min(
        Math.max(parseInt(req.query.limit, 10) || DEFAULT_ANALYTICS_LIMIT, 1),
        MAX_ANALYTICS_LIMIT
    );

    const before = req.query.before ? new Date(req.query.before) : null;
    if (before && Number.isNaN(before.getTime())) {
        return res.status(400).json({ error: 'Invalid "before" cursor' });
    }

    const result = await URL.findOne({ shortId }).select('ownerId clickCount');
    if (!result) {
        return res.status(404).json({ error: 'Short URL not found' });
    }

    if (result.ownerId.toString() !== req.user.id) {
        return res.status(403).json({ error: 'You do not have access to this link' });
    }

    const visitQuery = { shortId };
    if (before) {
        visitQuery.timestamp = { $lt: before };
    }

    const page = await Visit.find(visitQuery)
        .sort({ timestamp: -1 })
        .limit(limit + 1) // fetch one extra to detect whether there's a next page
        .select('timestamp -_id');

    const hasMore = page.length > limit;
    const visits = page.slice(0, limit).map((v) => ({ timestamp: v.timestamp.getTime() }));
    const nextCursor = hasMore ? page[limit - 1].timestamp.toISOString() : null;

    const windowStart = new Date(Date.now() - DAILY_BUCKET_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const dailyBucketsRaw = await Visit.aggregate([
        { $match: { shortId, timestamp: { $gte: windowStart } } },
        {
            $group: {
                _id: { $dateTrunc: { date: '$timestamp', unit: 'day' } },
                count: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]);
    const dailyBuckets = dailyBucketsRaw.map((b) => ({
        date: b._id.toISOString(),
        count: b.count,
    }));

    return res.json({
        totalClicks: result.clickCount || 0,
        dailyBuckets,
        visits,
        nextCursor,
    });
}

function logVisitAsync(shortId) {
    Promise.all([
        Visit.create({ shortId, timestamp: new Date() }),
        URL.updateOne({ shortId }, { $inc: { clickCount: 1 } }),
    ]).catch((err) => {
        logger.error({ err, shortId }, 'Failed to log visit');
    })
}

async function handleRedirect(req, res) {
    const { shortId } = req.params;

    const cacheUrl = urlCache.get(shortId);
    if (cacheUrl) {
        res.redirect(cacheUrl);
        logVisitAsync(shortId);
        return;
    }

    const url = await URL.findOne({ shortId }).select('redirectUrl');

    if (!url) return res.status(404).json({ error: 'Short URL not found' });

    urlCache.set(shortId, url.redirectUrl);
    res.redirect(url.redirectUrl);
    logVisitAsync(shortId);
}

async function handleListMyLinks(req, res) {
    const links = await URL.find({ ownerId: req.user.id })
        .sort({ createdAt: -1 })
        .select('shortId redirectUrl createdAt clickCount');

    return res.json({
        links: links.map((link) => ({
            shortId: link.shortId,
            redirectUrl: link.redirectUrl,
            createdAt: link.createdAt,
            totalClicks: link.clickCount || 0,
        })),
    });
}

async function handleDeleteUrl(req, res) {
    const { shortId } = req.params;

    const deletedDoc = await URL.findOneAndDelete({ shortId, ownerId: req.user.id });

    if (!deletedDoc) {
        return res.status(404).json({ error: 'Short URL not found' });
    }

    urlCache.delete(shortId);

    try {
        await Visit.deleteMany({ shortId });
    } catch (err) {
        logger.error({ err, shortId }, 'Failed to clean up visit records after URL deletion');
    }

    return res.json({ success: true });
}

async function handleRenameShortUrl(req, res) {
    const { shortId: currentShortId } = req.params;

    const parseResult = renameSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const { shortId: newShortId } = parseResult.data;

    if (newShortId === currentShortId) {
        return res.status(400).json({ error: 'The new short link must be different from the current one' });
    }

    const url = await URL.findOne({ shortId: currentShortId, ownerId: req.user.id });
    if (!url) {
        return res.status(404).json({ error: 'Short URL not found' });
    }
    const conflict = await URL.findOne({ shortId: newShortId });
    if (conflict) {
        return res.status(409).json({ error: 'The short link is already taken' });
    }

    url.shortId = newShortId;
    try {
        await url.save();
    } catch (err) {
        if (err.code === 11000) {
            // TOCTOU race: someone else grabbed newShortId between our check above and this save. The unique index is the real guarantee, the findOne above is just a fast, friendly pre-check.
            return res.status(409).json({ error: 'That short link is already taken' });
        }
        throw err;
    }

    try {
        await Visit.updateMany({ shortId: currentShortId }, { $set: { shortId: newShortId } });
    } catch (err) {
        logger.error(
            { err, currentShortId, newShortId },
            'Renamed URL but failed to migrate its visit history - old visits are now orphaned'
        );
    }

    urlCache.delete(currentShortId);
    urlCache.set(newShortId, url.redirectUrl);

    return res.json({ id: newShortId });
}

module.exports = {
    handleGenerateShortUrl,
    handleGetAnalytics,
    handleRedirect,
    handleListMyLinks,
    handleDeleteUrl,
    handleRenameShortUrl,
};