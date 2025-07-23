const express = require('express');
const Domain = require('../models/Domain');

const domainController = {
    // Get all domains
    getAllDomains: async (req, res) => {
        try {
            const domains = await Domain.find({});
            res.status(200).json(domains);
        } catch (error) {
            console.error('Error fetching domains:', error);
            res.status(500).json({ error: 'Failed to retrieve domains' });
        }
    },

    // Get a single domain by name
    getDomainByName: async (req, res) => {
        try {
            const domain = await Domain.findOne({ name: req.params.name.toLowerCase() });

            if (!domain) {
                return res.status(404).json({ error: 'Domain not found' });
            }

            res.status(200).json(domain);
        } catch (error) {
            console.error('Error fetching domain:', error);
            res.status(500).json({ error: 'Failed to retrieve domain' });
        }
    },

    // Create a new domain
    createDomain: async (req, res) => {
        try {
            const { name } = req.body;

            if (!name) {
                return res.status(400).json({ error: 'Domain name is required' });
            }

            // Check if domain already exists
            const existingDomain = await Domain.findOne({ name: name.toLowerCase() });
            if (existingDomain) {
                return res.status(400).json({ error: 'Domain already exists' });
            }

            const newDomain = new Domain({
                name: name.toLowerCase(),
                verified: false
            });

            await newDomain.save();
            res.status(201).json(newDomain);
        } catch (error) {
            console.error('Error creating domain:', error);
            res.status(500).json({ error: 'Failed to create domain' });
        }
    },

    // Update a domain
    updateDomain: async (req, res) => {
        try {
            const { verified } = req.body;

            const updateData = {
                ...(verified !== undefined && { verified }),
                ...(verified === true && { verifiedAt: Date.now() }),
                updatedAt: Date.now()
            };

            const updatedDomain = await Domain.findOneAndUpdate(
                { name: req.params.name.toLowerCase() },
                updateData,
                { new: true, runValidators: true }
            );

            if (!updatedDomain) {
                return res.status(404).json({ error: 'Domain not found' });
            }

            res.status(200).json(updatedDomain);
        } catch (error) {
            console.error('Error updating domain:', error);
            res.status(500).json({ error: 'Failed to update domain' });
        }
    },

    // Delete a domain
    deleteDomain: async (req, res) => {
        try {
            const deletedDomain = await Domain.findOneAndDelete({ name: req.params.name.toLowerCase() });

            if (!deletedDomain) {
                return res.status(404).json({ error: 'Domain not found' });
            }

            res.status(200).json({ message: 'Domain deleted successfully' });
        } catch (error) {
            console.error('Error deleting domain:', error);
            res.status(500).json({ error: 'Failed to delete domain' });
        }
    },

    // Get all verified domains
    getVerifiedDomains: async (req, res) => {
        try {
            const domains = await Domain.find({ verified: true });
            res.status(200).json(domains);
        } catch (error) {
            console.error('Error fetching verified domains:', error);
            res.status(500).json({ error: 'Failed to retrieve verified domains' });
        }
    },

    // Get all unverified domains
    getUnverifiedDomains: async (req, res) => {
        try {
            const domains = await Domain.find({ verified: false });
            res.status(200).json(domains);
        } catch (error) {
            console.error('Error fetching unverified domains:', error);
            res.status(500).json({ error: 'Failed to retrieve unverified domains' });
        }
    }
};

module.exports = domainController;
