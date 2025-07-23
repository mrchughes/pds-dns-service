/**
 * Government Service Registration Controller for DNS Verification Service
 * 
 * Handles integration with government service registration process
 */

const verificationService = require('../services/verificationService');
const logger = require('../utils/logger');

const governmentServiceController = {
    /**
     * Initiate domain verification for government service registration
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    initiateVerification: async (req, res) => {
        try {
            const { domain, serviceId, returnUrl } = req.body;

            if (!domain || !serviceId) {
                return res.status(400).json({
                    success: false,
                    message: 'Domain and serviceId are required'
                });
            }

            // Generate verification challenge for government service
            const challenge = await verificationService.generateChallenge(
                domain,
                'government', // Service type for government services
                serviceId
            );

            logger.info(`Initiated government service verification for domain: ${domain}, serviceId: ${serviceId}`);

            return res.status(201).json({
                success: true,
                ...challenge,
                returnUrl
            });
        } catch (error) {
            logger.error(`Error initiating government service verification: ${error.message}`);
            return res.status(500).json({
                success: false,
                message: 'Failed to initiate verification',
                error: error.message
            });
        }
    },

    /**
     * Check verification status for government service
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    checkVerification: async (req, res) => {
        try {
            const { verificationId } = req.params;

            if (!verificationId) {
                return res.status(400).json({
                    success: false,
                    message: 'Verification ID is required'
                });
            }

            // Check verification status
            const status = await verificationService.checkVerificationStatus(verificationId);

            return res.status(200).json({
                success: true,
                ...status
            });
        } catch (error) {
            logger.error(`Error checking government service verification: ${error.message}`);
            return res.status(500).json({
                success: false,
                message: 'Failed to check verification',
                error: error.message
            });
        }
    },

    /**
     * Complete verification process for government service
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    completeVerification: async (req, res) => {
        try {
            const { verificationId, serviceId } = req.body;

            if (!verificationId || !serviceId) {
                return res.status(400).json({
                    success: false,
                    message: 'Verification ID and serviceId are required'
                });
            }

            // Complete verification process
            const result = await verificationService.completeVerification(verificationId, serviceId);

            if (result.status === 'verified') {
                logger.info(`Government service verification completed for ID: ${verificationId}, serviceId: ${serviceId}`);
                return res.status(200).json({
                    success: true,
                    status: 'verified',
                    message: 'Domain verification successful',
                    ...result
                });
            } else {
                logger.warn(`Government service verification failed for ID: ${verificationId}, serviceId: ${serviceId}`);
                return res.status(200).json({
                    success: false,
                    status: result.status,
                    message: 'Domain verification not complete',
                    ...result
                });
            }
        } catch (error) {
            logger.error(`Error completing government service verification: ${error.message}`);
            return res.status(500).json({
                success: false,
                message: 'Failed to complete verification',
                error: error.message
            });
        }
    }
};

module.exports = governmentServiceController;
