const express = require('express');
const router = express.Router();
const verificationController = require('../controllers/verificationController');

// Get all verification records
router.get('/', verificationController.getAllVerifications);

// Get verification status for a domain
router.get('/:domainName', verificationController.getDomainVerification);

// Initiate domain verification process
router.post('/initiate', verificationController.initiateVerification);

// Check verification status and attempt verification
router.post('/check', verificationController.checkVerification);

// Reset verification for a domain
router.delete('/:domainName', verificationController.resetVerification);

module.exports = router;
