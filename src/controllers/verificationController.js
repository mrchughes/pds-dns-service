const express = require('express');
const verificationService = require('../services/verificationService');
const Domain = require('../models/Domain');
const Verification = require('../models/Verification');

const verificationController = {
    // Get all verification records
    getAllVerifications: async (req, res) => {
        try {
            const verifications = await Verification.find({}).populate('domain');
            res.status(200).json(verifications);
        } catch (error) {
            console.error('Error fetching verifications:', error);
            res.status(500).json({ error: 'Failed to retrieve verifications' });
        }
    },

    // Get verification status for a domain
    getDomainVerification: async (req, res) => {
        try {
            const { domainName } = req.params;

            const domain = await Domain.findOne({ name: domainName.toLowerCase() });

            if (!domain) {
                return res.status(404).json({ error: 'Domain not found' });
            }

            const verification = await Verification.findOne({ domain: domain._id });

            if (!verification) {
                return res.status(404).json({ error: 'No verification record found for this domain' });
            }

            res.status(200).json(verification);
        } catch (error) {
            console.error('Error fetching domain verification:', error);
            res.status(500).json({ error: 'Failed to retrieve domain verification' });
        }
    },

    // Initiate domain verification process
    initiateVerification: async (req, res) => {
        try {
            const { domainName } = req.body;

            if (!domainName) {
                return res.status(400).json({ error: 'Domain name is required' });
            }

            // Find or create the domain
            let domain = await Domain.findOne({ name: domainName.toLowerCase() });

            if (!domain) {
                domain = new Domain({
                    name: domainName.toLowerCase(),
                    verified: false
                });
                await domain.save();
            }

            // Check if domain is already verified
            if (domain.verified) {
                return res.status(400).json({
                    error: 'Domain is already verified',
                    status: 'verified'
                });
            }

            // Check if verification is already in progress
            let verification = await Verification.findOne({ domain: domain._id });

            if (verification && verification.status === 'pending') {
                // Return existing verification challenge
                return res.status(200).json({
                    message: 'Verification already in progress',
                    domain: domain.name,
                    token: verification.token,
                    txtRecord: verification.txtRecord,
                    status: verification.status,
                    instructions: `Add a TXT record to your domain with name '_pds-verify' and value '${verification.txtRecord}'`
                });
            }

            // Create a new verification challenge
            const { token, txtRecord } = verificationService.generateVerificationChallenge(domain.name);

            verification = new Verification({
                domain: domain._id,
                token,
                txtRecord,
                status: 'pending',
                attempts: 0
            });

            await verification.save();

            res.status(201).json({
                message: 'Domain verification initiated',
                domain: domain.name,
                token: verification.token,
                txtRecord: verification.txtRecord,
                status: verification.status,
                instructions: `Add a TXT record to your domain with name '_pds-verify' and value '${verification.txtRecord}'`
            });
        } catch (error) {
            console.error('Error initiating domain verification:', error);
            res.status(500).json({ error: 'Failed to initiate domain verification' });
        }
    },

    // Check verification status and attempt verification
    checkVerification: async (req, res) => {
        try {
            const { domainName, token } = req.body;

            if (!domainName || !token) {
                return res.status(400).json({ error: 'Domain name and token are required' });
            }

            // Log verification request
            console.log(`Verification request for domain ${domainName} with token ${token.substring(0, 8)}...`);

            // Check if request is from OneLogin OIDC provider
            const isOneLoginRequest = req.service && req.service.name === 'onelogin';

            const domain = await Domain.findOne({ name: domainName.toLowerCase() });

            // For OneLogin requests, we need to handle the case where domain might not exist in our database yet
            if (!domain && isOneLoginRequest) {
                // We'll check DNS directly for the OneLogin token format
                const verificationResult = await verificationService.verifyDomainWithExternalToken(
                    domainName.toLowerCase(),
                    token,
                    'onelogin-domain-verification='
                );

                if (verificationResult.verified) {
                    // Create the domain and verification records for future use
                    const newDomain = new Domain({
                        name: domainName.toLowerCase(),
                        verified: true,
                        verifiedAt: Date.now(),
                        source: 'onelogin'
                    });

                    await newDomain.save();

                    // Create verification record
                    const newVerification = new Verification({
                        domain: newDomain._id,
                        token: token,
                        txtRecord: `onelogin-domain-verification=${token}`,
                        status: 'verified',
                        verifiedAt: Date.now(),
                        source: 'onelogin'
                    });

                    await newVerification.save();

                    return res.status(200).json({
                        message: 'Domain successfully verified (OneLogin format)',
                        status: 'verified',
                        domain: domainName.toLowerCase()
                    });
                } else {
                    return res.status(400).json({
                        message: 'Domain verification failed',
                        error: verificationResult.error,
                        status: 'failed',
                        domain: domainName.toLowerCase()
                    });
                }
            }

            if (!domain) {
                return res.status(404).json({ error: 'Domain not found' });
            }

            // For OneLogin requests, we need to check both our internal token and the OneLogin format
            if (isOneLoginRequest) {
                // Try to verify with OneLogin format first
                const verificationResult = await verificationService.verifyDomainWithExternalToken(
                    domain.name,
                    token,
                    'onelogin-domain-verification='
                );

                if (verificationResult.verified) {
                    // Update domain status
                    domain.verified = true;
                    domain.verifiedAt = Date.now();
                    await domain.save();

                    // Check if we have a verification record to update
                    let verification = await Verification.findOne({
                        domain: domain._id,
                        token
                    });

                    if (!verification) {
                        // Create a new verification record
                        verification = new Verification({
                            domain: domain._id,
                            token: token,
                            txtRecord: `onelogin-domain-verification=${token}`,
                            status: 'verified',
                            verifiedAt: Date.now(),
                            source: 'onelogin'
                        });
                    } else {
                        verification.status = 'verified';
                        verification.verifiedAt = Date.now();
                    }

                    await verification.save();

                    return res.status(200).json({
                        message: 'Domain successfully verified (OneLogin format)',
                        status: 'verified',
                        domain: domain.name
                    });
                }

                // If OneLogin format check fails, continue with standard verification
            }

            // Standard verification process
            const verification = await Verification.findOne({
                domain: domain._id,
                token
            });

            if (!verification) {
                return res.status(404).json({ error: 'Invalid verification token' });
            }

            // If already verified, return success
            if (verification.status === 'verified') {
                return res.status(200).json({
                    message: 'Domain already verified',
                    status: 'verified',
                    domain: domain.name
                });
            }

            // If failed, check if max attempts reached
            if (verification.status === 'failed' && verification.attempts >= 5) {
                return res.status(400).json({
                    message: 'Maximum verification attempts reached',
                    status: 'failed',
                    domain: domain.name
                });
            }

            // Attempt verification
            verification.attempts += 1;

            const verificationResult = await verificationService.verifyDomain(domain.name, verification.txtRecord);

            if (verificationResult.verified) {
                // Update verification status
                verification.status = 'verified';
                verification.verifiedAt = Date.now();
                await verification.save();

                // Update domain status
                domain.verified = true;
                domain.verifiedAt = Date.now();
                await domain.save();

                return res.status(200).json({
                    message: 'Domain successfully verified',
                    status: 'verified',
                    domain: domain.name
                });
            } else {
                // Update verification status if max attempts reached
                if (verification.attempts >= 5) {
                    verification.status = 'failed';
                }

                await verification.save();

                return res.status(400).json({
                    message: 'Domain verification failed',
                    error: verificationResult.error,
                    status: verification.status,
                    attemptsRemaining: 5 - verification.attempts,
                    domain: domain.name
                });
            }
        } catch (error) {
            console.error('Error checking domain verification:', error);
            res.status(500).json({ error: 'Failed to check domain verification' });
        }
    },

    // Reset verification for a domain
    resetVerification: async (req, res) => {
        try {
            const { domainName } = req.params;

            const domain = await Domain.findOne({ name: domainName.toLowerCase() });

            if (!domain) {
                return res.status(404).json({ error: 'Domain not found' });
            }

            // Delete existing verification
            await Verification.findOneAndDelete({ domain: domain._id });

            // Reset domain verification status
            domain.verified = false;
            domain.verifiedAt = null;
            await domain.save();

            res.status(200).json({
                message: 'Domain verification reset successfully',
                domain: domain.name
            });
        } catch (error) {
            console.error('Error resetting domain verification:', error);
            res.status(500).json({ error: 'Failed to reset domain verification' });
        }
    }
};

module.exports = verificationController;
