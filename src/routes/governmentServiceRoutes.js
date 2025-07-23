/**
 * Government Service Registration Routes for DNS Verification Service
 */

const express = require('express');
const router = express.Router();
const governmentServiceController = require('../controllers/governmentServiceController');
const { validateApiKey } = require('../middleware/auth');

// All routes require API key validation
router.use(validateApiKey);

// Initiate domain verification for government service registration
router.post('/verify', governmentServiceController.initiateVerification);

// Check verification status for government service
router.get('/verify/:verificationId', governmentServiceController.checkVerification);

// Complete verification process for government service
router.post('/verify/complete', governmentServiceController.completeVerification);

module.exports = router;
