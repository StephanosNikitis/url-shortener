import { nanoid } from 'nanoid';
import URL from '../models/url.model.js';
import Visit from '../models/visit.model.js';
import { shortenSchema, renameSchema, activeStatusSchema } from '../validators/url.validator.js';
import isSafeUrl from '../utils/validateUrl.js';
import checkUrlSafety from '../utils/safeBrowsing.js';
import urlCache from '../utils/urlCache.js';
import { bucketUserAgent } from '../utils/parseUserAgent.js';
import { bucketReferrer } from '../utils/parseReferrer.js';
import logger from '../config/logger.js';

const MAX_ANALYTICS_LIMIT = 100;
const DEFAULT_ANALYTICS_LIMIT = 25;
const DAILY_BUCKET_WINDOW_DAYS = 14;
const MAX_TOP_REFERRERS = 6;

// Collapses a $group-by-count result down to the top N entries plus a single "Other" rollup for the remainder, so a link with dozens of distinct referrers doesn't produce a breakdown list nobody can actually read.
function topNWithOther(buckets, n) {
    const sorted = [...buckets].sort((a, b) => b.count - a.count);
    const top = sorted.slice(0, n);
    const rest = sorted.slice(n);
    const otherCount = rest.reduce((sum, b) => sum + b.count, 0);
    return otherCount > 0 ? [...top, { label: 'Other', count: otherCount }] : top;
}

function isPrefetchRequest(req) {
    const purpose = (req.headers['sec-purpose'] || req.headers['purpose'] || '').toLowerCase();
    return purpose.includes('prefetch') || purpose.includes('preview');
}

export async function handleGenerateShortUrl(req, res) {
    const parseResult = shortenSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0].message });
    }
    const { originalUrl } = parseResult.data;
    const ownerId = req.user.id; // set by ensureAuthenticated + passport session 

    if (!(await isSafeUrl(originalUrl))) {
        return res.status(400).json({ error: 'Invalid or disallowed URL' });
    }

    const safetyResult = await checkUrlSafety(originalUrl);
    if (safetyResult.flagged) {
        return res.status(400).json({
            error: 'This URL has been flagged as unsafe and cannot be shortened.',
        });
    }

    const existing = await URL.findOne({ redirectUrl: originalUrl, ownerId });
    if (existing) return res.json({ id: existing.shortId });

    const shortId = nanoid(8);

    try {
        await URL.create({
            shortId,
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

export async function handleGetAnalytics(req, res) {
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

    const result = await URL.findOne({ shortId }).select('ownerId clickCount isActive');
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
        .select('timestamp referrerHost deviceBucket browserBucket -_id');

    const hasMore = page.length > limit;
    const visits = page.slice(0, limit).map((v) => ({ 
        timestamp: v.timestamp.getTime(),
        referrerHost: v.referrerHost || 'Direct',
        deviceBucket: v.deviceBucket || 'Bot/Other',
        browserBucket: v.browserBucket || 'Bot/Other',
    }));
    const nextCursor = hasMore ? page[limit - 1].timestamp.toISOString() : null;

    const windowStart = new Date(Date.now() - DAILY_BUCKET_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const [facets] = await Visit.aggregate([
        { $match: { shortId, timestamp: { $gte: windowStart } } },
        {
            $facet: {
                dailyBuckets: [
                    { $group: { _id: { $dateTrunc: { date: '$timestamp', unit: 'day' } }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } },
                ],
                referrers: [
                    { $group: { _id: { $ifNull: ['$referrerHost', 'Direct'] }, count: { $sum: 1 } } },
                ],
                devices: [
                    { $group: { _id: { $ifNull: ['$deviceBucket', 'Bot/Other'] }, count: { $sum: 1 } } },
                ],
                browsers: [
                    { $group: { _id: { $ifNull: ['$browserBucket', 'Bot/Other'] }, count: { $sum: 1 } } },
                ],
            },
        },
    ]);

    const dailyBuckets = facets.dailyBuckets.map((b) => ({
        date: b._id.toISOString(),
        count: b.count,
    }));

    const asLabelCount = (rows) => rows.map((r) => ({ label: r._id, count: r.count }));
    const topReferrers = topNWithOther(asLabelCount(facets.referrers), MAX_TOP_REFERRERS);
    const deviceBreakdown = asLabelCount(facets.devices).sort((a, b) => b.count - a.count);
    const browserBreakdown = asLabelCount(facets.browsers).sort((a, b) => b.count - a.count);

    return res.json({
        totalClicks: result.clickCount || 0,
        isActive: result.isActive,
        dailyBuckets,
        topReferrers,
        deviceBreakdown,
        browserBreakdown,
        breakdownWindowDays: DAILY_BUCKET_WINDOW_DAYS,
        visits,
        nextCursor,
    });
}

function logVisitAsync(shortId, req) {
    const referrerHost = bucketReferrer(req.get('Referrer'));
    const { deviceBucket, browserBucket } = bucketUserAgent(req.headers['user-agent']);

    Promise.all([
        Visit.create({ shortId, timestamp: new Date(), referrerHost, deviceBucket, browserBucket }),
        URL.updateOne({ shortId }, { $inc: { clickCount: 1 } }),
    ]).catch((err) => {
        logger.error({ err, shortId }, 'Failed to log visit');
    });
}

export async function handleRedirect(req, res) {
    const { shortId } = req.params;

    const cached = urlCache.get(shortId);
    if (cached) {
        if (!cached.isActive) {
            return res.status(403).json({ error: 'This link has been deactivated by its owner.' });
        }
        res.redirect(cached.redirectUrl);
        if (!isPrefetchRequest(req)) {
            logVisitAsync(shortId, req);
        }
        return;
    }

    const url = await URL.findOne({ shortId }).select('redirectUrl isActive');

    if (!url) return res.status(404).json({ error: 'Short URL not found' });

    urlCache.set(shortId, { redirectUrl: url.redirectUrl, isActive: url.isActive });

    if (!url.isActive) {
        return res.status(403).json({ error: 'This link has been deactivated by its owner.' });
    }

    res.redirect(url.redirectUrl);
    if (!isPrefetchRequest(req)) {
        logVisitAsync(shortId, req);
    }
}

export async function handleListMyLinks(req, res) {
    const links = await URL.find({ ownerId: req.user.id })
        .sort({ createdAt: -1 })
        .select('shortId redirectUrl createdAt clickCount isActive');

    return res.json({
        links: links.map((link) => ({
            shortId: link.shortId,
            redirectUrl: link.redirectUrl,
            createdAt: link.createdAt,
            totalClicks: link.clickCount || 0,
            isActive: link.isActive,
        })),
    });
}

export async function handleDeleteUrl(req, res) {
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

export async function handleRenameShortUrl(req, res) {
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
    urlCache.set(newShortId, { redirectUrl: url.redirectUrl, isActive: url.isActive });

    return res.json({ id: newShortId });
}

export async function handleSetActiveStatus(req, res) {
    const { shortId } = req.params;

    const parseResult = activeStatusSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const { isActive } = parseResult.data;

    const url = await URL.findOneAndUpdate(
        { shortId, ownerId: req.user.id },
        { $set: { isActive } },
        { new: true }
    );

    if (!url) {
        return res.status(404).json({ error: 'Short URL not found' });
    }

    urlCache.set(shortId, { redirectUrl: url.redirectUrl, isActive: url.isActive });

    return res.json({ shortId: url.shortId, isActive: url.isActive });
}