const DNS2 = require('dns2');
const { Packet } = DNS2;
const logger = require('../utils/logger');
const Record = require('../models/Record');

// Create DNS server instance
const dnsServer = DNS2.createServer({
    udp: true,
    tcp: true,
    handle: handleDnsRequest
});

// DNS port from environment or default
const DNS_PORT = parseInt(process.env.DNS_PORT || 53235);

/**
 * Handle DNS requests
 * @param {object} request - DNS request packet
 * @param {object} send - Function to send the response
 */
async function handleDnsRequest(request, send) {
    const response = Packet.createResponseFromRequest(request);
    const [question] = request.questions;
    const { name, type } = question;

    logger.debug(`DNS Query - Domain: ${name}, Type: ${type}`);

    try {
        // Currently only handling TXT records
        if (type === Packet.TYPE.TXT) {
            // Look for TXT records in our database
            const records = await Record.find({
                domain: name,
                type: 'TXT',
                active: true
            });

            if (records && records.length > 0) {
                records.forEach(record => {
                    response.answers.push({
                        name,
                        type: Packet.TYPE.TXT,
                        class: Packet.CLASS.IN,
                        ttl: 300, // 5 minutes TTL
                        data: [record.value]
                    });
                });

                logger.debug(`Found ${records.length} TXT records for ${name}`);
            } else {
                logger.debug(`No TXT records found for ${name}`);
            }
        } else {
            // For other record types, we return an empty response
            logger.debug(`Unsupported record type: ${type} for ${name}`);
        }
    } catch (error) {
        logger.error(`Error handling DNS request: ${error.message}`);
    }

    send(response);
}

/**
 * Start the DNS server
 */
async function start() {
    try {
        await dnsServer.listen(DNS_PORT);
        logger.info(`DNS Server running on port ${DNS_PORT}`);
    } catch (error) {
        logger.error(`Failed to start DNS server: ${error.message}`);
        throw error;
    }
}

/**
 * Stop the DNS server
 */
async function stop() {
    try {
        await dnsServer.close();
        logger.info('DNS Server stopped');
    } catch (error) {
        logger.error(`Error stopping DNS server: ${error.message}`);
        throw error;
    }
}

module.exports = {
    start,
    stop
};
