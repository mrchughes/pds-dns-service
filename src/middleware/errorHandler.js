const logger = require('../utils/logger');

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
    // Log the error
    logger.error(`${err.name}: ${err.message}`, {
        stack: err.stack,
        path: req.path,
        method: req.method,
        body: req.body,
        params: req.params,
        query: req.query
    });

    // Determine status code
    const statusCode = err.statusCode || 500;

    // Send error response
    res.status(statusCode).json({
        success: false,
        error: {
            message: err.message || 'Server Error',
            stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
        }
    });
};

module.exports = errorHandler;
