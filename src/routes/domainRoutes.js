const express = require('express');
const router = express.Router();
const domainController = require('../controllers/domainController');

// Get all domains
router.get('/', domainController.getAllDomains);

// Get all verified domains
router.get('/verified', domainController.getVerifiedDomains);

// Get all unverified domains
router.get('/unverified', domainController.getUnverifiedDomains);

// Get a single domain by name
router.get('/:name', domainController.getDomainByName);

// Create a new domain
router.post('/', domainController.createDomain);

// Update a domain
router.put('/:name', domainController.updateDomain);

// Delete a domain
router.delete('/:name', domainController.deleteDomain);

module.exports = router;
