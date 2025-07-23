const express = require('express');
const router = express.Router();
const recordController = require('../controllers/recordController');

// Get all DNS records
router.get('/', recordController.getAllRecords);

// Get records by domain name
router.get('/domain/:domainName', recordController.getRecordsByDomain);

// Get a single record by ID
router.get('/:id', recordController.getRecordById);

// Create a new DNS record
router.post('/', recordController.createRecord);

// Update an existing DNS record
router.put('/:id', recordController.updateRecord);

// Delete a DNS record
router.delete('/:id', recordController.deleteRecord);

module.exports = router;
