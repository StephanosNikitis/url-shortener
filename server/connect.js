const mongoose = require('mongoose'); 
const logger = require('./config/logger');

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

module.exports = {
    connectToMongoDB,
};