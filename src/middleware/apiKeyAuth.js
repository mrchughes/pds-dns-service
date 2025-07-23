// Middleware to authenticate API requests using API keys
const Client = require('../models/Client');

// Service-specific API keys (loaded from environment variables)
const SERVICE_API_KEYS = {
    'onelogin': process.env.API_KEY_ONELOGIN || 'dev-api-key',
    'pds': process.env.API_KEY_PDS || 'dev-pds-api-key'
};

const apiKeyAuth = async (req, res, next) => {
    try {
        const apiKey = req.headers['x-api-key'];

        // Skip authentication for web interface routes
        if (req.originalUrl.startsWith('/api')) {
            if (!apiKey) {
                return res.status(401).json({ error: 'API key is required' });
            }

            // First check if it's a service API key
            const serviceKeyMatch = Object.entries(SERVICE_API_KEYS).find(([_, key]) => key === apiKey);

            if (serviceKeyMatch) {
                // Set service info on the request
                req.service = {
                    name: serviceKeyMatch[0],
                    type: 'service'
                };

                return next();
            }

            // Otherwise, check against client-specific API keys in the database
            const client = await Client.findOne({ apiKey, active: true });

            if (!client) {
                return res.status(401).json({ error: 'Invalid or inactive API key' });
            }

            // Add client to request object
            req.client = client;
        }

        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
};

module.exports = apiKeyAuth;
