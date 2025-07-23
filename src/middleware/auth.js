/**
 * Authentication middleware for DNS Verification Service
 */

const Client = require('../models/Client');
const logger = require('../utils/logger');

/**
 * Validate API key middleware
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const validateApiKey = async (req, res, next) => {
    try {
        const apiKey = req.headers['x-api-key'];

        if (!apiKey) {
            logger.warn('API request without API key');
            return res.status(401).json({
                success: false,
                message: 'API key is required'
            });
        }

        // Find client with this API key
        const client = await Client.findOne({ apiKey, active: true });

        if (!client) {
            logger.warn(`Invalid API key: ${apiKey}`);
            return res.status(401).json({
                success: false,
                message: 'Invalid API key'
            });
        }

        // Attach client info to request for later use
        req.client = {
            id: client._id,
            name: client.name,
            type: client.type
        };

        next();
    } catch (error) {
        logger.error(`Error validating API key: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    validateApiKey
};
