const logger = require('../utils/logger');
const Record = require('../models/Record');
const Domain = require('../models/Domain');
const helpers = require('../utils/helpers');

/**
 * Create a new DNS record
 * @param {string} domain - Domain name
 * @param {string} type - Record type (e.g., TXT)
 * @param {string} value - Record value
 * @param {number} ttl - Time to live in seconds
 * @returns {object} Created record
 */
const createRecord = async (domain, type, value, ttl = 300) => {
    try {
        // Validate the domain
        if (!helpers.isValidDomain(domain)) {
            throw new Error('Invalid domain format');
        }

        // Check if domain exists in our domain registry, create if not
        let domainDoc = await Domain.findOne({ name: domain });

        if (!domainDoc) {
            domainDoc = await Domain.create({
                name: domain,
                createdAt: new Date()
            });
            logger.info(`Created new domain: ${domain}`);
        }

        // Create the record
        const record = await Record.create({
            domain,
            type: type.toUpperCase(),
            value,
            ttl,
            createdAt: new Date(),
            active: true
        });

        logger.info(`Created ${type} record for ${domain}`);
        return record;
    } catch (error) {
        logger.error(`Error creating record: ${error.message}`);
        throw error;
    }
};

/**
 * Get a DNS record by ID
 * @param {string} recordId - Record ID
 * @returns {object} Record object
 */
const getRecordById = async (recordId) => {
    try {
        const record = await Record.findById(recordId);

        if (!record) {
            throw new Error('Record not found');
        }

        return record;
    } catch (error) {
        logger.error(`Error getting record: ${error.message}`);
        throw error;
    }
};

/**
 * Update a DNS record
 * @param {string} recordId - Record ID
 * @param {object} updateData - Data to update
 * @returns {object} Updated record
 */
const updateRecord = async (recordId, updateData) => {
    try {
        // Find the record
        const record = await Record.findById(recordId);

        if (!record) {
            throw new Error('Record not found');
        }

        // Update allowed fields
        if (updateData.value) record.value = updateData.value;
        if (updateData.ttl) record.ttl = updateData.ttl;
        if (updateData.active !== undefined) record.active = updateData.active;

        record.updatedAt = new Date();

        // Save and return
        await record.save();
        logger.info(`Updated ${record.type} record for ${record.domain}`);

        return record;
    } catch (error) {
        logger.error(`Error updating record: ${error.message}`);
        throw error;
    }
};

/**
 * Delete a DNS record
 * @param {string} recordId - Record ID
 * @returns {boolean} Success indicator
 */
const deleteRecord = async (recordId) => {
    try {
        const record = await Record.findByIdAndDelete(recordId);

        if (!record) {
            throw new Error('Record not found');
        }

        logger.info(`Deleted ${record.type} record for ${record.domain}`);
        return true;
    } catch (error) {
        logger.error(`Error deleting record: ${error.message}`);
        throw error;
    }
};

/**
 * Get all records for a domain
 * @param {string} domain - Domain name
 * @param {string} type - Record type (optional)
 * @returns {Array} Array of records
 */
const getRecordsForDomain = async (domain, type) => {
    try {
        // Validate the domain
        if (!helpers.isValidDomain(domain)) {
            throw new Error('Invalid domain format');
        }

        // Build query
        const query = { domain };
        if (type) {
            query.type = type.toUpperCase();
        }

        // Find records
        const records = await Record.find(query).sort({ createdAt: -1 });
        logger.debug(`Found ${records.length} records for ${domain}${type ? ` of type ${type}` : ''}`);

        return records;
    } catch (error) {
        logger.error(`Error getting records: ${error.message}`);
        throw error;
    }
};

module.exports = {
    createRecord,
    getRecordById,
    updateRecord,
    deleteRecord,
    getRecordsForDomain
};
