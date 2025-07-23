const express = require('express');
const router = express.Router();
const viewController = require('../controllers/viewController');

// Dashboard/Home page
router.get('/', viewController.dashboard);

// Domains management page
router.get('/domains', viewController.domainsPage);

// Single domain page with records
router.get('/domains/:name', viewController.domainDetailsPage);

// Records management page
router.get('/records', viewController.recordsPage);

// Verifications management page
router.get('/verifications', viewController.verificationsPage);

// Clients management page
router.get('/clients', viewController.clientsPage);

// Client details page
router.get('/clients/:id', viewController.clientDetailsPage);

// API documentation page
router.get('/api-docs', viewController.apiDocsPage);

// Server status page
router.get('/status', viewController.statusPage);

module.exports = router;
