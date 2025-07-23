const axios = require('axios');
const dns = require('dns').promises;
const logger = require('../utils/logger');
const helpers = require('../utils/helpers');
const Verification = require('../models/Verification');
const Record = require('../models/Record');

/**
 * Generate a verification challenge for a domain
 * @param {string} domain - Domain to verify
 * @param {string} serviceType - Type of service requesting verification (onelogin, pds)
 * @param {string} serviceId - ID of the service requesting verification
 * @returns {object} Verification challenge object
 */
const generateChallenge = async (domain, serviceType, serviceId) => {
    try {
        // Validate the domain
        if (!helpers.isValidDomain(domain)) {
            throw new Error('Invalid domain format');
        }

        // Generate a verification token
        const token = helpers.generateVerificationToken();

        // Create a verification record in the database
        const verification = await Verification.create({
            domain,
            token,
            serviceType,
            serviceId,
            status: 'pending',
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + (parseInt(process.env.CHALLENGE_TOKEN_EXPIRY) || 86400) * 1000)
        });

        // Format the TXT record value
        const txtRecordValue = helpers.formatTxtRecord(token);

        logger.info(`Generated verification challenge for domain: ${domain}, service: ${serviceType}`);

        return {
            verificationId: verification._id,
            domain,
            txtRecordValue,
            token,
            instructions: `Create a TXT record for ${domain} with the value: ${txtRecordValue}`,
            expiresAt: verification.expiresAt
        };
    } catch (error) {
        logger.error(`Error generating challenge: ${error.message}`);
        throw error;
    }
};

/**
 * Check the verification status
 * @param {string} verificationId - ID of the verification to check
 * @returns {object} Verification status object
 */
const checkVerificationStatus = async (verificationId) => {
    try {
        // Find the verification record
        const verification = await Verification.findById(verificationId);

        if (!verification) {
            throw new Error('Verification not found');
        }

        // If already verified or failed, return current status
        if (verification.status !== 'pending') {
            return {
                status: verification.status,
                domain: verification.domain,
                createdAt: verification.createdAt,
                completedAt: verification.completedAt || null
            };
        }

        // Check if the token has expired
        if (verification.expiresAt < new Date()) {
            verification.status = 'expired';
            await verification.save();

            return {
                status: 'expired',
                domain: verification.domain,
                createdAt: verification.createdAt,
                completedAt: null
            };
        }

        // If pending, try to verify
        return await verifyDomain(verification);
    } catch (error) {
        logger.error(`Error checking verification status: ${error.message}`);
        throw error;
    }
};

/**
 * Verify a domain by checking for the TXT record
 * @param {object} verification - Verification object from database
 * @returns {object} Verification result
 */
const verifyDomain = async (verification) => {
    try {
        // Check our local DNS records first
        const record = await Record.findOne({
            domain: verification.domain,
            type: 'TXT',
            value: { $regex: new RegExp(`pds-verify=${verification.token}`) },
            active: true
        });

        if (record) {
            // Record found in our database, mark as verified
            verification.status = 'verified';
            verification.completedAt = new Date();
            await verification.save();

            logger.info(`Domain ${verification.domain} verified successfully`);

            return {
                status: 'verified',
                domain: verification.domain,
                createdAt: verification.createdAt,
                completedAt: verification.completedAt
            };
        }

        // Not found in our database, try external DNS lookup
        // This is a real implementation would query actual DNS servers
        // For the prototype, we'll just return 'pending'
        logger.info(`Domain ${verification.domain} verification pending - TXT record not found yet`);

        return {
            status: 'pending',
            domain: verification.domain,
            createdAt: verification.createdAt,
            completedAt: null,
            message: 'TXT record not found yet. Please ensure you have created the record and allow time for DNS propagation.'
        };
    } catch (error) {
        logger.error(`Error verifying domain: ${error.message}`);
        throw error;
    }
};

/**
 * Complete verification process and notify integrated services
 * @param {string} verificationId - ID of the verification to complete
 * @param {string} serviceId - ID of the service requesting completion
 * @param {boolean} force - Whether to force completion regardless of verification status
 * @returns {object} Completion result
 */
const completeVerification = async (verificationId, serviceId, force = false) => {
    try {
        // Find the verification record
        const verification = await Verification.findById(verificationId);

        if (!verification) {
            throw new Error('Verification not found');
        }

        // Check if the verification matches the requesting service
        if (serviceId && verification.serviceId !== serviceId) {
            throw new Error('Service ID mismatch');
        }

        // If not verified and not forcing, check verification
        if (verification.status !== 'verified' && !force) {
            const status = await verifyDomain(verification);

            if (status.status !== 'verified') {
                return {
                    success: false,
                    message: 'Domain not verified yet',
                    status: status.status
                };
            }
        }

        // If forcing or verified, complete the verification
        verification.status = force ? 'force_completed' : 'verified';
        verification.completedAt = new Date();
        await verification.save();

        // Notify the service that requested verification (if applicable)
        if (verification.serviceType && verification.serviceId) {
            try {
                await notifyService(verification);
            } catch (notifyError) {
                logger.error(`Failed to notify service: ${notifyError.message}`);
                // Continue even if notification fails
            }
        }

        logger.info(`Verification for ${verification.domain} completed${force ? ' (forced)' : ''}`);

        return {
            success: true,
            status: verification.status,
            domain: verification.domain,
            completedAt: verification.completedAt
        };
    } catch (error) {
        logger.error(`Error completing verification: ${error.message}`);
        throw error;
    }
};
};

