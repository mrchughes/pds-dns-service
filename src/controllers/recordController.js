const express = require('express');
const { recordService } = require('../services/recordService');
const Domain = require('../models/Domain');
const Record = require('../models/Record');

const recordController = {
    // Get all DNS records
    getAllRecords: async (req, res) => {
        try {
            const records = await Record.find({}).populate('domain');
            res.status(200).json(records);
        } catch (error) {
            console.error('Error fetching records:', error);
            res.status(500).json({ error: 'Failed to retrieve records' });
        }
    },

    // Get records by domain name
    getRecordsByDomain: async (req, res) => {
        try {
            const { domainName } = req.params;

            const domain = await Domain.findOne({ name: domainName.toLowerCase() });

            if (!domain) {
                return res.status(404).json({ error: 'Domain not found' });
            }

            const records = await Record.find({ domain: domain._id });
            res.status(200).json(records);
        } catch (error) {
            console.error('Error fetching records by domain:', error);
            res.status(500).json({ error: 'Failed to retrieve records for domain' });
        }
    },

    // Get a single record by ID
    getRecordById: async (req, res) => {
        try {
            const record = await Record.findById(req.params.id).populate('domain');

            if (!record) {
                return res.status(404).json({ error: 'Record not found' });
            }

            res.status(200).json(record);
        } catch (error) {
            console.error('Error fetching record:', error);
            res.status(500).json({ error: 'Failed to retrieve record' });
        }
    },

    // Create a new DNS record
    createRecord: async (req, res) => {
        try {
            const { domainName, name, type, value, ttl } = req.body;

            // Validate input
            if (!domainName) {
                return res.status(400).json({ error: 'Domain name is required' });
            }

            if (!type || !value) {
                return res.status(400).json({ error: 'Record type and value are required' });
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

            // Create the record
            const newRecord = new Record({
                domain: domain._id,
                name: name || '@',
                type: type.toUpperCase(),
                value,
                ttl: ttl || 3600
            });

            await newRecord.save();

            // Update DNS server records
            await recordService.refreshDnsRecords();

            res.status(201).json(newRecord);
        } catch (error) {
            console.error('Error creating record:', error);
            res.status(500).json({ error: 'Failed to create record' });
        }
    },

    // Update an existing DNS record
    updateRecord: async (req, res) => {
        try {
            const { name, type, value, ttl } = req.body;

            const updateData = {
                ...(name && { name }),
                ...(type && { type: type.toUpperCase() }),
                ...(value && { value }),
                ...(ttl && { ttl }),
                updatedAt: Date.now()
            };

            const updatedRecord = await Record.findByIdAndUpdate(
                req.params.id,
                updateData,
                { new: true, runValidators: true }
            );

            if (!updatedRecord) {
                return res.status(404).json({ error: 'Record not found' });
            }

            // Update DNS server records
            await recordService.refreshDnsRecords();

            res.status(200).json(updatedRecord);
        } catch (error) {
            console.error('Error updating record:', error);
            res.status(500).json({ error: 'Failed to update record' });
        }
    },

    // Delete a DNS record
    deleteRecord: async (req, res) => {
        try {
            const deletedRecord = await Record.findByIdAndDelete(req.params.id);

            if (!deletedRecord) {
                return res.status(404).json({ error: 'Record not found' });
            }

            // Update DNS server records
            await recordService.refreshDnsRecords();

            res.status(200).json({ message: 'Record deleted successfully' });
        } catch (error) {
            console.error('Error deleting record:', error);
            res.status(500).json({ error: 'Failed to delete record' });
        }
    }
};

module.exports = recordController;
