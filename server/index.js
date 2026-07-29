require('dotenv').config();
require('./config/validateEnv')();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require('mongoose');
const pinoHttp = require('pino-http');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');

const logger = require('./config/logger');
const { connectToMongoDB } = require('./connect');
const passport = require('./config/passport');
const urlRoute = require('./routes/url');
const authRoutes = require('./routes/auth');
const oauthRoutes = require('./routes/oauth');
const errorHandler = require('./middleware/errorHandler');

const PORT = process.env.PORT || 5000;

async function main() {
    await connectToMongoDB(process.env.MONGO_URI);
    logger.info('MongoDB connected');

    const app = express();

    // Trust the first proxy hop (Render/Railway/Nginx/etc). Required for req.ip
    // (used by express-rate-limit) to reflect the real client IP instead of the
    // proxy's IP. Adjust the number if you sit behind more than one hop.
    app.set('trust proxy', 1);
    app.use(helmet({ hsts: process.env.NODE_ENV === 'production' }));
    app.use(pinoHttp({ logger }));

    // Redirect stray HTTP to HTTPS — defense in depth even if your host already terminates TLS for you.
    app.use((req, res, next) => {
        if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
            return res.redirect(`https://${req.headers.host}${req.url}`);
        }
        next();
    });

    app.use(express.json({ limit: '10kb' }));

    app.use(
        session({
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: false,
            store: MongoStore.create({ client: mongoose.connection.getClient() }),
            cookie: {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            },
        })
    );

    app.use(passport.initialize());
    app.use(passport.session());

    app.use('/auth', oauthRoutes);

    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
    app.use(
        cors({
            origin: (origin, callback) => {
                if (!origin || allowedOrigins.includes(origin)) {
                    return callback(null, true);
                }
                return callback(new Error('Not allowed by CORS'));
            },
            methods: ['GET', 'POST', 'DELETE'],
            credentials: true,
        })
    );

    app.get('/health', (req, res) => {
        const dbState = mongoose.connection.readyState; // 1 = connected
        if (dbState !== 1) {
            return res.status(503).json({ status: 'unhealthy', db: 'disconnected' });
        }
        res.status(200).json({ status: 'ok' });
    });

    app.use('/auth', authRoutes);
    app.use('/', urlRoute);

    app.use((req, res) => {
        res.status(404).json({ error: 'Not found' });
    });

    app.use(errorHandler);

    const server = app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));

    const shutdown = (signal) => {
        logger.info(`${signal} received, shutting down gracefully`);
        server.close(() => {
            mongoose.connection.close(false).then(() => {
                logger.info('Shutdown complete');
                process.exit(0);
            });
        });

        // force-exit if graceful shutdown hangs
        setTimeout(() => process.exit(1), 10000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
    logger.error({ err }, 'Server failed to start');
    process.exit(1);
});