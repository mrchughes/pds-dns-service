const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

/**
 * Generate a unique verification token
 * @returns {string} A unique verification token
 */
const generateVerificationToken = () => {
    const randomBytes = crypto.randomBytes(32);
    return randomBytes.toString('hex');
};

/**
 * Generate a unique ID
 * @returns {string} A UUID v4
 */
const generateId = () => {
    return uuidv4();
};

/**
 * Validate a domain name
 * @param {string} domain - The domain name to validate
 * @returns {boolean} True if the domain is valid, false otherwise
 */
const isValidDomain = (domain) => {
    // Basic domain validation regex
    // This is a simplified regex and may need to be enhanced for production
    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
};

/**
 * Format a TXT record according to PDS verification standards
 * @param {string} token - The verification token
 * @returns {string} The formatted TXT record
 */
const formatTxtRecord = (token) => {
    return `pds-verify=${token}`;
};

/**
 * Extract verification token from TXT record
 * @param {string} txtRecord - The TXT record content
 * @returns {string|null} The extracted token or null if not found
 */
const extractVerificationToken = (txtRecord) => {
    if (!txtRecord) return null;

    const match = txtRecord.match(/pds-verify=([a-f0-9]+)/);
    return match ? match[1] : null;
};

module.exports = {
    generateVerificationToken,
    generateId,
    isValidDomain,
    formatTxtRecord,
    extractVerificationToken
};
