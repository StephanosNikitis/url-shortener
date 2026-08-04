function errorHandler(err, req, res, next) {
    if (req.log) {
        req.log.error({ err }, 'Request error');
    } else {
        console.error(err);
    }

    if (res.headersSent) {
        return next(err);
    }

    const statusCode = err.statusCode || 500;
    const message =
        process.env.NODE_ENV === 'production' && statusCode === 500
            ? 'Something went wrong'
            : err.message || 'Something went wrong';

    res.status(statusCode).json({ error: message });
}

export default errorHandler;