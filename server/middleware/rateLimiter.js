import rateLimit from 'express-rate-limit';

const shortenLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 new short links per IP per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many URLs created from this IP, please try again later.' },
});


const redirectLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please slow down.' },
});

export { shortenLimiter, redirectLimiter };