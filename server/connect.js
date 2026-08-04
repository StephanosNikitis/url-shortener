import mongoose from 'mongoose';
import logger from './config/logger.js';

mongoose.connection.on('error', (err) => {
    logger.error({ err }, 'MongoDB connection error');
});

mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected - attempting to reconnect');
});

mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
});

async function connectToMongoDB(url) {
    return mongoose.connect(url, {
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 10,
    });
}

export default connectToMongoDB;