/**
 * Notify the service that requested verification
 * @param {object} verification - Verification object from database
 */
const notifyService = async (verification) => {
    // In a real implementation, this would notify the external service
    // about the verification result
    // For the prototype, we'll just log the notification
    logger.info(`Notification would be sent to ${verification.serviceType} service ID: ${verification.serviceId}`);
};

/**
 * Verify a domain with an external token format (like OneLogin)
 * @param {string} domainName - Domain name to verify
 * @param {string} token - Token to verify
 * @param {string} prefix - Prefix for the TXT record (e.g., 'onelogin-domain-verification=')
 * @returns {object} Verification result
 */
const verifyDomainWithExternalToken = async (domainName, token, prefix) => {
    try {
        logger.info(`Verifying domain ${domainName} with external token format (${prefix})`);

        // Format the expected TXT record
        const expectedTxtRecord = `${prefix}${token}`;

        try {
            // Lookup TXT records for the domain
            const txtRecords = await dns.resolveTxt(domainName);

            // Flatten the TXT records
            const flattenedRecords = txtRecords.map(record => record.join('')).join(' ');

            logger.info(`Found TXT records for ${domainName}: ${flattenedRecords}`);

            // Check if any record contains our expected value
            const isVerified = flattenedRecords.includes(expectedTxtRecord);

            if (isVerified) {
                logger.info(`Domain ${domainName} verified successfully with external token`);

                return {
                    verified: true,
                    domain: domainName,
                    message: `Domain verified with ${prefix} record`
                };
            } else {
                logger.info(`Domain ${domainName} verification failed - TXT record not found`);

                return {
                    verified: false,
                    domain: domainName,
                    error: `TXT record "${expectedTxtRecord}" not found`
                };
            }
        } catch (dnsError) {
            logger.error(`DNS lookup error for ${domainName}: ${dnsError.message}`);

            return {
                verified: false,
                domain: domainName,
                error: `DNS lookup error: ${dnsError.message}`
            };
        }
    } catch (error) {
        logger.error(`Error verifying domain with external token: ${error.message}`);

        return {
            verified: false,
            domain: domainName,
            error: `Verification error: ${error.message}`
        };
    }
};

/**
 * Get verification by token
 * @param {string} token - The verification token to look up
 * @returns {object} The verification record or null
 */
const getVerificationByToken = async (token) => {
    try {
        return await Verification.findOne({ token });
    } catch (error) {
        logger.error(`Error getting verification by token: ${error.message}`);
        throw error;
    }
};

/**
 * Get verifications by domain
 * @param {string} domain - The domain to look up verifications for
 * @returns {Array} Array of verification records
 */
const getVerificationsByDomain = async (domain) => {
    try {
        return await Verification.find({ domain });
    } catch (error) {
        logger.error(`Error getting verifications by domain: ${error.message}`);
        throw error;
    }
};

/**
 * Verify a challenge token against a domain
 * @param {string} domain - Domain to verify
 * @param {string} token - Token to verify
 * @returns {object} Verification result
 */
const verifyChallenge = async (domain, token) => {
    try {
        // Find the verification record
        const verification = await Verification.findOne({ domain, token });

        if (!verification) {
            return {
                verified: false,
                error: 'Verification not found'
            };
        }

        // If already verified, return success
        if (verification.status === 'verified') {
            return {
                verified: true,
                message: 'Domain already verified'
            };
        }

        // If expired, return error
        if (verification.expiresAt < new Date()) {
            verification.status = 'expired';
            await verification.save();

            return {
                verified: false,
                error: 'Verification token expired'
            };
        }

        // Verify the domain
        const result = await verifyDomain(verification);

        return {
            verified: result.status === 'verified',
            status: result.status,
            message: result.message
        };
    } catch (error) {
        logger.error(`Error verifying challenge: ${error.message}`);

        return {
            verified: false,
            error: `Verification error: ${error.message}`
        };
    }
};

module.exports = {
    generateChallenge,
    checkVerificationStatus,
    verifyChallenge,
    verifyDomain,
    verifyDomainWithExternalToken,
    completeVerification,
    getVerificationByToken,
    getVerificationsByDomain
};
