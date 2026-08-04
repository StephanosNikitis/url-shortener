import 'dotenv/config';
import validateEnv from './config/validateEnv.js';
validateEnv();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoose from 'mongoose';
import pinoHttp from 'pino-http';
import session from 'express-session';
import { MongoStore } from 'connect-mongo';

import logger from './config/logger.js';
import connectToMongoDB from './connect.js';
import passport from './config/passport.js';
import urlRoute from './routes/url.routes.js';
import authRoutes from './routes/auth.routes.js';
import oauthRoutes from './routes/oauth.routes.js';
import errorHandler from './middleware/errorHandler.js';
import Visit from './models/visit.model.js';

const PORT = process.env.PORT || 5000;

async function main() {
    await connectToMongoDB(process.env.MONGO_URI);
    logger.info('MongoDB connected');

    try {
        await Visit.createCollection();
        logger.info('Visit time series collection ready');
    } catch (err) {
        // code 48 = NamespaceExists. Expected on every restart after the first one, since the collection already exists by then.
        if (err.code !== 48) {
            throw err;
        }
    }

    const app = express();

    // Trust the first proxy hop (Render/Railway/Nginx/etc). Required for req.ip (used by express-rate-limit) to reflect the real client IP instead of the proxy's IP.
    // Adjust the number if we sit behind more than one hop.
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
                maxAge: 7 * 24 * 60 * 60 * 1000,
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
            methods: ['GET', 'POST', 'PATCH', 'DELETE'],
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