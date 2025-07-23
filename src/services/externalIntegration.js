/**
 * DNS Verification Service - External Verification Integration
 * 
 * This module provides integration with OneLogin and other services
 * to support DNS verification for government service registration
 */

const axios = require('axios');
const logger = require('../utils/logger');
const Verification = require('../models/Verification');

const ONELOGIN_URL = process.env.ONELOGIN_URL || 'http://onelogin-oidc:3010';
const PDS_URL = process.env.PDS_URL || 'http://solid-pds:3000';

/**
 * Notify OneLogin about verification status
 * 
 * @param {string} verificationId - ID of the verification record
 * @param {string} status - Verification status (verified, failed, expired)
 * @returns {Promise<object>} Notification result
 */
const notifyOneLogin = async (verificationId, status) => {
    try {
        const verification = await Verification.findById(verificationId);

        if (!verification) {
            throw new Error('Verification not found');
        }

        // Only notify for government service type
        if (verification.serviceType !== 'government') {
            logger.info(`Skipping OneLogin notification for non-government service: ${verification.serviceType}`);
            return { success: false, message: 'Not a government service' };
        }

        // Send notification to OneLogin
        const response = await axios.post(`${ONELOGIN_URL}/api/dns-verification/callback`, {
            verificationId,
            domain: verification.domain,
            status,
            serviceId: verification.serviceId,
            completedAt: verification.completedAt || null
        });

        logger.info(`Notified OneLogin about verification status: ${status} for ${verification.domain}`);
        return { success: true, data: response.data };
    } catch (error) {
        logger.error(`Error notifying OneLogin: ${error.message}`);
        return { success: false, error: error.message };
    }
};

/**
 * Notify PDS about verification status
 * 
 * @param {string} verificationId - ID of the verification record
 * @param {string} status - Verification status (verified, failed, expired)
 * @returns {Promise<object>} Notification result
 */
const notifyPDS = async (verificationId, status) => {
    try {
        const verification = await Verification.findById(verificationId);

        if (!verification) {
            throw new Error('Verification not found');
        }

        // Only notify for government service type
        if (verification.serviceType !== 'government') {
            logger.info(`Skipping PDS notification for non-government service: ${verification.serviceType}`);
            return { success: false, message: 'Not a government service' };
        }

        // Send notification to PDS
        const response = await axios.post(`${PDS_URL}/api/dns-verification/callback`, {
            verificationId,
            domain: verification.domain,
            status,
            serviceId: verification.serviceId,
            completedAt: verification.completedAt || null
        });

        logger.info(`Notified PDS about verification status: ${status} for ${verification.domain}`);
        return { success: true, data: response.data };
    } catch (error) {
        logger.error(`Error notifying PDS: ${error.message}`);
        return { success: false, error: error.message };
    }
};

/**
 * Notify all integrated services about verification status
 * 
 * @param {string} verificationId - ID of the verification record
 * @param {string} status - Verification status (verified, failed, expired)
 * @returns {Promise<object>} Notification results
 */
const notifyServices = async (verificationId, status) => {
    try {
        const oneLoginResult = await notifyOneLogin(verificationId, status);
        const pdsResult = await notifyPDS(verificationId, status);

        return {
            success: oneLoginResult.success || pdsResult.success,
            results: {
                oneLogin: oneLoginResult,
                pds: pdsResult
            }
        };
    } catch (error) {
        logger.error(`Error notifying services: ${error.message}`);
        return { success: false, error: error.message };
    }
};

module.exports = {
    notifyOneLogin,
    notifyPDS,
    notifyServices
};
